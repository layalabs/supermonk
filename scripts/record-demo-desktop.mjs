// Records the desktop happy path (docs/demo-desktop.mp4) over raw CDP. No project dependency.
//   npm run build && STORE=json LLM=fixed DEMO_TODAY=2026-09-27 npm run start -- -p 3219
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
//     --remote-debugging-port=9339 --user-data-dir=/tmp/chrome-demo --window-size=1440,900 \
//     --force-device-scale-factor=2 --hide-scrollbars
//   (the screencast only emits device pixels when Chrome itself runs at scale 2; the CDP
//   emulation override alone yields 1440x900 frames)
//   node scripts/record-demo-desktop.mjs /tmp/demo-frames   (prints the ffmpeg encode line at the end)
// 1440x900 CSS px at device scale factor 2, so the frames are 2880x1800. Every click is a real
// mouse event at the element's centre; the text is typed key by key. The invite is a real one
// (data/invites.json); the temple office reply is a POST to /api/office/invites/<code>.
//
// Stages: home (bowls, gongs, the typed ask) -> chat (Nimman pill) -> matching (one full breath,
// then it leaves by itself) -> matches (desktop split: temple list + illustrated map; the Wat Suan
// Dok card lights its symbol and opens the popover; Phra Somchai's Invite) -> monk (Sat 3 Oct
// morning, 500 THB, send) -> invite (pending, office accepts, confirmation card).
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.ORIGIN ?? "http://localhost:3219";
const CDP = process.env.CDP ?? "http://127.0.0.1:9339";
const OUT = process.argv[2] ?? "/tmp/demo-frames";
const W = 1440, H = 900, DSF = 2;
const QUERY = "I just moved into a condo and want a house blessing on Saturday";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
fs.mkdirSync(path.join(OUT, "stills"), { recursive: true });

