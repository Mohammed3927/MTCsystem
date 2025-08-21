const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
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
            }
        }
    }
    
    return ticket;
}

class TicketManagementHandler {
    async handleTicketManagement(interaction, client) {
        const action = interaction.values[0];
        
        switch (action) {
            case 'add_user':
                return await this.showAddUserModal(interaction);
            case 'rename_ticket':
                return await this.showRenameModal(interaction);
            case 'summon_user':
                return await this.summonUser(interaction, client);
            case 'blacklist_user':
                return await this.blacklistUser(interaction);
            case 'channel_permissions':
                return await this.showChannelPermissionsMenu(interaction);
            default:
                return await interaction.reply({ content: '❌ إجراء غير صحيح.', ephemeral: true });
        }
    }

    async showAddUserModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('add_user_modal')
            .setTitle('إضافة مستخدم للتذكرة');

        const userInput = new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('معرف المستخدم أو المنشن')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('مثال: @username أو 123456789')
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('سبب الإضافة (اختياري)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('اختر سبب إضافة المستخدم...')
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(userInput);
        const secondRow = new ActionRowBuilder().addComponents(reasonInput);

        modal.addComponents(firstRow, secondRow);
        await interaction.showModal(modal);
    }

    async showRenameModal(interaction) {
        const ticket = await extractTicketFromChannel(interaction);
        if (!ticket) {
            return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('rename_ticket_modal')
            .setTitle('إعادة تسمية التذكرة');

        const nameInput = new TextInputBuilder()
            .setCustomId('new_name')
            .setLabel('الاسم الجديد للتذكرة')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('مثال: مشكلة-خاصة')
            .setValue(interaction.channel.name)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(nameInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    async handleAddUserModal(interaction) {
        const userInput = interaction.fields.getTextInputValue('user_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'لا يوجد سبب محدد';

        // استخراج معرف المستخدم
        const userId = userInput.replace(/[<@!>]/g, '');

        if (!/^\d+$/.test(userId)) {
            return await interaction.reply({ content: '❌ معرف المستخدم غير صحيح.', ephemeral: true });
        }

        try {
            const member = await interaction.guild.members.fetch(userId);
            
            // إضافة صلاحيات للمستخدم
            await interaction.channel.permissionOverwrites.create(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ تم إضافة مستخدم للتذكرة')
                .addFields(
                    { name: '👤 المستخدم المضاف', value: `<@${userId}>`, inline: true },
                    { name: '👮 أضيف بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await interaction.channel.send(`<@${userId}> تم إضافتك لهذه التذكرة.`);

        } catch (error) {
            console.error('خطأ في إضافة المستخدم:', error);
            await interaction.reply({ content: '❌ لم يتم العثور على المستخدم أو حدث خطأ.', ephemeral: true });
        }
    }

    async handleRenameModal(interaction) {
        const newName = interaction.fields.getTextInputValue('new_name');

        try {
            // استخراج الرمز من اسم القناة الحالي والمحافظة عليه
            const currentName = interaction.channel.name;
            const prefix = currentName.match(/^[^\w]*[\w]*〢/)?.[0] || '';
            const finalName = prefix ? `${prefix}${newName}` : newName;
            
            await interaction.channel.setName(finalName);
            
            const embed = new EmbedBuilder()
                .setTitle('Ticket Renamed Successfully')
                .addFields(
                    { name: 'New Name', value: finalName, inline: true },
                    { name: 'Renamed by', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('خطأ في تغيير اسم التذكرة:', error);
            await interaction.reply({ content: '❌ حدث خطأ في تغيير اسم التذكرة.', ephemeral: true });
        }
    }

    async summonUser(interaction, client) {
        const ticket = await extractTicketFromChannel(interaction);
        if (!ticket) {
            return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });
        }

        try {
            const user = await client.users.fetch(ticket.userId);
            
            // إرسال رسالة خاصة للمستخدم
            const dmEmbed = new EmbedBuilder()
                .setTitle('You are being summoned to your ticket')
                .setDescription(`An admin has requested your presence in your ticket.`)
                .addFields(
                    { name: 'Ticket Channel', value: `<#${interaction.channel.id}>`, inline: true },
                    { name: 'Summoned by', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            try {
                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('لا يمكن إرسال رسالة خاصة للمستخدم');
            }
            
            // رسالة في القناة
            await interaction.channel.send(`<@${ticket.userId}> تم استدعاؤك من قبل <@${interaction.user.id}>`);
            
            const embed = new EmbedBuilder()
                .setTitle('User Summoned Successfully')
                .addFields(
                    { name: 'User', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Summoned by', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('خطأ في استدعاء المستخدم:', error);
            await interaction.reply({ content: '❌ حدث خطأ في استدعاء المستخدم.', ephemeral: true });
        }
    }

    async blacklistUser(interaction) {
        const ticket = await extractTicketFromChannel(interaction);
        if (!ticket) {
            return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });
        }

        try {
            // تحميل إعدادات النظام للحصول على رتبة البلاك ليست
            const systemConfig = await this.loadSystemConfig();
            const member = await interaction.guild.members.fetch(ticket.userId);
            
            // إضافة رتبة البلاك ليست
            if (systemConfig.blacklistRole) {
                await member.roles.add(systemConfig.blacklistRole);
            }

            // إزالة صلاحيات المستخدم من القناة
            await interaction.channel.permissionOverwrites.create(ticket.userId, {
                ViewChannel: false,
                SendMessages: false,
                ReadMessageHistory: false
            });

            const embed = new EmbedBuilder()
                .setTitle('User Blacklisted')
                .setDescription('User has been added to the blacklist and cannot create tickets anymore')
                .addFields(
                    { name: 'User', value: `<@${ticket.userId}>`, inline: true },
                    { name: 'Blacklisted by', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Action', value: 'Added to blacklist role', inline: true }
                )
                .setColor(0xff0000)
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('خطأ في حظر المستخدم:', error);
            await interaction.reply({ content: '❌ حدث خطأ في حظر المستخدم.', ephemeral: true });
        }
    }

    async loadSystemConfig() {
        try {
            const configPath = path.join(__dirname, '../data/config.json');
            const data = await fs.readFile(configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('خطأ في تحميل إعدادات النظام:', error);
            return null;
        }
    }

    async showChannelPermissionsMenu(interaction) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('channel_permissions_select')
            .setPlaceholder('Choose permission to modify')
            .addOptions([
                {
                    label: 'View Channel',
                    description: 'Toggle channel visibility',
                    value: 'toggle_view'
                },
                {
                    label: 'Send Messages',
                    description: 'Toggle message sending',
                    value: 'toggle_messages'
                },
                {
                    label: 'Attach Files',
                    description: 'Toggle file attachments',
                    value: 'toggle_files'
                },
                {
                    label: 'Send Images',
                    description: 'Toggle image sending',
                    value: 'toggle_images'
                },
                {
                    label: 'Send Videos',
                    description: 'Toggle video sending',
                    value: 'toggle_videos'
                },
                {
                    label: 'Send Links',
                    description: 'Toggle link embedding',
                    value: 'toggle_links'
                },
                {
                    label: 'Add Reactions',
                    description: 'Toggle emoji reactions',
                    value: 'toggle_reactions'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('Channel Permissions Management')
            .setDescription('Select a permission to toggle for this ticket channel:')
            .setColor(0x0099ff)
            .setFooter({ text: 'MT Community' });

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    async handleChannelPermissions(interaction) {
        const permission = interaction.values[0];
        const ticket = await extractTicketFromChannel(interaction);
        
        if (!ticket) {
            return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });
        }

        try {
            const currentOverwrite = interaction.channel.permissionOverwrites.cache.get(ticket.userId);
            
            let permissionToToggle;
            let permissionName;

            switch (permission) {
                case 'toggle_view':
                    permissionToToggle = PermissionFlagsBits.ViewChannel;
                    permissionName = 'View Channel';
                    break;
                case 'toggle_messages':
                    permissionToToggle = PermissionFlagsBits.SendMessages;
                    permissionName = 'Send Messages';
                    break;
                case 'toggle_files':
                    permissionToToggle = PermissionFlagsBits.AttachFiles;
                    permissionName = 'Attach Files';
                    break;
                case 'toggle_images':
                    permissionToToggle = PermissionFlagsBits.AttachFiles;
                    permissionName = 'Send Images';
                    break;
                case 'toggle_videos':
                    permissionToToggle = PermissionFlagsBits.AttachFiles;
                    permissionName = 'Send Videos';
                    break;
                case 'toggle_links':
                    permissionToToggle = PermissionFlagsBits.EmbedLinks;
                    permissionName = 'Send Links';
                    break;
                case 'toggle_reactions':
                    permissionToToggle = PermissionFlagsBits.AddReactions;
                    permissionName = 'Add Reactions';
                    break;
                default:
                    return await interaction.reply({ content: '❌ Invalid permission.', ephemeral: true });
            }

            const currentState = currentOverwrite?.allow?.has(permissionToToggle);
            const newState = !currentState;

            const updates = {};
            updates[permissionToToggle] = newState;

            await interaction.channel.permissionOverwrites.edit(ticket.userId, updates);

            const embed = new EmbedBuilder()
                .setTitle('Permission Updated')
                .addFields(
                    { name: 'Permission', value: permissionName, inline: true },
                    { name: 'New State', value: newState ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'Updated by', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(newState ? 0x00ff00 : 0xff0000)
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('خطأ في تعديل الصلاحيات:', error);
            await interaction.reply({ content: '❌ حدث خطأ في تعديل الصلاحيات.', ephemeral: true });
        }
    }
}

module.exports = new TicketManagementHandler();