// Paste this entire code into your Google Apps Script editor (Extensions → Apps Script).
// Replace the existing doPost function. Then: Deploy → Manage deployments → Edit → New version → Deploy.

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    // Column order: Name, Company, Position, Location, Date, LinkedIn link
    sheet.appendRow([
      data.name || '',
      data.company || '',
      data.jobTitle || '',
      data.location || '',
      data.date || '',
      data.profileUrl || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: add doGet so opening the Web App URL in browser doesn't show an error
function doGet() {
  return ContentService.createTextOutput('Web app is running. Use the LinkedIn extension to save profiles.')
    .setMimeType(ContentService.MimeType.TEXT);
}
  