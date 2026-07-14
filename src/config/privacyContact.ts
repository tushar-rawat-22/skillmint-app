export const PRIVACY_CONTACT_ENV = "SKILLMINT_PRIVACY_CONTACT_EMAIL";

export type PrivacyContactStatus = {
  status: "configured" | "missing" | "malformed";
  email: string | null;
  href: string | null;
  releaseReady: boolean;
};

export function getPrivacyContact(): PrivacyContactStatus {
  return resolvePrivacyContact(process.env[PRIVACY_CONTACT_ENV] ?? "");
}

export function resolvePrivacyContact(value: string): PrivacyContactStatus {
  const email = value.trim();
  if (!email) {
    return { status: "missing", email: null, href: null, releaseReady: false };
  }
  if (!isValidPrivacyEmail(email)) {
    return { status: "malformed", email: null, href: null, releaseReady: false };
  }
  return {
    status: "configured",
    email,
    href: `mailto:${email}`,
    releaseReady: true,
  };
}

export function isValidPrivacyEmail(value: string): boolean {
  return value.length <= 254 &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(value);
}
