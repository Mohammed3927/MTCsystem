
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
        await fs.writeFile(configPath, JSON.stringify(systemConfig, null, 4));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ إعدادات نظام النقاط:', error);
        return false;
    }
}

module.exports = {
    name: 'phelp',
    description: 'مساعدة نظام النقاط مع إمكانية التعديل الكامل',
    async execute(message, args, client) {
        if (!config.SYSTEMS.POINTS) {
            return;
        }

        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', flags: 64 });
        }

        const systemConfig = await loadSystemConfig();
        if (!systemConfig) {
            return message.reply({ content: '❌ فشل في تحميل إعدادات النظام.', flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 نظام مساعدة النقاط')
            .setDescription('اختر الخيار الذي تريد إدارته:')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: '📊 حالة النظام', value: config.SYSTEMS.POINTS ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: '📝 قناة السجل', value: systemConfig.logChannelId ? `<#${systemConfig.logChannelId}>` : 'غير محدد', inline: true },
                { name: '🎨 ألوان النقاط', value: systemConfig.colors ? `${Object.keys(systemConfig.colors).length} لون` : 'لا توجد ألوان', inline: true },
                { name: '👥 الصلاحيات', value: systemConfig.permissions ? `${Object.keys(systemConfig.permissions).length} صلاحية` : 'لا توجد صلاحيات', inline: true },
                { name: '⚡ النقاط التلقائية', value: systemConfig.autoPoints?.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: '📈 الحد الأقصى للنقاط', value: systemConfig.maxPoints || 'غير محدد', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Points' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('points_help_select')
            .setPlaceholder('اختر خيار للإدارة...')
            .addOptions([
                {
                    label: 'إعدادات النظام العامة',
                    description: 'إدارة الإعدادات الأساسية للنظام',
                    value: 'general_settings',
                    emoji: '⚙️'
                },
                {
                    label: 'إدارة ألوان النقاط',
                    description: 'إضافة وتعديل وحذف ألوان النقاط',
                    value: 'manage_colors',
                    emoji: '🎨'
                },
                {
                    label: 'إدارة الصلاحيات',
                    description: 'تحديد من يمكنه إعطاء النقاط',
                    value: 'manage_permissions',
                    emoji: '👥'
                },
                {
                    label: 'إعدادات النقاط التلقائية',
                    description: 'تفعيل وإدارة النقاط التلقائية',
                    value: 'auto_points_settings',
                    emoji: '⚡'
                },
                {
                    label: 'إعدادات الحدود والقيود',
                    description: 'تحديد الحدود القصوى والدنيا',
                    value: 'limits_settings',
                    emoji: '📊'
                },
                {
                    label: 'إعدادات الإشعارات',
                    description: 'إدارة إشعارات النقاط والتنبيهات',
                    value: 'notification_settings',
                    emoji: '🔔'
                },
                {
                    label: 'عرض البيانات الخام',
                    description: 'عرض ملف الإعدادات الكامل',
                    value: 'show_raw_data',
                    emoji: '💾'
                },
                {
                    label: 'تفعيل/إلغاء تفعيل النظام',
                    description: 'تشغيل أو إيقاف نظام النقاط',
                    value: 'toggle_system',
                    emoji: '🔄'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleSelectMenu(interaction) {
        const selectedValue = interaction.values[0];
        
        switch (selectedValue) {
            case 'general_settings':
                await this.handleGeneralSettings(interaction);
                break;
            case 'manage_colors':
                await this.handleManageColors(interaction);
                break;
            case 'manage_permissions':
                await this.handleManagePermissions(interaction);
                break;
            case 'auto_points_settings':
                await this.handleAutoPointsSettings(interaction);
                break;
            case 'limits_settings':
                await this.handleLimitsSettings(interaction);
                break;
            case 'notification_settings':
                await this.handleNotificationSettings(interaction);
                break;
            case 'show_raw_data':
                await this.handleShowRawData(interaction);
                break;
            case 'toggle_system':
                await this.handleToggleSystem(interaction);
                break;
        }
    },

    async handleGeneralSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('⚙️ الإعدادات العامة لنظام النقاط')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'حالة النظام', value: config.SYSTEMS.POINTS ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: 'قناة السجل', value: systemConfig.logChannelId ? `<#${systemConfig.logChannelId}>` : 'غير محدد', inline: true },
                { name: 'الحد الأقصى للنقاط', value: systemConfig.maxPoints?.toString() || 'غير محدد', inline: true },
                { name: 'السماح بالنقاط السالبة', value: systemConfig.allowNegative ? '✅ مسموح' : '❌ غير مسموح', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_points_log_channel')
                    .setLabel('تعديل قناة السجل')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('edit_points_max_limit')
                    .setLabel('تعديل الحد الأقصى')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('toggle_negative_points')
                    .setLabel('تفعيل/إلغاء النقاط السالبة')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleManageColors(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🎨 إدارة ألوان النقاط')
            .setColor(config.COLORS.PRIMARY)
            .setDescription('الألوان الحالية للنقاط:')
            .addFields(
                Object.entries(systemConfig.colors || {}).map(([points, color]) => ({
                    name: `${points} نقطة`,
                    value: `اللون: ${color}`,
                    inline: true
                }))
            )
            .setTimestamp();

        if (Object.keys(systemConfig.colors || {}).length === 0) {
            embed.addFields({ name: 'لا توجد ألوان محددة', value: 'لم يتم تحديد أي ألوان للنقاط بعد.', inline: false });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_point_color')
                    .setLabel('إضافة لون جديد')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('edit_points_colors')
                    .setLabel('تعديل الألوان')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('remove_point_color')
                    .setLabel('حذف لون')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleManagePermissions(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('👥 إدارة صلاحيات النقاط')
            .setColor(config.COLORS.PRIMARY)
            .setDescription('إدارة من يمكنه إعطاء النقاط وكمية النقاط المسموحة:')
            .addFields(
                Object.entries(systemConfig.permissions || {}).map(([roleId, permission]) => ({
                    name: `<@&${roleId}>`,
                    value: `الحد الأقصى: ${permission.maxPoints}\nالحد الأدنى: ${permission.minPoints}`,
                    inline: true
                }))
            )
            .setTimestamp();

        if (Object.keys(systemConfig.permissions || {}).length === 0) {
            embed.addFields({ name: 'لا توجد صلاحيات محددة', value: 'لم يتم تحديد أي صلاحيات للأدوار بعد.', inline: false });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('points_permissions_select')
            .setPlaceholder('اختر إجراء للصلاحيات...')
            .addOptions([
                {
                    label: 'إضافة صلاحية جديدة',
                    value: 'add_permission',
                    description: 'منح دور صلاحية إعطاء النقاط',
                    emoji: '➕'
                },
                {
                    label: 'تعديل صلاحية موجودة',
                    value: 'edit_permission',
                    description: 'تعديل صلاحيات دور موجود',
                    emoji: '✏️'
                },
                {
                    label: 'حذف صلاحية',
                    value: 'remove_permission',
                    description: 'إزالة صلاحية من دور',
                    emoji: '🗑️'
                }
            ]);

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ 
            embeds: [embed], 
            components: [new ActionRowBuilder().addComponents(selectMenu), backButton] 
        });
    },

    async handleAutoPointsSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('⚡ إعدادات النقاط التلقائية')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'النقاط التلقائية', value: systemConfig.autoPoints?.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'نقاط كل رسالة', value: systemConfig.autoPoints?.pointsPerMessage?.toString() || '0', inline: true },
                { name: 'الحد الأدنى لطول الرسالة', value: systemConfig.autoPoints?.minMessageLength?.toString() || '0', inline: true },
                { name: 'الفترة الزمنية (ثانية)', value: systemConfig.autoPoints?.cooldown?.toString() || '0', inline: true }
            )
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('points_auto_settings_select')
            .setPlaceholder('اختر إعداد للتعديل...')
            .addOptions([
                {
                    label: 'تفعيل/إلغاء النقاط التلقائية',
                    value: 'toggle_auto_points',
                    description: 'تشغيل أو إيقاف النقاط التلقائية',
                    emoji: '🔄'
                },
                {
                    label: 'تعديل نقاط كل رسالة',
                    value: 'edit_points_per_message',
                    description: 'تحديد عدد النقاط لكل رسالة',
                    emoji: '💬'
                },
                {
                    label: 'تعديل الحد الأدنى لطول الرسالة',
                    value: 'edit_min_message_length',
                    description: 'تحديد أقل عدد أحرف للرسالة',
                    emoji: '📏'
                },
                {
                    label: 'تعديل الفترة الزمنية',
                    value: 'edit_cooldown',
                    description: 'تحديد الفترة بين النقاط',
                    emoji: '⏱️'
                }
            ]);

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ 
            embeds: [embed], 
            components: [new ActionRowBuilder().addComponents(selectMenu), backButton] 
        });
    },

    async handleLimitsSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('📊 إعدادات الحدود والقيود')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'الحد الأقصى للنقاط', value: systemConfig.maxPoints?.toString() || 'غير محدد', inline: true },
                { name: 'الحد الأدنى للنقاط', value: systemConfig.minPoints?.toString() || 'غير محدد', inline: true },
                { name: 'السماح بالنقاط السالبة', value: systemConfig.allowNegative ? '✅ مسموح' : '❌ غير مسموح', inline: true },
                { name: 'الحد الأقصى للنقاط في اليوم', value: systemConfig.dailyLimit?.toString() || 'غير محدد', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_points_max_limit')
                    .setLabel('الحد الأقصى')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('edit_points_min_limit')
                    .setLabel('الحد الأدنى')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📉'),
                new ButtonBuilder()
                    .setCustomId('toggle_negative_points')
                    .setLabel('النقاط السالبة')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('edit_daily_limit')
                    .setLabel('الحد اليومي')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📅')
            );

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons, backButton] });
    },

    async handleNotificationSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🔔 إعدادات الإشعارات')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'إشعار العضو عند الحصول على نقاط', value: systemConfig.notifications?.onReceive ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'إشعار في قناة السجل', value: systemConfig.notifications?.logChannel ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'إشعار عند الوصول لحد معين', value: systemConfig.notifications?.milestones ? '✅ مفعل' : '❌ معطل', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_receive_notification')
                    .setLabel('إشعار الاستلام')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📬'),
                new ButtonBuilder()
                    .setCustomId('toggle_log_notification')
                    .setLabel('إشعار السجل')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('toggle_milestone_notification')
                    .setLabel('إشعار المعالم')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleToggleSystem(interaction) {
        const currentStatus = config.SYSTEMS.POINTS;

        const embed = new EmbedBuilder()
            .setTitle('🔄 تفعيل/إلغاء تفعيل نظام النقاط')
            .setDescription(`الحالة الحالية: ${currentStatus ? '🟢 مفعل' : '🔴 معطل'}`)
            .setColor(currentStatus ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .addFields(
                { name: 'تحذير', value: 'تعطيل النظام سيؤدي إلى عدم عمل جميع أوامر ووظائف النقاط.', inline: false }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`toggle_points_system_${!currentStatus}`)
                    .setLabel(currentStatus ? 'إلغاء التفعيل' : 'تفعيل النظام')
                    .setStyle(currentStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(currentStatus ? '🔴' : '🟢'),
                new ButtonBuilder()
                    .setCustomId('back_to_points_main')
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleShowRawData(interaction) {
        const systemConfig = await loadSystemConfig();

        const configText = JSON.stringify(systemConfig, null, 2);

        if (configText.length > 1900) {
            const truncated = configText.substring(0, 1900) + '...';

            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام لنظام النقاط')
                .setDescription(`\`\`\`json\n${truncated}\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .addFields({ name: 'ملاحظة', value: 'البيانات مقطوعة بسبب طول النص. للحصول على البيانات الكاملة، تحقق من ملف البيانات مباشرة.', inline: false })
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_points_main')
                        .setLabel('العودة للقائمة الرئيسية')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [buttons] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام لنظام النقاط')
                .setDescription(`\`\`\`json\n${configText}\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_points_main')
                        .setLabel('العودة للقائمة الرئيسية')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [buttons] });
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

            if (interaction.customId === 'edit_points_colors_modal') {
                const colorsData = interaction.fields.getTextInputValue('colors_data');
                
                try {
                    const colors = JSON.parse(colorsData);
                    systemConfig.colors = colors;
                    const saved = await saveSystemConfig(systemConfig);
                    
                    if (saved) {
                        await interaction.reply({
                            content: '✅ تم تحديث ألوان النقاط بنجاح.',
                            ephemeral: true
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ حدث خطأ في حفظ الإعدادات.',
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    await interaction.reply({
                        content: '❌ تنسيق البيانات غير صحيح. يجب أن يكون JSON صالح.',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('خطأ في معالجة النموذج:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ حدث خطأ في معالجة البيانات.',
                    ephemeral: true
                });
            }
        }
    }
};
