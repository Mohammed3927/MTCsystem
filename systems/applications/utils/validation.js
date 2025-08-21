// التحقق من صحة الإدخال
function validateInput(input, type = 'text', options = {}) {
    if (typeof input !== 'string') return false;
    
    // التحقق من الطول
    if (input.length === 0) return false;
    if (options.maxLength && input.length > options.maxLength) return false;
    if (options.minLength && input.length < options.minLength) return false;

    // التحقق من نوع الإدخال
    switch (type) {
        case 'roleId':
            return /^\d{17,20}$/.test(input.replace(/[<@&>]/g, ''));
        case 'channelId':
            return /^\d{17,20}$/.test(input.replace(/[<#>]/g, ''));
        case 'emoji':
            // يقبل الإيموجي العادي والمخصص
            return /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])|<a?:.+?:\d{17,20}>/.test(input);
        case 'text':
        default:
            return true;
    }
}

// تنظيف الإدخال
function sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') return '';
    
    input = input.trim();
    
    switch (type) {
        case 'roleId':
            return input.replace(/[<@&>]/g, '');
        case 'channelId':
            return input.replace(/[<#>]/g, '');
        case 'emoji':
            // للإيموجي المخصص، نحتفظ بالمعرف فقط
            const customEmojiMatch = input.match(/<a?:(.+?):(\d{17,20})>/);
            if (customEmojiMatch) {
                return customEmojiMatch[0];
            }
            return input;
        case 'text':
        default:
            // إزالة المحارف الخاصة التي قد تسبب مشاكل
            return input.replace(/[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF,.-]/gi, '');
    }
}

module.exports = {
    validateInput,
    sanitizeInput
};
