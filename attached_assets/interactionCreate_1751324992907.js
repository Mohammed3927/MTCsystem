const { createEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

        try {
            if (interaction.customId === 'notification_roles') {
                await handleRoleSelection(interaction);
            } else if (interaction.customId === 'guidelines') {
                await handleGuidelinesButton(interaction);
            } else if (interaction.customId === 'social_media') {
                await handleSocialMediaButton(interaction);
            } else if (interaction.customId === 'booster') {
                await handleColorSelection(interaction);
            } else if (interaction.customId === 'remove_color') {
                await handleBoosters(interaction);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            
            const errorMessage = 'An error occurred while processing your request.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

async function handleRoleSelection(interaction) {
    const member = interaction.member;
    const guild = interaction.guild;
    const config = interaction.client.config;
    
    const addedRoles = [];
    const removedRoles = [];
    const failedRoles = [];

    for (const roleKey of interaction.values) {
        const roleId = config.roles[roleKey];
        
        if (!roleId) {
            failedRoles.push(roleKey);
            continue;
        }

        const role = guild.roles.cache.get(roleId);
        
        if (!role) {
            failedRoles.push(roleKey);
            continue;
        }

        try {
            if (member.roles.cache.has(roleId)) {
                // Remove role
                await member.roles.remove(role);
                removedRoles.push(role.name);
            } else {
                // Add role
                await member.roles.add(role);
                addedRoles.push(role.name);
            }
        } catch (error) {
            console.error(`Failed to manage role ${role.name}:`, error);
            failedRoles.push(role.name);
        }
    }

    // Build response message
    let responseMessage = '';
    
    if (addedRoles.length > 0) {
        responseMessage += `**Added roles:** ${addedRoles.join(', ')} ✅\n`;
    }
    
    if (removedRoles.length > 0) {
        responseMessage += `**Removed roles:** ${removedRoles.join(', ')} ❌\n`;
    }
    
    if (failedRoles.length > 0) {
        responseMessage += `**Failed to manage:** ${failedRoles.join(', ')} ⚠️`;
    }

    if (!responseMessage) {
        responseMessage = 'No roles were selected or an error occurred.';
    }

    await interaction.reply({
        content: responseMessage,
        flags: 64 // EPHEMERAL flag
    });
}

 async function handleColorSelection(interaction) {
     const memberc = interaction.member;
     const guildc = interaction.guild;
     const configc = interaction.client.config;

     const addedRolesc = [];
     const removedRolesc = [];
     const failedRolesc = [];

     for (const roleKeyc of interaction.values) {
         const roleIdc = configc.roles[roleKeyc];

         if (!roleIdc) {
             failedRolesc.push(roleKeyc);
             continue;
         }

         const rolec = guild.roles.cache.get(roleIdc);

         if (!rolec) {
             failedRolesc.push(roleKeyc);
             continue;
         }

         try {
             if (memberc.roles.cache.has(roleIdc)) {
                 // Remove role
                 await memberc.roles.remove(rolec);
                 removedRolesc.push(rolec.name);
             } else {
                 // Add role
                 await memberc.roles.add(rolec);
                 addedRolesc.push(rolec.name);
             }
         } catch (error) {
             console.error(`Failed to manage role ${rolec.name}:`, error);
             failedRolesc.push(rolec.name);
         }
     }

     // Build response message
     let responseMessage = '';

     if (addedRoles.length > 0) {
         responseMessage += `**Added roles:** ${addedRolesc.join(', ')} ✅\n`;
     }

     if (removedRoles.length > 0) {
         responseMessage += `**Removed roles:** ${removedRolesc.join(', ')} ❌\n`;
     }

     if (failedRoles.length > 0) {
         responseMessage += `**Failed to manage:** ${failedRolesc.join(', ')} ⚠️`;
     }

     if (!responseMessage) {
         responseMessage = 'No roles were selected or an error occurred.';
     }

     await interaction.reply({
         content: responseMessage,
         flags: 64 // EPHEMERAL flag
     });
 }

 async function handleBoosters(interaction) {
     const memberb = interaction.member;
     const guildb = interaction.guild;
     const configb = interaction.client.config;

     const roleb = configb.booster_roles.map(roleId => guild.roles.cache.get(roleId)).filter
     const removedRolesb = [];
     const failedRolesb = [];
     
     memberb.roles.remove(roleb);
      removedRolesb.push(roleb.name);

     // Build response message
     let responseMessage = '';

     if (removedRolesb.length > 0) {
         responseMessage += `**Removed roles:** ${removedRolesb.join(', ')} ❌\n`;
     }

     if (failedRolesb.length > 0) {
         responseMessage += `**Failed to manage:** ${failedRolesb.join(', ')} ⚠️`;
     }

     if (!responseMessage) {
         responseMessage = 'No roles were selected or an error occurred.';
     }

     await interaction.reply({
         content: responseMessage,
         flags: 64 // EPHEMERAL flag
     });
 }

async function handleGuidelinesButton(interaction) {
    const guild = interaction.guild;
    const config = interaction.client.config;

    const guidelinesEmbed = createEmbed(
        'MT Community - Guidelines',
        '📋 **قوانين السيرفر العامة :**\n\n' +
        '1 - الاحترام أولاً وأخيرًا يمنع الإساءة أو الاستهزاء بأي عضو من الأعضاء او تقديم اي شكل من اشكال الاساءة له .❗\n\n' +
        '2 - ممنوع النقاشات الدينية أو السياسية والطائفية ب اي شكل من الاشكال  ونرجو عدم التطرق لمواضيع الدين أو السياسة . 🛑\n\n' +
        '3 - ممنوع الاعلانات بدون اذن مسبق  يمنع الترويج لأي سيرفر ، قناة ، حساب ، خارج اطار **MT** بدون إذن من الإدارة .🚫\n\n' +
        '4 - السبام ممنوع يمنع إرسال الرسائل المتكررة أو العشوائية أو المنشن المتكرر للآخرين ( mention spam ) . ⛔\n\n' +
        '5 - ممنوع استخدام اي قناة صوتيه او كتابية ب غير الغرض المُنشأة لأجله ، كل قناة لها غرض محدد . الرجاء الالتزام بموضوع كل قناة . 📂\n\n' +
        '6 - ممنوع نشر المحتوى غير اللائق ، يشمل ذلك الصور أو الفيديوهات أو الكلام غير المناسب ( عنيف ، أو مهين او إباحي ) . 🚫\n\n' +
        '7 - احترام فريق الإدارة قرارات المشرفين والإدارة بشكل كامل ، أي محاولة جدال أو تهرب من العقاب قد يؤدي للباند .🛡️\n\n' +
        '8 - عدم طلب معلومات شخصية بتفاصيلها حفاظاً على الخصوصية ، يمنع نشر أرقام هواتف ، عناوين ، أو أي معلومات شخصية .🔒\n\n' +
        '9 - التبليغ عن المخالفات إذا لاحظت سلوكًا غير لائق ، بلّغ عنه لأحد المشرفين بدلًا من التعامل معه بنفسك.📣\n\n' +
        '10 - القوانين قابلة للتحديث في أي وقت  يرجى مراجعة القوانين بشكل دوري للتأكد من الالتزام بالتحديثات . 🔄\n\n' +
        '** تحيات إدارة مجتمع البلدة الغامضة :96MTC:  **',
        config.embedColor
    );

    // Set server icon if available
    if (guild.iconURL()) {
        guidelinesEmbed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
    }

    await interaction.reply({
        embeds: [guidelinesEmbed],
        flags: 64 // EPHEMERAL flag
    });
}

async function handleSocialMediaButton(interaction) {
    const guild = interaction.guild;
    const config = interaction.client.config;

    const socialMediaEmbed = createEmbed(
        'MT Community - Social Media',
        'مرحبًا بك في القسم الخاص بوسائل التواصل الاجتماعية لدى سيرفر البلدة الغامضة ، في حال أردت الذهاب الى منصه معينه يمكنك الضغط على الأزرار ادناه ؛\n\n' +
        '<:MTC53:1209405918161408010> [Twitter](https://twitter.com/MT_FiveM)\n' +
        '<:MTC53:1209405918161408010> [Discord](https://discord.gg/mt)\n' +
        '<:MTC53:1209405918161408010> [YouTube](https://www.youtube.com/@MT_FiveM)\n' +
        '<:MTC53:1209405918161408010> [Store](https://mtrp.store/)\n' +
        '<:MTC53:1209405918161408010> [WhatsApp](https://mtrp.store/whatsapp/send)\n' +
        '<:MTC53:1209405918161408010> [TikTok](https://www.tiktok.com/@mtrp.gg?_t=8p0KTBvMW3Q&_r=1)',
        config.embedColor
    );

    // Set server icon if available
    if (guild.iconURL()) {
        socialMediaEmbed.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }));
    }

    await interaction.reply({
        embeds: [socialMediaEmbed],
        flags: 64 // EPHEMERAL flag
    });
}
