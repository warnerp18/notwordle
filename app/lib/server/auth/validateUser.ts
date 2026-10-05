import "server-only";
import z from "zod";

const User = z.object({
  // trim first, then check: phone keyboards often add a space after autocomplete
  email: z
    .string()
    .trim()
    .pipe(z.email({ error: "Enter a valid email address" })),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" }),
});

export const validateUser = ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const result = User.safeParse({ email, password });

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0].message,
    };
  }
  return { success: true };
};
