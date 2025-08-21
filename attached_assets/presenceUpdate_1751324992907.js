const { createEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'presenceUpdate',
    async execute(oldPresence, newPresence) {
        // Only process if this is a new presence or if activities changed
        if (!newPresence || !newPresence.member) return;
        
        const member = newPresence.member;
        const guild = newPresence.guild;
        const client = newPresence.client;
        const config = client.config;
        
        // Check if member has the live notice role
        const liveRoleId = config.roles.liveNotice;
        if (!liveRoleId || !member.roles.cache.has(liveRoleId)) return;
        
        // Get the live notifications channel
        const liveChannelId = config.channels.liveNotifications;
        if (!liveChannelId) return;
        
        const liveChannel = guild.channels.cache.get(liveChannelId);
        if (!liveChannel) return;
        
        // Check if user started streaming
        const oldStreaming = oldPresence?.activities?.some(activity => activity.type === 1) || false;
        const newStreaming = newPresence.activities?.some(activity => activity.type === 1) || false;
        
        // If user just started streaming
        if (!oldStreaming && newStreaming) {
            const streamingActivity = newPresence.activities.find(activity => activity.type === 1);
            
            if (streamingActivity) {
                try {
                    // Create live notification embed
                    const liveEmbed = createEmbed(
                        `🔴 ${member.displayName} is now live!`,
                        `**${streamingActivity.name || 'Unknown Game'}**\n\n` +
                        `${streamingActivity.details || 'No description available'}\n\n` +
                        `[Watch Stream](${streamingActivity.url || 'https://twitch.tv/' + member.displayName})`,
                        '#9146ff' // Twitch purple color
                    );
                    
                    // Set user avatar as thumbnail
                    if (member.displayAvatarURL()) {
                        liveEmbed.setThumbnail(member.displayAvatarURL({ dynamic: true, size: 256 }));
                    }
                    
                    // Add timestamp
                    liveEmbed.setTimestamp();
                    
                    // Mention the live notice role
                    const liveRole = guild.roles.cache.get(liveRoleId);
                    const mentionText = liveRole ? `<@&${liveRoleId}>` : '';
                    
                    await liveChannel.send({
                        content: mentionText,
                        embeds: [liveEmbed]
                    });
                    
                    console.log(`✓ Live notification sent for ${member.displayName}`);
                } catch (error) {
                    console.error('Error sending live notification:', error);
                }
            }
        }
    }
};