const fs = require('fs');
const path = require('path');

module.exports = {
    async execute(message) {
        try {
            // معالجة رسائل نظام الستارتب البديل
            if (message.author.bot) return;
            
            // هنا يمكن إضافة المنطق الخاص بمعالجة الرسائل البديل
            
        } catch (error) {
            console.error('خطأ في معالج الرسائل البديل:', error);
        }
    }
};
const path = require('path');

// Load system configuration
async function loadSystemConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام الستارتب:', error);
        return null;
    }
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        const config = await loadSystemConfig();
        if (!config) return;

        const { prefix = '+', channels, roles } = config;
        const booster_roles = roles?.booster_roles || [];

        // 👇 تحقق من وجود أي رتبة من booster_roles عند العضو
        if (!message.author.bot && booster_roles.length > 0) {
            const member = message.member;

                const hasBoosterRole = booster_roles.some(roleId => member.roles.cache.has(roleId));

                if (hasBoosterRole) {
                    const requiredRole = '852896097525170178';
                    const hasRequiredRole = member.roles.cache.has(requiredRole);

                    if (!hasRequiredRole) {
                        try {
                            const rolesToRemove = booster_roles.filter(roleId => member.roles.cache.has(roleId));
                            console.log(`[Debug] Removing roles`);
                            await member.roles.remove(rolesToRemove);
                            console.log(`تمت إزالة الرتب من ${member.user.tag}`);
                        } catch (error) {
                            console.error('خطأ أثناء إزالة الرتب:', error);
                        }
                    }
                }
            } else {
                console.log('[Debug] member is null');
            }
        }

        // Check if this is the counting channel
        if (channels.countingChannel && message.channel.id === channels.countingChannel) {
            await handleCountingMessage(message);
            return;
        }

        // Check if this is the poster messages channel
        if (message.channel.id === "1271186802237116518") {
            await handlePosterMessage(message);
            return;
        };

async function handleCountingMessage(message) {
    try {
        const messageNumber = parseInt(message.content.trim());

        if (isNaN(messageNumber)) {
            await message.delete();
            console.log(`Deleted non-number message: "${message.content}" by ${message.author.tag}`);
            return;
        }

        const lastValidNumber = await findLastValidNumber(message.channel, message.id);

        if (messageNumber === lastValidNumber + 1) {
            await message.react('✅');
            console.log(`Correct count: ${messageNumber} by ${message.author.tag}`);
        } else {
            await message.delete();
            console.log(`Deleted incorrect count: ${messageNumber} (expected ${lastValidNumber + 1}) by ${message.author.tag}`);
        }
    } catch (error) {
        console.error('Error handling counting message:', error);
        try {
            await message.delete();
        } catch (deleteError) {
            console.error('Error deleting message after error:', deleteError);
        }
    }
}

async function handlePosterMessage(message) {
    try {
        console.log(`Message received in poster channel: "${message.content}" by ${message.author.tag}`);
        // Add any specific logic for poster messages here
    } catch (error) {
        console.error('Error handling poster message:', error);
    }
}

async function findLastValidNumber(channel, currentMessageId) {
    try {
        let lastNumber = 0;
        let lastMessageId = currentMessageId;

        for (let i = 0; i < 10; i++) {
            const messages = await channel.messages.fetch({
                limit: 50,
                before: lastMessageId
            });

            if (messages.size === 0) break;

            for (const [messageId, msg] of messages) {
                if (msg.author.bot) continue;

                const number = parseInt(msg.content.trim());
                if (!isNaN(number)) {
                    console.log(`Found last valid number: ${number}`);
                    return number;
                }

                lastMessageId = messageId;
            }
        }

        console.log(`No valid number found, starting from 0`);
        return 0;
    } catch (error) {
        console.error('Error finding last valid number:', error);
        return 0;
    }
}