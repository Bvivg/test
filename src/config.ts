import dotenv from "dotenv";
import lodash from "lodash";

const { toInteger } = lodash;

dotenv.config();

export const config = {
  port: toInteger(process.env.PORT) || 3005,
  env: process.env.NODE_ENV || "development",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: toInteger(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "app",
    password: process.env.DB_PASSWORD || "app",
    name: process.env.DB_NAME || "app",
    connectRetries: toInteger(process.env.DB_CONNECT_RETRIES) || 5,
    connectDelayMs: toInteger(process.env.DB_CONNECT_DELAY_MS) || 2000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
    accessTtlMin: toInteger(process.env.ACCESS_TOKEN_TTL_MIN) || 10,
    refreshTtlDays: toInteger(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  },
  storageDir: process.env.STORAGE_DIR || "./storage",
  cookies: {
    accessName: "access_token",
    refreshName: "refresh_token",
    secure: process.env.COOKIE_SECURE === "true",
    sameSite:
      (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none" | undefined) ||
      "lax",
  },
};
