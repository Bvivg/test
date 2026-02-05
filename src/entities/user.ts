import { Column, Entity, OneToMany } from "typeorm";
import { AppBaseEntity } from "./app-base-entity.js";
import { UserSession } from "./user-session.js";
import { FileEntity } from "./file-entity.js";

@Entity({ name: "users" })
export class User extends AppBaseEntity {
  @Column({ type: "varchar", length: 255, unique: true, name: "email" })
  email: string;

  @Column({ type: "varchar", length: 255, name: "password_hash" })
  password_hash: string;

  @OneToMany(() => UserSession, (session) => session.user)
  user_sessions: UserSession[];

  @OneToMany(() => FileEntity, (file) => file.user)
  files: FileEntity[];
}
