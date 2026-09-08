/**
 * POST /api/demo-request — demo request intake for the public site.
 *
 * Contract with the visitor: they only ever see a success message when the
 * request has actually left this function through at least one channel. If
 * every channel fails we return an error so the browser can keep what they
 * typed and offer them a direct way through. Nothing is dropped silently.
 *
 * The lead is also written to the runtime log before any delivery is
 * attempted, so it can still be read back from the Vercel logs in the worst
 * case where both Telegram and email are down at once. Runtime log retention
 * is short, so treat that as a same-day rescue, not an archive.
 *
 * Required environment variables (set in the Vercel project, never in code):
 *   TELEGRAM_BOT_TOKEN   bot token from @BotFather
 *   TELEGRAM_CHAT_ID     chat/user id the notification is sent to
 *   GMAIL_USER           gmail address used to send the notification
 *   GMAIL_APP_PASSWORD   16-character Google app password for GMAIL_USER
 * Optional:
 *   DEMO_NOTIFY_EMAIL    recipient of the notification (defaults to GMAIL_USER)
 */

import nodemailer from "nodemailer";

// Kept well under the function's maxDuration so a hung channel can never eat
// the whole budget and take the healthy channel down with it.
const TELEGRAM_TIMEOUT_MS = 6000;
const EMAIL_TIMEOUT_MS = 8000;

const MAX_BODY_BYTES = 20 * 1024;

// Mirrors the chips offered in the form. Anything else is ignored rather than
// rejected — an unknown key must never cost us a real lead. Website + chatbot
// selected together is the combo package; there is no separate key for it.
const SERVICE_LABELS = {
  ara: "Ара — AI хүлээн авагч",
  nova: "Нова — AI харилцагчийн үйлчилгээ",
  veda: "Веда — AI шинжээч",
  eho: "Эхо — AI утасны оператор",
  website: "Вэбсайт",
  chatbot: "AI Чатбот",
  voice: "AI Дуут агент",
  unsure: "Мэдэхгүй байна — зөвлөгөө хэрэгтэй",
};

const FIELD_LIMITS = {
  name: 80,
  phone: 32,
  business: 120,
  note: 1000,
  email: 160,
  page: 200,
  locale: 12,
};

/* ------------------------------------------------------------------ utils */

function clean(value, max) {
  if (typeof value !== "string") return "";
  // Drop control characters that would corrupt the Telegram/email payload,
  // but keep newline and tab so a multi-line note survives intact.
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Escapes quotes as well as angle brackets: some of these values land inside
 * HTML *attributes* in the email body, where a bare quote would break out of
 * the attribute. Telegram only needs & < > but the extra escaping is harmless
 * there.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalises a Mongolian phone number for display and for the tel: link.
 * Deliberately permissive: the browser already asks for 8 digits, and a real
 * person who types something unusual should still reach us rather than be
 * turned away by a regex.
 */
function normalisePhone(raw) {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.replace(/^976/, "");
  if (local.length === 8) {
    return {
      display: `${local.slice(0, 4)} ${local.slice(4)}`,
      e164: `+976${local}`,
      digits,
    };
  }
  return { display: raw, e164: digits ? `+${digits}` : "", digits };
}

const UB_TIME_ZONE = "Asia/Ulaanbaatar";

/**
 * Formats an instant as Ulaanbaatar wall-clock time, with the UTC offset it
 * used printed alongside.
 *
 * The offset is not decoration. Ulaanbaatar is UTC+8 and US Eastern is UTC-4 —
 * exactly twelve hours apart — so on a 12-hour clock the two read identically,
 * minutes and all. Reading these notifications from abroad, a correct
 * conversion is indistinguishable from no conversion at all unless the offset
 * is stated. It cost us an afternoon once; it stays.
 *
 * Resolved through the IANA zone rather than a hard-coded +8: Mongolia has no
 * DST today but observed it as recently as 2016, and this keeps working if it
 * ever comes back.
 */
function ulaanbaatarTimestamp(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const part = (type) => {
    const found = parts.find((p) => p.type === type);
    return found ? found.value : "";
  };
  // "GMT+08:00" is what the platform calls it; "UTC+08:00" is what everyone
  // else does. Fall back to the fixed offset if the runtime lacks full ICU.
  const offset = (part("timeZoneName") || "GMT+08:00").replace("GMT", "UTC");

  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")} (Улаанбаатар, ${offset})`;
}

async function readJsonBody(req) {
  // Vercel's Node runtime parses application/json for us, but a proxy or a
  // beacon-style send can still hand us a raw string or nothing at all.
  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString("utf8"));
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    return JSON.parse(req.body);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("body_too_large");
    chunks.push(chunk);
  }
  if (!chunks.length) throw new Error("empty_body");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/* ---------------------------------------------------------- rate limiting */

