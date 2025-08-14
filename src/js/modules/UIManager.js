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
        console.log("[UIManager] setupSidebarTabs called");
        const tabsContainer = document.querySelector('.sidebar-tabs');
        if (!tabsContainer) {
            console.error("[UIManager] Sidebar tabs container not found!");
            return;
        }

        tabsContainer.addEventListener('click', (e) => {
            console.log("[UIManager] Sidebar tab clicked", e.target);
            const clickedTab = e.target.closest('.tab-btn');
            if (!clickedTab) {
                console.log("[UIManager] Click was not on a tab button.");
                return;
            }

            const newMode = clickedTab.dataset.tab;
            console.log("[UIManager] Clicked tab mode:", newMode, "Current mode:", this.comicCreator.currentSidebarMode);
            if (newMode === this.comicCreator.currentSidebarMode) {
                console.log("[UIManager] Clicked tab is already active.");
                return; 
            }

            // Update the active tab visually
            tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
                tab.classList.remove('active');
            });
            clickedTab.classList.add('active');

            // Update the internal mode state
            this.comicCreator.currentSidebarMode = newMode;
            console.log('[UIManager] Switched sidebar mode to:', this.comicCreator.currentSidebarMode);

            // First deselect any currently selected item when switching modes
            this.comicCreator.deselectAll(); 

            // Update visibility of left sidebar content sections
            const sidebarContents = document.querySelectorAll('.sidebar-content > div[data-tab-content]');
            console.log("[UIManager] Found left sidebar content sections:", sidebarContents.length);
            sidebarContents.forEach(content => {
                if (content.dataset.tabContent === newMode) {
                    content.style.display = 'block';
                    console.log("[UIManager] Showing left sidebar content for:", newMode);
                } else {
                    content.style.display = 'none';
                }
            });

            // Then update the right sidebar based on the selected mode
            this.updateRightSidebarView();
        });
        console.log("[UIManager] Event listener for sidebar tabs attached.");
    }

    // --- NEW: Update Right Sidebar View --- 
    updateRightSidebarView() {
        console.log("[UIManager] updateRightSidebarView called for mode:", this.comicCreator.currentSidebarMode);
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) {
            console.error("[UIManager] Properties panel not found!");
            return;
        }

        // Clear previous properties panel content
        propertiesPanel.innerHTML = '';
        console.log("[UIManager] Properties panel cleared.");

        const currentMode = this.comicCreator.currentSidebarMode;
        const panelManager = this.comicCreator.panelManager;
        const backgroundManager = this.comicCreator.backgroundManager;
        const stickerManager = this.comicCreator.stickerManager;
        const textManager = this.comicCreator.textManager; 

        // Show the relevant section based on mode AND current selection
        switch (currentMode) {
            case 'panels':
                console.log("[UIManager] Right sidebar: Panels tab active.");
                let panelProps = document.createElement('div');
                panelProps.id = 'panel-properties';
                panelProps.className = 'properties-section';
                propertiesPanel.appendChild(panelProps);
                panelProps.style.display = 'block';

                if (panelManager.currentPanel) {
                    console.log("[UIManager] Current panel selected, calling updatePanelControls.");
                    panelManager.updatePanelControls(panelManager.currentPanel, panelProps); 
                } else {
                    console.log("[UIManager] No panel selected, showing placeholder.");
                    panelProps.innerHTML = '<h4>Panel Settings</h4><div class="panel-controls"><p>Select a panel to see its properties.</p></div>';
                }
                break;
                
            case 'backgrounds':
                console.log("[UIManager] Right sidebar: Backgrounds tab active. Calling updateBackgroundControls.");
                backgroundManager.updateBackgroundControls(propertiesPanel);
                break;
                
            case 'stickers':
                console.log("[UIManager] Right sidebar: Stickers tab active.");
                let stickerProps = document.createElement('div');
                stickerProps.id = 'sticker-properties'; // Ensure this ID is unique or handled by StickerManager
                stickerProps.className = 'properties-section';
                propertiesPanel.appendChild(stickerProps);
                stickerProps.style.display = 'block';

                if (stickerManager.selectedSticker) { 
                    console.log("[UIManager] Current sticker selected, calling updateStickerControls.");
                    stickerManager.updateStickerControls(stickerProps); 
                } else {
                    console.log("[UIManager] No sticker selected, showing placeholder.");
                    stickerProps.innerHTML = '<h4>Sticker Settings</h4><div class="panel-controls"><p>Select a sticker to see its properties.</p></div>';
                }
                break;
            
            // It seems text properties are handled by a general text-properties div. 
            // We should ensure TextManager or UIManager explicitly shows/hides #text-properties
            // For now, let's assume TextManager is responsible for its own UI visibility when a text element is selected.
            // Or, we add a specific case here if UIManager should control it globally.
        }

        // Handling Text Properties Panel visibility separately if it's a generic panel
        const textPropertiesPanel = document.getElementById('text-properties');
        if (textPropertiesPanel) {
            if (textManager.currentTextBox) {
                console.log("[UIManager] Text box selected, showing text properties panel.");
                textPropertiesPanel.style.display = 'block';
                // textManager.updateTextProperties(textManager.currentTextBox, textPropertiesPanel); // Ensure this is called if needed
            } else {
                console.log("[UIManager] No text box selected, hiding text properties panel.");
                textPropertiesPanel.style.display = 'none';
            }
        }
        console.log("[UIManager] updateRightSidebarView finished.");
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

    showExportProgress(message, percentage, details = {}) {
        if (!this.exportProgressElement) {
            this.exportProgressElement = document.createElement('div');
            this.exportProgressElement.id = 'export-progress-indicator';
            // Assign a class for CSS styling instead of inline styles
            this.exportProgressElement.className = 'export-progress-indicator'; 
            document.body.appendChild(this.exportProgressElement);
        }
        // Pass details through to updateExportProgress
        const totalPages = details.totalPages || 0;
        this.updateExportProgress(message, percentage, totalPages, false, details.jobStatus, details);
        this.exportProgressElement.style.display = 'block'; // Or add a class to show
        this.exportProgressElement.classList.add('show');
    }

    updateExportProgress(message, percentage, totalPages, isError = false, jobStatus = null, details = {}) {
        if (!this.exportProgressElement) {
            this.showExportProgress(message, percentage, { totalPages, jobStatus, ...details }); // Create if not exists
            if (isError) { // Ensure error styling is applied if created in this call
                 this.exportProgressElement.classList.add('error');
            }
            // If created here and it's a compressing status, ensure the right text is set
            if (jobStatus === 'compressing') {
                const textElement = this.exportProgressElement.querySelector('.progress-text');
                if (textElement) textElement.innerHTML = message;
            }
            return;
        }

        let progressText = message;
        // Only add percentage if not in 'compressing' status and other conditions are met
        if (jobStatus !== 'compressing' && totalPages > 0 && percentage >= 0 && percentage <= 100 && !isError) {
             progressText = `${message} (${percentage}%)`;
        } else if (isError) {
            // The message itself will contain the error details, no percentage needed
        } else if (jobStatus === 'compressing') {
            // Message is already set to progressText, no percentage needed
        }
        
        // Clear previous content
        this.exportProgressElement.innerHTML = '';

        // Add stage indicators if stage is provided
        if (details.stage && !isError) {
            const stagesContainer = document.createElement('div');
            stagesContainer.className = 'export-progress-stages';
            stagesContainer.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 1rem; padding: 0.5rem 0;';
            
            const stages = [
                { id: 'prepare', label: '📚 Preparing', active: false },
                { id: 'rendering', label: '🎨 Rendering', active: false },
                { id: 'compile', label: '📄 Compiling', active: false },
                { id: 'complete', label: '✅ Complete', active: false }
            ];
            
            // Set active stage
            stages.forEach(stage => {
                if (stage.id === details.stage) {
                    stage.active = true;
                }
            });
            
            stages.forEach(stage => {
                const stageElement = document.createElement('div');
                stageElement.className = `export-stage ${stage.active ? 'active' : ''}`;
                stageElement.style.cssText = `
                    flex: 1;
                    text-align: center;
                    font-size: 0.85rem;
                    padding: 0.25rem;
                    opacity: ${stage.active ? '1' : '0.4'};
                    font-weight: ${stage.active ? 'bold' : 'normal'};
                    transition: all 0.3s;
                `;
                stageElement.textContent = stage.label;
                stagesContainer.appendChild(stageElement);
            });
            
            this.exportProgressElement.appendChild(stagesContainer);
        }

        const textElement = document.createElement('div');
        textElement.className = 'progress-text';
        textElement.innerHTML = progressText; // Use innerHTML to render styled error spans if any
        this.exportProgressElement.appendChild(textElement);

        if (totalPages > 0 && !isError) {
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress-bar-container';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';

            // Apply/remove indeterminate style based on jobStatus
            if (jobStatus === 'compressing') {
                progressBar.classList.add('indeterminate');
                progressBar.style.width = '100%'; // Indeterminate usually fills the bar
            } else {
                progressBar.classList.remove('indeterminate');
                progressBar.style.width = `${percentage}%`;
            }
            
            progressBarContainer.appendChild(progressBar);
            this.exportProgressElement.appendChild(progressBarContainer);
        }

        if (isError) {
            this.exportProgressElement.classList.add('error');
            this.exportProgressElement.classList.remove('success'); // Ensure success class is removed
        } else if (percentage === 100) {
            this.exportProgressElement.classList.add('success');
            this.exportProgressElement.classList.remove('error');
        } else {
            this.exportProgressElement.classList.remove('error');
            this.exportProgressElement.classList.remove('success');
        }
    }

    hideExportProgress() {
        if (this.exportProgressElement) {
            this.exportProgressElement.style.display = 'none'; // Or remove a class
            this.exportProgressElement.classList.remove('show');
            this.exportProgressElement.classList.remove('error');
            this.exportProgressElement.classList.remove('success');
            // Optional: Remove the element if you don't want to reuse it
            // this.exportProgressElement.remove();
            // this.exportProgressElement = null;
        }
    }

    /**
     * Shows a modal asking the user if they want to compress the PDF.
     * @returns {Promise<string|null>} - Resolves with "Yes", "No", or "Cancel".
     */
    showCompressionChoiceModal() {
        return new Promise((resolve) => {
            const title = "Compress PDF?";
            const message = "Do you want your PDF to get compressed? This will make your file size smaller.";
            const buttonLabels = ["Yes", "No", "Cancel"];

            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'modal';

            modal.innerHTML = `
                <h3>${title}</h3>
                <p style="text-align: center; margin-bottom: 1.5rem; color: #555;">${message}</p>
                <div class="modal-buttons"></div>
            `;

            const buttonsContainer = modal.querySelector('.modal-buttons');
            buttonLabels.forEach((label) => {
                const button = document.createElement('button');
                button.textContent = label;
                if (label === "Yes") {
                    button.className = 'primary-btn';
                } else {
                    button.className = 'secondary-btn';
                }

                button.addEventListener('click', () => {
                    modal.classList.remove('active');
                    modalOverlay.classList.remove('active');
                    setTimeout(() => {
                        document.body.removeChild(modal);
                        document.body.removeChild(modalOverlay);
                        resolve(label);
                    }, 300); // Match CSS transition time
                });
                buttonsContainer.appendChild(button);
            });

            document.body.appendChild(modalOverlay);
            document.body.appendChild(modal);

            setTimeout(() => {
                modalOverlay.style.display = 'block';
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('active');
                    modalOverlay.classList.add('active');
                }, 10);
            }, 0);

            // Handle clicking on overlay for "Cancel"
            modalOverlay.addEventListener('click', () => {
                modal.classList.remove('active');
                modalOverlay.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) document.body.removeChild(modal);
                    if (modalOverlay.parentNode) document.body.removeChild(modalOverlay);
                    resolve("Cancel"); // Resolve with "Cancel" when overlay is clicked
                }, 300);
            });
        });
    }

    /**
     * Shows a modal for choosing export method (client-side vs server-side)
     * @returns {Promise<string|null>} - Resolves with "client", "server", or null
     */
    async showExportMethodModal() {
        return new Promise((resolve) => {
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay export-method-modal-overlay';
            
            const modal = document.createElement('div');
            modal.className = 'modal export-method-modal';
            modal.style.maxWidth = '600px';
            
            modal.innerHTML = `
                <h3 style="text-align: center; margin-bottom: 1.5rem;">Choose Export Method</h3>
                <div class="export-method-options" style="display: flex; gap: 1.5rem; margin-bottom: 1rem;">
                    <div class="export-option" data-method="client" style="flex: 1; padding: 1.5rem; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #333;">⚡ Fast Export</h4>
                        <p style="color: #666; margin: 0 0 1rem 0; font-size: 0.9rem;">Process on your device</p>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: #555;">
                            <li style="margin: 0.3rem 0;">✓ Instant start</li>
                            <li style="margin: 0.3rem 0;">✓ No waiting queue</li>
                            <li style="margin: 0.3rem 0;">✓ Works offline</li>
                        </ul>
                        <button class="primary-btn" style="width: 100%; margin-top: 1rem;">Use Fast Export</button>
                    </div>
                    <div class="export-option" data-method="server" style="flex: 1; padding: 1.5rem; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #333;">🎨 High Quality Export</h4>
                        <p style="color: #666; margin: 0 0 1rem 0; font-size: 0.9rem;">Process on our servers</p>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.85rem; color: #555;">
                            <li style="margin: 0.3rem 0;">✓ Handles large comics</li>
                            <li style="margin: 0.3rem 0;">✓ PDF compression</li>
                            <li style="margin: 0.3rem 0;">✓ Best compatibility</li>
                        </ul>
                        <button class="secondary-btn" style="width: 100%; margin-top: 1rem;">Use Server Export</button>
                    </div>
                </div>
                <div style="text-align: center;">
                    <button class="secondary-btn cancel-export-btn">Cancel</button>
                </div>
            `;
            
            // Add hover effects
            const exportOptions = modal.querySelectorAll('.export-option');
            exportOptions.forEach(option => {
                option.addEventListener('mouseenter', () => {
                    option.style.borderColor = '#007bff';
                    option.style.boxShadow = '0 4px 12px rgba(0,123,255,0.15)';
                });
                option.addEventListener('mouseleave', () => {
                    option.style.borderColor = '#ddd';
                    option.style.boxShadow = 'none';
                });
                
                const button = option.querySelector('button');
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const method = option.dataset.method;
                    this.closeModal(modal, modalOverlay);
                    resolve(method);
                });
            });
            
            // Cancel button
            const cancelBtn = modal.querySelector('.cancel-export-btn');
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modal, modalOverlay);
                resolve(null);
            });
            
            // Overlay click to cancel
            modalOverlay.addEventListener('click', () => {
                this.closeModal(modal, modalOverlay);
                resolve(null);
            });
            
            // Show modal
            document.body.appendChild(modalOverlay);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modalOverlay.style.display = 'block';
                modal.style.display = 'block';
                setTimeout(() => {
                    modal.classList.add('active');
                    modalOverlay.classList.add('active');
                }, 10);
            }, 0);
        });
    }
    
    /**
     * Helper method to close modals with animation
     */
    closeModal(modal, overlay) {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode) document.body.removeChild(modal);
            if (overlay.parentNode) document.body.removeChild(overlay);
        }, 300);
    }
} 