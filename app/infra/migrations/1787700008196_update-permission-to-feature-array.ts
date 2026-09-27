import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn("users", "permission", {
    type: "text[]",
    using: "CASE WHEN permission IS NULL THEN ARRAY[]::text[] ELSE ARRAY[permission]::text[] END",
    notNull: true,
    default: "{}",
  });
}

export const down = false;
