# Comic Creator - Functional Summary (Modular)

This document provides a detailed summary of specific functionalities within the modular Comic Creator application, focusing on UI interactions, element management, and their implementation across different manager modules.

## 1. Sidebar Tabs & Mode Switching

### Functionality:

-   The editor's left sidebar (`.editor-sidebar`) contains tabs ("Panels", "Backgrounds", "Stickers") managed by `UIManager`.
-   Clicking a tab triggers `UIManager.setupSidebarTabs`, which:
    -   Updates the visual active state of the clicked tab (`.tab-btn.active`).
    -   Sets the `comicCreator.currentSidebarMode` property (`'panels'`, `'backgrounds'`, or `'stickers'`). This mode dictates the behavior of subsequent actions, especially drag-and-drop.
    -   Calls `comicCreator.uiManager.updateRightSidebarView()` to show the appropriate properties panel on the right.
    -   Calls `comicCreator.deselectAll()` to clear any current panel, text, or sticker selection.
-   The sidebar content area (`.sidebar-content`) displays image thumbnails managed by `ImageLibrary` and `FolderSystem`.

### Design (`main.css`):

-   Tabs are styled using `.sidebar-tabs`, `.tab-btn`, and `.tab-btn.active` (flexbox layout).
-   Sidebar content area (`.sidebar-content`) holds the thumbnail grid (`#editor-thumbnails`).

### Code Snippets / Logic Flow:

**Tab Click Handling (`UIManager.js` - `setupSidebarTabs`):**
```javascript
// Simplified logic within setupSidebarTabs event listener
const newMode = clickedTab.dataset.tab;
if (newMode === this.comicCreator.currentSidebarMode) return;

// Update active tab CSS
// ... remove 'active' from others, add to clickedTab ...

// Update central mode state
this.comicCreator.currentSidebarMode = newMode;

// Update right sidebar UI
this.updateRightSidebarView();

// Clear selection
this.comicCreator.deselectAll();
```

**Right Sidebar Update (`UIManager.js` - `updateRightSidebarView`):**
```javascript
updateRightSidebarView() {
    // ... hide all property sections ...

    switch (this.comicCreator.currentSidebarMode) {
        case 'panels':
            // Show panel properties (potentially placeholder or specific controls via PanelManager)
            this.comicCreator.panelManager.updatePanelControls(this.comicCreator.currentPanel);
            // Make #panel-properties visible
            break;
        case 'backgrounds':
            // Show background properties via BackgroundManager
            this.comicCreator.backgroundManager.updateBackgroundControls();
            // Make #background-properties visible
            break;
        case 'stickers':
            // Show sticker properties (potentially placeholder or specific controls via StickerManager)
            this.comicCreator.stickerManager.updateStickerControls(this.comicCreator.currentSticker);
             // Make #sticker-properties visible
            break;
    }
    // Text properties visibility is handled separately on text selection/deselection
}
```

## 2. Drag-and-Drop Operations

### Functionality:

-   Managed primarily by `DragAndDropManager`.
-   **Image Library to Canvas:**
    -   Uses HTML5 Drag and Drop API (`dragstart` on thumbnails, `dragover`/`drop` on canvas/panels/folders).
    -   `dragstart` (in `ImageLibrary`): Stores `imageId` in `dataTransfer`.
    -   `drop` listener (in `DragAndDropManager` - `setupCanvasDropzone`): Retrieves `imageId`, finds the `image` object, and determines action based on `comicCreator.currentSidebarMode`:
        -   **Panels Mode:** If dropped on a `.comic-panel`, calls `comicCreator.panelManager.addImageToPanel(panel, image)`.
        -   **Backgrounds Mode:** Calls `comicCreator.backgroundManager.addBackgroundImage(image)`.
        -   **Stickers Mode:** Calculates drop coordinates relative to the canvas and calls `comicCreator.stickerManager.addSticker(image, dropX, dropY)`.
    -   Visual feedback (`.drop-target` class) is applied on `dragover`.
-   **Element Repositioning/Resizing (Panels, Text, Stickers):**
    -   Uses custom `mousedown`, `mousemove`, `mouseup` logic implemented in `DragAndDropManager`.
    -   Specific setup functions are called by the respective managers when elements are created (e.g., `dragAndDropManager.setupPanelImageDragging`, `dragAndDropManager.setupTextDragging`, `dragAndDropManager.setupStickerDragging`).
    -   These functions attach listeners to the element or specific drag handles.
    -   `mousemove` handlers calculate new positions/dimensions based on mouse movement, apply necessary constraints (panel/canvas boundaries), and update the element's style (`transform`, `left`, `top`, `width`, `height`).
    -   `mouseup` handlers finalize the position, potentially save the state (`comicCreator.saveCurrentPageState()`), and remove temporary listeners/classes.

### Code Snippets / Logic Flow:

