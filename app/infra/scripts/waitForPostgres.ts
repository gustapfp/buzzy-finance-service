import { getDBName } from "infra/utils";
import { ExecException } from "node:child_process";

const { exec } = require("node:child_process");

const MAX_RETRIES = 100;

export const waitForPostgres = (retries = 0): void => {
  if (retries >= MAX_RETRIES) {
    console.error("\n\n🔴 Postgres DB did not become ready after maximum retries.\n");
    process.exit(1);
  }

  const pgIsReady = `docker exec ${getDBName(process.env.NODE_ENV as string)} pg_isready --host localhost`;

  const handlePgIsReadyReturn = (err: ExecException | null, stdout: string, stderr: string) => {
    try {
      if (stdout.search("accepting connections") === -1) {
        setTimeout(() => {
          process.stdout.write(".");
          waitForPostgres(retries + 1);
        }, 500);
        return;
      }
      console.log("\n\n🟢 Postgres DB is ready!\n");
    } catch (err) {
      console.error("🔴 Error waiting for Postgres DB to be ready:\n", err);
      throw err;
    }
  };
  exec(pgIsReady, handlePgIsReadyReturn);
};

process.stdout.write("\n💭 Starting connection to Postgres DB...");
waitForPostgres();
