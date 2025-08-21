// إضافة polyfill لحل مشكلة ReadableStream
if (typeof global.ReadableStream === 'undefined') {
    global.ReadableStream = require('stream/web').ReadableStream;
}
if (typeof global.WritableStream === 'undefined') {
    global.WritableStream = require('stream/web').WritableStream;
}
if (typeof global.TransformStream === 'undefined') {
    global.TransformStream = require('stream/web').TransformStream;
}

const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// إنشاء عميل Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

// إعداد مجموعة الأوامر
client.commands = new Collection();

// نظام الحماية من التنفيذ المتكرر
const executionTracker = new Map();
const sentMessages = new Map();

// تحميل الأوامر من جميع الأنظمة
function loadCommands() {
    const systemsPaths = [
        { path: './systems/applications/commands', enabled: config.SYSTEMS.APPLICATIONS },
        { path: './systems/tickets/commands', enabled: config.SYSTEMS.TICKETS },
        { path: './systems/coins/commands', enabled: config.SYSTEMS.COINS },
        { path: './systems/store/commands', enabled: config.SYSTEMS.STORE },
        { path: './systems/points/commands', enabled: config.SYSTEMS.POINTS },
        { path: './systems/voting/commands', enabled: config.SYSTEMS.VOTING },
        { path: './systems/startup/commands', enabled: config.SYSTEMS.STARTUP },
        { path: './systems/booster/commands', enabled: config.SYSTEMS.BOOSTER },
        { path: './commands', enabled: true } // الأوامر العامة
    ];

    systemsPaths.forEach(({ path: systemPath, enabled }) => {
        if (!enabled) return;

        const fullPath = path.join(__dirname, systemPath);
        if (!fs.existsSync(fullPath)) return;

        const commandFiles = fs.readdirSync(fullPath).filter(file => file.endsWith('.js'));

        commandFiles.forEach(file => {
            const filePath = path.join(fullPath, file);
            try {
                const command = require(filePath);

            if (command.name) {
                client.commands.set(command.name, command);
                console.log(`تم تحميل الأمر: ${command.name}`);
            } else {
                console.warn(`⚠️ لم يتم تحميل الأمر من ملف ${file} , لا يحتوي على خاصية name`);
            }
            } catch (error) {
                console.error(`❌ فشل تحويل الأمر من الملف ${file} - السبب :`, error.message);
            }
        });
    });
}

// تحميل المعالجات
let applicationsButtonHandler, applicationsModalHandler;
let storeHandler;
let coinsHandler, coinsButtonHandler, coinsAdminButtonHandler;
let pointsHandler;
let startupInteractionHandler, startupMessageHandler, startupPresenceHandler;

// تحميل معالجات التطبيقات
if (config.SYSTEMS.APPLICATIONS) {
    try {
        applicationsButtonHandler = require('./systems/applications/handlers/buttonHandler');
        applicationsModalHandler = require('./systems/applications/handlers/modalHandler');
        console.log('تم تحميل معالجات نظام التطبيقات');
    } catch (error) {
        console.error('خطأ في تحميل معالجات التطبيقات:', error);
    }
}

// تحميل معالجات المتجر
if (config.SYSTEMS.STORE) {
    try {
        storeHandler = require('./systems/store/handlers/storeHandler');
        console.log('تم تحميل معالج المتجر');
    } catch (error) {
        console.error('خطأ في تحميل معالج المتجر:', error);
    }
}

// تحميل معالجات العملات
if (config.SYSTEMS.COINS) {
    try {
        coinsHandler = require('./systems/coins/handlers/coinsHandler');
        coinsButtonHandler = require('./systems/coins/handlers/coinsButtonHandler');
        console.log('تم تحميل معالجات نظام العملات');
    } catch (error) {
        console.error('خطأ في تحميل معالجات العملات:', error);
    }
}

// تحميل معالجات التذاكر
let ticketHandler, ticketManagementHandler, ticketsButtonHandler, ticketsModalHandler;
if (config.SYSTEMS.TICKETS) {
    try {
        const { TicketHandler } = require('./systems/tickets/handlers/ticketHandler');
        ticketHandler = new TicketHandler();
        ticketManagementHandler = require('./systems/tickets/handlers/ticketManagementHandler');
        ticketsButtonHandler = require('./systems/tickets/handlers/buttonHandler');
        ticketsModalHandler = require('./systems/tickets/handlers/modalHandler');
        console.log('تم تحميل معالجات نظام التذاكر');
    } catch (error) {
        console.error('خطأ في تحميل معالجات التذاكر:', error);
    }
}

