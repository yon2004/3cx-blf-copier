chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);

  if (request.action === 'getBLF') {
    const blfItems = document.querySelectorAll('[data-qa="blf-list-item"]');
    const blfData = Array.from(blfItems).map((item, index) => {
      const typeSelect = item.querySelector('ng-select[data-qa="type"]');
      const type = typeSelect.querySelector('.ng-value-label')?.textContent || '';
      const position = item.querySelector('[data-qa="position"] span')?.textContent || (index + 1).toString();
      const data = { position, type };

      if (['BLF', 'Speed dial', 'Shared parking'].includes(type)) {
        const peerSelect = item.querySelector('app-dn-select ng-select[data-qa="select"]');
        const peer = peerSelect?.querySelector('.ng-value .text-truncate')?.textContent?.trim() || '';
        data.peer = peer;
      } else if (type === 'Custom speed dial') {
        const valueInput = item.querySelector('field-input[data-qa="value"] input');
        const firstNameInput = item.querySelector('field-input[data-qa="first-name"] input');
        const lastNameInput = item.querySelector('field-input[data-qa="last-name"] input');
        data.value = valueInput?.value || '';
        data.firstName = firstNameInput?.value || '';
        data.lastName = lastNameInput?.value || '';
      } else if (['Agent login/logout', 'Change Status'].includes(type)) {
        const valueSelect = item.querySelector('ng-select[data-qa="value"] .ng-value-label, field-select[data-qa="value"] .ng-value-label');
        data.value = valueSelect?.textContent?.trim() || '';
      }

      return data;
    });

    console.log('Collected BLF data:', blfData);
    sendResponse({ blfData });
  }

  if (request.action === 'setBLF') {
    const blfData = request.blfData;
    console.log('Applying BLF data - Received data:', blfData);

    // Sort blfData by position ascending
    blfData.sort((a, b) => parseInt(a.position) - parseInt(b.position));
    console.log('BLF data sorted by position:', blfData);

    // Check for gaps in positions
    const maxPosition = parseInt(blfData[blfData.length - 1]?.position || 0);
    if (blfData.length < maxPosition) {
      console.warn('Gaps detected in positions; assuming dense list with explicit "Blank" types.');
    }

    (async () => {
      let success = true;

      // Function to clear existing BLF entries asynchronously
      async function clearBLFEntries() {
        console.log('Starting to clear existing BLF entries');
        let deleteButtons = document.querySelectorAll('[id="blf"] [id="btnRemoveRule"]');
        console.log('Initial number of delete buttons:', deleteButtons.length);
        while (deleteButtons.length > 0) {
          deleteButtons.forEach(button => {
            console.log('Clicking delete button');
            button.click();
          });
          await new Promise(resolve => setTimeout(resolve, 500));
          deleteButtons = document.querySelectorAll('[id="blf"] [id="btnRemoveRule"]');
          console.log('Remaining delete buttons:', deleteButtons.length);
        }
        console.log('All BLF entries cleared');
      }

      console.log('Clearing existing BLF entries...');
      await clearBLFEntries();
      console.log('Finished clearing BLF entries');

      // Select BLF items (excluding the add button row)
      let blfItems = document.querySelectorAll('.cdk-drop-list > .cdk-drag:not(.ng-star-inserted:last-child)');
      console.log('Initial number of BLF items:', blfItems.length);
      const addButton = document.querySelector('[data-qa="add-more"]');
      if (!addButton) {
        console.error('Add more BLF button not found');
        sendResponse({ success: false });
        return;
      }

      // Add more items if template has more than current
      console.log('Checking if more items need to be added. Required:', blfData.length, 'Current:', blfItems.length);
      while (blfData.length > blfItems.length && addButton) {
        console.log('Adding new BLF item. Current count:', blfItems.length);
        addButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        blfItems = document.querySelectorAll('.cdk-drop-list > .cdk-drag:not(.ng-star-inserted:last-child)');
        console.log('New number of BLF items after add:', blfItems.length);
      }
      console.log('Finished adding items. Total items:', blfItems.length);

      // Helper to set ng-select value asynchronously
      async function setNgSelectValue(ngSelectElem, searchValue) {
        console.log('Attempting to set ng-select value:', searchValue);
        return new Promise((resolve) => {
          if (!ngSelectElem) {
            console.error('ngSelect element not found');
            resolve(false);
            return;
          }
          const container = ngSelectElem.querySelector('.ng-select-container');
          if (container) {
            console.log('Clicking ng-select container');
            container.click();
          } else {
            console.error('ng-select container not found');
            resolve(false);
            return;
          }

          const input = ngSelectElem.querySelector('.ng-input input');
          if (!input) {
            console.error('ng-select input not found');
            resolve(false);
            return;
          }
          console.log('Focusing input and setting value:', searchValue);
          input.focus();
          input.value = searchValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));

          setTimeout(() => {
            const panel = document.querySelector('.ng-dropdown-panel');
            if (!panel) {
              console.error('Dropdown panel not found');
              resolve(false);
              return;
            }
            console.log('Dropdown panel found, selecting first option');
            const options = panel.querySelectorAll('.ng-option');
            options[0].click();
            resolve(true);
          }, 500); // Delay for options to load; adjust if needed
        });
      }

      // Configure each item
      console.log('Starting configuration of BLF items. Total to configure:', blfData.length);
      for (let i = 0; i < blfData.length; i++) {
        const dataItem = blfData[i];
        const itemIndex = i;
        console.log(`Configuring item at index ${itemIndex} with data:`, dataItem);
        if (itemIndex >= blfItems.length) {
          console.error(`Index ${itemIndex} out of bounds. Items length: ${blfItems.length}`);
          success = false;
          continue;
        }
        const targetItem = blfItems[itemIndex];

        // Set type
        const typeNgSelect = targetItem.querySelector('ng-select[data-qa="type"]');
        console.log(`Setting type for item ${itemIndex}. Target value: ${dataItem.type}`);
        const typeSet = await setNgSelectValue(typeNgSelect, dataItem.type);
        if (!typeSet) {
          console.error(`Failed to set type for item ${itemIndex}`);
          success = false;
        }

        // Log if peer is present before the condition
        console.log(`Checking peer for item ${itemIndex}:`, dataItem.peer ? 'Present' : 'Not present');

        // Handle conditional fields based on type
        if (['BLF', 'Speed dial', 'Shared parking'].includes(dataItem.type) && dataItem.peer) {
          console.log(`Attempting to set peer for item ${itemIndex}. Value: ${dataItem.peer}`);
          await new Promise(resolve => setTimeout(resolve, 650)); // Increased delay for peer field to render
          const peerNgSelect = targetItem.querySelector('app-dn-select ng-select[data-qa="select"]');
          if (!peerNgSelect) {
            console.error(`Peer ng-select not found for item ${itemIndex}`);
            success = false;
            continue;
          }
          console.log(`Found peer ng-select for item ${itemIndex}`);
          const peerInput = peerNgSelect.querySelector('.ng-input input');
          if (peerInput) {
            console.log('Focusing peer input');
            peerInput.focus();
          }
          const peerContainer = peerNgSelect.querySelector('.ng-select-container');
          if (peerContainer) {
            console.log('Clicking peer container');
            peerContainer.click();
          } else {
            console.error('Peer container not found');
            success = false;
            continue;
          }
          const peerSet = await setNgSelectValue(peerNgSelect, dataItem.peer.split(' ', 1)[0]);
          if (!peerSet) {
            console.error(`Failed to set peer for item ${itemIndex}`);
            success = false;
          } else {
            console.log(`Successfully set peer for item ${itemIndex}`);
          }
        } else if (dataItem.type === 'Custom speed dial') {
          console.log(`Setting custom fields for item ${itemIndex}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          const valueInput = targetItem.querySelector('field-input[data-qa="value"] input');
          const firstNameInput = targetItem.querySelector('field-input[data-qa="first-name"] input');
          const lastNameInput = targetItem.querySelector('field-input[data-qa="last-name"] input');
          if (valueInput && dataItem.value) {
            console.log(`Setting value: ${dataItem.value}`);
			valueInput.value = dataItem.value;
			valueInput.dispatchEvent(new Event('input', { bubbles: true }));
            valueInput.dispatchEvent(new Event('change', { bubbles: true }));
			valueInput.dispatchEvent(new Event('blur', { bubbles: true })); // Added to trigger validation
          }
          if (firstNameInput && dataItem.firstName) {
            console.log(`Setting first name: ${dataItem.firstName}`);
			firstNameInput.value = dataItem.firstName;
            firstNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            firstNameInput.dispatchEvent(new Event('change', { bubbles: true }));
			firstNameInput.dispatchEvent(new Event('blur', { bubbles: true })); // Added to trigger validation
          }
          if (lastNameInput && dataItem.lastName) {
            console.log(`Setting last name: ${dataItem.lastName}`);
			lastNameInput.value = dataItem.lastName;
            lastNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            lastNameInput.dispatchEvent(new Event('change', { bubbles: true }));
			lastNameInput.dispatchEvent(new Event('blur', { bubbles: true })); // Added to trigger validation
          }
        } else if (['Agent login/logout', 'Change Status'].includes(dataItem.type) && dataItem.value) {
          console.log(`Setting value for item ${itemIndex}. Value: ${dataItem.value}`);
          await new Promise(resolve => setTimeout(resolve, 500));
          const valueNgSelect = targetItem.querySelector('ng-select[data-qa="value"]') || targetItem.querySelector('field-select[data-qa="value"] ng-select');
          const valueSet = await setNgSelectValue(valueNgSelect, dataItem.value);
          if (!valueSet) {
            console.error(`Failed to set value for item ${itemIndex}`);
            success = false;
          }
        }
      }

      console.log('Configuration completed. Success status:', success);
      if (!success) {
        console.error('Some items could not be set.');
      }
      sendResponse({ success });
    })();

    return true; // Keep the message channel open for async response
  }
});