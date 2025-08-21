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
        console.error('خطأ في تحميل إعدادات نظام النقاط:', error);
        return null;
    }
}

// تحميل النقاط
async function loadPoints() {
    try {
        const pointsPath = path.join(__dirname, '../data/points.json');
        const data = await fs.readFile(pointsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// حفظ النقاط
async function savePoints(points) {
    try {
        const pointsPath = path.join(__dirname, '../data/points.json');
        await fs.writeFile(pointsPath, JSON.stringify(points, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ النقاط:', error);
        return false;
    }
}

// تسجيل عملية النقاط
async function logPointOperation(operation) {
    try {
        const systemConfig = await loadSystemConfig();
        if (!systemConfig || !systemConfig.logChannelId) return;

        // سيتم إرسال السجل من خلال معالج منفصل
        console.log('Point operation logged:', operation);
        return true;
    } catch (error) {
        console.error('خطأ في تسجيل عملية النقاط:', error);
        return false;
    }
}

module.exports = {
    name: 'tpoints',
    description: 'إدارة نقاط المستخدمين',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.POINTS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        if (args.length < 1) {
            return await this.showHelp(message);
        }

        const action = args[0].toLowerCase();
        
        switch (action) {
            case 'add':
                return await this.addPoints(message, args.slice(1), client);
            case 'remove':
                return await this.removePoints(message, args.slice(1), client);
            case 'reset':
                return await this.resetPoints(message, args.slice(1), client);
            case 'show':
            case 'leaderboard':
                return await this.showLeaderboard(message);
            case 'help':
                return await this.showHelp(message);
            default:
                return await this.showHelp(message);
        }
    },

    async addPoints(message, args, client) {
        if (args.length < 2) {
            return message.reply('❌ الاستخدام الصحيح: `+points add <@user> <amount>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون عدد النقاط رقم موجب.');
        }

        const points = await loadPoints();
        
        if (!points[userId]) {
            points[userId] = 0;
        }

        points[userId] += amount;
        await savePoints(points);

        // تسجيل العملية
        const operation = {
            type: 'add',
            userId: userId,
            amount: amount,
            performedBy: message.author.id,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            reason: 'Manual addition by admin'
        };

        await logPointOperation(operation);

        await message.reply(`✅ تم إضافة ${amount} نقطة للمستخدم <@${userId}>. المجموع الحالي: ${points[userId]} نقطة`);
    },

    async removePoints(message, args, client) {
        if (args.length < 2) {
            return message.reply('❌ الاستخدام الصحيح: `+points remove <@user> <amount>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون عدد النقاط رقم موجب.');
        }

        const points = await loadPoints();
        
        if (!points[userId] || points[userId] === 0) {
            return message.reply('❌ المستخدم لا يملك نقاط.');
        }

        points[userId] = Math.max(0, points[userId] - amount);
        
        // حذف المستخدم إذا أصبحت نقاطه صفر
        if (points[userId] === 0) {
            delete points[userId];
        }

        await savePoints(points);

        // تسجيل العملية
        const operation = {
            type: 'remove',
            userId: userId,
            amount: amount,
            performedBy: message.author.id,
            timestamp: new Date().toISOString(),
            reason: 'Manual removal by admin'
        };

        await logPointOperation(operation);

        const currentPoints = points[userId] || 0;
        await message.reply(`✅ تم خصم ${amount} نقطة من المستخدم <@${userId}>. المجموع الحالي: ${currentPoints} نقطة`);
    },

    async resetPoints(message, args, client) {
        if (args.length === 0) {
            // إعادة تعيين جميع النقاط
            await savePoints({});
            
            const operation = {
                type: 'reset_all',
                userId: 'all',
                amount: 0,
                performedBy: message.author.id,
                timestamp: new Date().toISOString(),
                reason: 'Complete system reset by admin'
            };

            await logPointOperation(operation);
            
            await message.reply('✅ تم إعادة تعيين جميع النقاط بنجاح.');
        } else {
            // إعادة تعيين نقاط مستخدم معين
            const userId = args[0].replace(/[<@!>]/g, '');
            const points = await loadPoints();
            
            if (!points[userId]) {
                return message.reply('❌ المستخدم لا يملك نقاط.');
            }

            const oldPoints = points[userId];
            delete points[userId];
            await savePoints(points);

            const operation = {
                type: 'reset_user',
                userId: userId,
                amount: oldPoints,
                performedBy: message.author.id,
                timestamp: new Date().toISOString(),
                reason: 'User reset by admin'
            };

            await logPointOperation(operation);

            await message.reply(`✅ تم إعادة تعيين نقاط المستخدم <@${userId}> بنجاح. (كان لديه ${oldPoints} نقطة)`);
        }
    },

    async showLeaderboard(message) {
        const points = await loadPoints();
        const sortedUsers = Object.entries(points)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        if (sortedUsers.length === 0) {
            return message.reply('❌ لا توجد نقاط مسجلة.');
        }

        const leaderboard = sortedUsers
            .map(([userId, userPoints], index) => 
                `${index + 1}. <@${userId}> - **${userPoints}** نقطة`
            )
            .join('\n');

        const embed = {
            title: '🏆 قائمة أفضل 10 مستخدمين',
            description: leaderboard,
            color: 0xffd700,
            timestamp: new Date().toISOString(),
            footer: { text: 'MT Community Points System' }
        };

        await message.reply({ embeds: [embed] });
    },

    async showHelp(message) {
        const embed = {
            title: '📊 مساعدة نظام النقاط',
            description: 'الأوامر المتاحة لإدارة النقاط:',
            fields: [
                {
                    name: '➕ إضافة نقاط',
                    value: '`+points add <@user> <amount>`\nإضافة عدد معين من النقاط لمستخدم',
                    inline: false
                },
                {
                    name: '➖ خصم نقاط',
                    value: '`+points remove <@user> <amount>`\nخصم عدد معين من النقاط من مستخدم',
                    inline: false
                },
                {
                    name: '🔄 إعادة تعيين',
                    value: '`+points reset [user]`\nإعادة تعيين نقاط مستخدم معين أو جميع المستخدمين',
                    inline: false
                },
                {
                    name: '🏆 قائمة المتصدرين',
                    value: '`+points show` أو `+points leaderboard`\nعرض أفضل 10 مستخدمين',
                    inline: false
                },
                {
                    name: '❓ المساعدة',
                    value: '`+points help`\nعرض هذه الرسالة',
                    inline: false
                }
            ],
            color: 0x3498db,
            timestamp: new Date().toISOString(),
            footer: { text: 'MT Community Points System' }
        };

        await message.reply({ embeds: [embed] });
    }
};