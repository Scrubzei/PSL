import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Patch,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { DiscordAuthGuard } from "./guards/discord-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      return req.user;
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      plutoniumUsername: user.plutoniumUsername,
      xboxGamertag: user.xboxGamertag,
      ps3Username: user.ps3Username,
      activisionId: user.activisionId,
    };
  }

  @UseGuards(DiscordAuthGuard)
  @Get("discord")
  discordAuth() {
    // Initiates Discord OAuth flow - guard handles redirect
  }

  @UseGuards(DiscordAuthGuard)
  @Get("discord/callback")
  async discordCallback(@Request() req, @Res() res: Response) {
    const result = await this.authService.validateDiscordLogin(req.user);

    // Redirect to frontend with token and needsUsername flag
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    const params = new URLSearchParams({
      token: result.access_token,
      needsUsername: result.needsUsername.toString(),
    });

    // Pass Discord username for autofill if user needs to set username
    if (result.needsUsername && req.user.discordUsername) {
      params.set("discordUsername", req.user.discordUsername);
    }

    res.redirect(`${frontendUrl}/discord-callback?${params.toString()}`);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(
    @Request() req,
    @Body() body: { plutoniumUsername?: string; xboxGamertag?: string; ps3Username?: string; activisionId?: string },
  ) {
    const user = await this.usersService.updateProfile(req.user.userId, body);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
      plutoniumUsername: user.plutoniumUsername,
      xboxGamertag: user.xboxGamertag,
      ps3Username: user.ps3Username,
      activisionId: user.activisionId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("set-username")
  async setUsername(@Request() req, @Body() body: { username: string }) {
    return this.authService.setUsername(req.user.userId, body.username);
  }

  @Post("dev-login")
  async devLogin(@Body() body: { username: string }) {
    return this.authService.devLogin(body.username);
  }

  @Patch('dev-set-role')
  async devSetRole(@Body() body: { userId: string; role: string }) {
    return this.authService.devSetRole(body.userId, body.role);
  }
}
