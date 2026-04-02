import { MigrationInterface, QueryRunner } from 'typeorm';

export class XpEloAndDisputeModeration1740700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" ADD "xpOptIn" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" ADD "elo" integer NULL`);

    await queryRunner.query(`ALTER TABLE "matches" ADD "challengerEloBefore" integer NULL`);
    await queryRunner.query(`ALTER TABLE "matches" ADD "challengeeEloBefore" integer NULL`);
    await queryRunner.query(`ALTER TABLE "matches" ADD "eloApplied" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `ALTER TABLE "matches" ADD "disputePhase" varchar(32) NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(`ALTER TABLE "matches" ADD "lastChallengerEloDelta" integer NULL`);
    await queryRunner.query(`ALTER TABLE "matches" ADD "lastChallengeeEloDelta" integer NULL`);
    await queryRunner.query(`ALTER TABLE "matches" ADD "refResolvedByUserId" uuid NULL`);
    await queryRunner.query(`ALTER TABLE "matches" ADD "adminResolvedByUserId" uuid NULL`);
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_refResolvedBy" FOREIGN KEY ("refResolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_adminResolvedBy" FOREIGN KEY ("adminResolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_adminResolvedBy"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_refResolvedBy"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "adminResolvedByUserId"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "refResolvedByUserId"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "lastChallengeeEloDelta"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "lastChallengerEloDelta"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "disputePhase"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "eloApplied"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "challengeeEloBefore"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "challengerEloBefore"`);
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" DROP COLUMN "elo"`);
    await queryRunner.query(`ALTER TABLE "leaderboard_entries" DROP COLUMN "xpOptIn"`);
  }
}
