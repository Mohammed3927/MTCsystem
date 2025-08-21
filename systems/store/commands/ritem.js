const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

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

module.exports = {
    name: 'ritem',
    description: 'حذف منتج من المتجر',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.STORE) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        // التحقق من المعاملات
        if (args.length < 1) {
            return message.reply('❌ الاستخدام الصحيح: `+ritem <اسم_المنتج>`');
        }

        const itemName = args.join(' ');

        // تحميل المنتجات الحالية
        const items = await loadItems();

        // البحث عن المنتج
        const itemIndex = items.findIndex(item => item.name.toLowerCase() === itemName.toLowerCase());
        
        if (itemIndex === -1) {
            return message.reply('❌ لم يتم العثور على منتج بهذا الاسم.');
        }

        // حذف المنتج
        const removedItem = items.splice(itemIndex, 1)[0];
        const saved = await saveItems(items);

        if (saved) {
            await message.reply(`✅ تم حذف المنتج **${removedItem.name}** من المتجر بنجاح!`);
        } else {
            await message.reply('❌ حدث خطأ في حذف المنتج.');
        }
    }
};