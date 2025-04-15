// Utility functions for the Comic Creator

/**
 * Converts an RGB or RGBA color string to a Hex color string.
 * Handles rgb(r, g, b) and rgba(r, g, b, a) formats.
 * Returns #000000 if the input is invalid.
 * @param {string} rgb - The RGB or RGBA color string.
 * @returns {string} The Hex color string (#rrggbb).
 */
export function globalRgbToHex(rgb) {
    // Convert rgb(r, g, b) to #rrggbb
    if (!rgb) return '#000000';
    
    // If it's already hex, return it
    if (rgb.startsWith('#')) return rgb;
    
    // Match rgb or rgba format
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return '#000000';
    
    // Parse R, G, B values, convert to hex, and pad with leading zero if needed
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
}

/**
 * Helper function to get text content from an element while preserving line breaks 
 * created by <br> tags or block elements like <div> or <p>.
 * @param {HTMLElement} element - The DOM element to extract text from.
 * @returns {string} The text content with newlines preserved.
 */
export function getTextWithLineBreaks(element) {
    if (!element) return '';

    // Get innerHTML to process tags
    let processedHtml = element.innerHTML;

    // 1. Replace <br> tags (case-insensitive, with or without self-closing slash) with newline characters
    processedHtml = processedHtml.replace(/<br\s*\/?>/gi, '\n');

    // 2. Replace closing block tags (div, p) with newline characters (case-insensitive)
    processedHtml = processedHtml.replace(/<\/(div|p)>/gi, '\n');

    // 3. Create a temporary div to strip *all* remaining HTML tags using textContent/innerText
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedHtml;

    // 4. Extract clean text. textContent or innerText should preserve the newlines.
    let text = tempDiv.textContent || tempDiv.innerText || '';

    // 5. Trim potential leading/trailing newlines/whitespace introduced by the process
    return text.trim();
} 