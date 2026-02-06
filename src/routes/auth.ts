import {Request, Response, Router} from "express";
import jwt from "jsonwebtoken";
import {AppDataSource} from "../data-source.js";
import {config} from "../config.js";
import {signAccessToken, signRefreshToken} from "../utils/tokens.js";
import {authMiddleware, AuthRequest} from "../middleware/auth.js";
import {User} from "../entities/user.js";
import {UserSession} from "../entities/user-session.js";
import {IsNull} from "typeorm";
import {sendError, sendOk} from "../utils/http.js";
import {compareValue, hashValue} from "../utils/crypto.js";

const router = Router();

const getDeviceId = (req: Request) => {
  return (
    (req.headers["x-device-id"] as string | undefined) ||
    (req.body?.device_id as string | undefined) ||
    (req.query?.device_id as string | undefined) ||
    null
  );
};

const issueTokens = async (user: User, deviceId: string) => {
  const sessionRepo = AppDataSource.getRepository(UserSession);
  const access = signAccessToken(String(user.id), deviceId);
  const refresh = signRefreshToken(String(user.id), deviceId);
  const refreshHash = await hashValue(refresh.token);
  const refreshPayload = jwt.decode(refresh.token) as jwt.JwtPayload;

  await sessionRepo.save({
    user,
    device_id: deviceId,
    access_jti: access.jti,
    refresh_jti: refresh.jti,
    refresh_token_hash: refreshHash,
    refresh_expires_at: new Date((refreshPayload.exp || 0) * 1000),
    revoked_at: null,
  });

  return {
    access_token: access.token,
    refresh_token: refresh.token,
    token_type: "Bearer",
    expires_in: access.expiresIn,
  };
};

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  const accessMaxAgeMs = config.jwt.accessTtlMin * 60 * 1000;
  const refreshMaxAgeMs = config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000;
  const cookieOptions = {
    httpOnly: true,
    secure: config.cookies.secure || config.env === "production",
    sameSite: config.cookies.sameSite,
    path: "/",
  } as const;

  res.cookie(config.cookies.accessName, accessToken, {
    ...cookieOptions,
    maxAge: accessMaxAgeMs,
  });
  res.cookie(config.cookies.refreshName, refreshToken, {
    ...cookieOptions,
    maxAge: refreshMaxAgeMs,
  });
};

const clearAuthCookies = (res: Response) => {
  const cookieOptions = {
    httpOnly: true,
    secure: config.cookies.secure || config.env === "production",
    sameSite: config.cookies.sameSite,
    path: "/",
  } as const;

  res.clearCookie(config.cookies.accessName, cookieOptions);
  res.clearCookie(config.cookies.refreshName, cookieOptions);
};

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const email = req.body?.email as string | undefined;
    const password = req.body?.password as string | undefined;
    if (!email || !password) return sendError(res, 400, "email и пароль обязательны");

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOne({where: {email}});
    if (existing) return sendError(res, 409, "Пользователь уже существует");

    const passwordHash = await hashValue(password);
    const user = await userRepo.save({
      email,
      password_hash: passwordHash,
    });

    const deviceId = getDeviceId(req) || `device-${user.id}-${Date.now()}`;
    const tokens = await issueTokens(user, deviceId);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);

    return res.status(201).json(tokens);
  } catch (err) {
    console.error("Ошибка при регистрации:", err);
    return sendError(res, 500, "Не удалось зарегистрироваться");
  }
});

router.post("/signin", async (req: Request, res: Response) => {
  try {
    const email = req.body?.email as string | undefined;
    const password = req.body?.password as string | undefined;
    if (!email || !password) return sendError(res, 400, "email и пароль обязательны");

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({where: {email}});
    if (!user) return sendError(res, 401, "Неверные учетные данные");

    const ok = await compareValue(password, user.password_hash);
    if (!ok) return sendError(res, 401, "Неверные учетные данные");

    const deviceId = getDeviceId(req) || `device-${user.id}-${Date.now()}`;
    const tokens = await issueTokens(user, deviceId);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return sendOk(res, tokens);
  } catch (err) {
    console.error("Ошибка при входе:", err);
    return sendError(res, 500, "Не удалось войти");
  }
});

router.post("/signin/new_token", async (req: Request, res: Response) => {
  try {
    const refreshToken =
      (req.cookies?.[config.cookies.refreshName] as string | undefined) ||
      (req.body?.refresh_token as string | undefined);
    if (!refreshToken) return sendError(res, 400, "refresh_token обязателен");

    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as jwt.JwtPayload;
    if (payload.typ !== "refresh") return sendError(res, 401, "Неверный тип токена");

    const sessionRepo = AppDataSource.getRepository(UserSession);
    if (!payload.jti) return sendError(res, 401, "Неверный refresh токен");

    const session = await sessionRepo.findOne({
      where: {refresh_jti: payload.jti as string, revoked_at: IsNull()},
      relations: ["user"],
    });

    if (!session) return sendError(res, 401, "Refresh токен отозван");

    if (session.refresh_expires_at.getTime() < Date.now())
      return sendError(res, 401, "Refresh токен истек");

    const matches = await compareValue(refreshToken, session.refresh_token_hash);
    if (!matches) return sendError(res, 401, "Неверный refresh токен");

    const user = session.user;
    const deviceId = (payload.deviceId as string) || session.device_id;
    const access = signAccessToken(String(user.id), deviceId);
    const refresh = signRefreshToken(String(user.id), deviceId);
    const refreshHash = await hashValue(refresh.token);
    const refreshPayload = jwt.decode(refresh.token) as jwt.JwtPayload;

    session.access_jti = access.jti;
    session.refresh_jti = refresh.jti;
    session.refresh_token_hash = refreshHash;
    session.refresh_expires_at = new Date((refreshPayload.exp || 0) * 1000);
    await sessionRepo.save(session);

    setAuthCookies(res, access.token, refresh.token);

    return sendOk(res, {
      access_token: access.token,
      refresh_token: refresh.token,
      token_type: "Bearer",
      expires_in: access.expiresIn,
    });
  } catch (err) {
    console.error("Ошибка при обновлении токена:", err);
    return sendError(res, 401, "Неверный refresh токен");
  }
});

router.get("/logout", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessionRepo = AppDataSource.getRepository(UserSession);
    const accessJti = req.auth?.jti;
    if (!accessJti) return sendError(res, 401, "Неверный токен");

    const session = await sessionRepo.findOne({
      where: {access_jti: accessJti, revoked_at: IsNull()},
    });

    if (session) {
      session.revoked_at = new Date();
      await sessionRepo.save(session);
    }
    clearAuthCookies(res);

    return sendOk(res, {ok: true});
  } catch (err) {
    console.error("Ошибка при выходе:", err);
    return sendError(res, 500, "Не удалось выйти");
  }
});

export const authRouter = router;
