
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

// الحصول على معلومات النظام
function getSystemInfo(systemName) {
    const systemsInfo = {
        APPLICATIONS: {
            name: 'نظام التقديمات',
            description: 'إدارة طلبات الانضمام للفرق',
            commands: ['apply', 'ahelp', 'areset', 'unblack'],
            emoji: '📋'
        },
        TICKETS: {
            name: 'نظام التذاكر',
            description: 'إدارة التذاكر والدعم الفني',
            commands: ['ticket', 'thelp', 'tpoints', 'treset'],
            emoji: '🎫'
        },
        COINS: {
            name: 'نظام العملات',
            description: 'إدارة العملات المالية الافتراضية',
            commands: ['coins', 'coinAdmin'],
            emoji: '💰'
        },
        STORE: {
            name: 'نظام المتجر',
            description: 'متجر لشراء العناصر بالعملات',
            commands: ['store', 'aitem', 'ritem'],
            emoji: '🛒'
        },
        POINTS: {
            name: 'نظام النقاط',
            description: 'إدارة نقاط الأعضاء والتقييمات',
            commands: ['points', 'phelp', 'preset'],
            emoji: '🏆'
        },
        STARTUP: {
            name: 'نظام الستارتب',
            description: 'إدارة رسائل البداية والترحيب',
            commands: ['startup'],
            emoji: '🚀'
        },
        BOOSTER: {
            name: 'نظام البوستر',
            description: 'إدارة مزايا معززي السيرفر',
            commands: ['boost'],
            emoji: '⭐'
        },
        AI: {
            name: 'نظام الذكاء الاصطناعي',
            description: 'دردشة ذكية مع البوت',
            commands: ['ai'],
            emoji: '🤖'
        },
        VOTING: {
            name: 'نظام التصويت',
            description: 'إدارة التصويتات والاستطلاعات',
            commands: ['vote', 'vhelp', 'vreset', 'winner', 'rem', 'pblack'],
            emoji: '🗳️'
        }
    };

    return systemsInfo[systemName] || null;
}

// حفظ إعدادات النظام إلى config.js
async function saveSystemToggle(systemName, enabled) {
    try {
        const configPath = path.join(__dirname, '../config.js');
        let configContent = await fs.readFile(configPath, 'utf8');
        
        // تحديث حالة النظام في الملف
        const regex = new RegExp(`(${systemName}:\\s*)(true|false)`, 'g');
        configContent = configContent.replace(regex, `$1${enabled}`);
        
        await fs.writeFile(configPath, configContent);
        
        // تحديث الكونفيق في الذاكرة
        config.SYSTEMS[systemName] = enabled;
        
        return true;
    } catch (error) {
        console.error('خطأ في حفظ إعدادات النظام:', error);
        return false;
    }
}

