import "server-only";

export const normalizeEmail = (email: string) => {
  const trimmedEmail = email.trim();
  const lowerCasedEmail = trimmedEmail.toLowerCase();
  const normalized = lowerCasedEmail.replace(/\+.*(?=@)/, "");

  return normalized;
};
