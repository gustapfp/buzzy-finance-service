import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("users", {
    id: {
      default: pgm.func("gen_random_uuid()"),
      type: "uuid",
      primaryKey: true,
    },
    username: {
      // Reference: https://docs.github.com/pt/enterprise-cloud@latest/admin/managing-iam/iam-configuration-reference/username-considerations-for-external-authentication
      type: "varchar(30)",
      unique: true,
      notNull: true,
    },
    password: {
      // Reference: https://security.stackexchange.com/questions/39849/does-bcrypt-have-a-maximum-password-length/39851#39851
      type: "varchar(60)",
      notNull: true,
    },
    email: {
      type: "varchar(80)",
      unique: true,
      notNull: true,
    },
    permission: {
      type: "varchar(12)",
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
}

export const down = false;
