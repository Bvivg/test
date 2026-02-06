import express from "express";
import cors from "cors";
import fs from "fs";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { AppDataSource } from "./data-source.js";
import { authRouter } from "./routes/auth.js";
import { infoRouter } from "./routes/info.js";
import { filesRouter } from "./routes/files.js";
import { authMiddleware } from "./middleware/auth.js";
import { sendError } from "./utils/http.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const corsOptions: cors.CorsOptions = {
  // Allow any origin (reflects request Origin header).
  origin: (_, cb) => cb(null, true),
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.sendFile(path.join(rootDir, "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(rootDir, "index.html")));
app.get("/test.js", (req, res) => res.sendFile(path.join(rootDir, "test.js")));

if (!fs.existsSync(config.storageDir)) fs.mkdirSync(config.storageDir, { recursive: true });

app.use("/", authRouter);
app.use(authMiddleware);
app.use("/", infoRouter);
app.use("/", filesRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) =>
  err ? sendError(res, 500, "Внутренняя ошибка сервера") : next(),
);

const start = async () => {
  try {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= config.db.connectRetries; attempt += 1) {
      try {
        await AppDataSource.initialize();
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, config.db.connectDelayMs));
      }
    }
    if (lastError) throw lastError;

    app.listen(config.port, (error) => {
      if (error) {
        console.error("Не удалось запустить сервер:", error);
        process.exit(1);
      }
      console.log(`Сервер запущен на порту ${config.port}`);
    });
  } catch (err) {
    console.error("Не удалось запустить:", err);
    process.exit(1);
  }
};

void start();
