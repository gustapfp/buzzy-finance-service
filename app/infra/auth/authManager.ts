import bcrypt from "bcrypt";
import { SALT_ROUNDS, APP_SECRET } from "./consts";

export const hashPassword = async (password: string): Promise<string> => {
  const hash = await bcrypt.hashSync(`${password}.${APP_SECRET}`, SALT_ROUNDS);
  return hash;
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compareSync(`${password}.${APP_SECRET}`, hash);
};

export const authManager = {
  hashPassword,
  comparePassword,
};