**Canvas Drop Handling (`DragAndDropManager.js` - `_handleDrop` called from `setupCanvasDropzone`):**
```javascript
_handleDrop(event) {
    event.preventDefault();
    this.canvas.classList.remove('drag-over');
    // ... remove drop-target from panels ...

    const imageId = event.dataTransfer.getData('image/id');
    const image = this.comicCreator.imageLibrary.getImageById(imageId);
    if (!image) return;

    const panel = event.target.closest('.comic-panel');

    switch (this.comicCreator.currentSidebarMode) {
        case 'panels':
            if (panel) {
                this.comicCreator.panelManager.addImageToPanel(panel, image);
            }
            break;
        case 'backgrounds':
            this.comicCreator.backgroundManager.addBackgroundImage(image);
            break;
        case 'stickers':
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            this.comicCreator.stickerManager.addSticker(image, x, y);
            break;
    }
    // ... other cleanup ...
}
```

**Generic Element Drag Setup (`DragAndDropManager.js` - Simplified `_setupDraggable`):**
```javascript
_setupDraggable(element, handle, options) {
    // options = { onDragStart, onDrag, onDragEnd, container, usePercentage, boundaryCheck }
    handle.addEventListener('mousedown', (e) => {
        // ... prevent default, record start position (initialX/Y, elementStartLeft/Top) ...
        // ... call options.onDragStart if provided ...

        const onMouseMove = (moveEvent) => {
            // ... calculate deltaX, deltaY ...
            let newLeft, newTop;
            if (options.usePercentage) {
                // Calculate percentage position relative to options.container
            } else {
                // Calculate pixel position
            }

            if (options.boundaryCheck) {
               // Apply boundary constraints based on options.container
            }

            // Update element style (left, top, or transform)
            element.style.left = `${newLeft}${options.usePercentage ? '%' : 'px'}`;
            element.style.top = `${newTop}${options.usePercentage ? '%' : 'px'}`;

            // ... call options.onDrag if provided ...
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // ... call options.onDragEnd if provided (e.g., to save state) ...
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
```

## 3. Text Elements & Boundaries

### Functionality:

-   Managed by `TextManager`.
-   Text bubbles (`.text-bubble`) are added via:
    -   `TextManager.addTextToPanel(panel)`: Creates bubble inside the panel. Positioning (`left`, `top`) is percentage-based relative to the panel.
    -   `TextManager.addTextToCanvas()`: Creates bubble as a direct child of `#comic-canvas`. Positioning is pixel-based relative to the canvas. The `z-index` is set lower (e.g., 5) if `currentSidebarMode` is 'backgrounds', higher otherwise (e.g., 100).
-   Each bubble contains a `contentEditable` div (`.text-content`).
-   **Boundaries:**
    -   Dragging is handled by `DragAndDropManager` via `setupTextDragging`.
    -   Panel Text: Drag logic uses `usePercentage: true` and boundary checks against the parent panel's dimensions.
    -   Canvas Text: Drag logic uses `usePercentage: false` (pixels) and boundary checks against the main canvas dimensions.
-   **Selection & Properties:**
    -   Clicking a text bubble calls `TextManager.selectTextBox(bubbleElement)`.
    -   This adds the `.selected-text` class for visual feedback.
    -   It calls `TextManager.updateTextProperties()` to populate the `#text-properties` panel in the right sidebar.
    -   `DeselectAll()` (called by `UIManager` or `TextManager`) removes the selection and hides `#text-properties`.

### Design (`main.css`):

-   `.text-bubble` provides base styles.
-   Bubble type classes (`.speech-bubble`, `.thought-bubble`, etc.) modify appearance (borders, backgrounds, tails via pseudo-elements).
-   `.selected-text` class adds highlight (border, box-shadow).

### Code Snippets / Logic Flow:

**Adding Text (`TextManager.js` - Simplified `addTextToPanel` / `addTextToCanvas`):
```javascript
addTextToPanel(panel) {
    // ... create textContainer, textElement ...
    textContainer.style.position = 'absolute';
    textContainer.style.left = '50%'; // Initial position (percentage)
    textContainer.style.top = '50%';
    textContainer.style.transform = 'translate(-50%, -50%)'; // Center
    textContainer.style.zIndex = '100';
    panel.appendChild(textContainer);
    // ... create controls ...
    this.comicCreator.dragAndDropManager.setupTextDragging(textContainer, dragHandle, panel);
    // ... setup resizing, select, save state ...
}

addTextToCanvas() {
    const canvas = document.getElementById('comic-canvas');
    // ... create textContainer, textElement ...
    textContainer.style.position = 'absolute';
    // Position near canvas center initially (pixels)
    const canvasRect = canvas.getBoundingClientRect();
    textContainer.style.left = `${canvasRect.width / 2 - 50}px`;
    textContainer.style.top = `${canvasRect.height / 2 - 25}px`;
    textContainer.style.zIndex = this.comicCreator.currentSidebarMode === 'backgrounds' ? '5' : '100';
    canvas.appendChild(textContainer);
    // ... create controls ...
    this.comicCreator.dragAndDropManager.setupTextDragging(textContainer, dragHandle, canvas);
    // ... setup resizing, select, save state ...
}
```

