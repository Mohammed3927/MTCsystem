const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

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

// توليد معرف فريد
function generateTransactionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

class CoinsButtonHandler {
    async handleCoinsButton(interaction, client) {
        if (interaction.customId.startsWith('verify_transfer_')) {
            return await this.handleTransferVerification(interaction, client);
        } else if (interaction.customId.startsWith('top_')) {
            return await this.handleTopPagination(interaction);
        } else if (interaction.customId.startsWith('bank_')) {
            return await this.handleBankActions(interaction);
        } else if (interaction.customId.startsWith('pay_tax_')) {
            return await this.handlePayTax(interaction, client);
        } else if (interaction.customId.startsWith('confirm_delete_bank_')) {
            return await this.handleConfirmDeleteBank(interaction, client);
        } else if (interaction.customId === 'cancel_delete_bank' || interaction.customId === 'cancel_transfer') {
            return await this.handleCancel(interaction);
        }
    }

    async handleTransferVerification(interaction, client) {
        const transferId = interaction.customId.replace('verify_transfer_', '');
        const transfers = await loadTempTransfers();
        
        const transferData = transfers.find(t => t.id === transferId);
        if (!transferData) {
            return await interaction.reply({ content: '❌ انتهت صلاحية التحويل.', ephemeral: true });
        }

        // التحقق من المستخدم
        if (transferData.senderId !== interaction.user.id) {
            return await interaction.reply({ content: '❌ هذا التحويل ليس لك.', ephemeral: true });
        }

        const banks = await loadBanks();
        const senderBank = banks.find(bank => bank.userId === transferData.senderId);
        const receiverBank = banks.find(bank => bank.userId === transferData.receiverId);

        if (!senderBank || !receiverBank) {
            return await interaction.reply({ content: '❌ حدث خطأ في العثور على الحسابات.', ephemeral: true });
        }

        const totalRequired = transferData.amount + transferData.taxAmount;
        if (senderBank.balance < totalRequired) {
            return await interaction.reply({ content: '❌ رصيدك غير كافي لإتمام التحويل.', ephemeral: true });
        }

        // تنفيذ التحويل
        senderBank.balance -= totalRequired;
        receiverBank.balance += transferData.amount;

        // إضافة الضريبة لحساب النظام
        const systemBank = banks.find(bank => bank.userId === '968563794974478366');
        if (systemBank) {
            systemBank.balance += transferData.taxAmount;
        }

        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateTransactionId(),
            type: 'transfer',
            fromUserId: transferData.senderId,
            toUserId: transferData.receiverId,
            amount: transferData.amount,
            taxAmount: transferData.taxAmount,
            reason: transferData.reason,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        // حذف التحويل من المؤقت
        const updatedTransfers = transfers.filter(t => t.id !== transferId);
        await saveTempTransfers(updatedTransfers);

        // إرسال رسالة خاصة للمستقبل
        try {
            const receiver = await client.users.fetch(transferData.receiverId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('💰 تم استلام تحويل بنكي')
                .addFields(
                    { name: '👤 المرسل', value: `<@${transferData.senderId}>`, inline: true },
                    { name: '💰 المبلغ', value: `${transferData.amount} عملة`, inline: true },
                    { name: '📝 السبب', value: transferData.reason, inline: false },
                    { name: '💳 رصيدك الحالي', value: `${receiverBank.balance} عملة`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp()
                .setFooter({ text: 'MT Community Bank' });

            await receiver.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.error('خطأ في إرسال الرسالة الخاصة:', error);
        }

        // تحديث الرسالة الأصلية
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ تم التحويل بنجاح')
            .addFields(
                { name: '👤 المستقبل', value: `<@${transferData.receiverId}>`, inline: true },
                { name: '💰 المبلغ المحول', value: `${transferData.amount} عملة`, inline: true },
                { name: '📊 الضريبة', value: `${transferData.taxAmount} عملة`, inline: true },
                { name: '💳 رصيدك الحالي', value: `${senderBank.balance} عملة`, inline: true },
                { name: '📝 السبب', value: transferData.reason, inline: false }
            )
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ text: 'MT Community Bank' });

        await interaction.update({ embeds: [successEmbed], components: [] });
    }

    async handleTopPagination(interaction) {
        const [action, page] = interaction.customId.replace('top_', '').split('_');
        const currentPage = parseInt(page);
        let newPage = currentPage;

        if (action === 'next') {
            newPage = currentPage + 1;
        } else if (action === 'prev') {
            newPage = Math.max(1, currentPage - 1);
        }

        const banks = await loadBanks();
        const sortedBanks = banks
            .filter(bank => bank.userId !== '968563794974478366')
            .sort((a, b) => b.balance - a.balance);

        const startIndex = (newPage - 1) * 10;
        const endIndex = startIndex + 10;
        const pageBanks = sortedBanks.slice(startIndex, endIndex);

        if (pageBanks.length === 0) {
            return await interaction.reply({ content: '❌ لا توجد المزيد من البيانات.', ephemeral: true });
        }

        await this.showTopPage(interaction, pageBanks, newPage, sortedBanks.length);
    }

    async showTopPage(interaction, banks, page, totalBanks) {
        const embed = new EmbedBuilder()
            .setTitle('💰 قائمة أغنى الأشخاص')
            .setColor(0xffd700)
            .setTimestamp()
            .setFooter({ text: `الصفحة ${page} - المجموع: ${totalBanks} حساب` });

        const startRank = (page - 1) * 10;
        const topList = banks.map((bank, index) => 
            `${startRank + index + 1}. <@${bank.userId}> - **${bank.balance}** عملة`
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

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async handleBankActions(interaction) {
        const [action, userId] = interaction.customId.replace('bank_', '').split('_');
        
        if (action === 'history') {
            return await this.handleBankHistory(interaction, userId);
        } else if (action === 'taxes') {
            return await this.handleBankTaxes(interaction, userId);
        }
    }

    async handleBankHistory(interaction, userId) {
        try {
            const transactionsPath = path.join(__dirname, '../data/transactions.json');
            const data = await fs.readFile(transactionsPath, 'utf8');
            const transactions = JSON.parse(data);
            
            const userTransactions = transactions
                .filter(t => t.fromUserId === userId || t.toUserId === userId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10);

            if (userTransactions.length === 0) {
                return await interaction.reply({ content: '❌ لا توجد عمليات مسجلة.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 سجل العمليات')
                .setColor(0x3498db)
                .setTimestamp()
                .setFooter({ text: 'آخر 10 عمليات' });

            const historyList = userTransactions.map(t => {
                const date = new Date(t.timestamp).toLocaleDateString('en-US');
                const type = t.fromUserId === userId ? 'إرسال' : 'استلام';
                const amount = t.type === 'transfer' && t.fromUserId === userId ? 
                    `${t.amount + (t.taxAmount || 0)} عملة` : `${t.amount} عملة`;
                return `**${type}** - ${amount} (${date})`;
            }).join('\n');

            embed.setDescription(historyList);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ حدث خطأ في تحميل السجل.', ephemeral: true });
        }
    }

    async handleBankTaxes(interaction, userId) {
        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === userId);

        if (!userBank || !userBank.taxes || userBank.taxes.length === 0) {
            return await interaction.reply({ content: '❌ لا توجد ضرائب مستحقة.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📊 الضرائب المستحقة')
            .setColor(0xff9900)
            .setTimestamp()
            .setFooter({ text: 'MT Community Tax System' });

        const taxesList = userBank.taxes.map((tax, index) => {
            const dueDate = new Date(tax.dueDate).toLocaleDateString('en-US');
            const status = new Date() > new Date(tax.dueDate) ? '🔴 متأخر' : '🟡 مستحق';
            return `${index + 1}. **${tax.amount}** عملة - ${tax.reason}\n   المهلة: ${dueDate} ${status}`;
        }).join('\n\n');

        embed.setDescription(taxesList);

        const row = new ActionRowBuilder();
        userBank.taxes.forEach((tax, index) => {
            if (index < 5) { // حد أقصى 5 أزرار
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`pay_tax_${userId}_${tax.id}`)
                        .setLabel(`دفع ${tax.amount} عملة`)
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💳')
                );
            }
        });

        await interaction.reply({ embeds: [embed], components: row.components.length > 0 ? [row] : [], ephemeral: true });
    }

    async handlePayTax(interaction, client) {
        const [userId, taxId] = interaction.customId.replace('pay_tax_', '').split('_').slice(0, 2);
        
        if (userId !== interaction.user.id) {
            return await interaction.reply({ content: '❌ لا يمكنك دفع ضرائب مستخدم آخر.', ephemeral: true });
        }

        const banks = await loadBanks();
        const userBank = banks.find(bank => bank.userId === userId);

        if (!userBank) {
            return await interaction.reply({ content: '❌ لم يتم العثور على حسابك البنكي.', ephemeral: true });
        }

        const taxIndex = userBank.taxes.findIndex(tax => tax.id === taxId);
        if (taxIndex === -1) {
            return await interaction.reply({ content: '❌ لم يتم العثور على الضريبة.', ephemeral: true });
        }

        const tax = userBank.taxes[taxIndex];
        if (userBank.balance < tax.amount) {
            return await interaction.reply({ content: `❌ رصيدك غير كافي. تحتاج ${tax.amount} عملة.`, ephemeral: true });
        }

        // دفع الضريبة
        userBank.balance -= tax.amount;
        userBank.taxes.splice(taxIndex, 1);

        // إضافة المبلغ لحساب النظام
        const systemBank = banks.find(bank => bank.userId === '968563794974478366');
        if (systemBank) {
            systemBank.balance += tax.amount;
        }

        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateTransactionId(),
            type: 'tax_payment',
            fromUserId: userId,
            toUserId: '968563794974478366',
            amount: tax.amount,
            reason: `Tax payment: ${tax.reason}`,
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        await interaction.reply({ 
            content: `✅ تم دفع الضريبة بنجاح! (${tax.amount} عملة)\nرصيدك الحالي: ${userBank.balance} عملة`, 
            ephemeral: true 
        });
    }

    async handleConfirmDeleteBank(interaction, client) {
        const userId = interaction.customId.replace('confirm_delete_bank_', '');
        
        if (userId !== interaction.user.id) {
            return await interaction.reply({ content: '❌ لا يمكنك حذف حساب مستخدم آخر.', ephemeral: true });
        }

        const banks = await loadBanks();
        const bankIndex = banks.findIndex(bank => bank.userId === userId);

        if (bankIndex === -1) {
            return await interaction.reply({ content: '❌ لم يتم العثور على حسابك البنكي.', ephemeral: true });
        }

        const deletedBank = banks.splice(bankIndex, 1)[0];
        await saveBanks(banks);

        // تسجيل العملية
        const transaction = {
            id: generateTransactionId(),
            type: 'bank_deletion',
            fromUserId: userId,
            toUserId: 'system',
            amount: deletedBank.balance,
            reason: 'Bank account deletion',
            timestamp: new Date().toLocaleString("en-US", { timeZone: "UTC" })
        };

        await logTransaction(transaction);

        await interaction.update({ 
            content: `✅ تم حذف حسابك البنكي بنجاح.\nالرصيد المحذوف: ${deletedBank.balance} عملة`, 
            embeds: [], 
            components: [] 
        });
    }

    async handleCancel(interaction) {
        await interaction.update({ 
            content: '❌ تم إلغاء العملية.', 
            embeds: [], 
            components: [] 
        });
    }
}

module.exports = new CoinsButtonHandler();