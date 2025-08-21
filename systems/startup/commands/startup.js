const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { createEmbed } = require("../../../utils/embedBuilder");
const fs = require('fs');
const path = require('path');

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
        name: "startup",
        description: "Send the startup welcome message with role selection",
    async execute(message, args, client) {
        try {
            const guild = message.guild;
            if (!guild) {
                return message.reply(
                    "This command can only be used in a server.",
                );
            }

            const systemConfig = await loadSystemConfig();
            if (!systemConfig) {
                return message.reply("خطأ في تحميل إعدادات النظام.");
            }

            // Create the main startup embed
            const startupEmbed = createEmbed(
                "MT Community - Startup",
                "**شكراً لانضمامك إلى سيرفر MT Community !!**\n\n" +
                    "نرحب لك في مجتمعنا، ونود أن نُبرز لك القوانين والأنظمة التي يجب الإطلاع عليها لضمان تجربة ممتعة للجميع.\n" +
                    "يمكنك أيضاً اختيار رتب الإشعارات من القائمة أدناه .\n\n" +
                    "للحصول على فهم أعمق للمجتمع ، نوصيك بالضغط على زر **Guidelines** .",
                systemConfig.embedColor,
            );

            // Set server icon if available
            if (guild.iconURL()) {
                startupEmbed.setThumbnail(
                    guild.iconURL({ dynamic: true, size: 256 }),
                );
            }

            // Create select menu for notification roles
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("notification_roles")
                .setPlaceholder("Select Notifications Roles . . .")
                .setMaxValues(9)
                .addOptions([
                    {
                        label: "Server Notice",
                        value: "serverNotice",
                        emoji: { id: systemConfig.emojis.serverNotice },
                    },
                    {
                        label: "Events Notice",
                        value: "eventsNotice",
                        emoji: { id: systemConfig.emojis.eventsNotice },
                    },
                    {
                        label: "Social Notice",
                        value: "socialNotice",
                        emoji: { id: systemConfig.emojis.socialNotice },
                    },
                    {
                        label: "Cinema Notice",
                        value: "cinemaNotice",
                        emoji: { id: systemConfig.emojis.cinemaNotice },
                    },
                    {
                        label: "Giveaway Notice",
                        value: "giveawayNotice",
                        emoji: { id: systemConfig.emojis.giveawayNotice },
                    },
                    {
                        label: "Games Notice",
                        value: "gamesNotice",
                        emoji: { id: systemConfig.emojis.gamesNotice },
                    },
                    {
                        label: "Football Notice",
                        value: "footballNotice",
                        emoji: { id: systemConfig.emojis.footballNotice },
                    },
                    {
                        label: "Live Notice",
                        value: "liveNotice",
                        emoji: { id: systemConfig.emojis.liveNotice },
                    },
                    {
                        label: "Ajr Notice",
                        value: "ajrNotice",
                        emoji: { id: systemConfig.emojis.ajrNotice },
                    },
                ]);

            // Create buttons
            const guidelinesButton = new ButtonBuilder()
                .setCustomId("guidelines")
                .setLabel("Guidelines")
                .setStyle(ButtonStyle.Danger);

            const socialMediaButton = new ButtonBuilder()
                .setCustomId("social_media")
                .setLabel("Social Media")
                .setStyle(ButtonStyle.Primary);

            // Create action rows
            const selectRow = new ActionRowBuilder().addComponents(selectMenu);
            const buttonRow = new ActionRowBuilder().addComponents(
                guidelinesButton,
                socialMediaButton,
            );

            // Send the message
            await message.channel.send({
                embeds: [startupEmbed],
                components: [selectRow, buttonRow],
            });

            // Delete the original command message
            if (message.deletable) {
                await message.delete();
            }
        } catch (error) {
            console.error("Error executing startup command:", error);
            message.reply(
                "An error occurred while executing the startup command.",
            );
        }
    },
};