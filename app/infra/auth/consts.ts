export const SALT_ROUNDS: number = process.env.NODE_ENV == "local" ? 1 : Number(process.env.SALT_ROUNDS);
export const APP_SECRET = process.env.APP_SECRET;
