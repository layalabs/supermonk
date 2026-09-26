// Records the desktop happy path (docs/demo-desktop.mp4) over raw CDP. No project dependency.
//   npm run build && STORE=json LLM=fixed DEMO_TODAY=2026-09-27 npm run start -- -p 3216
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
//     --remote-debugging-port=9337 --user-data-dir=/tmp/chrome-demo --window-size=1440,900 \
//     --force-device-scale-factor=2 --hide-scrollbars
//   (the screencast only emits device pixels when Chrome itself runs at scale 2; the CDP
//   emulation override alone yields 1440x900 frames)
//   node scripts/record-demo-desktop.mjs /tmp/demo-frames   (prints the ffmpeg encode line at the end)
// 1440x900 CSS px at device scale factor 2, so the frames are 2880x1800. Every click is a real
// mouse event at the element's centre; the text is typed key by key. The invite is a real one
// (data/invites.json); the temple office reply is a POST to /api/office/invites/<code>.
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.ORIGIN ?? "http://localhost:3216";
const CDP = process.env.CDP ?? "http://127.0.0.1:9337";
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
await sleep(2500);

// 1. Home: two bowls, then the question.
await moveTo(1100, 600, 500);
await click('button[aria-label^="Strike bowl 2"]');
stamp("bowl 2");
await sleep(650);
await click('button[aria-label^="Strike bowl 4"]');
stamp("bowl 4");
await sleep(500);
await still("1-home");
await sleep(1200);
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
await sleep(2200);
await still("2-chat");
await click("button", "Nimman");
stamp("Nimman pill");

// 3. Matching: the flying monk.
await waitFor("location.pathname === '/matching'", "matching");
await sleep(1500);
await still("3-matching");

// 4. Matches: grid, map with popover, grid, Phra Somchai.
await waitFor("location.pathname === '/matches' && document.querySelectorAll('a[href^=\"/monk/\"]').length >= 3", "matches grid");
const cards = await evaluate("document.querySelectorAll('a[href^=\"/monk/\"]').length");
stamp(`matches grid with ${cards} cards`);
await moveTo(720, 620, 500);
await sleep(3200);
await click("button", "Map");
stamp("Map view");
{
  const start = Date.now();
  let state = "loading";
  while (Date.now() - start < 20000) {
    state = await evaluate(
      "(() => { const t = document.body.innerText; if (t.includes('not reachable')) return 'failed'; if (document.querySelector('.maplibregl-canvas') && !t.includes('Loading the map') && document.querySelector('.sm-pin--hot')) return 'ready'; return 'loading'; })()",
    );
    if (state !== "loading") break;
    await sleep(250);
  }
  stamp(`map ${state}, hot pins ${await evaluate("document.querySelectorAll('.sm-pin--hot').length")}`);
}
await sleep(2200);
{
  // The pin is a rendered button; the popover opens on click, so hover first, then click.
  const pin = await centre(".sm-pin--hot");
  await moveTo(pin.x, pin.y - 8, 700);
  await sleep(700);
  await clickAt(pin.x, pin.y - 8);
  stamp("pin clicked");
  await waitFor("/wat /i.test(document.querySelector('.maplibregl-popup')?.innerText ?? '')", "popover", 5000).catch((e) => problems.push(e.message));
  stamp(`popover: ${await evaluate("(document.querySelector('.maplibregl-popup')?.innerText ?? 'none').split('\\n').slice(1, 4).join(' / ')")}`);
  await sleep(1000);
  await moveTo(pin.x + 40, pin.y - 140, 500);
  await sleep(1800);
  await still("4-map");
  await sleep(800);
}
await click("button", "Grid");
stamp("Grid view");
await sleep(2200);
await click('a[href="/monk/monk_01"]');
stamp("Phra Somchai card");

// 5. Monk: Sat 3 Oct morning, ฿500, send.
await waitFor("location.pathname === '/monk/monk_01' && document.body.innerText.includes('Send invite')", "monk page");
await sleep(2400);
await click('button[aria-label="Sat 3 Oct Morning"]');
stamp("Sat 3 Oct morning");
await sleep(1200);
await click("button", "฿500");
stamp("฿500");
await sleep(1200);
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
await sleep(3500);
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