**Selecting Text (`TextManager.js` - `selectTextBox`):**
```javascript
selectTextBox(textBox) {
    if (this.currentTextBox === textBox) return;
    this.comicCreator.deselectAll(textBox); // Deselect others first
    this.currentTextBox = textBox;
    textBox.classList.add('selected-text');
    // ... show controls (resize handles etc.) ...
    this.updateTextProperties(textBox); // Populate right sidebar
}
```

## 4. Layouts & Panel Creation

### Functionality:

-   Predefined layouts are stored in `src/js/layouts.js`.
-   Custom layouts can be created using `LayoutBuilderManager` and are stored in `localStorage` and the project save file.
-   Applying a layout (either initially or changing page layout) is handled by `PanelManager.applyLayout(layoutData)`:
    -   Clears existing panels from `#comic-canvas`.
    -   Iterates through the `layoutData.panels` array.
    -   For each panel definition (`{ x, y, width, height }`), creates a `div.comic-panel` element.
    -   Sets the panel's `id`, `style.left`, `style.top`, `style.width`, `style.height` using the percentage values from the definition.
    -   Appends the panel to the `#comic-canvas`.
    -   After creating panels, `ComicCreator` calls `loadPanelStates`, `loadStickerStates`, `loadCanvasTextElements`, etc., to repopulate the page content according to the saved state for that page.

### Design (`main.css`):

-   Layout selection screen (`#layout-page`, managed by `UIManager`) shows previews (`.layout-preview`, `.preview-panel`).
-   `.comic-panel` elements are absolutely positioned, with `overflow: hidden`.
-   `.comic-panel.selected` gets a distinct border.

### Code Snippets / Logic Flow:

**Layout Definitions (`src/js/layouts.js` - example):**
```javascript
// (Same as previous summary, structure is accurate)
export const layouts = {
    'four-grid': {
        name: 'Classic 2×2 Grid',
        panels: [
            { x: 0, y: 0, width: 49, height: 49 },
            { x: 51, y: 0, width: 49, height: 49 },
            { x: 0, y: 51, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 }
        ]
    },
    // ... other layouts ...
};
```

**Creating Panels (`PanelManager.js` - `applyLayout`):**
```javascript
applyLayout(layoutData) {
    const canvas = document.getElementById('comic-canvas');
    // Clear only existing panels, not stickers or canvas text
    canvas.querySelectorAll('.comic-panel').forEach(p => p.remove());

    if (!layoutData || !layoutData.panels) return;

    this.panels = []; // Clear internal reference
    layoutData.panels.forEach((panelDef, index) => {
        const panel = document.createElement('div');
        panel.className = 'comic-panel';
        panel.id = `panel-${index}`;
        panel.style.left = `${panelDef.x}%`;
        panel.style.top = `${panelDef.y}%`;
        panel.style.width = `${panelDef.width}%`;
        panel.style.height = `${panelDef.height}%`;
        panel.tabIndex = 0; // Make focusable

        canvas.appendChild(panel);
        this.panels.push(panel);

        // Add event listener for selecting this panel
        panel.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent canvas click
            this.selectPanel(panel);
        });
        // Setup dragging for image within panel (if image added later)
        this.comicCreator.dragAndDropManager.setupPanelImageDragging(panel);
    });

    // Reset current panel selection
    this.currentPanel = null;
}
```

## 5. Page Navigation & Management

### Functionality:

-   The top header (`.editor-header`) contains navigation controls, managed primarily by `UIManager` and `ComicCreator`.
-   `UIManager.setupPageNavigation` dynamically creates the page controls (indicator, prev/next buttons, jump input, add/delete/reorder buttons) and adds listeners.
-   **Navigation:**
    -   Prev/Next buttons and Jump Input trigger `ComicCreator.navigateToPage(index)`.
    -   `navigateToPage`:
        - Saves the current page's state via `ComicCreator.saveCurrentPageState()`.
        - Updates `comicCreator.currentPageIndex`.
        - Loads the new page's state via `ComicCreator.loadPageState(newIndex)`, which calls manager methods like `panelManager.applyLayout`, `panelManager.loadPanelStates`, `textManager.loadTextStates`, `stickerManager.loadStickerStates`, `backgroundManager.loadCurrentPageBackground`.
        - Updates the UI indicator and button states via `UIManager.updatePageIndicator` and `UIManager.updateNavigationButtons`.
-   **Page Management:**
    -   Add Page (`#addPage`): Calls `ComicCreator.showLayoutSelection()`, which eventually leads to `ComicCreator.addPage(selectedLayoutId)` adding a new page state object to `comicCreator.pages` and navigating to it.
    -   Delete Page (`#deletePage`): Calls `ComicCreator.deleteCurrentPage()`, which removes the current page state from the array and navigates to an adjacent page.
    -   Reorder Pages (`#reorderPagesBtn`): Calls `ComicCreator.reorderPages()`, likely using `UIManager` to show a modal for reordering.

