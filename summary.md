# Comic Book Maker - Functionality Summary

This document provides a detailed summary of specific functionalities within the Comic Book Maker application, including relevant code snippets and design considerations.

## 1. Tabs (Background, Sticker, Panel) & Drag-and-Drop

### Functionality:

-   The editor features a left sidebar with three tabs: "Panels", "Backgrounds", and "Stickers".
-   Clicking a tab changes the `currentSidebarMode` in the JavaScript, which controls the behavior of subsequent actions, particularly drag-and-drop.
-   The sidebar displays uploaded images in a thumbnail grid (`#editor-thumbnails`).
-   Users can drag images from the thumbnail grid onto the main canvas (`#comic-canvas`).
-   The drop behavior depends on the active tab:
    -   **Panels Mode:** Images can only be dropped onto designated comic panels (`div.comic-panel`). The image replaces any existing image in that panel.
    -   **Backgrounds Mode:** Images can be dropped anywhere on the canvas and become the background for the *current page*.
    -   **Stickers Mode:** Images can be dropped anywhere on the canvas and are added as draggable/resizable stickers on top of panels and backgrounds.

### Design (`main.css`):

-   The tabs are styled using `.sidebar-tabs`, `.tab-btn`, and `.tab-btn.active`. They use flexbox for layout and have distinct styles for hover and active states.
-   The sidebar content area (`.sidebar-content`) holds the image thumbnails (`.thumbnails-grid`).
-   When dragging an image, the `.dragging` class is applied to the thumbnail.
-   When dragging over a valid drop target (a panel in "Panels" mode), the target element gets the `.drop-target` class for visual feedback (e.g., a border highlight).

### Code Snippets:

**HTML Structure (`index.html` - relevant part):**

```html
<!-- Left Sidebar: Image Library -->
<div class=\"editor-sidebar\">
    <!-- Add Tab Structure -->
    <div class=\"sidebar-tabs\">
        <button class=\"tab-btn active\" data-tab=\"panels\">Panels</button>
        <button class=\"tab-btn\" data-tab=\"backgrounds\">Backgrounds</button>
        <button class=\"tab-btn\" data-tab=\"stickers\">Stickers</button>
    </div>
    <div class=\"sidebar-content\">
        <!-- Image Library (now within content area) -->
        <h3>Your Images</h3>
        <div id=\"editor-thumbnails\" class=\"thumbnails-grid\"></div>
    </div>
</div>

<!-- Main Canvas Area -->
<div class=\"comic-canvas-container\">
    <div id=\"comic-canvas\">
        <!-- Panels will be dynamically added here -->
    </div>
</div>
```

**JavaScript - Tab Switching (`src/js/main.js` - `setupSidebarTabs`):**

```javascript
setupSidebarTabs() {
    const tabsContainer = document.querySelector('.sidebar-tabs');
    if (!tabsContainer) return;

    tabsContainer.addEventListener('click', (e) => {
        const clickedTab = e.target.closest('.tab-btn');
        if (!clickedTab) return;

        const newMode = clickedTab.dataset.tab;
        if (newMode === this.currentSidebarMode) return; // Do nothing if clicking the active tab

        // Update the active tab visually
        tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        // Update the internal mode state
        this.currentSidebarMode = newMode;
        console.log('Switched sidebar mode to:', this.currentSidebarMode);

        // Update the right sidebar based on the selected mode
        this.updateRightSidebarView();

        // Deselect any currently selected item when switching modes
        this.deselectAll();
    });
}
```

**JavaScript - Canvas Drop Handling (`src/js/main.js` - `canvas.addEventListener('drop', ...)`):**

