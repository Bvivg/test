import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./config.js";
import { User } from "./entities/user.js";
import { UserSession } from "./entities/user-session.js";
import { FileEntity } from "./entities/file-entity.js";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: config.db.host,
  port: config.db.port,
  username: config.db.user,
  password: config.db.password,
  database: config.db.name,
  entities: [User, UserSession, FileEntity],
  synchronize: true,
});
