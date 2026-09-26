import type { OtpProvider } from "./types";

export const MOCK_OTP_CODE = "1234";

/** Accepts "1234" for any phone. Nothing is sent anywhere. */
export const mockOtp: OtpProvider = {
  name: "mock",
  async send() {},
  async check(_phone, code) {
    return code.trim() === MOCK_OTP_CODE;
  },
};

/**
 * OTP=mock is the only value today. To add a real channel, implement OtpProvider in this
 * folder (e.g. `otp-sms.ts` for Twilio Verify, `otp-line.ts` for LINE Login where `send`
 * returns the authorize URL and `check` exchanges the code) and add its name here.
 */
export function getOtpProvider(): OtpProvider {
  const kind = process.env.OTP ?? "mock";
  if (kind === "mock") return mockOtp;
  throw new Error(`unknown OTP=${kind} (only mock is implemented)`);
}

/** Loose E.164: optional +, 8–15 digits. Spaces and dashes are stripped first. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/[\s\-().]/g, "");
  return /^\+?\d{8,15}$/.test(s) ? s : null;
}

/** "+66812345678" -> "+66•••••••78". Country code and last two digits stay readable. */
export function maskPhone(phone: string): string {
  const plus = phone.startsWith("+") ? "+" : "";
  const digits = phone.replace(/\D/g, "");
  const cc = plus ? digits.slice(0, 2) : "";
  const rest = digits.slice(cc.length);
  return `${plus}${cc}${"•".repeat(Math.max(rest.length - 2, 0))}${rest.slice(-2)}`;
}