```javascript
canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    console.log('[Canvas Drop] Drop event detected.');

    let imageId = e.dataTransfer.getData('image/id') || /* ... other formats ... */;

    if (!imageId) {
        console.log('[Canvas Drop] No image/id found in dataTransfer. Exiting.');
        return;
    }

    const image = this.uploadedImages.find(img => String(img.id) === imageId);
    if (!image) {
         console.error('[Canvas Drop] Image not found for ID:', imageId);
         return;
    }

    const panel = e.target.closest('.comic-panel');
    console.log('[Canvas Drop] Target panel (if any):', panel);
    console.log('[Canvas Drop] Current sidebar mode:', this.currentSidebarMode);

    // Handle drop based on current sidebar mode
    switch (this.currentSidebarMode) {
        case 'panels':
            if (panel) {
                panel.classList.remove('drop-target');
                console.log('Mode: Panels - Dropped image ID:', imageId, 'onto panel');
                this.addImageToPanel(panel, image);
            } else {
                console.log('Mode: Panels - Drop outside panel ignored.');
            }
            break;

        case 'backgrounds':
            console.log('Mode: Backgrounds - Dropped image ID:', imageId, 'onto canvas');
            this.addBackgroundImage(image);
            if (panel) panel.classList.remove('drop-target');
            break;

        case 'stickers':
            console.log('Mode: Stickers - Dropped image ID:', imageId, 'onto canvas');
            this.addSticker(image, e.clientX, e.clientY);
            if (panel) panel.classList.remove('drop-target');
            break;

        default:
            console.warn('Unknown sidebar mode:', this.currentSidebarMode);
    }
});
```

**CSS - Tabs (`src/styles/main.css`):**

```css
/* Sidebar Tabs */
.sidebar-tabs {
    display: flex;
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--border-color);
}

.tab-btn {
    flex: 1;
    padding: 0.5rem 0.2rem;
    background: var(--card-bg);
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: bold;
    text-align: center;
    transition: all 0.2s ease;
    text-transform: uppercase;
}

.tab-btn:hover {
    color: var(--text-color);
    background: var(--hover-color);
}

.tab-btn.active {
    color: var(--text-bright);
    background: var(--input-bg);
    border-bottom-color: var(--primary-color);
}

/* Style the content area within the sidebar */
.sidebar-content {
    /* ... */
}

.sidebar-content .thumbnails-grid {
    max-height: calc(100vh - 250px); /* Adjust based on header/tabs height */
}
```

## 2. Add Text and Boundaries

### Functionality:

-   Text can be added in two ways:
    -   **Inside a Panel:** Clicking the "Add Text" button (`#add-text-btn`) when a panel is selected calls `addTextToPanel(panel)`. This creates a `.text-bubble` element *inside* the selected `.comic-panel`.
    -   **Directly on Canvas:** Clicking the "Add Text" button when *no* panel is selected (or when in Backgrounds/Stickers mode?) calls `addTextToCanvas()`. This creates a `.text-bubble` element as a direct child of the `#comic-canvas`.
-   Each `.text-bubble` contains an editable `div.text-content`, drag/resize handles, and format/delete buttons.
-   **Boundaries:**
    -   **Panel Text:** Draggable text bubbles added via `addTextToPanel` are constrained *within the boundaries of their parent panel*. The `makeTextDraggable` function calculates boundaries based on the panel's dimensions.
    -   **Canvas Text:** Draggable text bubbles added via `addTextToCanvas` are constrained *within the boundaries of the main canvas* (`#comic-canvas`). The `makeCanvasTextDraggable` function calculates boundaries based on the canvas's dimensions, using pixel values for positioning.
-   Text bubbles created for backgrounds (presumably via `addTextToCanvas` when in Backgrounds mode) have a lower `z-index` (5) than those for panels/stickers (100), making them appear underneath panels and stickers.

### Design (`main.css`):

-   Text bubbles have base styles defined by `.text-bubble`.
-   Different bubble types (e.g., `.speech-bubble`, `.thought-bubble`) add specific border-radius, background, and pseudo-elements (`::before`, `::after`) for tails.
-   The selected text bubble gets the `.selected-text` class, highlighting it with a distinct border and glow.
-   The `.text-properties` section in the right sidebar becomes visible when a text bubble is selected, allowing font, size, color, etc., adjustments.

### Code Snippets:

**JavaScript - Add Text to Panel (`src/js/main.js` - `addTextToPanel`):**