### Design (`main.css`):

-   `.editor-header` uses flexbox.
-   `.page-navigation` groups controls.
-   Buttons (`.tool-btn`, `.primary-btn`, `.danger-btn`) and inputs have standard styling.

### Code Snippets / Logic Flow:

**Navigation Logic (`ComicCreator.js` - `navigateToPage`):**
```javascript
async navigateToPage(pageIndex, saveCurrentState = true) {
    if (pageIndex < 0 || pageIndex >= this.pages.length) return;

    if (saveCurrentState && this.pages.length > 0) {
        await this.saveCurrentPageState(); // Ensure state is saved before navigating
    }

    this.currentPageIndex = pageIndex;
    await this.loadPageState(pageIndex); // Load layout, panels, text, etc.

    this.uiManager.updatePageIndicator();
    this.uiManager.updateNavigationButtons();
    this.deselectAll(); // Deselect elements on new page
}
```

**Loading Page State (`ComicCreator.js` - `loadPageState`):**
```javascript
async loadPageState(pageIndex) {
    const pageData = this.pages[pageIndex];
    if (!pageData) return;

    // 1. Apply Layout (PanelManager clears old panels)
    const layout = typeof pageData.layout === 'string' ? this.layouts[pageData.layout] || this.layoutBuilderManager.getLayoutById(pageData.layout) : pageData.layout;
    this.panelManager.applyLayout(layout); // Creates empty panels

    // 2. Load Panel Content (images, transforms, text within panels)
    await this.panelManager.loadPanelStates(pageData.panelStates || []);

    // 3. Load Background
    this.backgroundManager.loadCurrentPageBackground(); // Reads from this.pages[this.currentPageIndex]

    // 4. Load Stickers
    this.stickerManager.loadStickerStates(pageData.stickerStates || []);

    // 5. Load Canvas Text Elements (Text elements not inside panels)
    this.textManager.loadTextStates(pageData.canvasTextElements || [], document.getElementById('comic-canvas'));

    // Update UI, e.g., folder path if needed
    this.uiManager.updateFolderPath();
}
```

## 6. Right Sidebar Property Panels

### Functionality:

-   The right sidebar (`.properties-panel`) displays context-specific controls based on the active left sidebar tab (`currentSidebarMode`) and the currently selected element.
-   Managed by `UIManager.updateRightSidebarView()` in conjunction with specific managers.
-   **Panel Settings (`#panel-properties`):**
    -   Activated when `currentSidebarMode` is 'panels' AND `comicCreator.currentPanel` is set.
    -   Populated by `PanelManager.updatePanelControls(panel)`.
    -   Controls image zoom (`scale`), position (`translate`), rotation, flip. Changes modify the `<img>` transform/style within the selected panel.
-   **Text Settings (`#text-properties`):**
    -   Activated when `comicCreator.currentTextBox` is set (regardless of sidebar mode).
    -   Populated by `TextManager.updateTextProperties(textBox)`.
    -   Controls bubble type, font family/size/color, bubble color/opacity, text styles (bold, italic, etc.), outline, shadow, padding, rotation. Changes modify the `.text-bubble` and `.text-content` styles.
-   **Background Settings (`#background-properties`):**
    -   Activated when `currentSidebarMode` is 'backgrounds'.
    -   Populated by `BackgroundManager.updateBackgroundControls()`.
    -   Controls predefined background styles, custom background image management (add/remove, apply-to-all). Changes modify `#comic-canvas` background or `.canvas-background-image`.
-   **Sticker Settings (`#sticker-properties`):**
    -   Activated when `currentSidebarMode` is 'stickers' AND `comicCreator.currentSticker` is set.
    -   Populated by `StickerManager.updateStickerControls(sticker)`.
    -   Controls sticker size, rotation, flip, outline (color, width, style), delete. Changes modify the sticker `<img>` element's style and transform.
-   **State Saving:** Any change made through these property panels typically triggers `comicCreator.saveCurrentPageState()` immediately, often via the event listener attached by the manager that created the control.

### Design (`main.css`):

-   `.properties-panel` is the main container.
-   `.properties-section` (`#panel-properties`, `#text-properties`, etc.) holds controls for one element type.
-   `.panel-controls`, `.control-group`, `.zoom-group`, etc., structure the inputs/labels/buttons.

### Code Snippets / Logic Flow:

**(See `UIManager.updateRightSidebarView` snippet in Section 1)**

