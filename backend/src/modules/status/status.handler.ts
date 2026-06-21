import { Request, Response } from "express";

export function handleStatus(_req: Request, res: Response): void {
    res.json({ success: true });
}