```javascript
addTextToPanel(panel) {
    // Create text container with default speech bubble
    const textId = `text_${Date.now()}`;
    const textContainer = document.createElement('div');
    textContainer.className = 'text-bubble speech-bubble';
    textContainer.id = textId;
    textContainer.dataset.bubbleType = 'speech-bubble';
    textContainer.style.position = 'absolute';
    // Position near panel center initially (using px relative to panel)
    const initialLeft = Math.max(0, (panel.clientWidth / 2) - 50);
    const initialTop = Math.max(0, (panel.clientHeight / 2) - 25);
    textContainer.style.left = `${initialLeft}px`;
    textContainer.style.top = `${initialTop}px`;
    textContainer.style.minWidth = '100px';
    textContainer.style.zIndex = '10'; // High z-index for panel text

    // Create editable text element
    const textElement = document.createElement('div');
    textElement.className = 'text-content';
    textElement.contentEditable = true;
    textElement.innerHTML = 'Click to edit text';
    // ... add controls (drag, resize, format, delete) ...

    panel.appendChild(textContainer);

    // Make draggable within panel boundaries
    this.makeTextDraggable(textContainer, dragHandle); // Uses panel boundaries

    // Make resizable
    this.makeTextResizable(textContainer, resizeHandle);

    // ... event listeners for controls and selection ...

    this.selectTextBox(textContainer);
    return textContainer;
}
```

**JavaScript - Add Text to Canvas (`src/js/main.js` - `addTextToCanvas`):**

```javascript
addTextToCanvas() {
    const canvas = document.querySelector('#comic-canvas');
    if (!canvas) return;

    // Determine z-index based on current mode
    const zIndex = this.currentSidebarMode === 'backgrounds' ? '5' : '100';

    // Create text container
    const textId = `canvas_text_${Date.now()}`;
    const textContainer = document.createElement('div');
    textContainer.className = 'text-bubble speech-bubble'; // Default style
    textContainer.id = textId;
    textContainer.dataset.bubbleType = 'speech-bubble';
    textContainer.style.position = 'absolute';
    // Position near canvas center initially (using px relative to canvas)
    const canvasRect = canvas.getBoundingClientRect();
    const initialLeft = Math.max(0, (canvasRect.width / 2) - 50);
    const initialTop = Math.max(0, (canvasRect.height / 2) - 25);
    textContainer.style.left = `${initialLeft}px`;
    textContainer.style.top = `${initialTop}px`;
    textContainer.style.minWidth = '100px';
    textContainer.style.zIndex = zIndex; // Set z-index based on mode

    // Create editable text element
    const textElement = document.createElement('div');
    textElement.className = 'text-content';
    textElement.contentEditable = true;
    textElement.innerHTML = 'Click to edit text';
    // ... add controls (drag, resize, format, delete) ...

    canvas.appendChild(textContainer); // Append directly to canvas

    // Make draggable within canvas boundaries
    this.makeCanvasTextDraggable(textContainer, dragHandle); // Uses canvas boundaries

    // Make resizable
    this.makeTextResizable(textContainer, resizeHandle);

    // ... event listeners for controls and selection ...

    this.selectTextBox(textContainer);
    this.saveCurrentPageState();
    return textContainer;
}
```

**JavaScript - Text Dragging within Panel (`src/js/main.js` - `makeTextDraggable` relevant part):**

```javascript
// Inside onMouseMove for makeTextDraggable (Panel Text)
const panel = element.parentElement;
const percentX = (deltaX / panel.offsetWidth) * 100;
const percentY = (deltaY / panel.offsetHeight) * 100;
let newLeft = startLeft + percentX;
let newTop = startTop + percentY;
// ... calculate boundaries based on elementWidth/Height and panelRect ...
// Apply boundaries
newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
newTop = Math.max(minTop, Math.min(newTop, maxTop));
element.style.left = `${newLeft}%`; // Position using percentage
element.style.top = `${newTop}%`;
```

**JavaScript - Text Dragging on Canvas (`src/js/main.js` - `makeCanvasTextDraggable` relevant part):**

