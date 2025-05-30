# Solution Guide: Text Properties, Positioning, and Export

This document outlines the key code components and logic that ensure text bubbles, their content (including line spacing and rotation), and overall properties are correctly handled in the editor and accurately reflected in the exported PDF.

## 1. Text State Management (`src/js/modules/TextManagerState.js`)

This class is central to saving and restoring all aspects of text bubbles.

### 1.1. Saving Text State (`saveTextStates` method - Partial Snippet)

When saving, properties like position (`left`, `top`), dimensions (`width`, `height`), rotation (`transform`), and all text styling (font, color, line height, etc.) are captured. Positions and dimensions are converted to percentages relative to their parent (panel or canvas) to ensure responsiveness.

```javascript
// Relevant snippet from src/js/modules/TextManagerState.js - saveTextStates

// ... (inside loop for each text bubble)
const panelWidth = panel.offsetWidth;
const panelHeight = panel.offsetHeight;

// ... (logic to calculate savedLeft, savedTop, savedWidthPercent, savedHeightPercent as percentages) ...

panelTexts.push({
    id: textBubble.id,
    // ... other properties like bubbleType, tailPosition ...
    content: textElement.innerHTML,
    originalPosition: { // Fallback/reference, also stored as percentages
        left: originalPosLeftPercent,
        top: originalPosTopPercent,
        width: savedWidthPercent,
        height: savedHeightPercent
    },
    style: {
        // Position and size (percentages relative to parent)
        left: savedLeft,
        top: savedTop,
        width: savedWidthPercent,
        height: savedHeightPercent,
        transform: textBubble.style.transform || '', // Captures rotation

        // Bubble visual properties
        backgroundColor: computedStyle.backgroundColor,
        // ... other bubble styles ...
        padding: computedStyle.padding, // Important for consistent appearance

        // Text content properties (from inline style or computed)
        color: textElement.style.color || textComputedStyle.color,
        fontSize: textElement.style.fontSize || textComputedStyle.fontSize,
        fontFamily: textElement.style.fontFamily || textComputedStyle.fontFamily,
        fontWeight: textElement.style.fontWeight || textComputedStyle.fontWeight,
        fontStyle: textElement.style.fontStyle || textComputedStyle.fontStyle,
        lineHeight: textElement.style.lineHeight || textComputedStyle.lineHeight, // User-set line height
        textAlign: textElement.style.textAlign || textComputedStyle.textAlign,
        // ... other text styles ...
        hasOutline: textElement.getAttribute('data-has-outline') === 'true',
        outlineColor: textElement.getAttribute('data-outline-color') || '#000000'
    }
});
// ...
```

### 1.2. Restoring Text State (`restoreTextBubble` method - Key Parts)

When restoring (both in the editor and for export), this method applies the saved state. Crucially, for export (`document.body.classList.contains('exporting')`), it performs specific calculations and style applications:

-   **Line Height for Export**:
    -   If `textState.style.lineHeight` is a unitless number (e.g., "1.7"), it's multiplied by the `fontSize` (in pixels) to get a pixel value for `line-height`.
    -   This calculated or directly provided (if already in `px` or `em`) `line-height` is applied with `!important` to ensure it overrides CSS.
    -   A fallback of `1.2 !important` is applied if no specific line-height is found in `textState`.
-   **Font Size for Export**: Applied directly from `textState.style.fontSize` with `!important`.
-   **Padding**: During export, specific padding overrides (`paddingBottom = '0'`, `paddingTop = '0px'`, etc.) were initially tried but later refined to rely on CSS `padding: inherit !important;` and `margin: 0 !important;` combined with JS setting line-height correctly for the visual alignment. The most direct control over spacing now comes from the `line-height` and `vertical-align: top` in CSS.
-   **Other Styles**: Rotation (`transform`), colors, font family, etc., are applied directly from `textState`.

```javascript
// Relevant snippet from src/js/modules/TextManagerState.js - restoreTextBubble

// ... (element creation and general style application) ...

// Apply special styles for export to prevent extra spacing
if (document.body.classList.contains('exporting')) {
    // ... (other export-specific preparations like padding and display) ...
    textContentElement.style.textRendering = 'geometricPrecision';

    // Line Height for EXPORT - CRITICAL
    if (textState.style && textState.style.lineHeight && textState.style.lineHeight !== 'normal' && textState.style.lineHeight !== '') {
        let lhToApply = textState.style.lineHeight;
        const currentFontSize = textState.style.fontSize;

        // If lineHeight is unitless and fontSize is in px, calculate pixel value for line-height
        if (currentFontSize && currentFontSize.endsWith('px') &&
            !isNaN(parseFloat(lhToApply)) &&
            String(lhToApply).match(/^[0-9\\.]+$/)) { // Regex to match numbers (unitless)

            const fontSizePx = parseFloat(currentFontSize);
            const unitlessLineHeight = parseFloat(lhToApply);
            const calculatedLhPx = fontSizePx * unitlessLineHeight + 'px';
            lhToApply = calculatedLhPx;
        }
        textContentElement.style.setProperty('line-height', lhToApply, 'important');
        console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] EXPORT Line height (from textState): original was ${textState.style.lineHeight}, applied as '${lhToApply}' with !important`);
    } else {
        // Fallback if no specific line-height is set in textState for export.
        textContentElement.style.setProperty('line-height', '1.2', 'important'); // Fallback, though CSS also provides this
        console.log(`[TextManagerState.restoreTextBubble ID: ${textState.id}] EXPORT Line height: textState.style.lineHeight was not specific, applied '1.2' !important as fallback.`);
    }

    // Font Size for EXPORT - CRITICAL
    if (textState.style && textState.style.fontSize) {
        textContentElement.style.setProperty('font-size', textState.style.fontSize, 'important');
    }
    // ... (other font styles and transform handling for export)
}
// ... (rest of the function)
```

## 2. CSS Styling (`src/styles/main.css`)

### 2.1. General Text Content Styling (Editor View)

The `.text-content` class defines base styles. Padding was adjusted here to help with the text positioning issue initially, but the final fix relied more on `line-height` and `vertical-align` during export.

```css
/* src/styles/main.css */
/* ... other styles ... */

