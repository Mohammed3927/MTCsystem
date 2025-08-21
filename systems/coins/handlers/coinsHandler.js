const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

// تحميل التحويلات المؤقتة
async function loadTempTransfers() {
    try {
        const tempPath = path.join(__dirname, '../data/tempTransfers.json');
        const data = await fs.readFile(tempPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// حفظ التحويلات المؤقتة
async function saveTempTransfers(transfers) {
    try {
        const tempPath = path.join(__dirname, '../data/tempTransfers.json');
        await fs.writeFile(tempPath, JSON.stringify(transfers, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ التحويلات المؤقتة:', error);
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

// توليد معرف البنك
function generateBankId() {
    const banks = [];
    const nextId = banks.length + 1;
    return `MTC${nextId.toString().padStart(9, '0')}`;
}

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

class CoinsHandler {
    async handleCoinsCommand(message, client) {
        const systemConfig = await loadSystemConfig();
        if (!systemConfig) return false;

        // التحقق من القناة (إلا للأدمن)
        if (message.channel.id !== systemConfig.channelId && !message.member.permissions.has('ADMINISTRATOR')) {
            return false;
        }

        const content = message.content.trim();

        // أوامر التحويل
        if (content.startsWith('c ') && content.includes('<@')) {
            return await this.handleTransfer(message, client);
        }
        
        // عرض الرصيد
        if (content === 'c' || (content.startsWith('c ') && content.includes('<@') && !content.includes(' ', content.indexOf('<@') + content.substring(content.indexOf('<@')).indexOf('>') + 1))) {
            return await this.handleBalance(message);
        }
        
        // قائمة الأغنياء
        if (content === 'ctop') {
            return await this.handleTop(message);
        }
        
        // إنشاء حساب
        if (content === 'cbank') {
            return await this.handleCreateBank(message);
        }
        
        // معلومات البنك
        if (content === 'bank' || (content.startsWith('bank ') && content.includes('<@'))) {
            return await this.handleBankInfo(message);
        }
        
        // معلومات الضرائب
        if (content.startsWith('tax ')) {
            return await this.handleTaxInfo(message);
        }
        
        // حذف البنك
        if (content === 'dbank') {
            return await this.handleDeleteBank(message);
        }

        return false;
    }

    async handleTransfer(message, client) {
        const args = message.content.trim().split(' ');
        if (args.length < 4) {
            await message.reply('❌ الاستخدام الصحيح: `c @mention coins reason`');
            return true;
        }

        const targetUserId = args[1].replace(/[<@!>]/g, '');
        const amount = parseInt(args[2]);
        const reason = args.slice(3).join(' ');

        if (isNaN(amount) || amount <= 0) {
            await message.reply('❌ المبلغ يجب أن يكون رقم موجب.');
            return true;
        }

        if (targetUserId === message.author.id) {
            await message.reply('❌ لا يمكنك تحويل العملات لنفسك.');
            return true;
        }

        const banks = await loadBanks();
        const senderBank = banks.find(bank => bank.userId === message.author.id);
        const receiverBank = banks.find(bank => bank.userId === targetUserId);

        if (!senderBank) {
            await message.reply('❌ ليس لديك حساب بنكي. قم بإنشاء حساب أولاً باستخدام `cbank`.');
            return true;
        }

        if (senderBank.suspended) {
            await message.reply('❌ حسابك البنكي معلق حالياً.');
            return true;
        }

        if (!receiverBank) {
            await message.reply('❌ المستقبل لا يملك حساب بنكي.');
            return true;
        }

        if (receiverBank.suspended) {
            await message.reply('❌ حساب المستقبل معلق حالياً.');
            return true;
        }

        const systemConfig = await loadSystemConfig();
        const taxAmount = Math.floor(amount * systemConfig.taxRate);
        const totalRequired = amount + taxAmount;

        if (senderBank.balance < totalRequired) {
            await message.reply(`❌ رصيدك غير كافي. تحتاج ${totalRequired} عملة (${amount} + ${taxAmount} ضريبة).`);
            return true;
        }

        // حفظ البيانات المؤقتة
        const transferData = {
            id: generateId(),
            senderId: message.author.id,
            receiverId: targetUserId,
            amount: amount,
            taxAmount: taxAmount,
            reason: reason,
            timestamp: Date.now()
        };

        await this.storeTempTransfer(transferData);

        // إنشاء رسالة التحقق
        const embed = new EmbedBuilder()
            .setTitle('🔄 تأكيد التحويل')
            .setDescription(`هل تريد تحويل **${amount}** عملة إلى <@${targetUserId}>؟`)
            .addFields(
                { name: '💰 المبلغ', value: `${amount} عملة`, inline: true },
                { name: '📊 الضريبة', value: `${taxAmount} عملة`, inline: true },
                { name: '💳 المجموع', value: `${totalRequired} عملة`, inline: true },
                { name: '📝 السبب', value: reason, inline: false }
            )
            .setColor(0xffaa00)
            .setTimestamp()
            .setFooter({ text: 'سيتم إلغاء التحويل خلال 10 ثوان إذا لم تؤكد' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`verify_transfer_${transferData.id}`)
                    .setLabel('تأكيد التحويل')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_transfer')
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        const verificationMessage = await message.reply({ embeds: [embed], components: [row] });

        // إلغاء التحويل بعد 10 ثوان
        setTimeout(async () => {
            try {
                await verificationMessage.edit({ components: [] });
            } catch (error) {
                // الرسالة قد تكون محذوفة
            }
        }, systemConfig.transferVerificationTime);

        return true;
    }

    async handleBalance(message) {
        const content = message.content.trim();
        let targetUserId = message.author.id;

        if (content.includes('<@')) {
            targetUserId = content.match(/<@!?(\d+)>/)?.[1] || message.author.id;
        }

        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === targetUserId);

        if (!userBank) {
            await message.reply('❌ المستخدم لا يملك حساب بنكي.');
            return true;
        }

        await message.reply(`💰 رصيد <@${targetUserId}>: **${userBank.balance}** عملة`);
        return true;
    }

    async handleTop(message) {
        const banks = await loadBanks();
        const sortedBanks = banks
            .filter(bank => bank.userId !== '968563794974478366') // استبعاد حساب النظام
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        if (sortedBanks.length === 0) {
            await message.reply('❌ لا توجد حسابات بنكية.');
            return true;
        }

        await this.showTopPage(message, sortedBanks, 1);
        return true;
    }

    async showTopPage(message, banks, page) {
        const embed = new EmbedBuilder()
            .setTitle('💰 قائمة أغنى 10 أشخاص')
            .setColor(0xffd700)
            .setTimestamp()
            .setFooter({ text: `الصفحة ${page}` });

        const topList = banks.map((bank, index) => 
            `${index + 1}. <@${bank.userId}> - **${bank.balance}** عملة`
        ).join('\n');

        embed.setDescription(topList || 'لا توجد بيانات');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`top_prev_${page}`)
                    .setLabel('السابق')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page <= 1),
                new ButtonBuilder()
                    .setCustomId(`top_next_${page}`)
                    .setLabel('التالي')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(banks.length < 10)
            );

        await message.reply({ embeds: [embed], components: [row] });
    }

    async handleCreateBank(message) {
        const banks = await loadBanks();
        const existingBank = banks.find(bank => bank.userId === message.author.id);

        if (existingBank) {
            await message.reply('❌ لديك حساب بنكي بالفعل.');
            return true;
        }

        const systemConfig = await loadSystemConfig();
        const newBank = {
            userId: message.author.id,
            bankId: generateBankId(),
            balance: systemConfig.defaultBankBalance,
            createdAt: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            createdBy: message.author.id,
            suspended: false,
            taxes: []
        };

        banks.push(newBank);
        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateId(),
            type: 'bank_creation',
            fromUserId: 'system',
            toUserId: message.author.id,
            amount: systemConfig.defaultBankBalance,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
            reason: 'Bank creation'
        };

        await logTransaction(transaction);

        await message.reply(`✅ تم إنشاء حسابك البنكي بنجاح! رصيدك الابتدائي: ${systemConfig.defaultBankBalance} عملة`);
        return true;
    }

    async handleBankInfo(message) {
        const content = message.content.trim();
        let targetUserId = message.author.id;

        if (content.includes('<@')) {
            targetUserId = content.match(/<@!?(\d+)>/)?.[1] || message.author.id;
        }

        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === targetUserId);

        if (!userBank) {
            await message.reply('❌ المستخدم لا يملك حساب بنكي.');
            return true;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏦 معلومات الحساب البنكي')
            .addFields(
                { name: '👤 المالك', value: `<@${userBank.userId}>`, inline: true },
                { name: '🆔 رقم الحساب', value: userBank.bankId, inline: true },
                { name: '💰 الرصيد', value: `${userBank.balance} عملة`, inline: true },
                { name: '📅 تاريخ الإنشاء', value: new Date(userBank.createdAt).toLocaleDateString('en-US'), inline: true },
                { name: '🚫 حالة التعليق', value: userBank.suspended ? 'معلق' : 'نشط', inline: true },
                { name: '📊 الضرائب المستحقة', value: `${userBank.taxes?.length || 0} ضريبة`, inline: true }
            )
            .setColor(userBank.suspended ? 0xff0000 : 0x00ff00)
            .setTimestamp()
            .setFooter({ text: 'MT Community Bank' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bank_history_${targetUserId}`)
                    .setLabel('سجل العمليات')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`bank_taxes_${targetUserId}`)
                    .setLabel('الضرائب')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        await message.reply({ embeds: [embed], components: [row] });
        return true;
    }

    async handleTaxInfo(message) {
        const args = message.content.trim().split(' ');
        if (args.length < 2) {
            await message.reply('❌ الاستخدام الصحيح: `tax <amount>`');
            return true;
        }

        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            await message.reply('❌ المبلغ يجب أن يكون رقم موجب.');
            return true;
        }

        const systemConfig = await loadSystemConfig();
        const taxAmount = Math.floor(amount * systemConfig.taxRate);

        await message.reply(`📊 ضريبة تحويل ${amount} عملة هي: **${taxAmount}** عملة (${(systemConfig.taxRate * 100).toFixed(1)}%)`);
        return true;
    }

    async handleDeleteBank(message) {
        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === message.author.id);

        if (!userBank) {
            await message.reply('❌ ليس لديك حساب بنكي.');
            return true;
        }

        const embed = new EmbedBuilder()
            .setTitle('⚠️ تأكيد حذف الحساب البنكي')
            .setDescription(`هل أنت متأكد من حذف حسابك البنكي؟\n\n**رصيدك الحالي:** ${userBank.balance} عملة\n**رقم الحساب:** ${userBank.bankId}\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!`)
            .setColor(0xff0000)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_delete_bank_${message.author.id}`)
                    .setLabel('تأكيد الحذف')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('cancel_delete_bank')
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await message.reply({ embeds: [embed], components: [row] });
        return true;
    }

    async storeTempTransfer(transferData) {
        const transfers = await loadTempTransfers();
        transfers.push(transferData);
        await saveTempTransfers(transfers);
    }
}

module.exports = new CoinsHandler();