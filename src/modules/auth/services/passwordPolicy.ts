export const MIN_NEW_PASSWORD_LENGTH = 15;

export function isNewPasswordAllowed(password: string): boolean {
  return password.length >= MIN_NEW_PASSWORD_LENGTH;
}

export function getNewPasswordLengthMessage(): string {
  return `Password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`;
}
