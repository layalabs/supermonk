// iOS WebKit (Safari and Chrome on iPhone) needs more than ctx.resume() to make a sound:
// - resume() only takes inside a gesture WebKit counts as activation: touchend / click,
//   not pointerdown or touchstart, so callers must also run this from one of those;
// - playing a one-sample silent buffer inside that gesture is what actually unlocks output;
// - the ringer switch mutes Web Audio unless the page's audio session is "playback" (iOS 17+).
// Idempotent: once the context is running only the session type is (re)checked.

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export function wakeAudio(ctx: AudioContext): void {
  const session = typeof navigator === "undefined" ? undefined : (navigator as AudioSessionNavigator).audioSession;
  if (session && session.type !== "playback") session.type = "playback";
  if (ctx.state !== "suspended" && ctx.state !== ("interrupted" as AudioContextState)) return;
  const silence = ctx.createBufferSource();
  silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  silence.connect(ctx.destination);
  silence.start(0);
  void ctx.resume().catch(() => undefined);
}
