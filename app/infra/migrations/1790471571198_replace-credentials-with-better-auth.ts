import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("user_activation_tokens");
  pgm.dropTable("session");
  pgm.dropColumn("users", "password");

  pgm.addColumn("users", {
    email_verified: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    image: {
      type: "text",
    },
  });

  pgm.createTable("session", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },
    token: {
      type: "text",
      notNull: true,
      unique: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    ip_address: {
      type: "text",
    },
    user_agent: {
      type: "text",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.createTable("account", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    account_id: {
      type: "text",
      notNull: true,
    },
    provider_id: {
      type: "text",
      notNull: true,
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    access_token: {
      type: "text",
    },
    refresh_token: {
      type: "text",
    },
    id_token: {
      type: "text",
    },
    access_token_expires_at: {
      type: "timestamptz",
    },
    refresh_token_expires_at: {
      type: "timestamptz",
    },
    scope: {
      type: "text",
    },
    password: {
      type: "text",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createTable("verification", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    identifier: {
      type: "text",
      notNull: true,
    },
    value: {
      type: "text",
      notNull: true,
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
}

export const down = false;
