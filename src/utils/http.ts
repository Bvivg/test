import { Response } from "express";

export const sendError = (res: Response, status: number, message: string) =>
  res.status(status).json({ error: message });

export const sendOk = <T>(res: Response, payload: T) => res.json(payload);
