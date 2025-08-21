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
        console.error('خطأ في تحميل إعدادات نظام العملات:', error);
        return null;
    }
}

// تحميل البنوك
async function loadBanks() {
    try {
        const banksPath = path.join(__dirname, '../data/banks.json');
        const data = await fs.readFile(banksPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// حفظ البنوك
async function saveBanks(banks) {
    try {
        const banksPath = path.join(__dirname, '../data/banks.json');
        await fs.writeFile(banksPath, JSON.stringify(banks, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ البنوك:', error);
        return false;
    }
}

// تسجيل العمليات
async function logTransaction(transaction) {
    try {
        const transactionsPath = path.join(__dirname, '../data/transactions.json');
        let transactions = [];
        
        try {
            const data = await fs.readFile(transactionsPath, 'utf8');
            transactions = JSON.parse(data);
        } catch (error) {
            // الملف غير موجود
        }
        
        transactions.push(transaction);
        await fs.writeFile(transactionsPath, JSON.stringify(transactions, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في تسجيل العملية:', error);
        return false;
    }
}

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

module.exports = {
    name: 'coins',
    description: 'إدارة العملات للأدمن',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.COINS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر.');
        }

        if (args.length < 1) {
            return message.reply('❌ الاستخدام الصحيح: `+coins <add/remove/reset> <@user> [amount]`');
        }

        const action = args[0].toLowerCase();
        
        if (action === 'add') {
            return await this.addCoins(message, args.slice(1));
        } else if (action === 'remove') {
            return await this.removeCoins(message, args.slice(1));
        } else if (action === 'reset') {
            return await this.resetCoins(message);
        } else {
            return message.reply('❌ الأوامر المتاحة: `add`, `remove`, `reset`');
        }
    },

    async addCoins(message, args) {
        if (args.length < 2) {
            return message.reply('❌ الاستخدام الصحيح: `+coins add <@user> <amount>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون المبلغ رقم موجب.');
        }

        const banks = await loadBanks();
        let userBank = banks.find(bank => bank.userId === userId);

        if (!userBank) {
            return message.reply('❌ المستخدم لا يملك حساب بنكي.');
        }

        userBank.balance += amount;
        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_add',
            fromUserId: message.author.id,
            toUserId: userId,
            amount: amount,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            reason: 'Admin addition'
        };

        await logTransaction(transaction);

        await message.reply(`✅ تم إضافة ${amount} عملة للمستخدم <@${userId}>. الرصيد الحالي: ${userBank.balance}`);
    },

    async removeCoins(message, args) {
        if (args.length < 2) {
            return message.reply('❌ الاستخدام الصحيح: `+coins remove <@user> <amount>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون المبلغ رقم موجب.');
        }

        const banks = await loadBanks();
        let userBank = banks.find(bank => bank.userId === userId);

        if (!userBank) {
            return message.reply('❌ المستخدم لا يملك حساب بنكي.');
        }

        if (userBank.balance < amount) {
            return message.reply('❌ رصيد المستخدم غير كافي.');
        }

        userBank.balance -= amount;
        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_remove',
            fromUserId: userId,
            toUserId: message.author.id,
            amount: amount,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            reason: 'Admin removal'
        };

        await logTransaction(transaction);

        await message.reply(`✅ تم خصم ${amount} عملة من المستخدم <@${userId}>. الرصيد الحالي: ${userBank.balance}`);
    },

    async resetCoins(message) {
        const banks = await loadBanks();
        
        // الاحتفاظ بحساب النظام فقط
        const systemBanks = banks.filter(bank => bank.userId === '968563794974478366');
        
        await saveBanks(systemBanks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_reset',
            fromUserId: message.author.id,
            toUserId: 'system',
            amount: 0,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            reason: 'System reset'
        };

        await logTransaction(transaction);

        await message.reply('✅ تم إعادة تعيين جميع الحسابات البنكية.');
    }
};