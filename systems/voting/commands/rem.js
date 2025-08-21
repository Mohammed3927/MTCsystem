const { VotingHandler } = require('../handlers/votingHandler');

module.exports = {
    name: 'rem',
    description: 'حذف تصويت مستخدم معين',
    async execute(message, args, client) {
        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الأمر', flags: 64 });
        }

        if (args.length < 1) {
            return message.reply({ content: 'الاستخدام: `+rem @user`', flags: 64 });
        }

        // استخراج معرف المستخدم من المنشن
        let userId;
        if (message.mentions.users.size > 0) {
            userId = message.mentions.users.first().id;
        } else {
            // محاولة استخراج المعرف مباشرة
            userId = args[0].replace(/[<@!>]/g, '');
        }

        const votingHandler = new VotingHandler();
        const success = await votingHandler.removeUserVote(userId, client);

        if (success) {
            await message.reply({ content: 'تم حذف تصويت المستخدم بنجاح', flags: 64 });
        } else {
            await message.reply({ content: 'لم يتم العثور على تصويت لهذا المستخدم', flags: 64 });
        }
    }
};