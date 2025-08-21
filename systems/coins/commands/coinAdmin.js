const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');

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

// توليد معرف الضريبة
function generateTaxId() {
    return 'TAX_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

module.exports = {
    name: 'coinadmin',
    description: 'أوامر إدارة العملات للأدمن',
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
            return message.reply('❌ الاستخدام الصحيح: `+coinadmin <dabank/sbank/srbank/atax/reset> [args]`');
        }

        const action = args[0].toLowerCase();
        
        switch (action) {
            case 'dabank':
                return await this.deleteAdminBank(message, args.slice(1));
            case 'sbank':
                return await this.suspendBank(message, args.slice(1));
            case 'srbank':
                return await this.unsuspendBank(message, args.slice(1));
            case 'atax':
                return await this.addTax(message, args.slice(1), client);
            case 'reset':
                return await this.resetAllBanks(message);
            default:
                return message.reply('❌ الأوامر المتاحة: `dabank`, `sbank`, `srbank`, `atax`, `reset`');
        }
    },

    async deleteAdminBank(message, args) {
        if (args.length < 1) {
            return message.reply('❌ الاستخدام الصحيح: `+coinadmin dabank <@user>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const banks = await loadBanks();
        const bankIndex = banks.findIndex(bank => bank.userId === userId);

        if (bankIndex === -1) {
            return message.reply('❌ المستخدم لا يملك حساب بنكي.');
        }

        const deletedBank = banks.splice(bankIndex, 1)[0];
        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_delete_bank',
            fromUserId: message.author.id,
            toUserId: userId,
            amount: deletedBank.balance,
            reason: 'Admin bank deletion',
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        await message.reply(`✅ تم حذف حساب <@${userId}> بنجاح. الرصيد المحذوف: ${deletedBank.balance} عملة`);
    },

    async suspendBank(message, args) {
        if (args.length < 4) {
            return message.reply('❌ الاستخدام الصحيح: `+coinadmin sbank <@user> <time> <unit> <reason>`\nالوحدات: m (دقائق), h (ساعات), d (أيام)');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const timeAmount = parseInt(args[1]);
        const timeUnit = args[2].toLowerCase();
        const reason = args.slice(3).join(' ');

        if (isNaN(timeAmount) || timeAmount <= 0) {
            return message.reply('❌ يجب أن يكون الوقت رقم موجب.');
        }

        const validUnits = { m: 60000, h: 3600000, d: 86400000 };
        if (!validUnits[timeUnit]) {
            return message.reply('❌ الوحدات المتاحة: m (دقائق), h (ساعات), d (أيام)');
        }

        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === userId);

        if (!userBank) {
            return message.reply('❌ المستخدم لا يملك حساب بنكي.');
        }

        const suspensionDuration = timeAmount * validUnits[timeUnit];
        const suspensionEnd = new Date(Date.now() + suspensionDuration);

        userBank.suspended = true;
        userBank.suspensionEnd = suspensionEnd.toISOString();
        userBank.suspensionReason = reason;

        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_suspend_bank',
            fromUserId: message.author.id,
            toUserId: userId,
            amount: 0,
            reason: `Bank suspended: ${reason}`,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        const unitNames = { m: 'دقيقة', h: 'ساعة', d: 'يوم' };
        await message.reply(`✅ تم تعليق حساب <@${userId}> لمدة ${timeAmount} ${unitNames[timeUnit]}.\nالسبب: ${reason}\nينتهي التعليق: ${suspensionEnd.toLocaleString('en-US')}`);

        // إلغاء التعليق تلقائياً
        setTimeout(async () => {
            const currentBanks = await loadBanks();
            const currentUserBank = currentBanks.find(bank => bank.userId === userId);
            
            if (currentUserBank && currentUserBank.suspended) {
                currentUserBank.suspended = false;
                delete currentUserBank.suspensionEnd;
                delete currentUserBank.suspensionReason;
                await saveBanks(currentBanks);
                
                try {
                    const user = await message.client.users.fetch(userId);
                    await user.send('✅ تم إلغاء تعليق حسابك البنكي في MT Community.');
                } catch (error) {
                    console.error('خطأ في إرسال رسالة إلغاء التعليق:', error);
                }
            }
        }, suspensionDuration);
    },

    async unsuspendBank(message, args) {
        if (args.length < 1) {
            return message.reply('❌ الاستخدام الصحيح: `+coinadmin srbank <@user>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === userId);

        if (!userBank) {
            return message.reply('❌ المستخدم لا يملك حساب بنكي.');
        }

        if (!userBank.suspended) {
            return message.reply('❌ حساب المستخدم غير معلق.');
        }

        userBank.suspended = false;
        delete userBank.suspensionEnd;
        delete userBank.suspensionReason;

        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_unsuspend_bank',
            fromUserId: message.author.id,
            toUserId: userId,
            amount: 0,
            reason: 'Admin unsuspension',
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        await message.reply(`✅ تم إلغاء تعليق حساب <@${userId}> بنجاح.`);
    },

    async addTax(message, args, client) {
        if (args.length < 3) {
            return message.reply('❌ الاستخدام الصحيح: `+coinadmin atax <@user> <amount> <reason>`');
        }

        const userId = args[0].replace(/[<@!>]/g, '');
        const amount = parseInt(args[1]);
        const reason = args.slice(2).join(' ');

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب أن يكون المبلغ رقم موجب.');
        }

        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === userId);

        if (!userBank) {
            return message.reply('❌ المستخدم لا يملك حساب بنكي.');
        }

        // إضافة الضريبة
        const taxId = generateTaxId();
        const dueDate = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)); // 3 أيام

        if (!userBank.taxes) {
            userBank.taxes = [];
        }

        userBank.taxes.push({
            id: taxId,
            amount: amount,
            reason: reason,
            dueDate: dueDate.toISOString(),
            addedBy: message.author.id,
            addedAt: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        });

        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_add_tax',
            fromUserId: message.author.id,
            toUserId: userId,
            amount: amount,
            reason: `Tax added: ${reason}`,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        await message.reply(`✅ تم فرض ضريبة على <@${userId}>.\nالمبلغ: ${amount} عملة\nالسبب: ${reason}\nمهلة الدفع: 3 أيام`);

        // إرسال تنبيه للمستخدم
        try {
            const user = await client.users.fetch(userId);
            await user.send(`📊 تم فرض ضريبة عليك في MT Community\n\n**المبلغ:** ${amount} عملة\n**السبب:** ${reason}\n**مهلة الدفع:** 3 أيام\n\nاستخدم أمر \`bank\` لعرض ضرائبك المستحقة.`);
        } catch (error) {
            console.error('خطأ في إرسال تنبيه الضريبة:', error);
        }

        // تعليق الحساب بعد 3 أيام إذا لم يتم الدفع
        setTimeout(async () => {
            await this.checkOverdueTaxes(userId, taxId);
        }, 3 * 24 * 60 * 60 * 1000);
    },

    async checkOverdueTaxes(userId, taxId) {
        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === userId);

        if (!userBank || !userBank.taxes) return;

        const unpaidTax = userBank.taxes.find(tax => tax.id === taxId);
        if (unpaidTax) {
            // تعليق الحساب
            userBank.suspended = true;
            userBank.suspensionReason = `Unpaid tax: ${unpaidTax.reason}`;
            
            await saveBanks(banks);

            // تسجيل العملية
            const transaction = {
                id: generateId(),
                type: 'auto_suspend_tax',
                fromUserId: 'system',
                toUserId: userId,
                amount: unpaidTax.amount,
                reason: `Auto suspension for unpaid tax: ${unpaidTax.reason}`,
                timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
            };

            await logTransaction(transaction);
        }
    },

    async resetAllBanks(message) {
        const banks = await loadBanks();
        
        // الاحتفاظ بحساب النظام فقط
        const systemBanks = banks.filter(bank => bank.userId === '968563794974478366');
        
        await saveBanks(systemBanks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'admin_reset_all',
            fromUserId: message.author.id,
            toUserId: 'system',
            amount: 0,
            reason: 'Complete system reset',
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        await message.reply('✅ تم إعادة تعيين جميع الحسابات البنكية بنجاح.');
    }
};