import type { Area, Language, Monk, ServiceId, Slot } from "@/lib/types";

export type LineRole = "office" | "monk";

/** A LINE user on the temple side: a temple office (steward) or a monk. */
export type LineProfile = {
  lineUserId: string;
  role: LineRole;
  displayName: string;
  templeId?: string;
  monkIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** Monk record created through LINE onboarding; same shape as the seed plus provenance. */
export type LineMonk = Monk & {
  source: "line";
  lineUserId?: string;
  officeLineUserId?: string;
  status: "active" | "pending_temple";
  areas: Area[];
};

export type OnboardForm = {
  role: LineRole;
  name: string;
  templeId?: string;
  templeName?: string;
  services: ServiceId[];
  areas: Area[];
  languages: Language[];
  weekly: Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", Slot[]>>;
  monks?: { name: string }[];
  travels?: boolean;
};

/** A LINE message object (text or flex); kept loose because the Flex schema is large. */
export type LineMessage = { type: "text"; text: string; quickReply?: unknown } | { type: "flex"; altText: string; contents: unknown };

export interface LineAdapter {
  name: "line" | "mock";
  push(to: string, messages: LineMessage[]): Promise<void>;
  reply(replyToken: string, messages: LineMessage[]): Promise<void>;
}
