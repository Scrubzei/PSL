import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grant admin to one user and ref to another (by id).
 */
export class SetUserRolesAdminAndRef1741000000000 implements MigrationInterface {
  name = 'SetUserRolesAdminAndRef1741000000000';

  private readonly adminUserId = '74fea1ee-7cf6-43f0-a9a1-6479fa138cf7';
  private readonly refUserId = '7bff1037-63ab-4d7a-948c-eb3ed7fea64e';

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
