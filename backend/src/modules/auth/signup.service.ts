import { prisma } from "@core/db/prisma";
import { hashPassword } from "@lib/password";
import { provisionHomepage } from "@modules/page/homepage.service";
import { UserError } from "@modules/user/errors/user-error";
import { USER_EMAIL_TAKEN } from "@modules/user/errors/user-error-codes";
import { generateUuid } from "@lib/uuid";
import { buildAuthResult, toAuthUser } from "./auth-result.builder";
import { AuthResult, AuthToken } from "./auth.models";
import { createSession } from "./session.service";
import { SignupInput, SignupInputSchema } from "./signup.models";

export async function signupUser(input: SignupInput): Promise<AuthResult> {
  const parsed = SignupInputSchema.parse(input);

  const existing = await prisma.appuser.findFirst({ where: { email: parsed.email } });
  if (existing) {
    throw new UserError({ errorCode: USER_EMAIL_TAKEN, message: "Email is already taken" });
  }

  const hashedPassword = await hashPassword(parsed.password);
  const userId = generateUuid();

  const { updatedUser, accessToken } = await prisma.$transaction(async (tx) => {
    await tx.appuser.create({
      data: {
        id: userId,
        name: parsed.name,
        email: parsed.email,
        password: hashedPassword,
        createdAt: new Date(),
      },
    });

    const updatedUser = await provisionHomepage({ tx, userId });
    const accessToken = await createSession({ tx, userId });

    return { updatedUser, accessToken };
  });

  const user = toAuthUser(updatedUser);
  const token: AuthToken = { accessToken };

  return buildAuthResult({ user, token });
}
