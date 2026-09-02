// Proxies feedback submissions to a Google Sheets webhook.
//
// Setup:
// 1. Create a Google Sheet.
// 2. Extensions → Apps Script. Paste the doPost() from README (or docs/gsheet-apps-script.js).
// 3. Deploy → New deployment → Web app → "Anyone" can access.
// 4. Copy the /exec URL and set it as env var GOOGLE_SHEET_WEBHOOK_URL in Vercel.
//
// We proxy through this serverless function so the webhook URL stays server-side
// (env var, not shipped in the JS bundle) and we can add rate-limiting or
// validation without touching Apps Script.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (!url) {
    res.status(500).json({
      error: 'Feedback endpoint is not configured yet. Try again in a moment.',
    });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      rating,
      feedback: String(body.feedback || '').slice(0, 2000),
      session: String(body.session || '').slice(0, 200),
      host: String(body.host || '').slice(0, 100),
      // Basic request metadata for later triage. Not PII beyond what the browser
      // already sends to every site.
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      ip: String(
        req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
      )
        .split(',')[0]
        .trim(),
    };

    // Google Apps Script webhooks return 302 redirects that some fetch clients
    // choke on. Explicitly follow them.
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!upstream.ok) {
      throw new Error(`Upstream responded ${upstream.status}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({
      error: err?.message || 'Could not send feedback. Please try again.',
    });
  }
}
