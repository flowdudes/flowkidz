/* Feedback form handler: checks Turnstile, then emails the submission via Resend.
   Cloudflare Pages env vars: RESEND_API_KEY, TURNSTILE_SECRET (required); FORM_TO, FORM_FROM (optional). */
const DEFAULT_TO = "hello@toqirchatha.com";
const DEFAULT_FROM = "Flowkidz <feedback@flowkidz.com>";
const SUBJECT = "Flowkidz Feedback";
const GAMES = [
  "General",
  "Bug Hunter", "Button Builder", "Color Chaos", "Fix the Website", "Font Friends",
  "Loop Machine", "Password Power", "Sort the Bots", "Spot the Fake", "Teach the Robot",
  "Spacing Police", "Mobile Rescue", "Guess the Prompt", "Robot Chef", "Link Detective",
  "Logo Lab", "Menu Maze", "Share or Not?",
];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const field = (data, key, max) => (data.get(key) || "").toString().trim().slice(0, max);

/* Branded HTML email: table layout and inline styles so it renders in every mail client */
function renderHtml(f, page) {
  const sans = "'Nunito','Nunito Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const label = (t) => `<div style="font-family:${sans};font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8a87a3;padding-bottom:6px">${t}</div>`;
  const row = (t, v) => `<tr><td style="padding:16px 0;border-top:1px solid #efeaf9">${label(t)}<div style="font-family:${sans};font-size:15px;line-height:1.55;color:#17162e;white-space:pre-wrap">${v}</div></td></tr>`;
  const rows = [
    row("From", esc(f.name || "Not given")),
    row("Game", esc(f.game)),
    row("Email", f.email ? `<a href="mailto:${esc(f.email)}" style="color:#6440f2">${esc(f.email)}</a>` : "Not given (no reply wanted)"),
  ].join("");
  const reply = f.email
    ? `<tr><td style="padding:8px 28px 28px"><a href="mailto:${esc(f.email)}?subject=${encodeURIComponent("Re: your Flowkidz feedback")}" style="display:inline-block;background:#6440f2;color:#ffffff;font-family:${sans};font-size:14px;font-weight:800;text-decoration:none;padding:12px 22px;border-radius:999px">Reply</a></td></tr>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#f8f7f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f6"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffaf3;border-radius:20px;overflow:hidden;border:1px solid #ece6dc">
<tr><td style="background:#7b5cfa;padding:18px 28px">
<span style="font-family:${sans};font-size:20px;font-weight:900;color:#ffffff">Flowkidz</span>
<span style="font-family:${sans};font-size:12px;font-weight:800;color:#ffe9a8;float:right;line-height:28px">NEW FEEDBACK</span>
</td></tr>
<tr><td style="padding:28px 28px 8px">
${label("Message")}
<div style="font-family:${sans};font-size:18px;line-height:1.5;color:#17162e;white-space:pre-wrap">${esc(f.message)}</div>
</td></tr>
<tr><td style="padding:8px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
${reply}
<tr><td style="padding:14px 28px;border-top:1px solid #efeaf9;font-family:${sans};font-size:12px;line-height:1.6;color:#8a87a3">
Sent from the feedback form${page ? ` on <a href="${esc(page)}" style="color:#8a87a3">${esc(page)}</a>` : ""}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.formData();
  } catch {
    return json({ ok: false, error: "bad-request" }, 400);
  }

  // Honeypot: real visitors never fill this hidden field
  if (data.get("company")) return json({ ok: true });

  const token = data.get("cf-turnstile-response");
  if (!token || !env.TURNSTILE_SECRET) return json({ ok: false, error: "turnstile-missing" }, 400);
  const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!check.success) return json({ ok: false, error: "turnstile-failed" }, 403);

  const f = {
    name: field(data, "name", 80),
    game: field(data, "game", 60) || "General",
    message: field(data, "message", 4000),
    email: field(data, "email", 200),
  };
  if (!GAMES.includes(f.game)) f.game = "General";
  if (f.message.length < 2) return json({ ok: false, error: "invalid" }, 422);
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json({ ok: false, error: "invalid-email" }, 422);

  if (!env.RESEND_API_KEY) return json({ ok: false, error: "email-not-configured" }, 503);
  const to = (env.FORM_TO || DEFAULT_TO).split(",").map((s) => s.trim()).filter(Boolean);

  const page = request.headers.get("Referer") || "";
  const text = [
    `Message:\n${f.message}`,
    `Name: ${f.name || "Not given"}`,
    `Game: ${f.game}`,
    `Email: ${f.email || "Not given (no reply wanted)"}`,
  ].join("\n\n") + `\n\n—\nPage: ${page}`;
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.FORM_FROM || DEFAULT_FROM,
      to,
      ...(f.email ? { reply_to: f.email } : {}),
      subject: SUBJECT,
      text,
      html: renderHtml(f, page),
    }),
  });
  if (!sent.ok) {
    console.log("Resend error", sent.status, await sent.text());
    return json({ ok: false, error: "email-failed" }, 502);
  }
  console.log("Resend sent", to.join(", "), await sent.text());

  return json({ ok: true });
}
