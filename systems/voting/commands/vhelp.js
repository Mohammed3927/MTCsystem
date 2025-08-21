
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
        console.error('خطأ في تحميل إعدادات نظام التصويت:', error);
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
        console.error('خطأ في حفظ إعدادات نظام التصويت:', error);
        return false;
    }
}

module.exports = {
    name: 'vhelp',
    description: 'مساعدة نظام التصويت مع إمكانية التعديل الكامل',
    async execute(message, args, client) {
        if (!config.SYSTEMS.VOTING) {
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
            .setTitle('🗳️ نظام مساعدة التصويت')
            .setDescription('اختر الخيار الذي تريد إدارته:')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: '📊 حالة النظام', value: config.SYSTEMS.VOTING ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: '📺 قناة التصويت', value: systemConfig.channelId ? `<#${systemConfig.channelId}>` : 'غير محدد', inline: true },
                { name: '👥 الدور المطلوب', value: systemConfig.requiredRoleId ? `<@&${systemConfig.requiredRoleId}>` : 'غير محدد', inline: true },
                { name: '🏆 دور الفائز', value: systemConfig.winnerRoleId ? `<@&${systemConfig.winnerRoleId}>` : 'غير محدد', inline: true },
                { name: '⏱️ فترة التحديث', value: `${systemConfig.updateInterval || 7} ثانية`, inline: true },
                { name: '🎯 الشخصيات', value: `${systemConfig.characters ? Object.keys(systemConfig.characters).length : 0} شخصية`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Voting' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('voting_help_select')
            .setPlaceholder('اختر خيار للإدارة...')
            .addOptions([
                {
                    label: 'إعدادات النظام العامة',
                    description: 'إدارة الإعدادات الأساسية للنظام',
                    value: 'general_settings',
                    emoji: '⚙️'
                },
                {
                    label: 'إدارة القنوات والأدوار',
                    description: 'تحديد قناة التصويت والأدوار المطلوبة',
                    value: 'channels_roles',
                    emoji: '👥'
                },
                {
                    label: 'إدارة الشخصيات',
                    description: 'إضافة وتعديل وحذف الشخصيات',
                    value: 'manage_characters',
                    emoji: '🎭'
                },
                {
                    label: 'إعدادات التصويت',
                    description: 'إدارة قواعد ومدة التصويت',
                    value: 'voting_settings',
                    emoji: '🗳️'
                },
                {
                    label: 'إعدادات التحديث والعرض',
                    description: 'إدارة فترات التحديث وشكل العرض',
                    value: 'display_settings',
                    emoji: '🔄'
                },
                {
                    label: 'إدارة القائمة السوداء',
                    description: 'إدارة المستخدمين المحظورين من التصويت',
                    value: 'blacklist_management',
                    emoji: '🚫'
                },
                {
                    label: 'عرض البيانات الخام',
                    description: 'عرض ملف الإعدادات الكامل',
                    value: 'show_raw_data',
                    emoji: '💾'
                },
                {
                    label: 'تفعيل/إلغاء تفعيل النظام',
                    description: 'تشغيل أو إيقاف نظام التصويت',
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
            case 'channels_roles':
                await this.handleChannelsRoles(interaction);
                break;
            case 'manage_characters':
                await this.handleManageCharacters(interaction);
                break;
            case 'voting_settings':
                await this.handleVotingSettings(interaction);
                break;
            case 'display_settings':
                await this.handleDisplaySettings(interaction);
                break;
            case 'blacklist_management':
                await this.handleBlacklistManagement(interaction);
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
            .setTitle('⚙️ الإعدادات العامة لنظام التصويت')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'حالة النظام', value: config.SYSTEMS.VOTING ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: 'قناة التصويت', value: systemConfig.channelId ? `<#${systemConfig.channelId}>` : 'غير محدد', inline: true },
                { name: 'فترة التحديث', value: `${systemConfig.updateInterval || 7} ثانية`, inline: true },
                { name: 'التصويت الواحد لكل مستخدم', value: systemConfig.oneVotePerUser ? '✅ مفعل' : '❌ معطل', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_voting_channel')
                    .setLabel('تعديل قناة التصويت')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📺'),
                new ButtonBuilder()
                    .setCustomId('edit_update_interval')
                    .setLabel('تعديل فترة التحديث')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⏱️'),
                new ButtonBuilder()
                    .setCustomId('toggle_one_vote_per_user')
                    .setLabel('تفعيل/إلغاء صوت واحد')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗳️'),
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleChannelsRoles(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('👥 إدارة القنوات والأدوار')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'قناة التصويت', value: systemConfig.channelId ? `<#${systemConfig.channelId}>` : 'غير محدد', inline: true },
                { name: 'الدور المطلوب للتصويت', value: systemConfig.requiredRoleId ? `<@&${systemConfig.requiredRoleId}>` : 'غير محدد', inline: true },
                { name: 'دور الفائز', value: systemConfig.winnerRoleId ? `<@&${systemConfig.winnerRoleId}>` : 'غير محدد', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_voting_channel')
                    .setLabel('تعديل قناة التصويت')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📺'),
                new ButtonBuilder()
                    .setCustomId('edit_voting_role')
                    .setLabel('تعديل الدور المطلوب')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('edit_winner_role')
                    .setLabel('تعديل دور الفائز')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆'),
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleManageCharacters(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🎭 إدارة الشخصيات')
            .setColor(config.COLORS.PRIMARY)
            .setDescription('الشخصيات الحالية في التصويت:')
            .addFields(
                Object.entries(systemConfig.characters || {}).map(([name, data]) => ({
                    name: name,
                    value: `الأصوات: ${data.votes || 0}\nالرمز: ${data.emoji || '❓'}`,
                    inline: true
                }))
            )
            .setTimestamp();

        if (Object.keys(systemConfig.characters || {}).length === 0) {
            embed.addFields({ name: 'لا توجد شخصيات', value: 'لم يتم إضافة أي شخصيات للتصويت بعد.', inline: false });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_character')
                    .setLabel('إضافة شخصية')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('edit_character')
                    .setLabel('تعديل شخصية')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✏️'),
                new ButtonBuilder()
                    .setCustomId('remove_character')
                    .setLabel('حذف شخصية')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('reset_votes')
                    .setLabel('إعادة تعيين الأصوات')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons, backButton] });
    },

    async handleVotingSettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🗳️ إعدادات التصويت')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'صوت واحد لكل مستخدم', value: systemConfig.oneVotePerUser ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'السماح بتغيير التصويت', value: systemConfig.allowVoteChange ? '✅ مسموح' : '❌ غير مسموح', inline: true },
                { name: 'إخفاء النتائج أثناء التصويت', value: systemConfig.hideResultsDuringVoting ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'مدة التصويت (دقائق)', value: systemConfig.votingDuration ? `${systemConfig.votingDuration} دقيقة` : 'غير محدد', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_one_vote_per_user')
                    .setLabel('تفعيل/إلغاء صوت واحد')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗳️'),
                new ButtonBuilder()
                    .setCustomId('toggle_vote_change')
                    .setLabel('تفعيل/إلغاء تغيير التصويت')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('toggle_hide_results')
                    .setLabel('إخفاء/إظهار النتائج')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👁️'),
                new ButtonBuilder()
                    .setCustomId('edit_voting_duration')
                    .setLabel('تعديل مدة التصويت')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⏰')
            );

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons, backButton] });
    },

    async handleDisplaySettings(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🔄 إعدادات التحديث والعرض')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: 'فترة التحديث', value: `${systemConfig.updateInterval || 7} ثانية`, inline: true },
                { name: 'عرض عدد الأصوات', value: systemConfig.showVoteCount ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'عرض النسب المئوية', value: systemConfig.showPercentages ? '✅ مفعل' : '❌ معطل', inline: true },
                { name: 'تحديث تلقائي للرسالة', value: systemConfig.autoUpdate ? '✅ مفعل' : '❌ معطل', inline: true }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('edit_update_interval')
                    .setLabel('تعديل فترة التحديث')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⏱️'),
                new ButtonBuilder()
                    .setCustomId('toggle_show_vote_count')
                    .setLabel('تفعيل/إلغاء عدد الأصوات')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔢'),
                new ButtonBuilder()
                    .setCustomId('toggle_show_percentages')
                    .setLabel('تفعيل/إلغاء النسب المئوية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('toggle_auto_update')
                    .setLabel('تفعيل/إلغاء التحديث التلقائي')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons, backButton] });
    },

    async handleBlacklistManagement(interaction) {
        const systemConfig = await loadSystemConfig();

        const embed = new EmbedBuilder()
            .setTitle('🚫 إدارة القائمة السوداء')
            .setColor(config.COLORS.PRIMARY)
            .setDescription('المستخدمون المحظورون من التصويت:')
            .addFields(
                { 
                    name: 'المستخدمون المحظورون', 
                    value: systemConfig.blacklist && systemConfig.blacklist.length > 0 ? 
                        systemConfig.blacklist.map(userId => `<@${userId}>`).join('\n') : 
                        'لا يوجد مستخدمون محظورون', 
                    inline: false 
                }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_to_blacklist')
                    .setLabel('إضافة للقائمة السوداء')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚫'),
                new ButtonBuilder()
                    .setCustomId('remove_from_blacklist')
                    .setLabel('إزالة من القائمة السوداء')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('clear_blacklist')
                    .setLabel('مسح القائمة السوداء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
                    .setLabel('العودة للقائمة الرئيسية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    },

    async handleToggleSystem(interaction) {
        const currentStatus = config.SYSTEMS.VOTING;

        const embed = new EmbedBuilder()
            .setTitle('🔄 تفعيل/إلغاء تفعيل نظام التصويت')
            .setDescription(`الحالة الحالية: ${currentStatus ? '🟢 مفعل' : '🔴 معطل'}`)
            .setColor(currentStatus ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .addFields(
                { name: 'تحذير', value: 'تعطيل النظام سيؤدي إلى عدم عمل جميع أوامر ووظائف التصويت.', inline: false }
            )
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`toggle_voting_system_${!currentStatus}`)
                    .setLabel(currentStatus ? 'إلغاء التفعيل' : 'تفعيل النظام')
                    .setStyle(currentStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(currentStatus ? '🔴' : '🟢'),
                new ButtonBuilder()
                    .setCustomId('back_to_voting_main')
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
                .setTitle('💾 البيانات الخام لنظام التصويت')
                .setDescription(`\`\`\`json\n${truncated}\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .addFields({ name: 'ملاحظة', value: 'البيانات مقطوعة بسبب طول النص. للحصول على البيانات الكاملة، تحقق من ملف البيانات مباشرة.', inline: false })
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_voting_main')
                        .setLabel('العودة للقائمة الرئيسية')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [buttons] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('💾 البيانات الخام لنظام التصويت')
                .setDescription(`\`\`\`json\n${configText}\`\`\``)
                .setColor(config.COLORS.PRIMARY)
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_voting_main')
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
            
            if (interaction.customId === 'edit_voting_channel_modal') {
                const channelId = interaction.fields.getTextInputValue('channel_id');
                
                systemConfig.channelId = channelId;
                const saved = await saveSystemConfig(systemConfig);
                
                if (saved) {
                    await interaction.reply({
                        content: `✅ تم تحديث قناة التصويت إلى: <#${channelId}>`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: '❌ حدث خطأ في حفظ الإعدادات.',
                        ephemeral: true
                    });
                }
            }

            if (interaction.customId === 'edit_voting_role_modal') {
                const roleId = interaction.fields.getTextInputValue('role_id');
                
                systemConfig.requiredRoleId = roleId;
                const saved = await saveSystemConfig(systemConfig);
                
                if (saved) {
                    await interaction.reply({
                        content: `✅ تم تحديث الدور المطلوب إلى: <@&${roleId}>`,
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
