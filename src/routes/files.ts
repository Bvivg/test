import {Response, Router} from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {v4 as uuidv4} from "uuid";
import {AppDataSource} from "../data-source.js";
import {config} from "../config.js";
import {FileEntity} from "../entities/file-entity.js";
import {AuthRequest} from "../middleware/auth.js";
import {sendError, sendOk} from "../utils/http.js";

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
};

ensureDir(config.storageDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.storageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({storage});
const router = Router();

const getParamId = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

router.post(
  "/file/upload",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return sendError(res, 400, "Файл обязателен");

      const fileRepo = AppDataSource.getRepository(FileEntity);
      const extension = path.extname(req.file.originalname).replace(".", "");

      const record = await fileRepo.save({
        user: {id: req.auth?.userId},
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        extension: extension || "",
        mime_type: req.file.mimetype,
        size: String(req.file.size),
      });

      return res.status(201).json({
        id: record.id,
        original_name: record.original_name,
        extension: record.extension,
        mime_type: record.mime_type,
        size: record.size,
        uploaded_at: record.uploaded_at,
      });
    } catch (err) {
      return sendError(res, 500, "Не удалось загрузить файл");
    }
  }
);

router.get("/file/list", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return sendError(res, 401, "Не авторизован");

    const listSize = Number.parseInt(req.query.list_size as string, 10);
    const page = Number.parseInt(req.query.page as string, 10);
    const take = Number.isNaN(listSize) || listSize <= 0 ? 10 : listSize;
    const currentPage = Number.isNaN(page) || page <= 0 ? 1 : page;
    const skip = (currentPage - 1) * take;

    const fileRepo = AppDataSource.getRepository(FileEntity);
    const [rows, total] = await fileRepo.findAndCount({
      where: {user: {id: userId}},
      order: {uploaded_at: "DESC"},
      take,
      skip,
    });

    return sendOk(res, {
      page: currentPage,
      list_size: take,
      total,
      items: rows.map((row) => ({
        id: row.id,
        original_name: row.original_name,
        extension: row.extension,
        mime_type: row.mime_type,
        size: row.size,
        uploaded_at: row.uploaded_at,
      })),
    });
  } catch (err) {
    return sendError(res, 500, "Не удалось получить список файлов");
  }
});

router.get("/file/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return sendError(res, 401, "Не авторизован");

    const fileId = getParamId(req.params.id);
    if (!fileId) return sendError(res, 400, "Неверный id");

    const fileRepo = AppDataSource.getRepository(FileEntity);
    const file = await fileRepo.findOne({
      where: {id: fileId, user: {id: userId}},
    });
    if (!file) return sendError(res, 404, "Файл не найден");
    return sendOk(res, {
      id: file.id,
      original_name: file.original_name,
      extension: file.extension,
      mime_type: file.mime_type,
      size: file.size,
      uploaded_at: file.uploaded_at,
    });
  } catch (err) {
    return sendError(res, 500, "Не удалось получить файл");
  }
});

router.get("/file/download/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return sendError(res, 401, "Не авторизован");

    const fileId = getParamId(req.params.id);
    if (!fileId) return sendError(res, 400, "Неверный id");

    const fileRepo = AppDataSource.getRepository(FileEntity);
    const file = await fileRepo.findOne({
      where: {id: fileId, user: {id: userId}},
    });
    if (!file) return sendError(res, 404, "Файл не найден");
    const fullPath = path.join(config.storageDir, file.stored_name);
    if (!fs.existsSync(fullPath))
      return sendError(
        res,
        404,
        "Файл отсутствует на диске"
      );
    return res.download(fullPath, file.original_name);
  } catch (err) {
    return sendError(res, 500, "Не удалось скачать файл");
  }
});

router.delete("/file/delete/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return sendError(res, 401, "Не авторизован");

    const fileId = getParamId(req.params.id);
    if (!fileId) return sendError(res, 400, "Неверный id");

    const fileRepo = AppDataSource.getRepository(FileEntity);
    const file = await fileRepo.findOne({
      where: {id: fileId, user: {id: userId}},
    });
    if (!file) return sendError(res, 404, "Файл не найден");

    const fullPath = path.join(config.storageDir, file.stored_name);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await fileRepo.remove(file);
    return sendOk(res, {ok: true});
  } catch (err) {
    return sendError(res, 500, "Не удалось удалить файл");
  }
});

router.put(
  "/file/update/:id",
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) return sendError(res, 401, "Не авторизован");

      const fileId = getParamId(req.params.id);
      if (!fileId) return sendError(res, 400, "Неверный id");

      if (!req.file) return sendError(res, 400, "Файл обязателен");

      const fileRepo = AppDataSource.getRepository(FileEntity);
      const file = await fileRepo.findOne({
        where: {id: fileId, user: {id: userId}},
      });
      if (!file) return sendError(res, 404, "Файл не найден");

      const oldPath = path.join(config.storageDir, file.stored_name);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      const extension = path.extname(req.file.originalname).replace(".", "");
      file.original_name = req.file.originalname;
      file.stored_name = req.file.filename;
      file.extension = extension || "";
      file.mime_type = req.file.mimetype;
      file.size = String(req.file.size);

      const updated = await fileRepo.save(file);
      return sendOk(res, {
        id: updated.id,
        original_name: updated.original_name,
        extension: updated.extension,
        mime_type: updated.mime_type,
        size: updated.size,
        uploaded_at: updated.uploaded_at,
      });
    } catch (err) {
      return sendError(res, 500, "Не удалось обновить файл");
    }
  }
);

export const filesRouter = router;




