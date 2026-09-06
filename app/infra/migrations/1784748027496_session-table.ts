import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("session", {
    id: {
      default: pgm.func("gen_random_uuid()"),
      type: "uuid",
      primaryKey: true,
      notNull: true,
    },
    token: {
      type: "text",
      unique: true,
      notNull: true,
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    user_agent: {
      // https://stackoverflow.com/questions/654921/how-big-can-a-user-agent-string-get
      type: "text",
      notNull: true,
    },
    created_at: {
      // Reference: https://justatheory.com/2012/04/postgres-use-timestamptz/
      default: pgm.func("timezone('utc', now())"),
      type: "timestamptz",
      notNull: true,
    },
    updated_at: {
      // Reference: https://justatheory.com/2012/04/postgres-use-timestamptz/
      default: pgm.func("timezone('utc', now())"),
      type: "timestamptz",
      notNull: true,
    },
  });
  pgm.createIndex("session", "token");
}

export const down = false;
