import { spawn } from "node:child_process";
import type { ChatMessage, Extracted } from "@/lib/types";
import { clarifySystem, clarifyUser, parseJsonReply, WHY_SYSTEM, whyUser } from "./prompts";
import type { ClarifyTurn, LlmAdapter, MonkSummary } from "./types";

// Dev only: shells out to the local Claude Code CLI so the flow can be tried without an API key.
function runClaude(system: string, user: string, timeoutMs = 45_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", "--output-format", "json", "--model", "sonnet", "--append-system-prompt", system], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("claude CLI timed out"));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude CLI exited ${code}: ${err.slice(0, 200)}`));
      try {
        const envelope = JSON.parse(out) as { result?: string };
        resolve(parseJsonReply(envelope.result ?? ""));
      } catch (e) {
        reject(e);
      }
    });
    child.stdin.end(user);
  });
}

export const claudeCliAdapter: LlmAdapter = {
  name: "claude-cli",
  async clarify(messages: ChatMessage[], known: Partial<Extracted>, today: string) {
    return (await runClaude(clarifySystem(today), clarifyUser(messages, known))) as ClarifyTurn;
  },
  async why(extracted: Extracted, monks: MonkSummary[]) {
    const out = (await runClaude(WHY_SYSTEM, whyUser(extracted, monks))) as { why?: Record<string, string> };
    return out.why ?? {};
  },
};
