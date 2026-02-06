import jwt from "jsonwebtoken";
import {v4} from "uuid";
import {config} from "../config.js";

export const accessTtlSeconds = config.jwt.accessTtlMin * 60;

export const signAccessToken = (userId: string, deviceId: string) => {
  const jti = v4();
  const secret: jwt.Secret = config.jwt.secret;
  const expiresIn: jwt.SignOptions["expiresIn"] = accessTtlSeconds;
  const token = jwt.sign(
    {sub: String(userId), jti, typ: "access", deviceId},
    secret,
    {expiresIn}
  );
  return {token, jti, expiresIn: accessTtlSeconds};
};

export const signRefreshToken = (userId: string, deviceId: string) => {
  const jti = v4();
  const secret: jwt.Secret = config.jwt.refreshSecret;
  const expiresIn: jwt.SignOptions["expiresIn"] = `${config.jwt.refreshTtlDays}d`;
  const token = jwt.sign(
    {sub: String(userId), jti, typ: "refresh", deviceId},
    secret,
    {expiresIn}
  );
  return {token, jti};
};