module.exports = {
    name: 'toggle',
    description: 'إدارة تفعيل وإلغاء تفعيل الأنظمة',
    async execute(message, args, client) {
        // فحص الصلاحيات - الأدمن ستريتر فقط
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: '❌ هذا الأمر مخصص للإدارة العليا فقط.', flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔄 إدارة الأنظمة')
            .setDescription('اختر النظام الذي تريد إدارته من القائمة أدناه:')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: '📊 إحصائيات سريعة', value: this.getSystemsStats(), inline: false },
                { name: '⚠️ تنبيه', value: 'تعطيل النظام سيؤثر على جميع الأوامر والوظائف المرتبطة به.', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Systems Management' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('system_toggle_select')
            .setPlaceholder('اختر نظام لعرض تفاصيله وإدارته...')
            .addOptions(
                Object.entries(config.SYSTEMS).map(([key, enabled]) => {
                    const systemInfo = getSystemInfo(key);
                    return {
                        label: systemInfo ? systemInfo.name : key,
                        value: key,
                        description: `${enabled ? '🟢 مفعل' : '🔴 معطل'} - ${systemInfo ? systemInfo.description : 'وصف غير متوفر'}`,
                        emoji: systemInfo ? systemInfo.emoji : '⚙️'
                    };
                })
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.reply({ embeds: [embed], components: [row] });
    },

    getSystemsStats() {
        const total = Object.keys(config.SYSTEMS).length;
        const enabled = Object.values(config.SYSTEMS).filter(status => status).length;
        const disabled = total - enabled;
        
        return `**المجموع:** ${total} أنظمة\n**مفعل:** 🟢 ${enabled}\n**معطل:** 🔴 ${disabled}`;
    },

    async handleSelectMenu(interaction) {
        const selectedSystem = interaction.values[0];
        const systemInfo = getSystemInfo(selectedSystem);
        const isEnabled = config.SYSTEMS[selectedSystem];

        if (!systemInfo) {
            return await interaction.reply({ content: '❌ نظام غير صالح.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${systemInfo.emoji} ${systemInfo.name}`)
            .setDescription(systemInfo.description)
            .setColor(isEnabled ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .addFields(
                { name: '📊 الحالة الحالية', value: isEnabled ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: '🔧 عدد الأوامر', value: systemInfo.commands.length.toString(), inline: true },
                { name: '📝 الأوامر المتاحة', value: systemInfo.commands.map(cmd => `\`+${cmd}\``).join(', '), inline: false }
            )
            .setTimestamp();

        const toggleButton = new ButtonBuilder()
            .setCustomId(`toggle_system_${selectedSystem}_${!isEnabled}`)
            .setLabel(isEnabled ? 'إلغاء التفعيل' : 'تفعيل النظام')
            .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(isEnabled ? '🔴' : '🟢');

        const backButton = new ButtonBuilder()
            .setCustomId('back_to_systems_list')
            .setLabel('العودة للقائمة')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙');

        const helpButton = new ButtonBuilder()
            .setCustomId(`system_help_${selectedSystem}`)
            .setLabel('مساعدة النظام')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('❓')
            .setDisabled(!isEnabled); // تعطيل زر المساعدة إذا كان النظام معطل

        const row = new ActionRowBuilder().addComponents(toggleButton, helpButton, backButton);
        
        await interaction.update({ embeds: [embed], components: [row] });
    },

    async handleSystemToggle(interaction, systemName, newStatus) {
        const systemInfo = getSystemInfo(systemName);
        
        if (!systemInfo) {
            return await interaction.reply({ content: '❌ نظام غير صالح.', ephemeral: true });
        }

        // محاولة حفظ الإعدادات الجديدة
        const saved = await saveSystemToggle(systemName, newStatus);
        
        if (!saved) {
            return await interaction.reply({ 
                content: '❌ حدث خطأ في حفظ إعدادات النظام.', 
                ephemeral: true 
            });
        }

        const statusText = newStatus ? 'تم تفعيل' : 'تم إلغاء تفعيل';
        const statusEmoji = newStatus ? '🟢' : '🔴';

        const embed = new EmbedBuilder()
            .setTitle(`✅ ${statusText} النظام بنجاح`)
            .setDescription(`${statusEmoji} **${systemInfo.name}** ${statusText}`)
            .setColor(newStatus ? config.COLORS.SUCCESS : config.COLORS.ERROR)
            .addFields(
                { name: 'الحالة الجديدة', value: newStatus ? '🟢 مفعل' : '🔴 معطل', inline: true },
                { name: 'الأوامر المتأثرة', value: systemInfo.commands.map(cmd => `\`+${cmd}\``).join(', '), inline: false }
            )
            .setTimestamp();

        if (!newStatus) {
            embed.addFields({ 
                name: '⚠️ تنبيه', 
                value: 'جميع أوامر ووظائف هذا النظام معطلة الآن.', 
                inline: false 
            });
        }

        const backButton = new ButtonBuilder()
            .setCustomId('back_to_systems_list')
            .setLabel('العودة للقائمة')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙');

        const viewSystemButton = new ButtonBuilder()
            .setCustomId(`view_system_${systemName}`)
            .setLabel('عرض تفاصيل النظام')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📋');

        const row = new ActionRowBuilder().addComponents(viewSystemButton, backButton);
        
        await interaction.update({ embeds: [embed], components: [row] });
    },

    async handleSystemHelp(interaction, systemName) {
        // توجيه المستخدم لأمر المساعدة المناسب للنظام
        const helpCommands = {
            APPLICATIONS: 'ahelp',
            TICKETS: 'thelp', 
            POINTS: 'phelp',
            VOTING: 'vhelp'
        };

        const helpCommand = helpCommands[systemName];
        
        if (helpCommand) {
            await interaction.reply({ 
                content: `📖 لإدارة هذا النظام بالتفصيل، استخدم الأمر: \`+${helpCommand}\``, 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ لا توجد مساعدة متقدمة متاحة لهذا النظام حالياً.', 
                ephemeral: true 
            });
        }
    },

    async handleBackToSystemsList(interaction) {
        // العودة للقائمة الرئيسية
        const embed = new EmbedBuilder()
            .setTitle('🔄 إدارة الأنظمة')
            .setDescription('اختر النظام الذي تريد إدارته من القائمة أدناه:')
            .setColor(config.COLORS.PRIMARY)
            .addFields(
                { name: '📊 إحصائيات سريعة', value: this.getSystemsStats(), inline: false },
                { name: '⚠️ تنبيه', value: 'تعطيل النظام سيؤثر على جميع الأوامر والوظائف المرتبطة به.', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'MT Community Systems Management' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('system_toggle_select')
            .setPlaceholder('اختر نظام لعرض تفاصيله وإدارته...')
            .addOptions(
                Object.entries(config.SYSTEMS).map(([key, enabled]) => {
                    const systemInfo = getSystemInfo(key);
                    return {
                        label: systemInfo ? systemInfo.name : key,
                        value: key,
                        description: `${enabled ? '🟢 مفعل' : '🔴 معطل'} - ${systemInfo ? systemInfo.description : 'وصف غير متوفر'}`,
                        emoji: systemInfo ? systemInfo.emoji : '⚙️'
                    };
                })
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.update({ embeds: [embed], components: [row] });
    }
};
