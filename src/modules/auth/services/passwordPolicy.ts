export const MIN_NEW_PASSWORD_LENGTH = 12;

export function isNewPasswordAllowed(password: string): boolean {
  return password.length >= MIN_NEW_PASSWORD_LENGTH;
}

export function getNewPasswordLengthMessage(): string {
  return `Password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`;
}
