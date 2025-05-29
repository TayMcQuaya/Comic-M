# Comic Creator Dimension Handling and Customization Guide

## 1. Overview

This document outlines how canvas dimensions are currently managed within the Comic Creator application and provides a plan for implementing **additional predefined dimensions**. The goal is to ensure accurate comic creation (element placement, scaling, drag-and-drop) and precise export to PDF, regardless of the chosen dimensions. This revised plan prioritizes stability and export accuracy, especially for text elements, by focusing on developer-added fixed dimension options rather than fully user-customizable inputs.

## 2. Current Dimension Handling

The application currently supports a few predefined canvas dimensions. The system is designed to adapt the display and export based on the selected dimension.

**Key Components & Flow:**

### 2.1. UI Selection (`index.html`)
-   Users select dimensions via buttons on the upload page (e.g., "DEFAULT 1:1 (700x700px)", "Amazon KDP (7\"x10\") - 490x700px").
-   These buttons have IDs like `current-size-btn` and `amazon-kdp-size-btn`.

### 2.2. JavaScript Logic (`src/js/main.js` - `ComicCreator` class)
-   **`canvasDimensions` Object:** Stores predefined dimension sets (e.g., `current: { width: 700, height: 700, name: "DEFAULT 1:1 (700x700px)" }`, `amazonKDP: { width: 490, height: 700, name: "Amazon KDP (7\"x10\")" }`).
-   **`selectedCanvasDimension` Property:** Tracks the key of the currently active dimension (e.g., "current").
-   **`setCanvasDimension(dimensionKey)` Method:**
    -   Updates CSS custom properties: `--canvas-width` and `--canvas-height` on the root HTML element.
    -   Updates the active state of the dimension buttons in the UI.
    -   Notifies the `PanelManager` of the dimension change: `this.panelManager.updateCanvasSize(newDim.width, newDim.height);`.
    -   *(Anticipated Change)* Will also need to trigger a recalculation/re-application of styles for elements like text that might depend on canvas size (see Section 3.4).

### 2.3. CSS Styling (`src/styles/main.css`)
-   The main comic canvas (`#comic-canvas`) dimensions are controlled by the CSS custom properties:
    ```css
    #comic-canvas {
        width: var(--canvas-width);
        height: var(--canvas-height);
        /* ... other styles ... */
    }
    ```

### 2.4. Panel Management (`src/js/modules/PanelManager.js`)
-   **`updateCanvasSize(newWidth, newHeight)` Method:** Stores the new canvas width and height.
-   **Panel Creation & Layout:** `PanelManager` uses its knowledge of the current `canvasWidth` and `canvasHeight` to translate percentage-based layout definitions (from `src/js/utils/layouts.js`) into absolute pixel dimensions and positions for comic panels. This ensures panels correctly fill the chosen canvas size.

### 2.5. Element Positioning and Adaptation (Current State Analysis)
-   **Images within Panels:** Handled relative to the panel; adapt well.
-   **Text Bubbles & Content (`src/js/modules/TextManagerState.js`):**
    -   **Saving (`saveTextStates`):**
        -   Positions (`left`, `top`) and bubble dimensions (`width`, `height`) for text elements *within panels* are converted to percentages relative to that panel's dimensions.
        -   Positions and bubble dimensions for text elements *directly on the canvas* are converted to percentages relative to the main canvas dimensions.
        -   `font-size` and `line-height` are saved as fixed pixel values (e.g., "16px").
        -   `sourceCanvasWidth` and `sourceCanvasHeight` are saved, currently used for a scaling factor (`K_avg_scale`).
    -   **Loading (`loadTextStates`, `restoreTextBubble`):**
        -   Percentage-based positions and bubble sizes are applied.
        -   `font-size` and `line-height` are currently scaled using `K_avg_scale` derived from `sourceCanvasWidth/Height` and the current canvas dimensions. This is the area targeted for refinement to improve export accuracy.
-   **Stickers (`src/js/modules/StickerManager.js`):**
    -   Positions (`left`, `top`) are converted to percentages relative to the canvas if initially in pixels.
    -   Size (`width`) is often a fixed pixel value (e.g., "100px").

### 2.6. Project Saving (`src/js/modules/ProjectStorageManager.js`, `ComicCreator`)
-   **`getCurrentProjectState()` Method (`ComicCreator`):**
    -   Saves `canvasDimensionKey`.
    -   Saves the actual `canvasWidth` and `canvasHeight`.