const { webSocketDebuggerUrl } = await (await fetch(`${CDP}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const problems = [];
const frames = []; // { file, t } t = ms since recording start
let t0 = 0;
let frameNo = 0;
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    return;
  }
  if (msg.method === "Page.screencastFrame") {
    const file = path.join(OUT, "frames", `${String(frameNo++).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(msg.params.data, "base64"));
    frames.push({ file, t: performance.now() - t0 });
    ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId: msg.params.sessionId } }));
  } else if (msg.method === "Runtime.exceptionThrown") {
    problems.push(`exception ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  } else if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
    problems.push(`${msg.params.type} ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => pending.has(i) && (pending.delete(i), reject(new Error(`timeout ${method}`))), 30000);
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
const waitFor = async (expression, label, timeout = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${label}`);
};
const stamp = (label) => {
  const t = performance.now() - t0;
  marks.push({ label, t });
  console.log(`${(t / 1000).toFixed(1).padStart(5)} s  ${label}`);
};
const marks = [];
const still = async (name) => {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, "stills", `${name}.png`), Buffer.from(shot.data, "base64"));
  stamp(`still ${name}`);
};

// Centre of the first element matching selector (and optional exact/leading text), in CSS px.
const centre = async (selector, text) => {
  const r = await evaluate(
    `(() => { const t = ${JSON.stringify(text ?? "")}; const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => !t || e.textContent.trim().startsWith(t)); if (!el) return null; el.scrollIntoView({ block: "nearest" }); const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; })()`,
  );
  if (!r) throw new Error(`no element ${selector} ${text ?? ""}`);
  return r;
};
let mouse = { x: W / 2, y: H / 2 };
// Glide the pointer so hover states and the cursor path read naturally on the projector.
const moveTo = async (x, y, ms = 350) => {
  const steps = Math.max(4, Math.round(ms / 25));
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = 1 - Math.pow(1 - k, 3);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: mouse.x + (x - mouse.x) * e, y: mouse.y + (y - mouse.y) * e });
    await sleep(ms / steps);
  }
  mouse = { x, y };
};
const clickAt = async (x, y) => {
  await moveTo(x, y);
  await sleep(120);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(70);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
};
const click = async (selector, text) => {
  const c = await centre(selector, text);
  await clickAt(c.x, c.y);
};
const type = async (text, delay = 42) => {
  for (const ch of text) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, key: ch, unmodifiedText: ch });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
    await sleep(delay + Math.random() * 30);
  }
};
const pressEnter = async () => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: `${ORIGIN}/` });
await sleep(1500);
await evaluate("sessionStorage.clear(); localStorage.clear(); 'ok'");
await send("Page.navigate", { url: `${ORIGIN}/` });
await waitFor("!!document.querySelector('#ask')", "home");
await sleep(600);

t0 = performance.now();
await send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * DSF, maxHeight: H * DSF, everyNthFrame: 1 });
stamp("recording starts on /");
await moveTo(980, 520, 900);
await sleep(3200);

// 1. Home: the game is the hero. Two bowls, switch to gongs, two gongs, then the question.
await click('button[aria-label^="Strike bowl 2"]');
stamp("bowl 2");
await sleep(900);
await click('button[aria-label^="Strike bowl 4"]');
stamp("bowl 4");
await sleep(1100);
await click('section[data-instrument] [role="group"][aria-label="Instrument set"] button', "Gongs");
stamp("Gongs");
await sleep(1100);
await click('button[aria-label^="Strike gong 1"]');
stamp("gong 1");
await sleep(1000);
await click('button[aria-label^="Strike gong 3"]');
stamp("gong 3");
await sleep(1000);
await still("1-home");
await sleep(1000);
await click("#ask");
await sleep(400);
await type(QUERY);
await sleep(900);
await pressEnter();
stamp("Enter on the ask box");

// 2. Chat: the area question, tap Nimman.
await waitFor("location.pathname === '/chat' && document.body.innerText.includes('Which area')", "area question");
await sleep(400);
await moveTo(700, 520, 400);
await sleep(2500);
await still("2-chat");
await click("button", "Nimman");
stamp("Nimman pill");

// 3. Matching: the seated monk meditates for at least one full breath, then the page leaves by itself.
await waitFor("location.pathname === '/matching'", "matching");
await moveTo(720, 700, 600);
await sleep(2500);
await still("3-matching");
await waitFor("location.pathname === '/matches'", "matches (breath gate)", 40000);

// 4. Matches: temple list left, illustrated map right. The Wat Suan Dok card lights its symbol and opens the popover.
await waitFor("document.querySelectorAll('article[data-temple]').length >= 1 && !!document.querySelector('[aria-label=\"Illustrated map of Chiang Mai temples\"]')", "matches split");
const cards = await evaluate("document.querySelectorAll('article[data-temple]').length");
stamp(`matches split with ${cards} temple cards, view ${await evaluate("[...document.querySelectorAll('[aria-label=\"Results view\"] button')].find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent")}`);
await moveTo(360, 560, 500);
await sleep(3000);
await click('article[data-temple="wat_suan_dok"] button[aria-label^="Wat Suan Dok"]');
stamp("Wat Suan Dok card");
await sleep(300);
await waitFor("document.querySelector('button[data-temple=\"wat_suan_dok\"]')?.getAttribute('aria-expanded') === 'true' && !!document.querySelector('[role=\"dialog\"][aria-label=\"Matched monks at this temple\"]')", "popover", 5000).catch((e) => problems.push(e.message));
stamp(`popover: ${await evaluate("(document.querySelector('[role=\"dialog\"][aria-label=\"Matched monks at this temple\"]')?.innerText ?? 'none').split('\\n').filter(Boolean).slice(0, 4).join(' / ')")}`);
{
  const sym = await centre('button[data-temple="wat_suan_dok"]');
  await moveTo(sym.x + 30, sym.y + 60, 700);
}
await sleep(2300);
await still("4-matches");
await sleep(700);
await click('[role="dialog"] a[href="/monk/monk_01"]');
stamp("Phra Somchai Invite (popover)");

// 5. Monk: Sat 3 Oct morning, 500 THB, send.
await waitFor("location.pathname === '/monk/monk_01' && !!document.querySelector('button[aria-label=\"Sat 3 Oct Morning\"]')", "monk page");
await sleep(3000);
await click('button[aria-label="Sat 3 Oct Morning"]');
stamp("Sat 3 Oct morning");
await sleep(1200);
await click("button", "฿500");
stamp("฿500");
await sleep(1500);
await still("5-monk");
await sleep(500);
await click("button", "Send invite");
stamp("Send invite");

// 6. Invite: pending, then the office accepts.
await waitFor("location.pathname.startsWith('/invite/') && document.body.innerText.includes('Invite sent')", "invite pending");
const code = await evaluate("location.pathname.split('/invite/')[1]");
stamp(`invite ${code} pending`);
await moveTo(720, 760, 600);
await sleep(2500);
const res = await fetch(`${ORIGIN}/api/office/invites/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "accepted" }) });
stamp(`office accepted -> ${res.status}`);
await waitFor("document.body.innerText.includes('accepted')", "accepted card");
stamp("confirmation card");
await sleep(1200);
await still("6-accepted");
await sleep(3400);
await send("Page.stopScreencast");
stamp("recording ends");
await sleep(300);

// Screencast frames arrive whenever the compositor paints (up to ~60/s, nothing while the page is
// still). Resample to a constant 30 fps: each tick links to the most recent frame at that time.
const END = performance.now() - t0;
const FPS = 30;
fs.mkdirSync(path.join(OUT, "seq"), { recursive: true });
let k = 0, tick = 0;
for (let n = 0; tick < END && frames.length; n++, tick = (n * 1000) / FPS) {
  while (k + 1 < frames.length && frames[k + 1].t <= tick) k++;
  fs.symlinkSync(frames[k].file, path.join(OUT, "seq", `${String(n).padStart(5, "0")}.jpg`));
}
fs.writeFileSync(path.join(OUT, "marks.json"), JSON.stringify({ code, durationMs: END, marks, problems }, null, 2));
console.log(`frames ${frames.length}, ${(END / 1000).toFixed(1)} s, invite ${code}, console problems ${problems.length}`);
for (const p of problems) console.log("  ", p);
console.log(`encode: ffmpeg -y -framerate ${FPS} -i ${OUT}/seq/%05d.jpg -vf "scale=1920:1200:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 21 -movflags +faststart docs/demo-desktop.mp4`);
await send("Page.close").catch(() => undefined);
ws.close();
process.exit(0);
