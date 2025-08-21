const { VotingHandler } = require('../handlers/votingHandler');

module.exports = {
    name: 'pblack',
    description: 'إضافة مستخدم إلى القائمة السوداء للتصويت',
    async execute(message, args, client) {
        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الأمر', flags: 64 });
        }

        if (args.length < 1) {
            return message.reply({ content: 'الاستخدام: `+pblack @user`', flags: 64 });
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
        const success = await votingHandler.blacklistUser(userId, client);

        if (success) {
            await message.reply({ content: 'تم إضافة المستخدم إلى القائمة السوداء وحذف تصويته', flags: 64 });
        } else {
            await message.reply({ content: 'حدث خطأ في إضافة المستخدم إلى القائمة السوداء', flags: 64 });
        }
    }
};