**Example: Updating Panel Controls (`PanelManager.js` - `updatePanelControls` Simplified):**
```javascript
updatePanelControls(panel) {
    const controlsContainer = document.getElementById('panel-properties');
    // ... clear or prepare controlsContainer ...

    if (!panel) {
        controlsContainer.innerHTML = '<p>Select a panel to see image controls.</p>';
        controlsContainer.style.display = 'block';
        return;
    }

    const img = panel.querySelector('img');
    // Generate HTML for zoom slider, position buttons, rotate, flip etc.
    controlsContainer.innerHTML = `... HTML for panel image controls ...`;

    // Find controls (zoomControl, positionBtns, rotateSlider, flipBtn)
    // ...

    // Set initial values from panel/image state (e.g., img transform)
    // ...

    // Add event listeners
    zoomControl.addEventListener('input', (e) => {
        // Update image transform: scale
        this.comicCreator.saveCurrentPageState();
    });
    positionBtns.forEach(btn => btn.addEventListener('click', () => {
        // Update image transform: translate
        this.comicCreator.saveCurrentPageState();
    }));
    // ... listeners for rotate, flip ...

    controlsContainer.style.display = 'block';
}
```

**(Similar update logic exists in `TextManager`, `BackgroundManager`, `StickerManager` for their respective panels).**

## 7. State Management Overview

### Functionality:

-   The application state is primarily managed within the `ComicCreator` instance, particularly the `pages` array which holds the state for each individual page.
-   `ComicCreator.saveCurrentPageState()` is the core function for capturing the state of the *currently visible page*.
    -   It calls methods on relevant managers to get their current state:
        -   `PanelManager.savePanelStates()` (returns array of panel states, including image transforms and nested text elements gathered via `TextManager.getTextStatesInElement`).
        -   `StickerManager.saveStickerStates()` (returns array of sticker states).
        -   `TextManager.getTextStatesInElement(canvas)` (returns array of *canvas-level* text element states).
        -   `BackgroundManager.saveBackgroundState()` (returns background state object).
    -   It combines this data with the current layout ID into a page state object and updates the corresponding entry in `comicCreator.pages[currentPageIndex]`.
    -   It implicitly triggers `HistoryManager.recordSnapshotBeforeAction()` before most state-modifying actions, which saves a copy of the page state *before* the change.
-   `ComicCreator.loadPageState(index)` orchestrates restoring the state for a given page index by calling the corresponding `load...` methods on the managers.
-   **Project Save/Load:**
    -   `ComicCreator.saveProject()` serializes the *entire* application state (version, pages array, image library data including Data URLs, folder structure, custom layouts, settings) into a JSON object and triggers a file download.
    -   `ComicCreator.loadProject()` reads a JSON file, parses it, restores the entire application state (including converting Data URLs back to Object URLs), and loads the first page.
-   **Auto-Save:** `AutoSaveManager` periodically calls `ComicCreator.saveProject(true)` to save the full project state silently to `localStorage`.

### State Structure (Simplified - See TECHNICAL.md for full detail):

-   **Project:** `{ version, pages: [...], images: [...], currentPageIndex, folderStructure, customLayouts, ... }`
-   **Page:** `{ layout, panelStates: [...], stickerStates: [...], canvasTextElements: [...], backgroundState, canvasBackgroundStyle }`
-   **Panel:** `{ imageId, transform, ..., textElements: [...] }`
-   **Text:** `{ id, content, style: { left, top, fontFamily, ... }, bubbleType, ... }`
-   **Sticker:** `{ id, imageId, left, top, width, height, transform, size, outlineEnabled, ... }`

This modular approach ensures that each manager is responsible for saving and loading its specific part of the page state, coordinated by the central `ComicCreator` class.

## 8. Layout Types

### Right Sidebar - Panel Settings (`#panel-properties`):

-   **Activation:** This panel becomes visible when the "Panels" tab is active *and* a specific panel (`.comic-panel`) is selected (triggered by `selectPanel()` which calls `updatePanelControls()`).
-   **Controls Population:** The `updatePanelControls()` function dynamically generates the HTML for the controls within `#panel-properties`.
-   **Functionality:**
    -   **Zoom:** A range slider (`.zoom-control`) and an editable value display (`.zoom-value`) control the `scale()` value in the panel's *image* `transform` style. A "Reset Zoom" button (`.reset-zoom-btn`) reverts the scale to its initial value (calculated when the image was added). Zooming affects only the image *within* the panel, not the panel itself.
    -   **Position:** Up/Down/Left/Right buttons (`.position-btn`) modify the `top` and `left` percentage styles of the panel's *image*, effectively panning the image within the panel's boundaries. A "Step Size" input (`.step-size-input`) controls the amount of movement per button click.
-   **State Saving:** Changes to zoom or position trigger `this.saveCurrentPageState()`.

**HTML Structure (`index.html` - panel properties part):**

```html
<div id="panel-properties" class="properties-section">
    <h4>Panel Settings</h4>
    <div class="panel-controls">
        <!-- Controls are dynamically added here by updatePanelControls -->
        <!-- Example structure from JS (simplified): -->
        <div class="control-group">
            <h4>Image Controls</h4>
            <div class="zoom-group">
                <label>Zoom</label>
                <input type="range" class="zoom-control" min="50" max="300" value="100">
                <span class="zoom-value">100%</span>
                <button class="reset-zoom-btn">...</button>
            </div>
        </div>
        <div class="control-group">
            <h4>Position</h4>
             <div class="step-size-control">
                 <label>Step Size: </label>
                 <input type="number" class="step-size-input" value="1" min="0.1" max="20" step="0.1">
             </div>
            <div class="position-controls">
                <button class="position-btn up">...</button>
                <button class="position-btn left">...</button>
                <button class="position-btn right">...</button>
                <button class="position-btn down">...</button>
            </div>
        </div>
    </div>
</div>
```

