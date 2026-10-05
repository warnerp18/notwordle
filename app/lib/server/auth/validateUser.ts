import "server-only";
import z from "zod";

const User = z.object({
  email: z.email({ error: "Enter a valid email address" }),
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
