import { env } from '../config/env.js';
import KiwifyMember from '../models/KiwifyMember.js';

export async function handleOrderApproved(email, client) {
  console.log(`[Kiwify] order_approved — email: ${email}`);
  console.log(`[Kiwify] Checking if email already exists in DB: ${email}`);

  const existing = await KiwifyMember.findOne({ email });

  if (!existing) {
    console.log(`[Kiwify] Email not found — creating new member: ${email}`);
    await KiwifyMember.create({ email, discordId: null });
    console.log(`[Kiwify] Member saved to DB: ${email}`);
  } else {
    console.log(`[Kiwify] Email already registered, skipping insert: ${email} (discordId: ${existing.discordId ?? 'null'})`);
  }
}

export async function handleOrderRefunded(email, client) {
  console.log(`[Kiwify] order_refunded — email: ${email}`);
  console.log(`[Kiwify] Looking up email in DB: ${email}`);

  const member = await KiwifyMember.findOne({ email });

  if (!member) {
    console.log(`[Kiwify] Email not found in DB, nothing to remove: ${email}`);
    return;
  }

  const { discordId } = member;
  console.log(`[Kiwify] Member found — discordId: ${discordId ?? 'null'}`);

  console.log(`[Kiwify] Deleting member from DB: ${email}`);
  await KiwifyMember.deleteOne({ email });
  console.log(`[Kiwify] Member deleted from DB: ${email}`);

  if (!discordId) {
    console.log(`[Kiwify] No discordId linked — skipping role update`);
    return;
  }

  console.log(`[Kiwify] Fetching guild ${env.guildId} to update roles...`);
  try {
    const guild = await client.guilds.fetch(env.guildId);
    console.log(`[Kiwify] Guild found: ${guild.name}`);

    console.log(`[Kiwify] Fetching Discord member ${discordId}...`);
    const guildMember = await guild.members.fetch(discordId);
    console.log(`[Kiwify] Member found: ${guildMember.user.tag}`);

    console.log(`[Kiwify] Removing role ${env.roleToAddId} from ${guildMember.user.tag}...`);
    await guildMember.roles.remove(env.roleToAddId);
    console.log(`[Kiwify] Role ${env.roleToAddId} removed`);

    console.log(`[Kiwify] Adding role ${env.roleToRemoveId} back to ${guildMember.user.tag}...`);
    await guildMember.roles.add(env.roleToRemoveId);
    console.log(`[Kiwify] Role ${env.roleToRemoveId} restored`);

    console.log(`[Kiwify] Refund flow complete for ${guildMember.user.tag} (${discordId})`);
  } catch (err) {
    console.error(`[Kiwify] Failed to update roles for discordId ${discordId}:`, err.message);
  }
}
