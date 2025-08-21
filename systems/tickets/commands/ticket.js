const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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
        console.error('خطأ في تحميل إعدادات نظام التذاكر:', error);
        return null;
    }
}

module.exports = {
    name: 'ticket',
    description: 'إنشاء نظام التذاكر',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.TICKETS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        const systemConfig = await loadSystemConfig();
        if (!systemConfig) {
            return message.reply('❌ حدث خطأ في تحميل إعدادات النظام.');
        }

        // إنشاء الإيمبد الرئيسي
        const embed = new EmbedBuilder()
            .setTitle(' MT Community Tickets <:MTC51:1385564410684244070>')
            .setDescription(`### <:MTC39:1385222867460952146> اذا كان لديك أيّ من النقاط أدناه افتح تذكرة :
- <:MTC3:1385222853166628934> استفسار عن شيء معين
- <:MTC45:1278875041584648222> شكوى على عضو & اداري
- <:MTC42:1289909104999006219> استلام جائزة او استفسار عن فعالية
- <:MTC50:1275109948757512284> استفسار عن سبب تبنيدك من مجتمع ام تي في تويتر 
- <:MTC25:1385222913510084669> عمل شراكة مع السيرفر
- تقديم على رتبة البنات 🎀 / الموهوبين <:MTC10:1385223319418048532> 
- <:MTC9:1385224115589484655> تقديم على رتبة مودريتر
**~~—————————————~~**
### <:MTC46:1278875015281901664> قواعد وجب مراجعتها :
- في حال فتح تذكرة وعدم الرد عليها أو التعامل معها بطريقة غير جدّية ، سيتم إضافتك إلى القائمة السوداء من فتح التذاكر .
- سياسة الخصوصية : يرجى أن جميع محتويات التذاكر محمية بسرية تامة ، يُمنع منعًا باتًا نشر أي محتوى من داخل التذكرة ، أو مشاركاه مع أطراف أخرى ، أو أخد لقطات شاشة .
<:MTC45:1278875041584648222> *أي انتهاك لهذه السياسات سيؤدي إلى اتخاذ إجراءات صارمة*`)
            .setColor(0x0099ff)
            .setTimestamp()
            .setFooter({ text: 'MT Community' });

        // إنشاء قائمة الاختيار
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('اختر نوع التذكرة');

        Object.entries(systemConfig.ticketTypes).forEach(([key, ticketType]) => {
            selectMenu.addOptions({
                label: ticketType.name,
                description: `إنشاء تذكرة ${ticketType.name}`,
                value: key,
                emoji: ticketType.emoji
            });
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

        // تتبع الرسائل المرسلة لمنع التكرار
        const messageKey = `${message.author.id}_ticket_${message.channel.id}`;
        if (client.sentMessages && client.sentMessages.has(messageKey)) {
            // حذف الرسالة المكررة
            try {
                await sentMessage.delete();
                console.log('[PROTECTION] Deleted duplicate ticket message');
                return;
            } catch (error) {
                console.log('[ERROR] Could not delete duplicate message');
            }
        } else {
            // تسجيل الرسالة المرسلة
            if (!client.sentMessages) client.sentMessages = new Map();
            client.sentMessages.set(messageKey, Date.now());

            // تنظيف التتبع بعد 10 ثواني
            setTimeout(() => {
                if (client.sentMessages) {
                    client.sentMessages.delete(messageKey);
                }
            }, 10000);
        }

        // حذف الرسالة الأصلية مع معالجة الأخطاء
        try {
            await message.delete();
        } catch (error) {
            console.log('[INFO] Could not delete original message (might already be deleted)');
        }
    }
};