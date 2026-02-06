import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { config } from "../config.js";
import { UserSession } from "../entities/user-session.js";
import { sendError } from "../utils/http.js";

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    jti: string;
    deviceId?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization || "";
    const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    const cookieToken = req.cookies?.[config.cookies.accessName] as
      | string
      | undefined;
    const token = headerToken || cookieToken;
    if (!token)
      return sendError(res, 401, "Отсутствует access токен");

    const payload = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    if (payload.typ !== "access")
      return sendError(res, 401, "Неверный тип токена");
    if (!payload.jti) return sendError(res, 401, "Неверный токен");

    const sessionRepo = AppDataSource.getRepository(UserSession);
    const session = await sessionRepo.findOne({
      where: { access_jti: payload.jti as string, revoked_at: IsNull() },
      relations: ["user"],
    });
    if (!session) return sendError(res, 401, "Токен отозван");

    req.auth = {
      userId: String(payload.sub),
      jti: payload.jti as string,
      deviceId: payload.deviceId as string | undefined,
    };

    return next();
  } catch (err) {
    return sendError(res, 401, "Не авторизован");
  }
};