```javascript
// Inside onMouseMove for makeCanvasTextDraggable (Canvas Text)
const dx = e.clientX - startX;
const dy = e.clientY - startY;
let desiredCanvasX = originalX + dx;
let desiredCanvasY = originalY + dy;
// Clamp the desired position to stay within the canvas padding box boundaries
const clampedCanvasX = Math.max(0, Math.min(desiredCanvasX, canvasPaddingBoxWidth - elementWidth));
const clampedCanvasY = Math.max(0, Math.min(desiredCanvasY, canvasPaddingBoxHeight - elementHeight));
// Apply the clamped, canvas-relative position
element.style.left = `${clampedCanvasX}px`; // Position using pixels
element.style.top = `${clampedCanvasY}px`;
```

**CSS - Basic Text Bubble (`src/styles/main.css`):**

```css
.text-bubble {
    position: absolute;
    border: 2px solid #000;
    border-radius: 20px;
    cursor: grab;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
    user-select: none;
    /* ... other styles ... */
    --bubble-background-color: white; /* Customizable background */
}

.text-content {
    position: relative;
    z-index: 2;
    text-align: center;
    /* ... other styles ... */
    cursor: text;
}

.selected-text {
    border: 3px solid #ffcc00 !important;
    z-index: 100;
    box-shadow: 0 0 10px rgba(255, 204, 0, 0.5), 0 0 0 2px rgba(255, 204, 0, 0.3);
    /* ... other styles ... */
}
```

## 3. Layout Types

### Functionality:

-   Layout types are defined as objects within the `layouts` export in `src/js/layouts.js`.
-   Each layout object has:
    -   `name`: A user-friendly name (e.g., "Classic 2×2 Grid").
    -   `description`: A brief description.
    -   `panels`: An array of panel definition objects.
-   Each panel definition object specifies its position and size within the canvas using percentage-based coordinates:
    -   `x`: Left offset percentage.
    -   `y`: Top offset percentage.
    -   `width`: Width percentage.
    -   `height`: Height percentage.
-   The application uses these definitions to dynamically create the `.comic-panel` elements on the `#comic-canvas` when a layout is selected or a page is loaded.

### Design (`main.css`):

-   The layout selection screen (`#layout-page`) displays previews using the `.layout-grid` container.
-   Each option (`.layout-option`) shows a miniature preview (`.layout-preview`) composed of `.preview-panel` divs styled to mimic the actual layout structure.
-   Specific classes like `.grid-2x2`, `.grid-1x2` might be used on the `.layout-preview` element for styling previews, although the primary panel creation relies on the JavaScript definitions.

### Code Snippets:

**JavaScript - Layout Definitions (`src/js/layouts.js` - examples):**

```javascript
export const layouts = {
    'single': {
        name: 'Single Panel',
        description: 'One large panel for a single scene',
        panels: [
            { x: 0, y: 0, width: 100, height: 100 }
        ]
    },
    'four-grid': {
        name: 'Classic 2×2 Grid',
        description: 'Traditional four-panel comic layout',
        panels: [
            { x: 0, y: 0, width: 49, height: 49 }, // Using 49/51 for spacing
            { x: 51, y: 0, width: 49, height: 49 },
            { x: 0, y: 51, width: 49, height: 49 },
            { x: 51, y: 51, width: 49, height: 49 }
        ]
    },
    'manga-style': {
        name: 'Manga Style',
        description: 'Asymmetrical manga-inspired layout',
        panels: [
            { x: 0, y: 0, width: 60, height: 100 },
            { x: 62, y: 0, width: 38, height: 49 }, // Adjusted for gap
            { x: 62, y: 51, width: 38, height: 49 }  // Adjusted for gap
        ]
    },
    // ... many other layouts ...
};
```

**JavaScript - Creating Panels (`src/js/main.js` - `createComic` relevant part):**

