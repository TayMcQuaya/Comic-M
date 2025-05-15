import { globalRgbToHex, getTextWithLineBreaks } from './Utils.js'; // Import Utils

export class TextManager {
    constructor(comicCreator) {
        // Store a reference to the main ComicCreator instance
        // This allows the TextManager to access properties (like pages, uploadedImages)
        // and methods (like showNotification, selectPanel) from the main application.
        this.comicCreator = comicCreator;

        // Track the currently selected text box element within the editor
        this.currentTextBox = null;
        
        // Default font settings
        this.defaultTextSettings = {
            fontFamily: 'Arial',
            fontSize: '16px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'center',
            color: '#000000',
            bubbleType: 'speech-bubble'
        };
        
        // Default SVG tail settings for speech bubbles
        this.defaultSpeechTailSettings = {
            useSvgTail: true,
            tailColor: '#ffffff', // Match bubble background by default
            tailPosition: 'bottom',
            speechTailLength: 20,
            speechTailWidth: 15,
            speechTailInset: 50, // percent
            speechTailShear: 0, // percent
            speechTailOutline: true
        };
        
        // Default SVG tail settings for thought bubbles
        this.defaultThoughtTailSettings = {
            useSvgTail: true,
            tailColor: '#ffffff', // Match bubble background by default
            tailPosition: 'bottom',
            thoughtTailInset: 50, // percent
            thoughtNumCircles: 3,
            thoughtCircleRadius: 5,
            thoughtCircleSpacing: 5,
            thoughtTailOffset: 0
        };
        
        // Array to store custom text styles
        this.customTextStyles = [];
        
        // Load saved settings
        this.loadTextSettings();

        console.log("TextManager initialized with SVG tails support");
    }

    // Methods related to text bubble creation, selection, styling, 
    // state management, and event handling will be moved here.

    addTextToPanel(panel) {
        // Deselect everything else first to ensure correct initial layering
        this.comicCreator.deselectAll(); 
        
        // Record state before adding text, with special action type for text creation
        this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text_create');

        // Create text container with default speech bubble
        const textId = `text_${Date.now()}`;
        const textContainer = document.createElement('div');
        textContainer.className = `text-bubble ${this.defaultTextSettings.bubbleType}`;
        textContainer.id = textId;
        textContainer.dataset.bubbleType = this.defaultTextSettings.bubbleType;
        textContainer.style.position = 'absolute';
        // Use pixels, position near panel center initially
        const panelRect = panel.getBoundingClientRect(); 
        // Use clientWidth/Height which includes padding
        const initialLeft = Math.max(0, (panel.clientWidth / 2) - 50); // Approx center minus half default width
        const initialTop = Math.max(0, (panel.clientHeight / 2) - 25); // Approx center minus half default height
        textContainer.style.left = `${initialLeft}px`; 
        textContainer.style.top = `${initialTop}px`;
        // textContainer.style.transform = 'translate(-50%, -50%)'; // No longer using transform for centering
        textContainer.style.minWidth = '100px';
        textContainer.style.minHeight = '50px';
        textContainer.style.padding = '10px';
        textContainer.style.zIndex = '100'; // Ensure panel text is also above stickers
        
        // Create editable text element
        const textElement = document.createElement('div');
        textElement.className = 'text-content';
        textElement.contentEditable = true;
        textElement.innerHTML = 'Click to edit text';
        textElement.style.outline = 'none';
        textElement.style.wordWrap = 'break-word';
        
        // Apply default text settings
        textElement.style.fontFamily = this.defaultTextSettings.fontFamily;
        textElement.style.fontSize = this.defaultTextSettings.fontSize;
        textElement.style.fontWeight = this.defaultTextSettings.fontWeight;
        textElement.style.fontStyle = this.defaultTextSettings.fontStyle;
        textElement.style.textDecoration = this.defaultTextSettings.textDecoration;
        textElement.style.textAlign = this.defaultTextSettings.textAlign;
        textElement.style.color = this.defaultTextSettings.color;
        textElement.style.padding = '2.5px 2px 5px 2px'; // Reduced top padding by 50%
        
        // Add drag handle for better usability
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
        dragHandle.title = 'Drag to move';
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        resizeHandle.title = 'Drag to resize';
        
        // Add edit formatting button
        const formatButton = document.createElement('div');
        formatButton.className = 'format-text-btn';
        formatButton.innerHTML = '<i class="fas fa-palette"></i>';
        formatButton.title = 'Format text';
        
        // Add delete button
        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-text-btn';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.title = 'Delete text';
        
        // Append elements
        textContainer.appendChild(textElement);
        textContainer.appendChild(dragHandle);
        textContainer.appendChild(resizeHandle);
        textContainer.appendChild(formatButton);
        textContainer.appendChild(deleteButton);
        panel.appendChild(textContainer);
        
        // Make draggable (via ComicCreator)
        this.comicCreator.dragAndDropManager.makeTextDraggable(textContainer, dragHandle);
        
        // Make resizable (via ComicCreator)
        this.comicCreator.dragAndDropManager.makeTextResizable(textContainer, resizeHandle);
        
        // Setup delete functionality
        deleteButton.addEventListener('click', () => {
            textContainer.remove();
            
            // Hide the formatting popup if open
            const popup = document.getElementById('text-format-popup');
            if (popup) popup.style.display = 'none';
            
            // Hide properties panel (handled by deselectAll)
            this.comicCreator.deselectAll(); 

            // Save state (via ComicCreator)
            this.comicCreator.saveCurrentPageState();
        });
        
        // Setup formatting button
        formatButton.addEventListener('click', (e) => {
            this.showTextFormatPopup(textContainer, e); // Call internal method
        });
        
        // Setup text selection
        textContainer.addEventListener('click', (e) => {
            // Avoid selecting if clicking internal controls or the text itself initially
            if (e.target !== textElement && 
                !e.target.closest('.format-text-btn') && 
                !e.target.closest('.resize-handle') && 
                !e.target.closest('.delete-text-btn') &&
                !e.target.closest('.drag-handle')) { 
                this.selectTextBox(textContainer); // Call internal method
                
                // Prevent the event from propagating to avoid deselection by canvas click
                e.stopPropagation();
            }
        });
        
        // Add a second click listener to the text element that lets the contentEditable work
        // but also selects the text bubble when clicked on the edge/padding of the text element
        textElement.addEventListener('click', (e) => {
            // Calculate if the click is near the edge of the text element (within 10px of the border)
            const rect = textElement.getBoundingClientRect();
            const isNearEdge = 
                e.clientX - rect.left < 10 || 
                rect.right - e.clientX < 10 || 
                e.clientY - rect.top < 10 || 
                rect.bottom - e.clientY < 10;
                
            if (isNearEdge) {
                // If clicking near the edge, select the text box but don't interfere with editing
                this.selectTextBox(textContainer); // Call internal method
                // Don't prevent default so text editing still works
            }
            // Allow click to propagate for contentEditable focus
        });
        
        // Automatically select the new text box
        this.selectTextBox(textContainer); // Call internal method

        // Save state immediately after adding
        // this.comicCreator.saveCurrentPageState(); 
        
        return textContainer;
    }

    addTextToCanvas() {
         // Deselect everything else first to ensure correct initial layering
        this.comicCreator.deselectAll();
        
        // Record state before adding text, with special action type for text creation
        this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text_create');

        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) {
            console.error("Cannot add text, canvas not found.");
            return;
        }

        // Determine z-index based on current mode (via ComicCreator) - REMOVED Conditional Logic
        // const zIndex = this.comicCreator.currentSidebarMode === 'backgrounds' ? '5' : '100'; // Keep backgrounds at z-index 5, text at 100 (below stickers at 200)
        const zIndex = '100'; // Canvas text should always have a high z-index

        // Create text container
        const textId = `canvas_text_${Date.now()}`;
        const textContainer = document.createElement('div');
        textContainer.className = `text-bubble ${this.defaultTextSettings.bubbleType}`;
        textContainer.id = textId;
        textContainer.dataset.bubbleType = this.defaultTextSettings.bubbleType;
        textContainer.style.position = 'absolute';
        // Center position based on canvas, not panel
        const canvasRect = canvas.getBoundingClientRect();
        // Position top-left corner near center initially
        const initialLeft = Math.max(0, (canvasRect.width / 2) - 50); // Approx center minus half default width
        const initialTop = Math.max(0, (canvasRect.height / 2) - 25); // Approx center minus half default height
        textContainer.style.left = `${initialLeft}px`; 
        textContainer.style.top = `${initialTop}px`;
        // textContainer.style.transform = 'translate(-50%, -50%)'; // REMOVE this centering transform
        textContainer.style.minWidth = '100px';
        textContainer.style.padding = '10px';
        textContainer.style.zIndex = zIndex; // Leave text elements at their default z-index

        // Create editable text element
        const textElement = document.createElement('div');
        textElement.className = 'text-content';
        textElement.contentEditable = true;
        textElement.innerHTML = 'Click to edit text';
        textElement.style.outline = 'none';
        textElement.style.wordWrap = 'break-word';
        
        // Apply default text settings
        textElement.style.fontFamily = this.defaultTextSettings.fontFamily;
        textElement.style.fontSize = this.defaultTextSettings.fontSize;
        textElement.style.fontWeight = this.defaultTextSettings.fontWeight;
        textElement.style.fontStyle = this.defaultTextSettings.fontStyle;
        textElement.style.textDecoration = this.defaultTextSettings.textDecoration;
        textElement.style.textAlign = this.defaultTextSettings.textAlign;
        textElement.style.color = this.defaultTextSettings.color;
        textElement.style.padding = '2.5px 2px 5px 2px'; // Reduced top padding by 50%

        // Add control handles (same as addTextToPanel)
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
        dragHandle.title = 'Drag to move';

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        resizeHandle.title = 'Drag to resize';

        const formatButton = document.createElement('div');
        formatButton.className = 'format-text-btn';
        formatButton.innerHTML = '<i class="fas fa-palette"></i>';
        formatButton.title = 'Format text';

        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-text-btn';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.title = 'Delete text';

        // Append elements
        textContainer.appendChild(textElement);
        textContainer.appendChild(dragHandle);
        textContainer.appendChild(resizeHandle);
        textContainer.appendChild(formatButton);
        textContainer.appendChild(deleteButton);
        canvas.appendChild(textContainer); // Append directly to canvas

        // Make draggable (via ComicCreator)
        this.comicCreator.dragAndDropManager.makeCanvasTextDraggable(textContainer, dragHandle); // Use a new/adapted function

        // Make resizable (via ComicCreator)
        this.comicCreator.dragAndDropManager.makeTextResizable(textContainer, resizeHandle);

        // Setup delete functionality (same as addTextToPanel)
        deleteButton.addEventListener('click', () => {
            textContainer.remove();
            const popup = document.getElementById('text-format-popup');
            if (popup) popup.style.display = 'none';
            // No text properties panel to hide specifically here, deselectAll handles it
            this.comicCreator.deselectAll(); 
            this.comicCreator.saveCurrentPageState(); // Save state after deletion (via ComicCreator)
        });

        // Setup formatting button (same as addTextToPanel)
        formatButton.addEventListener('click', (e) => {
            this.showTextFormatPopup(textContainer, e); // Call internal method
        });

        // Setup text selection (same logic, just ensure it works on canvas)
        textContainer.addEventListener('click', (e) => {
            if (e.target !== textElement && 
                !e.target.closest('.format-text-btn') && 
                !e.target.closest('.resize-handle') && 
                !e.target.closest('.delete-text-btn') &&
                !e.target.closest('.drag-handle')) {
                this.selectTextBox(textContainer); // Call internal method
                e.stopPropagation();
            }
        });
        textElement.addEventListener('click', (e) => {
            const rect = textElement.getBoundingClientRect();
            const isNearEdge = 
                e.clientX - rect.left < 10 || 
                rect.right - e.clientX < 10 || 
                e.clientY - rect.top < 10 || 
                rect.bottom - e.clientY < 10;
            if (isNearEdge) {
                this.selectTextBox(textContainer); // Call internal method
            }
            // Allow click to propagate for contentEditable focus
        });

        // Automatically select the new text box
        this.selectTextBox(textContainer); // Call internal method

        // Save state immediately after adding (REMOVE THIS LINE)
        // this.comicCreator.saveCurrentPageState(); 