**JavaScript - Updating Panel Controls Panel (`src/js/main.js` - `updatePanelControls`):**

```javascript
updatePanelControls(panel) {
    const controls = document.querySelector('.panel-controls'); // Assumes this exists within #panel-properties
    if (!controls || !panel) return;

    // Dynamically sets innerHTML with controls (sliders, buttons, step input)
    controls.innerHTML = `... HTML for controls ...`;

    // Get references to the newly created controls
    const zoomControl = controls.querySelector('.zoom-control');
    const zoomValue = controls.querySelector('.zoom-value');
    const resetZoomBtn = controls.querySelector('.reset-zoom-btn');
    const stepSizeInput = controls.querySelector('.step-size-input');
    const positionBtns = controls.querySelectorAll('.position-btn');

    // Set initial values (e.g., read current scale for zoom slider)
    // ...

    // Add event listeners
    if (zoomControl) {
        zoomControl.addEventListener('input', (e) => this.handleZoom(e, panel));
        this.makeSliderValueEditable(zoomControl, zoomValue, '%', 0);
    }
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', () => { /* reset scale, update controls, save state */ });
    }
    positionBtns.forEach(btn => {
        btn.addEventListener('click', () => this.handlePositionChange(btn, panel)); // Reads stepSizeInput
    });

    // Make the panel properties section visible
    document.getElementById('panel-properties').style.display = 'block';
}
```

**JavaScript - Zoom/Position Handlers (`src/js/main.js`):**

```javascript
handleZoom(e, panel) {
    const img = panel.querySelector('img');
    if (!img) return;
    // ... calculate newScale based on slider value and initial scale ...
    img.style.transform = img.style.transform.replace(/scale\(.*?\)/, `scale(${newScale})`);
    panel.dataset.currentScale = newScale; // Store current scale
    // ... update zoomValue display ...
    this.saveCurrentPageState();
}

handlePositionChange(btn, panel) {
    const img = panel.querySelector('img');
    if (!img) return;
    const stepSizeInput = document.querySelector('.step-size-input');
    let step = parseFloat(stepSizeInput?.value || '1');
    // ... validate step ...
    const currentLeft = parseFloat(img.style.left) || 50;
    const currentTop = parseFloat(img.style.top) || 50;
    // ... update img.style.left or img.style.top based on button clicked and step ...
    this.saveCurrentPageState();
}
```

## 9. Navbar and Navigation

### Right Sidebar - Background Settings (`#background-properties`):

-   **Activation:** This panel becomes visible when the "Backgrounds" tab is active (triggered by `updateRightSidebarView()`). Its content is generated/updated by `updateBackgroundControls()`.
-   **Controls Population:** The `updateBackgroundControls()` function dynamically generates the HTML for the controls. If the `#background-properties` div doesn't exist, it creates it.
-   **Functionality:**
    -   **Background Style:** Buttons (`.style-btn`) for predefined styles (Classic White, Vintage Paper, etc.). Clicking applies the corresponding class to the `#comic-canvas`, potentially removing any custom background image first. Updates the active state on the buttons.
    -   **Apply to All Pages:** A checkbox (`#use-global-background`) toggles whether the currently selected style (`this.globalBackgroundStyle`) should be applied to all pages (`this.useGlobalBackgroundStyle`). If checked, it iterates through `this.pages` and sets their `canvasBackgroundStyle`.
    -   **Background Image Controls (Conditional):** If the current page *has* a custom background image (`.canvas-background-image`), additional controls appear:
        -   **Apply This Image to All Pages:** Button (`#apply-custom-bg-all-btn`) calls `applyCustomBackgroundToAll()`. (Functionality of `applyCustomBackgroundToAll` not shown in snippets).
        -   **Position:** (If `backgroundElement` is passed to `updateBackgroundControls`) Step size input and position buttons allow moving the custom background image. *Note: The analysis didn't show how `backgroundElement` gets passed; likely requires selecting the background image itself, which might not be implemented.*
-   **State Saving:** Changes to background style, the 'Apply to All' checkbox, or background image properties trigger `this.saveCurrentPageState()`.

**JavaScript - Updating Background Controls Panel (`src/js/main.js` - `updateBackgroundControls`):**