// تحميل معالجات النقاط
if (config.SYSTEMS.POINTS) {
    try {
        const PointsHandler = require('./systems/points/handlers/pointsHandler');
        pointsHandler = new PointsHandler();
        console.log('تم تحميل معالج نظام النقاط');
    } catch (error) {
        console.error('خطأ في تحميل معالج النقاط:', error);
    }
}

// تحميل معالجات الـ booster
let boosterInteractionHandler;
if (config.SYSTEMS.BOOSTER) {
    try {
        boosterInteractionHandler = require('./systems/booster/handler/interactionCreate');
        console.log('تم تحميل معالج البوستر');
    } catch (error) {
        console.log('خطأ في تحميل معالج البوستر', error);
    }
}

// تحميل معالجات الستارتب
if (config.SYSTEMS.STARTUP) {
    try {
        startupInteractionHandler = require('./systems/startup/handlers/interactionCreate');
        startupMessageHandler = require('./systems/startup/handlers/messageCreate');
        startupPresenceHandler = require('./systems/startup/handlers/presenceUpdate');
        console.log('تم تحميل معالجات نظام الستارتب');
    } catch (error) {
        console.error('خطأ في تحميل معالجات الستارتب:', error);
    }
}

// تحميل معالج الذكاء الاصطناعي
let aiHandler;
if (config.SYSTEMS.AI) {
    try {
        aiHandler = require('./systems/ai/handlers/aiHandler');
        console.log('تم تحميل معالج نظام الذكاء الاصطناعي');
    } catch (error) {
        console.error('خطأ في تحميل معالج الذكاء الاصطناعي:', error);
    }
}

// تحميل معالج التصويت
let votingHandler;
if (config.SYSTEMS.VOTING) {
    try {
        const { VotingHandler } = require('./systems/voting/handlers/votingHandler');
        votingHandler = new VotingHandler();
        console.log('تم تحميل معالج نظام التصويت');
    } catch (error) {
        console.error('خطأ في تحميل معالج التصويت:', error);
    }
}

// تحميل الأوامر عند بدء التشغيل
loadCommands();

// حدث جاهزية البوت
client.once(Events.ClientReady, () => {
    console.log(`Bot ready: ${client.user.tag}`);
    client.user.setActivity('MT Community', { type: 'WATCHING' });
});

// معالج الرسائل
client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    // معالجة نظام الذكاء الاصطناعي
    if (config.SYSTEMS.AI && aiHandler) {
        try {
            await aiHandler.handleMessage(message);
        } catch (error) {
            console.error('خطأ في معالج الذكاء الاصطناعي:', error);
        }
    }

    // معالجة نظام الستارتب (العد والرسائل المخصصة)
    if (config.SYSTEMS.STARTUP && startupMessageHandler) {
        try {
            await startupMessageHandler.execute(message);
        } catch (error) {
            console.error('خطأ في معالج رسائل الستارتب:', error);
        }
    }

    // معالجة أوامر العملات بدون برفيكس
    if (config.SYSTEMS.COINS && coinsHandler && !message.content.startsWith(config.PREFIX)) {
        const handled = await coinsHandler.handleCoinsCommand(message, client);
        if (handled) return;
        return;
    }

    // معالجة الأوامر مع البرفيكس
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // معالجة أوامر النقاط
    if (config.SYSTEMS.POINTS && pointsHandler && commandName === 'points') {
        await pointsHandler.handlePointsCommand(message, args, client);
        return;
    }

    const command = client.commands.get(commandName);

    if (!command) return;

    // نظام الحماية من التنفيذ المتكرر
    const executionKey = `${message.author.id}_${commandName}_${message.id}`;

    if (executionTracker.has(executionKey)) {
        console.log(`[PROTECTION] Blocked duplicate execution of ${commandName} by ${message.author.tag}`);
        return;
    }

    // تسجيل التنفيذ
    executionTracker.set(executionKey, Date.now());

    // تنظيف التسجيلات القديمة (أكثر من 5 ثواني)
    setTimeout(() => {
        executionTracker.delete(executionKey);
    }, 5000);

    try {
        console.log(`[COMMAND] Executing ${commandName} by ${message.author.tag}`);
        await command.execute(message, args, client);
    } catch (error) {
        console.error('خطأ في تنفيذ الأمر:', error);
        try {
            await message.reply('حدث خطأ أثناء تنفيذ الأمر.');
        } catch (replyError) {
            console.error('خطأ في إرسال رسالة الخطأ:', replyError);
        }
    }
});

