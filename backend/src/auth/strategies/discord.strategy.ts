import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, Scope } from 'passport-discord-auth';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(private configService: ConfigService) {
    super({
      clientId: configService.get<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.get<string>('DISCORD_CLIENT_SECRET'),
      callbackUrl: configService.get<string>('DISCORD_CALLBACK_URL') || 'http://localhost:3000/auth/discord/callback',
      scope: [Scope.Identify, Scope.Email, Scope.GuildsJoin],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const { id, username, email, avatar, global_name } = profile;

    // Build Discord avatar URL if avatar hash exists
    let avatarUrl: string | null = null;
    if (avatar) {
      const ext = avatar.startsWith('a_') ? 'gif' : 'png';
      avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}`;
    }

    return {
      discordId: id,
      email: email,
      discordUsername: username,
      displayName: global_name || username,
      avatar: avatarUrl,
      accessToken,
    };
  }
}