```javascript
createComic(layout = null) {
    const canvas = document.getElementById('comic-canvas');
    canvas.innerHTML = ''; // Clear previous panels

    const useLayout = layout || this.layouts[this.selectedLayout]; // Use provided or selected layout

    if (!useLayout || !useLayout.panels) {
        console.error('Invalid layout selected or layout has no panels:', useLayout);
        return;
    }

    useLayout.panels.forEach((panelData, index) => {
        const panel = document.createElement('div');
        panel.className = 'comic-panel';
        panel.id = `panel-${index}`;
        panel.style.left = `${panelData.x}%`;
        panel.style.top = `${panelData.y}%`;
        panel.style.width = `${panelData.width}%`;
        panel.style.height = `${panelData.height}%`;
        panel.tabIndex = 0; // Make panel focusable
        canvas.appendChild(panel);
    });

    // Re-apply background image if it exists for the current page state
    const currentPage = this.pages[this.currentPageIndex];
    if (currentPage && currentPage.backgroundState && currentPage.backgroundState.imageId) {
        // Code to re-add the background image element...
    }

    // Re-add stickers if they exist for the current page state
    if (currentPage && currentPage.stickerStates) {
         // Code to re-add sticker elements...
    }

    // Re-add canvas text elements if they exist for the current page state
    if (currentPage && currentPage.canvasTextStates) {
        // Code to re-add canvas text elements...
    }

    // Deselect any previously selected panel or text
    this.deselectAll();
}
```

**CSS - Comic Panel (`src/styles/main.css`):**

```css
.comic-panel {
    position: absolute; /* Positioned by JS using % */
    background: transparent;
    border: 3px solid #000000;
    overflow: hidden;
    transition: all 0.3s ease;
    user-select: none;
}

.comic-panel:not(.has-image) {
    background: #E0E0E0; /* Placeholder background */
}

.comic-panel.selected {
    border-color: #FF0000; /* Red border when selected */
}
```

## 4. Navbar and Navigation

### Functionality:

-   The "navbar" is part of the `.editor-header` div.
-   It contains:
    -   A "Back to Layouts" button (`#back-to-layout`).
    -   Editor tools (`.editor-tools`) like "Add Text", "Save", "Download".
    -   A dynamic page navigation section (`.page-navigation`).
-   The page navigation section is added dynamically by `setupPageNavigation` and includes:
    -   Page indicator (`.page-indicator`) showing "Page X of Y".
    -   Previous/Next page buttons (`#prevPage`, `#nextPage`).
    -   A page number input (`#pageNumberInput`) and a "GO" button (`#goToPage`) to jump directly to a specific page.
    -   Buttons for adding (`#addPage`), deleting (`#deletePage`), and reordering (`#reorderPagesBtn`) pages.
-   Clicking navigation buttons (Prev, Next, GO) calls `navigateToPage(index)`, which saves the current page's state (`saveCurrentPageState`), updates the `currentPageIndex`, and loads the new page's state (`loadPageState`).

### Design (`main.css`):

-   The `.editor-header` uses flexbox to position the back button, tools, and page navigation.
-   The `.page-navigation` itself likely uses flexbox or grid to arrange its controls (`.page-controls`, `.page-actions`).
-   The input field (`.page-number-input`) and buttons (`.tool-btn`, `.primary-btn`, `.danger-btn`) have specific styles for appearance, borders, background colors, and hover states. Notably, the navigation buttons use inline styles in the JS, which might override some CSS rules.

### Code Snippets:

**HTML Structure (`index.html` - relevant part):**

```html
<div class=\"editor-header\">
    <button class=\"back-btn\" id=\"back-to-layout\">
        <i class=\"fas fa-arrow-left\"></i> Back to Layouts
    </button>
    <div class=\"editor-tools\">
        <button id=\"add-text-btn\" class=\"tool-btn\">...</button>
        <button id=\"save-project-btn\" class=\"tool-btn\">...</button>
        <button id=\"download-btn\" class=\"tool-btn\">...</button>
        <!-- Page Navigation is dynamically added here by JS -->
    </div>
</div>
```

**JavaScript - Setting up Navigation (`src/js/main.js` - `setupPageNavigation`):**

