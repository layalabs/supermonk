// Records the stage happy path into a webm (T12). Not a project dependency:
//   npm i --no-save puppeteer-core
//   npm run build && INVITES_PATH=/tmp/rec.json LLM=fixed DEMO_TODAY=2026-09-27 npx next start -p 3316
//   node scripts/record-demo.mjs /tmp/raw.webm   (needs Google Chrome and ffmpeg)
//   ffmpeg -i /tmp/raw.webm -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart docs/demo.mp4
import puppeteer from "puppeteer-core";

const BASE = "http://localhost:3316";
const OUT = process.argv[2] ?? "raw.webm";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
await page.goto(BASE + "/", { waitUntil: "networkidle0" });
await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
await page.goto(BASE + "/", { waitUntil: "networkidle0" });

const rec = await page.screencast({ path: OUT, fps: 30, speed: 1 });
const clickText = async (sel, text) => {
  const h = await page.waitForFunction(
    (s, t) => [...document.querySelectorAll(s)].find((e) => e.innerText.trim().startsWith(t)),
    { timeout: 15000 }, sel, text,
  );
  await h.asElement().tap();
};

await sleep(2500);
await page.tap("textarea");
await page.type("textarea", "I just moved into a condo and want a house blessing on Saturday", { delay: 45 });
await sleep(900);
await clickText("button", "Ask SuperMonk");

await page.waitForFunction(() => document.body.innerText.includes("Which area"), { timeout: 15000 });
await sleep(2200);
await clickText("button", "Nimman");

await page.waitForFunction(() => location.pathname === "/matching", { timeout: 15000 });
await sleep(1200);
await page.tap('[aria-label="Strike the singing bowl"]');
await sleep(900);
await page.tap('[aria-label="Strike the singing bowl"]');

await page.waitForFunction(() => location.pathname === "/matches", { timeout: 20000 });
await sleep(2500);
const carousel = '[aria-label="Matching monks"]';
await page.evaluate((s) => document.querySelector(s).scrollBy({ left: 330, behavior: "smooth" }), carousel);
await sleep(1600);
await page.evaluate((s) => document.querySelector(s).scrollBy({ left: 330, behavior: "smooth" }), carousel);
await sleep(1800);
await page.evaluate((s) => document.querySelector(s).scrollTo({ left: 0, behavior: "smooth" }), carousel);
await sleep(1500);
await page.tap('a[href="/monk/monk_01"]');

await page.waitForFunction(() => document.body.innerText.includes("Send invite"), { timeout: 15000 });
await sleep(2000);
await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
await sleep(1500);
await page.tap('input[placeholder^="Condo name"]');
await page.type('input[placeholder^="Condo name"]', "The Nimmana Condo, Soi 7, room 804", { delay: 35 });
await sleep(700);
await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
await sleep(1500);
await clickText("button", "Send invite");

await page.waitForFunction(() => location.pathname.startsWith("/invite/"), { timeout: 15000 });
const code = page.url().split("/invite/")[1];
await sleep(3500);
// The teammate taps Accept on /office.
await fetch(`${BASE}/api/office/invites/${code}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "accepted" }) });
await page.waitForFunction(() => document.body.innerText.includes("accepted"), { timeout: 15000 });
await sleep(2500);
for (let i = 0; i < 4; i++) {
  await page.evaluate(() => window.scrollBy({ top: 260, behavior: "smooth" }));
  await sleep(1300);
}
await sleep(2000);
await rec.stop();
await browser.close();
console.log("recorded", OUT, code);