```javascript
updateBackgroundControls(backgroundElement) { // backgroundElement might be null/undefined
    const propertiesPanel = document.querySelector('.properties-panel');
    if (!propertiesPanel) return;

    let bgProps = propertiesPanel.querySelector('#background-properties');
    if (!bgProps) { // Create if doesn't exist
        bgProps = document.createElement('div');
        bgProps.id = 'background-properties';
        bgProps.className = 'properties-section';
        propertiesPanel.appendChild(bgProps);
    }

    // Hide other sections
    propertiesPanel.querySelectorAll('.properties-section:not(#background-properties)')
       .forEach(sec => sec.style.display = 'none');

    const currentPage = this.pages[this.currentPageIndex];
    const hasCustomBackground = currentPage?.backgroundState?.imageId;

    // Dynamically generate innerHTML including conditional sections
    bgProps.innerHTML = `
        <h4>Background Settings</h4>
        <div class="panel-controls">
            <div class="control-group">
                <h4>Background Style</h4>
                <div class="background-styles">
                    <!-- Style buttons -->
                </div>
                <div class="global-background-control">
                    <input type="checkbox" id="use-global-background" ${this.useGlobalBackgroundStyle ? 'checked' : ''}>
                    <label for="use-global-background">Apply to all pages</label>
                </div>
            </div>
            ${hasCustomBackground ? `
            <div class="control-group">
                <h4>Background Image</h4>
                <button id="apply-custom-bg-all-btn">...</button>
                 ${backgroundElement ? `<!-- Position Controls -->` : ''}
            </div>
            ` : ''}
            ${!hasCustomBackground && !backgroundElement ? '<p>Drag an image to set a custom background.</p>' : ''}
        </div>`;

    bgProps.style.display = 'block';

    // Add listeners
    const globalBackgroundCheckbox = bgProps.querySelector('#use-global-background');
    if (globalBackgroundCheckbox) {
        globalBackgroundCheckbox.addEventListener('change', (e) => { /* update global style state, apply if needed, save state */ });
    }
    const applyCustomBgAllBtn = bgProps.querySelector('#apply-custom-bg-all-btn');
    if (applyCustomBgAllBtn) {
        applyCustomBgAllBtn.addEventListener('click', () => this.applyCustomBackgroundToAll());
    }
    const styleButtons = bgProps.querySelectorAll('.style-btn');
    styleButtons.forEach(btn => {
        btn.addEventListener('click', () => { /* apply style, remove custom bg if exists, update active btn, save state */ });
    });
     if (backgroundElement) {
         // Add listeners for position buttons if backgroundElement exists
     }

    // Set active state for current background style button
    // ...
}
```

### Right Sidebar - Sticker Settings (`#sticker-properties`):

-   **Activation:** This panel becomes visible when the "Stickers" tab is active *and* a specific sticker (`.canvas-sticker-image`) is selected (triggered by `selectSticker()` which calls `updateStickerControls()`).
-   **Controls Population:** The `updateStickerControls()` function dynamically generates the HTML. If the `#sticker-properties` div doesn't exist, it likely creates it (similar to background).
-   **Functionality:**
    -   **Delete Sticker:** A button (`.delete-sticker-btn`) removes the selected sticker element and its corresponding state from `pageState.stickerStates`.
    -   **Size:** A range slider (`.size-control`) and an editable value display (`.size-value`) control the sticker's width (height adjusts automatically for aspect ratio). The base size seems to be 100px, and the slider controls a percentage multiplier (stored in `stickerElement.dataset.size`). A "Reset Size" button (`.reset-size-btn`) reverts the size to 200% (200px).
    -   **Position:** Step size input and position buttons (`.position-btn`) modify the `top` and `left` *pixel* styles of the sticker element, moving it around the canvas. It includes logic to keep the sticker within the canvas boundaries.
-   **State Saving:** Changes to size or position, or deleting the sticker, trigger `this.saveCurrentPageState()`.

**JavaScript - Updating Sticker Controls Panel (`src/js/main.js` - `updateStickerControls`):**

