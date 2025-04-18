/**
 * Manages UI interactions, including sidebars, modals, notifications, and page navigation.
 */
export class UIManager {
    /**
     * Creates an instance of UIManager.
     * @param {ComicCreator} comicCreator - A reference to the main ComicCreator instance.
     */
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // Store reference for accessing other parts
        console.log("UIManager initialized");
    }

    // Methods related to UI management will be added here.

    // --- NEW: Setup Sidebar Tab Switching --- 
    setupSidebarTabs() {
        const tabsContainer = document.querySelector('.sidebar-tabs');
        if (!tabsContainer) return;

        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab-btn');
            if (!clickedTab) return;

            const newMode = clickedTab.dataset.tab;
            if (newMode === this.comicCreator.currentSidebarMode) return; // Do nothing if clicking the active tab

            // Update the active tab visually
            tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
                tab.classList.remove('active');
            });
            clickedTab.classList.add('active');

            // Update the internal mode state
            this.comicCreator.currentSidebarMode = newMode;
            console.log('Switched sidebar mode to:', this.comicCreator.currentSidebarMode);

            // First deselect any currently selected item when switching modes
            this.comicCreator.deselectAll(); 

            // Then update the right sidebar based on the selected mode
            this.updateRightSidebarView();
        });
    }

    // --- NEW: Update Right Sidebar View --- 
    updateRightSidebarView() {
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) return;

        // Clear previous content
        propertiesPanel.innerHTML = '';

        // Access state and managers via comicCreator instance
        const currentMode = this.comicCreator.currentSidebarMode;
        const panelManager = this.comicCreator.panelManager;
        const backgroundManager = this.comicCreator.backgroundManager;
        const stickerManager = this.comicCreator.stickerManager;
        const textManager = this.comicCreator.textManager;

        // Show the relevant section based on mode AND current selection
        switch (currentMode) {
            case 'panels':
                console.log("Right sidebar: Panels tab active.");
                let panelProps = propertiesPanel.querySelector('#panel-properties');
                if (!panelProps) {
                    panelProps = document.createElement('div');
                    panelProps.id = 'panel-properties';
                    panelProps.className = 'properties-section';
                    propertiesPanel.appendChild(panelProps);
                }
                
                // Ensure the container is visible
                panelProps.style.display = 'block';

                // Show panel controls ONLY if a panel is selected
                if (panelManager.currentPanel) { // Access via panelManager instance
                    // Call PanelManager to update the controls INSIDE the panelProps container
                    panelManager.updatePanelControls(panelManager.currentPanel, panelProps); 
                } else {
                    // Display the placeholder message inside the panelProps container
                    panelProps.innerHTML = '<h4>Panel Settings</h4><div class="panel-controls"><p>Select a panel to see its properties.</p></div>';
                }
                break;
                
            case 'backgrounds':
                 console.log("Right sidebar: Backgrounds tab active.");
                // Always show background controls when this tab is active
                backgroundManager.updateBackgroundControls(); // Call manager method
                break;
                
            case 'stickers':
                 console.log("Right sidebar: Stickers tab active.");
                let stickerProps = propertiesPanel.querySelector('#sticker-properties');
                if (!stickerProps) {
                    stickerProps = document.createElement('div');
                    stickerProps.id = 'sticker-properties';
                    stickerProps.className = 'properties-section';
                    propertiesPanel.appendChild(stickerProps);
                }
                
                 // Show sticker controls ONLY if a sticker is selected
                 if (stickerManager.currentSticker) { // Access via stickerManager instance
                     stickerManager.updateStickerControls(); // StickerManager updates based on its own state
                 } else if (stickerProps) {
                    stickerProps.innerHTML = '<h4>Sticker Settings</h4><div class="panel-controls"><p>Select a sticker to see its properties.</p></div>';
                    stickerProps.style.display = 'block';
                 } else {
                    // Ensure sticker props div exists for the message if needed
                    stickerManager.updateStickerControls(); // Call StickerManager method
                 }
                break;
            case 'text': // Assuming text properties are handled here or via TextManager
                 console.log("Right sidebar: Text tab active (or relevant).");
                 // Show text controls ONLY if a text box is selected
                 if (textManager.currentTextBox) { // Access via textManager instance
                     textManager.updateTextProperties(textManager.currentTextBox);
                 } else {
                     // Optional: Show default message if no text box selected
                     let textProps = propertiesPanel.querySelector('#text-properties');
                     if (!textProps) {
                         textProps = document.createElement('div');
                         textProps.id = 'text-properties';
                         textProps.className = 'properties-section';
                         propertiesPanel.appendChild(textProps);
                     }
                     textProps.innerHTML = '<h4>Text Settings</h4><div class="panel-controls"><p>Select a text element to see its properties.</p></div>';
                     textProps.style.display = 'block';
                 }
                 break;
            default:
                 console.warn("Unknown sidebar mode:", currentMode);
        }
    }

    // --- Show Notification ---
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        // Set type-specific styles
        notification.className = 'notification'; // Reset
        notification.classList.add(`notification-${type}`);
        
        // Set content
        notification.textContent = message;
        
        // Show notification
        notification.classList.add('show');
        
        // Hide after delay
        setTimeout(() => {
            notification.classList.remove('show');
            
            // Remove element after animation completes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500); // Match transition duration
        }, 3000);
    }

    /**
     * Shows a confirmation modal with customizable title, message, and buttons.
     * @param {string} title - The modal title
     * @param {string} message - The modal message
     * @param {string[]} buttonLabels - Array of button labels
     * @returns {Promise<string|null>} - Resolves with the selected button label or null if cancelled
     */
    showConfirmationModal(title, message, buttonLabels = ['OK', 'Cancel']) {
        return new Promise((resolve) => {
            // Create modal elements
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            // Set content
            modal.innerHTML = `
                <h3>${title}</h3>
                <p style="text-align: center; margin-bottom: 1.5rem; color: #555;">${message}</p>
                <div class="modal-buttons"></div>
            `;
            
            // Add buttons
            const buttonsContainer = modal.querySelector('.modal-buttons');
            buttonLabels.forEach((label, index) => {
                const button = document.createElement('button');
                button.textContent = label;
                button.className = index === 0 ? 'primary-btn' : 'secondary-btn';
                
                button.addEventListener('click', () => {
                    // Remove modal and resolve with the label
                    modal.classList.remove('active');
                    modalOverlay.classList.remove('active');
                    
                    // Wait for transition before removing
                    setTimeout(() => {
                        document.body.removeChild(modal);
                        document.body.removeChild(modalOverlay);
                        resolve(label);
                    }, 300);
                });
                
                buttonsContainer.appendChild(button);
            });
            
            // Add to DOM
            document.body.appendChild(modalOverlay);
            document.body.appendChild(modal);
            
            // Trigger transition after a small delay
            setTimeout(() => {
                modalOverlay.style.display = 'block';
                modal.style.display = 'block';
                
                setTimeout(() => {
                    modal.classList.add('active');
                    modalOverlay.classList.add('active');
                }, 10);
            }, 0);
            
            // Handle clicking on overlay (optional cancel)
            modalOverlay.addEventListener('click', () => {
                modal.classList.remove('active');
                modalOverlay.classList.remove('active');
                
                // Wait for transition before removing
                setTimeout(() => {
                    document.body.removeChild(modal);
                    document.body.removeChild(modalOverlay);
                    resolve(null); // Return null if cancelled by clicking outside
                }, 300);
            });
        });
    }

    showSelectPanelModal() {
        const modal = document.getElementById('select-panel-modal');
        const overlay = document.getElementById('select-panel-modal-overlay');
        
        if (!modal || !overlay) return;
        
        // Show the modal and overlay
        overlay.style.display = 'block';
        modal.style.display = 'block';
        
        // Trigger transitions by adding active class after a short delay
        setTimeout(() => {
            modal.classList.add('active');
            overlay.classList.add('active');
        }, 10);
        
        const okButton = document.getElementById('ok-select-panel-btn');
        if (okButton) {
            // Use a named function for the handler to allow removal
            const handler = () => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
                // Wait for transition before hiding
                setTimeout(() => {
                    modal.style.display = 'none';
                    overlay.style.display = 'none';
                    // Remove the listener after use
                    okButton.removeEventListener('click', handler);
                }, 300);
            };
            // Remove any previous listener before adding
            okButton.removeEventListener('click', handler);
            okButton.addEventListener('click', handler);
        }
    }

    // --- Make Slider Value Editable ---
    makeSliderValueEditable(slider, valueDisplay, unitSuffix = '', precision = 0) {
        // Check if both slider and valueDisplay exist
        if (!slider || !valueDisplay) {
            console.warn('Missing required elements for makeSliderValueEditable');
            return;
        }

        // Add editable class for styling
        valueDisplay.classList.add('editable-slider-value');
        valueDisplay.contentEditable = true;
        
        // Store the unit suffix and precision for formatting
        valueDisplay.dataset.unitSuffix = unitSuffix;
        valueDisplay.dataset.precision = precision;
        
        // Handle Enter key and Escape key
        valueDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Get the numeric value from the text (remove unit suffix)
                let value = valueDisplay.textContent.replace(unitSuffix, '').trim();
                value = parseFloat(value);
                
                // Validate the value
                if (!isNaN(value)) {
                    // Clamp value to slider's min/max
                    const min = parseFloat(slider.min);
                    const max = parseFloat(slider.max);
                    value = Math.min(Math.max(value, min), max);
                    
                    // Update slider value
                    slider.value = value;
                    
                    // Trigger input event on slider to activate its listeners
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Remove focus
                    valueDisplay.blur();
                } else {
                    // Revert to current slider value
                    const formattedValue = precision > 0 
                        ? parseFloat(slider.value).toFixed(precision) 
                        : Math.round(slider.value);
                    valueDisplay.textContent = `${formattedValue}${unitSuffix}`;
                    valueDisplay.blur();
                }
            } else if (e.key === 'Escape') {
                // Revert to current slider value
                const formattedValue = precision > 0 
                    ? parseFloat(slider.value).toFixed(precision) 
                    : Math.round(slider.value);
                valueDisplay.textContent = `${formattedValue}${unitSuffix}`;
                valueDisplay.blur();
            }
        });
        
        // Handle blur event (clicking away)
        valueDisplay.addEventListener('blur', () => {
            // Get the numeric value from the text
            let value = valueDisplay.textContent.replace(unitSuffix, '').trim();
            value = parseFloat(value);
            
            // Validate the value
            if (!isNaN(value) && value !== parseFloat(slider.value)) {
                // Clamp value to slider's min/max
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                value = Math.min(Math.max(value, min), max);
                
                // Update slider value
                slider.value = value;
                
                // Trigger input event on slider to activate its listeners
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                // Revert to current slider value or format correctly
                const formattedValue = precision > 0 
                    ? parseFloat(slider.value).toFixed(precision) 
                    : Math.round(slider.value);
                valueDisplay.textContent = `${formattedValue}${unitSuffix}`;
            }
        });
    }
} 