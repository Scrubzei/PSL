import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'get_user_by_username',
    description: 'Get a user by their username. Use this to find user IDs when given a username.',
    input_schema: {
      type: 'object' as const,
      properties: {
        username: {
          type: 'string',
          description: 'The username to look up',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'get_user_stats',
    description: 'Get overall statistics for a user including total wins, losses, win rate, and recent matches.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'The user ID to get stats for',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'get_head_to_head',
    description: 'Get head-to-head statistics between two players showing their match history against each other.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'The first user ID',
        },
        opponentId: {
          type: 'string',
          description: 'The second user ID (opponent)',
        },
      },
      required: ['userId', 'opponentId'],
    },
  },
  {
    name: 'search_matches',
    description: 'Search for matches with various filters. Can filter by user, opponent, game, platform, status, type (XP or RANKED), and date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        userId: {
          type: 'string',
          description: 'Filter by user ID (matches where user is challenger or challengee)',
        },
        opponentId: {
          type: 'string',
          description: 'Filter by opponent ID (use with userId for head-to-head)',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED', 'DISPUTED'],
          description: 'Filter by match status',
        },
        game: {
          type: 'string',
          description: 'Filter by game name (e.g., bo2, mw3, mw2)',
        },
        platform: {
          type: 'string',
          description: 'Filter by platform (e.g., xbox, ps3, plutonium)',
        },
        type: {
          type: 'string',
          enum: ['XP', 'RANKED'],
          description: 'Filter by match type',
        },
        startDate: {
          type: 'string',
          description: 'Filter matches after this ISO date (e.g., 2024-01-01)',
        },
        endDate: {
          type: 'string',
          description: 'Filter matches before this ISO date',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of matches to return (default 50)',
        },
      },
    },
  },
  {
    name: 'get_leaderboard',
    description: 'Get leaderboard entries for a specific game and platform.',
    input_schema: {
      type: 'object' as const,
      properties: {
        game: {
          type: 'string',
          description: 'The game name (e.g., bo2, mw3, mw2)',
        },
        platform: {
          type: 'string',
          description: 'The platform (e.g., xbox, ps3, plutonium)',
        },
        type: {
          type: 'string',
          enum: ['ranked', 'xp'],
          description: 'Type of leaderboard to get (default: ranked)',
        },
      },
      required: ['game', 'platform'],
    },
  },
  {
    name: 'list_tournaments',
    description: 'Get a list of all tournaments.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_tournament',
    description: 'Get details for a specific tournament including participants.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tournamentId: {
          type: 'string',
          description: 'The tournament ID',
        },
      },
      required: ['tournamentId'],
    },
  },
  {
    name: 'list_users',
    description: 'Search for users by username (partial match).',
    input_schema: {
      type: 'object' as const,
      properties: {
        username: {
          type: 'string',
          description: 'Username to search for (partial match)',
        },
      },
    },
  },
];

// Execute a tool call
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    let response: Response;
    let data: unknown;

    switch (name) {
      case 'get_user_by_username':
        response = await fetch(`${BACKEND_URL}/users/by-username/${encodeURIComponent(input.username as string)}`);
        data = await response.json();
        if (!data) {
          return JSON.stringify({ error: 'User not found' });
        }
        return JSON.stringify(data);

      case 'get_user_stats':
        response = await fetch(`${BACKEND_URL}/users/${input.userId}/stats`);
        data = await response.json();
        return JSON.stringify(data);

      case 'get_head_to_head':
        response = await fetch(`${BACKEND_URL}/users/${input.userId}/head-to-head/${input.opponentId}`);
        data = await response.json();
        return JSON.stringify(data);

      case 'search_matches': {
        const params = new URLSearchParams();
        if (input.userId) params.append('userId', input.userId as string);
        if (input.opponentId) params.append('opponentId', input.opponentId as string);
        if (input.status) params.append('status', input.status as string);
        if (input.game) params.append('game', input.game as string);
        if (input.platform) params.append('platform', input.platform as string);
        if (input.type) params.append('type', input.type as string);
        if (input.startDate) params.append('startDate', input.startDate as string);
        if (input.endDate) params.append('endDate', input.endDate as string);
        if (input.limit) params.append('limit', String(input.limit));

        response = await fetch(`${BACKEND_URL}/matches/search?${params.toString()}`);
        data = await response.json();
        return JSON.stringify(data);
      }

      case 'get_leaderboard': {
        // First get the leaderboard ID
        const lbResponse = await fetch(
          `${BACKEND_URL}/leaderboards/by-game-platform?game=${input.game}&platform=${input.platform}`
        );
        if (!lbResponse.ok) {
          return JSON.stringify({ error: 'Leaderboard not found' });
        }
        const leaderboard = await lbResponse.json() as { id: string };

        // Then get entries
        const type = (input.type as string) || 'ranked';
        const entriesResponse = await fetch(`${BACKEND_URL}/leaderboards/${leaderboard.id}/entries?type=${type}`);
        data = await entriesResponse.json();
        return JSON.stringify({ leaderboard, entries: data });
      }

      case 'list_tournaments':
        response = await fetch(`${BACKEND_URL}/tournaments`);
        data = await response.json();
        return JSON.stringify(data);

      case 'get_tournament':
        response = await fetch(`${BACKEND_URL}/tournaments/${input.tournamentId}`);
        data = await response.json();
        return JSON.stringify(data);

      case 'list_users': {
        const url = input.username
          ? `${BACKEND_URL}/users?username=${encodeURIComponent(input.username as string)}`
          : `${BACKEND_URL}/users`;
        response = await fetch(url);
        data = await response.json();
        return JSON.stringify(data);
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return JSON.stringify({ error: `Failed to execute ${name}: ${error}` });
  }
}

// System prompt for the AI
const SYSTEM_PROMPT = `You are Botzei, a helpful AI assistant for a competitive gaming leaderboard platform called 1v1 Leaderboards.

The platform allows players to:
- Challenge each other to matches (XP or RANKED)
- Track their stats and rankings on leaderboards
- Participate in tournaments
- View head-to-head records against other players

Gaming slang context:
- "slapped" = beat/defeated someone in a match
- "got slapped" = lost to someone
- Games include: BO2 (Black Ops 2), MW3 (Modern Warfare 3), MW2 (Modern Warfare 2)
- Platforms include: Xbox, PlayStation (PS3), Plutonium (PC)

When answering questions:
- Be concise and direct
- Use the tools to look up real data - never make up statistics
- When asked about a player, first use get_user_by_username to find their ID
- For time-based questions (like "this week"), calculate the appropriate date range
- Present statistics in a readable format
- If data isn't available, say so clearly

Current date for reference: ${new Date().toISOString().split('T')[0]}`;

export interface AiResponse {
  content: string;
  toolsUsed: string[];
}

export async function askClaude(question: string): Promise<AiResponse> {
  const toolsUsed: string[] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: question },
  ];

  // Initial request
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      toolsUsed.push(toolUse.name);
      console.log(`[Claude] Using tool: ${toolUse.name}`, toolUse.input);

      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Continue conversation with tool results
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  // Extract final text response
  const textContent = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  return {
    content: textContent?.text || 'I encountered an issue processing your request.',
    toolsUsed,
  };
}
