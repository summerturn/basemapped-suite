import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_wo_scheduled ON work_orders(scheduled_date)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_insp_completed ON inspections(completed_date)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_assets_created_at');
  await knex.raw('DROP INDEX IF EXISTS idx_wo_scheduled');
  await knex.raw('DROP INDEX IF EXISTS idx_insp_completed');
}
