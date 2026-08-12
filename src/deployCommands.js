import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('table')
    .setDescription('افتح طاولة أيس جديدة في هذا الروم')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('table-end')
    .setDescription('أنهِ الطاولة الحالية في هذا الروم (للمضيف فقط)')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const route = process.env.GUILD_ID
  ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(process.env.CLIENT_ID);

try {
  await rest.put(route, { body: commands });
  console.log('✅ Slash commands registered:', process.env.GUILD_ID ? `guild ${process.env.GUILD_ID}` : 'globally');
} catch (err) {
  console.error('❌ Failed to register commands:', err);
}
