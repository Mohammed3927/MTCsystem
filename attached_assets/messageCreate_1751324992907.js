module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        const { prefix, channels } = message.client.config;
        
        // Check if this is the counting channel
        if (channels.countingChannel && message.channel.id === channels.countingChannel) {
            await handleCountingMessage(message);
            return;
        }
        
        // Check if message starts with prefix
        if (!message.content.startsWith(prefix)) return;

        // Parse command and arguments
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Get command from collection
        const command = message.client.commands.get(commandName);
        
        if (!command) return;

        try {
            // Execute command
            command.execute(message, args, message.client);
        } catch (error) {
            console.error('Error executing command:', error);
            message.reply('There was an error executing this command.');
        }
    }
};

async function handleCountingMessage(message) {
    try {
        // Check if the message is a valid number
        const messageNumber = parseInt(message.content.trim());
        
        if (isNaN(messageNumber)) {
            // If it's not a number, delete it
            await message.delete();
            console.log(`Deleted non-number message: "${message.content}" by ${message.author.tag}`);
            return;
        }

        // Find the last valid number in the channel
        const lastValidNumber = await findLastValidNumber(message.channel, message.id);
        
        // Check if the current number is exactly +1 from the last valid number
        if (messageNumber === lastValidNumber + 1) {
            // Add green checkmark reaction
            await message.react('✅');
            console.log(`Correct count: ${messageNumber} by ${message.author.tag}`);
        } else {
            // Delete the message if it's not the correct next number
            await message.delete();
            console.log(`Deleted incorrect count: ${messageNumber} (expected ${lastValidNumber + 1}) by ${message.author.tag}`);
        }
    } catch (error) {
        console.error('Error handling counting message:', error);
        // If there's an error, try to delete the message to be safe
        try {
            await message.delete();
        } catch (deleteError) {
            console.error('Error deleting message after error:', deleteError);
        }
    }
}

async function findLastValidNumber(channel, currentMessageId) {
    try {
        let lastNumber = 0;
        let lastMessageId = currentMessageId;
        
        // Fetch messages before the current message
        for (let i = 0; i < 10; i++) { // Limit to prevent infinite loops
            const messages = await channel.messages.fetch({ 
                limit: 50, 
                before: lastMessageId 
            });
            
            if (messages.size === 0) break;
            
            // Look through messages from newest to oldest
            for (const [messageId, msg] of messages) {
                // Skip bot messages
                if (msg.author.bot) continue;
                
                const number = parseInt(msg.content.trim());
                if (!isNaN(number)) {
                    console.log(`Found last valid number: ${number}`);
                    return number;
                }
                
                lastMessageId = messageId;
            }
        }
        
        console.log(`No valid number found, starting from 0`);
        return 0;
    } catch (error) {
        console.error('Error finding last valid number:', error);
        return 0;
    }
}
