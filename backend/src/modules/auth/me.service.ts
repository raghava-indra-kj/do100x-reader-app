import { MeInput, MeResult } from "./me.types";

export async function getMe(input: MeInput): Promise<MeResult> {
  void input;
  throw new Error("Not implemented");
}
