const { VotingHandler } = require('../handlers/votingHandler');

module.exports = {
    name: 'vote',
    description: 'بدء نظام التصويت',
    async execute(message, args, client) {
        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الأمر', flags: 64 });
        }

        const votingHandler = new VotingHandler();
        await votingHandler.initializeVoting(client);
        
        await message.reply({ content: 'تم بدء نظام التصويت بنجاح', flags: 64 });
    }
};