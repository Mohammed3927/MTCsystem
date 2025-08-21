const { VotingHandler } = require('../handlers/votingHandler');

module.exports = {
    name: 'winner',
    description: 'إعلان الفائز وإعطاء الرتب',
    async execute(message, args, client) {
        // التحقق من الصلاحيات
        if (!message.member.permissions.has('ADMINISTRATOR')) {
            return message.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الأمر', flags: 64 });
        }

        if (args.length < 2) {
            return message.reply({ content: 'الاستخدام: `+winner <character_id> <role_id>`', flags: 64 });
        }

        const characterId = args[0];
        const roleId = args[1];

        // التحقق من صحة معرف الشخصية
        if (!['1', '2', '3', '4', '5', '6'].includes(characterId)) {
            return message.reply({ content: 'معرف الشخصية يجب أن يكون من 1 إلى 6', flags: 64 });
        }

        const votingHandler = new VotingHandler();
        const success = await votingHandler.declareWinner(characterId, roleId, client);

        if (success) {
            await message.reply({ content: 'تم إعلان الفائز وإعطاء الرتب بنجاح', flags: 64 });
        } else {
            await message.reply({ content: 'حدث خطأ في إعلان الفائز', flags: 64 });
        }
    }
};