// معالج التفاعلات
client.on(Events.InteractionCreate, async interaction => {
    try {
        // معالجة تفاعلات نظام الستارتب والبوستر
        if (config.SYSTEMS.STARTUP && startupInteractionHandler && (
            interaction.customId === 'notification_roles' ||
            interaction.customId === 'guidelines' ||
            interaction.customId === 'social_media' ||
            interaction.customId === 'booster' ||
            interaction.customId === 'remove_color'
        )) {
            await startupInteractionHandler.execute(interaction);
            return;
        }

        if (interaction.isButton()) {
            // معالجة أزرار التذاكر
            if (config.SYSTEMS.TICKETS && interaction.customId.startsWith('ticket_')) {
                await handleTicketButtons(interaction, client);
                return;
            }

            // معالجة أزرار إدارة التذاكر
            if (config.SYSTEMS.TICKETS && ticketsButtonHandler && interaction.customId === 'ticket_manage_btn') {
                const handled = await ticketsButtonHandler.handle(interaction, client);
                if (handled) return;
            }

            // معالجة أزرار العملات
            if (config.SYSTEMS.COINS && coinsButtonHandler && (
                interaction.customId.startsWith('verify_transfer_') ||
                interaction.customId.startsWith('top_') ||
                interaction.customId.startsWith('bank_') ||
                interaction.customId.startsWith('pay_tax_') ||
                interaction.customId.startsWith('confirm_delete_bank_') ||
                interaction.customId === 'cancel_delete_bank' ||
                interaction.customId === 'cancel_transfer' ||
                interaction.customId === 'confirm_reset_coins' ||
                interaction.customId === 'cancel_reset_coins'
            )) {
                await coinsButtonHandler.handleCoinsButton(interaction, client);
                return;
            }

            // معالجة أزرار التصويت
            if (config.SYSTEMS.VOTING && votingHandler && interaction.customId.startsWith('vote_')) {
                await votingHandler.handleVoteButton(interaction, client);
                return;
            }

            // معالجة أزرار إعادة التعيين
            if (interaction.customId.startsWith('confirm_areset_')) {
                const [, , department, userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                const aresetCommand = client.commands.get('areset');
                if (aresetCommand) {
                    await aresetCommand.handleResetConfirmation(interaction, department);
                }
                return;
            }

            if (interaction.customId.startsWith('cancel_areset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                await interaction.update({ content: '❌ تم إلغاء العملية', embeds: [], components: [] });
                return;
            }

            if (interaction.customId.startsWith('confirm_vreset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                const vresetCommand = client.commands.get('vreset');
                if (vresetCommand) {
                    await vresetCommand.handleResetConfirmation(interaction);
                }
                return;
            }

            if (interaction.customId.startsWith('cancel_vreset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                await interaction.update({ content: '❌ تم إلغاء العملية', embeds: [], components: [] });
                return;
            }

            if (interaction.customId.startsWith('confirm_treset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                const tresetCommand = client.commands.get('treset');
                if (tresetCommand) {
                    await tresetCommand.handleResetConfirmation(interaction);
                }
                return;
            }

            if (interaction.customId.startsWith('cancel_treset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                await interaction.update({ content: '❌ تم إلغاء العملية', embeds: [], components: [] });
                return;
            }

            if (interaction.customId.startsWith('confirm_preset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                const presetCommand = client.commands.get('preset');
                if (presetCommand) {
                    await presetCommand.handleResetConfirmation(interaction);
                }
                return;
            }

            if (interaction.customId.startsWith('cancel_preset_')) {
                const [, , userId] = interaction.customId.split('_');
                if (interaction.user.id !== userId) {
                    return await interaction.reply({ content: '❌ لا يمكنك استخدام هذا الزر', flags: 64 });
                }
                await interaction.update({ content: '❌ تم إلغاء العملية', embeds: [], components: [] });
                return;
            }

            // معالجة أزرار التطبيقات
            if (config.SYSTEMS.APPLICATIONS && applicationsButtonHandler) {
                try {
                    const handled = await applicationsButtonHandler.handle(interaction, client);
                    if (handled) return;
                } catch (error) {
                    console.error('خطأ في معالجة زر التطبيقات:', error);
                    try {
                        await interaction.reply({ content: '❌ حدث خطأ في معالجة هذا الزر.', ephemeral: true });
                    } catch (e) {
                        console.error('خطأ في إرسال رسالة الخطأ:', e);
                    }
                }
            }

            // معالجة أزرار إدارة التذاكر العامة
            if (config.SYSTEMS.TICKETS && ticketsButtonHandler) {
                const handled = await ticketsButtonHandler.handle(interaction, client);
                if (handled) return;
            }

            // معالجة أزرار نظام التقديمات
            if (interaction.customId.startsWith('applications_') ||
                interaction.customId.startsWith('edit_dept_') ||
                interaction.customId.startsWith('add_question_') ||
                interaction.customId.startsWith('edit_question_') ||
                interaction.customId.startsWith('delete_question_') ||
                interaction.customId.startsWith('manage_dept_questions_') ||
                interaction.customId === 'back_to_departments' ||
                interaction.customId === 'back_to_ahelp' ||
                interaction.customId === 'back_to_main_ahelp') {

                const ahelp = require('./systems/applications/commands/ahelp.js');
                await ahelp.handleButtonInteraction(interaction);
                return;
            }
        }
        else if (interaction.isModalSubmit()) {
            // معالجة نماذج التذاكر
            if (config.SYSTEMS.TICKETS && ticketsModalHandler && (
                interaction.customId.includes('ticket') ||
                interaction.customId.includes('user') ||
                interaction.customId.includes('rename')
            )) {
                const handled = await ticketsModalHandler.handle(interaction, client);
                if (handled) return;
            }

            // معالجة نماذج التطبيقات
            if (config.SYSTEMS.APPLICATIONS && applicationsModalHandler) {
                const handled = await applicationsModalHandler.handle(interaction, client);
                if (handled) return;
            }

            // معالجة نماذج أنظمة المساعدة
            if (interaction.customId === 'edit_main_message_modal' ||
                interaction.customId.startsWith('edit_dept_modal_') ||
                interaction.customId.startsWith('add_question_modal_') ||
                interaction.customId.startsWith('edit_question_modal_') ||
                interaction.customId === 'add_department_modal' ||
                interaction.customId.startsWith('edit_reviewers_modal_')) {

                const ahelpCommand = client.commands.get('ahelp');
                if (ahelpCommand && ahelpCommand.handleModal) {
                    await ahelpCommand.handleModal(interaction);
                }
                return;
            }

            if (interaction.customId === 'edit_voting_channel_modal' || interaction.customId === 'edit_voting_role_modal') {
                const vhelpCommand = client.commands.get('vhelp');
                if (vhelpCommand && vhelpCommand.handleModal) {
                    await vhelpCommand.handleModal(interaction);
                }
                return;
            }

            // معالجة نماذج التذاكر
            if (interaction.customId === 'edit_tickets_category_modal' ||
                interaction.customId === 'edit_tickets_log_channel_modal' ||
                interaction.customId === 'edit_tickets_claim_delay_modal') {
                const thelpCommand = client.commands.get('thelp');
                if (thelpCommand && thelpCommand.handleModal) {
                    await thelpCommand.handleModal(interaction);
                }
                return;
            }

            // معالجة نماذج النقاط
            if (interaction.customId === 'edit_points_log_channel_modal' ||
                interaction.customId === 'edit_points_colors_modal') {
                const phelpCommand = client.commands.get('phelp');
                if (phelpCommand && phelpCommand.handleModal) {
                    await phelpCommand.handleModal(interaction);
                }
                return;
            }
        }
        else if (interaction.isStringSelectMenu()) {
            // معالجة قوائم المتجر
            if (config.SYSTEMS.STORE && storeHandler && interaction.customId === 'store_select') {
                await storeHandler.handleStorePurchase(interaction, client);
                return;
            }

            // معالجة قوائم التذاكر
            if (config.SYSTEMS.TICKETS) {
                if (interaction.customId === 'ticket_select' && ticketHandler) {
                    await ticketHandler.handleTicketSelect(interaction, client);
                    return;
                }
                else if (interaction.customId === 'ticket_manage' && ticketManagementHandler) {
                    await ticketManagementHandler.handleTicketManagement(interaction, client);
                    return;
                }
                else if (interaction.customId === 'channel_permissions_select' && ticketManagementHandler) {
                    await ticketManagementHandler.handleChannelPermissions(interaction);
                    return;
                }
            }

            // معالجة قوائم الأنظمة المساعدة
            if (interaction.customId === 'applications_help_select' ||
                interaction.customId === 'manage_department_select' ||
                interaction.customId.startsWith('select_question_')) {
                const ahelp = require('./systems/applications/commands/ahelp.js');
                await ahelp.handleSelectMenu(interaction);
                return;
            }

            if (interaction.customId === 'voting_help_select') {
                const vhelpCommand = client.commands.get('vhelp');
                if (vhelpCommand && vhelpCommand.handleSelectMenu) {
                    await vhelpCommand.handleSelectMenu(interaction);
                }
                return;
            }

            if (interaction.customId === 'tickets_help_select') {
                const thelpCommand = client.commands.get('thelp');
                if (thelpCommand && thelpCommand.handleSelectMenu) {
                    await thelpCommand.handleSelectMenu(interaction);
                }
                return;
            }

            if (interaction.customId === 'points_help_select') {
                const phelpCommand = client.commands.get('phelp');
                if (phelpCommand && phelpCommand.handleSelectMenu) {
                    await phelpCommand.handleSelectMenu(interaction);
                }
                return;
            }

            // معالجة القوائم المتداخلة للتذاكر
            if (interaction.customId === 'manage_ticket_type_select' ||
                interaction.customId === 'manage_ticket_roles_select') {
                const thelpCommand = client.commands.get('thelp');
                if (thelpCommand && thelpCommand.handleSelectMenu) {
                    await thelpCommand.handleSelectMenu(interaction);
                }
                return;
            }

            // معالجة القوائم المتداخلة للنقاط
            if (interaction.customId === 'points_permissions_select' ||
                interaction.customId === 'points_auto_settings_select') {
                const phelpCommand = client.commands.get('phelp');
                if (phelpCommand && phelpCommand.handleSelectMenu) {
                    await phelpCommand.handleSelectMenu(interaction);
                }
                return;
            }

            // معالجة القوائم المتداخلة للتطبيقات
            if (interaction.customId === 'department_edit_select' ||
                interaction.customId === 'edit_review_channel_select' ||
                interaction.customId === 'manage_reviewer_roles_select' ||
                interaction.customId === 'edit_questions_select') {
                const ahelpCommand = client.commands.get('ahelp');
                if (ahelpCommand && ahelpCommand.handleSelectMenu) {
                    await ahelpCommand.handleSelectMenu(interaction);
                }
                return;
            }
        }
    } catch (error) {
        console.error('خطأ في معالجة التفاعل:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'حدث خطأ أثناء معالجة التفاعل.', ephemeral: true });
            } else if (interaction.deferred) {
                await interaction.editReply({ content: 'حدث خطأ أثناء معالجة التفاعل.' });
            }
        } catch (e) {
            console.error('خطأ في إرسال رسالة الخطأ:', e);
        }
    }
});

// معالج تحديث حالة الحضور (للايف)
client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
    if (config.SYSTEMS.STARTUP && startupPresenceHandler) {
        try {
            await startupPresenceHandler.execute(oldPresence, newPresence);
        } catch (error) {
            console.error('خطأ في معالج تحديث الحضور:', error);
        }
    }
});

// معالجات التذاكر
async function handleTicketButtons(interaction, client) {
    if (interaction.customId === 'ticket_claim' && ticketHandler) {
        await ticketHandler.handleTicketClaim(interaction);
    } else if (interaction.customId === 'ticket_close' && ticketHandler) {
        await ticketHandler.handleTicketClose(interaction);
    } else if (interaction.customId === 'ticket_unclaim') {
    await ticketHandler.handleTicketUnclaim(interaction);
    }
}

// معالج الأخطاء
client.on('error', error => console.error('Discord error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

// تسجيل الدخول
client.login(process.env.DISCORD_TOKEN || config.DISCORD_TOKEN);