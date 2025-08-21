const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

// تحميل التذاكر
async function loadTickets() {
    try {
        const ticketsPath = path.join(__dirname, '../data/tickets.json');
        const data = await fs.readFile(ticketsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // إذا لم يكن الملف موجودًا، قم بإنشاء ملف جديد مع محتويات فارغة
        if (error.code === 'ENOENT') {
            await fs.writeFile(path.join(__dirname, '../data/tickets.json'), '[]', 'utf8');
            return [];
        }
        console.error('خطأ في تحميل التذاكر:', error);
        return [];
    }
}

// حفظ التذاكر
async function saveTickets(tickets) {
    try {
        const ticketsPath = path.join(__dirname, '../data/tickets.json');
        await fs.writeFile(ticketsPath, JSON.stringify(tickets, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ التذاكر:', error);
        return false;
    }
}

// استخراج بيانات التذكرة من القناة
async function extractTicketFromChannel(interaction) {
    const tickets = await loadTickets();
    let ticket = tickets.find(t => t.channelId === interaction.channel.id);

    if (!ticket) {
        // محاولة استخراج البيانات من الإيمبد
        const messages = await interaction.channel.messages.fetch({ limit: 10 });
        const embedMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title?.includes('🎫'));

        if (embedMessage) {
            const embed = embedMessage.embeds[0];
            const userField = embed.fields?.find(field => field.name === '👤 المستخدم');
            const idField = embed.fields?.find(field => field.name === '🆔 معرف التذكرة');

            if (userField && idField) {
                const userId = userField.value.match(/\d+/)?.[0];
                ticket = {
                    id: idField.value,
                    channelId: interaction.channel.id,
                    userId: userId,
                    type: 'general',
                    status: 'open',
                    createdAt: new Date().toLocaleString("en-US", { timeZone: "UTC" })
                };
                // أضف التذكرة الجديدة إلى البيانات إذا لم تكن موجودة
                tickets.push(ticket);
                await saveTickets(tickets);
            }
        }
    }

    return ticket;
}

class TicketsButtonHandler {
    async handle(interaction, client) {
        // التحقق من أن هذا في قناة تذكرة
        const ticket = await extractTicketFromChannel(interaction);
        if (!ticket) {
            return false;
        }

        // التحقق من أن المتفاعل له صلاحية
        const hasPermission = interaction.member.permissions.has('ADMINISTRATOR');

        if (!hasPermission) {
            try {
                await interaction.reply({
                    content: '❌ ليس لديك صلاحية لاستخدام هذا الزر.',
                    flags: 64
                });
            } catch (error) {
                if (error.code !== 10062) console.error('Reply Error:', error);
            }
            return;
        }

        // إنشاء قائمة إدارة التذكرة
        const embed = new EmbedBuilder()
            .setTitle('🎛️ إدارة التذكرة')
            .setDescription('اختر الإجراء الذي تريد تنفيذه:')
            .addFields(
                { name: '👤 صاحب التذكرة', value: `<@${ticket.userId}>`, inline: true },
                { name: '🆔 معرف التذكرة', value: ticket.id, inline: true },
                { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`, inline: true }
            )
            .setColor(0x0099ff)
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_manage')
            .setPlaceholder('اختر إجراء...')
            .addOptions([
                {
                    label: 'إضافة مستخدم',
                    description: 'إضافة مستخدم جديد للتذكرة',
                    value: 'add_user',
                    emoji: '👥'
                },
                {
                    label: 'إعادة تسمية',
                    description: 'تغيير اسم قناة التذكرة',
                    value: 'rename_ticket',
                    emoji: '✏️'
                },
                {
                    label: 'استدعاء المستخدم',
                    description: 'استدعاء صاحب التذكرة',
                    value: 'summon_user',
                    emoji: '📢'
                },
                {
                    label: 'حظر المستخدم',
                    description: 'منع صاحب التذكرة من رؤية القناة',
                    value: 'blacklist_user',
                    emoji: '🚫'
                },
                {
                    label: 'إدارة الصلاحيات',
                    description: 'تعديل صلاحيات القناة',
                    value: 'channel_permissions',
                    emoji: '⚙️'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        try {
            await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
        } catch (error) {
            if (error.code === 10062) {
                await interaction.channel.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [embed],
                    components: [row]
                });
            } else {
                console.error('Unexpected error during interaction reply:', error);
            }
        }

        return true;
    }

    // وظائف مساعدة (تم استبدالها بوظائف حفظ وتحميل)
    async getTicketData(channel) {
        const tickets = await loadTickets();
        return tickets.find(t => t.channelId === channel.id);
    }

    async saveTicketData(ticketData) {
        const tickets = await loadTickets();
        const index = tickets.findIndex(t => t.channelId === ticketData.channelId);
        if (index > -1) {
            tickets[index] = ticketData;
        } else {
            tickets.push(ticketData);
        }
        await saveTickets(tickets);
    }

    async updateTicketEmbed(channel, ticketData) {
        const messages = await channel.messages.fetch({ limit: 10 });
        const embedMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title?.includes('🎫')); // تعديل للبحث عن الإيمبد الصحيح

        if (embedMessage) {
            const updatedEmbed = EmbedBuilder.from(embedMessage.embeds[0])
                .setFields([
                    { name: '👤 صاحب التذكرة', value: `<@${ticketData.userId}>`, inline: true },
                    { name: '🆔 معرف التذكرة', value: ticketData.id, inline: true },
                    { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(new Date(ticketData.createdAt).getTime() / 1000)}:R>`, inline: true },
                    // إضافة حقول أخرى حسب الحاجة
                    { name: '📊 الحالة', value: ticketData.status || 'مفتوحة', inline: true },
                    { name: '🧑‍💻 تم الاستلام بواسطة', value: ticketData.claimedBy ? `<@${ticketData.claimedBy}>` : 'لا أحد', inline: true }
                ])
                .setColor(0x0099ff) // استخدام اللون من الكونفق
                .setTimestamp();

            // تحديث أزرار التذكرة إذا كانت موجودة
            const ticketButtonsRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('Claim')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✋')
                        .setDisabled(ticketData.status === 'claimed'),
                    new ButtonBuilder()
                        .setCustomId('ticket_unclaim')
                        .setLabel('Unclaim')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('↩️')
                        .setDisabled(!ticketData.claimedBy || ticketData.claimedBy !== ticketData.claimantId), // افتراض وجود claimantId
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            await embedMessage.edit({ embeds: [updatedEmbed], components: [ticketButtonsRow] });
        }
    }

    // التعامل مع التفاعلات من قائمة الاختيار
    async handleSelectMenu(interaction) {
        if (interaction.customId === 'ticket_manage') {
            const ticket = await extractTicketFromChannel(interaction);
            if (!ticket) {
                return interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة لهذه القناة.', ephemeral: true });
            }

            const selectedValue = interaction.values[0];

            // معالجة خيارات القائمة
            switch (selectedValue) {
                case 'add_user':
                    await this.addUserToTicket(interaction, ticket);
                    break;
                case 'rename_ticket':
                    await this.renameTicket(interaction, ticket);
                    break;
                case 'summon_user':
                    await this.summonUser(interaction, ticket);
                    break;
                case 'blacklist_user':
                    await this.blacklistUser(interaction, ticket);
                    break;
                case 'channel_permissions':
                    await this.manageChannelPermissions(interaction, ticket);
                    break;
            }
            return true;
        }
        return false;
    }

    async addUserToTicket(interaction, ticket) {
        await interaction.reply({ content: 'هذه الميزة قيد التطوير.', ephemeral: true });
    }

    async renameTicket(interaction, ticket) {
        await interaction.reply({ content: 'هذه الميزة قيد التطوير.', ephemeral: true });
    }

    async summonUser(interaction, ticket) {
        await interaction.reply({ content: 'هذه الميزة قيد التطوير.', ephemeral: true });
    }

    async blacklistUser(interaction, ticket) {
        await interaction.reply({ content: 'هذه الميزة قيد التطوير.', ephemeral: true });
    }

    async manageChannelPermissions(interaction, ticket) {
        await interaction.reply({ content: 'هذه الميزة قيد التطوير.', ephemeral: true });
    }

    // معالجة زر "Claim" (افتراضية، تم إضافتها لتوضيح السياق)
    async handleClaimButton(interaction, client) {
        const ticket = await extractTicketFromChannel(interaction);
        if (!ticket) {
            return interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة لهذه القناة.', ephemeral: true });
        }

        if (ticket.claimedBy) {
            return interaction.reply({ content: `❌ هذه التذكرة مُستلمة بالفعل بواسطة <@${ticket.claimedBy}>.`, ephemeral: true });
        }

        // تحديث بيانات التذكرة
        ticket.claimedBy = interaction.user.id;
        ticket.claimedAt = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
        ticket.status = 'claimed';

        // تسجيل الاستلام في تاريخ التذكرة
        if (!ticket.claimHistory) ticket.claimHistory = [];
        ticket.claimHistory.push({
            action: 'claimed',
            userId: interaction.user.id,
            timestamp: ticket.claimedAt,
            isAdminAction: false // نفترض أن هذا ليس مديرًا إلا إذا تم التحقق
        });

        await this.saveTicketData(ticket);
        await this.updateTicketEmbed(interaction.channel, ticket);

        await interaction.reply({ content: `✅ لقد قمت باستلام التذكرة بنجاح!`, ephemeral: true });
        await interaction.channel.send(`👤 **تم استلام التذكرة بواسطة:** <@${interaction.user.id}>`);
    }

    // معالجة زر "Unclaim" (محسّنة)
    async handleUnclaimButton(interaction, client) {
        const ticket = await extractTicketFromChannel(interaction);
        if (!ticket) {
            return interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة لهذه القناة.', ephemeral: true });
        }

        if (!ticket.claimedBy) {
            return interaction.reply({ content: '❌ هذه التذكرة غير مُستلمة!', ephemeral: true });
        }

        // التحقق من صلاحية فك الاستلام
        const isClaimedByUser = ticket.claimedBy === interaction.user.id;
        const isAdminStreeter = interaction.member.permissions.has('ADMINISTRATOR'); // Admin Streeter

        if (!isClaimedByUser && !isAdminStreeter) {
            return interaction.reply({ content: '❌ لا يمكنك فك استلام هذه التذكرة!', ephemeral: true });
        }

        // حفظ معلومات فك الاستلام
        const unclaimData = {
            unclaimedBy: interaction.user.id,
            unclaimedAt: new Date().toLocaleString('en-US', { timeZone: 'UTC' }),
            wasClaimedBy: ticket.claimedBy,
            isAdminUnclaim: !isClaimedByUser
        };

        // تسجيل فك الاستلام في تاريخ التذكرة
        if (!ticket.claimHistory) ticket.claimHistory = [];
        ticket.claimHistory.push({
            action: 'unclaimed',
            userId: interaction.user.id,
            timestamp: unclaimData.unclaimedAt,
            previousClaimer: ticket.claimedBy,
            isAdminAction: unclaimData.isAdminUnclaim
        });

        // تحديث التذكرة
        ticket.claimedBy = null;
        ticket.claimedAt = null;
        ticket.status = 'open';

        await this.saveTicketData(ticket);

        // تحديث الإيمبد
        await this.updateTicketEmbed(interaction.channel, ticket);

        // إرسال رسالة في التذكرة
        const claimerMention = `<@${unclaimData.wasClaimedBy}>`;
        const unclaimerMention = `<@${interaction.user.id}>`;

        let message;
        if (unclaimData.isAdminUnclaim) {
            message = `🔓 **تم فك الاستلام بواسطة المدير**\n` +
                     `المدير ${unclaimerMention} قام بفك استلام التذكرة من ${claimerMention}`;
        } else {
            message = `🔓 **تم فك الاستلام**\n` +
                     `${unclaimerMention} قام بفك استلام التذكرة`;
        }

        await interaction.channel.send({ content: message });
        await interaction.reply({ content: '✅ تم فك استلام التذكرة بنجاح!', ephemeral: true });
    }

    // معالجة تفاعلات أخرى
    async handleOtherInteractions(interaction) {
        // التحقق من أن التفاعل هو زر
        if (!interaction.isButton()) return false;

        // معالجة زر "Claim"
        if (interaction.customId === 'ticket_claim') {
            await this.handleClaimButton(interaction, interaction.client);
            return true;
        }

        // معالجة زر "Unclaim"
        if (interaction.customId === 'ticket_unclaim') {
            await this.handleUnclaimButton(interaction, interaction.client);
            return true;
        }

        // معالجة زر "Close" (افتراضي)
        if (interaction.customId === 'ticket_close') {
            const ticket = await extractTicketFromChannel(interaction);
            if (!ticket) return interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });

            const hasPermission = interaction.member.permissions.has('ADMINISTRATOR');

            if (!hasPermission) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق التذكرة.', ephemeral: true });
            }

            // منطق إغلاق التذكرة (مثال)
            ticket.status = 'closed';
            await this.saveTicketData(ticket);
            await this.updateTicketEmbed(interaction.channel, ticket);

            await interaction.reply({ content: '✅ تم إغلاق التذكرة.', ephemeral: true });
            await interaction.channel.delete(); // حذف القناة بعد الإغلاق
            return true;
        }

        // إضافة معالجات لأزرار أخرى هنا
        // ...

        return false;
    }

    // معالجة تفاعلات أخرى (مثل الأوامر)
    async handleOtherCommands(interaction) {
        // معالجة أزرار العودة لأنظمة المساعدة
        if (interaction.customId === 'back_to_tickets_main') {
            const thelpCommand = require('../commands/thelp'); // افتراض وجود هذا الأمر
            await thelpCommand.execute(interaction, [], interaction.client);
            return true;
        }

        // معالجة أزرار التعديل
        if (interaction.customId === 'edit_tickets_category') {
            const modal = new ModalBuilder()
                .setCustomId('edit_tickets_category_modal')
                .setTitle('تعديل فئة التذاكر');

            const categoryInput = new TextInputBuilder()
                .setCustomId('category_id')
                .setLabel('معرف فئة التذاكر')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('أدخل معرف الفئة...')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(categoryInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return true;
        }

        if (interaction.customId === 'edit_tickets_log_channel') {
            const modal = new ModalBuilder()
                .setCustomId('edit_tickets_log_channel_modal')
                .setTitle('تعديل قناة السجل');

            const channelInput = new TextInputBuilder()
                .setCustomId('log_channel_id')
                .setLabel('معرف قناة السجل')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('أدخل معرف القناة...')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(channelInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return true;
        }

        if (interaction.customId === 'edit_tickets_claim_delay') {
            const modal = new ModalBuilder()
                .setCustomId('edit_tickets_claim_delay_modal')
                .setTitle('تعديل تأخير الاستلام');

            const delayInput = new TextInputBuilder()
                .setCustomId('claim_delay')
                .setLabel('تأخير الاستلام (بالثواني)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('أدخل عدد الثواني...')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(delayInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return true;
        }

        // معالجة أزرار التفعيل/الإلغاء
        if (interaction.customId.startsWith('toggle_system_')) {
            const systemName = interaction.customId.split('_')[2]; // e.g., 'tickets'
            const newStatus = interaction.customId.endsWith('_true');

            // تحديث الكونفيق
            if (config.SYSTEMS && config.SYSTEMS[systemName.toUpperCase()] !== undefined) {
                config.SYSTEMS[systemName.toUpperCase()] = newStatus;

                // هنا تحتاج إلى منطق لحفظ التغييرات في الكونفق إذا كان ذلك ممكنًا (قد يتطلب إعادة تحميل أو حفظ ملف الكونفق)
                // في الوقت الحالي، سيتم الاحتفاظ بالتغيير في الذاكرة لجلسة التشغيل الحالية.

                const embed = new EmbedBuilder()
                    .setTitle(`✅ ${newStatus ? 'تم تفعيل' : 'تم إلغاء تفعيل'} نظام ${systemName}`)
                    .setColor(newStatus ? 0x0099ff : 0xff0000)
                    .setDescription(`النظام الآن ${newStatus ? '🟢 مفعل' : '🔴 معطل'}`)
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
                return true;
            } else {
                await interaction.reply({ content: '❌ نظام غير معروف.', ephemeral: true });
                return false;
            }
        }

        return false;
    }
}

module.exports = new TicketsButtonHandler();