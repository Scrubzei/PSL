import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Assigns admin and ref roles by user id (Discord-linked accounts, etc.).
 */
export class SetUserRolesAdminAndRefById1741700000000 implements MigrationInterface {
  name = 'SetUserRolesAdminAndRefById1741700000000';

  private readonly adminUserId = 'f0bb018e-6f50-4561-aad4-25c549b6c148';
  private readonly refUserId = '2c71988e-ce3e-41ce-a491-80370879504e';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "users" SET "role" = 'admin' WHERE "id" = $1`, [
      this.adminUserId,
    ]);
    await queryRunner.query(`UPDATE "users" SET "role" = 'ref' WHERE "id" = $1`, [this.refUserId]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "users" SET "role" = 'player' WHERE "id" = $1`, [
      this.adminUserId,
    ]);
    await queryRunner.query(`UPDATE "users" SET "role" = 'player' WHERE "id" = $1`, [this.refUserId]);
  }
}
