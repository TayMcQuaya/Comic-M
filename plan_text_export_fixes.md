# Plan: Text Export Positioning and Scaling Fixes

## 1. Objective

Resolve incorrect text positioning, dimensioning, and property scaling in PDF exports. The primary focus is to ensure accuracy for the 1:1 dimension, particularly for text bubbles within panels, while maintaining (and if necessary, correcting) behavior for text directly on the canvas and for other dimensions like Amazon KDP.

## 2. Core Problem Identification

The root of the issue appears to be a mismatch in how percentage-based positions/dimensions are calculated and applied, and how scaling contexts are determined, especially for text bubbles that are children of panels versus those that are direct children of the main canvas.

*   **Panel Text Positioning & Dimensions (`saveTextStates`):**
    *   **Problem:** The `style.left`, `style.top`, `style.width`, and `style.height` for text bubbles *inside panels* were being calculated as percentages relative to the main canvas dimensions. However, during restoration (`restoreTextBubble`), these bubbles are appended to their parent panel. If panel dimensions differ from main canvas dimensions (or their relative ratios do), these percentages lead to incorrect placement and sizing.
    *   **Required Fix:** These style properties for panel text must be calculated as percentages relative to their direct parent panel's `offsetWidth` and `offsetHeight`.

*   **Scaling Context (`sourceCanvasWidth/Height` in `saveTextStates`):**
    *   **Problem:** While a previous fix aimed to use main canvas dimensions for `sourceCanvasWidth/Height`, ensuring this is consistently applied for scaling non-positional/dimensional properties (like `fontSize`, `lineHeight`, various paddings) is critical.
    *   **Confirmation:** This should *always* be the main canvas dimensions at the time of saving, for *all* text bubbles (panel or canvas direct). This value is the basis for the `K_avg_scale` used in `restoreTextBubble` to scale properties relative to changes in the overall design canvas size.

*   **`finalizeTextBubblePosition` in `TextManagerUtils.js`:**
    *   **Problem 1:** A hardcoded `textContentElement.style.paddingTop = '2px';` is not scaled, which can contribute to vertical misalignment when dimensions change.
    *   **Required Fix 1:** This padding needs to be scaled using the `K_avg_scale` factor calculated in `restoreTextBubble`.
    *   **Problem 2:** The line `textContent.style.height = textState.style.height;` forces the inner text content's height to match the bubble's (potentially percentage-based) height. This can lead to text overflow being cut off or, conversely, too much empty space if the text content is shorter.
    *   **Required Fix 2:** This line should be removed or commented out to allow text content to flow naturally based on its font size, line height, and the bubble's padding.

## 3. Proposed Changes - Step-by-Step Implementation

### Step 1: Modify `TextManagerState.js` -> `saveTextStates()`

*   **Objective:** Ensure correct percentage calculations for position/dimensions of panel text, and consistent `sourceCanvasWidth/Height` for all text.

*   **For Text Bubbles *inside* Panels:**
    *   Retrieve main canvas dimensions once: `mainCanvasWidth = canvas.offsetWidth`, `mainCanvasHeight = canvas.offsetHeight`.
    *   Retrieve panel dimensions: `panelWidth = panel.offsetWidth`, `panelHeight = panel.offsetHeight`.
    *   `style.left`, `style.top`: Calculate as percentages relative to `panelWidth` and `panelHeight`.
        *   Example: `savedLeft = `${(parseFloat(currentStyleLeft) / panelWidth) * 100}%`;`
    *   `style.width`, `style.height`: Calculate as percentages relative to `panelWidth` and `panelHeight`.
        *   Example: `savedWidthPercent = `${(parseFloat(finalWidth) / panelWidth) * 100}%`;`
    *   `sourceCanvasWidth`: Store `mainCanvasWidth`.
    *   `sourceCanvasHeight`: Store `mainCanvasHeight`.
    *   `originalPosition.width`, `originalPosition.height`: Also ensure these reflect percentages relative to `panelWidth/Height` if they are used as a fallback. (Focus on `style` properties first).

*   **For Text Bubbles *directly on the main canvas* (`#comic-canvas > .text-bubble`):**
    *   Logic remains largely the same (percentages calculated relative to `mainCanvasWidth` and `mainCanvasHeight`).
    *   `sourceCanvasWidth`: Store `mainCanvasWidth`.
    *   `sourceCanvasHeight`: Store `mainCanvasHeight`.

### Step 2: Modify `TextManagerUtils.js` -> `finalizeTextBubblePosition()`

*   **Objective:** Scale internal padding and fix content height issues.

*   **Function Signature:**
    *   Update to: `finalizeTextBubblePosition(textBubble, textState, K_avg_scale)`

*   **`paddingTop` Scaling:**
    *   Change: `textContentElement.style.paddingTop = '2px';`
    *   To: `textContentElement.style.paddingTop = (2 * K_avg_scale) + 'px';` (Ensure `K_avg_scale` defaults to 1 if not provided to prevent NaN errors, though it should always be passed).

*   **`textContentElement.style.height`:**
    *   Comment out or remove: `textContent.style.height = textState.style.height;`

### Step 3: Update Callers of `finalizeTextBubblePosition`

*   **Objective:** Propagate the `K_avg_scale` to `finalizeTextBubblePosition`.

*   **In `TextManagerState.js` -> `restoreTextBubble()`:**
    *   When calling `finalizeTextBubblePosition`:
        *   Modify the call: `this.comicCreator.textManagerUtils.finalizeTextBubblePosition(textBubble, textState, K_avg_scale);`

*   **In `TextManager.js` (Facade Method):**
    *   Update the signature: `finalizeTextBubblePosition(textBubble, textState, K_avg_scale)`
    *   Update the internal call: `return this.utils.finalizeTextBubblePosition(textBubble, textState, K_avg_scale);`

## 4. Testing Strategy (Post-Implementation)

*   **Primary Focus: 1:1 Dimension Export**
    *   Create text within a panel. Style it (font, size, color, bubble padding). Move and resize it within the panel.
    *   Save the project. Reload. Verify appearance in the editor.
    *   Export to PDF (1:1 dimension). Meticulously compare the PDF output with the editor appearance. Check:
        *   Position of the bubble within the panel.
        *   Size (width/height) of the bubble.
        *   Font size, line height.
        *   Internal padding of the text content.
        *   Overall text alignment and flow.
    *   Repeat the same for text placed directly on the main canvas.

*   **Secondary Focus: Amazon KDP Dimension & Other Scenarios**
    *   Perform similar tests (create, style, save, reload, export) for the Amazon KDP dimension.
    *   Test switching between dimensions:
        *   Create text in 1:1, switch to KDP, check appearance.
        *   Create text in KDP, switch to 1:1, check appearance.
    *   Check for regressions in the "text pushed down" issue in KDP.
    *   Verify that scaling of bubble padding (implemented previously) still works correctly with the new changes.

*   **Console Logs:** Monitor browser console logs for any errors or warnings from `TextManagerState.js` and `TextManagerUtils.js`, especially regarding dimension calculations and scaling factors.

This plan aims for a systematic approach to tackle the complex interactions between panel-relative and canvas-relative text elements during saving, loading, and exporting. 