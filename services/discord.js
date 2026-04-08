import {
  Client,
  GatewayIntentBits,
  TextDisplayBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { env } from '../config/env.js';
import KiwifyMember from '../models/KiwifyMember.js';

const BUTTON_ID = 'b5bfc66cd2164aedb3577e47027cff08';
const MODAL_ID = 'email_verification_modal';
const EMAIL_INPUT_ID = 'email_input';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  console.log(`[Discord] Bot online: ${client.user.tag} (ID: ${client.user.id})`);
  console.log(`[Discord] Serving ${client.guilds.cache.size} guild(s)`);
  console.log(`[Discord] Sending verification message to channel ${env.verificationChannelId}...`);
  await sendVerificationMessage();
});

async function sendVerificationMessage() {
  try {
    console.log(`[Discord] Fetching verification channel ${env.verificationChannelId}...`);
    const channel = await client.channels.fetch(env.verificationChannelId);
    console.log(`[Discord] Channel found: #${channel.name}`);

    await channel.send({
      components: [
        new ContainerBuilder()
          .setAccentColor(6684621)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## Verificação')
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              'Para obter acesso completo ao servidor, clique no botão abaixo e verifique sua conta **informando o e-mail utilizado na inscrição**.'
            )
          ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel('Verificar email')
            .setCustomId(BUTTON_ID)
        ),
      ],
      flags: 32768, // IS_COMPONENTS_V2
    });

    console.log('[Discord] Verification message sent successfully.');
  } catch (err) {
    console.error('[Discord] Failed to send verification message:', err.message);
  }
}

client.on('interactionCreate', async (interaction) => {
  // ── Button ──────────────────────────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId === BUTTON_ID) {
    console.log(`[Discord] Button clicked by ${interaction.user.tag} (ID: ${interaction.user.id}) in guild ${interaction.guildId}`);

    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('Verificação de Email')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(EMAIL_INPUT_ID)
            .setLabel('E-mail utilizado na inscrição')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('seuemail@exemplo.com')
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
    console.log(`[Discord] Modal shown to ${interaction.user.tag}`);
    return;
  }

  // ── Modal submit ─────────────────────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;

    console.log(`[Discord] Modal submitted by ${userTag} (ID: ${userId})`);
    await interaction.deferReply({ ephemeral: true });

    try {
      const email = interaction.fields
        .getTextInputValue(EMAIL_INPUT_ID)
        .trim()
        .toLowerCase();

      console.log(`[Discord] Email provided: "${email}" by ${userTag}`);
      console.log(`[Discord] Looking up email in DB: ${email}`);

      const member = await KiwifyMember.findOne({ email });

      if (!member) {
        console.log(`[Discord] Email not found in DB: ${email} — user: ${userTag}`);
        return interaction.editReply({
          content: 'Email não encontrado. Verifique se utilizou o mesmo e-mail da sua inscrição.',
        });
      }

      console.log(`[Discord] Email found in DB: ${email} — linked discordId: ${member.discordId ?? 'null'}`);

      if (member.discordId && member.discordId !== userId) {
        console.log(`[Discord] Email already linked to different user: ${member.discordId} (requester: ${userId})`);
        return interaction.editReply({
          content: 'Este email já está associado a outro membro.',
        });
      }

      if (member.discordId === userId) {
        console.log(`[Discord] User ${userTag} already verified — reapplying roles`);
        await applyRoles(interaction.member, userTag);
        return interaction.editReply({
          content: 'Este email já está verificado. Seu acesso foi liberado. Se você não tem acesso ao servidor, entre em contato com um administrador.',
        });
      }

      // First-time verification
      console.log(`[Discord] First-time verification for ${userTag} — linking discordId ${userId} to email ${email}`);
      await KiwifyMember.updateOne({ email }, { discordId: userId });
      console.log(`[Discord] DB updated: ${email} → discordId ${userId}`);

      await applyRoles(interaction.member, userTag);

      console.log(`[Discord] Verification complete for ${userTag} (${userId})`);
      return interaction.editReply({
        content: 'Verificação concluída! Seu acesso foi liberado.',
      });
    } catch (err) {
      console.error(`[Discord] Error during modal submit for user ${userTag}:`, err);
      return interaction.editReply({
        content: 'Ocorreu um erro durante a verificação. Tente novamente.',
      });
    }
  }
});

async function applyRoles(member, userTag) {
  console.log(`[Discord] Adding role ${env.roleToAddId} to ${userTag}...`);
  await member.roles.add(env.roleToAddId);
  console.log(`[Discord] Role ${env.roleToAddId} added to ${userTag}`);

  console.log(`[Discord] Removing role ${env.roleToRemoveId} from ${userTag}...`);
  await member.roles.remove(env.roleToRemoveId);
  console.log(`[Discord] Role ${env.roleToRemoveId} removed from ${userTag}`);
}

export function startBot() {
  console.log('[Discord] Logging in...');
  client.login(env.discordToken);
}
