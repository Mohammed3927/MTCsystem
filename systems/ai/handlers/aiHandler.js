const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// تحميل إعدادات النظام
async function loadSystemConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام الذكاء الاصطناعي:', error);
        return null;
    }
}

// استبدال الكلمات المحددة
function replaceWords(text, replacements) {
    let result = text;
    for (const [original, replacement] of Object.entries(replacements)) {
        const regex = new RegExp(original, 'gi');
        result = result.replace(regex, replacement);
    }
    return result;
}

class AIHandler {
    async handleMessage(message) {
        const systemConfig = await loadSystemConfig();
        if (!systemConfig) return;

        // التحقق من القناة الصحيحة
        if (message.channel.id !== systemConfig.channelId) return;

        // تجاهل رسائل البوت
        if (message.author.bot) return;

        const content = message.content.toLowerCase();
        
        try {
            // التحقق من وجود كلمات إنشاء الصور
            const isImageRequest = systemConfig.imageKeywords.some(keyword => 
                content.includes(keyword)
            );

            if (isImageRequest) {
                await this.handleImageRequest(message, systemConfig);
            } else {
                await this.handleTextRequest(message, systemConfig);
            }
        } catch (error) {
            console.error('خطأ في معالجة رسالة الذكاء الاصطناعي:', error);
            await message.reply('❌ حدث خطأ في معالجة طلبك.');
        }
    }

    async handleTextRequest(message, systemConfig) {
        try {
            // استخدام الطريقة الناجحة مباشرة
            const response = await axios.get(systemConfig.apiUrl.text, {
                params: { prompt: message.content },
                headers: { 'Authorization': systemConfig.apiToken },
                timeout: 15000
            });
            
            if (response.data && (response.data.message || response.data.response || response.data.text || response.data.result || response.data.answer)) {
                let aiResponse = response.data.message || response.data.response || response.data.text || response.data.result || response.data.answer;
                
                if (typeof aiResponse === 'object') {
                    aiResponse = JSON.stringify(aiResponse);
                }
                
                // استبدال الكلمات المحددة
                aiResponse = replaceWords(aiResponse.toString(), systemConfig.replacements);
                
                await message.reply(aiResponse);
                return;
            }
            
            // رسالة افتراضية إذا لم تكن هناك استجابة صحيحة
            await message.reply('مرحباً! أنا مساعد ذكي لمجتمع MT Community. كيف يمكنني مساعدتك اليوم؟');
            
        } catch (error) {
            console.error('خطأ في معالجة طلب النص:', error.response?.status || error.code, error.message);
            await message.reply('مرحباً! أنا مساعد ذكي لمجتمع MT Community. كيف يمكنني مساعدتك اليوم؟');
        }
    }

    async handleImageRequest(message, systemConfig) {
        try {
            // استخدام طريقة POST JSON التي تعمل بنجاح
            const response = await axios.post(systemConfig.apiUrl.image, 
                { prompt: message.content },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': systemConfig.apiToken
                    },
                    timeout: 30000
                }
            );
            
            if (response.data && (response.data.image_url || response.data.url || response.data.imageUrl || response.data.image)) {
                const imageUrl = response.data.image_url || response.data.url || response.data.imageUrl || response.data.image;
                await message.reply(`🎨 تم إنشاء الصورة بنجاح: ${imageUrl}`);
                return;
            }
            
            await message.reply('🎨 عذراً، خدمة إنشاء الصور غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.');
            
        } catch (error) {
            console.error('خطأ في إنشاء الصورة:', error.response?.status || error.code, error.message);
            await message.reply('🎨 عذراً، خدمة إنشاء الصور غير متاحة حالياً. يرجى المحاولة مرة أخرى لاحقاً.');
        }
    }
}

module.exports = new AIHandler();