const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// التحقق من صحة البيانات المدخلة
function validateModalInput(input) {
    if (!input || typeof input !== 'string') return false;
    if (input.length === 0 || input.length > 4000) return false;
    // التحقق من عدم وجود رموز خاصة قد تسبب مشاكل
    return !/[^\w\s\u0600-\u06FF,.!?@#$%&*()[\]{}=+\-_'"]/g.test(input);
}

// تنظيف البيانات المدخلة
function sanitizeModalInput(input) {
    if (!input || typeof input !== 'string') return '';
    // إزالة الرموز الخاصة وتنظيف النص
    return input.trim()
        .replace(/[^\w\s\u0600-\u06FF,.!?@#$%&*()[\]{}=+\-_'"]/g, '')
        .slice(0, 4000);
}

// معالج أخطاء عام
async function handleError(interaction, error, message = '❌ حدث خطأ غير متوقع') {
    console.error('Error:', error);
    try {
        const response = {
            content: message,
            ephemeral: true
        };
        if (interaction.deferred) {
            await interaction.editReply(response);
        } else if (interaction.replied) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }
    } catch (e) {
        console.error('Error sending error message:', e);
    }
}

module.exports = {
    validateModalInput,
    sanitizeModalInput,
    handleError,
    
    // معالجة النماذج
    async handleModalSubmit(interaction) {
        try {
            const input = interaction.fields.getTextInputValue('input');
            
            // التحقق من صحة البيانات
            if (!validateModalInput(input)) {
                return await handleError(interaction, null, '❌ البيانات المدخلة غير صالحة');
            }
            
            // تنظيف البيانات
            const cleanInput = sanitizeModalInput(input);
            
            // معالجة النموذج حسب نوعه
            switch(interaction.customId) {
                case 'question_modal':
                    return await handleQuestionModal(interaction, cleanInput);
                case 'department_modal':
                    return await handleDepartmentModal(interaction, cleanInput);
                case 'review_modal':
                    return await handleReviewModal(interaction, cleanInput);
                default:
                    return await handleError(interaction, null, '❌ نوع النموذج غير معروف');
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    // إنشاء نموذج جديد
    createModalBuilder(customId, title, inputLabel, placeholder = '', defaultValue = '', required = true) {
        try {
            const modal = new ModalBuilder()
                .setCustomId(customId)
                .setTitle(title);

            const input = new TextInputBuilder()
                .setCustomId('input')
                .setLabel(inputLabel)
                .setStyle(placeholder.length > 50 ? 2 : 1) // استخدام نمط PARAGRAPH للنصوص الطويلة
                .setRequired(required)
                .setPlaceholder(placeholder);

            if (defaultValue) {
                input.setValue(defaultValue);
            }

            const row = new ActionRowBuilder().addComponents(input);
            return modal.addComponents(row);
        } catch (error) {
            console.error('Error creating modal:', error);
            return null;
        }
    }
};
