const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

// تحميل إعدادات النظام
async function loadVotingConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام التصويت:', error);
        return null;
    }
}

// حفظ إعدادات النظام
async function saveVotingConfig(votingConfig) {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        await fs.writeFile(configPath, JSON.stringify(votingConfig, null, 4));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ إعدادات نظام التصويت:', error);
        return false;
    }
}

module.exports = {
    name: 'vreset',
    description: 'حذف جميع بيانات نظام التصويت',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.VOTING) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', flags: 64 });
        }

        const votingConfig = await loadVotingConfig();
        if (!votingConfig) {
            return message.reply({ content: '❌ حدث خطأ في تحميل إعدادات النظام.', flags: 64 });
        }

        // حساب إجمالي الأصوات
        const totalVotes = Object.values(votingConfig.characters)
            .reduce((sum, char) => sum + char.votes, 0);

        // إنشاء رسالة التأكيد
        const embed = new EmbedBuilder()
            .setTitle('⚠️ تأكيد حذف بيانات التصويت')
            .setDescription(`**هل أنت متأكد من حذف جميع بيانات نظام التصويت؟**\n\nسيتم حذف:\n• جميع الأصوات (${totalVotes} صوت)\n• جميع قوائم الناخبين\n• القائمة السوداء\n• بيانات الفائز إن وجدت\n\n**هذا الإجراء لا يمكن التراجع عنه!**`)
            .setColor(config.COLORS.ERROR)
            .addFields(
                {
                    name: '📊 الأصوات الحالية',
                    value: Object.entries(votingConfig.characters)
                        .map(([id, char]) => `**${char.name}:** ${char.votes} أصوات`)
                        .join('\n')
                }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Voting' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_vreset_${message.author.id}`)
                    .setLabel('تأكيد الحذف')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`cancel_vreset_${message.author.id}`)
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleResetConfirmation(interaction) {
        try {
            const votingConfig = await loadVotingConfig();
            if (!votingConfig) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ خطأ في التحميل')
                    .setDescription('حدث خطأ في تحميل إعدادات النظام.')
                    .setColor(config.COLORS.ERROR)
                    .setTimestamp()
                    .setFooter({ text: 'MT Community Voting' });

                return await interaction.update({ embeds: [embed], components: [] });
            }

            // إعادة تعيين جميع البيانات
            Object.keys(votingConfig.characters).forEach(id => {
                votingConfig.characters[id].votes = 0;
                votingConfig.characters[id].voters = [];
            });

            votingConfig.blacklistedUsers = [];
            votingConfig.votingActive = true;
            votingConfig.winner = null;
            votingConfig.winnerRole = null;

            // حفظ التغييرات
            const success = await saveVotingConfig(votingConfig);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ تم حذف البيانات بنجاح')
                    .setDescription('تم حذف جميع بيانات التصويت وإعادة تعيين النظام.')
                    .setColor(config.COLORS.SUCCESS)
                    .addFields(
                        {
                            name: '🔄 تم إعادة تعيين',
                            value: '• جميع الأصوات (0/0)\n• قوائم الناخبين\n• القائمة السوداء\n• حالة التصويت (مفعل)\n• بيانات الفائز'
                        }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'MT Community Voting' });

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ خطأ في الحذف')
                    .setDescription('حدث خطأ أثناء حذف البيانات. يرجى المحاولة مرة أخرى.')
                    .setColor(config.COLORS.ERROR)
                    .setTimestamp()
                    .setFooter({ text: 'MT Community Voting' });

                await interaction.update({ embeds: [embed], components: [] });
            }
        } catch (error) {
            console.error('خطأ في حذف بيانات التصويت:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ خطأ في الحذف')
                .setDescription('حدث خطأ أثناء حذف البيانات. يرجى المحاولة مرة أخرى.')
                .setColor(config.COLORS.ERROR)
                .setTimestamp()
                .setFooter({ text: 'MT Community Voting' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};