```javascript
setupPageNavigation() {
    const pageNavigation = document.createElement('div');
    pageNavigation.className = 'page-navigation';
    // Uses innerHTML to create buttons, input, indicator etc.
    // (See previous analysis for the innerHTML content)
    pageNavigation.innerHTML = ` ... HTML for nav controls ... `;

    const editorHeader = document.querySelector('.editor-header');
    editorHeader.appendChild(pageNavigation);

    // Add event listeners for the new buttons/input
    const prevPageBtn = pageNavigation.querySelector('#prevPage');
    const nextPageBtn = pageNavigation.querySelector('#nextPage');
    const pageNumberInput = pageNavigation.querySelector('#pageNumberInput');
    const goToPageBtn = pageNavigation.querySelector('#goToPage');
    const addPageBtn = pageNavigation.querySelector('#addPage');
    const deletePageBtn = pageNavigation.querySelector('#deletePage');
    const reorderPagesBtn = pageNavigation.querySelector('#reorderPagesBtn');

    prevPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex - 1));
    nextPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex + 1));

    const handlePageNavigation = () => {
        const pageNum = parseInt(pageNumberInput.value);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.pages.length) {
            this.navigateToPage(pageNum - 1);
        } else {
            pageNumberInput.value = this.currentPageIndex + 1; // Reset if invalid
        }
    };

    goToPageBtn.addEventListener('click', handlePageNavigation);
    pageNumberInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePageNavigation();
    });
    pageNumberInput.addEventListener('blur', handlePageNavigation); // Navigate on blur too

    addPageBtn.addEventListener('click', () => this.showLayoutSelection());
    deletePageBtn.addEventListener('click', () => this.deleteCurrentPage());
    reorderPagesBtn.addEventListener('click', () => this.reorderPages());

    // Initial update
    this.updatePageIndicator();
    this.updateNavigationButtons();
}
```

**JavaScript - Navigating Pages (`src/js/main.js` - `navigateToPage`):**

```javascript
navigateToPage(pageIndex, saveCurrentState = true) {
    if (pageIndex < 0 || pageIndex >= this.pages.length) {
        console.error('Invalid page index:', pageIndex);
        return;
    }
    console.log(`Navigating from page ${this.currentPageIndex} to page ${pageIndex}`);

    if (saveCurrentState) {
        console.log(`Saving state of current page ${this.currentPageIndex}`);
        this.saveCurrentPageState();
    }

    this.currentPageIndex = pageIndex;
    this.loadPageState(pageIndex); // Load panels, images, text for the new page
    this.updatePageIndicator();   // Update "Page X of Y" text
    this.updateNavigationButtons(); // Enable/disable Prev/Next buttons
}
```

**CSS - Editor Header & Navigation (`src/styles/main.css`):**

```css
.editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: var(--card-bg);
    /* ... other header styles ... */
}

.editor-tools {
    display: flex;
    gap: 1rem;
}

.page-navigation {
    /* Likely uses flexbox, styles defined in CSS */
    display: flex;
    align-items: center;
    gap: 1rem; /* Example */
}

.page-controls {
    /* Styles for grouping indicator, input, arrows */
    display: flex;
    align-items: center;
    gap: 0.5rem; /* Example */
}

.page-indicator {
    font-size: 1rem;
    font-weight: bold;
    /* ... */
}

.page-number-input {
    width: 50px; /* Example width */
    text-align: center;
    /* ... other input styles ... */
    /* Note: Inline styles in JS might override these */
}

.page-actions {
    /* Styles for Add/Delete/Reorder buttons */
    display: flex;
    gap: 0.5rem; /* Example */
}

/* General Button Styles (examples) */
.tool-btn { /* Used for Prev/Next/Go/Reorder */
    /* ... base button styles ... */
     /* Note: Inline styles in JS might override these */
}

.primary-btn { /* Used for Add Page */
    /* ... primary action styles ... */
}

.danger-btn { /* Used for Delete Page */
    /* ... danger action styles ... */
}
```

### Right Sidebar Integration:

