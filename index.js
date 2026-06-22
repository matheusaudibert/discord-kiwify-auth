import './config/env.js';
import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { client, startBot } from './services/discord.js';
import { handleOrderApproved, handleOrderRefunded } from './services/kiwifyWebhook.js';
import KiwifyMember from './models/KiwifyMember.js';

// MongoDB
console.log(`[MongoDB] Connecting to ${env.mongodbUri}...`);
await mongoose.connect(env.mongodbUri);
console.log('[MongoDB] Connected successfully');

// Discord bot
startBot();

// Express
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  console.log(`[Express] GET / — health check from ${req.ip}`);
  res.send('Webhook Kiwify rodando');
});

app.post('/', async (req, res) => {
  const body = req.body;
  const eventType = body?.webhook_event_type;
  const email = body?.Customer?.email?.trim().toLowerCase();

  console.log(`[Express] POST / — event: ${eventType ?? 'undefined'} | email: ${email ?? 'undefined'} | ip: ${req.ip}`);

  try {
    if (!email) {
      console.warn('[Express] Request rejected: missing customer email');
      return res.status(400).json({ error: 'Missing customer email' });
    }

    if (eventType === 'order_approved') {
      console.log(`[Express] Dispatching order_approved for ${email}`);
      await handleOrderApproved(email, client);
    } else if (eventType === 'order_refunded') {
      console.log(`[Express] Dispatching order_refunded for ${email}`);
      await handleOrderRefunded(email, client);
    } else {
      console.warn(`[Express] Unhandled event type received: "${eventType}"`);
    }

    console.log(`[Express] Request handled successfully — event: ${eventType} | email: ${email}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[Express] Unexpected error handling event "${eventType}" for ${email}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get('/seed-emails', (req, res) => {
  console.log(`[Express] GET /seed-emails — ip: ${req.ip}`);
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Seed de Emails</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f5f5f5;padding:2rem;color:#1a1a1a}
    h1{text-align:center;margin-bottom:2rem;font-size:1.4rem}
    h2{font-size:0.95rem;color:#444;margin-bottom:0.75rem}
    .card{background:#fff;border-radius:8px;padding:1.5rem;margin:0 auto 1.5rem;max-width:580px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    small{color:#666;font-size:0.8rem;display:block;margin-bottom:0.75rem}
    input[type=email],input[type=file],textarea{width:100%;padding:0.55rem 0.75rem;border:1px solid #ddd;border-radius:4px;font-size:0.9rem;margin-bottom:0.75rem;font-family:inherit}
    button{background:#5865f2;color:#fff;border:none;padding:0.55rem 1.4rem;border-radius:4px;cursor:pointer;font-size:0.9rem}
    button:hover{background:#4752c4}
    #result{max-width:580px;margin:0 auto}
    .ok{color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;padding:0.85rem;border-radius:4px;line-height:1.7}
    .err{color:#dc2626;background:#fef2f2;border:1px solid #fecaca;padding:0.85rem;border-radius:4px}
  </style>
</head>
<body>
  <h1>Seed de Emails</h1>

  <div class="card">
    <h2>Email único</h2>
    <input type="email" id="singleEmail" placeholder="usuario@exemplo.com">
    <button onclick="sendSingle()">Adicionar</button>
  </div>

  <div class="card">
    <h2>Importação em lote</h2>
    <small>CSV (uma coluna com emails) ou JSON (array de strings ou de objetos com campo "email")</small>
    <input type="file" id="fileInput" accept=".csv,.json">
    <button onclick="sendFile()">Importar</button>
  </div>

  <div id="result"></div>

  <script>
    const RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

    function show(data, err) {
      const el = document.getElementById('result');
      if (err) { el.innerHTML = '<div class="err">' + data + '</div>'; return; }
      el.innerHTML = '<div class="ok card"><strong>Concluído!</strong><br>'
        + 'Inseridos: <b>' + data.inserted + '</b><br>'
        + 'Ignorados (já existiam): <b>' + data.skipped + '</b>'
        + (data.invalid.length ? '<br>Inválidos: ' + data.invalid.join(', ') : '')
        + '</div>';
    }

    async function post(emails) {
      try {
        const r = await fetch('/seed-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails })
        });
        const d = await r.json();
        r.ok ? show(d, false) : show(d.error || 'Erro desconhecido', true);
      } catch { show('Erro de conexão', true); }
    }

    function sendSingle() {
      const v = document.getElementById('singleEmail').value.trim();
      if (!RE.test(v)) { show('Email inválido', true); return; }
      post([v]);
    }

    function sendFile() {
      const file = document.getElementById('fileInput').files[0];
      if (!file) { show('Selecione um arquivo', true); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const txt = e.target.result;
        let emails = [];
        try {
          if (file.name.endsWith('.json')) {
            const p = JSON.parse(txt);
            emails = Array.isArray(p)
              ? p.map(x => typeof x === 'string' ? x : x?.email).filter(Boolean)
              : [];
          } else {
            emails = txt.split(/\\r?\\n/).flatMap(l => l.split(','))
              .map(v => v.trim().replace(/^"|"$/g, '')).filter(v => RE.test(v));
          }
        } catch { show('Erro ao processar arquivo', true); return; }
        if (!emails.length) { show('Nenhum email encontrado no arquivo', true); return; }
        post(emails);
      };
      reader.readAsText(file);
    }
  </script>
</body>
</html>`);
});

app.post('/seed-emails', async (req, res) => {
  const { emails } = req.body ?? {};

  console.log(`[Express] POST /seed-emails — count: ${Array.isArray(emails) ? emails.length : 'invalid'} | ip: ${req.ip}`);

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Body deve conter { emails: string[] }' });
  }

  const invalid = [];
  const valid = [];
  const seen = new Set();

  for (const raw of emails) {
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
    if (!email || !EMAIL_REGEX.test(email)) { invalid.push(raw); continue; }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push(email);
  }

  if (valid.length === 0) {
    return res.status(400).json({ error: 'Nenhum email válido fornecido', invalid });
  }

  let inserted = 0;
  let skipped = 0;

  try {
    const docs = valid.map(email => ({ email, discordId: null }));
    const result = await KiwifyMember.insertMany(docs, { ordered: false });
    inserted = result.length;
    skipped = valid.length - inserted;
  } catch (err) {
    if (err.code === 11000 || err.writeErrors?.length > 0) {
      inserted = err.insertedDocs?.length ?? 0;
      skipped = valid.length - inserted;
    } else {
      console.error('[Express] Erro ao inserir emails no seed:', err);
      return res.status(500).json({ error: 'Erro interno ao inserir emails' });
    }
  }

  console.log(`[Express] /seed-emails — inserted: ${inserted} | skipped: ${skipped} | invalid: ${invalid.length}`);
  return res.status(200).json({ ok: true, inserted, skipped, invalid });
});

app.listen(env.port, () => {
  console.log(`[Express] Server listening on port ${env.port}`);
});
