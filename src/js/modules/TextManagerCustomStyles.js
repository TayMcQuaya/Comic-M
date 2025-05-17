// import { globalRgbToHex } from './Utils.js'; // Potentially needed if helper methods are moved here later

export class TextManagerCustomStyles {
    constructor(comicCreator, defaultTextSettings, customTextStyles) {
        this.comicCreator = comicCreator;
        this.defaultTextSettings = defaultTextSettings; // Reference to the object in TextManagerCoreSetup
        this.customTextStyles = customTextStyles;     // Reference to the array in TextManagerCoreSetup
    }

    /**
     * Sets the current text element's style as the default for new text elements
     * @param {HTMLElement} textBox - The text bubble element to use as a template
     */
    setDefaultTextSettings(textBox) {
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) return;
        
        // Update default settings from the current text element
        this.defaultTextSettings.fontFamily = textElement.style.fontFamily || 'Arial';
        this.defaultTextSettings.fontSize = textElement.style.fontSize || '16px';
        this.defaultTextSettings.fontWeight = textElement.style.fontWeight || 'normal';
        this.defaultTextSettings.fontStyle = textElement.style.fontStyle || 'normal';
        this.defaultTextSettings.textDecoration = textElement.style.textDecoration || 'none';
        this.defaultTextSettings.textAlign = textElement.style.textAlign || 'center';
        this.defaultTextSettings.color = textElement.style.color || '#000000';
        this.defaultTextSettings.bubbleType = textBox.dataset.bubbleType || 'speech-bubble';
        
        // Save the default settings in the application state (via TextManagerCoreSetup)
        if (this.comicCreator && this.comicCreator.textManagerCoreSetup) {
            this.comicCreator.textManagerCoreSetup.saveTextSettings();
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.textManagerCoreSetup.saveTextSettings not found. Settings not saved.');
        }
        
