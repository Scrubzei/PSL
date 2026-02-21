import { Injectable, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { validateUsername } from './utils/username-validator';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(user: any) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async validateDiscordLogin(profile: {
    discordId: string;
    accessToken: string;
  }) {
    // Add user to Discord server
    await this.addUserToDiscordGuild(profile.discordId, profile.accessToken);

    // Check if user exists by discordId
    let user = await this.usersService.findByDiscordId(profile.discordId);

    if (user) {
      const needsUsername = !user.username;
      const loginResult = await this.login(user);

      return {
        ...loginResult,
        needsUsername,
      };
    }

    // New user - create account
    user = await this.usersService.createFromDiscord(profile.discordId);

    const loginResult = await this.login(user);

    return {
      ...loginResult,
      needsUsername: true,
    };
  }

  private async addUserToDiscordGuild(discordId: string, accessToken: string): Promise<void> {
    const guildId = this.configService.get<string>('DISCORD_GUILD_ID');
    const botToken = this.configService.get<string>('DISCORD_BOT_TOKEN');

    if (!guildId || !botToken) {
      console.warn('Discord guild auto-join not configured (missing DISCORD_GUILD_ID or DISCORD_BOT_TOKEN)');
      return;
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });

      if (response.status === 201) {
        console.log(`Added user ${discordId} to Discord guild`);
      } else if (response.status === 204) {
        console.log(`User ${discordId} already in Discord guild`);
      } else {
        const error = await response.text();
        console.error(`Failed to add user to Discord guild: ${response.status} ${error}`);
      }
    } catch (error) {
      console.error('Error adding user to Discord guild:', error);
    }
  }

  async setUsername(userId: string, username: string) {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Check availability
    const isAvailable = await this.usersService.isUsernameAvailable(username);
    if (!isAvailable) {
      throw new ConflictException('Username is already taken');
    }

    // Set username
    const user = await this.usersService.setUsername(userId, username);

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async devLogin(username: string) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev login is not available in production');
    }

    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User "${username}" not found`);
    }

    return this.login(user);
  }
}
