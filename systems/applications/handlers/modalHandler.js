const { ApplicationHandler } = require('./applicationHandler');

class ApplicationModalHandler {
    constructor() {
        this.applicationHandler = new ApplicationHandler();
    }

    async handle(interaction, client) {
        try {
            if (!interaction.customId.startsWith('application_')) {
                return false;
            }

            const departmentKey = interaction.customId.replace('application_', '');
            await this.applicationHandler.handleNewApplication(interaction, departmentKey);

            await interaction.reply({
                content: '✅ تم إرسال تقديمك بنجاح! سيتم مراجعته قريباً.',
                ephemeral: true
            });

            return true;
        } catch (error) {
            console.error('Error in application modal handler:', error);
            await interaction.reply({
                content: `❌ حدث خطأ: ${error.message}`,
                ephemeral: true
            });
            return true;
        }
    }

    // وظائف مساعدة للوصول إلى ApplicationHandler
    async loadSystemConfig() {
        return await this.applicationHandler.loadConfig();
    }

    async saveSystemConfig(config) {
        return await this.applicationHandler.saveConfig(config);
    }
}

module.exports = new ApplicationModalHandler();
