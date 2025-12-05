import {
  TextDisplayBuilder,
  MessageFlags,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import "dotenv/config";

function createVerificationLayout() {
  const container = new ContainerBuilder().setAccentColor(1761741);
  const title = new TextDisplayBuilder().setContent("# Verificação");
  const subtitle = new TextDisplayBuilder().setContent(
    "Para obter acesso completo ao servidor, clique no botão abaixo e verifique sua conta **informando o e-mail utilizado na inscrição**."
  );

  container.addTextDisplayComponents(title, subtitle);

  const button = new ButtonBuilder()
    .setCustomId("verify_email_btn")
    .setLabel("Verificar E-mail")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button);

  return [container, row];
}

export async function sendVerificationLayoutMessage(client) {
  try {
    const channel = await client.channels.fetch(process.env.VERIFICATION_CHANNEL_ID);

    const messages = await channel.messages.fetch({ limit: 10 });
    if (messages.size > 0) {
      await channel.bulkDelete(messages);
    }

    const [container, row] = createVerificationLayout();

    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container, row],
    });

    console.log("Painel de verificação enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar painel de verificação:", error);
  }
}
