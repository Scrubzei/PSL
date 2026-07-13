import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { TeamMembership } from './team-membership.entity';
import { TeamInvite } from './team-invite.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(TeamMembership) private memberRepo: Repository<TeamMembership>,
    @InjectRepository(TeamInvite) private inviteRepo: Repository<TeamInvite>,
  ) {}

  // ── Queries ──

  async findAll(game?: string): Promise<Team[]> {
    const qb = this.teamRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.captain', 'captain')
      .leftJoinAndSelect('t.memberships', 'memberships')
      .leftJoinAndSelect('memberships.user', 'member');
    if (game) qb.where('t.game = :game', { game });
    return qb.orderBy('t.createdAt', 'DESC').getMany();
  }

  async findById(id: string): Promise<Team> {
    const team = await this.teamRepo.findOne({
      where: { id },
      relations: ['captain', 'memberships', 'memberships.user', 'invites', 'invites.invitedUser'],
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async findByTag(tag: string, game: string): Promise<Team | null> {
    return this.teamRepo.findOne({
      where: { tag: tag.toUpperCase(), game },
      relations: ['captain', 'memberships', 'memberships.user'],
    });
  }

  async findUserTeams(userId: string): Promise<Team[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['team', 'team.captain', 'team.memberships', 'team.memberships.user'],
    });
    return memberships.map((m) => m.team);
  }

  async findUserInvites(userId: string): Promise<TeamInvite[]> {
    return this.inviteRepo.find({
      where: { invitedUserId: userId, status: 'pending' },
      relations: ['team', 'team.captain', 'invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Create ──

  async create(userId: string, data: { name: string; tag: string; game: string; region?: string; logo?: string; color?: string; bio?: string }): Promise<Team> {
    const tag = data.tag.toUpperCase();

    // Check tag uniqueness per game
    const existing = await this.teamRepo.findOne({ where: { tag, game: data.game } });
    if (existing) throw new BadRequestException(`Tag "${tag}" is already taken for ${data.game}`);

    // Check user doesn't already captain/belong to a team in this game
    const userTeam = await this.memberRepo.findOne({
      where: { userId },
      relations: ['team'],
    });
    if (userTeam && userTeam.team.game === data.game) {
      throw new BadRequestException(`You are already on a team for ${data.game}`);
    }

    const team = this.teamRepo.create({
      name: data.name,
      tag,
      game: data.game,
      region: data.region || 'NA',
      logo: data.logo,
      color: data.color,
      bio: data.bio,
      captainId: userId,
    });
    const saved = await this.teamRepo.save(team);

    // Add captain as member
    await this.memberRepo.save(this.memberRepo.create({
      teamId: saved.id,
      userId,
      role: 'captain',
    }));

    return this.findById(saved.id);
  }

  // ── Update ──

  async update(teamId: string, userId: string, data: Partial<{ name: string; tag: string; region: string; logo: string; color: string; bio: string }>): Promise<Team> {
    const team = await this.findById(teamId);
    if (team.captainId !== userId) throw new ForbiddenException('Only the captain can edit the team');

    if (data.tag) {
      const tag = data.tag.toUpperCase();
      const existing = await this.teamRepo.findOne({ where: { tag, game: team.game } });
      if (existing && existing.id !== teamId) throw new BadRequestException(`Tag "${tag}" is already taken`);
      data.tag = tag;
    }

    Object.assign(team, data);
    await this.teamRepo.save(team);
    return this.findById(teamId);
  }

  // ── Invite ──

  async invite(teamId: string, captainId: string, targetUserId: string): Promise<TeamInvite> {
    const team = await this.findById(teamId);
    if (team.captainId !== captainId) throw new ForbiddenException('Only the captain can invite');

    // Check target isn't already on a team for this game
    const targetMembership = await this.memberRepo.findOne({
      where: { userId: targetUserId },
      relations: ['team'],
    });
    if (targetMembership && targetMembership.team.game === team.game) {
      throw new BadRequestException('Player is already on a team for this game');
    }

    // Check no pending invite already
    const pendingInvite = await this.inviteRepo.findOne({
      where: { teamId, invitedUserId: targetUserId, status: 'pending' },
    });
    if (pendingInvite) throw new BadRequestException('Invite already pending');

    const invite = this.inviteRepo.create({
      teamId,
      invitedUserId: targetUserId,
      invitedByUserId: captainId,
    });
    return this.inviteRepo.save(invite);
  }

  async acceptInvite(inviteId: string, userId: string): Promise<Team> {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, invitedUserId: userId, status: 'pending' },
      relations: ['team'],
    });
    if (!invite) throw new NotFoundException('Invite not found or already resolved');

    // One more check — user might have joined another team since the invite was sent
    const existing = await this.memberRepo.findOne({
      where: { userId },
      relations: ['team'],
    });
    if (existing && existing.team.game === invite.team.game) {
      invite.status = 'declined';
      await this.inviteRepo.save(invite);
      throw new BadRequestException('You already joined a team for this game');
    }

    invite.status = 'accepted';
    await this.inviteRepo.save(invite);

    await this.memberRepo.save(this.memberRepo.create({
      teamId: invite.teamId,
      userId,
      role: 'member',
    }));

    return this.findById(invite.teamId);
  }

  async declineInvite(inviteId: string, userId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, invitedUserId: userId, status: 'pending' },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    invite.status = 'declined';
    await this.inviteRepo.save(invite);
  }

  async cancelInvite(inviteId: string, captainId: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({
      where: { id: inviteId, status: 'pending' },
      relations: ['team'],
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.team.captainId !== captainId) throw new ForbiddenException('Only the captain can cancel invites');
    await this.inviteRepo.remove(invite);
  }

  // ── Roster ──

  async kick(teamId: string, captainId: string, targetUserId: string): Promise<void> {
    const team = await this.findById(teamId);
    if (team.captainId !== captainId) throw new ForbiddenException('Only the captain can kick');
    if (targetUserId === captainId) throw new BadRequestException('Captain cannot kick themselves — disband instead');

    const membership = await this.memberRepo.findOne({ where: { teamId, userId: targetUserId } });
    if (!membership) throw new NotFoundException('Player is not on this team');
    await this.memberRepo.remove(membership);
  }

  async leave(teamId: string, userId: string): Promise<void> {
    const team = await this.findById(teamId);
    if (team.captainId === userId) throw new BadRequestException('Captain cannot leave — disband or transfer ownership first');

    const membership = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!membership) throw new NotFoundException('You are not on this team');
    await this.memberRepo.remove(membership);
  }

  async disband(teamId: string, captainId: string): Promise<void> {
    const team = await this.findById(teamId);
    if (team.captainId !== captainId) throw new ForbiddenException('Only the captain can disband');
    await this.teamRepo.remove(team);
  }
}