```javascript
updateStickerControls(stickerElement) {
    const stickerPropsContainer = document.querySelector('.properties-panel'); // Assuming it adds to the main panel
    if (!stickerPropsContainer) return;

    // Find or create the specific sticker properties div
    let stickerProps = stickerPropsContainer.querySelector('#sticker-properties');
    if (!stickerProps) {
        stickerProps = document.createElement('div');
        stickerProps.id = 'sticker-properties';
        stickerProps.className = 'properties-section';
        stickerPropsContainer.appendChild(stickerProps);
    }

    // Hide other sections
    stickerPropsContainer.querySelectorAll('.properties-section:not(#sticker-properties)')
       .forEach(sec => sec.style.display = 'none');


    if (!stickerElement) {
        stickerProps.innerHTML = `<p>Select a sticker to see its properties.</p>`;
        stickerProps.style.display = 'block';
        return;
    }

    // Dynamically generate innerHTML
    stickerProps.innerHTML = `
        <h4>Sticker Settings</h4>
        <div class="panel-controls">
            <div class="control-group">
                <button class="danger-btn delete-sticker-btn">...</button>
                <div class="zoom-group"> <!-- Reused class name -->
                    <label>Size</label>
                    <input type="range" class="size-control" min="10" max="500" value="200">
                    <span class="size-value">200%</span>
                    <button class="reset-size-btn">...</button>
                </div>
            </div>
            <div class="control-group">
                <h4>Position</h4>
                <div class="step-size-control">...</div>
                <div class="position-controls">...</div>
            </div>
        </div>`;
    stickerProps.style.display = 'block';

    // Add Listeners
    const deleteBtn = stickerProps.querySelector('.delete-sticker-btn');
    if (deleteBtn) {
        deleteBtn.onclick = () => { /* remove element, remove from state, deselect, save state */ };
    }
    const sizeControl = stickerProps.querySelector('.size-control');
    const sizeValue = stickerProps.querySelector('.size-value');
    if (sizeControl) {
        // Set initial value from stickerElement.dataset.size
        // ...
        sizeControl.addEventListener('input', (e) => { /* update style width/height, update dataset, update value display, save state */ });
        this.makeSliderValueEditable(sizeControl, sizeValue, '%', 0);
    }
    const resetSizeBtn = stickerProps.querySelector('.reset-size-btn');
    if (resetSizeBtn) {
        resetSizeBtn.addEventListener('click', () => { /* reset style, dataset, controls, save state */ });
    }
    const positionBtns = stickerProps.querySelectorAll('.position-btn');
    positionBtns.forEach(btn => {
        btn.addEventListener('click', () => { /* read step, update style top/left (pixels), clamp to bounds, save state */ });
    });
}
```

**CSS - Properties Panel (`src/styles/main.css`):**

```css
/* Properties Panel Container */
.properties-panel {
    background: var(--card-bg);
    padding: 1rem;
    border-radius: 10px;
    box-shadow: 0 2px 4px var(--shadow-color);
    /* Ensures scrollbar appears within the panel */
    max-height: calc(100vh - 100px); /* Example max-height */
    overflow-y: auto;
}

/* Individual Settings Sections (Panel, Text, Background, Sticker) */
.properties-section {
    margin-bottom: 2rem;
}

.properties-section h4 {
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}

/* Controls within a section */
.panel-controls { /* Often used as a wrapper within properties sections */
     display: flex;
     flex-direction: column;
     gap: 1.5rem; /* Spacing between control groups */
}

.control-group {
    /* Styles for grouping label and input/buttons */
}

.control-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
}

/* Specific Controls (Zoom, Position, Color Pickers etc.) */
.zoom-group, .step-size-control, .position-controls, .color-picker-container {
    /* Styles for layout */
}
/* ... other specific control styles ... */
```

## 10. State Management: Saving and Loading Backgrounds, Stickers, and Panels

### Overview:
The application maintains state for each page, including panels, backgrounds, stickers, and text elements. The state is managed through the `saveCurrentPageState()` method, which is called after any significant change to the page content.

### State Structure:
Each page in the `pages` array contains:
- `layout`: The ID of the selected layout
- `panelStates`: Array of states for each panel
- `stickerStates`: Array of states for stickers on the canvas
- `canvasBackgroundStyle`: The current background style/image

### Panel State:
Each panel's state includes:
```javascript
{
    backgroundStyle: 'classic-white', // Default or custom background style
    imageId: '...', // ID of the image in the panel (if present)
    transform: 'translate(-50%, -50%) scale(1)', // Image transformation
    left: '50%', // Image horizontal position
    top: '50%', // Image vertical position
    initialScale: '1', // Initial image scale
    currentScale: '1', // Current image scale
    textElements: [] // Array of text elements in the panel
}
```

### Text Element State:
Text elements within panels are saved with detailed styling information:
```javascript
{
    id: 'text_timestamp_random',
    bubbleType: 'speech-bubble', // or other bubble types
    tailPosition: 'bottom-left', // Position of speech bubble tail
    content: '...', // The actual text content
    style: {
        left: '...', // Position
        top: '...',
        width: '...', // Optional dimensions
        height: '...',
        transform: '...', // For rotation
        backgroundColor: '...',
        bubbleBackgroundColor: 'white',
        fontFamily: '...',
        fontSize: '...',
        // ... other text styling properties
    }
}
```

### Background Management:
- Global background settings are tracked through:
  - `useGlobalBackgroundStyle`: Boolean flag for global background
  - `globalBackgroundStyle`: The style to apply globally
- Per-page background state includes:
  - Custom background images (stored in `backgroundState`)
  - Background style settings
  - Background-specific text elements

### State Saving Triggers:
The state is automatically saved after:
- Adding/removing images to panels
- Modifying text elements
- Changing background styles
- Adjusting sticker positions
- Modifying panel layouts
- Any drag-and-drop operation

### Loading State:
When navigating between pages or loading a saved comic:
1. The layout is recreated based on the saved layout ID
2. Panel states are restored, including images and their transformations
3. Text elements are reconstructed with their saved styles and positions
4. Background styles and images are applied
5. Stickers are repositioned on the canvas

This comprehensive state management system ensures that all aspects of the comic page are preserved and can be accurately restored when needed. 