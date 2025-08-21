const { EmbedBuilder } = require('discord.js');

/**
 * Creates a standardized embed with the specified title, description, and color
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {string} color - The embed color (hex format)
 * @param {string|null} imageUrl - Optional image URL
 * @returns {EmbedBuilder} The constructed embed
 */
function createEmbed(title, description, color = '#2560df', imageUrl = null) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    return embed;
}

/**
 * Creates an error embed with standardized styling
 * @param {string} title - The error title
 * @param {string} description - The error description
 * @returns {EmbedBuilder} The constructed error embed
 */
function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setColor('#ff0000')
        .setTimestamp();
}

/**
 * Creates a success embed with standardized styling
 * @param {string} title - The success title
 * @param {string} description - The success description
 * @returns {EmbedBuilder} The constructed success embed
 */
function createSuccessEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setColor('#00ff00')
        .setTimestamp();
}

module.exports = {
    createEmbed,
    createErrorEmbed,
    createSuccessEmbed
};