        return textContainer;
    }

    selectTextBox(textBox) {
        // Deselect any previously selected text box (visually)
        document.querySelectorAll('.text-bubble').forEach(box => {
            box.classList.remove('selected-text');
        });

        // --- Explicitly deselect any currently selected panel --- 
        if (this.comicCreator.panelManager.currentPanel) {
            this.comicCreator.panelManager.selectPanel(null); // Deselect the panel
        }
        // --- End panel deselection --- 
        
        // --- Explicitly deselect any currently selected sticker --- 
        if (this.comicCreator.stickerManager.currentSticker) { // Check StickerManager's property
            this.comicCreator.stickerManager.deselectCurrentSticker(); // Call StickerManager method
        }
        // --- End sticker deselection --- 

        // Select the current text box
        textBox.classList.add('selected-text');
        this.currentTextBox = textBox; // Use internal property
        
        // Ensure the correct properties panel is visible
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) {
            console.error('Error: Main properties panel (.properties-panel) not found.');
            return;
        }

        // Hide all other property sections first
        propertiesPanel.querySelectorAll('.properties-section').forEach(sec => {
            sec.style.display = 'none';
        });

        // Find or create the text properties container
        let textProperties = propertiesPanel.querySelector('#text-properties');
        if (!textProperties) { 
            console.log('#text-properties not found, creating it.');
            textProperties = document.createElement('div');
            textProperties.id = 'text-properties';
            textProperties.className = 'properties-section'; // Add class for consistency
            propertiesPanel.appendChild(textProperties);
        }
        
        // Show the text properties panel
        textProperties.style.display = 'block';
        
        // Update properties panel content
        this.updateTextProperties(textBox); // Call internal method
    }
    
    updateTextProperties(textBox) {
        const textProperties = document.getElementById('text-properties');
        if (!textProperties) { 
            console.error('Error: Text properties panel (#text-properties) not found in updateTextProperties.');
            return;
        }

        if (!textBox) return;
        
        // Record state before updating text properties
        this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text');

        const textElement = textBox.querySelector('.text-content');
        if (!textElement) {
            console.error("Could not find '.text-content' inside the provided textBox element.", textBox);
            textProperties.innerHTML = '<p>Error loading text properties.</p>'; 
            return;
        }
        
        const computedStyle = window.getComputedStyle(textElement);
        
        // (Keep the innerHTML generation from main.js - too long to paste here)
        textProperties.innerHTML = `...`; // Placeholder for brevity
        textProperties.innerHTML = `
            <h4>Text Settings</h4>
            <div class="text-controls">
                <div class="control-group">
                    <label>Bubble Style</label>
                    <select class="bubble-type">
                        <option value="speech-bubble">Speech Bubble</option>
                        <option value="thought-bubble">Thought Bubble</option>
                        <option value="caption-box">Caption/Narration</option>
                        <option value="shout-bubble">Shout Bubble</option>
                        <option value="whisper-bubble">Whisper Bubble</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Font</label>
                    <div class="custom-select">
                    <select class="font-family">
                            <option disabled class="font-category">Common Fonts</option>
                            <option value="Arial" class="font-option">
                                <span class="font-preview font-arial">Arial - Comic Text</span>
                            </option>
                            <option value="Comic Sans MS" class="font-option">
                                <span class="font-preview font-comic-sans">Comic Sans MS - Comic Text</span>
                            </option>
                            <option value="Times New Roman" class="font-option">
                                <span class="font-preview font-times">Times New Roman - Comic Text</span>
                            </option>
                            
                            <option disabled class="font-category">Sound Effects</option>
                            <option value="Impact" class="font-option">
                                <span class="font-preview font-impact">Impact - BOOM!</span>
                            </option>
                            <option value="Bangers" class="font-option">
                                <span class="font-preview font-bangers">Bangers - POW!</span>
                            </option>
                            <option value="Anton" class="font-option">
                                <span class="font-preview font-anton">Anton - CRASH!</span>
                            </option>
                            </option>
                            </option>
                            
                            <option disabled class="font-category">Handwriting Styles</option>
                            <option value="Comic Neue" class="font-option">
                                <span class="font-preview font-comic-neue">Comic Neue - Casual</span>
                            </option>
                            <option value="Permanent Marker" class="font-option">
                                <span class="font-preview font-permanent-marker">Permanent Marker</span>
                            </option>
                            <option value="Gloria Hallelujah" class="font-option" ${textElement.style.fontFamily === 'Gloria Hallelujah' ? 'selected' : ''}>
                                <span class="font-preview font-gloria-hallelujah">Gloria Hallelujah</span>
                            </option>
                            
                            <option disabled class="font-category">Title/Header Fonts</option>
                            <option value="Luckiest Guy" class="font-option" ${textElement.style.fontFamily === 'Luckiest Guy' ? 'selected' : ''}>
                                <span class="font-preview font-luckiest-guy">Luckiest Guy</span>
                            </option>
                            <option value="Boogaloo" class="font-option">
                                <span class="font-preview font-boogaloo">Boogaloo</span>
                            </option>
                            <option value="Acme" class="font-option">
                                <span class="font-preview font-acme">Acme</span>
                            </option>
                            </option>
                    </select>
                    </div>
                </div>
                <div class="control-group">
                    <label>Size</label>
                    <input type="range" class="font-size" min="8" max="36" value="16">
                    <span class="font-size-value">16px</span>
                </div>
                <div class="control-group">
                    <label>Text Color</label>
                    <div class="color-picker-container">
                        <input type="color" class="font-color" value="#000000">
                        <div class="hex-display font-color-hex">#000000</div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Bubble Color</label>
                    <div class="color-picker-container">
                        <input type="color" class="bubble-color" value="#ffffff">
                        <div class="hex-display bubble-color-hex">#ffffff</div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Text Style</label>
                    <div class="text-style-buttons">
                        <button class="style-btn bold-btn ${textElement.style.fontWeight === 'bold' ? 'active' : ''}" title="Bold">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="style-btn italic-btn ${textElement.style.fontStyle === 'italic' ? 'active' : ''}" title="Italic">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button class="style-btn underline-btn ${textElement.style.textDecoration === 'underline' ? 'active' : ''}" title="Underline">
                            <i class="fas fa-underline"></i>
                        </button>
                        <button class="style-btn all-caps-btn ${textElement.style.textTransform === 'uppercase' ? 'active' : ''}" title="All Caps">
                            <i class="fas fa-font"></i>
                        </button>
                    </div>
                </div>
                <div class="control-group">
                    <label>Rotation</label>
                    <input type="range" class="rotation" min="-180" max="180" value="0">
                    <span class="rotation-value">0°</span>
                </div>
            </div>
        `;
        
        // Set initial values (using globalRgbToHex from import)
        const bubbleType = textProperties.querySelector('.bubble-type');
        bubbleType.value = textBox.dataset.bubbleType || 'speech-bubble';
        
        const fontFamily = textProperties.querySelector('.font-family');
        fontFamily.value = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '') || 'Arial';
        
        const fontSize = textProperties.querySelector('.font-size');
        const fontSizeValue = parseInt(computedStyle.fontSize) || 16;
        fontSize.value = fontSizeValue;
        textProperties.querySelector('.font-size-value').textContent = `${fontSizeValue}px`;
        
        const fontColor = textProperties.querySelector('.font-color');
        const fontColorHex = textProperties.querySelector('.font-color-hex');
        const fontColorValue = globalRgbToHex(computedStyle.color) || '#000000'; 
        fontColor.value = fontColorValue;
        fontColorHex.textContent = fontColorValue;
        
        const bubbleColor = textProperties.querySelector('.bubble-color');
        const bubbleColorHex = textProperties.querySelector('.bubble-color-hex');
        const bubbleColorValue = globalRgbToHex(window.getComputedStyle(textBox).backgroundColor) || '#ffffff'; 
        bubbleColor.value = bubbleColorValue;
        bubbleColorHex.textContent = bubbleColorValue;
        
        const rotation = textProperties.querySelector('.rotation');
        const transform = textBox.style.transform;
        const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
        const rotationValue = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
        rotation.value = rotationValue;
        textProperties.querySelector('.rotation-value').textContent = `${rotationValue}°`;
        
        // Add event listeners (referencing this.comicCreator.saveCurrentPageState and this.comicCreator.makeSliderValueEditable)
        bubbleType.addEventListener('change', () => {
            textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble');
            textBox.classList.add(bubbleType.value);
            textBox.dataset.bubbleType = bubbleType.value;
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        fontFamily.addEventListener('change', () => {
            textElement.style.fontFamily = fontFamily.value;
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        fontSize.addEventListener('input', () => {
            textElement.style.fontSize = `${fontSize.value}px`;
            textProperties.querySelector('.font-size-value').textContent = `${fontSize.value}px`;
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        fontColor.addEventListener('input', () => {
            textElement.style.color = fontColor.value;
            fontColorHex.textContent = fontColor.value.toUpperCase();
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        fontColorHex.contentEditable = true;
        fontColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = fontColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    fontColor.value = hexValue;
                    textElement.style.color = hexValue;
                    this.comicCreator.saveCurrentPageState(); // Use comicCreator
                } else {
                    fontColorHex.textContent = fontColor.value.toUpperCase();
                }
                fontColorHex.blur();
            }
        });
        fontColorHex.addEventListener('blur', () => {
            const hexValue = fontColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                fontColor.value = hexValue;
                textElement.style.color = hexValue;
                this.comicCreator.saveCurrentPageState(); // Use comicCreator
            } else {
                fontColorHex.textContent = fontColor.value.toUpperCase();
            }
        });
        
        bubbleColor.addEventListener('input', () => {
            textBox.style.backgroundColor = bubbleColor.value;
            textBox.style.setProperty('--bubble-background-color', bubbleColor.value);
            bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        bubbleColorHex.contentEditable = true;
        bubbleColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = bubbleColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    bubbleColor.value = hexValue;
                    textBox.style.backgroundColor = hexValue;
                    textBox.style.setProperty('--bubble-background-color', hexValue);
                    this.comicCreator.saveCurrentPageState(); // Use comicCreator
                } else {
                    bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
                }
                bubbleColorHex.blur();
            }
        });
        bubbleColorHex.addEventListener('blur', () => {
            const hexValue = bubbleColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                bubbleColor.value = hexValue;
                textBox.style.backgroundColor = hexValue;
                textBox.style.setProperty('--bubble-background-color', hexValue);
                this.comicCreator.saveCurrentPageState(); // Use comicCreator
            } else {
                bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
            }
        });
        
        const boldBtn = textProperties.querySelector('.bold-btn');
        boldBtn.addEventListener('click', () => {
            const isBold = textElement.style.fontWeight === 'bold';
            textElement.style.fontWeight = isBold ? 'normal' : 'bold';
            boldBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        const italicBtn = textProperties.querySelector('.italic-btn');
        italicBtn.addEventListener('click', () => {
            const isItalic = textElement.style.fontStyle === 'italic';
            textElement.style.fontStyle = isItalic ? 'normal' : 'italic';
            italicBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        const underlineBtn = textProperties.querySelector('.underline-btn');
        underlineBtn.addEventListener('click', () => {
            const isUnderline = textElement.style.textDecoration === 'underline';
            textElement.style.textDecoration = isUnderline ? 'none' : 'underline';
            underlineBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        const allCapsBtn = textProperties.querySelector('.all-caps-btn');
        allCapsBtn.addEventListener('click', () => {
            const isAllCaps = textElement.style.textTransform === 'uppercase';
            textElement.style.textTransform = isAllCaps ? 'none' : 'uppercase';
            allCapsBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        const rotationSlider = textProperties.querySelector('.rotation');
        const rotationValueDisplay = textProperties.querySelector('.rotation-value');

        // ... (rest of initialization and event listener for rotation) ...
         if (rotationSlider) {
            rotationSlider.addEventListener('input', () => {
                const value = rotationSlider.value;
                rotationValueDisplay.textContent = `${Math.round(value)}°`;
                textBox.style.transform = `rotate(${value}deg)`;
                this.comicCreator.saveCurrentPageState(); // Use comicCreator
            });
        }
        
        // Make rotation value editable (via ComicCreator)
        if (rotationSlider && rotationValueDisplay) { 
            this.comicCreator.uiManager.makeSliderValueEditable(rotationSlider, rotationValue, '°', 0); // Corrected path
        } else {
            console.error("Could not find rotation slider or value display element in text properties panel.");
        }
        
        // Set active state for buttons
        if (textElement.style.fontWeight === 'bold') boldBtn.classList.add('active');
        if (textElement.style.fontStyle === 'italic') italicBtn.classList.add('active');
        if (textElement.style.textDecoration === 'underline') underlineBtn.classList.add('active');
        if (textElement.style.textTransform === 'uppercase') allCapsBtn.classList.add('active');
    }
    

    showTextFormatPopup(textBox, event) {
        let popup = document.getElementById('text-format-popup');
        if (popup) popup.remove();
        
        // Select this text box (calls internal selectTextBox)
        this.selectTextBox(textBox); 
        
        popup = document.createElement('div');
        popup.id = 'text-format-popup';
        popup.className = 'text-format-popup';
        
        const propertiesPanel = document.querySelector('.properties-panel');
        const propRect = propertiesPanel.getBoundingClientRect();
        const top = propRect.top;
        const left = propRect.left - 310; 
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        
        const textElement = textBox.querySelector('.text-content');
        
        // Build the innerHTML for the popup
         popup.innerHTML = `
            <div class="popup-header">
                <h3>Text Formatting</h3>
                <button class="close-popup"><i class="fas fa-times"></i></button>
            </div>
            <div class="popup-content">
                <!-- Custom Text Styles Section -->
                <div class="popup-section">
                    <h4>Custom Styles</h4>
                    <div class="custom-styles-container">
                        <div class="custom-styles-grid">
                            ${this.generateCustomStylesHTML()}
                        </div>
                        <div class="custom-styles-actions">
                            <button class="save-as-style-btn primary-btn">
                                <i class="fas fa-save"></i> Save Current Style
                            </button>
                            <button class="set-as-default-btn primary-btn">
                                <i class="fas fa-thumbtack"></i> Set as Default
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Bubble Style</h4>
                    <div class="bubble-toggle">
                        <label>
                            <input type="checkbox" id="show-bubble" ${textBox.dataset.bubbleType !== 'no-bubble' ? 'checked' : ''}>
                            Show Bubble
                        </label>
                    </div>
                    <div class="bubble-options">
                        <div class="bubble-grid">
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'speech-bubble' ? 'selected' : ''}" data-type="speech-bubble">
                                <div class="bubble-preview speech-bubble-preview"></div>
                                <span>Speech</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'thought-bubble' ? 'selected' : ''}" data-type="thought-bubble">
                                <div class="bubble-preview thought-bubble-preview"></div>
                                <span>Thought</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'caption-box' ? 'selected' : ''}" data-type="caption-box">
                                <div class="bubble-preview caption-box-preview"></div>
                                <span>Caption</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'shout-bubble' ? 'selected' : ''}" data-type="shout-bubble">
                                <div class="bubble-preview shout-bubble-preview"></div>
                                <span>Shout</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'whisper-bubble' ? 'selected' : ''}" data-type="whisper-bubble">
                                <div class="bubble-preview whisper-bubble-preview"></div>
                                <span>Whisper</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Bubble Tail</h4>
                    <div class="effect-control">
                        <label for="bubble-tail-position">Tail Position</label>
                        <select id="bubble-tail-position" ${textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box' ? 'disabled' : ''}>
                            <option value="none" ${textBox.dataset.tailPosition === 'none' ? 'selected' : ''}>None</option>
                            <option value="bottom" ${textBox.dataset.tailPosition === 'bottom' ? 'selected' : ''}>Bottom</option>
                            <option value="top" ${textBox.dataset.tailPosition === 'top' ? 'selected' : ''}>Top</option>
                            <option value="left" ${textBox.dataset.tailPosition === 'left' ? 'selected' : ''}>Left</option>
                            <option value="right" ${textBox.dataset.tailPosition === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                        
                        <!-- SVG Tail Settings -->
                        <div class="tail-settings-container" ${textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box' || textBox.dataset.tailPosition === 'none' ? 'style="display: none;"' : ''}>
                            <!-- Common tail settings for both bubble types -->
                            <div class="tail-control">
                                <label for="tail-color">Tail Color</label>
                                <div class="color-picker-container">
                                    <input type="color" id="tail-color" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"tailColor":"#ffffff"}').tailColor : this.getBubbleBackgroundColor(textBox)}">
                                    <div class="hex-display tail-color-hex">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"tailColor":"#ffffff"}').tailColor.toUpperCase() : this.getBubbleBackgroundColor(textBox).toUpperCase()}</div>
                                </div>
                            </div>
                            
                            <!-- Speech bubble tail specific settings -->
                            <div class="speech-tail-settings" ${textBox.dataset.bubbleType !== 'speech-bubble' ? 'style="display: none;"' : ''} style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <div class="slider-group">
                                    <label for="speech-tail-length">Length</label>
                                    <input type="range" id="speech-tail-length" min="10" max="60" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailLength":20}').speechTailLength : 20}" step="1">
                                    <span class="speech-tail-length-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailLength":20}').speechTailLength : 20}px</span>
                                </div>
                                <div class="slider-group">
                                    <label for="speech-tail-width">Width</label>
                                    <input type="range" id="speech-tail-width" min="5" max="40" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailWidth":15}').speechTailWidth : 15}" step="1">
                                    <span class="speech-tail-width-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailWidth":15}').speechTailWidth : 15}px</span>
                                </div>
                                <div class="slider-group">
                                    <label for="speech-tail-inset">Position</label>
                                    <input type="range" id="speech-tail-inset" min="20" max="80" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailInset":50}').speechTailInset : 50}" step="1">
                                    <span class="speech-tail-inset-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailInset":50}').speechTailInset : 50}%</span>
                                </div>
                                <div class="slider-group">
                                    <label for="speech-tail-shear">Shear</label>
                                    <input type="range" id="speech-tail-shear" min="-50" max="50" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailShear":0}').speechTailShear || 0 : 0}" step="1">
                                    <span class="speech-tail-shear-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailShear":0}').speechTailShear || 0 : 0}</span>
                                </div>
                                <div class="tail-control" style="grid-column: span 2;">
                                    <input type="checkbox" id="speech-tail-outline" ${!textBox.dataset.tailSettings || JSON.parse(textBox.dataset.tailSettings || '{"speechTailOutline":true}').speechTailOutline ? 'checked' : ''}>
                                    <label for="speech-tail-outline">Tail Outline</label>
                                </div>
                            </div>
                            
                            <!-- Thought bubble tail specific settings -->
                            <div class="thought-tail-settings" ${textBox.dataset.bubbleType !== 'thought-bubble' ? 'style="display: none;"' : ''} style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <div class="slider-group">
                                    <label for="thought-tail-inset">Position</label>
                                    <input type="range" id="thought-tail-inset" min="10" max="90" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailInset":50}').thoughtTailInset || 50 : 50}" step="1">
                                    <span class="thought-tail-inset-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailInset":50}').thoughtTailInset || 50 : 50}%</span>
                                </div>
                                <div class="slider-group">
                                    <label for="thought-num-circles">Circles</label>
                                    <input type="range" id="thought-num-circles" min="1" max="5" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtNumCircles":3}').thoughtNumCircles : 3}" step="1">
                                    <span class="thought-num-circles-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtNumCircles":3}').thoughtNumCircles : 3}</span>
                                </div>
                                <div class="slider-group">
                                    <label for="thought-circle-radius">Radius</label>
                                    <input type="range" id="thought-circle-radius" min="2" max="10" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleRadius":5}').thoughtCircleRadius : 5}" step="1">
                                    <span class="thought-circle-radius-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleRadius":5}').thoughtCircleRadius : 5}px</span>
                                </div>
                                <div class="slider-group">
                                    <label for="thought-circle-spacing">Spacing</label>
                                    <input type="range" id="thought-circle-spacing" min="2" max="15" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleSpacing":5}').thoughtCircleSpacing : 5}" step="1">
                                    <span class="thought-circle-spacing-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleSpacing":5}').thoughtCircleSpacing : 5}px</span>
                                </div>
                                <div class="slider-group" style="grid-column: span 2;">
                                    <label for="thought-tail-offset">Offset</label>
                                    <input type="range" id="thought-tail-offset" min="-50" max="50" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailOffset":0}').thoughtTailOffset : 0}" step="1">
                                    <span class="thought-tail-offset-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailOffset":0}').thoughtTailOffset : 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Text Style</h4>
                    <div class="text-font-section">
                        <label for="font-family">Font</label>
                        <select id="font-family" class="font-family">
                            <option disabled class="font-category">Common Fonts</option>
                            <option value="Arial" class="font-option">
                                <span class="font-preview font-arial">Arial - Comic Text</span>
                            </option>
                            <option value="Comic Sans MS" class="font-option">
                                <span class="font-preview font-comic-sans">Comic Sans MS - Comic Text</span>
                            </option>
                            <option value="Times New Roman" class="font-option">
                                <span class="font-preview font-times">Times New Roman - Comic Text</span>
                            </option>
                            
                            <option disabled class="font-category">Sound Effects</option>
                            <option value="Impact" class="font-option">
                                <span class="font-preview font-impact">Impact - BOOM!</span>
                            </option>
                            <option value="Bangers" class="font-option">
                                <span class="font-preview font-bangers">Bangers - POW!</span>
                            </option>
                            <option value="Anton" class="font-option">
                                <span class="font-preview font-anton">Anton - CRASH!</span>
                            </option>
                            </option>
                            </option>
                            
                            <option disabled class="font-category">Handwriting Styles</option>
                            <option value="Comic Neue" class="font-option">
                                <span class="font-preview font-comic-neue">Comic Neue - Casual</span>
                            </option>
                            <option value="Permanent Marker" class="font-option">
                                <span class="font-preview font-permanent-marker">Permanent Marker</span>
                            </option>
                            <option value="Gloria Hallelujah" class="font-option" ${textElement.style.fontFamily === 'Gloria Hallelujah' ? 'selected' : ''}>
                                <span class="font-preview font-gloria-hallelujah">Gloria Hallelujah</span>
                            </option>
                            
                            <option disabled class="font-category">Title/Header Fonts</option>
                            <option value="Luckiest Guy" class="font-option" ${textElement.style.fontFamily === 'Luckiest Guy' ? 'selected' : ''}>
                                <span class="font-preview font-luckiest-guy">Luckiest Guy</span>
                            </option>
                            <option value="Boogaloo" class="font-option">
                                <span class="font-preview font-boogaloo">Boogaloo</span>
                            </option>
                            <option value="Acme" class="font-option">
                                <span class="font-preview font-acme">Acme</span>
                            </option>
                            </option>
                        </select>
                    </div>
                    
                    <div class="text-style-grid">
                        <div class="style-control">
                            <label for="font-size">Size</label>
                            <div class="size-control">
                                <input type="range" id="font-size" class="font-size red-slider" min="8" max="72" value="${parseInt(textElement.style.fontSize) || 16}">
                                <span class="font-size-value">${parseInt(textElement.style.fontSize) || 16}px</span>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label for="line-height">Line Spacing</label>
                            <div class="line-height-control" style="display: flex; align-items: center; gap: 10px;">
                                <input type="range" id="line-height" class="line-height red-slider" min="0.8" max="5" step="0.1" value="1.2" style="flex-grow: 1;">
                                <span class="line-height-value" style="min-width: 30px; text-align: right;">1.2</span>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label>Style</label>
                            <div class="text-style-buttons">
                                <button class="style-btn bold-btn ${textElement.style.fontWeight === 'bold' ? 'active' : ''}" title="Bold">
                                    <i class="fas fa-bold"></i>
                                </button>
                                <button class="style-btn italic-btn ${textElement.style.fontStyle === 'italic' ? 'active' : ''}" title="Italic">
                                    <i class="fas fa-italic"></i>
                                </button>
                                <button class="style-btn underline-btn ${textElement.style.textDecoration === 'underline' ? 'active' : ''}" title="Underline">
                                    <i class="fas fa-underline"></i>
                                </button>
                                <button class="style-btn all-caps-btn ${textElement.style.textTransform === 'uppercase' ? 'active' : ''}" title="All Caps">
                                    <i class="fas fa-font"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label>Alignment</label>
                            <div class="text-align-buttons">
                                <button class="align-btn align-left ${textElement.style.textAlign === 'left' ? 'active' : ''}" title="Align Left">
                                    <i class="fas fa-align-left"></i>
                                </button>
                                <button class="align-btn align-center ${!textElement.style.textAlign || textElement.style.textAlign === 'center' ? 'active' : ''}" title="Align Center">
                                    <i class="fas fa-align-center"></i>
                                </button>
                                <button class="align-btn align-right ${textElement.style.textAlign === 'right' ? 'active' : ''}" title="Align Right">
                                    <i class="fas fa-align-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="color-section">
                        <div class="color-control">
                            <label for="text-color">Text Color</label>
                            <div class="color-picker-container">
                                <!-- Use imported function directly -->
                                <input type="color" id="text-color" class="text-color" value="${globalRgbToHex(window.getComputedStyle(textElement).color)}">
                                <div class="hex-display text-color-hex">${globalRgbToHex(window.getComputedStyle(textElement).color).toUpperCase()}</div>
                            </div>
                        </div>
                        <div class="color-control">
                            <label for="bubble-color">Bubble Color</label>
                            <div class="color-picker-container">
                                <!-- Use imported function directly -->
                                <input type="color" id="bubble-color" class="bubble-color" value="${globalRgbToHex(this.getBubbleBackgroundColor(textBox))}">
                                <div class="hex-display bubble-color-hex">${globalRgbToHex(this.getBubbleBackgroundColor(textBox)).toUpperCase()}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Effects</h4>
                    <div class="effects-grid">
                        <div class="effect-control">
                            <label>Text Effects</label>
                            <div class="outline-control">
                                <div class="outline-buttons">
                                    <input type="checkbox" id="text-outline" ${textElement.getAttribute('data-has-outline') === 'true' ? 'checked' : ''}>
                                    <label for="text-outline">Text Outline</label>
                                </div>
                                <div class="color-picker-container ${textElement.getAttribute('data-has-outline') !== 'true' ? 'hidden' : ''}">
                                    <label>Outline Color</label>
                                    <input type="color" id="outline-color" value="${globalRgbToHex(this.getOutlineColor(textElement))}" ${textElement.getAttribute('data-has-outline') !== 'true' ? 'disabled' : ''}>
                                    <div class="hex-display outline-color-hex" ${textElement.getAttribute('data-has-outline') !== 'true' ? 'disabled' : ''}>${globalRgbToHex(this.getOutlineColor(textElement)).toUpperCase()}</div>
                                </div>
                            </div>
                            <div class="shadow-control">
                                <input type="checkbox" id="text-shadow" ${textElement.style.textShadow ? 'checked' : ''}>
                                <div class="color-picker-container">
                                    <!-- Use imported function directly -->
                                    <input type="color" id="shadow-color" value="${globalRgbToHex(this.getShadowColor(textElement))}" ${!textElement.style.textShadow ? 'disabled' : ''}>
                                    <div class="hex-display shadow-color-hex" ${!textElement.style.textShadow ? 'disabled' : ''}>${globalRgbToHex(this.getShadowColor(textElement)).toUpperCase()}</div>
                                </div>
                                <!-- Add Shadow Offset and Blur Sliders -->
                                <div class="shadow-sliders" ${!textElement.style.textShadow ? 'style="display: none;"' : ''}>
                                    <div class="slider-group">
                                        <label for="shadow-offset-x">X Offset</label>
                                        <input type="range" id="shadow-offset-x" class="shadow-offset-x" min="-10" max="10" value="${this.getShadowOffset(textElement).x}" step="1">
                                        <span class="shadow-offset-x-value">${this.getShadowOffset(textElement).x}px</span>
                                    </div>
                                    <div class="slider-group">
                                        <label for="shadow-offset-y">Y Offset</label>
                                        <input type="range" id="shadow-offset-y" class="shadow-offset-y" min="-10" max="10" value="${this.getShadowOffset(textElement).y}" step="1">
                                        <span class="shadow-offset-y-value">${this.getShadowOffset(textElement).y}px</span>
                                    </div>
                                    <div class="slider-group">
                                        <label for="shadow-blur">Blur</label>
                                        <input type="range" id="shadow-blur" class="shadow-blur" min="0" max="10" value="${this.getShadowOffset(textElement).blur}" step="1">
                                        <span class="shadow-blur-value">${this.getShadowOffset(textElement).blur}px</span>
                                    </div>
                                </div>
                            </div>
                            <div class="opacity-control">
                                <label>
                                    <input type="checkbox" id="bubble-opacity" ${textBox.style.opacity === '0.5' ? 'checked' : ''}>
                                    50% Opacity
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Position</h4>
                    <div class="position-controls">
                        <div class="position-grid">
                            <button class="position-grid-btn" data-position="top-left">↖</button>
                            <button class="position-grid-btn" data-position="top-center">↑</button>
                            <button class="position-grid-btn" data-position="top-right">↗</button>
                            <button class="position-grid-btn" data-position="middle-left">←</button>
                            <button class="position-grid-btn" data-position="middle-center">•</button>
                            <button class="position-grid-btn" data-position="middle-right">→</button>
                            <button class="position-grid-btn" data-position="bottom-left">↙</button>
                            <button class="position-grid-btn" data-position="bottom-center">↓</button>
                            <button class="position-grid-btn" data-position="bottom-right">↘</button>
                        </div>
                        
                        <div class="rotation-control">
                            <label for="rotation">Rotation</label>
                            <div class="rotation-slider">
                                <input type="range" id="rotation" class="rotation" min="-180" max="180" value="${this.getRotationValue(textBox)}">
                                <span class="rotation-value">${this.getRotationValue(textBox)}°</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        
        // Set up event listeners for the popup (calls internal method)
        this.setupPopupEventListeners(popup, textBox); 
        this.setupCustomStylesListeners(popup, textBox);
    }
    
    setupPopupEventListeners(popup, textBox) {
        const textElement = textBox.querySelector('.text-content');
        
        // Close button
        popup.querySelector('.close-popup').addEventListener('click', () => {
            popup.remove();
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        // Close when clicking outside
        document.addEventListener('mousedown', (e) => {
            // Check if popup exists before trying to check contains
            const currentPopup = document.getElementById('text-format-popup'); 
            if (currentPopup && !currentPopup.contains(e.target) && !textBox.contains(e.target)) {
                currentPopup.remove();
                this.comicCreator.saveCurrentPageState(); // Use comicCreator
            }
        });
        
        // Bubble toggle
        const bubbleToggle = popup.querySelector('#show-bubble');
        bubbleToggle.addEventListener('change', () => {
            if (bubbleToggle.checked) {
                // Show bubble
                const previousType = textBox.dataset.previousBubbleType || 'speech-bubble';
                textBox.classList.remove('no-bubble');
                textBox.classList.add(previousType);
                textBox.dataset.bubbleType = previousType;
                popup.querySelector('#bubble-tail-position').disabled = (previousType === 'caption-box');
                
                // Restore previous background color if stored
                const storedBackgroundColor = textBox.dataset.previousBackgroundColor;
                if (storedBackgroundColor) {
                    textBox.style.backgroundColor = storedBackgroundColor;
                    textBox.style.setProperty('--bubble-background-color', storedBackgroundColor);
                    // Delete the stored value as we've restored it
                    delete textBox.dataset.previousBackgroundColor;
            } else {
                    // Default to white if no previous color
                    textBox.style.backgroundColor = 'white';
                    textBox.style.setProperty('--bubble-background-color', 'white');
                }
            } else {
                // Hide bubble
                // Store current background color to restore it later if bubble is toggled back on
                if (textBox.style.backgroundColor && textBox.style.backgroundColor !== 'transparent') {
                    textBox.dataset.previousBackgroundColor = textBox.style.backgroundColor;
                }
                
                textBox.dataset.previousBubbleType = textBox.dataset.bubbleType;
                textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'jagged-bubble');
                textBox.classList.add('no-bubble');
                textBox.dataset.bubbleType = 'no-bubble';
                popup.querySelector('#bubble-tail-position').disabled = true;
                
                // Clear background color
                textBox.style.backgroundColor = 'transparent';
                textBox.style.setProperty('--bubble-background-color', 'transparent');
            }
            
            // Show/hide padding section based on bubble visibility
            const paddingSection = popup.querySelector('.bubble-padding-section');
            if (paddingSection) {
                if (bubbleToggle.checked) {
                    paddingSection.classList.remove('hidden');
                } else {
                    paddingSection.classList.add('hidden');
                }
            }
            
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        // Bubble style options
        popup.querySelectorAll('.bubble-option').forEach(option => {
            option.addEventListener('click', () => {
                // ... (logic for bubble options) ...
                popup.querySelectorAll('.bubble-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                const bubbleType = option.dataset.type;
                textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'no-bubble');
                textBox.classList.add(bubbleType);
                textBox.dataset.bubbleType = bubbleType;
                bubbleToggle.checked = true;
                popup.querySelector('#bubble-tail-position').disabled = (bubbleType === 'caption-box');
                if (bubbleType === 'shout-bubble') {
                    textElement.style.fontWeight = 'bold';
                    textElement.style.textTransform = 'uppercase';
                    popup.querySelector('.bold-btn').classList.add('active');
                } else if (bubbleType === 'whisper-bubble') {
                    textElement.style.fontStyle = 'italic';
                    textElement.style.opacity = '0.8';
                    popup.querySelector('.italic-btn').classList.add('active');
                } else if (bubbleType === 'caption-box') {
                    textElement.style.fontStyle = 'italic';
                    popup.querySelector('.italic-btn').classList.add('active');
                }
                this.comicCreator.saveCurrentPageState(); // Use comicCreator
            });
        });
        
        // Font family
        popup.querySelector('#font-family').addEventListener('change', (e) => {
            textElement.style.fontFamily = e.target.value;
            // No immediate save needed, usually done when popup closes
        });
        
        // Font size
        const fontSizeSlider = popup.querySelector('#font-size');
        const fontSizeValue = popup.querySelector('.font-size-value');
        fontSizeSlider.addEventListener('input', () => {
            textElement.style.fontSize = `${fontSizeSlider.value}px`;
            fontSizeValue.textContent = `${fontSizeSlider.value}px`;
            // No immediate save needed
        });
        
        // Make font size value editable (via ComicCreator)
        this.comicCreator.uiManager.makeSliderValueEditable(fontSizeSlider, fontSizeValue, 'px', 0); // Corrected path

        // Text style buttons
        popup.querySelector('.bold-btn').addEventListener('click', () => {
            const isBold = textElement.style.fontWeight === 'bold';
            textElement.style.fontWeight = isBold ? 'normal' : 'bold';
            popup.querySelector('.bold-btn').classList.toggle('active');
            // No immediate save needed
        });
        // ... (italic, underline buttons similar) ...
         popup.querySelector('.italic-btn').addEventListener('click', () => {
            const isItalic = textElement.style.fontStyle === 'italic';
            textElement.style.fontStyle = isItalic ? 'normal' : 'italic';
            popup.querySelector('.italic-btn').classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        popup.querySelector('.underline-btn').addEventListener('click', () => {
            const isUnderline = textElement.style.textDecoration === 'underline';
            textElement.style.textDecoration = isUnderline ? 'none' : 'underline';
            popup.querySelector('.underline-btn').classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        // All Caps toggle
        popup.querySelector('.all-caps-btn').addEventListener('click', () => {
            const isAllCaps = textElement.style.textTransform === 'uppercase';
            textElement.style.textTransform = isAllCaps ? 'none' : 'uppercase';
            popup.querySelector('.all-caps-btn').classList.toggle('active');
            this.comicCreator.saveCurrentPageState(); // Use comicCreator (explicit save needed here? Check original)
        });
        
        // Text alignment buttons
        // ... (left, center, right listeners - no immediate save needed) ...
        popup.querySelector('.align-left').addEventListener('click', () => {
            textElement.style.textAlign = 'left';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-left').classList.add('active');
        });
        popup.querySelector('.align-center').addEventListener('click', () => {
            textElement.style.textAlign = 'center';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-center').classList.add('active');
        });
        popup.querySelector('.align-right').addEventListener('click', () => {
            textElement.style.textAlign = 'right';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-right').classList.add('active');
        });

        // Colors
        // ... (text color picker/hex listeners - no immediate save) ...
        const textColorPicker = popup.querySelector('#text-color');
        const textColorHex = popup.querySelector('.text-color-hex');
        textColorPicker.addEventListener('input', (e) => {
            textElement.style.color = e.target.value;
            textColorHex.textContent = e.target.value.toUpperCase();
        });
        textColorHex.contentEditable = true;
        textColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = textColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    textColorPicker.value = hexValue;
                    textElement.style.color = hexValue;
                } else {
                    textColorHex.textContent = textColorPicker.value.toUpperCase();
                }
                textColorHex.blur();
            }
        });
        textColorHex.addEventListener('blur', () => {
            const hexValue = textColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                textColorPicker.value = hexValue;
                textElement.style.color = hexValue;
            } else {
                textColorHex.textContent = textColorPicker.value.toUpperCase();
            }
        });

        // ... (bubble color picker/hex listeners - no immediate save) ...
        const bubbleColorPicker = popup.querySelector('#bubble-color');
        const bubbleColorHex = popup.querySelector('.bubble-color-hex');
        bubbleColorPicker.addEventListener('input', (e) => {
            textBox.style.backgroundColor = e.target.value;
            textBox.style.setProperty('--bubble-background-color', e.target.value);
            bubbleColorHex.textContent = e.target.value.toUpperCase();
        });
        bubbleColorHex.contentEditable = true;
        bubbleColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = bubbleColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    bubbleColorPicker.value = hexValue;
                    textBox.style.backgroundColor = hexValue;
                    textBox.style.setProperty('--bubble-background-color', hexValue);
                } else {
                    bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
                }
                bubbleColorHex.blur();
            }
        });
         bubbleColorHex.addEventListener('blur', () => {
            const hexValue = bubbleColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                bubbleColorPicker.value = hexValue;
                textBox.style.backgroundColor = hexValue;
                textBox.style.setProperty('--bubble-background-color', hexValue);
            } else {
                bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
            }
        });

        // Text outline listeners (calling internal helpers, saving state via comicCreator)
        const textOutlineCheckbox = popup.querySelector('#text-outline');
        const outlineColorPicker = popup.querySelector('#outline-color');
        const outlineColorHex = popup.querySelector('.outline-color-hex');
        const colorPickerContainer = outlineColorPicker.closest('.color-picker-container');
        
        textOutlineCheckbox.addEventListener('change', () => {
            if (textOutlineCheckbox.checked) {
                // Enable outline
                colorPickerContainer.classList.remove('hidden');
                outlineColorPicker.disabled = false;
                outlineColorHex.removeAttribute('disabled');
                this.applyTextOutline(textElement, outlineColorPicker.value);
            } else {
                // Disable outline
                colorPickerContainer.classList.add('hidden');
                outlineColorPicker.disabled = true;
                outlineColorHex.setAttribute('disabled', true);
                this.removeTextOutline(textElement);
            }
                this.comicCreator.saveCurrentPageState();
        });

        outlineColorPicker.addEventListener('input', () => {
            if (textOutlineCheckbox.checked) {
                this.applyTextOutline(textElement, outlineColorPicker.value);
                outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                this.comicCreator.saveCurrentPageState();
            }
        });

        outlineColorHex.contentEditable = true;
        outlineColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !outlineColorHex.hasAttribute('disabled')) {
                e.preventDefault();
                const hexValue = outlineColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    outlineColorPicker.value = hexValue;
                    this.applyTextOutline(textElement, hexValue);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                }
                outlineColorHex.blur();
            }
        });

         outlineColorHex.addEventListener('blur', () => {
            if (!outlineColorHex.hasAttribute('disabled')) {
                const hexValue = outlineColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    outlineColorPicker.value = hexValue;
                    this.applyTextOutline(textElement, hexValue);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                }
            }
        });

        // Text shadow listeners (calling internal helpers, saving state via comicCreator)
        const textShadowCheckbox = popup.querySelector('#text-shadow');
        const shadowColorPicker = popup.querySelector('#shadow-color');
        const shadowColorHex = popup.querySelector('.shadow-color-hex');
        const shadowSlidersContainer = popup.querySelector('.shadow-sliders'); // Get container
        const shadowOffsetXSlider = popup.querySelector('#shadow-offset-x');
        const shadowOffsetXValue = popup.querySelector('.shadow-offset-x-value');
        const shadowOffsetYSlider = popup.querySelector('#shadow-offset-y');
        const shadowOffsetYValue = popup.querySelector('.shadow-offset-y-value');
        const shadowBlurSlider = popup.querySelector('#shadow-blur');
        const shadowBlurValue = popup.querySelector('.shadow-blur-value');
        
        textShadowCheckbox.addEventListener('change', () => {
            const isChecked = textShadowCheckbox.checked;
            shadowColorPicker.disabled = !isChecked;
            shadowColorHex.toggleAttribute('disabled', !isChecked);
            // Also disable/enable sliders
            shadowSlidersContainer.style.display = isChecked ? '' : 'none'; 
            shadowOffsetXSlider.disabled = !isChecked;
            shadowOffsetYSlider.disabled = !isChecked;
            shadowBlurSlider.disabled = !isChecked;

            if (isChecked) {
                // Apply shadow with current slider values
                this.applyTextShadow(textElement, 
                                     shadowColorPicker.value, 
                                     shadowOffsetXSlider.value, 
                                     shadowOffsetYSlider.value, 
                                     shadowBlurSlider.value); // Internal call
            } else {
                this.removeTextShadow(textElement); // Internal call
            }
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        // ... (listeners for shadow color input, calling internal helpers and comicCreator.saveCurrentPageState) ...
         shadowColorPicker.addEventListener('input', () => {
            if (textShadowCheckbox.checked) {
                this.applyTextShadow(textElement, 
                                     shadowColorPicker.value,
                                     shadowOffsetXSlider.value, 
                                     shadowOffsetYSlider.value, 
                                     shadowBlurSlider.value);
                shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                this.comicCreator.saveCurrentPageState();
            }
        });
        shadowColorHex.contentEditable = true;
        shadowColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !shadowColorHex.hasAttribute('disabled')) {
                e.preventDefault();
                const hexValue = shadowColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    shadowColorPicker.value = hexValue;
                    this.applyTextShadow(textElement, 
                                         hexValue, 
                                         shadowOffsetXSlider.value, 
                                         shadowOffsetYSlider.value, 
                                         shadowBlurSlider.value);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                }
                shadowColorHex.blur(); // Add blur after handling
            }
        });
        shadowColorHex.addEventListener('blur', () => {
            if (!shadowColorHex.hasAttribute('disabled')) {
                const hexValue = shadowColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    shadowColorPicker.value = hexValue;
                    this.applyTextShadow(textElement, 
                                         hexValue, 
                                         shadowOffsetXSlider.value, 
                                         shadowOffsetYSlider.value, 
                                         shadowBlurSlider.value);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                }
            }
        });

        // Add listeners for the shadow sliders
        const shadowSliderHandler = () => {
            if (textShadowCheckbox.checked) {
                shadowOffsetXValue.textContent = `${shadowOffsetXSlider.value}px`;
                shadowOffsetYValue.textContent = `${shadowOffsetYSlider.value}px`;
                shadowBlurValue.textContent = `${shadowBlurSlider.value}px`;
                this.applyTextShadow(textElement, 
                                     shadowColorPicker.value, 
                                     shadowOffsetXSlider.value, 
                                     shadowOffsetYSlider.value, 
                                     shadowBlurSlider.value);
                this.comicCreator.saveCurrentPageState();
            }
        };
        shadowOffsetXSlider.addEventListener('input', shadowSliderHandler);
        shadowOffsetYSlider.addEventListener('input', shadowSliderHandler);
        shadowBlurSlider.addEventListener('input', shadowSliderHandler);

        // Bubble tail position listener (calling internal helper)
        popup.querySelector('#bubble-tail-position').addEventListener('change', (e) => {
            const newPosition = e.target.value;
            console.log(`Changing tail position to: ${newPosition}`);
            
            // Update the tail position in the text box
            this.updateBubbleTail(textBox, newPosition);
            
            // Show/hide tail settings based on position
            const tailSettingsContainer = popup.querySelector('.tail-settings-container');
            if (newPosition === 'none' || textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box') {
                tailSettingsContainer.style.display = 'none';
            } else {
                tailSettingsContainer.style.display = '';
                
                // Show appropriate bubble type settings
                const speechTailSettings = popup.querySelector('.speech-tail-settings');
                const thoughtTailSettings = popup.querySelector('.thought-tail-settings');
                
                if (textBox.dataset.bubbleType === 'speech-bubble') {
                    speechTailSettings.style.display = '';
                    thoughtTailSettings.style.display = 'none';
                } else if (textBox.dataset.bubbleType === 'thought-bubble') {
                    speechTailSettings.style.display = 'none';
                    thoughtTailSettings.style.display = '';
                }
            }
            
            // Save state after changing tail position
            this.comicCreator.saveCurrentPageState();
        });
        
        // SVG Tail Settings Event Handlers
        
        // Use SVG Tail toggle
        const useSvgTailCheckbox = popup.querySelector('#use-svg-tail');
        if (useSvgTailCheckbox) {
            useSvgTailCheckbox.addEventListener('change', () => {
                const settings = {
                    useSvgTail: useSvgTailCheckbox.checked
                };
                this.updateSvgTailSettings(textBox, settings);
                this.comicCreator.saveCurrentPageState();
            });
        }
        
        // Tail Color Picker
        const tailColorPicker = popup.querySelector('#tail-color');
        const tailColorHex = popup.querySelector('.tail-color-hex');
        if (tailColorPicker && tailColorHex) {
            tailColorPicker.addEventListener('input', () => {
                const settings = {
                    tailColor: tailColorPicker.value
                };
                tailColorHex.textContent = tailColorPicker.value.toUpperCase();
                this.updateSvgTailSettings(textBox, settings);
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make hex display editable
            tailColorHex.contentEditable = true;
            tailColorHex.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const hexValue = tailColorHex.textContent.trim();
                    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                        tailColorPicker.value = hexValue;
                        const settings = {
                            tailColor: hexValue
                        };
                        this.updateSvgTailSettings(textBox, settings);
                        this.comicCreator.saveCurrentPageState();
                    } else {
                        tailColorHex.textContent = tailColorPicker.value.toUpperCase();
                    }
                }
            });
        }
        
        // Speech Bubble Tail Settings
        
        // Speech Tail Length Slider
        const speechTailLengthSlider = popup.querySelector('#speech-tail-length');
        const speechTailLengthValue = popup.querySelector('.speech-tail-length-value');
        if (speechTailLengthSlider && speechTailLengthValue) {
            speechTailLengthSlider.addEventListener('input', () => {
                const value = speechTailLengthSlider.value;
                speechTailLengthValue.textContent = `${value}px`;
                const settings = {
                    speechTailLength: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailLengthSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailLengthSlider, speechTailLengthValue, 'px', 0);
        }
        
        // Speech Tail Width Slider
        const speechTailWidthSlider = popup.querySelector('#speech-tail-width');
        const speechTailWidthValue = popup.querySelector('.speech-tail-width-value');
        if (speechTailWidthSlider && speechTailWidthValue) {
            speechTailWidthSlider.addEventListener('input', () => {
                const value = speechTailWidthSlider.value;
                speechTailWidthValue.textContent = `${value}px`;
                const settings = {
                    speechTailWidth: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailWidthSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailWidthSlider, speechTailWidthValue, 'px', 0);
        }
        
        // Speech Tail Inset Slider
        const speechTailInsetSlider = popup.querySelector('#speech-tail-inset');
        const speechTailInsetValue = popup.querySelector('.speech-tail-inset-value');
        if (speechTailInsetSlider && speechTailInsetValue) {
            speechTailInsetSlider.addEventListener('input', () => {
                const value = speechTailInsetSlider.value;
                speechTailInsetValue.textContent = `${value}%`;
                const settings = {
                    speechTailInset: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailInsetSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailInsetSlider, speechTailInsetValue, '%', 0);
        }
        
        // Speech Tail Shear Slider
        const speechTailShearSlider = popup.querySelector('#speech-tail-shear');
        const speechTailShearValue = popup.querySelector('.speech-tail-shear-value');
        if (speechTailShearSlider && speechTailShearValue) {
            speechTailShearSlider.addEventListener('input', () => {
                const value = speechTailShearSlider.value;
                speechTailShearValue.textContent = `${value}%`;
                const settings = {
                    speechTailShear: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailShearSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailShearSlider, speechTailShearValue, '%', 0);
        }
        
        // Speech Tail Outline Toggle
        const speechTailOutlineCheckbox = popup.querySelector('#speech-tail-outline');
        if (speechTailOutlineCheckbox) {
            speechTailOutlineCheckbox.addEventListener('change', () => {
                const settings = {
                    speechTailOutline: speechTailOutlineCheckbox.checked
                };
                this.updateSvgTailSettings(textBox, settings);
                this.comicCreator.saveCurrentPageState();
            });
        }
        
        // Thought Bubble Tail Settings
        
        // Thought Number of Circles Slider
        const thoughtNumCirclesSlider = popup.querySelector('#thought-num-circles');
        const thoughtNumCirclesValue = popup.querySelector('.thought-num-circles-value');
        if (thoughtNumCirclesSlider && thoughtNumCirclesValue) {
            thoughtNumCirclesSlider.addEventListener('input', () => {
                const value = thoughtNumCirclesSlider.value;
                thoughtNumCirclesValue.textContent = value;
                const settings = {
                    thoughtNumCircles: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtNumCirclesSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtNumCirclesSlider, thoughtNumCirclesValue, '', 0);
        }
        
        // Thought Circle Radius Slider
        const thoughtCircleRadiusSlider = popup.querySelector('#thought-circle-radius');
        const thoughtCircleRadiusValue = popup.querySelector('.thought-circle-radius-value');
        if (thoughtCircleRadiusSlider && thoughtCircleRadiusValue) {
            thoughtCircleRadiusSlider.addEventListener('input', () => {
                const value = thoughtCircleRadiusSlider.value;
                thoughtCircleRadiusValue.textContent = `${value}px`;
                const settings = {
                    thoughtCircleRadius: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtCircleRadiusSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtCircleRadiusSlider, thoughtCircleRadiusValue, 'px', 0);
        }
        
        // Thought Circle Spacing Slider
        const thoughtCircleSpacingSlider = popup.querySelector('#thought-circle-spacing');
        const thoughtCircleSpacingValue = popup.querySelector('.thought-circle-spacing-value');
        if (thoughtCircleSpacingSlider && thoughtCircleSpacingValue) {
            thoughtCircleSpacingSlider.addEventListener('input', () => {
                const value = thoughtCircleSpacingSlider.value;
                thoughtCircleSpacingValue.textContent = `${value}px`;
                const settings = {
                    thoughtCircleSpacing: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtCircleSpacingSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtCircleSpacingSlider, thoughtCircleSpacingValue, 'px', 0);
        }
        
        // Thought Tail Offset Slider
        const thoughtTailOffsetSlider = popup.querySelector('#thought-tail-offset');
        const thoughtTailOffsetValue = popup.querySelector('.thought-tail-offset-value');
        if (thoughtTailOffsetSlider && thoughtTailOffsetValue) {
            thoughtTailOffsetSlider.addEventListener('input', () => {
                const value = thoughtTailOffsetSlider.value;
                thoughtTailOffsetValue.textContent = value;
                const settings = {
                    thoughtTailOffset: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtTailOffsetSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtTailOffsetSlider, thoughtTailOffsetValue, '', 0);
        }
        
        // Update bubble type listeners to show/hide the appropriate tail settings
        popup.querySelectorAll('.bubble-option').forEach(option => {
            option.addEventListener('click', () => {
                const bubbleType = option.dataset.type;
                const tailSettingsContainer = popup.querySelector('.tail-settings-container');
                const speechTailSettings = popup.querySelector('.speech-tail-settings');
                const thoughtTailSettings = popup.querySelector('.thought-tail-settings');
                
                // Show/hide tail settings based on bubble type
                if (bubbleType === 'no-bubble' || bubbleType === 'caption-box' || textBox.dataset.tailPosition === 'none') {
                    tailSettingsContainer.style.display = 'none';
                } else {
                    tailSettingsContainer.style.display = '';
                    
                    // Show appropriate bubble type settings
                    if (bubbleType === 'speech-bubble') {
                        speechTailSettings.style.display = '';
                        thoughtTailSettings.style.display = 'none';
                    } else if (bubbleType === 'thought-bubble') {
                        speechTailSettings.style.display = 'none';
                        thoughtTailSettings.style.display = '';
                    }
                }
            });
        });
        
        // Position grid buttons listeners (calling internal helper)
        popup.querySelectorAll('.position-grid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                this.positionTextBox(textBox, position); // Internal call
                // No immediate save needed?
            });
        });
        
        // Rotation slider listener (calling internal helper for value, saving state via comicCreator)
        const rotationSlider = popup.querySelector('#rotation');
        const rotationValue = popup.querySelector('.rotation-value');
        
        const initialRotationValue = this.getRotationValue(textBox); // Internal call
        rotationSlider.value = initialRotationValue;
        rotationValue.textContent = `${Math.round(initialRotationValue)}°`;

        rotationSlider.addEventListener('input', () => {
            const value = rotationSlider.value;
            rotationValue.textContent = `${Math.round(value)}°`;
            textBox.style.transform = `rotate(${value}deg)`;
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        // Make rotation value editable (via ComicCreator)
        this.comicCreator.uiManager.makeSliderValueEditable(rotationSlider, rotationValue, '°', 0); // Corrected path

        // Add text content change observer for outline update
        // ... (observer logic calling internal updateOutlineText) ...
        const observer = new MutationObserver(() => {
            this.updateOutlineText(textElement); // Internal call
        });
        observer.observe(textElement, {
            characterData: true,
            childList: true,
            subtree: true
        });

        // Add opacity control listener
        const opacityCheckbox = popup.querySelector('#bubble-opacity');
        opacityCheckbox.addEventListener('change', () => {
            if (opacityCheckbox.checked) {
                textBox.style.setProperty('--bubble-opacity', '0.5');
            } else {
                textBox.style.setProperty('--bubble-opacity', '1');
            }
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });

        // Line spacing slider listener
        const lineHeightSlider = popup.querySelector('#line-height');
        const lineHeightValue = popup.querySelector('.line-height-value');

        const currentLineHeight = textElement.style.lineHeight;
        let initialLineHeightValue = 1.2; 
        if (currentLineHeight && currentLineHeight !== 'normal') {
            initialLineHeightValue = parseFloat(currentLineHeight) || 1.2;
        }
        lineHeightSlider.value = initialLineHeightValue;
        lineHeightValue.textContent = initialLineHeightValue.toFixed(1);

        lineHeightSlider.addEventListener('input', () => {
            const value = lineHeightSlider.value;
            lineHeightValue.textContent = parseFloat(value).toFixed(1);
            textElement.style.lineHeight = value;
            this.comicCreator.saveCurrentPageState(); // Use comicCreator
        });
        
        // Make line height value editable (via ComicCreator)
        this.comicCreator.uiManager.makeSliderValueEditable(lineHeightSlider, lineHeightValue, '', 1); // Corrected path
        // Make shadow offset values editable (via ComicCreator)
        this.comicCreator.uiManager.makeSliderValueEditable(shadowOffsetXSlider, shadowOffsetXValue, 'px', 0); // Corrected call
        this.comicCreator.uiManager.makeSliderValueEditable(shadowOffsetYSlider, shadowOffsetYValue, 'px', 0); // Corrected call
        this.comicCreator.uiManager.makeSliderValueEditable(shadowBlurSlider, shadowBlurValue, 'px', 0); // Corrected call

        // Thought Tail Inset Slider 
        const thoughtTailInsetSlider = popup.querySelector('#thought-tail-inset');
        const thoughtTailInsetValue = popup.querySelector('.thought-tail-inset-value');
        if (thoughtTailInsetSlider && thoughtTailInsetValue) {
            thoughtTailInsetSlider.addEventListener('input', () => {
                const value = thoughtTailInsetSlider.value;
                thoughtTailInsetValue.textContent = `${value}%`;
                const settings = {
                    thoughtTailInset: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtTailInsetSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make value editable
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtTailInsetSlider, thoughtTailInsetValue, '%', 0);
        }
    }

    // --- Helper methods for text formatting ---
    getRotationValue(textBox) {
        const transform = textBox.style.transform;
        const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
        return rotateMatch ? parseInt(rotateMatch[1]) : 0;
    }
    
    applyTextOutline(textElement, color, thickness = 1) {
        const text = getTextWithLineBreaks(textElement); // Use imported util
        const computedStyle = window.getComputedStyle(textElement);
        
        // We'll use text-shadow to create a 1px outline around the text
        // This creates 8 shadows (one for each direction) to form a complete outline
        const shadowValue = `
           -2px -2px 0 ${color},  
            2px -2px 0 ${color},
           -2px  2px 0 ${color},
            2px  2px 0 ${color},
           -2px  0   0 ${color},
            2px  0   0 ${color},
            0   -2px 0 ${color},
            0    2px 0 ${color}
        `.trim().replace(/\s+/g, ' ');
        
        // Apply text shadow
        textElement.style.textShadow = shadowValue;
        
        // Store color for state saving
        textElement.setAttribute('data-outline-color', color);
        textElement.setAttribute('data-has-outline', 'true');
        
        // Keep a good contrast with the outline
        const textColor = textElement.style.color || computedStyle.color || '#000000';
        textElement.style.setProperty('--text-color', textColor);
        
        // Copy text styling properties
        const stylesToCopy = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 
            'wordSpacing', 'lineHeight', 'textTransform', 'textAlign', 
            'textDecoration', 'whiteSpace'
        ];
        stylesToCopy.forEach(prop => {
            const value = computedStyle[prop];
            if (value) textElement.style[prop] = value;
        });
        
        // Improve text rendering
        textElement.style.webkitFontSmoothing = 'antialiased';
        textElement.style.mozOsxFontSmoothing = 'grayscale';
        textElement.style.textRendering = 'optimizeLegibility';
    }
    
    removeTextOutline(textElement) {
        // Remove text shadow
        textElement.style.textShadow = 'none';
        
        // Remove outline attributes
        textElement.removeAttribute('data-has-outline');
        textElement.removeAttribute('data-outline-color');
        textElement.style.removeProperty('--text-color');
    }
    
    applyTextShadow(textElement, color, offsetX, offsetY, blur) {
        // Use provided values, defaulting if necessary
        const x = offsetX !== undefined ? offsetX : 2;
        const y = offsetY !== undefined ? offsetY : 2;
        const b = blur !== undefined ? blur : 2;
        textElement.style.textShadow = `${x}px ${y}px ${b}px ${color}`;
    }
    
    removeTextShadow(textElement) {
        textElement.style.textShadow = 'none';
    }
    
    updateBubbleTail(textBox, position) {
        console.log(`Updating bubble tail to position: ${position}`);
        
        // Remove old tail classes
        textBox.className = textBox.className.replace(/(?:speech|thought)-tail-\S+/g, '').trim();
        
        // Remove existing SVG tail if present
        const existingSvgTail = textBox.querySelector('.bubble-tail-svg');
        if (existingSvgTail) {
            existingSvgTail.remove();
        }
        
        // Store position in dataset for future reference
        textBox.dataset.tailPosition = position;
        
        // If position is none, we're done
        if (position === 'none') {
            return;
        }
        
        const bubbleType = textBox.dataset.bubbleType;
        
        // Get or create tail settings
        let tailSettings;
        if (textBox.dataset.tailSettings) {
            try {
                tailSettings = JSON.parse(textBox.dataset.tailSettings);
            } catch (e) {
                console.error("Error parsing tail settings", e);
                tailSettings = bubbleType === 'speech-bubble' ? 
                    { ...this.defaultSpeechTailSettings } : 
                    { ...this.defaultThoughtTailSettings };
            }
        } else {
            // Use default settings
            tailSettings = bubbleType === 'speech-bubble' ? 
                { ...this.defaultSpeechTailSettings } : 
                { ...this.defaultThoughtTailSettings };
        }
        
        // Always update the tailPosition in settings to match the new position
        tailSettings.tailPosition = position;
        
        // Store updated settings in dataset
        textBox.dataset.tailSettings = JSON.stringify(tailSettings);
        
        // Create SVG tail based on bubbleType
            if (bubbleType === 'speech-bubble') {
            this.createSpeechBubbleSvgTail(textBox, tailSettings);
            } else if (bubbleType === 'thought-bubble') {
            this.createThoughtBubbleSvgTail(textBox, tailSettings);
        }
    }
    
    /**
     * Creates an SVG tail for speech bubbles using the provided settings
     * @param {HTMLElement} textBox - The textbox element to add the tail to
     * @param {Object} settings - The tail settings object
     */
    createSpeechBubbleSvgTail(textBox, settings) {
        console.log(`Creating speech bubble SVG tail for position: ${settings.tailPosition}`);
        
        const position = settings.tailPosition || 'bottom';
        const bubbleColor = settings.tailColor || this.getBubbleBackgroundColor(textBox);
        const tailLength = settings.speechTailLength || 20;
        const tailWidth = settings.speechTailWidth || 15;
        const tailInset = settings.speechTailInset || 50; // percentage
        const shear = settings.speechTailShear || 0; // percentage, positive moves right, negative moves left
        const useOutline = settings.speechTailOutline !== false; // default to true
        
        // Create SVG element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('bubble-tail-svg');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '-1';
        
        // Get bubble dimensions
        const bubbleRect = textBox.getBoundingClientRect();
        const bubbleWidth = bubbleRect.width;
        const bubbleHeight = bubbleRect.height;
        
        // Get outline color and thickness from the bubble if needed
        let outlineColor = '#000000';
        let outlineThickness = 2; // Default 2px
        
        if (useOutline) {
            // Get computed style of the bubble
            const computedStyle = window.getComputedStyle(textBox);
            outlineColor = computedStyle.borderColor || '#000000';
            outlineThickness = parseInt(computedStyle.borderWidth) || 2;
            
            // Normalize thickness to be reasonable
            outlineThickness = Math.min(Math.max(outlineThickness, 1), 3);
        }
        
        // Apply shear as offset from center point (-50 to +50)
        // Convert percentage to actual pixels based on tail width
        const maxShearPixels = tailWidth; // Full width of tail
        const shearOffset = (shear / 50) * (maxShearPixels / 2); // Convert -50 to +50 range to pixel offset
        
        let pathPoints = [];
        let svgWidth, svgHeight;
        let svgTop, svgLeft;
        
        // Configure SVG dimensions and position based on tail position
        switch(position) {
            case 'bottom':
                svgWidth = tailWidth;
                svgHeight = tailLength;
                svgLeft = `calc(${tailInset}% - ${tailWidth/2}px)`;
                svgTop = '100%';
                
                pathPoints = [
                    [0, 0], // Left point on bubble edge
                    [tailWidth, 0], // Right point on bubble edge
                    [tailWidth/2 + shearOffset, tailLength] // Tip of tail
                ];
                break;
                
            case 'top':
                svgWidth = tailWidth;
                svgHeight = tailLength;
                svgLeft = `calc(${tailInset}% - ${tailWidth/2}px)`;
                svgTop = `calc(0% - ${tailLength}px)`;
                
                pathPoints = [
                    [0, tailLength], // Left point on bubble edge
                    [tailWidth, tailLength], // Right point on bubble edge
                    [tailWidth/2 + shearOffset, 0] // Tip of tail
                ];
                break;
                
            case 'left':
                svgWidth = tailLength;
                svgHeight = tailWidth;
                svgLeft = `calc(0% - ${tailLength}px)`;
                svgTop = `calc(${tailInset}% - ${tailWidth/2}px)`;
                
                pathPoints = [
                    [tailLength, 0], // Top point on bubble edge
                    [tailLength, tailWidth], // Bottom point on bubble edge
                    [0, tailWidth/2 + shearOffset] // Tip of tail
                ];
                break;
                
            case 'right':
                svgWidth = tailLength;
                svgHeight = tailWidth;
                svgLeft = '100%';
                svgTop = `calc(${tailInset}% - ${tailWidth/2}px)`;
                
                pathPoints = [
                    [0, 0], // Top point on bubble edge
                    [0, tailWidth], // Bottom point on bubble edge
                    [tailLength, tailWidth/2 + shearOffset] // Tip of tail
                ];
                break;
                
            default:
                // Default to bottom if the position is invalid
                console.warn(`Invalid tail position: ${position}, defaulting to bottom`);
                svgWidth = tailWidth;
                svgHeight = tailLength;
                svgLeft = `calc(${tailInset}% - ${tailWidth/2}px)`;
                svgTop = '100%';
                
                pathPoints = [
                    [0, 0], // Left point on bubble edge
                    [tailWidth, 0], // Right point on bubble edge
                    [tailWidth/2 + shearOffset, tailLength] // Tip of tail
                ];
                break;
        }
        
        console.log(`SVG dimensions: ${svgWidth}x${svgHeight}, position: ${svgLeft}, ${svgTop}`);
        
        // Set SVG dimensions and position
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.style.top = svgTop;
        svg.style.left = svgLeft;
        
        // Create the filled path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('fill', bubbleColor);
        
        // Build the SVG path string
        let d = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
            d += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }
        d += ' Z'; // Close the path
        path.setAttribute('d', d);
        
        // Add the path to the SVG
        svg.appendChild(path);
        
        // Add outline if needed
        if (useOutline) {
            // Create outline path for the edges
            const outlinePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            outlinePath.setAttribute('fill', 'none');
            outlinePath.setAttribute('stroke', outlineColor);
            outlinePath.setAttribute('stroke-width', outlineThickness);
            
            // Build the outline path
            const outlineD = `M ${pathPoints[0][0]} ${pathPoints[0][1]} L ${pathPoints[2][0]} ${pathPoints[2][1]} L ${pathPoints[1][0]} ${pathPoints[1][1]}`;
            outlinePath.setAttribute('d', outlineD);
            svg.appendChild(outlinePath);
        }
        
        // Add the SVG to the text box
        textBox.appendChild(svg);
    }
    
    /**
     * Creates an SVG tail for thought bubbles using provided settings
     * @param {HTMLElement} textBox - The textbox element to add the tail to
     * @param {Object} settings - The tail settings object
     */
    createThoughtBubbleSvgTail(textBox, settings) {
        console.log(`Creating thought bubble SVG tail for position: ${settings.tailPosition}`);
        
        const position = settings.tailPosition || 'bottom';
        const bubbleColor = settings.tailColor || this.getBubbleBackgroundColor(textBox);
        const numCircles = settings.thoughtNumCircles || 3;
        const maxRadius = settings.thoughtCircleRadius || 5;
        const spacing = settings.thoughtCircleSpacing || 5;
        const offset = settings.thoughtTailOffset || 0;
        const tailInset = settings.thoughtTailInset || 50; // percentage
        
        // Create SVG element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('bubble-tail-svg');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '-1';
        
        // Get bubble dimensions
        const bubbleRect = textBox.getBoundingClientRect();
        const bubbleWidth = bubbleRect.width;
        const bubbleHeight = bubbleRect.height;
        
        // Calculate dimensions for SVG container
        // The total width/height depends on orientation (horizontal vs vertical tail)
        const isHorizontal = position === 'left' || position === 'right';
        const padding = 10; // Add padding to prevent cut-off

        // Add extra space based on offset value and increased padding
        const svgWidth = isHorizontal ? 
            spacing * numCircles + maxRadius * 2 + padding * 2 : 
            maxRadius * 2 + Math.abs(offset) + padding * 2;
        const svgHeight = isHorizontal ? 
            maxRadius * 2 + Math.abs(offset) + padding * 2 : 
            spacing * numCircles + maxRadius * 2 + padding * 2;
        
        // Set SVG dimensions
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        
        // Calculate position based on tail position
        let svgTop, svgLeft;
        
        switch(position) {
            case 'bottom':
                svgLeft = `calc(${tailInset}% - ${svgWidth/2}px)`;
                svgTop = '100%';
                break;
                
            case 'top':
                svgLeft = `calc(${tailInset}% - ${svgWidth/2}px)`;
                svgTop = `calc(0% - ${svgHeight}px)`;
                break;
                
            case 'left':
                svgLeft = `calc(0% - ${svgWidth}px)`;
                svgTop = `calc(${tailInset}% - ${svgHeight/2}px)`;
                break;
                
            case 'right':
                svgLeft = '100%';
                svgTop = `calc(${tailInset}% - ${svgHeight/2}px)`;
                break;
                
            default:
                console.warn(`Invalid tail position: ${position}, defaulting to bottom`);
                svgLeft = `calc(${tailInset}% - ${svgWidth/2}px)`;
                svgTop = '100%';
                break;
        }
        
        console.log(`Thought tail SVG dimensions: ${svgWidth}x${svgHeight}, position: ${svgLeft}, ${svgTop}`);
        
        // Set SVG position
        svg.style.top = svgTop;
        svg.style.left = svgLeft;
        
        // Calculate starting positions with padding
        const startX = isHorizontal ? padding : svgWidth / 2;
        const startY = isHorizontal ? svgHeight / 2 : padding;

        // Create circles for the thought bubble tail
        for (let i = 0; i < numCircles; i++) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            
            // Calculate radius - circles get smaller as they move away from the bubble
            const radius = maxRadius * (1 - (i / numCircles) * 0.5);
            
            // Calculate position based on orientation and circle index
            let cx, cy;
            
            if (position === 'bottom') {
                cx = startX + (offset * (i / numCircles));
                cy = startY + i * spacing;
            } else if (position === 'top') {
                cx = startX + (offset * (i / numCircles));
                cy = svgHeight - (padding + i * spacing);
            } else if (position === 'left') {
                cx = svgWidth - (padding + i * spacing);
                cy = startY + (offset * (i / numCircles));
            } else if (position === 'right') {
                cx = padding + i * spacing;
                cy = startY + (offset * (i / numCircles));
            }
            
            // Set attributes for the circle
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', bubbleColor);
            
            // Add 2px black outline to each circle
            circle.setAttribute('stroke', '#000000');
            circle.setAttribute('stroke-width', '2');
            
            // Add circle to SVG
            svg.appendChild(circle);
        }
        
        // Add the SVG to the text box
        textBox.appendChild(svg);
    }
    
    /**
     * Updates the SVG tail settings for a text bubble
     * @param {HTMLElement} textBox - The textbox element
     * @param {Object} newSettings - The new settings to apply
     */
    updateSvgTailSettings(textBox, newSettings) {
        // Get current settings or default if none exist
        let currentSettings;
        const bubbleType = textBox.dataset.bubbleType;
        
        if (textBox.dataset.tailSettings) {
            try {
                currentSettings = JSON.parse(textBox.dataset.tailSettings);
            } catch (e) {
                console.error("Error parsing tail settings", e);
                currentSettings = bubbleType === 'speech-bubble' ? 
                    { ...this.defaultSpeechTailSettings } : 
                    { ...this.defaultThoughtTailSettings };
            }
        } else {
            currentSettings = bubbleType === 'speech-bubble' ? 
                { ...this.defaultSpeechTailSettings } : 
                { ...this.defaultThoughtTailSettings };
        }
        
        // Merge new settings with current
        const mergedSettings = { ...currentSettings, ...newSettings };
        
        // Save to dataset
        textBox.dataset.tailSettings = JSON.stringify(mergedSettings);
        
        // Update the tail
        this.updateBubbleTail(textBox, mergedSettings.tailPosition);
    }
    
    positionTextBox(textBox, position) {
        const panelOrCanvas = textBox.parentElement;
        // Bounding rect might need adjustment if appending to canvas vs panel?
        // For now, assume parent provides the boundary.
        const parentRect = panelOrCanvas.getBoundingClientRect(); 
        
        let left, top;
        switch (position) {
            case 'top-left': left = 10; top = 10; break;
            case 'top-center': left = 50; top = 10; break;
            case 'top-right': left = 90; top = 10; break;
            case 'middle-left': left = 10; top = 50; break;
            case 'middle-center': left = 50; top = 50; break;
            case 'middle-right': left = 90; top = 50; break;
            case 'bottom-left': left = 10; top = 90; break;
            case 'bottom-center': left = 50; top = 90; break;
            case 'bottom-right': left = 90; top = 90; break;
            default: left = 50; top = 50;
        }
        
        textBox.style.left = `${left}%`;
        textBox.style.top = `${top}%`;
        
        const translateX = position.includes('left') ? '0%' : 
                         position.includes('right') ? '-100%' : '-50%';
        const translateY = position.includes('top') ? '0%' : 
                         position.includes('bottom') ? '-100%' : '-50%';
        
        const rotation = this.getRotationValue(textBox); // Internal call
        const rotateStyle = rotation !== 0 ? ` rotate(${rotation}deg)` : '';
        textBox.style.transform = `translate(${translateX}, ${translateY})${rotateStyle}`;
        
        // Store position information for state management
        textBox.dataset.positionGrid = position;
        
        // Remove any previous positioning classes
        const positionClasses = textBox.className.match(/positioned-[a-z]+-[a-z]+/g);
        if (positionClasses && positionClasses.length) {
            positionClasses.forEach(cls => {
                textBox.classList.remove(cls);
            });
        }
        
        // Add the new positioning class
        textBox.classList.add(`positioned-${position}`);
    }

    getOutlineThickness(textElement) {
        // If the element has an outline, return 1, otherwise 0
        return textElement.getAttribute('data-has-outline') === 'true' ? 1 : 0;
    }

    getOutlineColor(textElement) {
        // Try to get the color from data attribute first
        const dataColor = textElement.getAttribute('data-outline-color');
        if (dataColor) return dataColor;
        
        // If no data attribute, try to parse the text-shadow
        const shadow = textElement.style.textShadow || '';
        const colorMatch = shadow.match(/(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)/);
        return colorMatch ? globalRgbToHex(colorMatch[0]) : '#000000'; // Use imported util
    }

    getShadowColor(textElement) {
        const shadow = textElement.style.textShadow || '';
        // Updated regex to better handle various color formats including hex
        const colorMatch = shadow.match(/(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+)/);
        return colorMatch ? globalRgbToHex(colorMatch[0]) : '#666666'; // Use imported util
    }

    updateOutlineText(textElement) {
        // This method is kept for backward compatibility
        // but it's no longer needed with the text-shadow approach
        return;
    }

    getBubbleBackgroundColor(textBox) {
        const bubbleColorVariable = textBox.style.getPropertyValue('--bubble-background-color');
        if (bubbleColorVariable && bubbleColorVariable.trim() !== '') {
            if (bubbleColorVariable.startsWith('#')) return bubbleColorVariable;
            return globalRgbToHex(bubbleColorVariable); // Use imported util
        }
        const computedBackgroundColor = window.getComputedStyle(textBox).backgroundColor;
        return globalRgbToHex(computedBackgroundColor); // Use imported util
    }

    // --- State Management ---

    /**
     * Extracts text state from the current DOM for saving.
     * @returns {object} Object containing arrays { panelTextStates: [], canvasTextElements: [] }
     */
    saveTextStates() {
        const panelTextStates = [];
        const canvasTextElements = [];
        const canvas = document.querySelector('#comic-canvas');
        
        // Save panel text elements
        const panels = Array.from(document.querySelectorAll('.comic-panel'));
        panels.forEach(panel => {
            const panelTexts = [];
            Array.from(panel.querySelectorAll('.text-bubble')).forEach(textBubble => {
                const textElement = textBubble.querySelector('.text-content');
                if (!textElement) return;

                const bubbleClasses = Array.from(textBubble.classList)
                    .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                                    'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                                    'no-bubble'].includes(cls));
                const tailPositionClass = Array.from(textBubble.classList)
                    .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));

                panelTexts.push({
                    id: textBubble.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                    previousBubbleType: textBubble.dataset.previousBubbleType || '',
                    tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                    tailSettings: textBubble.dataset.tailSettings || '',
                    positionGrid: textBubble.dataset.positionGrid || 'custom', // Store grid position
                    content: textElement.innerHTML,
                    style: {
                        left: textBubble.style.left,
                        top: textBubble.style.top,
                        width: textBubble.style.width,
                        height: textBubble.style.height,
                        transform: textBubble.style.transform,
                        backgroundColor: textBubble.style.backgroundColor,
                        bubbleBackgroundColor: textBubble.style.getPropertyValue('--bubble-background-color'),
                        bubbleOpacity: textBubble.style.getPropertyValue('--bubble-opacity') || '1',
                        color: textElement.style.color,
                        fontSize: textElement.style.fontSize,
                        fontFamily: textElement.style.fontFamily,
                        fontWeight: textElement.style.fontWeight,
                        fontStyle: textElement.style.fontStyle,
                        textDecoration: textElement.style.textDecoration,
                        lineHeight: textElement.style.lineHeight,
                        textAlign: textElement.style.textAlign,
                        textTransform: textElement.style.textTransform,
                        padding: textBubble.style.padding,
                        paddingVertical: textBubble.dataset.paddingVertical,
                        paddingHorizontal: textBubble.dataset.paddingHorizontal,
                        bubblePadding: textBubble.dataset.bubblePadding,
                        textShadow: textElement.style.textShadow,
                        hasOutline: textElement.getAttribute('data-has-outline') === 'true',
                        outlineColor: textElement.getAttribute('data-outline-color') || '#000000',
                        zIndex: textBubble.style.zIndex || '100' // Save z-index, default to 100
                    }
                });
            });
            panelTextStates.push(panelTexts); // Add array of text states for this panel
        });

        // Save canvas text elements
        if (canvas) {
            const canvasTextBubbles = Array.from(canvas.querySelectorAll(':scope > .text-bubble'));
            if (canvasTextBubbles.length > 0) {
                canvasTextBubbles.forEach(textBubble => {
                    const textElement = textBubble.querySelector('.text-content');
                    if (!textElement) return;

                    const bubbleClasses = Array.from(textBubble.classList)
                        .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                                      'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                                      'no-bubble'].includes(cls));
                    const tailPositionClass = Array.from(textBubble.classList)
                        .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));
                    
                    canvasTextElements.push({
                        id: textBubble.id || `canvas_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                        previousBubbleType: textBubble.dataset.previousBubbleType || '',
                        tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                        tailSettings: textBubble.dataset.tailSettings || '',
                        positionGrid: textBubble.dataset.positionGrid || 'custom', // Store grid position
                        content: textElement.innerHTML,
                        style: {
                            left: textBubble.style.left,
                            top: textBubble.style.top,
                            width: textBubble.style.width,
                            height: textBubble.style.height,
                            transform: textBubble.style.transform,
                            backgroundColor: textBubble.style.backgroundColor,
                            bubbleBackgroundColor: textBubble.style.getPropertyValue('--bubble-background-color'),
                            bubbleOpacity: textBubble.style.getPropertyValue('--bubble-opacity') || '1',
                            color: textElement.style.color,
                            fontSize: textElement.style.fontSize,
                            fontFamily: textElement.style.fontFamily,
                            fontWeight: textElement.style.fontWeight,
                            fontStyle: textElement.style.fontStyle,
                            textDecoration: textElement.style.textDecoration,
                            lineHeight: textElement.style.lineHeight,
                            textAlign: textElement.style.textAlign,
                            textTransform: textElement.style.textTransform,
                            padding: textBubble.style.padding,
                            paddingVertical: textBubble.dataset.paddingVertical,
                            paddingHorizontal: textBubble.dataset.paddingHorizontal,
                            bubblePadding: textBubble.dataset.bubblePadding,
                            textShadow: textElement.style.textShadow,
                            hasOutline: textElement.getAttribute('data-has-outline') === 'true',
                            outlineColor: textElement.getAttribute('data-outline-color') || '#000000',
                            zIndex: textBubble.style.zIndex || '100' // Save z-index, default to 100
                        }
                    });
                });
            }
        }

        return { panelTextStates, canvasTextElements };
    }

    /**
     * Restores text elements onto the DOM based on saved state.
     * @param {object} pageState - The state object for the current page.
     */
    loadTextStates(pageState) {
        const panels = document.querySelectorAll('.comic-panel');
        const comicCanvas = document.querySelector('#comic-canvas');

        // Ensure canvas exists
        if (!comicCanvas) {
            console.error("TextManager.loadTextStates - Comic canvas element not found");
            return;
        }

        // Debug: Log the page state and existing text elements
        console.log(`TextManager.loadTextStates - Page index: ${this.comicCreator.currentPageIndex}`);
        console.log(`TextManager.loadTextStates - Existing text bubbles on canvas: ${comicCanvas.querySelectorAll('.text-bubble').length}`);
        console.log(`TextManager.loadTextStates - Total panels found: ${panels.length}`);

        if (pageState.panelStates) {
            console.log(`TextManager.loadTextStates - Panel states in page data: ${pageState.panelStates.length}`);
            
            // Verify we have the same number of panels as states or log the mismatch
            if (panels.length !== pageState.panelStates.length) {
                console.warn(`TextManager.loadTextStates - Panel count mismatch: ${panels.length} panels found vs ${pageState.panelStates.length} panel states`);
            }
        } else {
            console.warn(`TextManager.loadTextStates - No panel states found in page data`);
        }

        if (pageState.canvasTextElements) {
            console.log(`TextManager.loadTextStates - Canvas text elements in page data: ${pageState.canvasTextElements.length}`);
        } else {
            console.warn(`TextManager.loadTextStates - No canvas text elements found in page data`);
        }

        // Restore panel text elements
        if (pageState.panelStates && panels.length > 0) {
            const processablePanels = Math.min(panels.length, pageState.panelStates.length);
            console.log(`TextManager: Restoring text for ${processablePanels} panels`);
            
            for (let index = 0; index < processablePanels; index++) {
                const panel = panels[index];
                
                // Verify panel exists
                if (!panel) {
                    console.warn(`TextManager: Panel at index ${index} not found in DOM`);
                    continue;
                }
                
                const state = pageState.panelStates[index];
                
                if (state && state.textElements) { 
                    console.log(`TextManager: Panel ${index} has ${state.textElements.length} text elements`);
                    state.textElements.forEach(textState => {
                        this.restoreTextBubble(textState, panel); // Use helper
                    });
                } else {
                    console.warn(`TextManager: Panel state or textElements missing at index ${index}.`);
                }
            } 
        }

        // Restore canvas text elements
        if (pageState.canvasTextElements && comicCanvas) {
            console.log(`TextManager: Restoring ${pageState.canvasTextElements.length} canvas text elements`);
            pageState.canvasTextElements.forEach((textState, idx) => {
                console.log(`TextManager: Restoring canvas text element ${idx} with id ${textState.id}`);
                this.restoreTextBubble(textState, comicCanvas); // Use helper, pass canvas as parent
            });
        }

        // Debug: Log the final state after restoration
        console.log(`TextManager.loadTextStates - Final text bubbles on canvas: ${comicCanvas.querySelectorAll('.text-bubble').length}`);
    }

    /**
     * Helper function to create and append a text bubble from saved state.
     * @param {object} textState - The saved state for a single text bubble.
     * @param {HTMLElement} parentElement - The element to append the bubble to (panel or canvas).
     */
    restoreTextBubble(textState, parentElement) {
        const textBubble = document.createElement('div');
        textBubble.className = 'text-bubble';
        
        // Set bubble ID
        textBubble.id = textState.id || `text_${Date.now()}`;
        
        // Add bubble type
        const bubbleType = textState.bubbleType || 'speech-bubble';
        textBubble.classList.add(bubbleType);
        textBubble.dataset.bubbleType = bubbleType;
        
        // Set previous bubble type if present
        if (textState.previousBubbleType) {
        textBubble.dataset.previousBubbleType = textState.previousBubbleType;
        }
        
        // Set position grid data
        if (textState.positionGrid) {
            textBubble.dataset.positionGrid = textState.positionGrid;
            textBubble.classList.add(`positioned-${textState.positionGrid}`);
        }
        
        // Set tail position and tail settings if present
        if (textState.tailPosition) {
            textBubble.dataset.tailPosition = textState.tailPosition;
        }
        
        if (textState.tailSettings) {
            textBubble.dataset.tailSettings = textState.tailSettings;
        }
        
        // Add content
        const textElement = document.createElement('div');
        textElement.className = 'text-content';
        textElement.contentEditable = true;
        textElement.innerHTML = textState.content || 'Click to edit text';
        
        // Controls
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
        dragHandle.title = 'Drag to move';

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        resizeHandle.title = 'Drag to resize';

        const formatButton = document.createElement('div');
        formatButton.className = 'format-text-btn';
        formatButton.innerHTML = '<i class="fas fa-palette"></i>';
        formatButton.title = 'Format text';

        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-text-btn';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.title = 'Delete text';
        
        // Apply styling
        if (textState.style) {
            // Position and size
            if (textState.style.left) textBubble.style.left = textState.style.left;
            if (textState.style.top) textBubble.style.top = textState.style.top;
            if (textState.style.width) textBubble.style.width = textState.style.width;
            if (textState.style.height) textBubble.style.height = textState.style.height;
            if (textState.style.transform) textBubble.style.transform = textState.style.transform;
            if (textState.style.zIndex) textBubble.style.zIndex = textState.style.zIndex;
            
            // Bubble styling
            if (textState.style.backgroundColor) textBubble.style.backgroundColor = textState.style.backgroundColor;
            if (textState.style.bubbleBackgroundColor) {
                textBubble.style.setProperty('--bubble-background-color', textState.style.bubbleBackgroundColor);
            }
            if (textState.style.bubbleOpacity) {
                textBubble.style.setProperty('--bubble-opacity', textState.style.bubbleOpacity);
            }
            if (textState.style.padding) textBubble.style.padding = textState.style.padding;
            
            // Padding data attributes
            if (textState.style.paddingVertical) textBubble.dataset.paddingVertical = textState.style.paddingVertical;
            if (textState.style.paddingHorizontal) textBubble.dataset.paddingHorizontal = textState.style.paddingHorizontal;
            if (textState.style.bubblePadding) textBubble.dataset.bubblePadding = textState.style.bubblePadding;
            
            // Text styling
            if (textState.style.color) textElement.style.color = textState.style.color;
            if (textState.style.fontSize) textElement.style.fontSize = textState.style.fontSize;
            if (textState.style.fontFamily) textElement.style.fontFamily = textState.style.fontFamily;
            if (textState.style.fontWeight) textElement.style.fontWeight = textState.style.fontWeight;
            if (textState.style.fontStyle) textElement.style.fontStyle = textState.style.fontStyle;
            if (textState.style.textDecoration) textElement.style.textDecoration = textState.style.textDecoration;
            if (textState.style.lineHeight) textElement.style.lineHeight = textState.style.lineHeight;
            if (textState.style.textAlign) textElement.style.textAlign = textState.style.textAlign;
            if (textState.style.textTransform) textElement.style.textTransform = textState.style.textTransform;
            
            // Text shadow/outline effects
            if (textState.style.textShadow) textElement.style.textShadow = textState.style.textShadow;
            if (textState.style.hasOutline) {
                textElement.setAttribute('data-has-outline', 'true');
                // Apply outline color if present
                if (textState.style.outlineColor) {
                    textElement.setAttribute('data-outline-color', textState.style.outlineColor);
                    this.applyTextOutline(textElement, textState.style.outlineColor);
                } else {
                    this.applyTextOutline(textElement, '#000000');
                }
            }
        }

        // Append elements
        textBubble.appendChild(textElement);
        textBubble.appendChild(dragHandle);
        textBubble.appendChild(resizeHandle);
        textBubble.appendChild(formatButton);
        textBubble.appendChild(deleteButton);
        parentElement.appendChild(textBubble);

        // Make draggable
            this.comicCreator.dragAndDropManager.makeTextDraggable(textBubble, dragHandle);
        
        // Make resizable
        this.comicCreator.dragAndDropManager.makeTextResizable(textBubble, resizeHandle); 

        // Setup delete functionality
        deleteButton.addEventListener('click', () => {
            textBubble.remove();
            
            // Hide the formatting popup if open
            const popup = document.getElementById('text-format-popup');
            if (popup) popup.remove();
            
            // Hide properties panel
            this.comicCreator.deselectAll();
            
            // Save state
            this.comicCreator.saveCurrentPageState();
        });
        
        // Setup formatting button
        formatButton.addEventListener('click', (e) => {
            this.showTextFormatPopup(textBubble, e);
        });

        // Setup text selection
        textBubble.addEventListener('click', (e) => {
            // Only select if not clicking on controls or text content
            if (e.target !== textElement && 
                !e.target.closest('.format-text-btn') && 
                !e.target.closest('.resize-handle') && 
                !e.target.closest('.delete-text-btn') &&
                !e.target.closest('.drag-handle')) {
                this.selectTextBox(textBubble);
                
                // Prevent propagation to avoid deselection
                 e.stopPropagation();
             }
        });

        // Setup text element edge click
        textElement.addEventListener('click', (e) => {
            // Calculate if click is near edge
            const rect = textElement.getBoundingClientRect();
            const isNearEdge = 
                e.clientX - rect.left < 10 || 
                rect.right - e.clientX < 10 || 
                e.clientY - rect.top < 10 || 
                rect.bottom - e.clientY < 10;
                
            if (isNearEdge) {
                this.selectTextBox(textBubble);
                // Don't prevent default
            }
        });
        
        // Apply bubble tail if specified
        if (textState.tailPosition && textState.tailPosition !== 'none') {
            this.updateBubbleTail(textBubble, textState.tailPosition);
        }
        
        return textBubble;
    }

    // --- Event Handling ---

    /**
     * Deletes the currently selected text box.
     */
    deleteSelectedTextBox() {
        if (!this.currentTextBox) return;
        
        // Record state before deleting text
        this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text');

        this.currentTextBox.remove();
        this.currentTextBox = null;
        this.comicCreator.deselectAll(); // Ensure sidebar updates
        this.comicCreator.saveCurrentPageState();
    }

    // New helper to get shadow offset and blur
    getShadowOffset(textElement) {
        const shadow = textElement.style.textShadow || '';
        const defaultOffset = { x: 2, y: 2, blur: 2 };
        // Regex to capture numbers (potentially negative) followed by 'px'
        const parts = shadow.match(/(-?\d+(\.\d+)?)px\s+(-?\d+(\.\d+)?)px\s+(-?\d+(\.\d+)?)px/);
        if (parts && parts.length >= 6) {
            return {
                x: parseInt(parts[1]) || defaultOffset.x,
                y: parseInt(parts[3]) || defaultOffset.y,
                blur: parseInt(parts[5]) || defaultOffset.blur
            };
        }
        return defaultOffset; // Return defaults if no match or incomplete
    }

    /**
     * Resets position grid value when a text bubble is manually moved
     * This should be called by the DragAndDropManager after dragging ends
     * @param {HTMLElement} textBox - The text bubble element that was moved
     */
    resetTextPositionGrid(textBox) {
        if (!textBox) return;
        
        // If the textBox has a dataset.positionGrid attribute, clear it
        if (textBox.dataset.positionGrid) {
            textBox.dataset.positionGrid = 'custom';
        }
        
        // If the textBox has a positioned-X-Y class, remove it
        const positionClasses = textBox.className.match(/positioned-[a-z]+-[a-z]+/g);
        if (positionClasses && positionClasses.length) {
            positionClasses.forEach(cls => {
                textBox.classList.remove(cls);
            });
            // Add a custom position class
            textBox.classList.add('positioned-custom');
        }
        
        // If there's a transform with translate but no rotation, clear it
        if (textBox.style.transform && 
            textBox.style.transform.includes('translate') && 
            !textBox.style.transform.includes('rotate')) {
            textBox.style.transform = '';
        }
        // If there's both translate and rotate, keep only the rotate part
        else if (textBox.style.transform && 
                textBox.style.transform.includes('translate') && 
                textBox.style.transform.includes('rotate')) {
            const rotation = this.getRotationValue(textBox);
            if (rotation !== 0) {
                textBox.style.transform = `rotate(${rotation}deg)`;
            } else {
                textBox.style.transform = '';
            }
        }
    }

    // New methods for handling default font settings and custom text styles

    /**
     * Sets the current text element's style as the default for new text elements
     * @param {HTMLElement} textBox - The text bubble element to use as a template
     */
    setDefaultTextSettings(textBox) {
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) return;
        
        // Update default settings from the current text element
        this.defaultTextSettings = {
            fontFamily: textElement.style.fontFamily || 'Arial',
            fontSize: textElement.style.fontSize || '16px',
            fontWeight: textElement.style.fontWeight || 'normal',
            fontStyle: textElement.style.fontStyle || 'normal',
            textDecoration: textElement.style.textDecoration || 'none',
            textAlign: textElement.style.textAlign || 'center',
            color: textElement.style.color || '#000000',
            bubbleType: textBox.dataset.bubbleType || 'speech-bubble'
        };
        
        // Save the default settings in the application state
        this.saveTextSettings();
        
        // Show notification to the user
        this.comicCreator.uiManager.showNotification('Default text style set', 'success');
    }

    /**
     * Saves the current text settings to local storage
     */
    saveTextSettings() {
        try {
            localStorage.setItem('comicCreator_defaultTextSettings', JSON.stringify(this.defaultTextSettings));
            localStorage.setItem('comicCreator_customTextStyles', JSON.stringify(this.customTextStyles));
        } catch (e) {
            console.error('Failed to save text settings to localStorage:', e);
        }
    }

    /**
     * Loads saved text settings from local storage
     */
    loadTextSettings() {
        try {
            const savedDefaultSettings = localStorage.getItem('comicCreator_defaultTextSettings');
            const savedCustomStyles = localStorage.getItem('comicCreator_customTextStyles');
            
            if (savedDefaultSettings) {
                this.defaultTextSettings = JSON.parse(savedDefaultSettings);
            }
            
            if (savedCustomStyles) {
                this.customTextStyles = JSON.parse(savedCustomStyles);
            }
        } catch (e) {
            console.error('Failed to load text settings from localStorage:', e);
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
                outlineColor: textElement.style.getPropertyValue('--outline-color') || '#000000',
                outlineWidth: textElement.style.getPropertyValue('--outline-width') || '2px',
                lineHeight: textElement.style.lineHeight || 'normal'
            }
        };
        
        // Add the new style to the array
        this.customTextStyles.push(newStyle);
        
        // Save the updated styles
        this.saveTextSettings();
        
        // Show notification to the user
        this.comicCreator.uiManager.showNotification(`Style "${styleName}" created`, 'success');
        
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
            const tailClass = `${style.bubbleType.split('-')[0]}-tail-${style.tailPosition}`;
            textBox.classList.add(tailClass);
            textBox.dataset.tailPosition = style.tailPosition;
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
        }
        
        // Apply outline if present
        if (style.style.hasOutline) {
            textElement.dataset.hasOutline = 'true';
            textElement.style.setProperty('--outline-width', style.style.outlineWidth);
            textElement.style.setProperty('--outline-color', style.style.outlineColor);
            this.applyTextOutline(textElement, style.style.outlineColor, parseFloat(style.style.outlineWidth));
        } else {
            textElement.dataset.hasOutline = 'false';
            this.removeTextOutline(textElement);
        }
        
        // Save the state after applying the style
        this.comicCreator.saveCurrentPageState();
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
        
        // Save the updated styles
        this.saveTextSettings();
        
        // Show notification to the user
        this.comicCreator.uiManager.showNotification(`Style "${styleName}" deleted`, 'success');
    }

    /**
     * Generates HTML for the custom styles grid
     * @returns {string} HTML for custom styles
     */
    generateCustomStylesHTML() {
        if (this.customTextStyles.length === 0) {
            return `<div class="no-styles-message">No custom styles yet. Create one by clicking "Save Current Style".</div>`;
        }
        
        return this.customTextStyles.map(style => {
            // Set preview background to transparent for no-bubble styles
            const isBubbleVisible = style.bubbleType !== 'no-bubble';
            const backgroundStyle = isBubbleVisible 
                ? `background-color: ${style.style.backgroundColor || 'white'};` 
                : `background-color: transparent;`;
            
            return `
                <div class="style-preview" data-style-id="${style.id}">
                    <div class="style-preview-bubble ${style.bubbleType}" style="${backgroundStyle}">
                        <div class="style-preview-text" 
                             style="font-family: ${style.style.fontFamily}; 
                                    font-size: ${style.style.fontSize}; 
                                    color: ${style.style.color};">
                            ${style.name}
                        </div>
                    </div>
                    <button class="delete-style-btn" data-style-id="${style.id}">
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
        setAsDefaultBtn.addEventListener('click', () => {
            this.setDefaultTextSettings(textBox);
        });
        
        // Save as style button
        const saveAsStyleBtn = popup.querySelector('.save-as-style-btn');
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
                this.updatePopupControls(popup, textBox);
            });
        });
        
        // Delete style button
        popup.querySelectorAll('.delete-style-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the parent's click event
                
                const styleId = btn.dataset.styleId;
                if (confirm('Are you sure you want to delete this style?')) {
                    this.deleteCustomTextStyle(styleId);
                    
                    // Update the custom styles grid
                    const stylesGrid = popup.querySelector('.custom-styles-grid');
                    if (stylesGrid) {
                        stylesGrid.innerHTML = this.generateCustomStylesHTML();
                        
                        // Re-attach event listeners for the new elements
                        this.setupStylePreviewListeners(popup, textBox);
                    }
                }
            });
        });
    }

    /**
     * Updates the popup controls to reflect the current text element's style
     * @param {HTMLElement} popup - The popup element
     * @param {HTMLElement} textBox - The text bubble element
     */
    updatePopupControls(popup, textBox) {
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) return;
        
        // Update font family select
        const fontSelect = popup.querySelector('#font-family');
        if (fontSelect && textElement.style.fontFamily) {
            fontSelect.value = textElement.style.fontFamily;
        }
        
        // Update font size
        const fontSizeSlider = popup.querySelector('#font-size');
        const fontSizeValue = popup.querySelector('.font-size-value');
        if (fontSizeSlider && textElement.style.fontSize) {
            const fontSize = parseInt(textElement.style.fontSize);
            fontSizeSlider.value = fontSize;
            if (fontSizeValue) fontSizeValue.textContent = `${fontSize}px`;
        }
        
        // Update text color
        const textColorPicker = popup.querySelector('#text-color');
        const textColorHex = popup.querySelector('.text-color-hex');
        if (textColorPicker && textElement.style.color) {
            textColorPicker.value = this.comicCreator.uiManager.rgbToHex(textElement.style.color);
            if (textColorHex) textColorHex.textContent = textColorPicker.value.toUpperCase();
        }
        
        // Update bubble color
        const bubbleColorPicker = popup.querySelector('#bubble-color');
        const bubbleColorHex = popup.querySelector('.bubble-color-hex');
        if (bubbleColorPicker) {
            const bubbleColor = this.getBubbleBackgroundColor(textBox);
            bubbleColorPicker.value = this.comicCreator.uiManager.rgbToHex(bubbleColor);
            if (bubbleColorHex) bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
        }
        
        // Update style buttons (bold, italic, etc.)
        if (textElement.style.fontWeight === 'bold') {
            popup.querySelector('.bold-btn')?.classList.add('active');
        } else {
            popup.querySelector('.bold-btn')?.classList.remove('active');
        }
        
        if (textElement.style.fontStyle === 'italic') {
            popup.querySelector('.italic-btn')?.classList.add('active');
        } else {
            popup.querySelector('.italic-btn')?.classList.remove('active');
        }
        
        if (textElement.style.textDecoration === 'underline') {
            popup.querySelector('.underline-btn')?.classList.add('active');
        } else {
            popup.querySelector('.underline-btn')?.classList.remove('active');
        }
        
        if (textElement.style.textTransform === 'uppercase') {
            popup.querySelector('.all-caps-btn')?.classList.add('active');
        } else {
            popup.querySelector('.all-caps-btn')?.classList.remove('active');
        }
        
        // Update alignment buttons
        popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
        switch (textElement.style.textAlign) {
            case 'left':
                popup.querySelector('.align-left')?.classList.add('active');
                break;
            case 'center':
                popup.querySelector('.align-center')?.classList.add('active');
                break;
            case 'right':
                popup.querySelector('.align-right')?.classList.add('active');
                break;
            default:
                popup.querySelector('.align-center')?.classList.add('active');
        }
        
        // Update bubble options
        popup.querySelectorAll('.bubble-option').forEach(option => option.classList.remove('selected'));
        const bubbleType = textBox.dataset.bubbleType;
        popup.querySelector(`.bubble-option[data-type="${bubbleType}"]`)?.classList.add('selected');
        
        // Update bubble toggle
        const bubbleToggle = popup.querySelector('#show-bubble');
        if (bubbleToggle) {
            bubbleToggle.checked = bubbleType !== 'no-bubble';
        }
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
            
            const outlineColor = this.getOutlineColor(textElement);
            outlineColorPicker.value = outlineColor;
            outlineColorHex.textContent = outlineColor.toUpperCase();
        } else {
            textOutlineCheckbox.checked = false;
            colorPickerContainer.classList.add('hidden');
            outlineColorPicker.disabled = true;
            outlineColorHex.setAttribute('disabled', true);
        }
    }
} 

