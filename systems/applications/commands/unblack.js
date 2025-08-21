const { PermissionsBitField, EmbedBuilder } = require('discord.js');
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
        console.error('خطأ في تحميل إعدادات نظام التطبيقات:', error);
        return null;
    }
}

// تحميل قائمة البلاك ليست
async function loadBlacklist() {
    try {
        const blacklistPath = path.join(__dirname, '../data/blacklist.json');
        const data = await fs.readFile(blacklistPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// حفظ قائمة البلاك ليست
async function saveBlacklist(blacklist) {
    try {
        const blacklistPath = path.join(__dirname, '../data/blacklist.json');
        await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ البلاك ليست:', error);
        return false;
    }
}

module.exports = {
    name: 'unblack',
    description: 'إزالة مستخدم من البلاك ليست للتطبيقات',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.APPLICATIONS) {
            return;
        }

        if (args.length < 2) {
            return message.reply('❌ الاستخدام: `+unblack <@user> <department>`\nالأقسام المتاحة: staff, event, media, matches');
        }

        const userMention = args[0];
        const department = args[1].toLowerCase();
        const userId = userMention.replace(/[<@!>]/g, '');

        // التحقق من صحة القسم
        const validDepartments = ['staff', 'event', 'media', 'matches'];
        if (!validDepartments.includes(department)) {
            return message.reply('❌ قسم غير صحيح. الأقسام المتاحة: staff, event, media, matches');
        }

        // التحقق من الصلاحيات
        const systemConfig = await loadSystemConfig();
        if (!systemConfig) {
            return message.reply('❌ حدث خطأ في تحميل إعدادات النظام.');
        }

        let hasPermission = false;

        // إذا كان المستخدم أدمنستريتر
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            hasPermission = true;
        } else {
            // التحقق من رتب المراجعة حسب القسم
            switch (department) {
                case 'staff':
                    hasPermission = systemConfig.reviewers.staff.some(roleId => 
                        message.member.roles.cache.has(roleId)
                    );
                    break;
                case 'event':
                    hasPermission = systemConfig.reviewers.event.some(roleId => 
                        message.member.roles.cache.has(roleId)
                    );
                    break;
                case 'media':
                    hasPermission = systemConfig.reviewers.media.some(roleId => 
                        message.member.roles.cache.has(roleId)
                    );
                    break;
                case 'matches':
                    hasPermission = systemConfig.reviewers.matches.some(roleId => 
                        message.member.roles.cache.has(roleId)
                    );
                    break;
            }
        }

        if (!hasPermission) {
            return message.reply('❌ ليس لديك صلاحية لإزالة المستخدمين من البلاك ليست لهذا القسم.');
        }

        try {
            const user = await client.users.fetch(userId);
            const blacklist = await loadBlacklist();

            // التحقق من وجود المستخدم في البلاك ليست
            if (!blacklist[department] || !blacklist[department].includes(userId)) {
                return message.reply(`❌ المستخدم ${user.tag} ليس في البلاك ليست لقسم ${department}.`);
            }

            // إزالة المستخدم من البلاك ليست
            blacklist[department] = blacklist[department].filter(id => id !== userId);

            // إذا أصبحت القائمة فارغة، احذف القسم
            if (blacklist[department].length === 0) {
                delete blacklist[department];
            }

            await saveBlacklist(blacklist);

            const embed = new EmbedBuilder()
                .setTitle('User Removed from Blacklist')
                .setDescription('User has been successfully removed from the department blacklist')
                .setColor(0x00ff00)
                .addFields(
                    { name: 'User', value: `<@${userId}> (${user.tag})`, inline: true },
                    { name: 'Department', value: department.charAt(0).toUpperCase() + department.slice(1), inline: true },
                    { name: 'Removed by', value: `<@${message.author.id}>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'MT Community' });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('خطأ في إزالة المستخدم من البلاك ليست:', error);
            await message.reply('❌ لم يتم العثور على المستخدم أو حدث خطأ.');
        }
    }
};