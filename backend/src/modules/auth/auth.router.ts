import { validateReqBody } from "@core/http/validate-req-body.middleware";
import { Router } from "express";
import { handleSignin, handleSignout, handleSignup, handleMe } from "./auth.handler";
import { SigninSchema } from "./signin.schema";
import { SignupInputSchema } from "./signup.models";

const router = Router();

router.post("/auth/signup", validateReqBody(SignupInputSchema), handleSignup);
router.post("/auth/signin", validateReqBody(SigninSchema), handleSignin);
router.post("/auth/signout", handleSignout);
router.get("/auth/me", handleMe);

export { router as authRouter };