        // Show notification to the user
        if (this.comicCreator && this.comicCreator.uiManager) {
            this.comicCreator.uiManager.showNotification('Default text style set', 'success');
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.uiManager.showNotification not found.');
        }
    }

    /**
     * Creates a new custom text style from the current text element
     * @param {HTMLElement} textBox - The text bubble element to create a style from
     * @param {string} styleName - The name for the new custom style
     */
    createCustomTextStyle(textBox, styleName) {
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) return;
        
        // Extract all relevant styles from the text element
        const bubbleClasses = Array.from(textBox.classList)
            .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                          'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                          'no-bubble'].includes(cls));
        
        const tailPositionClass = Array.from(textBox.classList)
            .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));
        
        // Check if bubble is visible
        const isBubbleVisible = textBox.dataset.bubbleType !== 'no-bubble';
        
        // Create the style object
        const newStyle = {
            id: `style_${Date.now()}`,
            name: styleName,
            bubbleType: textBox.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
            tailPosition: textBox.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
            style: {
                fontFamily: textElement.style.fontFamily || 'Arial',
                fontSize: textElement.style.fontSize || '16px',
                fontWeight: textElement.style.fontWeight || 'normal',
                fontStyle: textElement.style.fontStyle || 'normal',
                textDecoration: textElement.style.textDecoration || 'none',
                textTransform: textElement.style.textTransform || 'none',
                textAlign: textElement.style.textAlign || 'center',
                color: textElement.style.color || '#000000',
                // Only save background colors if bubble is visible
                backgroundColor: isBubbleVisible ? (textBox.style.backgroundColor || 'white') : 'transparent',
                bubbleBackgroundColor: isBubbleVisible ? (textBox.style.getPropertyValue('--bubble-background-color') || 'white') : 'transparent',
                bubbleOpacity: isBubbleVisible ? (textBox.style.getPropertyValue('--bubble-opacity') || '1') : '1',
                hasOutline: textElement.dataset.hasOutline === 'true',
                outlineColor: textElement.style.getPropertyValue('--outline-color') || '#000000', // Note: original uses getPropertyValue, but data-outline-color might be more reliable from applyTextOutline
                outlineWidth: textElement.style.getPropertyValue('--outline-width') || '2px',
                lineHeight: textElement.style.lineHeight || 'normal'
            }
        };
        
        // Add the new style to the array
        this.customTextStyles.push(newStyle);
        
        // Save the updated styles (via TextManagerCoreSetup)
        if (this.comicCreator && this.comicCreator.textManagerCoreSetup) {
            this.comicCreator.textManagerCoreSetup.saveTextSettings();
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.textManagerCoreSetup.saveTextSettings not found. Custom styles not saved.');
        }
        
        // Show notification to the user
        if (this.comicCreator && this.comicCreator.uiManager) {
            this.comicCreator.uiManager.showNotification(`Style "${styleName}" created`, 'success');
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.uiManager.showNotification not found.');
        }
        
        return newStyle;
    }

    /**
     * Applies a custom text style to the given text element
     * @param {HTMLElement} textBox - The text bubble element to apply the style to
     * @param {string} styleId - The ID of the custom style to apply
     */
    applyCustomTextStyle(textBox, styleId) {
        const style = this.customTextStyles.find(s => s.id === styleId);
        if (!style) return;
        
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) return;
        
        // Record state before applying style
        if (this.comicCreator && this.comicCreator.historyManager) {
            this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text_style_apply');
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.historyManager not found. State not recorded.');
        }

        // Remove existing bubble classes
        textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 
                               'shout-bubble', 'whisper-bubble', 'jagged-bubble', 'no-bubble');
        
        // Remove existing tail classes
        Array.from(textBox.classList)
            .filter(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'))
            .forEach(cls => textBox.classList.remove(cls));
        
        // Apply bubble type
        textBox.classList.add(style.bubbleType);
        textBox.dataset.bubbleType = style.bubbleType;
        
        // Check if bubble is visible
        const isBubbleVisible = style.bubbleType !== 'no-bubble';
        
        // Apply tail position if present and bubble is visible
        if (style.tailPosition && isBubbleVisible) {
            // const tailClass = `${style.bubbleType.split('-')[0]}-tail-${style.tailPosition}`; // Original logic
            // textBox.classList.add(tailClass); // Original logic
            textBox.dataset.tailPosition = style.tailPosition;
             if (this.comicCreator && this.comicCreator.textManagerStyling) {
                this.comicCreator.textManagerStyling.updateBubbleTail(textBox, style.tailPosition);
            } else {
                console.warn('TextManagerCustomStyles: comicCreator.textManagerStyling.updateBubbleTail not found.');
            }
        } else if (!isBubbleVisible) {
            textBox.dataset.tailPosition = 'none';
             if (this.comicCreator && this.comicCreator.textManagerStyling) {
                this.comicCreator.textManagerStyling.updateBubbleTail(textBox, 'none');
            } else {
                console.warn('TextManagerCustomStyles: comicCreator.textManagerStyling.updateBubbleTail not found.');
            }
        }
        
        // Apply text styles
        textElement.style.fontFamily = style.style.fontFamily;
        textElement.style.fontSize = style.style.fontSize;
        textElement.style.fontWeight = style.style.fontWeight;
        textElement.style.fontStyle = style.style.fontStyle;
        textElement.style.textDecoration = style.style.textDecoration;
        textElement.style.textTransform = style.style.textTransform;
        textElement.style.textAlign = style.style.textAlign;
        textElement.style.color = style.style.color;
        textElement.style.lineHeight = style.style.lineHeight;
        
        // Apply bubble styles only if bubble is visible
        if (isBubbleVisible) {
            textBox.style.backgroundColor = style.style.backgroundColor;
            textBox.style.setProperty('--bubble-background-color', style.style.bubbleBackgroundColor);
            textBox.style.setProperty('--bubble-opacity', style.style.bubbleOpacity);
        } else {
            // Clear background styles if bubble is not visible
            textBox.style.backgroundColor = 'transparent';
            textBox.style.setProperty('--bubble-background-color', 'transparent');
            textBox.style.setProperty('--bubble-opacity', '1'); // Reset opacity
        }
        
        // Apply outline if present
        if (style.style.hasOutline) {
            textElement.dataset.hasOutline = 'true';
            if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.applyTextOutline) {
                this.comicCreator.textManagerStyling.applyTextOutline(textElement, style.style.outlineColor, parseFloat(style.style.outlineWidth || '1px'));
            } else {
                console.warn('TextManagerCustomStyles: comicCreator.textManagerStyling.applyTextOutline not found.');
            }
        } else {
            textElement.dataset.hasOutline = 'false';
            if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.removeTextOutline) {
                this.comicCreator.textManagerStyling.removeTextOutline(textElement);
            } else {
                console.warn('TextManagerCustomStyles: comicCreator.textManagerStyling.removeTextOutline not found.');
            }
        }
        
        // Save the state after applying the style
        if (this.comicCreator) {
            this.comicCreator.saveCurrentPageState();
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.saveCurrentPageState not found. State not saved.');
        }
        
        // Update the main properties panel if the selected text box is the one being styled
        if (this.comicCreator && this.comicCreator.textManagerBubbleManipulation && this.comicCreator.textManagerBubbleManipulation.currentTextBox === textBox) {
            if (this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.updateTextProperties) {
                this.comicCreator.textManagerStyling.updateTextProperties(textBox);
            }
        }

        // Update the formatting popup if it's open for this text box
        const popup = document.getElementById('text-format-popup');
        if (popup && this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.updatePopupControls) {
            // Check if the popup is for the current textBox (this might need a more robust check, e.g., a data attribute on the popup)
            // For now, assuming if it's open, it might need an update.
            this.comicCreator.textManagerStyling.updatePopupControls(popup, textBox); 
        }
    }

    /**
     * Deletes a custom text style
     * @param {string} styleId - The ID of the custom style to delete
     */
    deleteCustomTextStyle(styleId) {
        const styleIndex = this.customTextStyles.findIndex(s => s.id === styleId);
        if (styleIndex === -1) return;
        
        // Remove the style
        const styleName = this.customTextStyles[styleIndex].name;
        this.customTextStyles.splice(styleIndex, 1);
        
        // Save the updated styles (via TextManagerCoreSetup)
        if (this.comicCreator && this.comicCreator.textManagerCoreSetup) {
            this.comicCreator.textManagerCoreSetup.saveTextSettings();
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.textManagerCoreSetup.saveTextSettings not found. Custom styles not saved after deletion.');
        }
        
        // Show notification to the user
        if (this.comicCreator && this.comicCreator.uiManager) {
            this.comicCreator.uiManager.showNotification(`Style "${styleName}" deleted`, 'success');
        } else {
            console.warn('TextManagerCustomStyles: comicCreator.uiManager.showNotification not found.');
        }
    }

    /**
     * Generates HTML for the custom styles grid
     * @returns {string} HTML for custom styles
     */
    generateCustomStylesHTML() {
        if (!this.customTextStyles || this.customTextStyles.length === 0) {
            return `<div class="no-styles-message">No custom styles yet. Create one by clicking "Save Current Style".</div>`;
        }
        
        return this.customTextStyles.map(style => {
            // Set preview background to transparent for no-bubble styles
            const isBubbleVisible = style.bubbleType !== 'no-bubble';
            const backgroundStyle = isBubbleVisible 
                ? `background-color: ${style.style.backgroundColor || 'white'};` 
                : `background-color: transparent;`;
            
            // Ensure font size has 'px' for preview consistency if it's just a number
            let previewFontSize = style.style.fontSize || '12px';
            if (typeof previewFontSize === 'number' || !isNaN(parseFloat(previewFontSize)) && !previewFontSize.endsWith('px')) {
                previewFontSize = `${parseFloat(previewFontSize)}px`;
            }
            if (parseFloat(previewFontSize) < 8) previewFontSize = '8px'; // Minimum for preview
            if (parseFloat(previewFontSize) > 18) previewFontSize = '12px'; // Cap for preview space


            return `
                <div class="style-preview" data-style-id="${style.id}" title="${style.name}">
                    <div class="style-preview-bubble ${style.bubbleType}" style="${backgroundStyle}">
                        <div class="style-preview-text" 
                             style="font-family: ${style.style.fontFamily || 'Arial'}; 
                                    font-size: ${previewFontSize}; 
                                    color: ${style.style.color || '#000000'};
                                    font-weight: ${style.style.fontWeight || 'normal'};
                                    font-style: ${style.style.fontStyle || 'normal'};
                                    text-transform: ${style.style.textTransform || 'none'};
                                    line-height: normal; /* For preview consistency */
                                    ">
                            Aa
                        </div>
                    </div>
                    <span class="style-preview-name">${style.name.length > 15 ? style.name.substring(0,12) + '...' : style.name}</span>
                    <button class="delete-style-btn" data-style-id="${style.id}" title="Delete style ${style.name}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * Sets up event listeners for the custom styles section
     * @param {HTMLElement} popup - The popup element
     * @param {HTMLElement} textBox - The text bubble element
     */
    setupCustomStylesListeners(popup, textBox) {
        // Set as default button
        const setAsDefaultBtn = popup.querySelector('.set-as-default-btn');
        if (setAsDefaultBtn) {
            setAsDefaultBtn.addEventListener('click', () => {
                this.setDefaultTextSettings(textBox);
            });
        }
        
        // Save as style button
        const saveAsStyleBtn = popup.querySelector('.save-as-style-btn');
        if (saveAsStyleBtn) {
            saveAsStyleBtn.addEventListener('click', () => {
                // Prompt for style name
                const styleName = prompt('Enter a name for this style:', 'My Custom Style');
                if (styleName) {
                    this.createCustomTextStyle(textBox, styleName);
                    
                    // Update the custom styles grid
                    const stylesGrid = popup.querySelector('.custom-styles-grid');
                    if (stylesGrid) {
                        stylesGrid.innerHTML = this.generateCustomStylesHTML();
                        
                        // Re-attach event listeners for the new elements
                        this.setupStylePreviewListeners(popup, textBox);
                    }
                }
            });
        }
        
        // Set up listeners for existing style previews
        this.setupStylePreviewListeners(popup, textBox);
    }

    /**
     * Sets up event listeners for style preview elements
     * @param {HTMLElement} popup - The popup element
     * @param {HTMLElement} textBox - The text bubble element
     */
    setupStylePreviewListeners(popup, textBox) {
        // Apply style on click
        popup.querySelectorAll('.style-preview').forEach(preview => {
            preview.addEventListener('click', (e) => {
                // Don't trigger if clicking the delete button
                if (e.target.closest('.delete-style-btn')) return;
                
                const styleId = preview.dataset.styleId;
                this.applyCustomTextStyle(textBox, styleId);
                
                // Update the popup controls to reflect the applied style
                if (this.comicCreator && this.comicCreator.textManagerStyling) {
                    this.comicCreator.textManagerStyling.updatePopupControls(popup, textBox);
                } else {
                    console.warn('TextManagerCustomStyles: comicCreator.textManagerStyling.updatePopupControls not found.');
                }
            });
        });
        
        // Delete style button
        popup.querySelectorAll('.delete-style-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the parent's click event
                
                const styleId = btn.dataset.styleId;
                if (confirm('Are you sure you want to delete this style? \nThis action cannot be undone.')) {
                    this.deleteCustomTextStyle(styleId);
                    
                    // Update the custom styles grid
                    const stylesGrid = popup.querySelector('.custom-styles-grid');
                    if (stylesGrid) {
                        stylesGrid.innerHTML = this.generateCustomStylesHTML();
                        
                        // Re-attach event listeners for the new elements
                        // This ensures new delete buttons also work
                        this.setupStylePreviewListeners(popup, textBox);
                    }
                }
            });
        });
    }

    /**
     * Updates the outline buttons in the popup based on current text element state
     * @param {HTMLElement} popup - The popup element
     * @param {HTMLElement} textElement - The text element to update outline for
     */
    updateOutlineButtonsInPopup(popup, textElement) {
        if (!popup || !textElement) return;
        
        // Get outline status
        const hasOutline = textElement.getAttribute('data-has-outline') === 'true';
        
        // Update text outline checkbox and controls
        const textOutlineCheckbox = popup.querySelector('#text-outline');
        const outlineColorPicker = popup.querySelector('#outline-color');
        const outlineColorHex = popup.querySelector('.outline-color-hex');
        const colorPickerContainer = outlineColorPicker?.closest('.color-picker-container');
        
        if (!textOutlineCheckbox || !outlineColorPicker || !outlineColorHex || !colorPickerContainer) return;
        
        if (hasOutline) {
            textOutlineCheckbox.checked = true;
            colorPickerContainer.classList.remove('hidden');
            outlineColorPicker.disabled = false;
            outlineColorHex.removeAttribute('disabled');
            
            let outlineColor = '#000000'; // Default
            if (this.comicCreator && this.comicCreator.textManagerUtils && this.comicCreator.textManagerUtils.getOutlineColor) {
                outlineColor = this.comicCreator.textManagerUtils.getOutlineColor(textElement);
            } else {
                console.warn('TextManagerCustomStyles: comicCreator.textManagerUtils.getOutlineColor not found.');
            }
            outlineColorPicker.value = outlineColor; // Assumes getOutlineColor returns hex
            outlineColorHex.textContent = outlineColor.toUpperCase();
        } else {
            textOutlineCheckbox.checked = false;
            colorPickerContainer.classList.add('hidden');
            outlineColorPicker.disabled = true;
            outlineColorHex.setAttribute('disabled', true);
        }
    }
} 