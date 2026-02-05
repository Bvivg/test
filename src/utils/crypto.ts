import bcrypt from "bcryptjs";

const saltRounds = 10;

export const hashValue = async (value: string) =>
  bcrypt.hash(value, await bcrypt.genSalt(saltRounds));

export const compareValue = (value: string, hash: string) =>
  bcrypt.compare(value, hash);