-   The full state of text elements (including their saved positions, sizes, and font styles) is part of the page state.

### 2.7. Export Process (`src/server/puppeteer-export.js`)
-   Uses `projectState.canvasWidth` and `projectState.canvasHeight` to define PDF page dimensions.
-   Captures a screenshot of `#comic-canvas`. Accuracy depends on how elements (especially text) render at the current canvas dimensions with their applied styles.

## 3. Revised Plan: Adding Predefined "Custom" Dimensions & Enhancing Text Robustness

This plan focuses on adding new fixed dimension options provided by the developer and improving text handling for WYSIWYG results per dimension and better export accuracy.

### 3.1. Adding New Predefined Dimensions
-   **Developer Task:** You will provide the specifications for new dimensions (e.g., Name: "Landscape Banner", Width: 1200px, Height: 300px).
-   **Implementation (`src/js/main.js` - `ComicCreator`):**
    -   The new dimension(s) will be added directly to the `this.canvasDimensions` object in the `ComicCreator` constructor.
        ```javascript
        // Example addition:
        this.canvasDimensions = {
            current: { width: 700, height: 700, name: "DEFAULT 1:1 (700x700px)" }, // Approx 8"x8" @ 87.5 PPI
            amazonKDP: { width: 490, height: 700, name: "Amazon KDP (7\"x10\")" }, // 7"x10" @ 70 PPI
            landscape10x8: { width: 700, height: 560, name: "Landscape (10\"x8\")" } // 10"x8" @ 70 PPI
            // Add more predefined dimensions here
        };
        ```
-   **UI Update (`index.html`):**
    -   New buttons corresponding to these added dimensions will be manually added to the `.button-row` in the "Canvas Size Selection" section. Each button will have a unique ID.
        ```html
        <!-- Example for the new landscape dimension -->
        <button id="landscape-10x8-size-btn" class="primary-btn">Landscape (10"x8")</button>
        ```
-   **Event Listener (`src/js/main.js` - `setupEventListeners`):**
    -   New event listeners will be added for these new buttons, calling `this.setCanvasDimension('landscape10x8')` (or the relevant new key).

### 3.2. `DimensionManager.js` - Simplified Role
-   The previously proposed `DimensionManager.js` is no longer needed for *user-defined* custom dimensions.
-   If desired for organization, a simple utility or object could be created to hold the `canvasDimensions` map and provide a `getDimension(key)` method, but it's not strictly necessary for this revised approach; `ComicCreator` can continue to manage its `canvasDimensions` object directly.

### 3.3. Core Change: Robust Text Handling for WYSIWYG & Export

The primary focus for reliable multi-dimension support is how text elements are saved, loaded, and displayed when canvas dimensions change.

**Strategy:**
1.  **Save Text Positions & Bubble Dimensions as Percentages:**
    -   This is largely already in place in `TextManagerState.js` and should be maintained. Positions (`left`, `top`) and bubble container dimensions (`width`, `height`) are calculated as percentages relative to their parent (panel or main canvas).
2.  **Save Font Size and Line Height as Fixed Pixel Values:**
    -   In `TextManagerState.js` (`saveTextStates`): When saving `textElement.style.fontSize` and `textElement.style.lineHeight`, ensure they are saved as the exact pixel values (e.g., "24px") currently applied in the editor for that specific text element.
    -   **Remove `sourceCanvasWidth` and `sourceCanvasHeight` from being saved with each text element IF their sole purpose was for `K_avg_scale` of font size/line height.** If they are used for other relative calculations (e.g., certain padding scenarios during export), this needs more careful consideration, but the goal is to avoid scaling font size based on them.
3.  **Load/Apply Text Styles Without Font/Line-Height Scaling:**
    -   In `TextManagerState.js` (`restoreTextBubble` or equivalent):
        -   When applying styles, set `textBubble.style.left`, `top`, `width`, `height` using the saved percentage values. The browser will then render them correctly based on the current actual pixel dimensions of the parent (panel or canvas).
        -   Apply the saved `fontSize` and `lineHeight` (e.g., "24px") **directly** to `textContentElement.style.fontSize` and `textContentElement.style.lineHeight` **without multiplying by `K_avg_scale` or any other scaling factor based on canvas dimension changes.**
