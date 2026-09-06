import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("user_activation_tokens", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    token: {
      type: "uuid",
      notNull: true,
      default: pgm.func("gen_random_uuid()"),
      unique: true,
    },
    used_at: {
      type: "timestamp",
      notNull: false,
    },
    expires_at: {
      type: "timestamp",
      notNull: true,
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
}

export const down = false;
