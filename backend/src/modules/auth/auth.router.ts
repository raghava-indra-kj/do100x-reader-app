import { Router } from "express";
import { authMiddleware } from "@core/http/auth.middleware";
import { validateReqBody } from "@core/http/validate-req-body.middleware";
import { handleSignup, handleSignin, handleSignout, handleMe } from "./auth.handler";
import { SignupInputSchema } from "./signup.models";
import { SigninInputSchema } from "./signin.models";

const router = Router();

router.post("/auth/signup", validateReqBody(SignupInputSchema), handleSignup);
router.post("/auth/signin", validateReqBody(SigninInputSchema), handleSignin);
router.post("/auth/signout", authMiddleware, handleSignout);
router.get("/auth/me", authMiddleware, handleMe);

export { router as authRouter };
