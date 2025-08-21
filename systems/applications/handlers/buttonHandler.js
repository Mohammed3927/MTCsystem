
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
        console.error('خطأ في تحميل إعدادات نظام التقديمات:', error);
        return null;
    }
}

// تحميل التقديمات
async function loadApplications() {
    try {
        const applicationsPath = path.join(__dirname, '../data/applications.json');
        const data = await fs.readFile(applicationsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// حفظ التقديمات
async function saveApplications(applications) {
    try {
        const applicationsPath = path.join(__dirname, '../data/applications.json');
        await fs.writeFile(applicationsPath, JSON.stringify(applications, null, 2));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ التقديمات:', error);
        return false;
    }
}

class ApplicationsButtonHandler {
    async handle(interaction, client) {
        const customId = interaction.customId;

        // معالجة أزرار إدارة الأقسام
        if (customId.startsWith('edit_dept_')) {
            const parts = customId.split('_');
            const type = parts[2];
            const departmentKey = parts[3];
            await this.handleDepartmentEdit(interaction, type, departmentKey);
            return true;
        }

        // معالجة إضافة قسم جديد
        if (customId === 'add_new_department') {
            return await this.handleAddNewDepartment(interaction);
        }

        // معالجة حذف قسم
        if (customId.startsWith('delete_department_')) {
            const departmentKey = customId.split('_')[2];
            return await this.handleDeleteDepartment(interaction, departmentKey);
        }

        // معالجة تأكيد الحذف
        if (customId.startsWith('confirm_delete_')) {
            const parts = customId.split('_');
            if (parts.length === 4 && parts[2] === 'department') {
                // حذف قسم كامل
                const departmentKey = parts[3];
                return await this.handleConfirmDeleteDepartment(interaction, departmentKey);
            } else if (parts.length === 4) {
                // حذف سؤال
                const departmentKey = parts[2];
                const questionIndex = parseInt(parts[3]);
                return await this.handleConfirmDeleteQuestion(interaction, departmentKey, questionIndex);
            }
        }

        // معالجة إلغاء الحذف
        if (customId.startsWith('cancel_delete_')) {
            const departmentKey = customId.split('_')[2];
            const ahelp = require('../commands/ahelp.js');
            return await ahelp.handleDepartmentDetails(interaction, departmentKey);
        }

        // معالجة إدارة الأسئلة
        if (customId.startsWith('manage_dept_questions_')) {
            const departmentKey = customId.split('_')[3];
            const ahelp = require('../commands/ahelp.js');
            return await ahelp.handleQuestionsManagement(interaction, departmentKey);
        }

        // معالجة إضافة سؤال
        if (customId.startsWith('add_question_')) {
            const departmentKey = customId.split('_')[2];
            return await this.handleAddQuestion(interaction, departmentKey);
        }

        // معالجة تعديل سؤال
        if (customId.startsWith('edit_question_')) {
            const departmentKey = customId.split('_')[2];
            return await this.handleEditQuestion(interaction, departmentKey);
        }

        // معالجة حذف سؤال
        if (customId.startsWith('delete_question_')) {
            const departmentKey = customId.split('_')[2];
            return await this.handleDeleteQuestion(interaction, departmentKey);
        }

        // معالجة تعديل المراجعين
        if (customId.startsWith('edit_dept_reviewers_')) {
            const departmentKey = customId.split('_')[3];
            return await this.handleEditReviewers(interaction, departmentKey);
        }

        // معالجة أزرار العودة
        if (customId === 'back_to_departments') {
            const ahelp = require('../commands/ahelp.js');
            return await ahelp.handleDepartmentManagement(interaction);
        }

        if (customId === 'back_to_main_ahelp' || customId === 'back_to_ahelp') {
            const ahelp = require('../commands/ahelp.js');
            return await ahelp.execute({ reply: (content) => interaction.update(content) }, [], interaction.client);
        }

        if (customId.startsWith('back_to_dept_')) {
            const departmentKey = customId.split('_')[3];
            const ahelp = require('../commands/ahelp.js');
            return await ahelp.handleDepartmentDetails(interaction, departmentKey);
        }

        // معالجة أزرار التقديم
        if (customId.startsWith('apply_')) {
            return await this.handleApplicationButton(interaction);
        }

        // معالجة أزرار المراجعة
        if (customId.startsWith('review_')) {
            return await this.handleReviewButton(interaction, client);
        }

        return false;
    }

    async handleDepartmentEdit(interaction, type, departmentKey) {
        const systemConfig = await this.loadSystemConfig();
        const department = systemConfig.departments[departmentKey];

        if (!department) {
            return interaction.reply({ content: '❌ لم يتم العثور على القسم.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit_dept_modal_${type}_${departmentKey}`)
            .setTitle(`تعديل ${this.getTypeLabel(type)} القسم`);

        const textInput = new TextInputBuilder()
            .setCustomId(`dept_${type}_input`)
            .setLabel(this.getInputLabel(type))
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        // تعيين القيم الحالية
        switch (type) {
            case 'name':
                textInput.setValue(department.name || '');
                break;
            case 'emoji':
                textInput.setValue(department.emoji || '');
                break;
            case 'role':
                textInput.setValue(department.roleId || '');
                break;
            case 'channel':
                textInput.setValue(department.reviewChannel || '');
                break;
        }

        const row = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    async handleEditReviewers(interaction, departmentKey) {
        const systemConfig = await this.loadSystemConfig();
        const department = systemConfig.departments[departmentKey];

        if (!department) {
            return interaction.reply({ content: '❌ لم يتم العثور على القسم.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`edit_reviewers_modal_${departmentKey}`)
            .setTitle('تعديل رتب المراجعين');

        const currentReviewers = department.reviewRoles || [];
        const reviewersInput = new TextInputBuilder()
            .setCustomId('reviewers_input')
            .setLabel('معرفات الرتب (مفصولة بفاصلة)')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(currentReviewers.join(', '))
            .setPlaceholder('123456789, 987654321')
            .setRequired(false)
            .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(reviewersInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    async handleAddNewDepartment(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('add_department_modal')
            .setTitle('إضافة قسم جديد');

        const keyInput = new TextInputBuilder()
            .setCustomId('dept_key_input')
            .setLabel('مفتاح القسم (انجليزي بدون مسافات)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('مثال: support');

        const nameInput = new TextInputBuilder()
            .setCustomId('dept_name_input')
            .setLabel('اسم القسم')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('مثال: الدعم الفني');

        const emojiInput = new TextInputBuilder()
            .setCustomId('dept_emoji_input')
            .setLabel('إيموجي القسم')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('مثال: 🛠️');

        const roleInput = new TextInputBuilder()
            .setCustomId('dept_role_input')
            .setLabel('معرف الرتبة (Role ID)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('مثال: 123456789');

        const channelInput = new TextInputBuilder()
            .setCustomId('dept_channel_input')
            .setLabel('معرف قناة المراجعة (Channel ID)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('مثال: 987654321');

        const row1 = new ActionRowBuilder().addComponents(keyInput);
        const row2 = new ActionRowBuilder().addComponents(nameInput);
        const row3 = new ActionRowBuilder().addComponents(emojiInput);
        const row4 = new ActionRowBuilder().addComponents(roleInput);
        const row5 = new ActionRowBuilder().addComponents(channelInput);

        modal.addComponents(row1, row2, row3, row4, row5);
        await interaction.showModal(modal);
    }

    async handleDeleteDepartment(interaction, departmentKey) {
        const systemConfig = await this.loadSystemConfig();
        const department = systemConfig.departments[departmentKey];

        if (!department) {
            return interaction.reply({ content: '❌ لم يتم العثور على القسم.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('⚠️ تأكيد حذف القسم')
            .setDescription(`هل أنت متأكد من حذف القسم **${department.name}**؟\n\n**تحذير:** هذه العملية لا يمكن التراجع عنها وسيتم حذف جميع الأسئلة المرتبطة بهذا القسم.`)
            .setColor('#ff0000');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_delete_department_${departmentKey}`)
                    .setLabel('تأكيد الحذف')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId(`cancel_delete_${departmentKey}`)
                    .setLabel('إلغاء')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async handleConfirmDeleteDepartment(interaction, departmentKey) {
        const systemConfig = await this.loadSystemConfig();
        const departmentName = systemConfig.departments[departmentKey]?.name || 'غير محدد';

        delete systemConfig.departments[departmentKey];
        await this.saveSystemConfig(systemConfig);

        const embed = new EmbedBuilder()
            .setTitle('✅ تم حذف القسم')
            .setDescription(`تم حذف القسم **${departmentName}** بنجاح.`)
            .setColor('#00ff00');

        await interaction.update({ embeds: [embed], components: [] });

        // العودة لقائمة إدارة الأقسام بعد ثانية
        setTimeout(async () => {
            try {
                const ahelp = require('../commands/ahelp.js');
                await ahelp.handleDepartmentManagement(interaction);
            } catch (error) {
                console.log('تم حذف القسم بنجاح');
            }
        }, 1500);
    }

    async handleAddQuestion(interaction, departmentKey) {
        const modal = new ModalBuilder()
            .setCustomId(`add_question_modal_${departmentKey}`)
            .setTitle('إضافة سؤال جديد');

        const questionInput = new TextInputBuilder()
            .setCustomId('new_question_input')
            .setLabel('السؤال الجديد')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(200);

        const row = new ActionRowBuilder().addComponents(questionInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    async handleEditQuestion(interaction, departmentKey) {
        const systemConfig = await this.loadSystemConfig();
        const dept = systemConfig.departments[departmentKey];

        if (!dept || !dept.questions || dept.questions.length === 0) {
            return interaction.reply({ content: '❌ لا توجد أسئلة للتعديل!', ephemeral: true });
        }

        // إنشاء قائمة أسئلة للاختيار
        const questionsText = dept.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('📝 اختر السؤال للتعديل')
            .setDescription(questionsText)
            .setColor(config.COLORS.PRIMARY)
            .setFooter({ text: 'أرسل رقم السؤال الذي تريد تعديله' });

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // انتظار رد المستخدم
        const filter = m => m.author.id === interaction.user.id;
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 });
            const message = collected.first();
            const questionIndex = parseInt(message.content) - 1;

            if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= dept.questions.length) {
                return interaction.followUp({ content: '❌ رقم السؤال غير صالح!', ephemeral: true });
            }

            // إنشاء مودال لتعديل السؤال المحدد
            const modal = new ModalBuilder()
                .setCustomId(`edit_question_modal_${departmentKey}_${questionIndex}`)
                .setTitle(`تعديل السؤال رقم ${questionIndex + 1}`);

            const questionInput = new TextInputBuilder()
                .setCustomId('edited_question_input')
                .setLabel('السؤال المُحدث')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(dept.questions[questionIndex])
                .setRequired(true)
                .setMaxLength(200);

            const row = new ActionRowBuilder().addComponents(questionInput);
            modal.addComponents(row);

            await interaction.followUp({ content: 'سيتم عرض نموذج التعديل...' });
            // يجب إنشاء تفاعل جديد لعرض المودال
            
        } catch (error) {
            await interaction.followUp({ content: '❌ انتهت مهلة الانتظار!', ephemeral: true });
        }
    }

    async handleDeleteQuestion(interaction, departmentKey) {
        const systemConfig = await this.loadSystemConfig();
        const dept = systemConfig.departments[departmentKey];

        if (!dept || !dept.questions || dept.questions.length === 0) {
            return interaction.reply({ content: '❌ لا توجد أسئلة للحذف!', ephemeral: true });
        }

        // إنشاء قائمة أسئلة للاختيار
        const questionsText = dept.questions.map((q, i) => `**${i + 1}.** ${q}`).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('🗑️ اختر السؤال للحذف')
            .setDescription(questionsText)
            .setColor('#ff0000')
            .setFooter({ text: 'أرسل رقم السؤال الذي تريد حذفه' });

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // انتظار رد المستخدم
        const filter = m => m.author.id === interaction.user.id;
        try {
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 30000 });
            const message = collected.first();
            const questionIndex = parseInt(message.content) - 1;

            if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= dept.questions.length) {
                return interaction.followUp({ content: '❌ رقم السؤال غير صالح!', ephemeral: true });
            }

            await this.handleConfirmDeleteQuestion(interaction, departmentKey, questionIndex);
            
        } catch (error) {
            await interaction.followUp({ content: '❌ انتهت مهلة الانتظار!', ephemeral: true });
        }
    }

    async handleConfirmDeleteQuestion(interaction, departmentKey, questionIndex) {
        const systemConfig = await this.loadSystemConfig();
        const department = systemConfig.departments[departmentKey];

        if (!department || !department.questions || department.questions.length <= questionIndex) {
            return interaction.followUp({ content: '❌ لم يتم العثور على السؤال المراد حذفه.', ephemeral: true });
        }

        const questionText = department.questions[questionIndex];
        department.questions.splice(questionIndex, 1);
        await this.saveSystemConfig(systemConfig);

        const embed = new EmbedBuilder()
            .setTitle('✅ تم حذف السؤال')
            .setDescription(`تم حذف السؤال التالي من قسم **${department.name}**:\n\n**${questionText}**`)
            .setColor('#00ff00');

        await interaction.followUp({ embeds: [embed], ephemeral: true });
    }

    getTypeLabel(type) {
        const labels = {
            'name': 'اسم',
            'emoji': 'إيموجي',
            'role': 'رتبة',
            'channel': 'قناة'
        };
        return labels[type] || type;
    }

    getInputLabel(type) {
        const labels = {
            'name': 'الاسم الجديد',
            'emoji': 'الإيموجي الجديد',
            'role': 'معرف الرتبة الجديد',
            'channel': 'معرف القناة الجديد'
        };
        return labels[type] || `${type} جديد`;
    }

    async loadSystemConfig() {
        return await loadSystemConfig();
    }

    async saveSystemConfig(systemConfig) {
        try {
            const configPath = path.join(__dirname, '../data/config.json');
            await fs.writeFile(configPath, JSON.stringify(systemConfig, null, 4));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ إعدادات النظام:', error);
            return false;
        }
    }

    async handleApplicationButton(interaction) {
        const department = interaction.customId.replace('apply_', '');
        const systemConfig = await this.loadSystemConfig();

        if (!systemConfig || !systemConfig.departments[department]) {
            return await interaction.reply({ content: '❌ حدث خطأ في تحميل معلومات القسم.', ephemeral: true });
        }

        // التحقق من البلاك ليست
        const blacklist = await this.loadBlacklist();
        if (blacklist[department] && blacklist[department].includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ أنت محظور من التقديم على هذا القسم.',
                ephemeral: true
            });
        }

        // التحقق من وجود تقديم سابق
        const applications = await loadApplications();
        const existingApp = applications.find(app =>
            app.userId === interaction.user.id &&
            app.department === department &&
            app.status === 'pending'
        );

        if (existingApp) {
            return await interaction.reply({
                content: '❌ لديك تقديم معلق بالفعل على هذا القسم.',
                ephemeral: true
            });
        }

        // إنشاء المودال
        const modal = this.createApplicationModal(department, systemConfig.departments[department]);
        await interaction.showModal(modal);
        return true;
    }

    async loadBlacklist() {
        try {
            const blacklistPath = path.join(__dirname, '../data/blacklist.json');
            const data = await fs.readFile(blacklistPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    createApplicationModal(department, deptConfig) {
        const modal = new ModalBuilder()
            .setCustomId(`application_${department}`)
            .setTitle(`تقديم على ${deptConfig.name}`);

        const questions = deptConfig.questions.slice(0, 5);

        questions.forEach((question, index) => {
            const textInput = new TextInputBuilder()
                .setCustomId(`question_${index}`)
                .setLabel(question)
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(1000);

            const actionRow = new ActionRowBuilder().addComponents(textInput);
            modal.addComponents(actionRow);
        });

        return modal;
    }

    async handleReviewButton(interaction, client) {
        const [action, applicationId] = interaction.customId.replace('review_', '').split('_');

        const systemConfig = await this.loadSystemConfig();
        const applications = await loadApplications();

        const application = applications.find(app => app.id === applicationId);
        if (!application) {
            return await interaction.reply({ content: '❌ لم يتم العثور على التقديم.', ephemeral: true });
        }

        const deptConfig = systemConfig.departments[application.department];
        if (!deptConfig) {
            return await interaction.reply({ content: '❌ معلومات القسم غير متوفرة.', ephemeral: true });
        }

        // معالجة البلاك ليست
        if (action === 'blacklist') {
            return await this.handleBlacklistButton(interaction, application, client);
        }

        // التحقق من الصلاحيات
        const hasPermission = interaction.member.roles.cache.some(role =>
            deptConfig.reviewRoles.includes(role.id)
        ) || interaction.member.permissions.has('ADMINISTRATOR');

        if (!hasPermission) {
            return await interaction.reply({
                content: '❌ ليس لديك صلاحية لمراجعة هذا التقديم.',
                ephemeral: true
            });
        }

        // تحديث حالة التقديم
        application.status = action;
        application.reviewedBy = interaction.user.id;
        application.reviewedAt = new Date().toLocaleString("en-US", { timeZone: "UTC" });

        await saveApplications(applications);

        // تحديث الإيمبد
        await this.updateApplicationEmbed(interaction, application, action, systemConfig);

        // إعطاء الرتبة إذا تم القبول
        if (action === 'accept') {
            try {
                const guild = interaction.guild;
                const member = await guild.members.fetch(application.userId);
                const role = guild.roles.cache.get(deptConfig.roleId);

                if (role && member) {
                    await member.roles.add(role);
                }
            } catch (error) {
                console.error('خطأ في إعطاء الرتبة:', error);
            }
        }

        // إرسال رسالة خاصة للمتقدم
        await this.sendDMNotification(client, application, action, deptConfig);

        await interaction.reply({
            content: `✅ تم ${action === 'accept' ? 'قبول' : 'رفض'} التقديم بنجاح.`,
            ephemeral: true
        });

        return true;
    }

    async handleBlacklistButton(interaction, application, client) {
        try {
            const systemConfig = await loadSystemConfig();
            const deptConfig = systemConfig.departments[application.department];

            // التحقق من الصلاحيات
            const hasPermission = interaction.member.roles.cache.some(role =>
                deptConfig.reviewRoles.includes(role.id)
            ) || interaction.member.permissions.has('ADMINISTRATOR');

            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ ليس لديك صلاحية لإضافة المستخدمين للبلاك ليست لهذا القسم.',
                    ephemeral: true
                });
            }

            // إضافة المستخدم للبلاك ليست
            const blacklist = await this.loadBlacklist();
            if (!blacklist[application.department]) {
                blacklist[application.department] = [];
            }

            if (!blacklist[application.department].includes(application.userId)) {
                blacklist[application.department].push(application.userId);
                await this.saveBlacklist(blacklist);

                // تحديث حالة التقديم
                application.status = 'blacklisted';
                application.reviewedBy = interaction.user.id;
                application.reviewedAt = new Date().toLocaleString("en-US", { timeZone: "UTC" });

                const applications = await loadApplications();
                const appIndex = applications.findIndex(app => app.id === application.id);
                if (appIndex !== -1) {
                    applications[appIndex] = application;
                    await saveApplications(applications);
                }

                // تحديث الإيمبد
                const originalEmbed = interaction.message.embeds[0];
                const updatedEmbed = new EmbedBuilder()
                    .setTitle(originalEmbed.title)
                    .setDescription(originalEmbed.description + `\n\n**حالة التقديم:** 🚫 تم إضافة للبلاك ليست\n**تمت المراجعة بواسطة:** <@${application.reviewedBy}>`)
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ text: 'MT Community - تم إضافة للبلاك ليست' });

                if (originalEmbed.thumbnail) {
                    updatedEmbed.setThumbnail(originalEmbed.thumbnail.url);
                }

                if (originalEmbed.fields) {
                    originalEmbed.fields.forEach(field => {
                        updatedEmbed.addFields({ name: field.name, value: field.value, inline: field.inline });
                    });
                }

                await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

                // إرسال رسالة خاصة للمتقدم
                try {
                    const user = await client.users.fetch(application.userId);
                    await user.send(`تم إضافتك للبلاك ليست لقسم **${deptConfig.name}** في سيرفر MT Community. لن تتمكن من التقديم على هذا القسم مرة أخرى.`);
                } catch (dmError) {
                    console.log('لا يمكن إرسال رسالة خاصة للمستخدم');
                }

                await interaction.reply({
                    content: `✅ تم إضافة المستخدم للبلاك ليست لقسم ${deptConfig.name}.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ المستخدم موجود بالفعل في البلاك ليست لهذا القسم.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('خطأ في إضافة المستخدم للبلاك ليست:', error);
            await interaction.reply({ content: '❌ حدث خطأ في إضافة المستخدم للبلاك ليست.', ephemeral: true });
        }
    }

    async saveBlacklist(blacklist) {
        try {
            const blacklistPath = path.join(__dirname, '../data/blacklist.json');
            await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 2));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البلاك ليست:', error);
            return false;
        }
    }

    async updateApplicationEmbed(interaction, application, action, systemConfig) {
        const originalEmbed = interaction.message.embeds[0];
        const deptConfig = systemConfig.departments[application.department];

        const statusText = action === 'accept' ? '✅ تم القبول' : '❌ تم الرفض';
        const reviewerMention = `<@${application.reviewedBy}>`;

        const updatedEmbed = new EmbedBuilder()
            .setTitle(originalEmbed.title)
            .setDescription(originalEmbed.description + `\n\n**حالة التقديم:** ${statusText}\n**تمت المراجعة بواسطة:** ${reviewerMention}`)
            .setColor(action === 'accept' ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .setTimestamp()
            .setFooter({ text: 'MT Community - تمت المراجعة' });

        if (originalEmbed.thumbnail) {
            updatedEmbed.setThumbnail(originalEmbed.thumbnail.url);
        }

        if (originalEmbed.fields) {
            originalEmbed.fields.forEach(field => {
                updatedEmbed.addFields({ name: field.name, value: field.value, inline: field.inline });
            });
        }

        await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
    }

    async sendDMNotification(client, application, action, deptConfig) {
        try {
            const user = await client.users.fetch(application.userId);
            const statusText = action === 'accept' ? 'تم قبول' : 'تم رفض';
            const message = `${statusText} تقديمك على قسم **${deptConfig.name}** في سيرفر MT Community.`;

            await user.send(message);
        } catch (error) {
            console.error('خطأ في إرسال الرسالة الخاصة:', error);
        }
    }
}

module.exports = new ApplicationsButtonHandler();
