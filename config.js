module.exports = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || 'anythingwithtoken',
    PREFIX: '+',

    // System toggles - تفعيل/إلغاء تفعيل الأنظمة
    SYSTEMS: {
        APPLICATIONS: true,     // نظام التقديمات
        TICKETS: true,          // نظام التذاكر  
        COINS: false,           // نظام العملات
        STORE: false,           // نظام المتجر
        POINTS: true,           // نظام النقاط
        STARTUP: true,          // نظام الستارتب
        BOOSTER: true,          // نظام البوستر
        AI: false,               // نظام الذكاء الاصطناعي
        VOTING: true            // نظام التصويت
    },

    // Global settings
    COLORS: {
        PRIMARY: 0x3498db,
        SUCCESS: 0x2ecc71,
        ERROR: 0xe74c3c,
        WARNING: 0xf39c12
    }
};
