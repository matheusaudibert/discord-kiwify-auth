import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recriando __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BINDINGS_PATH = path.join(__dirname, 'bindings.json');

export async function showEmailModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('email_modal')
    .setTitle('Verificação de E-mail');

  const emailInput = new TextInputBuilder()
    .setCustomId('email_input')
    .setLabel("Digite seu e-mail de inscrição")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(emailInput);

  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}

export async function verifyEmailSubmission(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const email = interaction.fields.getTextInputValue('email_input');
  const csvPath = path.join(__dirname, 'emails.csv');

  try {
    const data = fs.readFileSync(csvPath, 'utf8');

    const emails = data.split('\n').map(line => line.trim());

    if (emails.includes(email)) {
      let bindings = {};
      if (fs.existsSync(BINDINGS_PATH)) {
        bindings = JSON.parse(fs.readFileSync(BINDINGS_PATH, 'utf8'));
      }

      if (bindings[email] && bindings[email] !== interaction.user.id) {
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        const text = new TextDisplayBuilder().setContent('Este e-mail já está vinculado a outra conta do Discord.');
        container.addTextDisplayComponents(text);

        await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
        return;
      }

      bindings[email] = interaction.user.id;
      fs.writeFileSync(BINDINGS_PATH, JSON.stringify(bindings, null, 2));

      const member = interaction.member;
      const roleToRemove = process.env.ROLE_TO_REMOVE_ID;
      const roleToAdd = process.env.ROLE_TO_ADD_ID;
      const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

      await member.roles.remove(roleToRemove).catch(console.error);
      await member.roles.add(roleToAdd).catch(console.error);

      const welcomeChannel = interaction.guild.channels.cache.get(welcomeChannelId);
      if (welcomeChannel) {
        const welcomeContainer = new ContainerBuilder().setAccentColor(1761741);
        const welcomeText = new TextDisplayBuilder().setContent(`## Bem-vindo(a) ao Acelera Dev, ${member}!\n\nEntre agora no nosso grupo oficial do **WhatsApp**: É lá que vamos divulgar todos os avisos importantes, novidades, eventos e atualizações da comunidade.`);
        welcomeContainer.addTextDisplayComponents(welcomeText);

        const whatsappButton = new ButtonBuilder()
          .setLabel('Entrar no Grupo do WhatsApp')
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.WHATSAPP_GROUP_URL);

        const row = new ActionRowBuilder().addComponents(whatsappButton);

        await welcomeChannel.send({
          components: [welcomeContainer, row],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const container = new ContainerBuilder().setAccentColor(0x57F287);
      const text = new TextDisplayBuilder().setContent('E-mail verificado com sucesso! Seus cargos foram atualizados.');
      container.addTextDisplayComponents(text);

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      const text = new TextDisplayBuilder().setContent('E-mail não encontrado na lista de inscritos.');
      container.addTextDisplayComponents(text);

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  } catch (error) {
    console.error(error);
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    const text = new TextDisplayBuilder().setContent('Erro ao processar verificação.');
    container.addTextDisplayComponents(text);

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
}
