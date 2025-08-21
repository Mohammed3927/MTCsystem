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
        const configPath = path.join(__dirname, '../../startup/data/config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام البوستر:', error);
        return null;
    }
}

module.exports = {
    name: "boost",
    description: "Send the boosters message",
    // كونفق الرتب المخصصة
    boosterRoles: {
        "cia": "1386777184819089578",
        "fbi": "1386777213453729903",
        "swat": "1386777243539476571",
        "ravens": "1386777266985504848",
        "ssf": "1386777300124696576",
        "mariens": "1386777328373203084",
        "anonymous": "1386777392424423545",
        "mtf": "1386777499374981130",
        "mutchado": "1386777560205103114",
        "lspd": "1386699065894637709",
        "soc": "1386777727880663091"
    },

    boosterRolesList: [
        "1386777184819089578",
        "1386777213453729903",
        "1386777243539476571",
        "1386777266985504848",
        "1386777300124696576",
        "1386777328373203084",
        "1386777392424423545",
        "1386777499374981130",
        "1386777560205103114",
        "1386699065894637709",
        "1386777727880663091"
    ],

    async execute(message, args, client) {
        try {
            const guild = message.guild;
            if (!guild) {
                return await message.reply(
                    "This command can only be used in a server.",
                );
            }

            const systemConfig = await loadSystemConfig();
            if (!systemConfig) {
                return await message.reply("خطأ في تحميل إعدادات النظام.");
            }

            // Create the main startup embed
            const boosterEmbed = createEmbed(
                "MT Community - Boosters",
                "**شكراً لدعمك سيرفر MT Community !!**\n\n" +
                    "نرحب لك في مجتمعنا، ونود أن نُبرز لك القوانين والأنظمة التي يجب الإطلاع عليها لضمان تجربة ممتعة للجميع.\n" +
                    "يمكنك أيضاً اختيار رتب الإشعارات من القائمة أدناه .\n\n" +
                    "للحصول على فهم أعمق للمجتمع ، نوصيك بالضغط على زر **Guidelines** .",
                systemConfig.embedColor,
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
                .setEmoji({ id: "1385203050792222812" })
                .setStyle(ButtonStyle.Danger);

            // Create action rows
            const selectRowb = new ActionRowBuilder().addComponents(selectMenub);
            const buttonRowb = new ActionRowBuilder().addComponents(Boosters);

            // Get the configured poster messages channel
            const posterChannelId = "1382965316836921344";
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
            await message.reply(
                "An error occurred while executing the startup command.",
            );
        }
    },
};