// Paste this into a Google Apps Script bound to your feedback Google Sheet.
//
// Steps:
// 1. Create a Google Sheet.
// 2. Extensions → Apps Script.
// 3. Delete the default `myFunction` code, paste this file's contents.
// 4. Save (disk icon), give the project a name.
// 5. Deploy → New deployment.
//    - Type: Web app
//    - Description: "Session Post Studio feedback webhook"
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Click Deploy. Authorize when prompted (Advanced → Go to project → Allow).
// 7. Copy the Web app URL (ends in /exec).
// 8. Paste that URL as env var GOOGLE_SHEET_WEBHOOK_URL in Vercel
//    (Project → Settings → Environment Variables → all 3 environments).
// 9. Trigger a redeploy in Vercel (or push any commit) so the new env var is
//    picked up by the /api/feedback function.
//
// After that, submitting the feedback form appends a row to a "Feedback" sheet.

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Feedback') || ss.insertSheet('Feedback');

  // First row headers, only added once.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp (UTC)',
      'Rating',
      'Feedback',
      'Session',
      'Host',
      'User Agent',
      'IP',
    ]);
    sheet.getRange('A1:G1').setFontWeight('bold');
  }

  let data = {};
  try {
    data = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.rating || '',
    data.feedback || '',
    data.session || '',
    data.host || '',
    data.userAgent || '',
    data.ip || '',
  ]);

  return jsonResponse({ ok: true });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