4.  **Consequence & User Experience:**
    -   **WYSIWYG per Dimension:** If text is set to 16px on "DEFAULT 1:1", it will render as 16px on that dimension. If the user switches to "Landscape (10″x8″)", the text bubbles will resize and reposition (due to percentage dimensions), but the font inside will *still be 16px*.
    -   **Manual Adjustment:** This 16px font might look too small or too large relative to the new "Landscape (10″x8″)" canvas and its resized bubbles. The user would then manually adjust the font size for that text element *while the "Landscape" dimension is active*. This new font size (e.g., 20px) would then be the stored pixel value for that text element.
    -   **Benefit for Export:** Because the font size rendered in the browser for any active dimension is a direct pixel value (not a result of dynamic scaling factors that might introduce sub-pixel issues), the screenshot taken by Puppeteer is much more likely to be pixel-accurate to what the user sees.
5.  **Recalculation on Dimension Switch:**
    -   When `ComicCreator.setCanvasDimension()` is called:
        -   After CSS variables for canvas size are updated and panels are re-rendered by `PanelManager`:
        -   A function needs to iterate through all existing text elements (both in panels and on canvas). For each text element, it must re-apply its percentage-based `left`, `top`, `width`, `height` styles (so the browser recalculates their pixel values against the new parent dimensions) and re-apply its stored fixed pixel `font-size` and `line-height`. This ensures that the text bubble itself resizes and repositions according to its percentage definitions relative to the new canvas/panel size, while the text content inside maintains its explicitly set pixel-based font size.

### 3.4. Other Managers
-   **`PanelManager.js`:** No significant changes expected. Its use of percentage-based layouts is already suitable.
-   **`BackgroundManager.js`:** Should continue to work correctly.
-   **`StickerManager.js`:**
    -   Positions are saved as percentages, which is good.
    -   Sizes (e.g., `width: '100px'`) are saved as fixed pixel values. This means a sticker will appear the same pixel size regardless of canvas dimension. If proportional scaling is desired for stickers, their width/height would also need to be saved/applied as percentages of the canvas. For now, fixed pixel size for stickers is likely acceptable, and users can resize them manually per dimension.
-   **`ProjectStorageManager.js` & `AutoSaveManager.js`:**
    -   Will continue to save/load `canvasDimensionKey`, `canvasWidth`, `canvasHeight`. When a project is loaded, `setCanvasDimension` is called, and the logic described in 3.3.5 will ensure text elements are correctly re-rendered for the loaded dimension.

### 3.5. Styling (`src/styles/main.css`)
-   Minimal changes: only if new buttons for predefined dimensions require slightly different styling, but they should use `primary-btn` like existing ones.

## 4. Key Files and Summary of Changes for This Approach

-   **`index.html`**:
    -   Manually add new `<button>` elements for each new predefined dimension.
-   **`src/js/main.js` (`ComicCreator` class):**
    -   Add new dimension keys and properties to `this.canvasDimensions`.
    -   Add new event listeners in `setupEventListeners` for the new dimension buttons.
    -   Implement or call a function after `setCanvasDimension` that explicitly re-applies styles to all text elements to ensure their percentage-based containers and fixed font sizes are correctly rendered against the new canvas size. This involves iterating through text bubbles, allowing the browser to reflow their percentage-based dimensions against the new parent sizes, and ensuring their inner text content re-applies its stored, fixed pixel `font-size` and `line-height` without any scaling.
-   **`src/js/modules/TextManagerState.js`**:
    -   **`saveTextStates`**:
        -   Ensure font size and line height are saved as direct pixel values (e.g., "16px").
        -   Stop saving `sourceCanvasWidth`/`sourceCanvasHeight` if they are only used for font/line-height scaling.
    -   **`restoreTextBubble` (within `loadTextStates`)**:
        -   Remove the `K_avg_scale` logic for `fontSize` and `lineHeight`. Apply the stored pixel values directly.
        -   Carefully review any remaining uses of `K_avg_scale` (e.g., for padding on export) and decide if they are still needed or if padding should also be handled differently (e.g. fixed pixel or percentage).
-   **`src/js/modules/StickerManager.js`**:
    -   Review if fixed pixel sizing is adequate or if percentage-based sizing for stickers is desired when canvas dimensions change. For now, fixed pixel is assumed.
-   **`DIMENSION_HANDLING.md`** (This file): Updated to reflect this revised, more robust strategy.

This refined strategy prioritizes stability and WYSIWYG rendering for text on a per-dimension basis, which should significantly improve export accuracy. The trade-off is that text won't auto-scale its font size when switching between drastically different canvas aspect ratios; users will fine-tune text appearance for each dimension they work with.