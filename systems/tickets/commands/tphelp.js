const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
        console.error('خطأ في تحميل إعدادات نظام النقاط:', error);
        return null;
    }
}

// حفظ إعدادات النظام
async function saveSystemConfig(systemConfig) {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        await fs.writeFile(configPath, JSON.stringify(systemConfig, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ إعدادات النظام:', error);
        return false;
    }
}

// تحميل النقاط
async function loadPoints() {
    try {
        const pointsPath = path.join(__dirname, '../data/points.json');
        const data = await fs.readFile(pointsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

module.exports = {
    name: 'pohelp',
    description: 'مساعدة نظام النقاط مع إمكانية التعديل الكامل',
    async execute(message, args, client) {
        // التحقق من تفعيل النظام
        if (!config.SYSTEMS.POINTS) {
            return;
        }

        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', flags: 64 });
        }

        const systemConfig = await loadSystemConfig();
        const points = await loadPoints();
        
        if (!systemConfig) {
            return message.reply({ content: '❌ حدث خطأ في تحميل إعدادات النظام.', flags: 64 });
        }

        // حساب إحصائيات النقاط
        const totalUsers = Object.keys(points).length;
        const totalPoints = Object.values(points).reduce((sum, userPoints) => sum + userPoints, 0);
        const topUser = Object.entries(points).sort(([,a], [,b]) => b - a)[0];

        // إنشاء إيمبد المساعدة
        const embed = new EmbedBuilder()
            .setTitle('⭐ إدارة نظام النقاط')
            .setDescription('اختر العنصر الذي تريد تعديله:')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { 
                    name: '📋 الأوامر المتاحة', 
                    value: '`+points` - عرض نقاطك\n`+points @user` - عرض نقاط مستخدم\n`+points top` - عرض المتصدرين\n`+points add @user <عدد>` - إضافة نقاط\n`+points remove @user <عدد>` - إزالة نقاط\n`+points reset @user` - إعادة تعيين نقاط\n`+preset` - حذف جميع بيانات النقاط\n`+phelp` - هذه الرسالة'
                },
                {
                    name: '📊 إحصائيات النظام',
                    value: `**إجمالي المستخدمين:** ${totalUsers}\n**إجمالي النقاط:** ${totalPoints}\n**المتصدر:** ${topUser ? `<@${topUser[0]}> (${topUser[1]} نقطة)` : 'لا يوجد'}\n**قناة السجل:** <#${systemConfig.logChannelId || 'غير محدد'}>`
                }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Points' });

        // إنشاء قائمة الخيارات
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('points_help_select')
            .setPlaceholder('اختر العنصر للتعديل')
            .addOptions([
                {
                    label: 'تعديل قناة السجل',
                    description: 'تغيير قناة سجل عمليات النقاط',
                    value: 'edit_log_channel',
                    emoji: '📝'
                },
                {
                    label: 'تعديل الألوان',
                    description: 'تغيير ألوان الإيمبد والرسائل',
                    value: 'edit_colors',
                    emoji: '🎨'
                },
                {
                    label: 'إدارة الصلاحيات',
                    description: 'تعديل الرتب المخولة لإدارة النقاط',
                    value: 'manage_permissions',
                    emoji: '👥'
                },
                {
                    label: 'إعدادات التلقائي',
                    description: 'تعديل إعدادات منح النقاط التلقائي',
                    value: 'auto_settings',
                    emoji: '🤖'
                },
                {
                    label: 'عرض المتصدرين',
                    description: 'عرض قائمة بأعلى 10 مستخدمين',
                    value: 'show_leaderboard',
                    emoji: '🏆'
                },
                {
                    label: 'عرض البيانات الخام',
                    description: 'عرض ملف النقاط الكامل',
                    value: 'show_raw_data',
                    emoji: '💾'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleSelectMenu(interaction) {
        const selectedValue = interaction.values[0];
        
        try {
            switch (selectedValue) {
                case 'edit_log_channel':
                    await this.handleEditLogChannel(interaction);
                    break;
                
                case 'edit_colors':
                    await this.handleEditColors(interaction);
                    break;
                
                case 'manage_permissions':
                    await this.handleManagePermissions(interaction);
                    break;
                
                case 'auto_settings':
                    await this.handleAutoSettings(interaction);
                    break;
                
                case 'show_leaderboard':
                    await this.handleShowLeaderboard(interaction);
                    break;
                
                case 'show_raw_data':
                    await this.handleShowRawData(interaction);
                    break;
                
                default:
                    await interaction.reply({ 
                        content: '🔧 هذه الميزة متاحة الآن.', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('خطأ في معالجة قائمة مساعدة النقاط:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ حدث خطأ في معالجة الطلب.', 
                    ephemeral: true 
                });
            }
        }
    },

    async handleEditLogChannel(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_points_log_channel_modal')
            .setTitle('تعديل قناة سجل النقاط');

        const channelInput = new TextInputBuilder()
            .setCustomId('log_channel_id')
            .setLabel('معرف قناة السجل')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1234567890123456789')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(channelInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },

    async handleEditColors(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_points_colors_modal')
            .setTitle('تعديل ألوان النقاط');

        const primaryColorInput = new TextInputBuilder()
            .setCustomId('primary_color')
            .setLabel('اللون الرئيسي (مثل: #2560df)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#2560df')
            .setRequired(true);

        const successColorInput = new TextInputBuilder()
            .setCustomId('success_color')
            .setLabel('لون النجاح (مثل: #00ff00)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#00ff00')
            .setRequired(true);

        const errorColorInput = new TextInputBuilder()
            .setCustomId('error_color')
            .setLabel('لون الخطأ (مثل: #ff0000)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#ff0000')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(primaryColorInput);
        const secondActionRow = new ActionRowBuilder().addComponents(successColorInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(errorColorInput);
        
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    },

    async handleManagePermissions(interaction) {
        const systemConfig = await loadSystemConfig();
        
        const embed = new EmbedBuilder()
            .setTitle('👥 إدارة صلاحيات النقاط')
            .setDescription('الرتب الحالية المخولة لإدارة النقاط:')
            .setColor(config.COLORS.PRIMARY)
            .addFields({
                name: '🔐 الرتب المخولة',
                value: systemConfig.allowedRoles?.map(roleId => `<@&${roleId}>`).join('\n') || 'فقط المديرين',
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: 'MT Community Points' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('points_permissions_select')
            .setPlaceholder('اختر عملية الصلاحيات')
            .addOptions([
                {
                    label: 'إضافة رتبة',
                    value: 'add_role',
                    emoji: '➕',
                    description: 'إضافة رتبة جديدة للصلاحيات'
                },
                {
                    label: 'إزالة رتبة',
                    value: 'remove_role',
                    emoji: '➖',
                    description: 'إزالة رتبة من الصلاحيات'
                },
                {
                    label: 'إعادة تعيين',
                    value: 'reset_roles',
                    emoji: '🔄',
                    description: 'إعادة تعيين جميع الصلاحيات'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.update({ embeds: [embed], components: [row] });
    },

    async handleAutoSettings(interaction) {
        const systemConfig = await loadSystemConfig();
        
        const embed = new EmbedBuilder()
            .setTitle('🤖 إعدادات النقاط التلقائية')
            .setDescription('إعدادات منح النقاط التلقائي:')
            .setColor(config.COLORS.PRIMARY)
            .addFields([
                {
                    name: '📝 النقاط عند الكتابة',
                    value: `**مفعل:** ${systemConfig.autoPoints?.messagePoints?.enabled ? 'نعم' : 'لا'}\n**النقاط:** ${systemConfig.autoPoints?.messagePoints?.amount || 1}\n**التأخير:** ${systemConfig.autoPoints?.messagePoints?.cooldown || 60} ثانية`,
                    inline: true
                },
                {
                    name: '🎤 النقاط عند الانضمام للصوت',
                    value: `**مفعل:** ${systemConfig.autoPoints?.voicePoints?.enabled ? 'نعم' : 'لا'}\n**النقاط:** ${systemConfig.autoPoints?.voicePoints?.amount || 2}\n**كل:** ${systemConfig.autoPoints?.voicePoints?.interval || 300} ثانية`,
                    inline: true
                },
                {
                    name: '⭐ النقاط عند التفاعل',
                    value: `**مفعل:** ${systemConfig.autoPoints?.reactionPoints?.enabled ? 'نعم' : 'لا'}\n**النقاط:** ${systemConfig.autoPoints?.reactionPoints?.amount || 1}`,
                    inline: true
                }
            ])
            .setTimestamp()
            .setFooter({ text: 'MT Community Points' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('points_auto_settings_select')
            .setPlaceholder('اختر الإعداد للتعديل')
            .addOptions([
                {
                    label: 'نقاط الرسائل',
                    value: 'message_points',
                    emoji: '📝',
                    description: 'تعديل إعدادات نقاط الرسائل'
                },
                {
                    label: 'نقاط الصوت',
                    value: 'voice_points',
                    emoji: '🎤',
                    description: 'تعديل إعدادات نقاط الصوت'
                },
                {
                    label: 'نقاط التفاعل',
                    value: 'reaction_points',
                    emoji: '⭐',
                    description: 'تعديل إعدادات نقاط التفاعل'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.update({ embeds: [embed], components: [row] });
    },

    async handleShowLeaderboard(interaction) {
        const points = await loadPoints();
        const sortedUsers = Object.entries(points)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🏆 متصدرو النقاط')
            .setColor(config.COLORS.PRIMARY)
            .setTimestamp()
            .setFooter({ text: 'MT Community Points' });

        if (sortedUsers.length === 0) {
            embed.setDescription('📭 لا توجد نقاط مسجلة حتى الآن');
        } else {
            const leaderboardText = sortedUsers.map(([userId, userPoints], index) => {
                const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`;
                return `${medal} <@${userId}> - **${userPoints}** نقطة`;
            }).join('\n');

            embed.setDescription(leaderboardText);
        }

        await interaction.update({ embeds: [embed], components: [] });
    },

    async handleShowRawData(interaction) {
        const points = await loadPoints();
        const systemConfig = await loadSystemConfig();
        
        const dataText = JSON.stringify({ systemConfig, points }, null, 2);
        
        if (dataText.length > 1900) {
            const truncated = dataText.substring(0, 1900) + '...';
            
            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام (مقطوعة)')
                .setDescription(`\`\`\`json\n${truncated}\n\`\`\``)
                .setColor(config.COLORS.WARNING)
                .setTimestamp()
                .setFooter({ text: 'MT Community Points - البيانات مقطوعة للعرض' });

            await interaction.update({ embeds: [embed], components: [] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام')
                .setDescription(`\`\`\`json\n${dataText}\n\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .setTimestamp()
                .setFooter({ text: 'MT Community Points' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    },

    async handleModal(interaction) {
        try {
            const systemConfig = await loadSystemConfig();
            
            if (interaction.customId === 'edit_points_log_channel_modal') {
                const logChannelId = interaction.fields.getTextInputValue('log_channel_id');
                
                systemConfig.logChannelId = logChannelId;
                const saved = await saveSystemConfig(systemConfig);
                
                if (saved) {
                    await interaction.reply({
                        content: `✅ تم تحديث قناة السجل إلى: <#${logChannelId}>`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ حدث خطأ في حفظ الإعدادات.',
                        ephemeral: true
                    });
                }
            }
            else if (interaction.customId === 'edit_points_colors_modal') {
                const primaryColor = interaction.fields.getTextInputValue('primary_color');
                const successColor = interaction.fields.getTextInputValue('success_color');
                const errorColor = interaction.fields.getTextInputValue('error_color');
                
                systemConfig.colors = {
                    primary: primaryColor,
                    success: successColor,
                    error: errorColor
                };
                
                const saved = await saveSystemConfig(systemConfig);
                
                if (saved) {
                    await interaction.reply({
                        content: `✅ تم تحديث الألوان:\n**الرئيسي:** ${primaryColor}\n**النجاح:** ${successColor}\n**الخطأ:** ${errorColor}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ حدث خطأ في حفظ الإعدادات.',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في معالجة نموذج مساعدة النقاط:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ حدث خطأ في معالجة النموذج.',
                    ephemeral: true
                });
            }
        }
    }
};