.text-content {
    /* ... other properties ... */
    /* padding: 0.5px 2px 4.5px 2px; */ /* This was an intermediate step, final padding for export handled by .exporting rules */
    line-height: 1.2; /* Default line height in editor */
    /* ... other properties ... */
}
```

### 2.2. Export-Specific Text Styling (`.exporting .text-bubble .text-content`)

This is a critical ruleset that activates when the `exporting` class is added to the `body`. It aims to make the text render as closely as possible to the editor view.

-   **Line Height**: The hardcoded `line-height: 1.2 !important;` was **REMOVED** (commented out) here. This was the key fix to allow the JavaScript-applied `line-height` (from `textState`) to take precedence during export.
-   **Vertical Alignment**: `vertical-align: top !important;` was crucial for fixing the downward text shift.
-   **Padding & Margin**: `padding: inherit !important;` and `margin: 0 !important;` along with `display: inline-block !important;` and `overflow: hidden !important;` help control the text box's layout and prevent unexpected spacing.
-   **Transforms & Other Overrides**: Many properties are set with `!important` to ensure they override any editor-specific styles that might interfere with a clean export (e.g., `transform: none !important;`, `zoom: normal !important;`).

```css
/* src/styles/main.css */
/* ... */

/* Fix text content positioning in exported PDFs */
.exporting .text-bubble .text-content {
    /* CRITICAL: DO NOT modify or adjust anything during export - EXACT MATCH to web preview */
    /* NO SCALING OR TRANSFORMATIONS - preserve exactly as in preview */
    transform: none !important;
    transform-origin: top left !important;
    zoom: normal !important;
    translate: none !important;
    scale: 1 !important;

    /* Prevent browser font adjustments */
    -webkit-text-size-adjust: none !important;
    text-size-adjust: none !important;

    /* Prevent the PDF generator from adjusting text */
    letter-spacing: normal !important;
    word-spacing: normal !important;
    text-rendering: optimizeLegibility !important;
    /* Preserve original styling */

    /* EXACT preservation of line spacing - force exact match to preview */
    /* line-height: 1.2 !important; */ /* REMOVED - Will be set by JS from textState or inherit if not explicitly set by JS */
    white-space: pre-wrap !important;
    vertical-align: top !important; /* Crucial for fixing downward text shift */
    word-break: normal !important;
    /* word-spacing: normal !important; */ /* Already defined above */

    /* Prevent any CSS text adjustments that browsers might apply */
    -webkit-font-feature-settings: normal !important;
    font-feature-settings: normal !important;
    text-indent: 0 !important;
    text-align-last: auto !important;

    /* Preserve EXACT padding from the preview */
    padding: inherit !important; /* Use the computed value from the preview, or 0 if puppeteer injection zeros it out */
    margin: 0 !important;

    /* Layout control */
    display: inline-block !important; /* Important for consistent layout */
    height: auto !important;
    min-height: 0 !important; /* Avoid minimums from interfering */
    overflow: hidden !important; /* Prevents unexpected scrollbars or content spill */
    box-sizing: border-box !important;

    /* Force hardware acceleration for better text rendering */
    will-change: contents !important; /* May help with rendering consistency */
    -webkit-font-smoothing: subpixel-antialiased !important; /* Or antialiased, depending on desired look */
}

/* Ensure text bubble border is solid black for export */
.exporting .text-bubble {
    border: 2px solid #000000 !important; /* Changed from rgba(0,0,0,0.7) */
    opacity: 1 !important; /* Ensure full opacity */
}

```

## 3. Puppeteer Export Styling (`src/server/puppeteer-export.js`)

Puppeteer injects a set of minimal, forceful CSS overrides using `page.addStyleTag()` to ensure a clean and predictable rendering environment for the PDF screenshot.

-   The `line-height` property was **removed** from the `.text-bubble .text-content` rule here to prevent it from interfering with the JavaScript-applied or `main.css` styles.
-   `padding: 0 !important;` and `margin: 0 !important;` are set here for `.text-bubble .text-content` to provide a baseline, which `main.css`'s `padding: inherit !important;` then adjusts based on the computed style from the live editor (if available and correctly inherited).
-   `vertical-align: top !important;` is also maintained here as a strong default.

```javascript
// Relevant snippet from src/server/puppeteer-export.js - inside capturePageAsImage

