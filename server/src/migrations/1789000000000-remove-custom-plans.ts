import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCustomPlans1789000000000 implements MigrationInterface {
  name = 'RemoveCustomPlans1789000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "custom_plan_row"');
    await queryRunner.query('DROP TABLE IF EXISTS "custom_plan"');
  }

  async down(): Promise<void> {}
}