-   The `updateRightSidebarView()` function determines which properties panel to show based on the `currentSidebarMode` and whether an item (panel, sticker) is currently selected (`this.currentPanel`, `this.currentSticker`).
-   If the "Panels" tab is active and a panel is selected, `updatePanelControls()` populates the `#panel-properties` div.
-   If the "Backgrounds" tab is active, `updateBackgroundControls()` populates the `#background-properties` div (dynamically created if it doesn't exist).
-   If the "Stickers" tab is active and a sticker is selected, `updateStickerControls()` populates the `#sticker-properties` div (also created dynamically if needed).
-   When a text bubble is selected (regardless of the sidebar tab), `selectTextBox()` calls `updateTextProperties()` which populates the `#text-properties` div.

**JavaScript - Sidebar View Logic (`src/js/main.js` - `updateRightSidebarView`):**

```javascript
updateRightSidebarView() {
    const propertiesPanel = document.querySelector('.properties-panel');
    if (!propertiesPanel) return;

    // Hide all potential sections first
    const panelProps = propertiesPanel.querySelector('#panel-properties');
    const textProps = propertiesPanel.querySelector('#text-properties');
    const backgroundProps = propertiesPanel.querySelector('#background-properties');
    const stickerProps = propertiesPanel.querySelector('#sticker-properties');

    if (panelProps) panelProps.style.display = 'none';
    if (textProps) textProps.style.display = 'none';
    if (backgroundProps) backgroundProps.style.display = 'none';
    if (stickerProps) stickerProps.style.display = 'none';

    // Show the relevant section based on mode AND current selection
    switch (this.currentSidebarMode) {
        case 'panels':
            console.log("Right sidebar: Panels tab active.");
            if (this.currentPanel) { // Show only if a panel is selected
                this.updatePanelControls(this.currentPanel);
                if (panelProps) panelProps.style.display = 'block';
            } else { // Show placeholder if no panel selected
                // ... (placeholder HTML) ...
                if (panelProps) panelProps.style.display = 'block';
            }
            break;
        case 'backgrounds':
             console.log("Right sidebar: Backgrounds tab active.");
             // Always show background controls when this tab is active
             this.updateBackgroundControls(this.currentBackground);
             if (backgroundProps) backgroundProps.style.display = 'block';
            break;
        case 'stickers':
             console.log("Right sidebar: Stickers tab active.");
             if (this.currentSticker) { // Show only if a sticker is selected
                 this.updateStickerControls(this.currentSticker);
                 if (stickerProps) stickerProps.style.display = 'block';
             } else { // Show placeholder if no sticker selected
                 // ... (placeholder HTML) ...
                 if (stickerProps) stickerProps.style.display = 'block';
             }
            break;
        default:
             console.warn("Unknown sidebar mode:", this.currentSidebarMode);
    }
    // Note: Text properties visibility is handled separately by selectTextBox/deselectAll
}
```

## 2. Add Text and Boundaries

### Right Sidebar - Text Settings (`#text-properties`):

-   **Activation:** This panel becomes visible when a text bubble (`.text-bubble`) is selected (triggered by `selectTextBox()` which calls `updateTextProperties()`). It's hidden on deselection (`deselectAll()`) or when switching sidebar tabs.
-   **Controls Population:** The `updateTextProperties()` function dynamically generates the HTML for the controls within `#text-properties`.
-   **Functionality:**
    -   **Bubble Style:** A dropdown (`select.bubble-type`) allows changing the bubble's appearance (Speech, Thought, Caption, Shout, Whisper) by adding/removing corresponding CSS classes (`.speech-bubble`, `.thought-bubble`, etc.) to the text bubble element.
    -   **Font Family:** A dropdown (`select.font-family`) populated with various fonts (grouped by category). Changes `textElement.style.fontFamily`.
    -   **Font Size:** A range slider (`input.font-size`) controls `textElement.style.fontSize`. Displays the current size (e.g., "16px").
    -   **Text Color:** A color picker (`input.font-color`) and an editable hex display (`.font-color-hex`) control `textElement.style.color`.
    -   **Bubble Color:** A color picker (`input.bubble-color`) and an editable hex display (`.bubble-color-hex`) control the bubble's background color (via `textBox.style.backgroundColor` and the `--bubble-background-color` CSS variable).
    -   **Text Style:** Buttons (`.bold-btn`, `.italic-btn`, `.underline-btn`) toggle `fontWeight`, `fontStyle`, and `textDecoration` on the `textElement`. (Implementation details for toggling might be in the popup logic, not shown in `updateTextProperties`).
    -   **Rotation:** A range slider (`input.rotation`) controls the `rotate()` value in the `textBox.style.transform`. Displays the current angle (e.g., "0°").
-   **State Saving:** Every control change within this panel immediately triggers `this.saveCurrentPageState()` to persist the modification.

**HTML Structure (`index.html` - text properties part):**

```html
<div id="text-properties" class="properties-section" style="display: none;">
    <h4>Text Settings</h4>
    <div class="text-controls">
        <!-- Controls are dynamically added here by updateTextProperties -->
        <!-- Example structure from JS (simplified): -->
        <div class="control-group">
            <label>Bubble Style</label>
            <select class="bubble-type">...</select>
        </div>
        <div class="control-group">
            <label>Font</label>
            <select class="font-family">...</select>
        </div>
        <div class="control-group">
            <label>Size</label>
            <input type="range" class="font-size" min="8" max="36" value="16">
            <span class="font-size-value">16px</span>
        </div>
        <div class="control-group">
            <label>Text Color</label>
            <input type="color" class="font-color" value="#000000">
            <div class="hex-display font-color-hex">#000000</div>
        </div>
        <div class="control-group">
            <label>Bubble Color</label>
            <input type="color" class="bubble-color" value="#ffffff">
            <div class="hex-display bubble-color-hex">#ffffff</div>
        </div>
        <div class="control-group">
            <label>Text Style</label>
            <div class="text-style-buttons">
                <button class="style-btn bold-btn">...</button>
                <button class="style-btn italic-btn">...</button>
                <button class="style-btn underline-btn">...</button>
            </div>
        </div>
         <div class="control-group">
            <label>Rotation</label>
            <input type="range" class="rotation" min="-180" max="180" value="0">
            <span class="rotation-value">0°</span>
        </div>
    </div>
</div>
```

**JavaScript - Updating Text Properties Panel (`src/js/main.js` - `updateTextProperties`):**

```javascript
updateTextProperties(textBox) {
    const textProperties = document.getElementById('text-properties');
    // Dynamically sets innerHTML with controls (sliders, dropdowns, color pickers)
    textProperties.innerHTML = `... HTML for controls ...`;

    // Get references to the newly created controls
    const bubbleType = textProperties.querySelector('.bubble-type');
    const fontFamily = textProperties.querySelector('.font-family');
    const fontSize = textProperties.querySelector('.font-size');
    const fontColor = textProperties.querySelector('.font-color');
    const bubbleColor = textProperties.querySelector('.bubble-color');
    const rotation = textProperties.querySelector('.rotation');
    // ... other controls ...

    // Set initial values of controls based on selected text box's current style/data
    const textElement = textBox.querySelector('.text-content');
    const computedStyle = window.getComputedStyle(textElement);
    // ... code to read styles and set initial control values ...
    bubbleType.value = textBox.dataset.bubbleType || 'speech-bubble';
    fontFamily.value = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '') || 'Arial';
    // ... etc. ...

    // Add event listeners to each control
    bubbleType.addEventListener('change', () => { /* update bubble class, save state */ });
    fontFamily.addEventListener('change', () => { /* update style, save state */ });
    fontSize.addEventListener('input', () => { /* update style, update value display, save state */ });
    fontColor.addEventListener('input', () => { /* update style, update hex display, save state */ });
    bubbleColor.addEventListener('input', () => { /* update style & CSS var, update hex, save state */ });
    rotation.addEventListener('input', () => { /* update transform, update value display, save state */ });
    // ... listeners for hex input, style buttons ...

    // Make the properties panel visible
    textProperties.style.display = 'block';

    // Ensure other properties panels are hidden (though updateRightSidebarView handles most cases)
    document.getElementById('panel-properties').style.display = 'none';
    const backgroundProps = document.getElementById('background-properties');
    if (backgroundProps) backgroundProps.style.display = 'none';
     const stickerProps = document.getElementById('sticker-properties');
    if (stickerProps) stickerProps.style.display = 'none';
}
```

## 3. Layout Types

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

## 4. Navbar and Navigation

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

## 3. State Management: Saving and Loading Backgrounds, Stickers, and Panels

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