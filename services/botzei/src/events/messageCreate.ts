import { Events, Message } from 'discord.js';
import { askClaude } from '../utils/claude';

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: Message) {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the bot is mentioned
  const botMentioned = message.mentions.has(message.client.user!);

  if (!botMentioned) return;

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
