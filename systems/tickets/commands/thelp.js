
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
        console.error('خطأ في تحميل إعدادات نظام التذاكر:', error);
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
        console.error('خطأ في حفظ إعدادات نظام التذاكر:', error);
        return false;
    }
}

module.exports = {
    name: 'thelp',
    description: 'مساعدة نظام التذاكر مع إمكانية التعديل الكامل',
    async execute(message, args, client) {
        if (!config.SYSTEMS.TICKETS) {
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
            .setTitle('🎫 نظام مساعدة التذاكر')
            .setDescription('اختر الخيار الذي تريد إدارته:')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: '📊 حالة النظام', value: config.SYSTEMS.TICKETS ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: '📁 فئة التذاكر', value: systemConfig.categoryId ? `<#${systemConfig.categoryId}>` : 'غير محدد', inline: true },
                { name: '📝 قناة السجل', value: systemConfig.logChannelId ? `<#${systemConfig.logChannelId}>` : 'غير محدد', inline: true },
                { name: '⏱️ تأخير الاستلام', value: `${systemConfig.claimDelay || 0} ثانية`, inline: true },
                { name: '🎯 أنواع التذاكر', value: `${Object.keys(systemConfig.ticketTypes || {}).length} نوع`, inline: true },
                { name: '👥 الأدوار المخولة', value: `${(systemConfig.supportRoles || []).length} دور`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Tickets' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('tickets_help_select')
            .setPlaceholder('اختر خيار للإدارة...')
            .addOptions([
                {
                    label: 'إعدادات النظام العامة',
                    description: 'إدارة الإعدادات الأساسية للنظام',
                    value: 'general_settings',
                    emoji: '⚙️'
                },
                {
                    label: 'إدارة أنواع التذاكر',
                    description: 'إضافة وتعديل وحذف أنواع التذاكر',
                    value: 'manage_ticket_types',
                    emoji: '🏷️'
                },
                {
                    label: 'إدارة الأدوار المخولة',
                    description: 'إدارة الأدوار التي يمكنها التعامل مع التذاكر',
                    value: 'manage_support_roles',
                    emoji: '👥'
                },
                {
                    label: 'إعدادات قناة التذاكر',
                    description: 'إدارة فئة وقناة السجل',
                    value: 'channel_settings',
                    emoji: '📁'
                },
                {
                    label: 'إعدادات الاستلام والإغلاق',
                    description: 'إدارة تأخير الاستلام وإعدادات الإغلاق',
                    value: 'claim_settings',
                    emoji: '⏱️'
                },
                {
                    label: 'إعدادات الترانسكريبت',
                    description: 'إدارة إعدادات حفظ المحادثات',
                    value: 'transcript_settings',
                    emoji: '📄'
                },
                {
                    label: 'عرض البيانات الخام',
                    description: 'عرض ملف الإعدادات الكامل',
                    value: 'show_raw_data',
                    emoji: '💾'
                },
                {
                    label: 'تفعيل/إلغاء تفعيل النظام',
                    description: 'تشغيل أو إيقاف نظام التذاكر',
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
            case 'manage_ticket_types':
                await this.handleManageTicketTypes(interaction);
                break;
            case 'manage_support_roles':
                await this.handleManageSupportRoles(interaction);
                break;
            case 'channel_settings':
                await this.handleChannelSettings(interaction);
                break;
            case 'claim_settings':
                await this.handleClaimSettings(interaction);
                break;
            case 'transcript_settings':
                await this.handleTranscriptSettings(interaction);
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
            .setTitle('⚙️ الإعدادات العامة لنظام التذاكر')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'حالة النظام', value: config.SYSTEMS.TICKETS ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: 'فئة التذاكر', value: systemConfig.categoryId ? `<#${systemConfig.categoryId}>` : 'غير محدد', inline: true },
                { name: 'قناة السجل', value: systemConfig.logChannelId ? `<#${systemConfig.logChannelId}>` : 'غير محدد', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_tickets_category')
                    .setLabel('تعديل فئة التذاكر')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📁'),
                new ButtonBuilder()
                    .setCustomId('edit_tickets_log_channel')
                    .setLabel('تعديل قناة السجل')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleManageTicketTypes(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🏷️ إدارة أنواع التذاكر')
            .setColor(config.COLORS.PRIMARY)
            .setDescription('الأنواع الحالية للتذاكر:')
            .addFields(
                Object.entries(systemConfig.ticketTypes || {}).map(([key, type]) => ({
                    name: `${type.emoji} ${type.name}`,
                    value: `**المعرف:** ${key}\n**الوصف:** ${type.description}\n**الأدوار:** ${type.supportRoles?.map(id => `<@&${id}>`).join(', ') || 'لا توجد'}`,
                    inline: false
                }))
            )
            .setTimestamp();

        if (Object.keys(systemConfig.ticketTypes || {}).length === 0) {
            embed.addFields({ name: 'لا توجد أنواع تذاكر', value: 'لم يتم إنشاء أي نوع تذاكر بعد.', inline: false });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('manage_ticket_type_select')
            .setPlaceholder('اختر نوع تذكرة للتعديل أو إضافة نوع جديد...')
            .addOptions([
                {
                    label: 'إضافة نوع تذكرة جديد',
                    value: 'add_new_ticket_type',
                    description: 'إنشاء نوع تذكرة جديد',
                    emoji: '➕'
                },
                ...Object.entries(systemConfig.ticketTypes || {}).map(([key, type]) => ({
                    label: type.name,
                    value: `edit_ticket_type_${key}`,
                    description: `تعديل نوع التذكرة: ${type.name}`,
                    emoji: type.emoji?.replace(/[<>:]/g, '').split(':')[1]
                }))
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        const components = [new ActionRowBuilder().addComponents(selectMenu)];
        if (Object.keys(systemConfig.ticketTypes || {}).length > 0) {
            components.push(buttons);
        }

        await interaction.update({ embeds: [embed], components });
    },

    async handleManageSupportRoles(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('👥 إدارة الأدوار المخولة')
            .setColor(config.COLORS.PRIMARY)
            .setDescription('الأدوار المخولة للتعامل مع التذاكر:')
            .addFields(
                { 
                    name: 'الأدوار الحالية', 
                    value: systemConfig.supportRoles?.length > 0 ? 
                        systemConfig.supportRoles.map(roleId => `<@&${roleId}>`).join('\n') : 
                        'لا توجد أدوار محددة', 
                    inline: false 
                }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_support_role')
                    .setLabel('إضافة دور')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('remove_support_role')
                    .setLabel('حذف دور')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('➖'),
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleChannelSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('📁 إعدادات قناة التذاكر')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'فئة التذاكر', value: systemConfig.categoryId ? `<#${systemConfig.categoryId}>` : 'غير محدد', inline: true },
                { name: 'قناة السجل', value: systemConfig.logChannelId ? `<#${systemConfig.logChannelId}>` : 'غير محدد', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_tickets_category')
                    .setLabel('تعديل فئة التذاكر')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📁'),
                new ButtonBuilder()
                    .setCustomId('edit_tickets_log_channel')
                    .setLabel('تعديل قناة السجل')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleClaimSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('⏱️ إعدادات الاستلام والإغلاق')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'تأخير الاستلام', value: `${systemConfig.claimDelay || 0} ثانية`, inline: true },
                { name: 'السماح بفك الاستلام', value: systemConfig.allowUnclaim ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'إغلاق تلقائي بعد فك الاستلام', value: systemConfig.autoCloseAfterUnclaim ? '✅ مفعل' : '❌ معطل', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_tickets_claim_delay')
                    .setLabel('تعديل تأخير الاستلام')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⏱️'),
                new ButtonBuilder()
                    .setCustomId('toggle_unclaim')
                    .setLabel('تفعيل/إلغاء فك الاستلام')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleTranscriptSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('📄 إعدادات الترانسكريبت')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'حفظ الترانسكريبت', value: systemConfig.saveTranscript !== false ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'إرسال في قناة السجل', value: systemConfig.sendToLogChannel !== false ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'تضمين الملفات المرفقة', value: systemConfig.includeAttachments !== false ? '✅ مفعل' : '❌ معطل', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_save_transcript')
                    .setLabel('تفعيل/إلغاء حفظ الترانسكريبت')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📄'),
                new ButtonBuilder()
                    .setCustomId('toggle_log_channel_send')
                    .setLabel('تفعيل/إلغاء الإرسال للسجل')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleToggleSystem(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 تفعيل/إلغاء تفعيل نظام التذاكر')
            .setDescription('اختر الحالة الجديدة للنظام')
            .setColor(0x0099ff)
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_system_tickets_true')
                    .setLabel('تفعيل')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('toggle_system_tickets_false')
                    .setLabel('إلغاء التفعيل')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('back_to_tickets_main')
                    .setLabel('العودة')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleShowRawData(interaction) {
        const systemConfig = await loadSystemConfig();

        const configText = JSON.stringify(systemConfig, null, 2);

        if (configText.length > 1900) {
            const truncated = configText.substring(0, 1900) + '...';

            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام لنظام التذاكر')
                .setDescription(`\`\`\`json\n${truncated}\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .addFields({ name: 'ملاحظة', value: 'البيانات مقطوعة بسبب طول النص. للحصول على البيانات الكاملة، تحقق من ملف البيانات مباشرة.', inline: false })
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_tickets_main')
                        .setLabel('العودة للقائمة الرئيسية')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [buttons] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام لنظام التذاكر')
                .setDescription(`\`\`\`json\n${configText}\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_tickets_main')
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
            
            if (interaction.customId === 'edit_tickets_category_modal') {
                const categoryId = interaction.fields.getTextInputValue('category_id');
                
                systemConfig.categoryId = categoryId;
                const saved = await saveSystemConfig(systemConfig);
                
                if (saved) {
                    await interaction.reply({
                        content: `✅ تم تحديث فئة التذاكر إلى: <#${categoryId}>`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ حدث خطأ في حفظ الإعدادات.',
                        ephemeral: true
                    });
                }
            }
            
            if (interaction.customId === 'edit_tickets_log_channel_modal') {
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

            if (interaction.customId === 'edit_tickets_claim_delay_modal') {
                const delayValue = interaction.fields.getTextInputValue('claim_delay');
                const delay = parseInt(delayValue);
                
                if (isNaN(delay) || delay < 0) {
                    return await interaction.reply({
                        content: '❌ يجب أن يكون التأخير رقمًا صحيحًا أكبر من أو يساوي 0.',
                        ephemeral: true
                    });
                }
                
                systemConfig.claimDelay = delay;
                const saved = await saveSystemConfig(systemConfig);
                
                if (saved) {
                    await interaction.reply({
                        content: `✅ تم تحديث تأخير الاستلام إلى: ${delay} ثانية`,
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
