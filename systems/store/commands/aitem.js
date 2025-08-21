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

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

module.exports = {
    name: 'aitem',
    description: 'إضافة منتج جديد للمتجر',
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
        if (args.length < 3) {
            return message.reply('❌ الاستخدام الصحيح: `+aitem <اسم_المنتج> <السعر> <الكمية>`');
        }

        const name = args[0];
        const price = parseInt(args[1]);
        const stock = parseInt(args[2]);

        // التحقق من صحة البيانات
        if (isNaN(price) || price <= 0) {
            return message.reply('❌ السعر يجب أن يكون رقم موجب.');
        }

        if (isNaN(stock) || stock <= 0) {
            return message.reply('❌ الكمية يجب أن تكون رقم موجب.');
        }

        // تحميل المنتجات الحالية
        const items = await loadItems();

        // التحقق من عدم وجود منتج بنفس الاسم
        const existingItem = items.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (existingItem) {
            return message.reply('❌ يوجد منتج بهذا الاسم بالفعل.');
        }

        // إنشاء المنتج الجديد
        const newItem = {
            id: generateId(),
            name: name,
            price: price,
            stock: stock,
            createdAt: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            createdBy: message.author.id
        };

        // إضافة المنتج وحفظه
        items.push(newItem);
        const saved = await saveItems(items);

        if (saved) {
            await message.reply(`✅ تم إضافة المنتج **${name}** بسعر **${price}** MTC عملة وكمية **${stock}** بنجاح!`);
        } else {
            await message.reply('❌ حدث خطأ في حفظ المنتج.');
        }
    }
};