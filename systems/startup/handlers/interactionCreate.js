const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Load system configuration
async function loadSystemConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام الستارتب:', error);
        return null;
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const config = await loadSystemConfig();
        if (!config) return;

        try {
            // ✅ Select Menu لرُتب الإشعارات
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'notification_roles') {
                    const addedRoles = [];
                    const removedRoles = [];

                    const member = interaction.member;
                    const guild = interaction.guild;

                    const selectedRoles = interaction.values; // مثل ['serverNotice', 'eventNotice']

                    for (const roleKey of selectedRoles) {
                        const roleId = config.roles[roleKey];
                        const role = guild.roles.cache.get(roleId);
                        if (!role) continue;

                        if (member.roles.cache.has(roleId)) {
                            // عنده الرتبة، نشيلها
                            await member.roles.remove(roleId);
                            removedRoles.push(role.name);
                        } else {
                            // ما عنده الرتبة، نعطيه
                            await member.roles.add(roleId);
                            addedRoles.push(role.name);
                        }
                    }

                    let replyMessage = '✅ تم تحديث رتب الإشعارات الخاصة بك:\n\n';

                    if (addedRoles.length > 0) {
                        replyMessage += `🟢 تم إعطاؤك: ${addedRoles.map(r => `\`${r}\``).join(', ')}\n`;
                    }

                    if (removedRoles.length > 0) {
                        replyMessage += `🔴 تم إزالة: ${removedRoles.map(r => `\`${r}\``).join(', ')}\n`;
                    }

                    if (addedRoles.length === 0 && removedRoles.length === 0) {
                        replyMessage = 'ℹ️ لم يتم تغيير أي شيء، أنت بالفعل تمتلك الإعدادات الصحيحة.';
                    }

                    await interaction.reply({
                        content: replyMessage,
                        flags: 64
                    });
                }
            }

            // ✅ أزرار القوانين ووسائل التواصل
            if (interaction.isButton()) {
                if (interaction.customId === 'guidelines') {
                    await interaction.reply({
                        content:
                            "📜 قوانين السيرفر العامة :\n\n" +
                            "1 - الاحترام أولاً وأخيرًا يمنع الإساءة أو الاستهزاء بأي عضو من الأعضاء او تقديم اي شكل من اشكال الاساءة له.❗\n" +
                            "2 - ممنوع النقاشات الدينية أو السياسية والطائفية ب اي شكل من الاشكال ونرجو عدم التطرق لمواضيع الدين أو السياسة. 🛑\n" +
                            "3 - ممنوع الاعلانات بدون اذن مسبق، يمنع الترويج لأي سيرفر، قناة، حساب، خارج اطار **MT** بدون إذن من الإدارة.🚫\n" +
                            "4 - السبام ممنوع، يمنع إرسال الرسائل المتكررة أو العشوائية أو المنشن المتكرر للآخرين (mention spam). ⛔\n" +
                            "5 - ممنوع استخدام اي قناة صوتية أو كتابية بغير الغرض المُنشأة لأجله. 📂\n" +
                            "6 - ممنوع نشر المحتوى غير اللائق (صور، فيديو، أو كلام غير مناسب). 🚫\n" +
                            "7 - احترام فريق الإدارة، وأي محاولة جدال أو تهرب من العقاب قد تؤدي للباند. 🛡️\n" +
                            "8 - عدم طلب أو نشر معلومات شخصية (أرقام، عناوين، أو بيانات خاصة). 🔒\n" +
                            "9 - التبليغ عن المخالفات يجب أن يكون للمشرفين، لا تتعامل مع المخالف بنفسك. 📣\n" +
                            "10 - القوانين قابلة للتحديث في أي وقت. 🔄\n\n" +
                            "**تحيات إدارة مجتمع البلدة الغامضة <:96MTC:>**",
                        flags: 64
                    });
                }

                if (interaction.customId === 'social_media') {
                    await interaction.reply({
                        content:
                            "🌐 مرحبًا بك في القسم الخاص بوسائل التواصل الاجتماعية لدى سيرفر البلدة الغامضة:\n\n" +
                            "<:MTC53:1209405918161408010> [Twitter](https://twitter.com/MT_FiveM)\n" +
                            "<:MTC53:1209405918161408010> [Discord](https://discord.gg/mt)\n" +
                            "<:MTC53:1209405918161408010> [YouTube](https://www.youtube.com/@MT_FiveM)\n" +
                            "<:MTC53:1209405918161408010> [Store](https://mtrp.store/)\n" +
                            "<:MTC53:1209405918161408010> [WhatsApp](https://mtrp.store/whatsapp/send)\n" +
                            "<:MTC53:1209405918161408010> [TikTok](https://www.tiktok.com/@mtrp.gg?_t=8p0KTBvMW3Q&_r=1)",
                        flags: 64
                    });
                } else if (interaction.customId === 'apply_applications') {
                    // التحقق من إعدادات التحكم في الزر
                    const startupConfig = require('../data/config.json');
                    if (!startupConfig.applyButtonEnabled) {
                        return interaction.reply({
                            content: '❌ نظام التقديمات معطل حالياً.',
                            ephemeral: true
                        });
                    }

                    // استدعاء نظام Applications
                    try {
                        const applicationConfig = require('../../applications/data/config.json');
                        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

                        const embed = new EmbedBuilder()
                            .setTitle(applicationConfig.mainMessage.title)
                            .setDescription(applicationConfig.mainMessage.description)
                            .setColor(applicationConfig.mainMessage.color)
                            .setTimestamp()
                            .setFooter({ text: 'MT Community' });

                        const row = new ActionRowBuilder();
                        for (const [key, dept] of Object.entries(applicationConfig.departments)) {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`apply_${key}`)
                                    .setLabel(dept.name)
                                    .setEmoji(dept.emoji)
                                    .setStyle(ButtonStyle.Primary)
                            );
                        }

                        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
                    } catch (error) {
                        console.error('Error loading applications system:', error);
                        await interaction.reply({
                            content: '❌ حدث خطأ في تحميل نظام التقديمات.',
                            ephemeral: true
                        });
                    }
                }
            }
        } catch (error) {
            console.error('خطأ في معالج التفاعل:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'حدث خطأ أثناء معالجة التفاعل', ephemeral: true });
            }
        }
    }
};