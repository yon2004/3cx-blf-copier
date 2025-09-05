document.addEventListener('DOMContentLoaded', () => {
  const templateNameInput = document.getElementById('templateName');
  const saveTemplateButton = document.getElementById('saveTemplate');
  const templateSelect = document.getElementById('templateSelect');
  const applyTemplateButton = document.getElementById('applyTemplate');
  const deleteTemplateButton = document.getElementById('deleteTemplate');
  const statusDiv = document.getElementById('status');

  // Load saved templates into dropdown
  function loadTemplates() {
    chrome.storage.local.get(null, (data) => {
      templateSelect.innerHTML = '<option value="">-- Select a template --</option>';
      Object.keys(data).forEach((key) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        templateSelect.appendChild(option);
      });
      applyTemplateButton.disabled = !templateSelect.value;
      deleteTemplateButton.disabled = !templateSelect.value;
    });
  }

  // Show status message
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status alert ${isError ? 'alert-danger' : 'alert-success'}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Enable/disable buttons based on selection
  templateSelect.addEventListener('change', () => {
    applyTemplateButton.disabled = !templateSelect.value;
    deleteTemplateButton.disabled = !templateSelect.value;
  });

  // Save template
  saveTemplateButton.addEventListener('click', () => {
    const templateName = templateNameInput.value.trim();
    if (!templateName) {
      showStatus('Please enter a template name', true);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showStatus('Error: No active tab found', true);
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getBLF' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Error: Content script not running on this page. Ensure you are on the 3CX BLF tab.', true);
          console.error(chrome.runtime.lastError);
          return;
        }

        if (response && response.blfData) {
          chrome.storage.local.set({ [templateName]: response.blfData }, () => {
            showStatus('Template saved successfully');
            templateNameInput.value = '';
            loadTemplates();
          });
        } else {
          showStatus(response?.error || 'Error: Failed to retrieve BLF data', true);
        }
      });
    });
  });

  // Apply template
  applyTemplateButton.addEventListener('click', () => {
    const templateName = templateSelect.value;
    if (!templateName) {
      showStatus('Please select a template', true);
      return;
    }

    chrome.storage.local.get(templateName, (data) => {
      const blfData = data[templateName];
      if (!blfData) {
        showStatus('Error: Template not found', true);
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          showStatus('Error: No active tab found', true);
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setBLF', blfData }, (response) => {
          if (chrome.runtime.lastError) {
            showStatus('Error: Content script not running on this page. Ensure you are on the 3CX BLF tab.', true);
            console.error(chrome.runtime.lastError);
            return;
          }

          if (response && response.success) {
            showStatus('Template applied successfully');
          } else {
            showStatus(response?.error || 'Error: Failed to apply template', true);
          }
        });
      });
    });
  });

  // Delete template
  deleteTemplateButton.addEventListener('click', () => {
    const templateName = templateSelect.value;
    if (!templateName) {
      showStatus('Please select a template to delete', true);
      return;
    }

    chrome.storage.local.remove(templateName, () => {
      if (chrome.runtime.lastError) {
        showStatus('Error: Failed to delete template', true);
        console.error(chrome.runtime.lastError);
        return;
      }
      showStatus('Template deleted successfully');
      templateSelect.value = '';
      loadTemplates();
    });
  });

  // Initial load
  loadTemplates();
});