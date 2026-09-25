// Drives the «Хүсэлт илгээх» form on the LIVE site in a real phone-sized browser and
// reports exactly what a visitor sees at each step, and how long each step takes.
//
// It submits ONE real request, so it puts one message on the owner's phone and one in
// the owner's inbox. The lead is unmistakably fake: name «TEST — Claude», a business
// that says it is not a business, and 00000000 as the phone (no Mongolian number
// starts with 0). Run it only from .github/workflows/demo-form-e2e.yml.
//
// Not part of the build: scripts/ is outside `eslint src` and Vite never imports it.

import { chromium, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE_URL = (process.env.BASE_URL || "https://dalatech.online").replace(/\/+$/, "");
const OUT = process.env.OUT_DIR || "e2e-out";
mkdirSync(OUT, { recursive: true });

const LEAD = {
  name: "TEST — Claude",
  business: "TEST — Claude (бодит бизнес биш)",
  phone: "00000000",
  note: "Claude-ийн автомат шалгалт. Бодит хүсэлт биш — хариу өгөх шаардлагагүй, устгаж болно.",
};

const report = { baseUrl: BASE_URL, lead: LEAD, steps: [], startedAt: new Date().toISOString() };
const t0 = Date.now();
const mark = (step, extra = {}) => {
  const entry = { step, atMs: Date.now() - t0, ...extra };
  report.steps.push(entry);
  console.log(JSON.stringify(entry));
};

async function visibleText(locator) {
  try {
    return (await locator.innerText({ timeout: 5000 })).replace(/\s+\n/g, "\n").trim();
  } catch (error) {
    return `(could not read: ${error.message.split("\n")[0]})`;
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"], locale: "mn-MN" });
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log(`[browser console error] ${msg.text()}`);
});

try {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
  mark("page_domcontentloaded");
  await page.waitForLoadState("load", { timeout: 45000 }).catch(() => {});
  mark("page_load");

  // Any «Хүсэлт илгээх» button opens the dialog; take the first one a visitor can see.
  const openers = page.getByRole("button", { name: /Хүсэлт илгээх/ });
  const count = await openers.count();
  let opened = false;
  for (let i = 0; i < count && !opened; i += 1) {
    const b = openers.nth(i);
    if (!(await b.isVisible().catch(() => false))) {
      await b.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    }
    if (await b.isVisible().catch(() => false)) {
      await b.click();
      opened = true;
    }
  }
  if (!opened) throw new Error(`no visible «Хүсэлт илгээх» button (found ${count})`);
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  mark("dialog_open", { visible: await visibleText(dialog) });
  await page.screenshot({ path: `${OUT}/1-services.png` });

  await dialog.getByRole("button", { name: /Хараахан шийдээгүй/ }).click();
  await dialog.getByRole("button", { name: /Үргэлжлүүлэх/ }).click();
  await page.locator("#demo-business").fill(LEAD.business);
  mark("step_business", { visible: await visibleText(dialog) });
  await page.screenshot({ path: `${OUT}/2-business.png` });

  await dialog.getByRole("button", { name: /Үргэлжлүүлэх/ }).click();
  await page.locator("#demo-name").fill(LEAD.name);
  await page.locator("#demo-phone").fill(LEAD.phone);
  await page.locator("#demo-note").fill(LEAD.note);
  mark("step_contact", { visible: await visibleText(dialog) });
  await page.screenshot({ path: `${OUT}/3-contact.png` });

  const responsePromise = page.waitForResponse(
    (r) => r.url().includes("/api/demo-request") && r.request().method() === "POST",
    { timeout: 30000 }
  );
  const clickedAt = Date.now();
  await dialog.getByRole("button", { name: /^Хүсэлт илгээх$/ }).click();
  mark("submit_clicked");
  // What the visitor sees while it is sending.
  await page.waitForTimeout(150);
  mark("while_sending", { visible: await visibleText(dialog) });

  const response = await responsePromise;
  let body = null;
  try { body = await response.json(); } catch { body = await response.text().catch(() => null); }
  mark("api_response", { status: response.status(), body, msFromClick: Date.now() - clickedAt });

  const success = dialog.getByText("Хүсэлт хүлээн авлаа.");
  const failure = dialog.getByRole("alert");
  await Promise.race([
    success.waitFor({ state: "visible", timeout: 30000 }),
    failure.waitFor({ state: "visible", timeout: 30000 }),
  ]);
  const ok = await success.isVisible().catch(() => false);
  mark(ok ? "success_visible" : "failure_visible", {
    msFromClick: Date.now() - clickedAt,
    visible: await visibleText(dialog),
  });
  await page.screenshot({ path: `${OUT}/4-result.png` });
  report.outcome = ok ? "success_shown" : "failure_shown";
} catch (error) {
  report.outcome = "script_error";
  report.error = error.message;
  console.log(`SCRIPT ERROR: ${error.message}`);
  await page.screenshot({ path: `${OUT}/error.png` }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log("REPORT " + JSON.stringify(report));
  await browser.close();
}

if (report.outcome !== "success_shown") process.exit(1);
