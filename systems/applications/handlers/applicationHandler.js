const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../../config');
const { InputValidator, InputSanitizer } = require('../utils/inputHelpers');

class ApplicationHandler {
    constructor() {
        this.configPath = path.join(__dirname, '../data/config.json');
        this.applicationsPath = path.join(__dirname, '../data/applications.json');
        this.dataDir = path.join(__dirname, '../data');
        this.ensureDataDirectory();
    }

    // إنشاء المجلد إذا لم يكن موجوداً
    async ensureDataDirectory() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    // تحميل الإعدادات
    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                const defaultConfig = {
                    mainMessage: {
                        title: 'نظام التقديمات',
                        description: 'اختر القسم الذي تريد التقديم عليه',
                        color: 3447003
                    },
                    departments: {}
                };
                await this.saveConfig(defaultConfig);
                return defaultConfig;
            }
            console.error('خطأ في تحميل إعدادات نظام التقديمات:', error);
            return null;
        }
    }

    // حفظ الإعدادات
    async saveConfig(config) {
        try {
            await this.ensureDataDirectory();
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 4));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ إعدادات نظام التقديمات:', error);
            return false;
        }
    }

    // تحميل التقديمات
    async loadApplications() {
        try {
            const data = await fs.readFile(this.applicationsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.ensureDataDirectory();
                await fs.writeFile(this.applicationsPath, '[]');
                return [];
            }
            return [];
        }
    }

    // حفظ التقديمات
    async saveApplications(applications) {
        try {
            await this.ensureDataDirectory();
            await fs.writeFile(this.applicationsPath, JSON.stringify(applications, null, 2));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ التقديمات:', error);
            return false;
        }
    }

    // إنشاء معرف فريد
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // إنشاء Embed المراجعة
    createReviewEmbed(application, member, joinDate, deptConfig) {
        return new EmbedBuilder()
            .setTitle(`📝 تقديم جديد - ${deptConfig.name}`)
            .setColor(config.COLORS.PRIMARY)
            .addFields([
                { name: '👤 مقدم الطلب', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                { name: '📅 تاريخ الانضمام', value: joinDate, inline: true },
                { name: '📊 الحالة', value: '⏳ في انتظار المراجعة', inline: true }
            ])
            .addFields(
                application.answers.map((qa, index) => ({
                    name: `س${index + 1}: ${qa.question}`,
                    value: qa.answer || 'لا يوجد إجابة',
                    inline: false
                }))
            )
            .setTimestamp()
            .setFooter({ text: `معرف التقديم: ${application.id}` });
    }

    // إنشاء أزرار المراجعة
    createReviewButtons(applicationId) {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_application_${applicationId}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`reject_application_${applicationId}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`info_application_${applicationId}`)
                    .setLabel('معلومات إضافية')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );
    }

    // إرسال التقديم لقناة المراجعة
    async sendToReviewChannel(interaction, application, client, deptConfig) {
        try {
            const channel = await client.channels.fetch(deptConfig.reviewChannel);
            if (!channel) return false;

            const member = await interaction.guild.members.fetch(application.userId);
            const joinDate = new Date(member.joinedTimestamp).toLocaleString('en-US', { timeZone: 'UTC' });

            const embed = this.createReviewEmbed(application, member, joinDate, deptConfig);
            const buttons = this.createReviewButtons(application.id);

            await channel.send({ embeds: [embed], components: [buttons] });
            return true;
        } catch (error) {
            console.error('Error sending to review channel:', error);
            return false;
        }
    }

    // معالجة التقديم الجديد
    async handleNewApplication(interaction, departmentKey) {
        try {
            const systemConfig = await this.loadConfig();
            if (!systemConfig?.departments?.[departmentKey]) {
                throw new Error('القسم غير موجود');
            }

            const deptConfig = systemConfig.departments[departmentKey];
            const answers = [];
            const errors = [];

            // جمع وتحقق من الإجابات
            for (let i = 0; i < deptConfig.questions.length; i++) {
                try {
                    const answer = interaction.fields.getTextInputValue(`question_${i}`);
                    if (!InputValidator.isValidText(answer, { maxLength: 1000 })) {
                        errors.push(`الإجابة ${i + 1} غير صالحة`);
                        continue;
                    }
                    answers.push({
                        question: deptConfig.questions[i],
                        answer: InputSanitizer.sanitizeText(answer, { maxLength: 1000 })
                    });
                } catch (error) {
                    errors.push(`خطأ في السؤال ${i + 1}`);
                }
            }

            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }

            const application = {
                id: this.generateId(),
                userId: interaction.user.id,
                username: interaction.user.username,
                department: departmentKey,
                answers: answers,
                status: 'pending',
                createdAt: new Date().toLocaleString('en-US', { timeZone: 'UTC' })
            };

            const applications = await this.loadApplications();
            applications.push(application);
            await this.saveApplications(applications);

            const sent = await this.sendToReviewChannel(interaction, application, interaction.client, deptConfig);
            if (!sent) {
                throw new Error('فشل في إرسال التقديم لقناة المراجعة');
            }

            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = { ApplicationHandler };
