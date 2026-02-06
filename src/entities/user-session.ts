import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {AppBaseEntity} from "./app-base-entity.js";
import {User} from "./user.js";

@Entity({name: "user_sessions"})
export class UserSession extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.user_sessions, {onDelete: "CASCADE"})
  @JoinColumn({name: "user_id"})
  user: User;

  @Column({type: "varchar", length: 255, name: "device_id"})
  device_id: string;

  @Column({type: "char", length: 36, name: "access_jti"})
  access_jti: string;

  @Column({type: "char", length: 36, name: "refresh_jti"})
  refresh_jti: string;

  @Column({type: "varchar", length: 255, name: "refresh_token_hash"})
  refresh_token_hash: string;

  @Column({type: "datetime", name: "refresh_expires_at"})
  refresh_expires_at: Date;

  @Column({type: "datetime", name: "revoked_at", nullable: true})
  revoked_at: Date | null;
}
