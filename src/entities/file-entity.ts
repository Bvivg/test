import {Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,} from "typeorm";
import {AppBaseEntity} from "./app-base-entity.js";
import {User} from "./user.js";

@Entity({name: "files"})
export class FileEntity extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.files, {onDelete: "CASCADE"})
  @JoinColumn({name: "user_id"})
  user: User;

  @Column({type: "varchar", length: 255, name: "original_name"})
  original_name: string;

  @Column({type: "varchar", length: 255, name: "stored_name"})
  stored_name: string;

  @Column({type: "varchar", length: 20, name: "extension"})
  extension: string;

  @Column({type: "varchar", length: 100, name: "mime_type"})
  mime_type: string;

  @Column({type: "bigint", name: "size"})
  size: string;

  @CreateDateColumn({name: "uploaded_at"})
  uploaded_at: Date;
}
