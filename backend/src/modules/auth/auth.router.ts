import { validateReqBody } from "@core/http/validate-req-body.middleware";
import { Router } from "express";
import { handleSignin, handleSignout, handleSignup, handleMe } from "./auth.handler";
import { SigninSchema } from "./signin.schema";
import { SignupSchema } from "./signup.schema";

const router = Router();

router.post("/auth/signup", validateReqBody(SignupSchema), handleSignup);
router.post("/auth/signin", validateReqBody(SigninSchema), handleSignin);
router.post("/auth/signout", handleSignout);
router.get("/auth/me", handleMe);

export { router as authRouter };