// Deliberately generous. Mongolian mobile carriers put many subscribers behind
// one address, so a tight per-IP cap would turn away real people; this only has
// to stop a script hammering the endpoint hard enough to burn Gmail's daily
// send quota or bury the owner's phone. It lives in the instance's memory, so
// it is a speed bump across the instances Vercel happens to keep warm, not a
// guarantee — a determined flood still needs a stateful limiter in front.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_PER_IP = 30;
const RATE_MAX_TOTAL = 120;
const rateHits = new Map();

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded.length) return String(forwarded[0]).trim();
  return req.headers["x-real-ip"] || "unknown";
}

function rateLimited(ip, now) {
  for (const [key, times] of rateHits) {
    const kept = times.filter((t) => now - t < RATE_WINDOW_MS);
    if (kept.length) rateHits.set(key, kept);
    else rateHits.delete(key);
  }

  let total = 0;
  for (const times of rateHits.values()) total += times.length;
  if (total >= RATE_MAX_TOTAL) return "global";

  const mine = rateHits.get(ip) || [];
  if (mine.length >= RATE_MAX_PER_IP) return "per_ip";

  mine.push(now);
  rateHits.set(ip, mine);
  return null;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_timeout_after_${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* ------------------------------------------------------------ validation */

function parseLead(raw, req) {
  const name = clean(raw.name, FIELD_LIMITS.name);
  const phoneRaw = clean(raw.phone, FIELD_LIMITS.phone);
  const business = clean(raw.business, FIELD_LIMITS.business);
  const note = clean(raw.note, FIELD_LIMITS.note);
  const email = clean(raw.email, FIELD_LIMITS.email);

  const errors = [];
  if (name.length < 2) errors.push("name");
  if (business.length < 2) errors.push("business");

  const phone = normalisePhone(phoneRaw);
  // 6–15 digits covers every real Mongolian mobile, landline and +976 form.
  if (phone.digits.length < 6 || phone.digits.length > 15) errors.push("phone");

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push("email");

  const services = Array.isArray(raw.services)
    ? raw.services.filter((s) => Object.prototype.hasOwnProperty.call(SERVICE_LABELS, s))
    : [];

  if (errors.length) {
    const err = new Error("validation_failed");
    err.fields = errors;
    throw err;
  }

  return {
    requestId: clean(raw.requestId, 64) || `dt-${Date.now().toString(36)}`,
    name,
    phone,
    business,
    services,
    note,
    email,
    page: clean(raw.page, FIELD_LIMITS.page),
    locale: clean(raw.locale, FIELD_LIMITS.locale),
    // Honeypot hits are still delivered — a false positive must never cost a
    // real lead — but they are flagged so they can be recognised at a glance.
    suspectedBot: Boolean(clean(raw.website, 200)),
    receivedAt: new Date(),
    userAgent: clean(req.headers["user-agent"], 300),
    referer: clean(req.headers["referer"] || req.headers["referrer"], 300),
  };
}

/* ----------------------------------------------------------- formatting */

function serviceList(lead) {
  if (!lead.services.length) return "Заагаагүй";
  return lead.services.map((s) => SERVICE_LABELS[s]).join(", ");
}

/**
 * The same message in two flavours. `useHtml` produces the formatted version;
 * the plain one is the fallback if Telegram ever rejects the markup, so a
 * formatting problem can never cost us the notification itself.
 */
function telegramMessage(lead, useHtml) {
  const v = (value) => (useHtml ? escapeHtml(value) : String(value));
  const b = (label) => (useHtml ? `<b>${escapeHtml(label)}</b>` : label);

  const lines = [];
  if (lead.suspectedBot) lines.push(`⚠️ ${b("СЭЖИГТЭЙ (спам байж болзошгүй)")}`, "");
  lines.push(
    `🔔 ${b("Шинэ демо хүсэлт")}`,
    "",
    `👤 ${b("Нэр:")} ${v(lead.name)}`,
    `📞 ${b("Утас:")} ${v(lead.phone.e164 || lead.phone.display)}`,
    `🏢 ${b("Бизнес:")} ${v(lead.business)}`,
    `🎯 ${b("Сонирхож буй:")} ${v(serviceList(lead))}`
  );
  if (lead.email) lines.push(`✉️ ${b("Имэйл:")} ${v(lead.email)}`);
  if (lead.note) lines.push("", `💬 ${b("Тайлбар:")}`, v(lead.note));
  lines.push(
    "",
    `🕒 ${v(ulaanbaatarTimestamp(lead.receivedAt))}`,
    `🌐 ${v(lead.page || "/")} · ${v(lead.locale || "mn")}`,
    // Printed here too, not only in the email: a poor mobile connection can
    // make the browser resend a request whose response was lost, and this is
    // what tells two identical notifications apart from two real enquiries.
    `#${v(lead.requestId)}`
  );
  return lines.join("\n");
}

function emailSubject(lead) {
  const flag = lead.suspectedBot ? "[Сэжигтэй] " : "";
  return `${flag}Шинэ демо хүсэлт — ${lead.name} (${lead.business})`;
}

function emailText(lead) {
  const lines = [];
  if (lead.suspectedBot) {
    lines.push("ЖИЧ: спам-эсрэг талбар дүүрсэн — сэжигтэй хүсэлт байж болзошгүй.", "");
  }
  lines.push(
    "Шинэ демо хүсэлт",
    "",
    `Нэр:            ${lead.name}`,
    `Утас:           ${lead.phone.e164 || lead.phone.display}`,
    `Бизнес:         ${lead.business}`,
    `Сонирхож буй:   ${serviceList(lead)}`
  );
  if (lead.email) lines.push(`Имэйл:          ${lead.email}`);
  if (lead.note) lines.push("", "Тайлбар:", lead.note);
  lines.push(
    "",
    `Хүлээн авсан:   ${ulaanbaatarTimestamp(lead.receivedAt)}`,
    `Хуудас:         ${lead.page || "/"}`,
    `Хэл:            ${lead.locale || "mn"}`,
    `Хүсэлтийн ID:   ${lead.requestId}`
  );
  return lines.join("\n");
}

function emailHtml(lead) {
  const e = escapeHtml;
  const row = (label, value) =>
    `<tr>` +
    `<td style="padding:8px 16px 8px 0;color:#8B9FC4;font-size:13px;white-space:nowrap;vertical-align:top">${e(label)}</td>` +
    `<td style="padding:8px 0;color:#F0F4FF;font-size:15px;font-weight:600">${value}</td>` +
    `</tr>`;

  const phoneCell = lead.phone.e164
    ? `<a href="tel:${e(lead.phone.e164)}" style="color:#38BDF8;text-decoration:none">${e(lead.phone.e164)}</a>`
    : e(lead.phone.display);

  const rows = [
    row("Нэр", e(lead.name)),
    row("Утас", phoneCell),
    row("Бизнес", e(lead.business)),
    row("Сонирхож буй", e(serviceList(lead))),
    lead.email
      ? row(
          "Имэйл",
          `<a href="mailto:${e(lead.email)}" style="color:#38BDF8;text-decoration:none">${e(lead.email)}</a>`
        )
      : "",
  ].join("");

  const noteBlock = lead.note
    ? `<div style="margin-top:24px;padding:16px;border-radius:12px;background:#0D1430;border:1px solid rgba(255,255,255,0.08)">` +
      `<p style="margin:0 0 6px;color:#8B9FC4;font-size:12px;text-transform:uppercase;letter-spacing:.12em">Тайлбар</p>` +
      `<p style="margin:0;color:#F0F4FF;font-size:15px;line-height:1.6;white-space:pre-wrap">${e(lead.note)}</p>` +
      `</div>`
    : "";

  const botBanner = lead.suspectedBot
    ? `<p style="margin:0 0 16px;padding:10px 14px;border-radius:10px;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.35);color:#FDE68A;font-size:13px">` +
      `Спам-эсрэг талбар дүүрсэн байна — сэжигтэй хүсэлт байж болзошгүй.</p>`
    : "";

  return `<!doctype html>
<html lang="mn"><body style="margin:0;padding:24px;background:#050A18;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:28px;border-radius:18px;background:#0A1024;border:1px solid rgba(56,189,248,0.18)">
    ${botBanner}
    <p style="margin:0;color:#38BDF8;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">DalaTech</p>
    <h1 style="margin:8px 0 24px;color:#F0F4FF;font-size:22px;font-weight:700">Шинэ демо хүсэлт</h1>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    ${noteBlock}
    <p style="margin:24px 0 0;color:#5A6E94;font-size:12px;line-height:1.7">
      ${e(ulaanbaatarTimestamp(lead.receivedAt))}<br>
      Хуудас: ${e(lead.page || "/")} · Хэл: ${e(lead.locale || "mn")}<br>
      Хүсэлтийн ID: ${e(lead.requestId)}
    </p>
  </div>
</body></html>`;
}

/* -------------------------------------------------------------- channels */

async function sendTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    const err = new Error("telegram_not_configured");
    err.notConfigured = true;
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  const attempt = async (useHtml) => {
    const body = {
      chat_id: chatId,
      text: telegramMessage(lead, useHtml),
      disable_web_page_preview: true,
    };
    if (useHtml) body.parse_mode = "HTML";

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`telegram_http_${response.status}: ${detail.slice(0, 300)}`);
    }
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(`telegram_api_error: ${JSON.stringify(payload).slice(0, 300)}`);
    }
    return "sent";
  };

  try {
    return await attempt(true);
  } catch (error) {
    // The shared AbortController means the retry fails instantly if the
    // budget is already spent, so this cannot double the worst case. Losing
    // the notification to a markup problem would be far worse than the
    // duplicate this risks if the first send landed but its reply did not.
    if (controller.signal.aborted) throw error;
    console.error("demo-request: telegram HTML send failed, retrying as plain text:", error.message);
    return attempt(false);
  } finally {
    clearTimeout(timer);
  }
}

