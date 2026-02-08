document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('webAppUrl');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  chrome.storage.sync.get('webAppUrl', (data) => {
    if (data.webAppUrl) input.value = data.webAppUrl;
  });

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    statusEl.style.display = 'block';
  }

  saveBtn.addEventListener('click', () => {
    const url = (input.value || '').trim();
    if (!url) {
      showStatus('Please enter a Web App URL.', 'error');
      return;
    }
    chrome.storage.sync.set({ webAppUrl: url }, () => {
      showStatus('URL saved. You can close this tab.', 'success');
    });
  });
});
