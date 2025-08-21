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

// تحميل التقديمات
async function loadApplications() {
    try {
        const applicationsPath = path.join(__dirname, '../data/applications.json');
        const data = await fs.readFile(applicationsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// حفظ التقديمات
async function saveApplications(applications) {
    try {
        const applicationsPath = path.join(__dirname, '../data/applications.json');
        await fs.writeFile(applicationsPath, JSON.stringify(applications, null, 4));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ التقديمات:', error);
        return false;
    }
}

// تحميل القائمة السوداء
async function loadBlacklist() {
    try {
        const blacklistPath = path.join(__dirname, '../data/blacklist.json');
        const data = await fs.readFile(blacklistPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// حفظ القائمة السوداء
async function saveBlacklist(blacklist) {
    try {
        const blacklistPath = path.join(__dirname, '../data/blacklist.json');
        await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 4));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ القائمة السوداء:', error);
        return false;
    }
}

module.exports = {
    name: 'areset',
    description: 'حذف جميع بيانات قسم معين من نظام التقديمات',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.APPLICATIONS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', flags: 64 });
        }

        if (args.length < 1) {
            return message.reply({ content: '❌ الاستخدام: `+areset <department>`\nالأقسام المتاحة: staff, event, media, matches, all', flags: 64 });
        }

        const department = args[0].toLowerCase();
        const systemConfig = await loadSystemConfig();
        
        if (!systemConfig) {
            return message.reply({ content: '❌ حدث خطأ في تحميل إعدادات النظام.', flags: 64 });
        }

        // التحقق من صحة القسم
        if (department !== 'all' && !systemConfig.departments[department]) {
            return message.reply({ content: '❌ القسم المحدد غير موجود. الأقسام المتاحة: staff, event, media, matches, all', flags: 64 });
        }

        // إنشاء رسالة التأكيد
        const embed = new EmbedBuilder()
            .setTitle('⚠️ تأكيد حذف البيانات')
            .setDescription(department === 'all' 
                ? '**هل أنت متأكد من حذف جميع بيانات نظام التقديمات؟**\n\nسيتم حذف:\n• جميع التقديمات المحفوظة\n• جميع القوائم السوداء\n• جميع السجلات\n\n**هذا الإجراء لا يمكن التراجع عنه!**'
                : `**هل أنت متأكد من حذف جميع بيانات قسم ${systemConfig.departments[department]?.name || department}؟**\n\nسيتم حذف:\n• جميع التقديمات الخاصة بهذا القسم\n• القائمة السوداء الخاصة بهذا القسم\n• جميع السجلات المتعلقة بهذا القسم\n\n**هذا الإجراء لا يمكن التراجع عنه!**`)
            .setColor(config.COLORS.ERROR)
            .setTimestamp()
            .setFooter({ text: 'MT Community Applications' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_areset_${department}_${message.author.id}`)
                    .setLabel('تأكيد الحذف')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`cancel_areset_${message.author.id}`)
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleResetConfirmation(interaction, department) {
        try {
            if (department === 'all') {
                // حذف جميع البيانات
                await saveApplications([]);
                await saveBlacklist({});
                
                // حذف ملفات أخرى إذا كانت موجودة
                try {
                    await fs.unlink(path.join(__dirname, '../data/logs.json'));
                } catch (error) {
                    // الملف غير موجود
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم حذف جميع البيانات')
                    .setDescription('تم حذف جميع بيانات نظام التقديمات بنجاح.')
                    .setColor(config.COLORS.SUCCESS)
                    .setTimestamp()
                    .setFooter({ text: 'MT Community Applications' });

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                // حذف بيانات قسم محدد
                const applications = await loadApplications();
                const blacklist = await loadBlacklist();

                // تصفية التقديمات
                const filteredApplications = applications.filter(app => app.department !== department);
                await saveApplications(filteredApplications);

                // حذف القائمة السوداء للقسم
                if (blacklist[department]) {
                    delete blacklist[department];
                    await saveBlacklist(blacklist);
                }

                const systemConfig = await loadSystemConfig();
                const departmentName = systemConfig.departments[department]?.name || department;

                const embed = new EmbedBuilder()
                    .setTitle('✅ تم حذف بيانات القسم')
                    .setDescription(`تم حذف جميع بيانات قسم **${departmentName}** بنجاح.`)
                    .setColor(config.COLORS.SUCCESS)
                    .setTimestamp()
                    .setFooter({ text: 'MT Community Applications' });

                await interaction.update({ embeds: [embed], components: [] });
            }
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ خطأ في الحذف')
                .setDescription('حدث خطأ أثناء حذف البيانات. يرجى المحاولة مرة أخرى.')
                .setColor(config.COLORS.ERROR)
                .setTimestamp()
                .setFooter({ text: 'MT Community Applications' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};