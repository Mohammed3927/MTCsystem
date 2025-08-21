const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const { InputValidator, InputSanitizer } = require('../utils/inputHelpers');
const { ApplicationHandler } = require('../handlers/applicationHandler');
const config = require('../../../config');

class ApplicationHelpCommand {
    constructor() {
        this.name = 'ahelp';
        this.description = 'مساعدة نظام التقديمات مع إمكانية التعديل الكامل';
        this.applicationHandler = new ApplicationHandler();
    }

    async execute(message, args, client) {
        if (!config.SYSTEMS.APPLICATIONS) return;

        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ 
                content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', 
                flags: 64 
            });
        }

        const systemConfig = await this.applicationHandler.loadConfig();
        if (!systemConfig) {
            return message.reply({ 
                content: '❌ حدث خطأ في تحميل إعدادات النظام.', 
                flags: 64 
            });
        }

        // إنشاء الإمبد والقائمة
        const embed = this.createMainEmbed(systemConfig);
        const selectMenu = this.createMainSelectMenu();
        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.reply({ embeds: [embed], components: [row] });
    }

    // إنشاء الإمبد الرئيسي
    createMainEmbed(systemConfig) {
        return new EmbedBuilder()
            .setTitle('🔧 إدارة نظام التقديمات')
            .setDescription('اختر العنصر الذي تريد تعديله:')
            .setColor(config.COLORS.PRIMARY)
            .addFields([
                {
                    name: '📋 الأوامر المتاحة',
                    value: '`+apply` - إنشاء رسالة التقديم لجميع الأقسام\n' +
                        '`+apply <department>` - إنشاء رسالة تقديم لقسم محدد\n' +
                        '`+unblack @user` - إزالة مستخدم من القائمة السوداء\n' +
                        '`+areset <department>` - حذف جميع بيانات القسم\n' +
                        '`+ahelp` - هذه الرسالة\n' +
                        '`+ahelp departments` - إدارة أقسام التقديم\n' +
                        '`+ahelp startup` - تشغيل/إطفاء زر Apply في startup\n' +
                        '`+ahelp questions` - إدارة أسئلة التقديم'
                },
                {
                    name: '🏢 الأقسام المتاحة',
                    value: Object.entries(systemConfig.departments)
                        .map(([key, dept]) => `• **${key}:** ${dept.name}`)
                        .join('\n') || 'لا توجد أقسام حالياً'
                },
                {
                    name: '📊 إحصائيات سريعة',
                    value: `**العنوان الرئيسي:** ${systemConfig.mainMessage.title}\n` +
                        `**الوصف الرئيسي:** ${systemConfig.mainMessage.description}`
                }
            ])
            .setTimestamp()
            .setFooter({ text: 'MT Community Applications' });
    }

    // إنشاء قائمة الاختيارات الرئيسية
    createMainSelectMenu() {
        return new StringSelectMenuBuilder()
            .setCustomId('applications_help_select')
            .setPlaceholder('اختر العنصر للتعديل')
            .addOptions([
                {
                    label: 'تعديل الرسالة الرئيسية',
                    description: 'تعديل عنوان ووصف رسالة التقديم الرئيسية',
                    value: 'edit_main_message',
                    emoji: '✏️'
                },
                {
                    label: 'إدارة الأقسام',
                    description: 'إضافة أو تعديل أو حذف الأقسام',
                    value: 'manage_departments',
                    emoji: '�️'
                },
                {
                    label: 'تعديل قنوات المراجعة',
                    description: 'تغيير قنوات مراجعة التقديمات',
                    value: 'edit_review_channels',
                    emoji: '📺'
                },
                {
                    label: 'إدارة رتب المراجعين',
                    description: 'إضافة أو حذف رتب المراجعين',
                    value: 'manage_reviewer_roles',
                    emoji: '👥'
                },
                {
                    label: 'تعديل الأسئلة',
                    description: 'تعديل أسئلة التقديم للأقسام',
                    value: 'edit_questions',
                    emoji: '📋'
                },
                {
                    label: 'عرض البيانات الخام',
                    description: 'عرض ملف الإعدادات الكامل',
                    value: 'show_raw_data',
                    emoji: '�'
                }
            ]);
    }

    // معالجة اختيارات القائمة
    async handleSelectMenu(interaction) {
        try {
            const systemConfig = await this.applicationHandler.loadConfig();
            if (!systemConfig) {
                await interaction.reply({
                    content: '❌ حدث خطأ في تحميل إعدادات النظام',
                    ephemeral: true
                });
                return;
            }

            const selectedValue = interaction.values[0];
            switch (selectedValue) {
                case 'edit_main_message':
                    await this.handleEditMainMessage(interaction);
                    break;
                case 'manage_departments':
                    await this.handleDepartmentManagement(interaction);
                    break;
                case 'edit_review_channels':
                    await this.handleEditReviewChannels(interaction, systemConfig);
                    break;
                case 'manage_reviewer_roles':
                    await this.handleManageReviewerRoles(interaction, systemConfig);
                    break;
                case 'edit_questions':
                    await this.handleEditQuestions(interaction, systemConfig);
                    break;
                case 'show_raw_data':
                    await this.handleShowRawData(interaction, systemConfig);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ خيار غير صالح', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Error in select menu handler:', error);
            await interaction.reply({ 
                content: '❌ حدث خطأ غير متوقع', 
                ephemeral: true 
            });
        }
    }

    // معالجة تعديل الرسالة الرئيسية
    async handleEditMainMessage(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('edit_main_message_modal')
            .setTitle('تعديل الرسالة الرئيسية');

        const titleInput = new TextInputBuilder()
            .setCustomId('main_title')
            .setLabel('العنوان الجديد')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('main_description')
            .setLabel('الوصف الجديد')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);

        const colorInput = new TextInputBuilder()
            .setCustomId('main_color')
            .setLabel('اللون (رقم)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('3447003')
            .setPlaceholder('مثال: 3447003');

        const rows = [titleInput, descriptionInput, colorInput].map(
            input => new ActionRowBuilder().addComponents(input)
        );

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    }

    // معالجة إدارة الأقسام
    async handleDepartmentManagement(interaction) {
        try {
            const systemConfig = await this.applicationHandler.loadConfig();
            
            const embed = new EmbedBuilder()
                .setTitle('📋 إدارة الأقسام')
                .setDescription('اختر قسماً لإدارته بالكامل:')
                .setColor(config.COLORS.PRIMARY)
                .addFields(
                    Object.entries(systemConfig.departments).map(([key, dept]) => ({
                        name: `${dept.emoji} ${dept.name}`,
                        value: `الكود: \`${key}\`\nالأسئلة: ${dept.questions?.length || 0}\nقناة المراجعة: <#${dept.reviewChannel}>`,
                        inline: true
                    }))
                )
                .setTimestamp()
                .setFooter({ text: 'MT Community Applications' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('manage_department_select')
                .setPlaceholder('اختر قسماً لإدارته')
                .addOptions(
                    Object.entries(systemConfig.departments).map(([key, dept]) => ({
                        label: dept.name,
                        value: key,
                        description: `إدارة ${dept.name}`,
                        emoji: dept.emoji
                    }))
                );

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add_new_department')
                        .setLabel('إضافة قسم جديد')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('back_to_main_ahelp')
                        .setLabel('العودة للقائمة الرئيسية')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [row1, row2] });
        } catch (error) {
            console.error('Error in department management:', error);
            await interaction.reply({ 
                content: '❌ حدث خطأ في إدارة الأقسام', 
                ephemeral: true 
            });
        }
    }

    // معالجة إدارة قنوات المراجعة
    async handleEditReviewChannels(interaction, systemConfig) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📺 إدارة قنوات المراجعة')
                .setDescription('اختر القسم لتعديل قناة المراجعة الخاصة به:')
                .setColor(config.COLORS.PRIMARY);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('edit_review_channel_select')
                .setPlaceholder('اختر القسم')
                .addOptions(
                    Object.entries(systemConfig.departments).map(([key, dept]) => ({
                        label: dept.name,
                        value: `review_channel_${key}`,
                        description: `قناة المراجعة الحالية: ${dept.reviewChannel || 'غير محددة'}`,
                        emoji: dept.emoji || '📋'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const backButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_main_ahelp')
                        .setLabel('رجوع')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [row, backButton] });
        } catch (error) {
            console.error('Error in review channels management:', error);
            await interaction.reply({
                content: '❌ حدث خطأ في إدارة قنوات المراجعة',
                ephemeral: true
            });
        }
    }

    // معالجة إدارة رتب المراجعين
    async handleManageReviewerRoles(interaction, systemConfig) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('👥 إدارة رتب المراجعين')
                .setDescription('اختر عملية لإدارة رتب المراجعين:')
                .setColor(config.COLORS.PRIMARY)
                .addFields(
                    {
                        name: '🔍 الرتب الحالية',
                        value: systemConfig.reviewerRoles?.length > 0 
                            ? systemConfig.reviewerRoles.map(roleId => `<@&${roleId}>`).join('\n')
                            : 'لا توجد رتب مراجعين حالياً'
                    }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('add_reviewer_role')
                        .setLabel('إضافة رتبة')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('remove_reviewer_role')
                        .setLabel('حذف رتبة')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('➖'),
                    new ButtonBuilder()
                        .setCustomId('back_to_main_ahelp')
                        .setLabel('رجوع')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Error in reviewer roles management:', error);
            await interaction.reply({
                content: '❌ حدث خطأ في إدارة رتب المراجعين',
                ephemeral: true
            });
        }
    }

    // معالجة عرض البيانات الخام
    async handleShowRawData(interaction, systemConfig) {
        try {
            const configString = JSON.stringify(systemConfig, null, 2);
            if (configString.length > 1900) {
                const chunks = configString.match(/.{1,1900}/g);
                for (const chunk of chunks) {
                    await interaction.followUp({
                        content: '```json\n' + chunk + '\n```',
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: '```json\n' + configString + '\n```',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in showing raw data:', error);
            await interaction.reply({
                content: '❌ حدث خطأ في عرض البيانات',
                ephemeral: true
            });
        }
    }

    // معالجة تعديل الأسئلة
    async handleEditQuestions(interaction, systemConfig) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❓ إدارة أسئلة التقديم')
                .setDescription('اختر القسم لتعديل أسئلته:')
                .setColor(config.COLORS.PRIMARY);

            Object.entries(systemConfig.departments).forEach(([key, dept]) => {
                embed.addFields({
                    name: `${dept.emoji || '📋'} ${dept.name}`,
                    value: dept.questions?.length > 0
                        ? dept.questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')
                        : 'لا توجد أسئلة',
                    inline: false
                });
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('edit_questions_select')
                .setPlaceholder('اختر القسم')
                .addOptions(
                    Object.entries(systemConfig.departments).map(([key, dept]) => ({
                        label: dept.name,
                        value: `questions_${key}`,
                        description: `عدد الأسئلة: ${dept.questions?.length || 0}`,
                        emoji: dept.emoji || '📋'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            const backButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('back_to_main_ahelp')
                        .setLabel('رجوع')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔙')
                );

            await interaction.update({ embeds: [embed], components: [row, backButton] });
        } catch (error) {
            console.error('Error in questions management:', error);
            await interaction.reply({
                content: '❌ حدث خطأ في إدارة الأسئلة',
                ephemeral: true
            });
        }
    }

    // معالجة مودال النماذج
    async handleModal(interaction) {
        try {
            const modalId = interaction.customId;
            const fields = {};
            const errors = [];

            // جمع جميع الحقول من النموذج
            for (const [fieldId, field] of interaction.fields.fields) {
                const value = field.value;
                if (!InputValidator.isValidText(value)) {
                    errors.push(`الحقل "${fieldId}" غير صالح`);
                    continue;
                }
                fields[fieldId] = InputSanitizer.sanitizeText(value);
            }

            if (errors.length > 0) {
                await interaction.reply({
                    content: `❌ هناك أخطاء في النموذج:\n${errors.join('\n')}`,
                    ephemeral: true
                });
                return;
            }

            const systemConfig = await this.applicationHandler.loadConfig();
            if (!systemConfig) {
                await interaction.reply({
                    content: '❌ حدث خطأ في تحميل الإعدادات',
                    ephemeral: true
                });
                return;
            }

            switch (modalId) {
                case 'edit_main_message_modal':
                    await this.handleMainMessageEdit(interaction, fields, systemConfig);
                    break;
                case 'add_department_modal':
                    await this.handleAddDepartment(interaction, fields, systemConfig);
                    break;
                case 'edit_dept_modal':
                    await this.handleDepartmentEdit(interaction, fields, systemConfig);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ نوع النموذج غير معروف',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in modal handler:', error);
            await interaction.reply({
                content: '❌ حدث خطأ غير متوقع',
                ephemeral: true
            });
        }
    }

    // معالجة تعديل الرسالة الرئيسية
    async handleMainMessageEdit(interaction, fields, systemConfig) {
        try {
            const { main_title, main_description, main_color } = fields;
            const color = parseInt(main_color) || 3447003;

            systemConfig.mainMessage.title = main_title;
            systemConfig.mainMessage.description = main_description;
            systemConfig.mainMessage.color = color;

            const success = await this.applicationHandler.saveConfig(systemConfig);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ تم حفظ التغييرات')
                    .setDescription('تم تحديث الرسالة الرئيسية بنجاح.')
                    .setColor(config.COLORS.SUCCESS)
                    .addFields(
                        { name: 'العنوان الجديد', value: main_title, inline: true },
                        { name: 'الوصف الجديد', value: main_description, inline: true },
                        { name: 'اللون الجديد', value: color.toString(), inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'MT Community Applications' });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ 
                    content: '❌ حدث خطأ في حفظ التغييرات', 
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error('Error in main message edit:', error);
            await interaction.reply({
                content: '❌ حدث خطأ في تعديل الرسالة الرئيسية',
                ephemeral: true
            });
        }
    }
}

module.exports = new ApplicationHelpCommand();
