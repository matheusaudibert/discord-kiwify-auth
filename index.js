import express from "express";
import fs from "fs";
import path from "path";
import { startDiscordBot, client } from "./src/client.js";

const app = express();
app.use(express.json());

const CSV_PATH = path.join(process.cwd(), "src", "emails.csv");
const BINDINGS_PATH = path.join(process.cwd(), "src", "bindings.json");

if (!fs.existsSync(CSV_PATH)) {
  fs.writeFileSync(CSV_PATH, "");
  console.log("Criado arquivo src/emails.csv");
}

function readEmails() {
  const content = fs.readFileSync(CSV_PATH, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => line.trim());
}

function saveEmails(list) {
  fs.writeFileSync(CSV_PATH, list.join("\n") + "\n");
}

app.get("/", (req, res) => {
  res.send("Webhook Kiwify rodando");
});

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

      try {
        if (fs.existsSync(BINDINGS_PATH)) {
          const bindings = JSON.parse(fs.readFileSync(BINDINGS_PATH, "utf-8"));
          const userId = bindings[email];

          if (userId) {
            delete bindings[email];
            fs.writeFileSync(BINDINGS_PATH, JSON.stringify(bindings, null, 2));

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

app.listen(80, () => {
  console.log("Servidor ouvindo na porta 80");
  startDiscordBot();
});
