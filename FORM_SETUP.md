# Contact Form Setup (Brevo - Step by Step)

This is the production setup for this project: frontend form -> server endpoint -> Brevo.

## 1) What is already implemented

Current files are already wired:

- `nowykod.html` has form IDs (`lead-form`, `email`, `submit-btn`, `form-status`) and honeypot field (`name="website"`).
- `app.js` sends form data to `"/api/lead"`.
- `api/lead.js` validates data and calls Brevo API:
  - creates/updates contact (`/v3/contacts`, deduplicated with `updateEnabled: true`),
  - optionally sends a thank-you email (`/v3/smtp/email`).

## 2) Create and configure Brevo assets

In Brevo panel:

1. Create a list for leads (for example: `webeillin-drop-list`).
2. Copy the numeric `List ID`.
3. Generate API key (`SMTP/API -> API Keys`).
4. Verify sender domain/email (SPF + DKIM, recommended DMARC).

## 3) Set environment variables in hosting

Use `.env.example` as a template and set these values in your hosting platform:

- `BREVO_API_KEY`
- `BREVO_LIST_ID`
- `BREVO_SENDER_EMAIL` (required if thank-you email should be sent)
- `BREVO_SENDER_NAME` (optional)
- `BREVO_THANK_YOU_SUBJECT` (optional)

Important: never expose `BREVO_API_KEY` in frontend code.

## 4) Deploy

Deploy this project on a platform that supports serverless functions from `api/` (for example Vercel).

After deploy, `"/api/lead"` will be publicly available under your domain over HTTPS.

## 5) End-to-end tests (required)

Test these scenarios:

1. Valid email:
   - UI shows success status.
   - Contact appears in correct Brevo list.
   - Thank-you email arrives (if sender envs were configured).
2. Invalid email:
   - UI shows validation error.
3. Bot/honeypot simulation (`website` field not empty):
   - Request is ignored silently.
4. Temporary failure (wrong API key):
   - UI shows submission error.
5. UTM propagation:
   - Submit with `?utm_source=...&utm_medium=...&utm_campaign=...`
   - Check attributes in Brevo contact.

## 6) Go-live checklist

- Production domain uses HTTPS.
- Brevo sender domain is authenticated (SPF, DKIM, DMARC recommended).
- Real mailbox test passed (Gmail + Outlook).
- Privacy policy link is visible near form.
- Optional but recommended: enable double opt-in flow in Brevo automations.
