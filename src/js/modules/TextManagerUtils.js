import { globalRgbToHex } from './Utils.js'; // getTextWithLineBreaks might also be needed if any method here uses it.

export class TextManagerUtils {
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // May not be needed by all utils, but good for consistency or future needs
    }

    /**
     * Extracts the rotation angle of a text bubble from its CSS.
     * @param {HTMLElement} textBox - The text bubble element.
     * @returns {number} The rotation angle in degrees.
     */
    getRotationValue(textBox) {
        const transform = textBox.style.transform;
        const rotateMatch = transform.match(/rotate\\(([-\\d.]+)deg\\)/);
        return rotateMatch ? parseInt(rotateMatch[1]) : 0;
    }

    /**
     * Checks if text has an outline and returns its thickness.
     * @param {HTMLElement} textElement - The text content element.
     * @returns {number} 1 if outline exists, 0 otherwise.
     */
    getOutlineThickness(textElement) {
        // If the element has an outline, return 1, otherwise 0
        return textElement.getAttribute('data-has-outline') === 'true' ? 1 : 0;
    }

    /**
     * Retrieves the color of the text outline.
     * @param {HTMLElement} textElement - The text content element.
     * @returns {string} The outline color in hex format.
     */
    getOutlineColor(textElement) {
        // Try to get the color from data attribute first
        const dataColor = textElement.getAttribute('data-outline-color');
        if (dataColor) return dataColor;
        
        // If no data attribute, try to parse the text-shadow
        const shadow = textElement.style.textShadow || '';
        const colorMatch = shadow.match(/(#[a-fA-F0-9]{3,6}|rgba?\\([^)]+\\)|hsla?\\([^)]+\\)|[a-zA-Z]+)/);
        return colorMatch ? globalRgbToHex(colorMatch[0]) : '#000000'; // Use imported util
    }

    /**
     * Retrieves the color of the text shadow.
     * @param {HTMLElement} textElement - The text content element.
     * @returns {string} The shadow color in hex format.
     */
    getShadowColor(textElement) {
        // Try to get from data attribute first (new implementation)
        const dataColor = textElement.getAttribute('data-shadow-color');
        if (dataColor) return dataColor;
        
        // Fallback to parsing text-shadow for backwards compatibility
        const shadow = textElement.style.textShadow || '';
        // Look for drop shadow (not the 0px offset outline shadows)
        const dropShadowMatch = shadow.match(/(\d+px\s+\d+px\s+\d+px\s+(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]+))/);
        if (dropShadowMatch) {
            return globalRgbToHex(dropShadowMatch[2]);
        }
        return '#666666'; // Default shadow color
    }

    /**
     * Retrieves the X/Y offsets and blur radius of the text shadow.
     * @param {HTMLElement} textElement - The text content element.
     * @returns {object} An object with x, y, and blur properties.
     */
    getShadowOffset(textElement) {
        // Try to get from data attributes first (new implementation)
        const dataX = textElement.getAttribute('data-shadow-x');
        const dataY = textElement.getAttribute('data-shadow-y');
        const dataBlur = textElement.getAttribute('data-shadow-blur');
        
        if (dataX !== null && dataY !== null && dataBlur !== null) {
            return {
                x: parseInt(dataX) || 2,
                y: parseInt(dataY) || 2,
                blur: parseInt(dataBlur) || 2
            };
        }
        
        // Fallback to parsing text-shadow for backwards compatibility
        const shadow = textElement.style.textShadow || '';
        const defaultOffset = { x: 2, y: 2, blur: 2 };
        
        // Look for drop shadow pattern (not 0px offset outline shadows)
        const parts = shadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/);
        if (parts && parts.length >= 4) {
            return {
                x: parseInt(parts[1]) || defaultOffset.x,
                y: parseInt(parts[2]) || defaultOffset.y,
                blur: parseInt(parts[3]) || defaultOffset.blur
            };
        }
        return defaultOffset; // Return defaults if no match or incomplete
    }

    /**
     * Gets the background color of the text bubble.
     * @param {HTMLElement} textBox - The text bubble element.
     * @returns {string} The background color in hex format.
     */
    getBubbleBackgroundColor(textBox) {
        const bubbleColorVariable = textBox.style.getPropertyValue('--bubble-background-color');
        if (bubbleColorVariable && bubbleColorVariable.trim() !== '') {
            if (bubbleColorVariable.startsWith('#')) return bubbleColorVariable;
            return globalRgbToHex(bubbleColorVariable); // Use imported util
        }
        const computedBackgroundColor = window.getComputedStyle(textBox).backgroundColor;
        return globalRgbToHex(computedBackgroundColor); // Use imported util
    }

    /**
     * Updates the outline text. Currently marked as not needed.
     * @param {HTMLElement} textElement - The text content element.
     */
    updateOutlineText(textElement) {
        // This method is kept for backward compatibility
        // but it's no longer needed with the text-shadow approach
        return;
    }

    /**
     * Resets position grid value when a text bubble is manually moved.
     * This should be called by the DragAndDropManager after dragging ends.
     * @param {HTMLElement} textBox - The text bubble element that was moved.
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
        
        // Get current dimensions before transform modification
        const rect = textBox.getBoundingClientRect();
        const currentWidth = textBox.style.width || `${rect.width}px`;
        const currentHeight = textBox.style.height || `${rect.height}px`;
        
        // Get the parent element
        const parentElement = textBox.parentElement;
        if (!parentElement) return;
        
        const parentRect = parentElement.getBoundingClientRect();
        
        // Get visual position (before transform changes)
        const visualLeft = rect.left - parentRect.left;
        const visualTop = rect.top - parentRect.top;
        
        // If there's a transform with translate but no rotation, clear it
        if (textBox.style.transform && 
            textBox.style.transform.includes('translate') && 
            !textBox.style.transform.includes('rotate')) {
            // Set position based on current visual position
            textBox.style.left = `${visualLeft}px`;
            textBox.style.top = `${visualTop}px`;
            textBox.style.transform = '';
        }
        // If there's both translate and rotate, keep only the rotate part
        else if (textBox.style.transform && 
                textBox.style.transform.includes('translate') && 
                textBox.style.transform.includes('rotate')) {
            // Set position based on current visual position
            textBox.style.left = `${visualLeft}px`;
            textBox.style.top = `${visualTop}px`;
            
            const rotation = this.getRotationValue(textBox); // Call to internal method
            if (rotation !== 0) {
                textBox.style.transform = `rotate(${rotation}deg)`;
            } else {
                textBox.style.transform = '';
            }
        }
        
        // Restore dimensions to prevent stretching
        textBox.style.width = currentWidth;
        textBox.style.height = currentHeight;
    }

    /**
     * Finalizes text bubble positioning to ensure it matches the saved position exactly.
     * @param {HTMLElement} textBubble - The text bubble element to position.
     * @param {Object} textState - The saved state for the text bubble.
     */
    finalizeTextBubblePosition(textBubble, textState) {
        // Skip if there's no style data or essential position data in style
        if (!textState || !textState.style || textState.style.left == null || textState.style.top == null) {
            console.warn(`TextManagerUtils.finalizeTextBubblePosition: Missing textState.style or essential position data for ${textBubble.id}. Using originalPosition as fallback or skipping.`);
            // Fallback to originalPosition if style is insufficient but originalPosition exists
            if (textState && textState.originalPosition && textState.originalPosition.left != null && textState.originalPosition.top != null) {
                textBubble.style.left = textState.originalPosition.left;
                textBubble.style.top = textState.originalPosition.top;
                textBubble.style.width = textState.originalPosition.width;
                textBubble.style.height = textState.originalPosition.height;
                console.log(`TextManagerUtils.finalizeTextBubblePosition: Fallback to originalPosition for ${textBubble.id}`);
            } else {
                return; // Cannot proceed without sufficient position data
            }
        }
        
        const parentElement = textBubble.parentElement;
        if (!parentElement) return;
        
        textBubble.style.position = 'absolute';
        
        // Apply position and dimensions primarily from textState.style
        textBubble.style.left = textState.style.left;
        textBubble.style.top = textState.style.top;
        textBubble.style.width = textState.style.width;
        textBubble.style.height = textState.style.height;
        
        textBubble.style.margin = '0';
        textBubble.style.padding = textState.style.padding || '0';
        
        if (textState.style.transform) {
            const rotationMatch = textState.style.transform.match(/rotate\(([-\d.]+)deg\)/);
            if (rotationMatch) {
                textBubble.style.transform = `rotate(${rotationMatch[1]}deg)`;
            } else {
                textBubble.style.transform = ''; // Clear transform if no rotation found
            }
        } else {
            textBubble.style.transform = ''; // Clear transform if not in state
        }
        
        const textContent = textBubble.querySelector('.text-content');
        if (textContent) {
            textContent.style.margin = '0';
            textContent.style.padding = '0'; // Ensures no inherited padding on textContent itself
            textContent.style.lineHeight = textState.style.lineHeight || 'normal'; // This will likely be overridden by !important in TextManagerState during export
            textContent.style.display = 'inline-block';
            textContent.style.whiteSpace = 'pre-wrap';
            textContent.style.textRendering = 'geometricPrecision';
            // Ensure text content height matches bubble height from style, not originalPosition
            // textContent.style.height = textState.style.height; // Commented out as per plan
        }
        
        console.log(`TextManagerUtils.finalizeTextBubblePosition: Styled ${textBubble.id} to L:${textBubble.style.left}, T:${textBubble.style.top}, W:${textBubble.style.width}, H:${textBubble.style.height}`);
    }
} 