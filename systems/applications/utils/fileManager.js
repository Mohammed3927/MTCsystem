const fs = require('fs').promises;
const path = require('path');

class FileManager {
    constructor(baseDir) {
        this.paths = {
            data: path.join(baseDir, 'data'),
            config: path.join(baseDir, 'data', 'config.json'),
            applications: path.join(baseDir, 'data', 'applications.json'),
            blacklist: path.join(baseDir, 'data', 'blacklist.json')
        };
    }

    async ensureDirectory(dir) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async readJSON(filePath, defaultValue = null) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                if (defaultValue !== null) {
                    await this.writeJSON(filePath, defaultValue);
                    return defaultValue;
                }
            }
            console.error(`Error reading file ${filePath}:`, error);
            return defaultValue;
        }
    }

    async writeJSON(filePath, data) {
        try {
            await this.ensureDirectory(path.dirname(filePath));
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async backup(filePath) {
        try {
            const data = await this.readJSON(filePath);
            if (!data) return false;

            const backupPath = filePath.replace('.json', `.backup.${Date.now()}.json`);
            await this.writeJSON(backupPath, data);

            // حذف النسخ الاحتياطية القديمة (الاحتفاظ بآخر 5 نسخ)
            const dir = path.dirname(filePath);
            const base = path.basename(filePath, '.json');
            const files = await fs.readdir(dir);
            
            const backups = files
                .filter(f => f.startsWith(`${base}.backup.`))
                .sort()
                .reverse();

            for (const backup of backups.slice(5)) {
                await fs.unlink(path.join(dir, backup));
            }

            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }
}

module.exports = FileManager;
