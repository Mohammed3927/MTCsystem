const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// كونفق الرتب المخصصة
const boosterRoles = {
    "cia": "1386777184819089578",
    "fbi": "1386777213453729903",
    "swat": "1386777243539476571",
    "ravens": "1386777266985504848",
    "ssf": "1386777300124696576",
    "mariens": "1386777328373203084",
    "anonymous": "1386777392424423545",
    "mtf": "1386777499374981130",
    "mutchado": "1386777560205103114",
    "lspd": "1386699065894637709",
    "soc": "1386777727880663091"
};

const boosterRolesList = [
    "1386777184819089578",
    "1386777213453729903",
    "1386777243539476571",
    "1386777266985504848",
    "1386777300124696576",
    "1386777328373203084",
    "1386777392424423545",
    "1386777499374981130",
    "1386777560205103114",
    "1386699065894637709",
    "1386777727880663091"
];

module.exports = {
    async execute(interaction) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

        try {
            if (interaction.customId === 'booster') {
                const member = interaction.member;

                // التحقق من أن العضو بوستر
                if (!member.premiumSince) {
                    return await interaction.reply({
                        content: '❌ هذه الميزة متاحة فقط للبوسترز!',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('🌟 ميزات البوستر')
                    .setDescription('اختر الرتبة التي تريدها!')
                    .setColor(0x9d4edd);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('booster_role_select')
                    .setPlaceholder('اختر رتبة البوستر')
                    .addOptions([
                        {
                            label: 'SSF',
                            value: 'ssf',
                            emoji: '🔥'
                        },
                        {
                            label: 'CIA',
                            value: 'cia',
                            emoji: '🕵️'
                        },
                        {
                            label: 'FBI',
                            value: 'fbi',
                            emoji: '🔍'
                        },
                        {
                            label: 'SWAT',
                            value: 'swat',
                            emoji: '⚡'
                        },
                        {
                            label: 'RAVENS',
                            value: 'ravens',
                            emoji: '🐦‍⬛'
                        },
                        {
                            label: 'MARIENS',
                            value: 'mariens',
                            emoji: '⚓'
                        },
                        {
                            label: 'ANONYMOUS',
                            value: 'anonymous',
                            emoji: '🎭'
                        },
                        {
                            label: 'MTF',
                            value: 'mtf',
                            emoji: '🛡️'
                        },
                        {
                            label: 'MUTCHADO',
                            value: 'mutchado',
                            emoji: '💀'
                        },
                        {
                            label: 'LSPD',
                            value: 'lspd',
                            emoji: '🚔'
                        },
                        {
                            label: 'SOC',
                            value: 'soc',
                            emoji: '🎯'
                        }
                    ]);

                const removeButton = new ButtonBuilder()
                    .setCustomId('remove_booster_roles')
                    .setLabel('إزالة جميع الرتب')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️');

                const row1 = new ActionRowBuilder().addComponents(selectMenu);
                const row2 = new ActionRowBuilder().addComponents(removeButton);

                await interaction.reply({
                    embeds: [embed],
                    components: [row1, row2],
                    ephemeral: true
                });

            } else if (interaction.customId === 'booster_role_select') {
                const member = interaction.member;
                const selectedRole = interaction.values[0];

                // التحقق من أن العضو بوستر
                if (!member.premiumSince) {
                    return await interaction.reply({
                        content: '❌ هذه الميزة متاحة فقط للبوسترز!',
                        ephemeral: true
                    });
                }

                const roleId = boosterRoles[selectedRole];
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return await interaction.reply({
                        content: '❌ الرتبة غير موجودة!',
                        ephemeral: true
                    });
                }

                // التحقق إذا كان العضو يملك الرتبة بالفعل
                if (member.roles.cache.has(roleId)) {
                    // إزالة الرتبة إذا كان يملكها
                    try {
                        await member.roles.remove(role);
                        await interaction.reply({
                            content: `✅ تم إزالة رتبة **${role.name}** بنجاح!`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('خطأ في إزالة الرتبة:', error);
                        await interaction.reply({
                            content: '❌ حدث خطأ في إزالة الرتبة',
                            ephemeral: true
                        });
                    }
                } else {
                    // إزالة جميع رتب البوستر الأخرى أولاً
                    for (const otherRoleId of boosterRolesList) {
                        if (member.roles.cache.has(otherRoleId)) {
                            const otherRole = interaction.guild.roles.cache.get(otherRoleId);
                            if (otherRole) {
                                await member.roles.remove(otherRole);
                            }
                        }
                    }

                    // إضافة الرتبة الجديدة
                    try {
                        await member.roles.add(role);
                        await interaction.reply({
                            content: `✅ تم إعطاؤك رتبة **${role.name}** بنجاح!`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('خطأ في إضافة الرتبة:', error);
                        await interaction.reply({
                            content: '❌ حدث خطأ في إضافة الرتبة',
                            ephemeral: true
                        });
                    }
                }

            } else if (interaction.customId === 'remove_booster_roles') {
                const member = interaction.member;

                // التحقق من أن العضو بوستر
                if (!member.premiumSince) {
                    return await interaction.reply({
                        content: '❌ هذه الميزة متاحة فقط للبوسترز!',
                        ephemeral: true
                    });
                }

                // إزالة جميع رتب البوستر
                let removedRoles = [];
                for (const roleId of boosterRolesList) {
                    if (member.roles.cache.has(roleId)) {
                        const role = interaction.guild.roles.cache.get(roleId);
                        if (role) {
                            await member.roles.remove(role);
                            removedRoles.push(role.name);
                        }
                    }
                }

                if (removedRoles.length > 0) {
                    await interaction.reply({
                        content: `✅ تم إزالة الرتب التالية: ${removedRoles.join(', ')}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ لا توجد رتب بوستر لإزالتها',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في معالج البوستر:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ حدث خطأ أثناء معالجة الطلب',
                    ephemeral: true
                });
            }
        }
    }
};