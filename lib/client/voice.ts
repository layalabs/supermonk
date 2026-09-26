/** Web Speech error codes → something a person can act on. */
export function voiceError(code: string): string {
  const iosOtherBrowser = typeof navigator !== "undefined" && /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return iosOtherBrowser
        ? "Voice works in Safari on iPhone. Open this page in Safari, or type."
        : "Allow the microphone and speech recognition, or type instead.";
    case "no-speech":
      return "Didn't hear anything. Tap the mic and speak, or type.";
    case "audio-capture":
      return "No microphone found. Type instead.";
    case "network":
      return "Voice needs a connection. Type instead.";
    case "aborted":
      return "";
    default:
      return `Voice didn't work (${code}). Type instead.`;
  }
}
