import { Events, Message } from 'discord.js';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Chantex role: images/gifs get deleted and Botzei mocks them
  if (message.member && message.guild) {
    const hasChantex = message.member.roles.cache.some(r => r.name.toLowerCase() === 'chantex');
    if (hasChantex) {
      const hasMedia = message.attachments.size > 0 || /https?:\/\/\S+/i.test(message.content);
      if (hasMedia) {
        try {
          await message.delete();
          const mockGifs = [
            'https://tenor.com/view/no-image-perms-no-image-perks-no-image-gif-12889793216262706171',
            'https://tenor.com/view/imageperms-gif-2037061634831860252',
            'https://tenor.com/view/azure-latch-gif-6519761467915401666',
            'https://tenor.com/view/buddy-no-image-perms-gif-18006828907471357785',
            'https://tenor.com/view/image-pic-pic-perms-image-perms-gif-22063115',
            'https://tenor.com/view/link-perms-no-link-perms-no-perms-no-image-perms-image-perms-gif-23907870',
            'https://tenor.com/view/image-perms-image-perms-permission-discord-gif-4624946588199067241',
            'https://tenor.com/view/no-gif-20395215',
          ];
          const gif = mockGifs[Math.floor(Math.random() * mockGifs.length)];
          await message.author.send(gif);
        } catch (e: any) {
          console.error(`[Chantex] Failed to handle message from ${message.author.username}:`, e.message);
        }
        return;
      }
    }
  }

  // Blazei role: timeout for 1 minute if user has the role
  if (message.member) {
    const blazeiRole = message.member.roles.cache.find(r => r.name.toLowerCase() === 'blazei');
    if (blazeiRole) {
      console.log(`[Blazei] ${message.author.username} has blazei role, attempting timeout...`);
      try {
        await message.member.timeout(60_000, 'Blazei role');
        console.log(`[Blazei] Timed out ${message.author.username} for 1 minute`);
      } catch (e: any) {
        console.error(`[Blazei] Failed to timeout ${message.author.username}:`, e.message);
      }
      return;
    }
  }

  // AI responses disabled for now
  // if (message.mentions.has(message.client.user!)) { ... }
}
