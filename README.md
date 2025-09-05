# 3CX BLF Automation Extension

This Chrome extension automates BLF configuration in 3CX systems by applying templates for types, peers, and custom speed dials.

## Installation
1. Clone or download the repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the extension folder.

## Usage
- Save a BLF template from an existing 3CX extension.
- Apply the template to another extension via the extension's action.

## Modifying for Your URL
To use this extension on your specific 3CX instance URL, edit the `manifest.json` file:
- Locate the `"matches"` field under `"content_scripts"`.
- Update the URL pattern (e.g., `"https://your-3cx-domain.com/*"`) to match your 3CX admin panel URL.
- Example:
  ```json
  "content_scripts": [
    {
      "matches": ["https://your-3cx-domain.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
