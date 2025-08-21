const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const fs = require('fs').promises;
const fsp = fs.promises;
const path = require('path');
const config = require('../../../config');

// تحميل إعدادات النظام
async function loadSystemConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام التذاكر:', error);
        return null;
    }
}

// حفظ إعدادات النظام
async function saveSystemConfig(config) {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ إعدادات النظام:', error);
        return false;
    }
}

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

// تحميل نقاط التذاكر
async function loadTicketPoints() {
    try {
        const pointsPath = path.join(__dirname, '../data/points.json');
        const data = await fs.readFile(pointsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// حفظ نقاط التذاكر
async function saveTicketPoints(points) {
    try {
        const pointsPath = path.join(__dirname, '../data/points.json');
        await fs.writeFile(pointsPath, JSON.stringify(points, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ نقاط التذاكر:', error);
        return false;
    }
}

// تحميل فترات الانتظار
async function loadClaimCooldowns() {
    try {
        const cooldownsPath = path.join(__dirname, '../data/cooldowns.json');
        const data = await fs.readFile(cooldownsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// حفظ فترات الانتظار
async function saveClaimCooldowns(cooldowns) {
    try {
        const cooldownsPath = path.join(__dirname, '../data/cooldowns.json');
        await fs.writeFile(cooldownsPath, JSON.stringify(cooldowns, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ فترات الانتظار:', error);
        return false;
    }
}

// تحميل طلبات الاستلام
async function loadClaimRequests() {
    try {
        const requestsPath = path.join(__dirname, '../data/claimRequests.json');
        const data = await fs.readFile(requestsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// حفظ طلبات الاستلام
async function saveClaimRequests(requests) {
    try {
        const requestsPath = path.join(__dirname, '../data/claimRequests.json');
        await fs.writeFile(requestsPath, JSON.stringify(requests, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ طلبات الاستلام:', error);
        return false;
    }
}

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// الحصول على اسم نوع التذكرة
function getTicketTypeName(type, systemConfig) {
    return systemConfig.ticketTypes[type]?.name || type;
}


// دالة لحماية النصوص
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

// توليد الترانسكريبت
async function generateTranscriptHTML(channel) {
    let messages = [];
    let lastId;
    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) break;
        messages = messages.concat(Array.from(fetched.values()));
        lastId = fetched.last().id;
    }

    messages = messages.reverse();

    let html = `
     <!DOCTYPE html>
     <html lang="en">
     <head>
     <meta charset="UTF-8">
      <title>Ticket Transcript - ${channel.name}</title>
     <style>
     body { font-family: "Segoe UI", sans-serif; background: #2c2f33; color: #fff; }
     .container { max-width: 800px; margin: auto; padding: 20px; background: #36393f; border-radius: 10px; }
     .message { display: flex; margin-bottom: 15px; }
     .avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; }
     .content { flex: 1; }
     .author { font-weight: bold; }
     .timestamp { font-size: 0.8em; color: #b9bbbe; margin-left: 5px; }
     .text { margin-top: 2px; white-space: pre-wrap; }
     .attachment { margin-top: 5px; }
     .reply { margin-top: 5px; font-style: italic; color: #b9bbbe; }
     .embed { margin-top: 5px; padding: 10px; border-left: 4px solid #7289da; background: #2f3136; border-radius: 5px; }
     </style>
     </head>
     <body>
     <div class="container">
     <h2>Transcript - ${channel.name}</h2>
      `;

    for (const msg of messages) {
        const avatar = msg.author.displayAvatarURL({ dynamic: true, size: 64 });
        const timestamp = msg.createdAt.toLocaleString();
        let content = msg.content ? escapeHTML(msg.content) : '';

        let replyText = '';
        if (msg.reference) {
            try {
                const refMsg = await channel.messages.fetch(msg.reference.messageId);
                replyText = `<div class="reply">Replying to <strong>${escapeHTML(refMsg.author.tag)}</strong>: ${escapeHTML(refMsg.content)}</div>`;
            } catch (e) {
                replyText = `<div class="reply">Replying to unknown message</div>`;
            }
        }

        let attachments = '';
        if (msg.attachments.size > 0) {
            attachments = Array.from(msg.attachments.values()).map(a => {
                if (a.contentType?.startsWith('image')) {
                    return `<div class="attachment"><img src="${a.url}" alt="image" style="max-width: 300px;"></div>`;
                } else {
                    return `<div class="attachment"><a href="${a.url}" target="_blank">Attachment: ${a.name}</a></div>`;
                }
            }).join('');
        }

        let embedsHTML = '';
        if (msg.embeds.length > 0) {
            embedsHTML = msg.embeds.map(embed => {
                return `<div class="embed">
                    <strong>${escapeHTML(embed.title || '')}</strong><br>
                    ${escapeHTML(embed.description || '')}<br>
                    ${embed.url ? `<a href="${embed.url}" target="_blank">${embed.url}</a>` : ''}
                </div>`;
            }).join('');
        }

        html += `
<div class="message">
<img src="${avatar}" class="avatar">
<div class="content">
<span class="author">${escapeHTML(msg.author.tag)}</span> <span class="timestamp">${timestamp}</span>
<div class="text">${content}</div>
${replyText}
${attachments}
${embedsHTML}
</div>
</div>
`;
    }

    html += `
</div>
</body>
</html>
`;

    const transcriptsDir = path.join(__dirname, 'transcripts');
    await fsp.mkdir(transcriptsDir, { recursive: true });
    const filePath = path.join(transcriptsDir, `ticket-${channel.id}-transcript.html`);
    await fsp.writeFile(filePath, html);
    return filePath;
}


class TicketHandler {
    async handleTicketSelect(interaction, client) {
        const ticketType = interaction.values[0];
        const systemConfig = await loadSystemConfig();

        if (!systemConfig || !systemConfig.ticketTypes[ticketType]) {
            return await interaction.reply({ content: '❌ نوع التذكرة غير صحيح.', flags: 64 });
        }

        const guild = interaction.guild;
        const member = interaction.member;
        const ticketConfig = systemConfig.ticketTypes[ticketType];

        // التحقق من البلاك ليست
        if (member.roles.cache.has(systemConfig.blacklistRole)) {
            return await interaction.reply({ 
                content: '❌ أنت محظور من فتح التذاكر.', 
                flags: 64 
            });
        }

        // التحقق من وجود تذكرة مفتوحة للمستخدم
        const tickets = await loadTickets();
        const existingTicket = tickets.find(ticket => 
            ticket.userId === member.id && ticket.status === 'open'
        );

        if (existingTicket) {
            return await interaction.reply({ 
                content: `❌ لديك تذكرة مفتوحة بالفعل: <#${existingTicket.channelId}>`, 
                flags: 64 
            });
        }

        try {
            const channelName = ticketConfig.channelName.replace('{username}', member.user.username);

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: systemConfig.categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                        type: 'role'
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ],
                        type: 'member'
                    },
                    ...ticketConfig.roles.map(roleId => ({
                        id: roleId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.ManageChannels
                        ],
                        type: 'role'
                    }))
                ]
            });

            const permissions = systemConfig.permissions;
            await ticketChannel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                SendMessages: permissions.send_messages,
                AttachFiles: permissions.attach_files,
                EmbedLinks: permissions.embed_links,
                UseExternalEmojis: permissions.use_external_emojis,
                AddReactions: permissions.add_reactions
            });

            const ticket = {
                id: generateId(),
                channelId: ticketChannel.id,
                userId: member.id,
                type: ticketType,
                status: 'open',
                claimedBy: null,
                createdAt: new Date().toISOString(),
                claimedAt: null
            };

            tickets.push(ticket);
            await saveTickets(tickets);

            const welcomeMessage = ` MT Community Tickets <:MTC51:1385564410684244070> 

    اهلاً بك في قسم التذاكر يرجى منك قراءة جميع القوانين ادناه وإتباعها لضمان عدم التعرض للعقوبات الصارمة :
    *————————————————*
    ### <:MTC46:1278875015281901664> قواعد وجب مراجعتها :
    - في حال فتح تذكرة وعدم الرد عليها أو التعامل معها بطريقة غير جدّية ، سيتم إضافتك إلى القائمة السوداء من فتح التذاكر .
    - سياسة الخصوصية : يرجى أن جميع محتويات التذاكر محمية بسرية تامة ، يُمنع منعًا باتًا نشر أي محتوى من داخل التذكرة ، أو مشاركاه مع أطراف أخرى ، أو أخد لقطات شاشة .
    <:MTC45:1278875041584648222> *أي انتهاك لهذه السياسات سيؤدي إلى اتخاذ إجراءات صارمة*

    **Ticket Type:** ${ticketConfig.name}
    **Created by:** <@${member.id}>
    **Ticket ID:** ${ticket.id}`;

            const welcomeEmbed = new EmbedBuilder()
                .setTitle('Ticket Created')
                .setDescription(welcomeMessage)
                .setColor(0x0099ff)
                .addFields(
                    { name: 'User', value: `<@${member.id}>`, inline: true },
                    { name: 'Type', value: ticketConfig.name, inline: true },
                    { name: 'Status', value: 'Open', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_claim')
                        .setLabel('Claim')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✋'),
                    new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

            const manageMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_manage')
                .setPlaceholder('Ticket Management Options')
                .addOptions(
                    { label: 'Add/Remove User', description: 'Add or remove a user from this ticket', value: 'add_user', emoji: '👤' },
                    { label: 'Summon User', description: 'Send DM to user to come to ticket', value: 'summon_user', emoji: '📨' },
                    { label: 'Blacklist User', description: 'Add user to blacklist', value: 'blacklist_user', emoji: '🚫' },
                    { label: 'Rename Ticket', description: 'Change ticket name', value: 'rename_ticket', emoji: '✏️' },
                    { label: 'Channel Permissions', description: 'Manage channel permissions', value: 'channel_permissions', emoji: '🔧' }
                );

            const manageRow = new ActionRowBuilder().addComponents(manageMenu);

            await ticketChannel.send({ embeds: [welcomeEmbed], components: [buttonRow, manageRow] });

            if (ticketConfig.mentionRoles && ticketConfig.mentionRoles.length > 0) {
                const mentions = ticketConfig.mentionRoles.map(roleId => `<@&${roleId}>`).join(' ');
                await ticketChannel.send(mentions);
            }

            await interaction.reply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}`, flags: 64 });

        } catch (error) {
            console.error('خطأ في إنشاء التذكرة:', error);
            await interaction.reply({ content: '❌ حدث خطأ في إنشاء التذكرة.', flags: 64 });
        }
    }

    async handleTicketClaim(interaction) {
        const systemConfig = await loadSystemConfig();
        const tickets = await loadTickets();

        const ticket = tickets.find(t => t.channelId === interaction.channel.id);
        if (!ticket) return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });

        if (ticket.claimedBy) return await interaction.reply({ content: '❌ هذه التذكرة مستلمة بالفعل.', ephemeral: true });

        if (ticket.userId === interaction.user.id) {
            return await interaction.reply({ content: '❌ لا يمكنك استلام التذكرة الخاصة بك.', ephemeral: true });
        }

        const ticketConfig = systemConfig.ticketTypes[ticket.type];
        const hasPermission = interaction.member.roles.cache.some(role => ticketConfig.roles.includes(role.id)) 
            || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasPermission) {
            return await interaction.reply({ content: '❌ ليس لديك صلاحية لاستلام هذه التذكرة.', ephemeral: true });
        }

        ticket.claimedBy = interaction.user.id;
        ticket.claimedAt = new Date().toISOString();

        // إضافة تاريخ الاستلام إلى السجل
        if (!ticket.claimHistory) ticket.claimHistory = [];
        ticket.claimHistory.push({
            userId: interaction.user.id,
            action: 'claimed',
            timestamp: new Date().toISOString(),
            isAdminAction: interaction.member.permissions.has(PermissionFlagsBits.Administrator)
        });

        await saveTickets(tickets);

        await this.addTicketPoint(interaction.user.id);

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setFields(
                { name: 'User', value: `<@${ticket.userId}>`, inline: true },
                { name: 'Type', value: ticketConfig.name, inline: true },
                { name: 'Status', value: 'Claimed', inline: true },
                { name: 'Claimed by', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Claimed at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setColor(0x00ff00);

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('Unclaim').setStyle(ButtonStyle.Secondary).setEmoji('↪️'),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

        const manageMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_manage')
            .setPlaceholder('Ticket Management Options')
            .addOptions(
                { label: 'Add/Remove User', description: 'Add or remove a user from this ticket', value: 'add_user', emoji: '👤' },
                { label: 'Summon User', description: 'Send DM to user to come to ticket', value: 'summon_user', emoji: '📨' },
                { label: 'Blacklist User', description: 'Add user to blacklist', value: 'blacklist_user', emoji: '🚫' },
                { label: 'Rename Ticket', description: 'Change ticket name', value: 'rename_ticket', emoji: '✏️' },
                { label: 'Channel Permissions', description: 'Manage channel permissions', value: 'channel_permissions', emoji: '🔧' }
            );

        const manageRow = new ActionRowBuilder().addComponents(manageMenu);

        await interaction.update({ embeds: [updatedEmbed], components: [buttonRow, manageRow] });
    }

    async handleTicketUnclaim(interaction) {
        const systemConfig = await loadSystemConfig();
        const tickets = await loadTickets();

        const ticket = tickets.find(t => t.channelId === interaction.channel.id);
        if (!ticket) return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });

        if (!ticket.claimedBy) return await interaction.reply({ content: '❌ هذه التذكرة غير مستلمة حالياً.', ephemeral: true });

        if (ticket.claimedBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({ content: '❌ فقط الشخص اللي استلم التذكرة يقدر يفك الاستلام.', ephemeral: true });
        }

        // إضافة تاريخ فك الاستلام إلى السجل
        if (!ticket.claimHistory) ticket.claimHistory = [];
        ticket.claimHistory.push({
            userId: interaction.user.id,
            action: 'unclaimed',
            timestamp: new Date().toISOString(),
            isAdminAction: interaction.member.permissions.has(PermissionFlagsBits.Administrator)
        });

        ticket.claimedBy = null;
        ticket.claimedAt = null;
        await saveTickets(tickets);

        const ticketConfig = systemConfig.ticketTypes[ticket.type];
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setFields(
                { name: 'User', value: `<@${ticket.userId}>`, inline: true },
                { name: 'Type', value: ticketConfig.name, inline: true },
                { name: 'Status', value: 'Open', inline: true }
            )
            .setColor(0x0099ff);

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('✋'),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

        const manageMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_manage')
            .setPlaceholder('Ticket Management Options')
            .addOptions(
                { label: 'Add/Remove User', description: 'Add or remove a user from this ticket', value: 'add_user', emoji: '👤' },
                { label: 'Summon User', description: 'Send DM to user to come to ticket', value: 'summon_user', emoji: '📨' },
                { label: 'Blacklist User', description: 'Add user to blacklist', value: 'blacklist_user', emoji: '🚫' },
                { label: 'Rename Ticket', description: 'Change ticket name', value: 'rename_ticket', emoji: '✏️' },
                { label: 'Channel Permissions', description: 'Manage channel permissions', value: 'channel_permissions', emoji: '🔧' }
            );

        const manageRow = new ActionRowBuilder().addComponents(manageMenu);

        await interaction.update({ embeds: [updatedEmbed], components: [buttonRow, manageRow] });
        await interaction.channel.send(`↩️ <@${interaction.user.id}> فك استلام التذكرة. يمكن الآن لأي إداري استلامها.`);
    }

    async handleTicketClose(interaction) {
        const systemConfig = await loadSystemConfig();
        const tickets = await loadTickets();
        const ticket = tickets.find(t => t.channelId === interaction.channel.id);

        if (!ticket) return await interaction.reply({ content: '❌ لم يتم العثور على بيانات التذكرة.', ephemeral: true });

        const canClose = ticket.claimedBy === interaction.user.id || 
                        interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!canClose) {
            return await interaction.reply({ content: '❌ يمكن فقط للأدمن الذي استلم التذكرة أو المدير إغلاقها.', ephemeral: true });
        }

        try {
            ticket.status = 'closed';
            ticket.closedBy = interaction.user.id;
            ticket.closedAt = new Date().toISOString();
            await saveTickets(tickets);

            const claimRequests = await loadClaimRequests();
            const updatedRequests = claimRequests.filter(req => req.channelId !== interaction.channel.id);
            await saveClaimRequests(updatedRequests);

            await interaction.reply('🔒 سيتم إغلاق التذكرة خلال 5 ثوان...');

            setTimeout(async () => {
                try {
        // 1. جيب القناة قبل الحذف
                    const channel = interaction.guild.channels.cache.get(ticket.channelId);

        // 2. سوّي الترانسكريبت وأرسل اللوق
                    await this.logTicketClosure(interaction.guild, ticket, systemConfig);

        // 3. بعد ما ينرسل اللوق احذف القناة
                    if (channel) await channel.delete();
                } catch (error) {
                    console.error('خطأ في تسجيل أو حذف قناة التذكرة:', error);
                    }
            }, 5000);

        } catch (error) {
            console.error('خطأ في إغلاق التذكرة:', error);
            await interaction.reply({ content: '❌ حدث خطأ في إغلاق التذكرة.', ephemeral: true });
        }
    }

    async logTicketClosure(guild, ticket, systemConfig) {
        try {
            const logChannel = guild.channels.cache.get(systemConfig.logChannelId);
            if (!logChannel) {
                console.log('لم يتم العثور على قناة السجل');
                return;
            }

            const ticketTypeName = getTicketTypeName(ticket.type, systemConfig);
            const user = await guild.members.fetch(ticket.userId).catch(() => null);
            const closer = await guild.members.fetch(ticket.closedBy).catch(() => null);
            const channel = guild.channels.cache.get(ticket.channelId);

            if (!channel) {
                console.error(`Could not find channel for ticket ${ticket.id}`);
                return;
            }

            // إنشاء معلومات تاريخ الاستلام والفك مع تصحيح التواقيت
            let claimHistoryText = 'لم يتم الاستلام';
            if (ticket.claimHistory && ticket.claimHistory.length > 0) {
                claimHistoryText = ticket.claimHistory.map(claim => {
                    const action = claim.action === 'claimed' ? 'استلم' : 'فك الاستلام';
                    const adminText = claim.isAdminAction ? ' (مدير)' : '';
                    try {
                        const timestamp = new Date(claim.timestamp);
                        if (isNaN(timestamp.getTime())) {
                            return `• <@${claim.userId}> ${action}${adminText} في تاريخ غير صحيح`;
                        }
                        // تحويل إلى التوقيت السعودي مع الأرقام الإنجليزية
                        const formattedTime = timestamp.toLocaleString('en-US', {
                            timeZone: 'Asia/Riyadh',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                        return `• <@${claim.userId}> ${action}${adminText} في ${formattedTime} (السعودية)`;
                    } catch (error) {
                        console.error('خطأ في تنسيق التوقيت:', error);
                        return `• <@${claim.userId}> ${action}${adminText} في توقيت غير محدد`;
                    }
                }).join('\n');
            }

            // حساب مدة التذكرة بالتفصيل مع تصحيح التواقيت
            let createdDate, closedDate, duration, createdSaudiTime, closedSaudiTime;

            try {
                createdDate = new Date(ticket.createdAt);
                closedDate = new Date(ticket.closedAt);

                if (isNaN(createdDate.getTime()) || isNaN(closedDate.getTime())) {
                    console.error('تواريخ غير صحيحة في بيانات التذكرة:', ticket.createdAt, ticket.closedAt);
                    throw new Error('تواريخ غير صحيحة');
                }

                duration = this.calculateDetailedDuration(createdDate, closedDate);

                const timeOptions = {
                    timeZone: 'Asia/Riyadh',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                };

                createdSaudiTime = createdDate.toLocaleString('en-US', timeOptions);
                closedSaudiTime = closedDate.toLocaleString('en-US', timeOptions);
            } catch (error) {
                console.error('خطأ في معالجة التوقيتات:', error);
                duration = 'غير محدد';
                createdSaudiTime = 'غير محدد';
                closedSaudiTime = 'غير محدد';
            }

            const logEmbed = new EmbedBuilder()
                .setTitle('🔒 تم إغلاق تذكرة')
                .setDescription(`معلومات التذكرة الكاملة\n**اسم السيرفر:** ${guild.name}`)
                .setColor(0xff0000)
                .addFields(
                    { name: '🆔 معرف التذكرة', value: `\`${ticket.id}\``, inline: true },
                    { name: '📋 نوع التذكرة', value: ticketTypeName, inline: true },
                    { name: '📊 الحالة', value: '🔴 مُغلقة', inline: true },
                    { name: '👤 منشئ التذكرة', value: user ? `<@${ticket.userId}>` : `مستخدم مجهول (${ticket.userId})`, inline: true },
                    { name: '🔒 مُغلقة بواسطة', value: closer ? `<@${ticket.closedBy}>` : `مستخدم مجهول (${ticket.closedBy})`, inline: true },
                    { name: '⏰ مدة التذكرة', value: duration, inline: true },
                    { name: '📅 تاريخ الإنشاء', value: `${createdSaudiTime} (السعودية)`, inline: true },
                    { name: '🔒 تاريخ الإغلاق', value: `${closedSaudiTime} (السعودية)`, inline: true },
                    { name: '📋 سجل الاستلام', value: claimHistoryText, inline: false }
                )
                .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
                .setTimestamp()
                .setFooter({ text: 'MT Community Tickets System', iconURL: guild.iconURL({ dynamic: true, size: 128 }) });

            // إنشاء الترانسكريبت باستخدام مكتبة discord-html-transcripts
            try {
                console.log(`بدء إنشاء ترانسكريبت للتذكرة ${ticket.id}`);
                
                const transcript = await discordTranscripts.createTranscript(channel, {
                    limit: -1,
                    fileName: `ticket-${ticket.id}-transcript.html`,
                    poweredBy: false,
                    saveImages: true,
                    returnBuffer: false,
                    minify: false,
                    saveAttachments: true,
                    useCDN: false, // تعطيل CDN لتجنب مشاكل الصور
                    loadCss: true,
                    hydrate: true,
                    footerText: `MT Community Tickets - ${new Date().toLocaleString('en-US', {
                        timeZone: 'Asia/Riyadh',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    })}`,
                    headerText: `Ticket Transcript - ${channel.name}`,
                    style: "dark",
                    customCss: `
                        :root {
                            --background-primary: #36393f;
                            --background-secondary: #2f3136;
                            --background-tertiary: #202225;
                            --background-floating: #18191c;
                            --channeltextarea-background: #40444b;
                            --interactive-normal: #b9bbbe;
                            --interactive-hover: #dcddde;
                            --interactive-active: #fff;
                            --text-normal: #dcddde;
                            --text-muted: #72767d;
                            --header-primary: #fff;
                            --header-secondary: #b9bbbe;
                        }
                        
                        /* تحسينات عامة */
                        body {
                            font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            line-height: 1.5;
                            margin: 0;
                            padding: 0;
                            -webkit-font-smoothing: antialiased;
                            -moz-osx-font-smoothing: grayscale;
                            background-color: var(--background-tertiary);
                        }
                        
                        /* تحسين التجاوب */
                        @media (max-width: 768px) {
                            .container {
                                padding: 10px;
                            }
                            .chat-message {
                                padding: 8px;
                            }
                            .chat-message-content img {
                                max-width: 100% !important;
                                height: auto !important;
                            }
                        }

                        /* تصميم الرسائل */
                        .chat-message-container {
                            background-color: var(--background-primary);
                            border-radius: 8px;
                            margin-bottom: 20px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        }
                        
                        .chat-message {
                            display: flex;
                            padding: 15px;
                            position: relative;
                            border-bottom: 1px solid var(--background-tertiary);
                        }
                        
                        .chat-message:hover {
                            background-color: var(--background-secondary);
                        }
                        
                        /* تحسين الأفاتار */
                        .chat-message-avatar {
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            margin-right: 16px;
                            background-size: cover;
                            background-position: center;
                            flex-shrink: 0;
                            background-color: var(--background-secondary);
                            border: none;
                            object-fit: cover;
                        }
                        
                        /* تحسين المحتوى */
                        .chat-message-content {
                            flex: 1;
                            min-width: 0;
                        }
                        
                        .chat-message-header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 4px;
                        }
                        
                        .chat-message-author {
                            font-weight: 600;
                            color: var(--header-primary);
                            margin-right: 8px;
                        }
                        
                        .chat-message-timestamp {
                            color: var(--text-muted);
                            font-size: 0.75rem;
                        }
                        
                        .chat-message-text {
                            color: var(--text-normal);
                            font-size: 1rem;
                            word-wrap: break-word;
                            white-space: pre-wrap;
                        }

                        /* تحسين الإيموجي */
                        .emoji {
                            width: 1.375em;
                            height: 1.375em;
                            vertical-align: -0.3em;
                            object-fit: contain;
                            display: inline-block;
                        }
                        
                        /* تحسين الembeds */
                        .chat-message-embed {
                            margin-top: 8px;
                            padding: 12px;
                            background-color: var(--background-secondary);
                            border-radius: 4px;
                            border-left: 4px solid var(--header-primary);
                        }
                        
                        .chat-message-embed img {
                            max-width: 100%;
                            border-radius: 4px;
                            margin-top: 8px;
                        }

                        /* تحسين المرفقات */
                        .chat-message-attachment {
                            margin-top: 8px;
                            background-color: var(--background-secondary);
                            border-radius: 4px;
                            padding: 12px;
                        }
                        
                        .chat-message-attachment img {
                            max-width: 100%;
                            max-height: 500px;
                            border-radius: 4px;
                            object-fit: contain;
                        }
                        
                        /* تحسين الأزرار */
                        .chat-message-button {
                            padding: 8px 16px;
                            border-radius: 4px;
                            font-size: 14px;
                            font-weight: 500;
                            cursor: pointer;
                            background-color: var(--brand-experiment);
                            color: #fff;
                            border: none;
                            margin: 4px 8px 4px 0;
                            transition: background-color 0.2s;
                        }
                        
                        .chat-message-button:hover {
                            background-color: var(--brand-experiment-560);
                        }
                        
                        /* تحسين روابط الصور */
                        a[href$=".png"], a[href$=".jpg"], a[href$=".jpeg"], a[href$=".gif"] {
                            color: var(--text-link);
                            text-decoration: none;
                        }
                        
                        /* تحسين للطباعة */
                        @media print {
                            body {
                                background: white;
                                color: black;
                            }
                            .chat-message {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    `
                });

                // إرسال الترانسكريبت وملف المعلومات
                await logChannel.send({
                    embeds: [logEmbed],
                    files: [transcript]
                });

                console.log(`✅ تم إرسال معلومات وترانسكريبت التذكرة ${ticket.id} بنجاح`);

            } catch (error) {
                console.error('خطأ في إنشاء وإرسال الترانسكريبت:', error);
                // محاولة إرسال المعلومات على الأقل إذا فشل الترانسكريبت
                await logChannel.send({
                    embeds: [logEmbed],
                    content: '❌ حدث خطأ في إنشاء الترانسكريبت'
                });
            }

        } catch (error) {
            console.error('خطأ في تسجيل إغلاق التذكرة:', error);
        }
    }

    // دالة بسيطة ومضمونة لإنشاء الترانسكريبت باستخدام Buffer
    async createSimpleTranscript(channel, ticket, guild) {
        try {
            const messages = await this.fetchAllMessages(channel);
            if (!messages || messages.length === 0) {
                return null;
            }

            const user = await guild.members.fetch(ticket.userId).catch(() => null);
            const createdDate = new Date(ticket.createdAt);
            const closedDate = new Date(ticket.closedAt);

            // تحويل التواقيت للتوقيت السعودي
            const timeOptions = {
                timeZone: 'Asia/Riyadh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };

            const createdSaudiTime = createdDate.toLocaleString('ar-SA', timeOptions);
            const closedSaudiTime = closedDate.toLocaleString('ar-SA', timeOptions);
            const exportTime = new Date().toLocaleString('ar-SA', timeOptions);

            let html = `<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📋 Ticket Transcript - ${channel.name}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: #2c2f33; 
            color: #fff; 
            padding: 20px; 
            margin: 0;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: #36393f; 
            border-radius: 10px; 
            overflow: hidden;
        }
        .header { 
            background: #5865f2; 
            padding: 30px; 
            text-align: center; 
            color: white;
        }
        .header h1 { 
            margin: 0 0 10px 0; 
            font-size: 28px;
        }
        .ticket-info { 
            background: #2f3136; 
            padding: 20px; 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px;
        }
        .info-item { 
            background: #36393f; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid #5865f2;
        }
        .info-label { 
            color: #72767d; 
            font-size: 12px; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin-bottom: 5px;
        }
        .info-value { 
            color: #ffffff; 
            font-weight: 600;
        }
        .messages { 
            padding: 20px;
        }
        .message { 
            display: flex; 
            margin-bottom: 15px; 
            padding: 10px; 
            border-radius: 8px; 
            background: #2f3136;
        }
        .avatar { 
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            margin-right: 15px; 
            background: #5865f2;
        }
        .message-content { 
            flex: 1;
        }
        .message-header { 
            display: flex; 
            align-items: center; 
            margin-bottom: 5px;
        }
        .username { 
            font-weight: bold; 
            color: #ffffff; 
            margin-right: 10px;
        }
        .timestamp { 
            font-size: 12px; 
            color: #72767d;
        }
        .message-text { 
            color: #dcddde; 
            line-height: 1.4;
        }
        .footer { 
            background: #2f3136; 
            padding: 20px; 
            text-align: center; 
            color: #72767d; 
            border-top: 1px solid #40444b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 ترانسكريبت التذكرة</h1>
            <div>#${channel.name}</div>
            <div>${guild.name}</div>
        </div>

        <div class="ticket-info">
            <div class="info-item">
                <div class="info-label">🎫 اسم التذكرة</div>
                <div class="info-value">#${channel.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">👤 منشئ التذكرة</div>
                <div class="info-value">${user ? user.displayName : 'مستخدم مجهول'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">📅 تاريخ الإنشاء</div>
                <div class="info-value">${createdSaudiTime} (السعودية)</div>
            </div>
            <div class="info-item">
                <div class="info-label">🔒 تاريخ الإغلاق</div>
                <div class="info-value">${closedSaudiTime} (السعودية)</div>
            </div>
            <div class="info-item">
                <div class="info-label">⏱️ مدة التذكرة</div>
                <div class="info-value">${this.calculateDetailedDuration(createdDate, closedDate)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">💬 عدد الرسائل</div>
                <div class="info-value">${messages.length} رسالة</div>
            </div>
        </div>

        <div class="messages">`;

            for (const message of messages) {
                const timestamp = new Date(message.createdTimestamp).toLocaleString('ar-SA', timeOptions);
                const content = message.content ? this.escapeHtml(message.content) : '[لا يوجد محتوى]';

                html += `
            <div class="message">
                <div class="avatar"></div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="username">${this.escapeHtml(message.author.displayName || message.author.username)}</span>
                        <span class="timestamp">${timestamp} (السعودية)</span>
                    </div>
                    <div class="message-text">${content}</div>
                </div>
            </div>`;
            }

            html += `
        </div>
        <div class="footer">
            <div>تم إنشاء هذا الترانسكريبت بواسطة MT Community Tickets</div>
            <div style="margin-top: 10px; font-size: 12px;">
                تاريخ التصدير: ${exportTime} (السعودية)
            </div>
        </div>
    </div>
</body>
</html>`;

            return html;
        } catch (error) {
            console.error('خطأ في إنشاء الترانسكريبت البسيط:', error);
            return null;
        }
    }

    // دالة لحساب المدة بالتفصيل
    calculateDetailedDuration(startDate, endDate) {
        const diff = endDate - startDate;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let duration = '';
        if (days > 0) duration += `${days} يوم `;
        if (hours > 0) duration += `${hours} ساعة `;
        if (minutes > 0) duration += `${minutes} دقيقة `;
        if (seconds > 0 && days === 0) duration += `${seconds} ثانية`;

        return duration.trim() || 'أقل من ثانية';
    }



    // دالة لحماية النصوص من HTML
    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, (match) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match]));
    }

    // دالة لجلب جميع الرسائل من القناة
    async fetchAllMessages(channel) {
        try {
            let messages = [];
            let lastId;

            while (true) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const fetched = await channel.messages.fetch(options);
                if (fetched.size === 0) break;

                messages = messages.concat(Array.from(fetched.values()));
                lastId = fetched.last().id;
            }

            return messages.reverse();
        } catch (error) {
            console.error('خطأ في جلب الرسائل:', error);
            return [];
        }
    }

    // إضافة نقاط التذكرة
    async addTicketPoint(userId) {
        try {
            const points = await loadTicketPoints();
            if (!points[userId]) {
                points[userId] = 0;
            }

            const systemConfig = await loadSystemConfig();
            const pointsToAdd = systemConfig.pointsPerTicket || 1;

            points[userId] += pointsToAdd;
            await saveTicketPoints(points);

            console.log(`تم إضافة ${pointsToAdd} نقطة للمستخدم ${userId}`);
            return true;
        } catch (error) {
            console.error('خطأ في إضافة نقاط التذكرة:', error);
            return false;
        }
    }
}

module.exports = {
    TicketHandler,
    loadTickets,
    saveTickets,
    loadTicketPoints,
    saveTicketPoints,
    loadClaimCooldowns,
    saveClaimCooldowns,
    loadClaimRequests,
    saveClaimRequests,
    generateId,
    getTicketTypeName,
    escapeHTML,
    generateTranscriptHTML
};