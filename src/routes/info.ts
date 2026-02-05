import { Router, Response } from "express";
import { AppDataSource } from "../data-source.js";
import { User } from "../entities/user.js";
import { AuthRequest } from "../middleware/auth.js";
import { sendError, sendOk } from "../utils/http.js";

const router = Router();

router.get("/info", async (req: AuthRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: req.auth?.userId } });
    if (!user)
      return sendError(res, 404, "Пользователь не найден");
    return sendOk(res, { id: user.email });
  } catch (err) {
    return sendError(res, 500, "Не удалось получить информацию");
  }
});

export const infoRouter = router;



