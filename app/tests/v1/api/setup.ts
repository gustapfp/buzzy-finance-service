import { config } from "dotenv";

config({ path: ".env.development", quiet: true });
process.env.LOG_LEVEL = "silent";
