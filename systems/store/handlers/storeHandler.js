const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

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

// حفظ المنتجات
async function saveItems(items) {
    try {
        const itemsPath = path.join(__dirname, '../data/items.json');
        await fs.writeFile(itemsPath, JSON.stringify(items, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ المنتجات:', error);
        return false;
    }
}

// تحميل البنوك من نظام العملات
async function loadBanks() {
    try {
        const banksPath = path.join(__dirname, '../../coins/data/banks.json');
        const data = await fs.readFile(banksPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// حفظ البنوك
async function saveBanks(banks) {
    try {
        const banksPath = path.join(__dirname, '../../coins/data/banks.json');
        await fs.writeFile(banksPath, JSON.stringify(banks, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ البنوك:', error);
        return false;
    }
}

// تسجيل عملية الشراء
async function logPurchase(purchase) {
    try {
        const logPath = path.join(__dirname, '../data/purchases.json');
        let purchases = [];
        
        try {
            const data = await fs.readFile(logPath, 'utf8');
            purchases = JSON.parse(data);
        } catch (error) {
            // الملف غير موجود، سيتم إنشاؤه
        }
        
        purchases.push(purchase);
        await fs.writeFile(logPath, JSON.stringify(purchases, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في تسجيل عملية الشراء:', error);
        return false;
    }
}

// إرسال سجل الشراء
async function sendPurchaseLog(client, purchase, config) {
    try {
        const logChannel = client.channels.cache.get(config.logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🛒 عملية شراء جديدة')
            .setColor(0x00ff00)
            .addFields(
                { name: '👤 المشتري', value: `<@${purchase.userId}>`, inline: true },
                { name: '📦 المنتج', value: purchase.itemName, inline: true },
                { name: '💰 السعر', value: `${purchase.price} MTC`, inline: true },
                { name: '🕐 الوقت', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Store Log' });

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('خطأ في إرسال سجل الشراء:', error);
    }
}

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

class StoreHandler {
    async handleStorePurchase(interaction, client) {
        if (!interaction.isStringSelectMenu() || interaction.customId !== 'store_select') {
            return false;
        }

        const itemId = interaction.values[0];
        const config = await loadStoreConfig();
        const items = await loadItems();
        const banks = await loadBanks();

        if (!config) {
            return await interaction.reply({ content: '❌ حدث خطأ في تحميل إعدادات المتجر.', ephemeral: true });
        }

        // البحث عن المنتج
        const item = items.find(i => i.id === itemId);
        if (!item) {
            return await interaction.reply({ content: config.messages.itemNotFound, ephemeral: true });
        }

        // التحقق من توفر المنتج
        if (item.stock <= 0) {
            return await interaction.reply({ content: config.messages.itemOutOfStock, ephemeral: true });
        }

        // العثور على حساب المشتري
        const userBank = banks.find(bank => bank.userId === interaction.user.id);
        if (!userBank) {
            return await interaction.reply({ content: '❌ ليس لديك حساب بنكي. قم بإنشاء حساب أولاً باستخدام `cbank`.', ephemeral: true });
        }

        // التحقق من تعليق الحساب
        if (userBank.suspended) {
            return await interaction.reply({ content: '❌ حسابك البنكي معلق حالياً.', ephemeral: true });
        }

        // التحقق من الرصيد
        if (userBank.balance < item.price) {
            return await interaction.reply({ content: config.messages.insufficientFunds, ephemeral: true });
        }

        // تنفيذ عملية الشراء
        userBank.balance -= item.price;
        item.stock -= 1;

        // إذا انتهت الكمية، احذف المنتج
        if (item.stock <= 0) {
            const itemIndex = items.findIndex(i => i.id === itemId);
            if (itemIndex !== -1) {
                items.splice(itemIndex, 1);
            }
        }

        // حفظ التغييرات
        await saveBanks(banks);
        await saveItems(items);

        // تسجيل عملية الشراء
        const purchase = {
            id: generateId(),
            userId: interaction.user.id,
            username: interaction.user.username,
            itemId: item.id,
            itemName: item.name,
            price: item.price,
            purchaseDate: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logPurchase(purchase);
        await sendPurchaseLog(client, purchase, config);

        // إرسال رسالة النجاح
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ تم الشراء بنجاح!')
            .setDescription(`تم شراء **${item.name}** بنجاح مقابل **${item.price}** MTC عملة`)
            .setColor(0x00ff00)
            .addFields(
                { name: '💰 رصيدك الحالي', value: `${userBank.balance} MTC`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Store' });

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        return true;
    }
}

module.exports = new StoreHandler();