await page.addStyleTag({
  content: `
    #comic-canvas {
      transform: none !important;
      transition: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
    }
    /* Ensure text bubbles are rendered statically and centered for rotation */
    body.exporting .text-bubble,
    .text-bubble.exporting-direct-style { /* For cases where .exporting might not be on body in time */
      transform-origin: center center !important;
      transition: none !important;
      opacity: 1 !important;
      visibility: visible !important;
    }
    body.exporting .text-bubble .text-content {
      margin: 0 !important;
      padding: 0 !important; /* Base reset, main.css can inherit if needed */
      /* line-height: 1.2 !important; */ /* REMOVED - To be controlled by TextManagerState or main.css export rules */
      vertical-align: top !important; /* Ensure alignment to the top */
    }
    /* ... other general overrides for stickers, panel images, etc. ... */
  `
});
```

## 4. Text Bubble Resizing Fix (`src/js/modules/DragAndDropManager.js`)

The issue where text bubbles couldn't be resized was due to a missing `mousedown` event listener on the resize handle.

### `makeTextResizable` method:

The `handle.addEventListener('mousedown', onMouseDown);` line was added/ensured to correctly initialize the resizing behavior.

```javascript
// Relevant snippet from src/js/modules/DragAndDropManager.js

makeTextResizable(element, handle) {
    let isResizing = false;
    let startX, startY;
    let startWidth, startHeight;
    const self = this; // Store 'this'

    const onMouseDown = (e) => {
        // ... (cleanup of global listeners if any) ...
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        e.preventDefault();
        e.stopPropagation();

        self.activeDragMouseMove = onMouseMove; // Store for removal
        self.activeDragMouseUp = onMouseUp;     // Store for removal

        document.addEventListener('mousemove', self.activeDragMouseMove);
        document.addEventListener('mouseup', self.activeDragMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
        if (!isResizing) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newWidth = Math.max(50, startWidth + deltaX);
        const newHeight = Math.max(30, startHeight + deltaY);
        element.style.width = `${newWidth}px`;
        element.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
        if (!isResizing) return;
        isResizing = false;
        // ... (cleanup listeners) ...
        this.comicCreator.saveCurrentPageState(); // Save state after resize
    };

    handle.addEventListener('mousedown', onMouseDown); // Ensure this listener is attached
}
```

This combination of JavaScript logic for dynamic style application and carefully managed CSS rules for both editor and export contexts ensures that text properties are handled robustly. 

## 5. Scalability for New Canvas Dimensions

The system is structured to reasonably support new predefined canvas dimensions while maintaining text properties accurately due to several key design choices:

1.  **Percentage-Based Sizing and Positioning**:
    *   Text bubble positions (`left`, `top`) and dimensions (`width`, `height`) are primarily saved and restored as percentages relative to their parent container (a comic panel or the main canvas). This allows them to scale proportionally when the canvas dimensions change.

2.  **Adaptive Font Size and Line Height**:
    *   **Font Size**: Absolute font sizes (e.g., "20px") are saved and applied. While these don't automatically scale with canvas size, the rendering respects the chosen size.
    *   **Line Height**:
        *   If a unitless line height (e.g., 1.5) is set by the user, it's saved as such. During export, `TextManagerState.js` calculates the actual pixel line height by multiplying this unitless value with the current font size (in pixels). This ensures line spacing scales appropriately with the font size.
        *   If a line height with units (e.g., "25px") is set, it's applied directly.

3.  **Dimension-Agnostic Export CSS**:
    *   The CSS rules in `src/styles/main.css` (specifically under the `.exporting` class) and the styles injected by `src/server/puppeteer-export.js` focus on rendering fidelity (e.g., `vertical-align: top;`, `transform: none;`) rather than imposing fixed sizes. They are designed to work with the dimensions and styles provided by the JavaScript logic.

### Potential Considerations When Adding New Dimensions:

*   **Default Text Settings**: For significantly different canvas dimensions (very large, very small, or unusual aspect ratios), you might consider if default font sizes or text bubble sizes remain optimal from a user experience perspective. Adjusting defaults or providing user guidance might be beneficial.
*   **Aspect Ratio Impact**: Since text bubbles use percentage-based dimensions, their shape will change if the aspect ratio of the parent (panel or canvas) changes drastically. This is generally expected.
*   **Panel Layouts**: How your panel layouts adapt to new canvas dimensions will influence the space available for text bubbles within them.

**In Summary**: The core mechanisms for text rendering (position, size, rotation, font styles, line height) are built with scalability in mind. The primary effort for adding new dimensions would involve UI updates for selecting them, ensuring panel layouts are responsive, and UX testing for optimal default text presentation on those new dimensions. The fundamental text property handling should remain consistent. 