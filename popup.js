document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const extractedEl = document.getElementById('extracted');
  const optionsLink = document.getElementById('optionsLink');

  optionsLink.href = chrome.runtime.getURL('options.html');
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    statusEl.style.display = 'block';
  }

  function showExtracted(data) {
    if (data && (data.name || data.profileUrl)) {
      const parts = ['<strong>Will save:</strong>'];
      if (data.name) parts.push('Name: ' + data.name);
      if (data.jobTitle) parts.push('Job: ' + data.jobTitle);
      if (data.company) parts.push('Company: ' + data.company);
      if (data.location) parts.push('Location: ' + data.location);
      if (data.profileUrl) parts.push('Profile: ' + data.profileUrl);
      extractedEl.innerHTML = parts.join('<br>');
      extractedEl.style.display = 'block';
    } else {
      extractedEl.style.display = 'none';
    }
  }

  saveBtn.addEventListener('click', async () => {
    const { webAppUrl } = await chrome.storage.sync.get('webAppUrl');
    if (!webAppUrl || !webAppUrl.trim()) {
      showStatus('Set your Google Sheet Web App URL in Options first.', 'error');
      chrome.runtime.openOptionsPage();
      return;
    }

    saveBtn.disabled = true;
    showStatus('Saving...', 'info');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || (!tab.url.includes('linkedin.com/in/'))) {
        showStatus('Open a LinkedIn profile page (linkedin.com/in/...) and try again.', 'error');
        saveBtn.disabled = false;
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProfileData' });
      if (!response || !response.name) {
        showStatus('Could not find a name on this page. Make sure you\'re on a profile page.', 'error');
        saveBtn.disabled = false;
        return;
      }

      showExtracted(response);

      const now = new Date();
      const dateReadable = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const res = await fetch(webAppUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: response.name,
          profileUrl: response.profileUrl || tab.url,
          jobTitle: response.jobTitle || '',
          company: response.company || '',
          location: response.location || '',
          date: dateReadable
        })
      });

      // no-cors gives opaque response; assume success if no throw
      showStatus('Saved to Google Sheet: ' + response.name, 'success');
    } catch (err) {
      console.error(err);
      showStatus('Error: ' + (err.message || 'Could not save. Check URL and try again.'), 'error');
    }
    saveBtn.disabled = false;
  });

  // Debug: see what LinkedIn displays
  const debugBtn = document.getElementById('debugBtn');
  const debugOut = document.getElementById('debugOut');
  if (debugBtn && debugOut) {
    debugBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url || !tab.url.includes('linkedin.com/in/')) {
          showStatus('Open a LinkedIn profile page first.', 'error');
          return;
        }
        const info = await chrome.tabs.sendMessage(tab.id, { action: 'debugExperience' });
        debugOut.style.display = 'block';
        let text = 'Section found: ' + info.foundSection + '\nFirst item found: ' + info.foundFirstItem + '\n\nHeadline: ' + (info.headlineText || '(none)') + '\n\n--- Links in first experience ---\n';
        (info.linksInFirstItem || []).forEach(l => { text += l.href + ' => "' + l.text + '"\n'; });
        text += '\n--- Sample of elements (tag, class, text) ---\n';
        (info.allSpansWithText || []).slice(0, 25).forEach(s => { text += s.tag + ' .' + (s.class || '') + ' => "' + s.text + '"\n'; });
        if (info.firstItemHtml) text += '\n--- First item HTML (first 2000 chars) ---\n' + info.firstItemHtml.substring(0, 2000);
        debugOut.textContent = text;
        showStatus('Debug info below. Also in Console (F12 on LinkedIn tab).', 'info');
      } catch (e) {
        showStatus('Error: ' + e.message + ' — refresh the LinkedIn tab and try again.', 'error');
        debugOut.style.display = 'none';
      }
    });
  }

  // Pre-fill extracted data when popup opens
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.url && tab.url.includes('linkedin.com/in/')) {
      chrome.tabs.sendMessage(tab.id, { action: 'getProfileData' }).then(showExtracted).catch(() => {});
    }
  });
});
