const { PermissionsBitField } = require('discord.js');
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
async function logPointOperation(client, operation) {
    try {
        const systemConfig = await loadSystemConfig();
        if (!systemConfig || !systemConfig.logChannelId) return;

        const logChannel = client.channels.cache.get(systemConfig.logChannelId);
        if (!logChannel) return;

        const logEmbed = {
            title: 'Points System Log',
            color: 0x0099ff,
            fields: [
                {
                    name: 'Operation',
                    value: operation.action,
                    inline: true
                },
                {
                    name: 'User',
                    value: `<@${operation.userId}>`,
                    inline: true
                },
                {
                    name: 'Points',
                    value: operation.points.toString(),
                    inline: true
                },
                {
                    name: 'Admin',
                    value: `<@${operation.adminId}>`,
                    inline: true
                },
                {
                    name: 'Timestamp',
                    value: new Date().toLocaleString(),
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('خطأ في تسجيل عملية النقاط:', error);
    }
}

class PointsHandler {
    async handlePointsCommand(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.POINTS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        if (args.length === 0) {
            return this.showHelp(message);
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'add':
                await this.addPoints(message, args, client);
                break;
            case 'remove':
                await this.removePoints(message, args, client);
                break;
            case 'reset':
                await this.resetPoints(message, args, client);
                break;
            case 'check':
                await this.checkPoints(message, args);
                break;
            case 'leaderboard':
                await this.showLeaderboard(message);
                break;
            case 'help':
                await this.showHelp(message);
                break;
            default:
                await this.showHelp(message);
        }
    }

    async addPoints(message, args, client) {
        if (args.length < 3) {
            return message.reply('❌ الاستخدام: `+points add <@user> <amount>`');
        }

        const userMention = args[1];
        const amount = parseInt(args[2]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون عدد النقاط رقماً صحيحاً أكبر من صفر.');
        }

        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);

        if (!user) {
            return message.reply('❌ لم يتم العثور على المستخدم.');
        }

        const points = await loadPoints();
        if (!points[userId]) {
            points[userId] = 0;
        }

        points[userId] += amount;
        await savePoints(points);

        const systemConfig = await loadSystemConfig();
        const successMessage = systemConfig?.messages?.pointsAdded || '✅ تم إضافة النقاط بنجاح!';

        const embed = {
            title: 'Points Added Successfully',
            description: `Added ${amount} points to ${user.tag}`,
            color: 0x00ff00,
            fields: [
                {
                    name: 'User',
                    value: `<@${userId}>`,
                    inline: true
                },
                {
                    name: 'Points Added',
                    value: amount.toString(),
                    inline: true
                },
                {
                    name: 'Total Points',
                    value: points[userId].toString(),
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await message.reply({ embeds: [embed] });

        // تسجيل العملية
        await logPointOperation(client, {
            action: 'ADD',
            userId: userId,
            points: amount,
            adminId: message.author.id
        });
    }

    async removePoints(message, args, client) {
        if (args.length < 3) {
            return message.reply('❌ الاستخدام: `+points remove <@user> <amount>`');
        }

        const userMention = args[1];
        const amount = parseInt(args[2]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون عدد النقاط رقماً صحيحاً أكبر من صفر.');
        }

        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);

        if (!user) {
            return message.reply('❌ لم يتم العثور على المستخدم.');
        }

        const points = await loadPoints();
        if (!points[userId] || points[userId] === 0) {
            return message.reply('❌ لا توجد نقاط لهذا المستخدم.');
        }

        points[userId] = Math.max(0, points[userId] - amount);
        
        // حذف المستخدم من البيانات إذا وصلت نقاطه إلى صفر
        if (points[userId] === 0) {
            delete points[userId];
        }

        await savePoints(points);

        const systemConfig = await loadSystemConfig();
        const successMessage = systemConfig?.messages?.pointsRemoved || '✅ تم خصم النقاط بنجاح!';

        const embed = {
            title: 'Points Removed Successfully',
            description: `Removed ${amount} points from ${user.tag}`,
            color: 0xff9900,
            fields: [
                {
                    name: 'User',
                    value: `<@${userId}>`,
                    inline: true
                },
                {
                    name: 'Points Removed',
                    value: amount.toString(),
                    inline: true
                },
                {
                    name: 'Total Points',
                    value: (points[userId] || 0).toString(),
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await message.reply({ embeds: [embed] });

        // تسجيل العملية
        await logPointOperation(client, {
            action: 'REMOVE',
            userId: userId,
            points: amount,
            adminId: message.author.id
        });
    }

    async resetPoints(message, args, client) {
        if (args.length < 2) {
            return message.reply('❌ الاستخدام: `+points reset <@user>`');
        }

        const userMention = args[1];
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await client.users.fetch(userId).catch(() => null);

        if (!user) {
            return message.reply('❌ لم يتم العثور على المستخدم.');
        }

        const points = await loadPoints();
        const oldPoints = points[userId] || 0;
        
        if (oldPoints === 0) {
            return message.reply('❌ لا توجد نقاط لهذا المستخدم.');
        }

        delete points[userId];
        await savePoints(points);

        const systemConfig = await loadSystemConfig();
        const successMessage = systemConfig?.messages?.pointsReset || '✅ تم إعادة تعيين النقاط بنجاح!';

        const embed = {
            title: 'Points Reset Successfully',
            description: `Reset all points for ${user.tag}`,
            color: 0xff0000,
            fields: [
                {
                    name: 'User',
                    value: `<@${userId}>`,
                    inline: true
                },
                {
                    name: 'Previous Points',
                    value: oldPoints.toString(),
                    inline: true
                },
                {
                    name: 'Current Points',
                    value: '0',
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await message.reply({ embeds: [embed] });

        // تسجيل العملية
        await logPointOperation(client, {
            action: 'RESET',
            userId: userId,
            points: oldPoints,
            adminId: message.author.id
        });
    }

    async checkPoints(message, args) {
        if (args.length < 2) {
            return message.reply('❌ الاستخدام: `+points check <@user>`');
        }

        const userMention = args[1];
        const userId = userMention.replace(/[<@!>]/g, '');
        const user = await message.client.users.fetch(userId).catch(() => null);

        if (!user) {
            return message.reply('❌ لم يتم العثور على المستخدم.');
        }

        const points = await loadPoints();
        const userPoints = points[userId] || 0;

        const embed = {
            title: 'User Points',
            color: 0x0099ff,
            fields: [
                {
                    name: 'User',
                    value: `<@${userId}>`,
                    inline: true
                },
                {
                    name: 'Total Points',
                    value: userPoints.toString(),
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await message.reply({ embeds: [embed] });
    }

    async showLeaderboard(message) {
        const points = await loadPoints();
        const sortedUsers = Object.entries(points)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        if (sortedUsers.length === 0) {
            return message.reply('❌ لا توجد نقاط مسجلة حتى الآن.');
        }

        const leaderboardText = sortedUsers.map(([userId, userPoints], index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} <@${userId}> - ${userPoints} points`;
        }).join('\n');

        const embed = {
            title: 'Points Leaderboard',
            description: leaderboardText,
            color: 0xffd700,
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await message.reply({ embeds: [embed] });
    }

    async showHelp(message) {
        const embed = {
            title: 'Points System Help',
            description: 'Available commands for points management',
            color: 0x0099ff,
            fields: [
                {
                    name: 'Add Points',
                    value: '`+points add <@user> <amount>`',
                    inline: false
                },
                {
                    name: 'Remove Points',
                    value: '`+points remove <@user> <amount>`',
                    inline: false
                },
                {
                    name: 'Reset Points',
                    value: '`+points reset <@user>`',
                    inline: false
                },
                {
                    name: 'Check Points',
                    value: '`+points check <@user>`',
                    inline: false
                },
                {
                    name: 'Leaderboard',
                    value: '`+points leaderboard`',
                    inline: false
                },
                {
                    name: 'Help',
                    value: '`+points help`',
                    inline: false
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'MT Community Points System'
            }
        };

        await message.reply({ embeds: [embed] });
    }

    // إضافة نقاط تلقائياً (للاستخدام من أنظمة أخرى)
    async addPointsAutomatically(client, userId, points, reason) {
        try {
            const userPoints = await loadPoints();
            if (!userPoints[userId]) {
                userPoints[userId] = 0;
            }

            userPoints[userId] += points;
            await savePoints(userPoints);

            // تسجيل العملية
            await logPointOperation(client, {
                action: `AUTO_ADD (${reason})`,
                userId: userId,
                points: points,
                adminId: 'SYSTEM'
            });

            return true;
        } catch (error) {
            console.error('خطأ في إضافة النقاط تلقائياً:', error);
            return false;
        }
    }
}

module.exports = PointsHandler;