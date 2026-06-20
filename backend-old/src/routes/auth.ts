import { Router } from "express";
import { randomBytes, randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../prisma";
import { AppError } from "../errors";
import {
  AUTH_EMAIL_TAKEN,
  AUTH_INVALID_CREDENTIALS,
  AUTH_REQUIRED,
  VALIDATION_ERROR,
} from "../error-codes";
import { ensureHomepage } from "../lib/ensure-homepage";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ---------------------------------------------------------------------------
// POST /signup
// ---------------------------------------------------------------------------
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    // Validation
    if (!name || name.trim().length === 0) {
      throw new AppError(VALIDATION_ERROR, 400, "Name is required.");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(VALIDATION_ERROR, 400, "A valid email is required.");
    }
    if (!password || password.length < 6) {
      throw new AppError(
        VALIDATION_ERROR,
        400,
        "Password must be at least 6 characters."
      );
    }

    // Check email uniqueness
    const existing = await prisma.appuser.findFirst({
      where: { email },
    });
    if (existing) {
      throw new AppError(AUTH_EMAIL_TAKEN, 409, "Email is already taken.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = randomUUID();
    const now = new Date();

    // Create user (no homepageId yet)
    await prisma.appuser.create({
      data: {
        id: userId,
        name: name.trim(),
        email,
        password: hashedPassword,
        createdAt: now,
      },
    });

    // Create homepage
    const homepageId = await ensureHomepage(userId);

    // Create session
    const token = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        userId,
        token,
        isActive: true,
        createdAt: now,
      },
    });

    res.status(201).json({ token, userId, name: name.trim(), email, homepageId });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new AppError(
        VALIDATION_ERROR,
        400,
        "Email and password are required."
      );
    }

    const user = await prisma.appuser.findFirst({ where: { email } });
    if (!user) {
      throw new AppError(
        AUTH_INVALID_CREDENTIALS,
        401,
        "Invalid email or password."
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new AppError(
        AUTH_INVALID_CREDENTIALS,
        401,
        "Invalid email or password."
      );
    }

    // Ensure homepage exists
    const homepageId = await ensureHomepage(user.id);

    // Create session
    const token = randomBytes(32).toString("hex");
    const now = new Date();
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        isActive: true,
        createdAt: now,
      },
    });

    res.status(200).json({
      token,
      userId: user.id,
      name: user.name,
      email: user.email,
      homepageId,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /session — validate current session (e.g. on app reload)
// ---------------------------------------------------------------------------
router.get("/session", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        AUTH_REQUIRED,
        401,
        "You must be logged in to do this."
      );
    }

    const token = authHeader.slice(7);
    const session = await prisma.session.findFirst({
      where: { token, isActive: true },
    });

    if (!session) {
      throw new AppError(
        AUTH_REQUIRED,
        401,
        "You must be logged in to do this."
      );
    }

    const user = await prisma.appuser.findUniqueOrThrow({
      where: { id: session.userId },
    });

    const homepageId = await ensureHomepage(session.userId);

    res.status(200).json({
      userId: user.id,
      name: user.name,
      email: user.email,
      homepageId,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /session — logout (deactivate session)
// ---------------------------------------------------------------------------
router.delete("/session", requireAuth, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization!;
    const token = authHeader.slice(7);

    await prisma.session.updateMany({
      where: { token },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
