const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

module.exports = {
    name: 'treset',
    description: 'حذف جميع بيانات نظام التذاكر',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.TICKETS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', flags: 64 });
        }

        // إنشاء رسالة التأكيد
        const embed = new EmbedBuilder()
            .setTitle('⚠️ تأكيد حذف بيانات التذاكر')
            .setDescription('**هل أنت متأكد من حذف جميع بيانات نظام التذاكر؟**\n\nسيتم حذف:\n• جميع التذاكر المحفوظة\n• نقاط التذاكر\n• تأخيرات الاستلام\n• طلبات الاستلام\n• جميع السجلات\n\n**هذا الإجراء لا يمكن التراجع عنه!**')
            .setColor(config.COLORS.ERROR)
            .setTimestamp()
            .setFooter({ text: 'MT Community Tickets' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_treset_${message.author.id}`)
                    .setLabel('تأكيد الحذف')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`cancel_treset_${message.author.id}`)
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleResetConfirmation(interaction) {
        try {
            // حذف جميع ملفات البيانات
            const dataPath = path.join(__dirname, '../data');
            const filesToDelete = [
                'tickets.json',
                'ticketPoints.json', 
                'claimCooldowns.json',
                'claimRequests.json'
            ];

            for (const file of filesToDelete) {
                try {
                    await fs.unlink(path.join(dataPath, file));
                } catch (error) {
                    // الملف غير موجود
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ تم حذف البيانات بنجاح')
                .setDescription('تم حذف جميع بيانات نظام التذاكر بنجاح.')
                .setColor(config.COLORS.SUCCESS)
                .addFields(
                    {
                        name: '🗑️ تم حذف',
                        value: '• جميع التذاكر المحفوظة\n• نقاط التذاكر\n• تأخيرات الاستلام\n• طلبات الاستلام\n• جميع السجلات'
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'MT Community Tickets' });

            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            console.error('خطأ في حذف بيانات التذاكر:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ خطأ في الحذف')
                .setDescription('حدث خطأ أثناء حذف البيانات. يرجى المحاولة مرة أخرى.')
                .setColor(config.COLORS.ERROR)
                .setTimestamp()
                .setFooter({ text: 'MT Community Tickets' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};