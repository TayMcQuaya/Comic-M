export class TextManagerBubbleManipulation {
    constructor(comicCreator, defaultTextSettings) {
        this.comicCreator = comicCreator;
        this.defaultTextSettings = defaultTextSettings;
        this.currentTextBox = null; // Manages the currently selected text box

        // Note: Properties like defaultSpeechTailSettings, defaultThoughtTailSettings, 
        // and customTextStyles are managed by TextManagerCoreSetup.
        // If methods moved here need them directly without going through comicCreator 
        // or another mechanism, the constructor and integration will need adjustment.
        // For now, these methods primarily use defaultTextSettings.
    }

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
            if (this.comicCreator && this.comicCreator.textManagerStyling && typeof this.comicCreator.textManagerStyling.showTextFormatPopup === 'function') {
                this.comicCreator.textManagerStyling.showTextFormatPopup(textContainer, e);
            } else {
                console.warn('TextManagerBubbleManipulation: comicCreator.textManagerStyling.showTextFormatPopup not found.');
            }
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
            if (this.comicCreator && this.comicCreator.textManagerStyling && typeof this.comicCreator.textManagerStyling.showTextFormatPopup === 'function') {
                this.comicCreator.textManagerStyling.showTextFormatPopup(textContainer, e);
            } else {
                console.warn('TextManagerBubbleManipulation: comicCreator.textManagerStyling.showTextFormatPopup not found.');
            }
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
        if (this.comicCreator.panelManager && this.comicCreator.panelManager.currentPanel) {
            this.comicCreator.panelManager.selectPanel(null); // Deselect the panel
        }
        // --- End panel deselection --- 
        
        // --- Explicitly deselect any currently selected sticker --- 
        if (this.comicCreator.stickerManager && this.comicCreator.stickerManager.currentSticker) { // Check StickerManager's property
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
        if (this.comicCreator && this.comicCreator.textManagerStyling && typeof this.comicCreator.textManagerStyling.updateTextProperties === 'function') {
            this.comicCreator.textManagerStyling.updateTextProperties(textBox);
        } else {
            console.warn('TextManagerBubbleManipulation: comicCreator.textManagerStyling.updateTextProperties not found. Properties panel will not be updated by selectTextBox.');
        }
    }
    
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
} 