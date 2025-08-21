const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// تحميل إعدادات النظام
async function loadVotingConfig() {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطأ في تحميل إعدادات نظام التوقع:', error);
        return null;
    }
}

// حفظ إعدادات النظام
async function saveVotingConfig(config) {
    try {
        const configPath = path.join(__dirname, '../data/config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 4));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ إعدادات نظام التوقعات:', error);
        return false;
    }
}

class VotingHandler {
    constructor() {
        this.messageId = null;
        this.updateInterval = null;
    }

    async initializeVoting(client) {
        const config = await loadVotingConfig();
        if (!config) return;

        const channel = client.channels.cache.get(config.channel);
        if (!channel) {
            console.error('لم يتم العثور على قناة التوقعات');
            return;
        }

        // إرسال رسالة التصويت الأولى
        const embed = this.createVotingEmbed(config);
        const buttons = this.createVotingButtons(config);
        
        const message = await channel.send({ embeds: [embed], components: buttons });
        this.messageId = message.id;

        // بدء التحديث التلقائي
        this.startAutoUpdate(client, config);
    }

    createVotingEmbed(config) {
        // ترتيب الشخصيات حسب عدد الأصوات
        const sortedCharacters = Object.entries(config.characters)
            .sort(([,a], [,b]) => b.votes - a.votes);

        // حساب إجمالي الأصوات
        const totalVotes = Object.values(config.characters)
            .reduce((sum, char) => sum + char.votes, 0);

        let description = `**Total Guessers:** ${totalVotes}\n\n`;
        
        // إضافة المراكز
        sortedCharacters.forEach(([id, character], index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
            description += `${medal} **${character.name}** - ${character.votes} \n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('Police Chief Guessers Rankings')
            .setDescription(description)
            .setColor('#2560df')
            .setFooter({ text: 'MT Community' })
            .setTimestamp();

        if (config.winner) {
            embed.setTitle('Police Chief Results - Winner Announced!')
                .setDescription(`🏆 **Winner:** ${config.characters[config.winner].name}\n\n${description}`)
                .setColor('#FFD700');
        }

        return embed;
    }

    createVotingButtons(config) {
        if (!config.votingActive) {
            return [];
        }

        const buttons = [];
        const characters = Object.entries(config.characters);
        
        // تقسيم الأزرار إلى صفوف (5 أزرار لكل صف)
        for (let i = 0; i < characters.length; i += 5) {
            const row = new ActionRowBuilder();
            const rowButtons = characters.slice(i, i + 5);
            
            rowButtons.forEach(([id, character]) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`vote_${id}`)
                        .setLabel(character.name)
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            
            buttons.push(row);
        }

        return buttons;
    }

    async handleVoteButton(interaction, client) {
        const config = await loadVotingConfig();
        if (!config) {
            return await interaction.reply({ 
                content: 'خطأ في تحميل إعدادات التوقعات', 
                flags: 64 
            });
        }

        // التحقق من حالة التصويت
        if (!config.votingActive) {
            return await interaction.reply({ 
                content: 'التوقعات مغلقة حالياً', 
                flags: 64 
            });
        }

        // التحقق من الرتبة المطلوبة
        if (!interaction.member.roles.cache.has(config.requiredRole)) {
            return await interaction.reply({ 
                content: 'ليس لديك الرتبة المطلوبة للتوقع', 
                flags: 64 
            });
        }

        // التحقق من القائمة السوداء
        if (config.blacklistedUsers.includes(interaction.user.id)) {
            return await interaction.reply({ 
                content: 'لا يمكنك التوقع ، تم حظرك من التوقعات', 
                flags: 64 
            });
        }

        const characterId = interaction.customId.split('_')[1];
        const character = config.characters[characterId];
        
        if (!character) {
            return await interaction.reply({ 
                content: 'شخصية غير صالحة', 
                flags: 64 
            });
        }

        // التحقق من التصويت السابق
        const hasVoted = Object.values(config.characters)
            .some(char => char.voters.includes(interaction.user.id));

        if (hasVoted) {
            return await interaction.reply({ 
                content: 'لقد توقعت بالفعل لإحدى الشخصيات', 
                flags: 64 
            });
        }

        // إضافة التصويت
        character.votes++;
        character.voters.push(interaction.user.id);

        // حفظ التغييرات
        await saveVotingConfig(config);

        await interaction.reply({ 
            content: `تم تسجيل توقعك لـ **${character.name}**`, 
            flags: 64 
        });

        // تحديث الرسالة فوراً
        await this.updateVotingMessage(client, config);
    }

    async updateVotingMessage(client, config) {
        if (!this.messageId) return;

        const channel = client.channels.cache.get(config.channel);
        if (!channel) return;

        try {
            const message = await channel.messages.fetch(this.messageId);
            const embed = this.createVotingEmbed(config);
            const buttons = this.createVotingButtons(config);
            
            await message.edit({ embeds: [embed], components: buttons });
        } catch (error) {
            console.error('خطأ في تحديث رسالة التوقع:');
        }
    }

    startAutoUpdate(client, config) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(async () => {
            const currentConfig = await loadVotingConfig();
            if (currentConfig) {
                await this.updateVotingMessage(client, currentConfig);
            }
        }, config.updateInterval);
    }

    async declareWinner(winnerId, roleId, client) {
        const config = await loadVotingConfig();
        if (!config) return false;

        // تنظيف معرف الرتبة من التنسيق
        const cleanRoleId = roleId.replace(/<@&|>/g, '');
        
        config.winner = winnerId;
        config.winnerRole = cleanRoleId;
        config.votingActive = false;

        // إعطاء الرتبة لكل من صوت للفائز
        const winner = config.characters[winnerId];
        if (winner && winner.voters.length > 0) {
            // البحث عن السيرفر الصحيح
            let targetGuild = null;
            for (const guild of client.guilds.cache.values()) {
                if (guild.channels.cache.has(config.channel)) {
                    targetGuild = guild;
                    break;
                }
            }
            
            if (!targetGuild) {
                console.error('لم يتم العثور على السيرفر المناسب');
                return false;
            }

            const role = targetGuild.roles.cache.get(cleanRoleId);
            
            if (!role) {
                console.error(`لم يتم العثور على الرتبة: ${cleanRoleId}`);
                return false;
            }

            console.log(`[VOTING] بدء إعطاء الرتبة ${role.name} لـ ${winner.voters.length} متوقعين للفائز ${winner.name}`);
            
            let successCount = 0;
            for (const voterId of winner.voters) {
                try {
                    const member = await targetGuild.members.fetch(voterId);
                    if (member) {
                        await member.roles.add(role);
                        console.log(`[VOTING] تم إعطاء الرتبة للعضو: ${member.user.tag}`);
                        successCount++;
                    }
                } catch (error) {
                    console.error(`[VOTING] خطأ في إعطاء الرتبة للعضو ${voterId}:`, error);
                }
            }
            
            console.log(`[VOTING] تم إعطاء الرتبة بنجاح لـ ${successCount} من ${winner.voters.length} متوقعين`);
        } else {
            console.log(`[VOTING] لا يوجد متوقعون للشخصية الفائزة ${winnerId}`);
        }

        await saveVotingConfig(config);
        await this.updateVotingMessage(client, config);
        return true;
    }

    async removeUserVote(userId, client) {
        const config = await loadVotingConfig();
        if (!config) return false;

        let found = false;
        Object.values(config.characters).forEach(character => {
            const index = character.voters.indexOf(userId);
            if (index > -1) {
                character.voters.splice(index, 1);
                character.votes--;
                found = true;
            }
        });

        if (found) {
            await saveVotingConfig(config);
            await this.updateVotingMessage(client, config);
        }

        return found;
    }

    async blacklistUser(userId, client) {
        const config = await loadVotingConfig();
        if (!config) return false;

        if (!config.blacklistedUsers.includes(userId)) {
            config.blacklistedUsers.push(userId);
        }

        // إزالة تصويت المستخدم إذا كان موجوداً
        await this.removeUserVote(userId, client);
        
        await saveVotingConfig(config);
        return true;
    }
}

module.exports = { VotingHandler, loadVotingConfig, saveVotingConfig };