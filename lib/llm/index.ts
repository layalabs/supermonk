import { execFileSync } from "node:child_process";
import { anthropicAdapter } from "./anthropic";
import { claudeCliAdapter } from "./claude-cli";
import { fixedAdapter } from "./fixed";
import type { LlmAdapter } from "./types";

export type { LlmAdapter, MonkSummary } from "./types";
export { fixedAdapter } from "./fixed";

function claudeOnPath(): boolean {
  if (process.env.VERCEL) return false;
  try {
    execFileSync("claude", ["--version"], { stdio: "ignore", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

let adapter: LlmAdapter | undefined;

/** LLM=anthropic|claude-cli|fixed; default anthropic if a key is set, else claude-cli if on PATH, else fixed. */
export function getLlm(): LlmAdapter {
  if (adapter) return adapter;
  const key = process.env.ANTHROPIC_API_KEY;
  const kind = process.env.LLM ?? (key ? "anthropic" : claudeOnPath() ? "claude-cli" : "fixed");
  if (kind === "anthropic") {
    if (!key) throw new Error("LLM=anthropic needs ANTHROPIC_API_KEY");
    adapter = anthropicAdapter(key);
  } else if (kind === "claude-cli") adapter = claudeCliAdapter;
  else if (kind === "fixed") adapter = fixedAdapter;
  else throw new Error(`unknown LLM=${kind} (expected anthropic, claude-cli or fixed)`);
  return adapter;
}
