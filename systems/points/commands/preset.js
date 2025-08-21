const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

module.exports = {
    name: 'preset',
    description: 'حذف جميع بيانات نظام النقاط',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.POINTS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', flags: 64 });
        }

        // تحميل النقاط للإحصائيات
        let points = {};
        try {
            const pointsPath = path.join(__dirname, '../data/points.json');
            const data = await fs.readFile(pointsPath, 'utf8');
            points = JSON.parse(data);
        } catch (error) {
            // لا توجد نقاط
        }

        const totalUsers = Object.keys(points).length;
        const totalPoints = Object.values(points).reduce((sum, userPoints) => sum + userPoints, 0);

        // إنشاء رسالة التأكيد
        const embed = new EmbedBuilder()
            .setTitle('⚠️ تأكيد حذف بيانات النقاط')
            .setDescription(`**هل أنت متأكد من حذف جميع بيانات نظام النقاط؟**\n\nسيتم حذف:\n• نقاط ${totalUsers} مستخدم\n• إجمالي ${totalPoints} نقطة\n• سجلات العمليات\n• جميع الإحصائيات\n\n**هذا الإجراء لا يمكن التراجع عنه!**`)
            .setColor(config.COLORS.ERROR)
            .setTimestamp()
            .setFooter({ text: 'MT Community Points' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_preset_${message.author.id}`)
                    .setLabel('تأكيد الحذف')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`cancel_preset_${message.author.id}`)
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
                'points.json',
                'logs.json'
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
                .setDescription('تم حذف جميع بيانات نظام النقاط بنجاح.')
                .setColor(config.COLORS.SUCCESS)
                .addFields(
                    {
                        name: '🗑️ تم حذف',
                        value: '• جميع نقاط المستخدمين\n• سجلات العمليات\n• الإحصائيات المحفوظة\n• جميع البيانات المرتبطة'
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'MT Community Points' });

            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            console.error('خطأ في حذف بيانات النقاط:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ خطأ في الحذف')
                .setDescription('حدث خطأ أثناء حذف البيانات. يرجى المحاولة مرة أخرى.')
                .setColor(config.COLORS.ERROR)
                .setTimestamp()
                .setFooter({ text: 'MT Community Points' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};