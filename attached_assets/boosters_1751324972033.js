const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { createEmbed } = require("../utils/embedBuilder");

module.exports = {
    data: {
        name: "boost",
        description: "Send the boosters message",
    },
    async execute(message, args, client) {
        try {
            const guild = message.guild;
            if (!guild) {
                return message.reply(
                    "This command can only be used in a server.",
                );
            }

            // Create the main startup embed
            const boosterEmbed = createEmbed(
                "MT Community - Boosters",
                "**شكراً لدعمك سيرفر MT Community !!**\n\n" +
                    "نرحب لك في مجتمعنا، ونود أن نُبرز لك القوانين والأنظمة التي يجب الإطلاع عليها لضمان تجربة ممتعة للجميع.\n" +
                    "يمكنك أيضاً اختيار رتب الإشعارات من القائمة أدناه .\n\n" +
                    "للحصول على فهم أعمق للمجتمع ، نوصيك بالضغط على زر **Guidelines** .",
                client.config.embedColor,
            );

            // Set server icon if available
            if (guild.iconURL()) {
                boosterEmbed.setThumbnail(
                    guild.iconURL({ dynamic: true, size: 256 }),
                );
            }

            // Create select menu for notification roles
            const selectMenub = new StringSelectMenuBuilder()
                .setCustomId("booster")
                .setPlaceholder("Select A Color . . .")
                .setMaxValues(1)
                .addOptions([
                    {
                        label: "SSF",
                        value: "ssf",
                    },
                    {
                        label: "CIA",
                        value: "cia",
                    },
                    {
                        label: "FBI",
                        value: "fbi",
                    },
                    {
                        label: "SWAT",
                        value: "swat",
                    },
                    {
                        label: "RAVENS",
                        value: "ravens",
                    },
                    {
                        label: "MARIENS",
                        value: "mariens",
                    },
                    {
                        label: "ANONYMOUS",
                        value: "anonymous",
                    },
                    {
                        label: "MTF",
                        value: "mtf",
                    },
                    {
                        label: "MUTCHADO",
                        value: "mutchado",
                    },
                    {
                        label: "MARIENS",
                        value: "mariens",
                    },
                    {
                        label: "LSPD",
                        value: "lspd",
                    },
                    {
                        label: "SOC",
                        value: "soc",
                    },
                ]);

            // Create buttons
            const Boosters = new ButtonBuilder()
                .setCustomId("remove_color")
                .setLabel("Remove Color")
                .setEmoji("1385203050792222812")
                .setStyle(ButtonStyle.Danger);

            // Create action rows
            const selectRowb = new ActionRowBuilder().addComponents(selectMenub);
            const buttonRowb = new ActionRowBuilder().addComponents(Boosters);

            // Get the configured poster messages channel
            const posterChannelId = client.config.channels.posterMessages;
            const posterChannel = guild.channels.cache.get(posterChannelId);
            
            if (posterChannel) {
                // Send the message to the configured channel
                await posterChannel.send({
                    embeds: [boosterEmbed],
                    components: [selectRowb, buttonRowb],
                });
            } else {
                // Fallback to current channel if configured channel not found
                await message.channel.send({
                    embeds: [boosterEmbed],
                    components: [selectRowb, buttonRowb],
                });
            }

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
