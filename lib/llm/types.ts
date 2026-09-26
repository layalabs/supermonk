import type { ChatMessage, Extracted } from "@/lib/types";

export type ClarifyTurn = { ready: boolean; question?: string; pills?: string[]; extracted: Partial<Extracted> };
export type MonkSummary = { id: string; name: string; temple: string; languages: string[]; distanceKm: number | null;
  yearsOrdained: number; availableOnDate: boolean; bio: string };

export interface LlmAdapter {
  name: "anthropic" | "claude-cli" | "fixed";
  clarify(messages: ChatMessage[], known: Partial<Extracted>, today: string): Promise<ClarifyTurn>;
  why(extracted: Extracted, monks: MonkSummary[]): Promise<Record<string, string>>;
}
