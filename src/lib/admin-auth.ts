export const ADMIN_AUTH_COOKIE = "admin-auth";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

const encoder = new TextEncoder();

function getAdminPassword(): string | undefined {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length > 0 ? password : undefined;
}

function getAdminSessionSecret(): string | undefined {
  const secret = process.env.ADMIN_SESSION_SECRET || getAdminPassword();
  return secret && secret.length > 0 ? secret : undefined;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let i = 0; i < length; i += 1) {
    difference |= (leftBytes[i] ?? 0) ^ (rightBytes[i] ?? 0);
  }

  return difference === 0;
}

async function signAdminSessionPayload(
  payload: string,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return bytesToHex(signature);
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminPassword() && getAdminSessionSecret());
}

export async function isValidAdminPassword(candidate: unknown): Promise<boolean> {
  const password = getAdminPassword();

  if (!password || typeof candidate !== "string") {
    return false;
  }

  return constantTimeEqual(candidate, password);
}

export async function createAdminSessionCookie(): Promise<string> {
  const secret = getAdminSessionSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be set");
  }

  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const signature = await signAdminSessionPayload(issuedAt, secret);

  return `${issuedAt}.${signature}`;
}

export async function isValidAdminSessionCookie(
  value: string | undefined
): Promise<boolean> {
  const secret = getAdminSessionSecret();

  if (!secret || !value) {
    return false;
  }

  const [issuedAt, signature] = value.split(".");
  const issuedAtSeconds = Number.parseInt(issuedAt ?? "", 10);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (
    !issuedAt ||
    !signature ||
    !Number.isFinite(issuedAtSeconds) ||
    issuedAtSeconds > nowSeconds ||
    nowSeconds - issuedAtSeconds > ADMIN_SESSION_MAX_AGE_SECONDS
  ) {
    return false;
  }

  const expectedSignature = await signAdminSessionPayload(issuedAt, secret);

  return constantTimeEqual(signature, expectedSignature);
}
