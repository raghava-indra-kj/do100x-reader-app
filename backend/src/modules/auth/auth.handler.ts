import { Request, Response } from "express";
import { SigninInput } from "./signin.models";
import { SignoutInput } from "./signout.models";
import { MeInput } from "./me.models";
import { signupUser } from "./signup.service";
import { signinUser } from "./signin.service";
import { signoutUser } from "./signout.service";
import { getMe } from "./me.service";

export async function handleSignup(req: Request, res: Response): Promise<void> {
  const result = await signupUser(req.body);
  res.status(201).json(result);
}

export async function handleSignin(req: Request, res: Response): Promise<void> {
  const result = await signinUser(req.body as SigninInput);
  res.status(200).json(result);
}

export async function handleSignout(req: Request, res: Response): Promise<void> {
  const input: SignoutInput = { sessionToken: req.headers.authorization ?? "" };
  await signoutUser(input);
  res.status(204).send();
}

export async function handleMe(req: Request, res: Response): Promise<void> {
  const input: MeInput = { sessionToken: req.headers.authorization ?? "" };
  const result = await getMe(input);
  res.status(200).json(result);
}
