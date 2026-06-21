import { SignupInput } from "./signup.models";
import { AuthResult } from "./auth.models";

export async function signupUser(input: SignupInput): Promise<AuthResult> {
  void input;
  throw new Error("Not implemented");
}
