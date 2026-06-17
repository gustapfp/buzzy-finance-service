import { getDBName } from "infra/utils";
import { ExecException } from "node:child_process";

const { exec } = require("node:child_process");

export const waitForPostgres = (): void => {
  const pgIsReady = `docker exec ${getDBName(process.env.NODE_ENV as string)} pg_isready --host localhost`;

  const handlePgIsReadyReturn = (err: ExecException | null, stdout: string, stderr: string) => {
    try {
      if (stdout.search("accepting connections") === -1) {
        process.stdout.write(".");
        waitForPostgres();
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
