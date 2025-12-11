import express from "express";
import fs from "fs";
import path from "path";
import { startDiscordBot, client } from "./src/client.js";

const app = express();
app.use(express.json());

// Caminho do CSV dentro da pasta src
const CSV_PATH = path.join(process.cwd(), "src", "emails.csv");
const BINDINGS_PATH = path.join(process.cwd(), "src", "bindings.json");

// Garante que o CSV exista
if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, "");
  console.log("Criado arquivo src/emails.csv");
}

// Ler lista de emails
function readEmails() {
  const content = fs.readFileSync(CSV_PATH, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => line.trim());
}

// Função para salvar lista completa
function saveEmails(list) {
  fs.writeFileSync(CSV_PATH, list.join("\n") + "\n");
}

app.post("/", async (req, res) => {
  const body = req.body;
  const eventType = body?.webhook_event_type;
  const email = body?.Customer?.email;

  let emails = readEmails();

  // Venda aprovada
  if (eventType === "order_approved") {
    if (!emails.includes(email)) {
      emails.push(email);
      saveEmails(emails);
      console.log(`Email adicionado: ${email}`);
    } else {
      console.log(`Email já existia: ${email}`);
    }
  }

  // Reembolso realizado
  else if (eventType === "order_refunded") {
    if (emails.includes(email)) {
      // Remove do CSV
      emails = emails.filter((e) => e !== email);
      saveEmails(emails);
      console.log(`Email removido por reembolso: ${email}`);

      // Remove membro do Discord e remove vínculo
      try {
        if (fs.existsSync(BINDINGS_PATH)) {
          const bindings = JSON.parse(fs.readFileSync(BINDINGS_PATH, "utf-8"));
          const userId = bindings[email];

          if (userId) {
            // Remove do JSON de vínculos
            delete bindings[email];
            fs.writeFileSync(BINDINGS_PATH, JSON.stringify(bindings, null, 2));

            // Expulsa do servidor
            // Usamos o canal de verificação para encontrar a Guilda correta
            const channelId = process.env.VERIFICATION_CHANNEL_ID;
            if (channelId) {
              const channel = await client.channels.fetch(channelId);
              if (channel && channel.guild) {
                const member = await channel.guild.members.fetch(userId).catch(() => null);
                if (member) {
                  await member.kick("Reembolso Kiwify");
                  console.log(`Usuário ${userId} expulso do servidor.`);
                } else {
                  console.log(`Usuário ${userId} não encontrado no servidor.`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao processar kick por reembolso:", err);
      }

    } else {
      console.log(`Email não estava na lista: ${email}`);
    }
  }

  res.sendStatus(200);
});

// Shardcloud exige porta 80
app.listen(80, () => {
  console.log("Servidor ouvindo na porta 80");
  startDiscordBot();
});
