import './config/env.js';
import express from 'express';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { client, startBot } from './services/discord.js';
import { handleOrderApproved, handleOrderRefunded } from './services/kiwifyWebhook.js';

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

app.listen(env.port, () => {
  console.log(`[Express] Server listening on port ${env.port}`);
});
