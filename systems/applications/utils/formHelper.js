const { ModalBuilder, TextInputBuilder, ActionRowBuilder } = require('discord.js');
const { validateInput, sanitizeInput } = require('../utils/validation');

class FormBuilder {
    constructor() {
        this.modal = new ModalBuilder();
        this.components = [];
    }

    setCustomId(customId) {
        this.modal.setCustomId(customId);
        return this;
    }

    setTitle(title) {
        this.modal.setTitle(title);
        return this;
    }

    addTextInput({
        customId,
        label,
        value = '',
        style = 'SHORT',
        required = true,
        maxLength,
        minLength,
        placeholder
    }) {
        const input = new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(style === 'PARAGRAPH' ? 2 : 1)
            .setRequired(required);

        if (value) input.setValue(value);
        if (maxLength) input.setMaxLength(maxLength);
        if (minLength) input.setMinLength(minLength);
        if (placeholder) input.setPlaceholder(placeholder);

        const row = new ActionRowBuilder().addComponents(input);
        this.components.push(row);
        return this;
    }

    build() {
        return this.modal.addComponents(this.components);
    }
}

class FormValidator {
    static async validateFields(interaction) {
        const fields = {};
        let errors = [];

        for (const field of interaction.fields.fields.values()) {
            const value = field.value;
            const customId = field.customId;

            // التحقق الأساسي من الحقل
            if (!value || value.trim().length === 0) {
                errors.push(`الحقل "${customId}" مطلوب`);
                continue;
            }

            // التحقق من الحقول الخاصة
            if (customId.includes('roleId')) {
                if (!validateInput(value, 'roleId')) {
                    errors.push(`معرف الرتبة غير صالح في "${customId}"`);
                    continue;
                }
                fields[customId] = sanitizeInput(value, 'roleId');
            }
            else if (customId.includes('channelId')) {
                if (!validateInput(value, 'channelId')) {
                    errors.push(`معرف القناة غير صالح في "${customId}"`);
                    continue;
                }
                fields[customId] = sanitizeInput(value, 'channelId');
            }
            else if (customId.includes('emoji')) {
                if (!validateInput(value, 'emoji')) {
                    errors.push(`الإيموجي غير صالح في "${customId}"`);
                    continue;
                }
                fields[customId] = sanitizeInput(value, 'emoji');
            }
            else {
                fields[customId] = sanitizeInput(value, 'text');
            }
        }

        return { fields, errors };
    }
}

module.exports = {
    FormBuilder,
    FormValidator
};
