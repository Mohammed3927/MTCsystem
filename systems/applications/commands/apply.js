const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

// تحميل إعدادات النظام
async function loadSystemConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام التقديمات:', error);
        return null;
    }
}

module.exports = {
    name: 'apply',
    description: 'إنشاء رسالة التقديم على الأقسام الإدارية',
    async execute(message, args, client) {
        if (!config.SYSTEMS.APPLICATIONS) return;

        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        const systemConfig = await loadSystemConfig();
        if (!systemConfig) {
            return message.reply('❌ حدث خطأ في تحميل إعدادات النظام.');
        }

        const validDepartments = Object.keys(systemConfig.departments);

        if (args.length > 0) {
            const selectedDepartments = args
                .map(arg => arg.toLowerCase())
                .filter(dep => validDepartments.includes(dep));

            if (selectedDepartments.length === 0) {
                return message.reply('❌ لم يتم العثور على أي قسم صحيح. الأقسام المتاحة: ' + validDepartments.join(', '));
            }

            const embed = new EmbedBuilder()
                .setTitle('Section Applys')
                .setDescription(systemConfig.mainMessage.title)
                .setColor(systemConfig.mainMessage.color)
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            const row = new ActionRowBuilder();
            for (const key of selectedDepartments) {
                const dept = systemConfig.departments[key];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`apply_${key}`)
                        .setLabel(dept.name)
                        .setEmoji(dept.emoji)
                        .setStyle(ButtonStyle.Primary)
                );
            }

            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete();
            return;
        }

        // لا توجد أرقومنت -> أرسل جميع الأقسام
        const embed = new EmbedBuilder()
            .setTitle(systemConfig.mainMessage.title)
            .setDescription(systemConfig.mainMessage.description)
            .setColor(systemConfig.mainMessage.color)
            .setTimestamp()
            .setFooter({ text: 'MT Community' });

        const row = new ActionRowBuilder();
        for (const [key, dept] of Object.entries(systemConfig.departments)) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`apply_${key}`)
                    .setLabel(dept.name)
                    .setEmoji(dept.emoji)
                    .setStyle(ButtonStyle.Primary)
            );
        }

        const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

        const messageKey = `${message.author.id}_apply_${message.channel.id}`;
        if (client.sentMessages && client.sentMessages.has(messageKey)) {
            try {
                await sentMessage.delete();
                console.log('[PROTECTION] Deleted duplicate apply message');
                return;
            } catch (error) {
                console.log('[ERROR] Could not delete duplicate message');
            }
        } else {
            if (!client.sentMessages) client.sentMessages = new Map();
            client.sentMessages.set(messageKey, Date.now());

            setTimeout(() => {
                if (client.sentMessages) {
                    client.sentMessages.delete(messageKey);
                }
            }, 10000);
        }

        try {
            await message.delete();
        } catch (error) {
            console.log('[INFO] Could not delete original message (might already be deleted)');
        }
    }
};