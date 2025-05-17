// import { globalRgbToHex } from './Utils.js'; // May be needed if applyTextOutline is moved/replicated here later

export class TextManagerState {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        this.currentTextBox = null; // Tracks the selected text box, similar to TextManagerOld
    }

    /**
     * Extracts text state from the current DOM for saving.
     * @returns {object} Object containing arrays { panelTextStates: [], canvasTextElements: [] }
     */
    saveTextStates() {
        console.log('TextManagerState.saveTextStates: Starting to save text states...');
        const panelTextStates = [];
        const canvasTextElements = [];
        const canvas = document.querySelector('#comic-canvas');
        
        // Save panel text elements
        const panels = Array.from(document.querySelectorAll('.comic-panel'));
        console.log(`TextManagerState.saveTextStates: Found ${panels.length} panels to check for text bubbles`);
        
        panels.forEach((panel, panelIndex) => {
            const panelTexts = [];
            const textBubbles = Array.from(panel.querySelectorAll('.text-bubble'));
            console.log(`TextManagerState.saveTextStates: Panel ${panelIndex} has ${textBubbles.length} text bubbles`);
            
            textBubbles.forEach((textBubble, bubbleIndex) => {
                const textElement = textBubble.querySelector('.text-content');
                if (!textElement) {
                    console.warn(`TextManagerState.saveTextStates: Text bubble ${bubbleIndex} in panel ${panelIndex} has no text content element!`);
                    return;
                }

                console.log(`TextManagerState.saveTextStates: Saving text bubble ${textBubble.id} from panel ${panelIndex}`);
                
                const bubbleClasses = Array.from(textBubble.classList)
                    .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                                    'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                                    'no-bubble'].includes(cls));
                const tailPositionClass = Array.from(textBubble.classList)
                    .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));

                // Get the absolute bounding client rect for precise positioning
                const bubbleRect = textBubble.getBoundingClientRect();
                const panelRect = panel.getBoundingClientRect();
                
                // Calculate the exact position relative to the panel
                const exactLeft = bubbleRect.left - panelRect.left;
                const exactTop = bubbleRect.top - panelRect.top;
                
                panelTexts.push({
                    id: textBubble.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                    previousBubbleType: textBubble.dataset.previousBubbleType || '',
                    tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                    tailSettings: textBubble.dataset.tailSettings || '',
                    positionGrid: textBubble.dataset.positionGrid || 'custom', // Store grid position
                    content: textElement.innerHTML,
                    // Store the exact computed position values to help with accurate restoration
                    originalPosition: {
                        left: `${exactLeft}px`,
                        top: `${exactTop}px`, 
                        width: `${bubbleRect.width}px`,
                        height: `${bubbleRect.height}px`
                    },
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
            console.log(`TextManagerState.saveTextStates: Found ${canvasTextBubbles.length} text bubbles directly on canvas`);
            
            if (canvasTextBubbles.length > 0) {
                canvasTextBubbles.forEach((textBubble, bubbleIndex) => {
                    const textElement = textBubble.querySelector('.text-content');
                    if (!textElement) {
                        console.warn(`TextManagerState.saveTextStates: Canvas text bubble ${bubbleIndex} has no text content element!`);
                        return;
                    }
                    
                    console.log(`TextManagerState.saveTextStates: Saving canvas text bubble ${textBubble.id}`);

                    const bubbleClasses = Array.from(textBubble.classList)
                        .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                                      'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                                      'no-bubble'].includes(cls));
                    const tailPositionClass = Array.from(textBubble.classList)
                        .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));
                    
                    // Get the absolute bounding client rect for precise positioning
                    const bubbleRect = textBubble.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();
                    
                    // Calculate the exact position relative to the canvas
                    const exactLeft = bubbleRect.left - canvasRect.left;
                    const exactTop = bubbleRect.top - canvasRect.top;
                    
                    canvasTextElements.push({
                        id: textBubble.id || `canvas_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                        previousBubbleType: textBubble.dataset.previousBubbleType || '',
                        tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                        tailSettings: textBubble.dataset.tailSettings || '',
                        positionGrid: textBubble.dataset.positionGrid || 'custom', // Store grid position
                        content: textElement.innerHTML,
                        // Store the exact computed position values to help with accurate restoration
                        originalPosition: {
                            left: `${exactLeft}px`,
                            top: `${exactTop}px`, 
                            width: `${bubbleRect.width}px`,
                            height: `${bubbleRect.height}px`
                        },
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

        // Log a summary of what's being returned
        console.log(`TextManagerState.saveTextStates: Returning ${panelTextStates.reduce((sum, panel) => sum + panel.length, 0)} panel text elements and ${canvasTextElements.length} canvas text elements`);
        
        return { panelTextStates, canvasTextElements };
    }

    /**
     * Restores text elements onto the DOM based on saved state.
     * @param {object} pageState - The state object for the current page.
     */
    loadTextStates(pageState) {
        console.log("TextManagerState.loadTextStates: Starting text bubble restoration...");
        console.log("TextManagerState.loadTextStates: PageState structure:", 
                   JSON.stringify({
                       hasPanelStates: !!pageState.panelStates,
                       panelStatesLength: pageState.panelStates ? pageState.panelStates.length : 0,
                       hasCanvasTextElements: !!pageState.canvasTextElements,
                       canvasTextElementsLength: pageState.canvasTextElements ? pageState.canvasTextElements.length : 0
                   }));
        
        const panels = document.querySelectorAll('.comic-panel');
        const comicCanvas = document.querySelector('#comic-canvas');

        // Ensure canvas exists
        if (!comicCanvas) {
            console.error("TextManagerState.loadTextStates - Comic canvas element not found");
            return;
        }

        // Debug: Log the page state and existing text elements
        if (this.comicCreator) {
            console.log(`TextManagerState.loadTextStates - Page index: ${this.comicCreator.currentPageIndex}`);
        }
        console.log(`TextManagerState.loadTextStates - Existing text bubbles on canvas: ${comicCanvas.querySelectorAll('.text-bubble').length}`);
        console.log(`TextManagerState.loadTextStates - Total panels found: ${panels.length}`);

        // IMPORTANT: Clear ALL existing text bubbles before loading to prevent duplicates
        // and avoid any interaction between old and new text elements
        comicCanvas.querySelectorAll(':scope > .text-bubble').forEach(element => element.remove());
        panels.forEach(panel => {
            panel.querySelectorAll('.text-bubble').forEach(element => element.remove());
        });

        if (pageState.panelStates) {
            console.log(`TextManagerState.loadTextStates - Panel states in page data: ${pageState.panelStates.length}`);
            
            // Verify we have the same number of panels as states or log the mismatch
            if (panels.length !== pageState.panelStates.length) {
                console.warn(`TextManagerState.loadTextStates - Panel count mismatch: ${panels.length} panels found vs ${pageState.panelStates.length} panel states`);
            }
        } else {
            console.warn(`TextManagerState.loadTextStates - No panel states found in page data`);
        }

        if (pageState.canvasTextElements) {
            console.log(`TextManagerState.loadTextStates - Canvas text elements in page data: ${pageState.canvasTextElements.length}`);
        } else {
            console.warn(`TextManagerState.loadTextStates - No canvas text elements found in page data`);
        }

        // Restore panel text elements
        if (pageState.panelStates && panels.length > 0) {
            const processablePanels = Math.min(panels.length, pageState.panelStates.length);
            console.log(`TextManagerState.loadTextStates: Restoring text for ${processablePanels} panels`);
            
            for (let index = 0; index < processablePanels; index++) {
                const panel = panels[index];
                
                // Verify panel exists
                if (!panel) {
                    console.warn(`TextManagerState.loadTextStates: Panel at index ${index} not found in DOM`);
                    continue;
                }
                
                const state = pageState.panelStates[index];
                
                if (state && state.textElements) { 
                    console.log(`TextManagerState.loadTextStates: Panel ${index} has ${state.textElements.length} text elements to restore`);
                    
                    state.textElements.forEach((textState, elementIndex) => {
                        console.log(`TextManagerState.loadTextStates: Restoring text element ${elementIndex} (ID: ${textState.id || 'no-id'}) for panel ${index}`);
                        
                        // Log essential properties to debug potential issues
                        console.log(`TextManagerState.loadTextStates: Text element properties: position=(${textState.style?.left || 'none'}, ${textState.style?.top || 'none'}), transform=${textState.style?.transform || 'none'}`);
                        
                        // Ensure the text state has all required properties
                        if (!textState.style) {
                            console.warn(`TextManagerState.loadTextStates: Missing style object for text element ${elementIndex} in panel ${index}`);
                            textState.style = {};
                        }
                        
                        const restoredElement = this.restoreTextBubble(textState, panel); // Use helper
                        console.log(`TextManagerState.loadTextStates: Text element ${elementIndex} restored successfully: ${!!restoredElement}`);
                    });
                } else {
                    console.warn(`TextManagerState.loadTextStates: Panel state or textElements missing at index ${index}.`);
                }
            } 
        }

        // Restore canvas text elements
        if (pageState.canvasTextElements && comicCanvas) {
            console.log(`TextManagerState.loadTextStates: Restoring ${pageState.canvasTextElements.length} canvas text elements`);
            
            pageState.canvasTextElements.forEach((textState, idx) => {
                console.log(`TextManagerState.loadTextStates: Restoring canvas text element ${idx} with id ${textState.id}`);
                console.log(`TextManagerState.loadTextStates: Canvas text element properties: position=(${textState.style?.left || 'none'}, ${textState.style?.top || 'none'}), transform=${textState.style?.transform || 'none'}`);
                
                // Ensure the text state has all required properties
                if (!textState.style) {
                    console.warn(`TextManagerState.loadTextStates: Missing style object for canvas text element ${idx}`);
                    textState.style = {};
                }
                
                // IMPORTANT: Canvas text elements must be directly attached to the canvas (not inside a panel)
                if (textState.style && !textState.style.position) {
                    console.log(`TextManagerState.loadTextStates: Adding missing 'position: absolute' to canvas text element ${idx}`);
                    textState.style.position = 'absolute';
                }
                
                const restoredElement = this.restoreTextBubble(textState, comicCanvas); // Use helper, pass canvas as parent
                console.log(`TextManagerState.loadTextStates: Canvas text element ${idx} restored successfully: ${!!restoredElement}`);
            });
        }

        // Debug: Log the final state after restoration
        console.log(`TextManagerState.loadTextStates - Final text bubbles on canvas: ${comicCanvas.querySelectorAll('.text-bubble').length}`);
        
        // Reset any internal state that might be tracking text elements
        this.currentTextBox = null;
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
        
        // IMPORTANT: Set position to absolute before setting any position properties
        textBubble.style.position = 'absolute';
        
        // Store original position data to help with anchoring
        if (textState.originalPosition) {
            textBubble.dataset.originalLeft = textState.originalPosition.left;
            textBubble.dataset.originalTop = textState.originalPosition.top;
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
        textElement.style.outline = 'none';
        textElement.style.wordWrap = 'break-word';
        
        // Apply special styles for export to prevent extra spacing
        if (document.body.classList.contains('exporting')) {
            // Get computed styles to preserve font properties exactly
            const computedStyle = window.getComputedStyle(textElement);
            
            // Fix layout issues
            textElement.style.paddingBottom = '0';
            textElement.style.marginBottom = '0';
            textElement.style.paddingTop = '2px';
            textElement.style.marginTop = '0';
            textElement.style.display = 'inline-block';
            textElement.style.overflow = 'hidden';
            
            // Text formatting preservation
            textElement.style.whiteSpace = 'pre-wrap';
            textElement.style.textRendering = 'geometricPrecision';
            
            // CRITICAL FONT PRESERVATION SETTINGS
            
            // Use the original line height if available in the textState
            if (textState.style && textState.style.lineHeight) {
                textElement.style.lineHeight = textState.style.lineHeight;
            } else {
                // Use computed line height if available
                const computedLineHeight = computedStyle.lineHeight;
                if (computedLineHeight && computedLineHeight !== 'normal') {
                    textElement.style.lineHeight = computedLineHeight;
                } else {
                    // Default preserved line height if none specified
                    textElement.style.lineHeight = 'normal';
                }
            }
            
            // IMPORTANT - Preserve exact font size
            if (textState.style && textState.style.fontSize) {
                textElement.style.fontSize = textState.style.fontSize;
            } else {
                textElement.style.fontSize = computedStyle.fontSize;
            }
            
            // Preserve exact font weight
            if (textState.style && textState.style.fontWeight) {
                textElement.style.fontWeight = textState.style.fontWeight;
            } else {
                textElement.style.fontWeight = computedStyle.fontWeight;
            }
            
            // Preserve font style
            if (textState.style && textState.style.fontStyle) {
                textElement.style.fontStyle = textState.style.fontStyle;
            } else {
                textElement.style.fontStyle = computedStyle.fontStyle;
            }
            
            // Apply transform to preserve exact size
            textElement.style.transformOrigin = 'top left';
            textElement.style.transform = 'scale(1)';
            textElement.style.maxHeight = 'none';
        }
        
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
            // Position and size - Apply these in a specific order for proper restoration
            
            // PRIORITY 1: Use originalPosition if available - this is the most accurate
            if (textState.originalPosition) {
                console.log(`TextManagerState.restoreTextBubble: Using originalPosition for ${textBubble.id} - left: ${textState.originalPosition.left}, top: ${textState.originalPosition.top}`);
                textBubble.style.left = textState.originalPosition.left;
                textBubble.style.top = textState.originalPosition.top;
                
                // Store this data again for potential reuse
                textBubble.dataset.originalLeft = textState.originalPosition.left;
                textBubble.dataset.originalTop = textState.originalPosition.top;
                
                // Apply exact dimensions if available
                if (textState.originalPosition.width) {
                    textBubble.style.width = textState.originalPosition.width;
                }
                if (textState.originalPosition.height) {
                    textBubble.style.height = textState.originalPosition.height;
                }
            } 
            // PRIORITY 2: Fall back to style values otherwise
            else {
                // Step 1: Apply position values first without any transform
                // Ensure we're using exact pixel values for reliable positioning
                if (textState.style.left) {
                    if (textState.style.left.endsWith('%')) {
                        // Convert percentage to pixels to avoid panel size changes affecting position
                        const percentage = parseFloat(textState.style.left);
                        const parentWidth = parentElement.clientWidth;
                        const pixelValue = (percentage / 100) * parentWidth;
                        textBubble.style.left = `${pixelValue}px`;
                    } else {
                        textBubble.style.left = textState.style.left;
                    }
                }
                
                if (textState.style.top) {
                    if (textState.style.top.endsWith('%')) {
                        // Convert percentage to pixels to avoid panel size changes affecting position
                        const percentage = parseFloat(textState.style.top);
                        const parentHeight = parentElement.clientHeight;
                        const pixelValue = (percentage / 100) * parentHeight;
                        textBubble.style.top = `${pixelValue}px`;
                    } else {
                        textBubble.style.top = textState.style.top;
                    }
                }
                
                // Step 2: Apply dimensions - preserving exact sizes
                if (textState.style.width) textBubble.style.width = textState.style.width;
                if (textState.style.height) textBubble.style.height = textState.style.height;
            }
            
            // Step 3: Apply transform and z-index last
            // Important: Keep ONLY the rotation part if we're using originalPosition 
            if (textState.style.transform) {
                // Extract just the rotation if there's a translate component
                if (textState.style.transform.includes('translate')) {
                    const rotationMatch = textState.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    if (rotationMatch) {
                        textBubble.style.transform = `rotate(${rotationMatch[1]}deg)`;
                    }
                } else {
                    // If no translate, use the transform as is
                    textBubble.style.transform = textState.style.transform;
                }
            }
            
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
                    // this.applyTextOutline(textElement, textState.style.outlineColor); // Dependency
                    if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.applyTextOutline) {
                        this.comicCreator.textManagerStyling.applyTextOutline(textElement, textState.style.outlineColor);
                    } else {
                        console.warn('TextManagerState: comicCreator.textManagerStyling.applyTextOutline not found.');
                    }
                } else {
                    // this.applyTextOutline(textElement, '#000000'); // Dependency
                     if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.applyTextOutline) {
                        this.comicCreator.textManagerStyling.applyTextOutline(textElement, '#000000');
                    } else {
                        console.warn('TextManagerState: comicCreator.textManagerStyling.applyTextOutline not found.');
                    }
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

        // Make draggable - Ensure drag functionality is applied after all styles
        console.log(`TextManagerState.restoreTextBubble: Making text bubble ${textBubble.id} draggable and resizable`);
        
        try {
            if (!this.comicCreator) {
                console.error("TextManagerState.restoreTextBubble: comicCreator reference is missing!");
            } else if (!this.comicCreator.dragAndDropManager) {
                console.error("TextManagerState.restoreTextBubble: dragAndDropManager is missing from comicCreator!");
            } else {
                this.comicCreator.dragAndDropManager.makeTextDraggable(textBubble, dragHandle);
                console.log(`TextManagerState.restoreTextBubble: Successfully made text bubble ${textBubble.id} draggable`);
            }
        } catch (error) {
            console.error(`TextManagerState.restoreTextBubble: Error making text bubble ${textBubble.id} draggable:`, error);
        }
        
        // Make resizable - Ensure resize functionality is applied after all styles
        try {
            if (this.comicCreator && this.comicCreator.dragAndDropManager) {
                this.comicCreator.dragAndDropManager.makeTextResizable(textBubble, resizeHandle);
                console.log(`TextManagerState.restoreTextBubble: Successfully made text bubble ${textBubble.id} resizable`);
            }
        } catch (error) {
            console.error(`TextManagerState.restoreTextBubble: Error making text bubble ${textBubble.id} resizable:`, error);
        } 

        // Setup delete functionality
        deleteButton.addEventListener('click', () => {
            textBubble.remove();
            
            // Hide the formatting popup if open
            const popup = document.getElementById('text-format-popup');
            if (popup) popup.remove();
            
            // Hide properties panel
            if (this.comicCreator) {
                this.comicCreator.deselectAll();
            }
            
            // Save state
            if (this.comicCreator) {
                this.comicCreator.saveCurrentPageState();
            }
        });
        
        // Setup formatting button
        formatButton.addEventListener('click', (e) => {
            // this.showTextFormatPopup(textBubble, e); // Dependency
            if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.showTextFormatPopup) {
                this.comicCreator.textManagerStyling.showTextFormatPopup(textBubble, e);
            } else {
                console.warn('TextManagerState: comicCreator.textManagerStyling.showTextFormatPopup not found.');
            }
        });

        // Setup text selection
        textBubble.addEventListener('click', (e) => {
            // Only select if not clicking on controls or text content
            if (e.target !== textElement && 
                !e.target.closest('.format-text-btn') && 
                !e.target.closest('.resize-handle') && 
                !e.target.closest('.delete-text-btn') &&
                !e.target.closest('.drag-handle')) {
                // this.selectTextBox(textBubble); // Dependency
                if (this.comicCreator && this.comicCreator.textManagerBubbleManipulation && this.comicCreator.textManagerBubbleManipulation.selectTextBox) {
                    this.comicCreator.textManagerBubbleManipulation.selectTextBox(textBubble);
                } else if (this.selectTextBox) { // Fallback for direct call if mixed-in
                    this.selectTextBox(textBubble);
                } else {
                     console.warn('TextManagerState: comicCreator.textManagerBubbleManipulation.selectTextBox not found.');
                }
                
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
                // this.selectTextBox(textBubble); // Dependency
                if (this.comicCreator && this.comicCreator.textManagerBubbleManipulation && this.comicCreator.textManagerBubbleManipulation.selectTextBox) {
                    this.comicCreator.textManagerBubbleManipulation.selectTextBox(textBubble);
                } else if (this.selectTextBox) { // Fallback for direct call if mixed-in
                    this.selectTextBox(textBubble);
                } else {
                     console.warn('TextManagerState: comicCreator.textManagerBubbleManipulation.selectTextBox not found.');
                }
                // Don't prevent default
            }
        });
        
        // Apply bubble tail if specified
        if (textState.tailPosition && textState.tailPosition !== 'none') {
            // this.updateBubbleTail(textBubble, textState.tailPosition); // Dependency
            if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.updateBubbleTail) {
                this.comicCreator.textManagerStyling.updateBubbleTail(textBubble, textState.tailPosition);
            } else {
                console.warn('TextManagerState: comicCreator.textManagerStyling.updateBubbleTail not found.');
            }
        }
        
        // If this is a grid-positioned element, reapply positioning to ensure 
        // proper transform and position calculation
        if (textState.positionGrid && textState.positionGrid !== 'custom') {
            // this.positionTextBox(textBubble, textState.positionGrid); // Dependency
            if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.positionTextBox) {
                this.comicCreator.textManagerStyling.positionTextBox(textBubble, textState.positionGrid);
            } else {
                console.warn('TextManagerState: comicCreator.textManagerStyling.positionTextBox not found.');
            }
        }
        
        // Apply final position fixing to ensure exact positioning
        if (this.comicCreator && this.comicCreator.textManagerUtils && this.comicCreator.textManagerUtils.finalizeTextBubblePosition) {
            this.comicCreator.textManagerUtils.finalizeTextBubblePosition(textBubble, textState);
        } else {
            console.warn('TextManagerState: comicCreator.textManagerUtils.finalizeTextBubblePosition not found. Final positioning may be inexact.');
            // The old fallback: // this.comicCreator.finalizeTextBubblePosition?.(textBubble, textState);
        }
        
        return textBubble;
    }

    // --- Event Handling ---
    // Note: deleteSelectedTextBox is in TextManagerBubbleManipulation.js
    // getShadowOffset is in TextManagerStyling.js (temporarily, will be in Utils)
    // resetTextPositionGrid is in TextManagerUtils.js (to be moved)
    // finalizeTextBubblePosition is in TextManagerUtils.js (to be moved)

} 