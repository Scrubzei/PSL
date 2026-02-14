import { Events, Message } from 'discord.js';
import { askClaude } from '../utils/claude.js';

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
          const mockMsg = await (message.channel as any).send(`<@${message.author.id}> ${gif}`);
          setTimeout(() => mockMsg.delete().catch(() => {}), 5000);
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

  // Check if the bot is directly mentioned (ignore @here/@everyone)
  if (message.mentions.everyone) return;
  if (!message.mentions.has(message.client.user!)) return;

  // Extract the question (remove the mention)
  const question = message.content
    .replace(/<@!?\d+>/g, '') // Remove all mentions
    .trim();

  if (!question) {
    await message.reply("Hey! Ask me a question about the leaderboards, matches, or player stats.");
    return;
  }

  // Show typing indicator
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }

  try {
    console.log(`[AI] Question from ${message.author.username}: ${question}`);

    const response = await askClaude(question);

    console.log(`[AI] Tools used: ${response.toolsUsed.join(', ') || 'none'}`);

    // Split response if it's too long for Discord (2000 char limit)
    const maxLength = 2000;
    if (response.content.length <= maxLength) {
      await message.reply(response.content);
    } else {
      // Split into multiple messages
      const chunks: string[] = [];
      let remaining = response.content;

      while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
          chunks.push(remaining);
          break;
        }

        // Find a good break point (newline or space)
        let breakPoint = remaining.lastIndexOf('\n', maxLength);
        if (breakPoint === -1 || breakPoint < maxLength / 2) {
          breakPoint = remaining.lastIndexOf(' ', maxLength);
        }
        if (breakPoint === -1) {
          breakPoint = maxLength;
        }

        chunks.push(remaining.slice(0, breakPoint));
        remaining = remaining.slice(breakPoint).trim();
      }

      // Send first chunk as reply, rest as follow-ups
      await message.reply(chunks[0]);
      for (let i = 1; i < chunks.length; i++) {
        if ('send' in message.channel) {
          await message.channel.send(chunks[i]);
        }
      }
    }
  } catch (error) {
    console.error('[AI] Error processing question:', error);
    await message.reply("Sorry, I encountered an error processing your question. Please try again later.");
  }
}
