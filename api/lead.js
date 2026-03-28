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
  const logoUrl = process.env.BREVO_LOGO_URL || "https://webeiilin.com/webeillin%20(1).png";
  const instagramUrl = process.env.BREVO_INSTAGRAM_URL || "https://instagram.com/webeiilin";
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>You're on the list - webeiilin</title>
  </head>
  <body bgcolor="#000000" style="margin:0;padding:0;background-color:#000000;color:#ffffff;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#000000" style="background-color:#000000;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="620" border="0" cellpadding="0" cellspacing="0" bgcolor="#0d0d0d" style="width:100%;max-width:620px;border:1px solid #2f2f2f;background-color:#0d0d0d;">
            <tr>
              <td align="center" style="padding:30px 22px;">
                <img src="${logoUrl}" alt="webeiilin logo" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto 20px;">
                <p style="margin:0 0 12px;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ff9354;">Early Access Confirmed</p>
                <h1 style="margin:0 0 14px;font-size:32px;line-height:1.15;color:#ffffff;">Thank you for signing up.</h1>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#f1f1f1;">You're officially on the webeiilin early access list.</p>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#f1f1f1;">We will notify you before the next drop, so you can get in first.</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#f1f1f1;">As promised, your <strong>10% welcome discount</strong> will arrive with the drop details.</p>
                <a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;border:2px solid #ffffff;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;">Follow on Instagram</a>
                <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#d0d0d0;">If this wasn't you, you can ignore this message.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function getThankYouEmailText() {
  return [
    "Early Access Confirmed",
    "",
    "Thank you for signing up.",
    "You're officially on the webeiilin early access list.",
    "We will notify you before the next drop, so you can get in first.",
    "As promised, your 10% welcome discount will arrive with the drop details.",
    "",
    "Instagram: https://instagram.com/webeiilin"
  ].join("\n");
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

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function parsePayload(req) {
  if (typeof req.body === "string") {
    return JSON.parse(req.body || "{}");
  }
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  const raw = await readRawBody(req);
  return raw ? JSON.parse(raw) : {};
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
    const payload = await parsePayload(req);
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
    if (!apiKey) {
      json(res, 500, { ok: false, error: "Server config error: BREVO_API_KEY is missing" });
      return;
    }
    if (!Number.isInteger(listId) || listId <= 0) {
      json(res, 500, { ok: false, error: "Server config error: BREVO_LIST_ID must be a positive integer" });
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
      const senderName = process.env.BREVO_SENDER_NAME || "webeiilin";
      const unsubscribeUrl = process.env.BREVO_UNSUBSCRIBE_URL || "";
      const replyToEmail = process.env.BREVO_REPLY_TO_EMAIL || senderEmail;
      const replyToName = process.env.BREVO_REPLY_TO_NAME || senderName;
      const headers = {};
      if (unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }

      await brevoRequest("/smtp/email", apiKey, {
        sender: {
          email: senderEmail,
          name: senderName
        },
        replyTo: { email: replyToEmail, name: replyToName },
        to: [{ email }],
        subject: process.env.BREVO_THANK_YOU_SUBJECT || "You're on the list - webeiilin",
        htmlContent: process.env.BREVO_THANK_YOU_HTML || getThankYouEmailHtml(),
        textContent: process.env.BREVO_THANK_YOU_TEXT || getThankYouEmailText(),
        headers
      });
    }

    json(res, 200, { ok: true });
  } catch (error) {
    console.error("Lead endpoint error:", error);
    json(res, 502, { ok: false, error: "Lead processing failed" });
  }
};
