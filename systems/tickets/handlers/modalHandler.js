const { EmbedBuilder } = require('discord.js');
const config = require('../../../config');

class TicketsModalHandler {
    async handle(interaction, client) {
        if (interaction.customId === 'add_user_modal') {
            return await this.handleAddUserModal(interaction);
        } else if (interaction.customId === 'rename_ticket_modal') {
            return await this.handleRenameModal(interaction);
        }

        return false;
    }

    async handleAddUserModal(interaction) {
        const userInput = interaction.fields.getTextInputValue('user_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'لا يوجد سبب محدد';

        // استخراج معرف المستخدم
        const userId = userInput.replace(/[<@!>]/g, '');

        if (!/^\d+$/.test(userId)) {
            return await interaction.reply({ content: '❌ معرف المستخدم غير صحيح.', ephemeral: true });
        }

        try {
            const member = await interaction.guild.members.fetch(userId);

            // إضافة صلاحيات للمستخدم
            await interaction.channel.permissionOverwrites.create(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ تم إضافة مستخدم للتذكرة')
                .addFields(
                    { name: '👤 المستخدم المضاف', value: `<@${userId}>`, inline: true },
                    { name: '👮 أضيف بواسطة', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 السبب', value: reason, inline: false }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            await interaction.followUp(`<@${userId}> تم إضافتك لهذه التذكرة.`);

        } catch (error) {
            console.error('خطأ في إضافة المستخدم:', error);
            await interaction.reply({ content: '❌ لم يتم العثور على المستخدم أو حدث خطأ.', ephemeral: true });
        }

        return true;
    }

    async handleRenameModal(interaction) {
        const newName = interaction.fields.getTextInputValue('new_name');

        try {
            await interaction.channel.setName(newName);

            const embed = new EmbedBuilder()
                .setTitle('✅ تم تغيير اسم التذكرة')
                .addFields(
                    { name: '📝 الاسم الجديد', value: newName, inline: true },
                    { name: '👮 تم التغيير بواسطة', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('خطأ في تغيير اسم التذكرة:', error);
            await interaction.reply({ content: '❌ حدث خطأ في تغيير اسم التذكرة.', ephemeral: true });
        }

        return true;
    }
}

module.exports = new TicketsModalHandler();