async function sendEmail(lead) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    const err = new Error("email_not_configured");
    err.notConfigured = true;
    throw err;
  }
  const to = process.env.DEMO_NOTIFY_EMAIL || user;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // Google app passwords are usually shown in groups of four; the spaces are
    // not part of the secret and Gmail rejects them if they are sent through.
    auth: { user, pass: pass.replace(/\s+/g, "") },
    // Every stage gets its own ceiling; the outer withTimeout is the backstop.
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
  });

  try {
    await transporter.sendMail({
      from: `"DalaTech вэбсайт" <${user}>`,
      to,
      subject: emailSubject(lead),
      text: emailText(lead),
      html: emailHtml(lead),
      // Replying to the notification reaches the visitor when they left an
      // address, and falls back to our own inbox when they did not.
      replyTo: lead.email || undefined,
    });
    return "sent";
  } finally {
    transporter.close();
  }
}

/* --------------------------------------------------------------- handler */

export default async function handler(req, res) {
  // Health check: lets the deployment be verified without exposing any secret
  // value — it only ever reports whether a channel has been configured.
  //
  // environment and commit are here because "missing" has two very different
  // causes: the variable was never set for this environment, or it was set
  // after this deployment was built. Vercel binds environment variables at
  // deploy time, so a build older than the variables will keep reporting
  // missing until it is redeployed, and these two fields are what tell the
  // two apart at a glance.
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      endpoint: "demo-request",
      environment: process.env.VERCEL_ENV || "unknown",
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "unknown",
      channels: {
        telegram:
          process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
            ? "configured"
            : "missing",
        email:
          process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? "configured" : "missing",
      },
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const ip = clientIp(req);
  const throttled = rateLimited(ip, Date.now());
  if (throttled) {
    console.error(`demo-request: rate limited (${throttled}) for ${ip}`);
    res.setHeader("Retry-After", String(Math.ceil(RATE_WINDOW_MS / 1000)));
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  let lead;
  try {
    const raw = await readJsonBody(req);
    lead = parseLead(raw, req);
  } catch (error) {
    if (error.message === "validation_failed") {
      return res.status(400).json({ ok: false, error: "validation_failed", fields: error.fields });
    }
    console.error("demo-request: could not read request body:", error.message);
    return res.status(400).json({ ok: false, error: "bad_request" });
  }

  // Written before any delivery attempt so the lead survives in the runtime
  // logs even if every channel is down.
  console.log(
    "demo-request lead:",
    JSON.stringify({
      requestId: lead.requestId,
      name: lead.name,
      phone: lead.phone.e164 || lead.phone.display,
      business: lead.business,
      services: lead.services,
      email: lead.email || null,
      note: lead.note || null,
      page: lead.page,
      locale: lead.locale,
      suspectedBot: lead.suspectedBot,
      receivedAt: lead.receivedAt.toISOString(),
      // The rendered local string too, so a log check can verify what the
      // notification actually said without re-deriving it.
      receivedAtLocal: ulaanbaatarTimestamp(lead.receivedAt),
      userAgent: lead.userAgent,
      referer: lead.referer,
    })
  );

  const [telegram, email] = await Promise.allSettled([
    withTimeout(sendTelegram(lead), TELEGRAM_TIMEOUT_MS + 1500, "telegram"),
    withTimeout(sendEmail(lead), EMAIL_TIMEOUT_MS + 1500, "email"),
  ]);

  const channelState = (result) => {
    if (result.status === "fulfilled") return "sent";
    return result.reason && result.reason.notConfigured ? "not_configured" : "failed";
  };

  const state = { telegram: channelState(telegram), email: channelState(email) };
  const deliveredCount = Object.values(state).filter((s) => s === "sent").length;

  if (telegram.status === "rejected") {
    console.error(
      `demo-request: telegram ${state.telegram} for ${lead.requestId}:`,
      (telegram.reason && telegram.reason.message) || telegram.reason
    );
  }
  if (email.status === "rejected") {
    console.error(
      `demo-request: email ${state.email} for ${lead.requestId}:`,
      (email.reason && email.reason.message) || email.reason
    );
  }

  if (deliveredCount === 0) {
    // Nothing got through. Never tell the visitor it worked — the browser
    // keeps their answers and offers them a direct way to reach us instead.
    console.error(
      `demo-request: NO CHANNEL DELIVERED for ${lead.requestId} — lead recorded in this log only`,
      JSON.stringify(state)
    );
    return res.status(502).json({ ok: false, error: "delivery_failed", channels: state });
  }

  if (deliveredCount < 2) {
    console.error(`demo-request: partial delivery for ${lead.requestId}`, JSON.stringify(state));
  }

  return res.status(200).json({ ok: true, requestId: lead.requestId, channels: state });
}
