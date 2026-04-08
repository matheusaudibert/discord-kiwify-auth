import dotenv from 'dotenv';
dotenv.config();

const required = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
  'ROLE_TO_ADD_ID',
  'ROLE_TO_REMOVE_ID',
  'VERIFICATION_CHANNEL_ID',
  'MONGODB_URI',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  roleToAddId: process.env.ROLE_TO_ADD_ID,
  roleToRemoveId: process.env.ROLE_TO_REMOVE_ID,
  verificationChannelId: process.env.VERIFICATION_CHANNEL_ID,
  mongodbUri: process.env.MONGODB_URI,
  port: parseInt(process.env.PORT || '8080', 10),
};
