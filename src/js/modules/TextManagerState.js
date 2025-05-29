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
        // const mainCanvasWidth = canvas ? canvas.offsetWidth : 700; // No longer needed for scaling text properties
        // const mainCanvasHeight = canvas ? canvas.offsetHeight : 700; // No longer needed for scaling text properties
        
        // Save panel text elements
        const panels = Array.from(document.querySelectorAll('.comic-panel'));
        console.log(`TextManagerState.saveTextStates: Found ${panels.length} panels to check for text bubbles`);
        
        panels.forEach((panel, panelIndex) => {
            const panelTexts = [];
            const textBubbles = Array.from(panel.querySelectorAll('.text-bubble'));
            // console.log(`TextManagerState.saveTextStates: Panel ${panelIndex} has ${textBubbles.length} text bubbles`);
            
            const panelWidth = panel.offsetWidth; // Panel dimensions for relative panel text
            const panelHeight = panel.offsetHeight; // Panel dimensions for relative panel text
            console.log(`TextManagerState.saveTextStates: Panel ${panelIndex} (ID: ${panel.id || 'no-id'}) - panelWidth: ${panelWidth}, panelHeight: ${panelHeight}`);

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

                const computedStyle = window.getComputedStyle(textBubble);
                const textComputedStyle = window.getComputedStyle(textElement);
                
                // Revised logic for saving width/height to prevent drift
                let savedWidthPercent;
                const styleWidth = textBubble.style.width;
                if (styleWidth && styleWidth.endsWith('%')) {
                    savedWidthPercent = styleWidth;
                } else if (styleWidth && styleWidth.endsWith('px') && panelWidth > 0) {
                    savedWidthPercent = `${(parseFloat(styleWidth) / panelWidth) * 100}%`;
                } else if (panelWidth > 0) { // Fallback for 'auto', not set, or other units
                    const computedPxWidth = parseFloat(computedStyle.width);
                    if (!isNaN(computedPxWidth)) {
                        savedWidthPercent = `${(computedPxWidth / panelWidth) * 100}%`;
                    } else {
                        console.warn(`TextManagerState.saveTextStates: Panel Text - Could not parse computed width for ${textBubble.id}. Defaulting to 0%`);
                        savedWidthPercent = '0%';
                    }
                } else {
                    savedWidthPercent = '0%'; // Fallback if panelWidth is 0
                }

                let savedHeightPercent;
                const styleHeight = textBubble.style.height;
                if (styleHeight && styleHeight.endsWith('%')) {
                    savedHeightPercent = styleHeight;
                } else if (styleHeight && styleHeight.endsWith('px') && panelHeight > 0) {
                    savedHeightPercent = `${(parseFloat(styleHeight) / panelHeight) * 100}%`;
                } else if (panelHeight > 0) { // Fallback for 'auto', not set, or other units
                    const computedPxHeight = parseFloat(computedStyle.height);
                    if (!isNaN(computedPxHeight)) {
                        savedHeightPercent = `${(computedPxHeight / panelHeight) * 100}%`;
                    } else {
                        console.warn(`TextManagerState.saveTextStates: Panel Text - Could not parse computed height for ${textBubble.id}. Defaulting to 0%`);
                        savedHeightPercent = '0%';
                    }
                } else {
                    savedHeightPercent = '0%'; // Fallback if panelHeight is 0
                }
                
                const currentStyleLeft = textBubble.style.left; // Capture direct style.left
                const currentStyleTop = textBubble.style.top;   // Capture direct style.top
                
                let exactLeftForOriginalPos = currentStyleLeft;
                let exactTopForOriginalPos = currentStyleTop;
                
                if (!exactLeftForOriginalPos || !exactTopForOriginalPos || exactLeftForOriginalPos === 'auto' || exactTopForOriginalPos === 'auto') {
                    const bubbleRect = textBubble.getBoundingClientRect();
                    const panelRect = panel.getBoundingClientRect();
                    exactLeftForOriginalPos = `${bubbleRect.left - panelRect.left}px`;
                    exactTopForOriginalPos = `${bubbleRect.top - panelRect.top}px`;
                }
                
                // Convert to percentages if they are pixel values
                let savedLeft = currentStyleLeft;
                let savedTop = currentStyleTop;

                // Use panelWidth and panelHeight for calculating percentages for panel text positions
                if (currentStyleLeft && currentStyleLeft.endsWith('px') && panelWidth > 0) {
                    savedLeft = `${(parseFloat(currentStyleLeft) / panelWidth) * 100}%`;
                } else if (currentStyleLeft && currentStyleLeft.endsWith('%')) {
                    savedLeft = currentStyleLeft; // Already a percentage
                } else if (!currentStyleLeft || currentStyleLeft === 'auto') { // If not set, calculate from bounding rect
                    const bubbleRect = textBubble.getBoundingClientRect();
                    const panelRect = panel.getBoundingClientRect(); 
                    const relativeLeftPx = bubbleRect.left - panelRect.left;
                    if (panelWidth > 0) savedLeft = `${(relativeLeftPx / panelWidth) * 100}%`;
                    else savedLeft = '0%'; // Fallback
                }

                if (currentStyleTop && currentStyleTop.endsWith('px') && panelHeight > 0) {
                    savedTop = `${(parseFloat(currentStyleTop) / panelHeight) * 100}%`;
                } else if (currentStyleTop && currentStyleTop.endsWith('%')) {
                    savedTop = currentStyleTop; // Already a percentage
                } else if (!currentStyleTop || currentStyleTop === 'auto') { // If not set, calculate from bounding rect
                    const bubbleRect = textBubble.getBoundingClientRect();
                    const panelRect = panel.getBoundingClientRect(); 
                    const relativeTopPx = bubbleRect.top - panelRect.top;
                    if (panelHeight > 0) savedTop = `${(relativeTopPx / panelHeight) * 100}%`;
                    else savedTop = '0%'; // Fallback
                }
                
                // originalPosition.left/top for panel text should also be relative to panel if they are in pixels
                // exactLeftForOriginalPos and exactTopForOriginalPos are calculated relative to panel (bubbleRect.left - panelRect.left)
                // So, if they are used, they should be converted to % relative to panel as well for consistency if style is missing.
                // For now, primary focus is on `style.left/top` being correct for panel text.
                let originalPosLeftPercent = savedLeft; // Default to style's saved percent
                let originalPosTopPercent = savedTop;   // Default to style's saved percent

                if (exactLeftForOriginalPos.endsWith('px') && panelWidth > 0) {
                    originalPosLeftPercent = `${(parseFloat(exactLeftForOriginalPos) / panelWidth) * 100}%`;
                }
                if (exactTopForOriginalPos.endsWith('px') && panelHeight > 0) {
                    originalPosTopPercent = `${(parseFloat(exactTopForOriginalPos) / panelHeight) * 100}%`;
                }

                console.log(`TextManagerState.saveTextStates: Panel Text Bubble ${textBubble.id} - Style L/T: ${textBubble.style.left}/${textBubble.style.top}, Style W/H: ${textBubble.style.width}/${textBubble.style.height} | Saved L/T: ${savedLeft}/${savedTop}, Saved W/H: ${savedWidthPercent}/${savedHeightPercent} | exactL/T: ${exactLeftForOriginalPos}/${exactTopForOriginalPos} | origPosL/T: ${originalPosLeftPercent}/${originalPosTopPercent}`);
                panelTexts.push({
                    id: textBubble.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                    previousBubbleType: textBubble.dataset.previousBubbleType || '',
                    tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                    tailSettings: textBubble.dataset.tailSettings || '',
                    positionGrid: textBubble.dataset.positionGrid || 'custom',
                    content: textElement.innerHTML,
                    originalPosition: {
                        left: originalPosLeftPercent, // Store as percentage relative to panel
                        top: originalPosTopPercent,   // Store as percentage relative to panel
                        width: savedWidthPercent,  // Store percentage width relative to panel
                        height: savedHeightPercent // Store percentage height relative to panel
                    },
                    style: {
                        // Position and size directly from style or finalized values
                        left: savedLeft, // Ensure this is a percentage relative to panel
                        top: savedTop,   // Ensure this is a percentage relative to panel
                        width: savedWidthPercent,  // Store percentage width relative to panel
                        height: savedHeightPercent, // Store percentage height relative to panel
                        transform: textBubble.style.transform || '',
                        
                        // Bubble properties from computed style
                        backgroundColor: computedStyle.backgroundColor,
                        bubbleBackgroundColor: textBubble.style.getPropertyValue('--bubble-background-color') || '',
                        bubbleOpacity: textBubble.style.getPropertyValue('--bubble-opacity') || '1',
                        padding: computedStyle.padding,
                        paddingVertical: textBubble.dataset.paddingVertical,
                        paddingHorizontal: textBubble.dataset.paddingHorizontal,
                        bubblePadding: textBubble.dataset.bubblePadding,
                        zIndex: computedStyle.zIndex,
                        
                        // Text properties from inline style (to preserve user-set values)
                        color: textElement.style.color || textComputedStyle.color,
                        fontSize: textElement.style.fontSize || textComputedStyle.fontSize,
                        fontFamily: textElement.style.fontFamily || textComputedStyle.fontFamily,
                        fontWeight: textElement.style.fontWeight || textComputedStyle.fontWeight,
                        fontStyle: textElement.style.fontStyle || textComputedStyle.fontStyle,
                        textDecoration: textElement.style.textDecoration || textComputedStyle.textDecoration,
                        lineHeight: textElement.style.lineHeight || textComputedStyle.lineHeight,
                        textAlign: textElement.style.textAlign || textComputedStyle.textAlign,
                        textTransform: textElement.style.textTransform || textComputedStyle.textTransform,
                        textShadow: textElement.style.textShadow || textComputedStyle.textShadow,
                        hasOutline: textElement.getAttribute('data-has-outline') === 'true',
                        outlineColor: textElement.getAttribute('data-outline-color') || '#000000'
                    }
                });
            });
            panelTextStates.push(panelTexts);
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
                    const exactLeftPx = bubbleRect.left - canvasRect.left;
                    const exactTopPx = bubbleRect.top - canvasRect.top;

                    let savedCanvasLeft = textBubble.style.left;
                    let savedCanvasTop = textBubble.style.top;

                    // Convert style.left to percentage if it's pixels, or calculate if not set
                    if (textBubble.style.left && textBubble.style.left.endsWith('px') && canvas.offsetWidth > 0) {
                        savedCanvasLeft = `${(parseFloat(textBubble.style.left) / canvas.offsetWidth) * 100}%`;
                    } else if (textBubble.style.left && textBubble.style.left.endsWith('%')) {
                        savedCanvasLeft = textBubble.style.left; // Already a percentage
                    } else if ((!textBubble.style.left || textBubble.style.left === 'auto') && canvas.offsetWidth > 0) {
                        savedCanvasLeft = `${(exactLeftPx / canvas.offsetWidth) * 100}%`;
                    } else if (canvas.offsetWidth === 0) {
                        savedCanvasLeft = '0%'; // Fallback for zero width canvas
                    }
                    // If already a percentage, keep it as is (implicitly handled by not entering above conditions)

                    // Convert style.top to percentage if it's pixels, or calculate if not set
                    if (textBubble.style.top && textBubble.style.top.endsWith('px') && canvas.offsetHeight > 0) {
                        savedCanvasTop = `${(parseFloat(textBubble.style.top) / canvas.offsetHeight) * 100}%`;
                    } else if (textBubble.style.top && textBubble.style.top.endsWith('%')) {
                        savedCanvasTop = textBubble.style.top; // Already a percentage
                    } else if ((!textBubble.style.top || textBubble.style.top === 'auto') && canvas.offsetHeight > 0) {
                        savedCanvasTop = `${(exactTopPx / canvas.offsetHeight) * 100}%`;
                    } else if (canvas.offsetHeight === 0) {
                        savedCanvasTop = '0%'; // Fallback for zero height canvas
                    }
                    // If already a percentage, keep it as is

                    // Revised logic for saving canvas width/height to prevent drift
                    let savedCanvasWidthPercent;
                    const styleCanvasWidth = textBubble.style.width;
                    const canvasOffsetWidth = canvas.offsetWidth; // Cache for multiple uses

                    if (styleCanvasWidth && styleCanvasWidth.endsWith('%')) {
                        savedCanvasWidthPercent = styleCanvasWidth;
                    } else if (styleCanvasWidth && styleCanvasWidth.endsWith('px') && canvasOffsetWidth > 0) {
                        savedCanvasWidthPercent = `${(parseFloat(styleCanvasWidth) / canvasOffsetWidth) * 100}%`;
                    } else if (canvasOffsetWidth > 0) { // Fallback for 'auto', not set, or other units
                        const computedPxWidth = parseFloat(window.getComputedStyle(textBubble).width);
                         if (!isNaN(computedPxWidth)) {
                            savedCanvasWidthPercent = `${(computedPxWidth / canvasOffsetWidth) * 100}%`;
                        } else {
                            console.warn(`TextManagerState.saveTextStates: Canvas Text - Could not parse computed width for ${textBubble.id}. Defaulting to 0%`);
                            savedCanvasWidthPercent = '0%';
                        }
                    } else {
                        savedCanvasWidthPercent = '0%'; // Fallback if canvas.offsetWidth is 0
                    }

                    let savedCanvasHeightPercent;
                    const styleCanvasHeight = textBubble.style.height;
                    const canvasOffsetHeight = canvas.offsetHeight; // Cache for multiple uses

                    if (styleCanvasHeight && styleCanvasHeight.endsWith('%')) {
                        savedCanvasHeightPercent = styleCanvasHeight;
                    } else if (styleCanvasHeight && styleCanvasHeight.endsWith('px') && canvasOffsetHeight > 0) {
                        savedCanvasHeightPercent = `${(parseFloat(styleCanvasHeight) / canvasOffsetHeight) * 100}%`;
                    } else if (canvasOffsetHeight > 0) { // Fallback for 'auto', not set, or other units
                        const computedPxHeight = parseFloat(window.getComputedStyle(textBubble).height);
                        if (!isNaN(computedPxHeight)) {
                            savedCanvasHeightPercent = `${(computedPxHeight / canvasOffsetHeight) * 100}%`;
                        } else {
                            console.warn(`TextManagerState.saveTextStates: Canvas Text - Could not parse computed height for ${textBubble.id}. Defaulting to 0%`);
                            savedCanvasHeightPercent = '0%';
                        }
                    } else {
                        savedCanvasHeightPercent = '0%'; // Fallback if canvas.offsetHeight is 0
                    }
                    
                    console.log(`TextManagerState.saveTextStates: Canvas Text Bubble ${textBubble.id} - Canvas W/H for calc: ${canvasOffsetWidth}/${canvasOffsetHeight} | Style L/T: ${textBubble.style.left}/${textBubble.style.top}, Style W/H: ${textBubble.style.width}/${textBubble.style.height} | Saved L/T: ${savedCanvasLeft}/${savedCanvasTop}, Saved W/H: ${savedCanvasWidthPercent}/${savedCanvasHeightPercent} | exactL/T (rel to canvas): ${exactLeftPx}px/${exactTopPx}px`);
                    canvasTextElements.push({
                        id: textBubble.id || `canvas_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                        previousBubbleType: textBubble.dataset.previousBubbleType || '',
                        tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                        tailSettings: textBubble.dataset.tailSettings || '',
                        positionGrid: textBubble.dataset.positionGrid || 'custom', // Store grid position
                        content: textElement.innerHTML,
                        originalPosition: {
                            left: savedCanvasLeft,
                            top: savedCanvasTop, 
                            width: savedCanvasWidthPercent,  // Store percentage width
                            height: savedCanvasHeightPercent // Store percentage height
                        },
                        style: {
                            left: savedCanvasLeft, // Ensure this is a percentage
                            top: savedCanvasTop,   // Ensure this is a percentage
                            width: savedCanvasWidthPercent,  // Store percentage width
                            height: savedCanvasHeightPercent, // Store percentage height
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
     * @param {HTMLElement} parentContainer - The element to append the bubble to (panel or canvas).
     */
    restoreTextBubble(textState, parentContainer) {
        console.log(`[TextManagerState.restoreTextBubble] Restoring text bubble with ID: ${textState.id || 'new_id'}, to parent:`, parentContainer);
        if (!textState) {
            console.warn("[TextManagerState.restoreTextBubble] textState is undefined. Cannot restore bubble.");
            return null;
        }

        const comicCanvas = document.querySelector('#comic-canvas'); // Used for targetWidth/Height context for canvas text
        const isPanelText = parentContainer.classList.contains('comic-panel');
        
        // Determine target dimensions for percentage calculations
        // For panel text, it's the panel itself. For canvas text, it's the main canvas.
        let targetWidth, targetHeight;
        if (isPanelText) {
            targetWidth = parentContainer.offsetWidth;
            targetHeight = parentContainer.offsetHeight;
        } else if (comicCanvas) { // For canvas text, parentContainer IS the comicCanvas
            targetWidth = comicCanvas.offsetWidth;
            targetHeight = comicCanvas.offsetHeight;
        } else {
            console.warn(`[TextManagerState.restoreTextBubble ID: ${textState.id}] Could not determine target dimensions. Defaulting to 700x700`);
            targetWidth = 700;
            targetHeight = 700;
        }
        
        // Create bubble element
        const textBubble = document.createElement('div');
        textBubble.id = textState.id;
        textBubble.className = 'text-bubble'; // Base class
        if (textState.bubbleType) {
            textBubble.classList.add(textState.bubbleType);
            textBubble.dataset.bubbleType = textState.bubbleType;
        }
        if (textState.previousBubbleType) {
            textBubble.dataset.previousBubbleType = textState.previousBubbleType;
        }
        if (textState.tailPosition) {
            textBubble.dataset.tailPosition = textState.tailPosition;
            const tailClassPrefix = textState.bubbleType === 'thought-bubble' ? 'thought-tail-' : 'speech-tail-';
            if (textState.tailPosition !== 'none' && textState.tailPosition !== '') {
                 textBubble.classList.add(tailClassPrefix + textState.tailPosition);
            }
        }
        if (textState.tailSettings) {
            textBubble.dataset.tailSettings = textState.tailSettings;
        }
        if (textState.positionGrid) {
            textBubble.dataset.positionGrid = textState.positionGrid;
        }

        textBubble.style.position = 'absolute';

        // Apply Position and Dimensions (expected to be percentages from saveTextStates)
        if (textState.style) {
            if (textState.style.left) textBubble.style.left = textState.style.left;
            if (textState.style.top) textBubble.style.top = textState.style.top;
            if (textState.style.width) textBubble.style.width = textState.style.width;
            if (textState.style.height) textBubble.style.height = textState.style.height;
            
            console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] Applied direct styles - Left: ${textBubble.style.left}, Top: ${textBubble.style.top}, Width: ${textBubble.style.width}, Height: ${textBubble.style.height}`);

            if (textState.style.transform) {
                textBubble.style.transform = textState.style.transform;
            }
            if (textState.style.zIndex) {
                textBubble.style.zIndex = textState.style.zIndex;
            }
        }
        
        const textContentElement = document.createElement('div');
        textContentElement.className = 'text-content';
        textContentElement.contentEditable = true;
        textContentElement.innerHTML = textState.content || 'Click to edit text';
        textContentElement.style.outline = 'none';
        textContentElement.style.wordWrap = 'break-word';
        
        // Apply general text styles (color, family, weight, etc.)
        if (textState.style) {
            Object.keys(textState.style).forEach(key => {
                if (['color', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'textTransform', 'textShadow'].includes(key)) {
                    if (textState.style[key]) {
                        textContentElement.style[key] = textState.style[key];
                    }
                }
            });

            // Scaled Font Size (ALWAYS) -> Apply directly now
            if (textState.style.fontSize) {
                textContentElement.style.fontSize = textState.style.fontSize; // Apply directly
                console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] General Font size: applied directly=${textState.style.fontSize}`);
            }

            // Scaled Line Height (if pixel value) -> Apply directly now
            if (textState.style.lineHeight) {
                const lh = textState.style.lineHeight;
                textContentElement.style.lineHeight = lh; // Apply directly
                console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] General Line height: applied directly=${lh}`);
            }
        }

        // Apply special styles for export to prevent extra spacing
        if (document.body.classList.contains('exporting')) {
            const computedStyle = window.getComputedStyle(textContentElement); // Get computed after initial styles
            
            textContentElement.style.paddingBottom = '0';
            textContentElement.style.marginBottom = '0';
            textContentElement.style.paddingTop = '0px';
            textContentElement.style.marginTop = '0';
            textContentElement.style.display = 'inline-block';
            textContentElement.style.overflow = 'hidden';
            textContentElement.style.whiteSpace = 'pre-wrap';
            textContentElement.style.textRendering = 'geometricPrecision';
            
            // Line Height for EXPORT - CRITICAL: Use scaled value if original was px, or apply as is. -> Apply directly now
            if (textState.style && textState.style.lineHeight) {
                const lh = textState.style.lineHeight;
                textContentElement.style.setProperty('line-height', lh, 'important');
                console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] EXPORT Line height (from textState): applied directly=${lh} !important`);
            }
            
            // Font Size for EXPORT - CRITICAL: Apply scaled font size -> Apply directly now
            if (textState.style && textState.style.fontSize) {
                textContentElement.style.setProperty('font-size', textState.style.fontSize, 'important');
                console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] EXPORT Font size (from textState): applied directly=${textState.style.fontSize} !important`);
            } 
            
            if (textState.style && textState.style.fontWeight) {
                textContentElement.style.fontWeight = textState.style.fontWeight;
            }
            
            if (textState.style && textState.style.fontStyle) {
                textContentElement.style.fontStyle = textState.style.fontStyle;
            }
            
            textContentElement.style.transformOrigin = 'top left';
            textContentElement.style.transform = 'scale(1)'; // Usually for export, direct scaling might not be needed if font-size is scaled
            textContentElement.style.maxHeight = 'none';
        }
        
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
        
        // Apply other styles from textState.style (bubble specific, not text content)
        if (textState.style) {
            // This section seems to be from the user's diff for PRIORITY 1 / PRIORITY 2.
            // Given textState.style.left/top/width/height are now primary and percentages,
            // the originalPosition fallback for these specific properties might be less critical
            // if the style properties are reliably saved as percentages.
            // For now, I'm keeping the structure from the user's diff which has this.
            if (textState.originalPosition && textState.originalPosition.left != null && textState.originalPosition.top != null) {
                 // If originalPosition.left/top are pixel strings and style.left/top are percentages,
                 // we should prioritize style for percentages.
                 // However, user's save logic put percentages into style.left/top and pixel into originalPosition.left/top.
                 // Then it uses style.left/top in originalPosition as well for some reason (savedLeft/savedTop).
                 // This part is a bit tangled from the diff.
                 // Sticking to: textState.style.left (as %) should be the source of truth for left.
                 // The scaling logic with parseFloat(sLeft) * scaleX that was here previously is removed
                 // as direct percentage assignment is preferred.
                 console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] Using textState.style for L/T/W/H (expected percentages)`);
                 // Already applied textBubble.style.left etc. above if (textState.style.left)
            } 
            // No explicit 'else' needed as style properties were already applied if they exist.

            // Bubble visual properties
            if (textState.style.backgroundColor) textBubble.style.backgroundColor = textState.style.backgroundColor;
            if (textState.style.bubbleBackgroundColor) {
                textBubble.style.setProperty('--bubble-background-color', textState.style.bubbleBackgroundColor);
            }
            if (textState.style.bubbleOpacity) {
                textBubble.style.setProperty('--bubble-opacity', textState.style.bubbleOpacity);
            }
            if (textState.style.padding) {
                const paddingValue = textState.style.padding;
                textBubble.style.padding = paddingValue; // Apply directly
                console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] Applied bubble padding directly: original='${paddingValue}', applied='${textBubble.style.padding}'`);
            }
            
            if (textState.style.paddingVertical) textBubble.dataset.paddingVertical = textState.style.paddingVertical;
            if (textState.style.paddingHorizontal) textBubble.dataset.paddingHorizontal = textState.style.paddingHorizontal;
            if (textState.style.bubblePadding) textBubble.dataset.bubblePadding = textState.style.bubblePadding;
            
            // Outline (data attributes are fine, actual style applied by textManagerStyling)
            if (textState.style.hasOutline) {
                textContentElement.setAttribute('data-has-outline', 'true');
                if (textState.style.outlineColor) {
                    textContentElement.setAttribute('data-outline-color', textState.style.outlineColor);
                }
                // Outline thickness scaling would happen in applyTextOutline if it's a pixel value there.
                // For now, just set attribute. TextManagerStyling.applyTextOutline handles the visual.
                if (this.comicCreator && this.comicCreator.textManagerStyling && this.comicCreator.textManagerStyling.applyTextOutline) {
                     this.comicCreator.textManagerStyling.applyTextOutline(textContentElement, textState.style.outlineColor || '#000000');
                }
            }
        }

        textBubble.appendChild(textContentElement);
        textBubble.appendChild(dragHandle);
        textBubble.appendChild(resizeHandle);
        textBubble.appendChild(formatButton);
        textBubble.appendChild(deleteButton);
        parentContainer.appendChild(textBubble);

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
            if (e.target !== textContentElement && 
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
        textContentElement.addEventListener('click', (e) => {
            // Calculate if click is near edge
            const rect = textContentElement.getBoundingClientRect();
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
            this.comicCreator.textManagerUtils.finalizeTextBubblePosition(textBubble, textState); // REMOVE K_avg_scale from call
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