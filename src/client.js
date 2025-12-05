import "dotenv/config";
import { Client, GatewayIntentBits } from 'discord.js';

import { sendVerificationLayoutMessage } from './sendChecker.js';
import { showEmailModal, verifyEmailSubmission } from './checkEmail.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

export async function startDiscordBot() {
  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await sendVerificationLayoutMessage(client);
  });

  client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'verify_email_btn') {
      await showEmailModal(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId === 'email_modal') {
      await verifyEmailSubmission(interaction);
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
}
