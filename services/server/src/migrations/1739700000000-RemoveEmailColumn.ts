import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveEmailColumn1739700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "password"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "discordAvatar"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "discordAvatar" varchar`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password" varchar`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "email" varchar`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")`);
  }
}
