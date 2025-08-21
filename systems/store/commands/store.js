const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

// تحميل إعدادات المتجر
async function loadStoreConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات المتجر:', error);
        return null;
    }
}

// تحميل المنتجات
async function loadItems() {
    try {
        const itemsPath = path.join(__dirname, '../data/items.json');
        const data = await fs.readFile(itemsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

module.exports = {
    name: 'store',
    description: 'عرض متجر MTC',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.STORE) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        const storeConfig = await loadStoreConfig();
        const items = await loadItems();

        if (!storeConfig) {
            return message.reply('❌ حدث خطأ في تحميل إعدادات المتجر.');
        }

        // إنشاء الإيمبد
        const embed = new EmbedBuilder()
            .setTitle(storeConfig.storeTitle)
            .setDescription(storeConfig.storeDescription)
            .setColor(storeConfig.storeColor)
            .setTimestamp()
            .setFooter({ text: 'MT Community Store' });

        // إضافة المنتجات للإيمبد
        if (items.length > 0) {
            const itemsList = items.map((item, index) => 
                `${index + 1}. **${item.name}** - ${item.price} MTC عملة (متوفر: ${item.stock})`
            ).join('\n');
            
            embed.addFields({ name: '📦 المنتجات المتاحة', value: itemsList });
        } else {
            embed.addFields({ name: '📦 المنتجات المتاحة', value: 'لا توجد منتجات متاحة حالياً' });
        }

        // إنشاء قائمة الاختيار
        let components = [];
        if (items.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('store_select')
                .setPlaceholder('اختر منتج للشراء');

            items.forEach((item, index) => {
                if (item.stock > 0) {
                    selectMenu.addOptions({
                        label: item.name,
                        description: `${item.price} MTC عملة - متوفر: ${item.stock}`,
                        value: item.id,
                        emoji: '🛒'
                    });
                }
            });

            if (selectMenu.options.length > 0) {
                const row = new ActionRowBuilder().addComponents(selectMenu);
                components.push(row);
            }
        }

        await message.channel.send({ embeds: [embed], components: components });
        await message.delete();
    }
};