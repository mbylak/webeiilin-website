const BREVO_API_BASE = "https://api.brevo.com/v3";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sanitizeText(value, max = 160) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function extractAttributes(payload) {
  return {
    SOURCE: sanitizeText(payload.source || "landing-page", 80),
    LOCALE: sanitizeText(payload.localeUi || payload.locale || "", 20),
    UTM_SOURCE: sanitizeText(payload.utm_source || "", 120),
    UTM_MEDIUM: sanitizeText(payload.utm_medium || "", 120),
    UTM_CAMPAIGN: sanitizeText(payload.utm_campaign || "", 120),
    UTM_CONTENT: sanitizeText(payload.utm_content || "", 120),
    UTM_TERM: sanitizeText(payload.utm_term || "", 120)
  };
}

function getThankYouEmailHtml() {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#0b0b0b;color:#fff;padding:24px;text-align:center">
      <p style="margin:0 0 10px;color:#ff9354;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Early Access Confirmed</p>
      <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2">Thank you for signing up.</h1>
      <p style="margin:0 0 10px;line-height:1.6">You're officially on the webeiilin early access list.</p>
      <p style="margin:0;line-height:1.6">As promised, your <strong>10% welcome discount</strong> will arrive with the drop details.</p>
    </div>
  `.trim();
}

async function brevoRequest(path, apiKey, body) {
  const response = await fetch(`${BREVO_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`Brevo ${path} failed (${response.status}): ${reason}`);
  }

  return response;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    json(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const email = sanitizeText(payload.email || "", 254).toLowerCase();
    const honeypot = sanitizeText(payload.website || "", 200);

    if (honeypot) {
      json(res, 200, { ok: true });
      return;
    }

    if (!EMAIL_RE.test(email)) {
      json(res, 400, { ok: false, error: "Invalid email" });
      return;
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_LIST_ID);
    if (!apiKey || !Number.isFinite(listId)) {
      json(res, 500, { ok: false, error: "Brevo env is missing" });
      return;
    }

    await brevoRequest("/contacts", apiKey, {
      email,
      listIds: [listId],
      updateEnabled: true,
      attributes: extractAttributes(payload)
    });

    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (senderEmail) {
      await brevoRequest("/smtp/email", apiKey, {
        sender: {
          email: senderEmail,
          name: process.env.BREVO_SENDER_NAME || "webeiilin"
        },
        to: [{ email }],
        subject: process.env.BREVO_THANK_YOU_SUBJECT || "You're on the list - webeiilin",
        htmlContent: process.env.BREVO_THANK_YOU_HTML || getThankYouEmailHtml()
      });
    }

    json(res, 200, { ok: true });
  } catch (error) {
    console.error("Lead endpoint error:", error);
    json(res, 502, { ok: false, error: "Lead processing failed" });
  }
};
