const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

/**
 * معالج الأخطاء في النماذج
 */
class ModalErrorHandler {
    /**
     * رسالة خطأ للمستخدم
     * @param {Interaction} interaction - تفاعل Discord
     * @param {string} message - رسالة الخطأ
     * @param {boolean} [ephemeral=true] - هل الرسالة مؤقتة
     */
    static async sendError(interaction, message, ephemeral = true) {
        try {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ خطأ')
                .setDescription(message)
                .setTimestamp();

            const response = { embeds: [errorEmbed], ephemeral };

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(response);
            } else {
                await interaction.editReply(response);
            }
        } catch (error) {
            console.error('Error sending error message:', error);
            // محاولة إرسال رسالة خطأ بسيطة إذا فشل الإرسال الأول
            try {
                await interaction.reply({ 
                    content: '❌ حدث خطأ غير متوقع', 
                    ephemeral: true 
                });
            } catch (e) {
                console.error('Failed to send fallback error message:', e);
            }
        }
    }

    /**
     * معالجة أخطاء التحقق من الصحة
     * @param {Interaction} interaction - تفاعل Discord
     * @param {Array} errors - مصفوفة الأخطاء
     */
    static async handleValidationErrors(interaction, errors) {
        const errorMessage = errors.map(err => `• ${err}`).join('\n');
        await this.sendError(interaction, 
            '**يرجى تصحيح الأخطاء التالية:**\n' + errorMessage
        );
    }
}

/**
 * التحقق من صحة المدخلات
 */
class InputValidator {
    /**
     * التحقق من معرف القناة
     * @param {string} channelId - معرف القناة
     */
    static isValidChannelId(channelId) {
        return /^\d{17,20}$/.test(channelId.replace(/[<#>]/g, ''));
    }

    /**
     * التحقق من معرف الرتبة
     * @param {string} roleId - معرف الرتبة
     */
    static isValidRoleId(roleId) {
        return /^\d{17,20}$/.test(roleId.replace(/[<@&>]/g, ''));
    }

    /**
     * التحقق من الإيموجي
     * @param {string} emoji - الإيموجي
     */
    static isValidEmoji(emoji) {
        return /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])|<a?:.+?:\d{17,20}>/.test(emoji);
    }

    /**
     * التحقق من النص العام
     * @param {string} text - النص
     * @param {Object} options - خيارات التحقق
     */
    static isValidText(text, options = {}) {
        const {
            minLength = 1,
            maxLength = 2000,
            allowNewlines = true,
            allowSpecialChars = true
        } = options;

        if (!text || typeof text !== 'string') return false;
        if (text.length < minLength || text.length > maxLength) return false;

        if (!allowNewlines && text.includes('\n')) return false;
        if (!allowSpecialChars && /[^\w\s\u0600-\u06FF,.!?@#$%&*()[\]{}=+\-_'"]/g.test(text)) return false;

        return true;
    }
}

/**
 * تنظيف وتحضير المدخلات
 */
class InputSanitizer {
    /**
     * تنظيف معرف القناة
     * @param {string} channelId - معرف القناة
     */
    static sanitizeChannelId(channelId) {
        return channelId.replace(/[<#>]/g, '');
    }

    /**
     * تنظيف معرف الرتبة
     * @param {string} roleId - معرف الرتبة
     */
    static sanitizeRoleId(roleId) {
        return roleId.replace(/[<@&>]/g, '');
    }

    /**
     * تنظيف الإيموجي
     * @param {string} emoji - الإيموجي
     */
    static sanitizeEmoji(emoji) {
        const customEmojiMatch = emoji.match(/<a?:(.+?):(\d{17,20})>/);
        return customEmojiMatch ? customEmojiMatch[0] : emoji;
    }

    /**
     * تنظيف النص العام
     * @param {string} text - النص
     * @param {Object} options - خيارات التنظيف
     */
    static sanitizeText(text, options = {}) {
        const {
            maxLength = 2000,
            allowNewlines = true,
            allowSpecialChars = true
        } = options;

        let sanitized = text.trim();

        if (!allowNewlines) {
            sanitized = sanitized.replace(/[\r\n]+/g, ' ');
        }

        if (!allowSpecialChars) {
            sanitized = sanitized.replace(/[^\w\s\u0600-\u06FF,.!?@#$%&*()[\]{}=+\-_'"]/g, '');
        }

        return sanitized.slice(0, maxLength);
    }
}

module.exports = {
    ModalErrorHandler,
    InputValidator,
    InputSanitizer
};
