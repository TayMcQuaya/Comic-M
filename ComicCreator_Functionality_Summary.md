# Codebase Functionality Summary

This document outlines the primary UI and canvas functionalities managed by `main.js` and its various modules (`UIManager.js`, `PanelManager.js`, `BackgroundManager.js`, `StickerManager.js`, `TextManager.js`, etc.).

## I. Core Application Structure (`main.js` - `ComicCreator` Class)

The `ComicCreator` class in `main.js` is the central hub of the application.

*   **Initialization:**
    *   Sets up initial page structure (`this.pages`).
    *   Stores available layouts (`this.layouts`).
    *   Sets the default sidebar mode (`this.currentSidebarMode = 'panels'`).
    *   Initializes all manager classes (e.g., `PanelManager`, `BackgroundManager`, `UIManager`, `ImageLibrary`, `TextManager`, `StickerManager`, `HistoryManager`, `ExportManager`, `AutoSaveManager`, etc.), passing a reference of itself (`this`) to them, allowing them to communicate back and access shared data or functionalities.
*   **Setup Routines:** Calls various `setup...` methods to:
    *   Initialize the image upload area.
    *   Set up the layout selection grid and filters.
    *   Configure the main comic editor canvas (`#comic-canvas`) with event listeners for drag & drop, clicks (for selection), and keyboard events (like Delete key, Ctrl+Z for undo).
    *   Set up general event listeners for UI navigation buttons.
    *   Initialize project controls (save, load, new project).
    *   Initialize basic UI elements like page navigation.
    *   Calls `this.uiManager.setupSidebarTabs()` to enable tab switching.
    *   Initializes `HistoryManager` and `AutoSaveManager`.
*   **State Management:**
    *   `saveCurrentPageState()`: A crucial method that gathers state from various managers (`PanelManager`, `TextManager`, `StickerManager`, `BackgroundManager`) and combines it into a snapshot for the current page. This is used for history, page navigation, and project saving.
    *   `loadPageState()`: Reloads a page based on its saved state. This involves:
        *   Clearing the canvas.
        *   Re-creating the comic layout using `PanelManager`.
        *   Loading background (style or image) using `BackgroundManager`.
        *   Restoring panel images and their transformations using `PanelManager`.
        *   Restoring text elements (in panels and on canvas) using `TextManager`.
        *   Restoring stickers using `StickerManager`.
*   **Canvas Interactions (Delegated to Managers):**
    *   **Drag and Drop:** The canvas listens for drop events. Depending on the `currentSidebarMode`:
        *   `panels`: If an image is dropped on a `.comic-panel`, `PanelManager.addImageToPanel()` is called.
        *   `backgrounds`: If an image is dropped anywhere on the canvas, `BackgroundManager.addBackgroundImage()` is called.
        *   `stickers`: If an image is dropped anywhere on the canvas, `StickerManager.addSticker()` is called.
    *   **Click for Selection:** Clicking on the canvas can select a panel (`PanelManager.selectPanel()`), a sticker (`StickerManager.selectSticker()`), or a text bubble (`TextManager.selectTextBox()`). Clicking the canvas background deselects all.
    *   **Delete Key:** Handles deletion of selected elements based on mode:
        *   `panels` mode: Deletes the image from the selected panel (`PanelManager.clearPanelImage()`) or a selected text box (`TextManager.deleteSelectedTextBox()`) if a text box is selected *instead* of a panel image.
        *   `backgrounds` mode: Clears the custom background image (`BackgroundManager.clearCustomBackground()`).
        *   `stickers` mode: Deletes the selected sticker (`StickerManager.deleteSelectedSticker()`).
*   **Page Management:**
    *   Adding new pages (shows layout selection, then creates page with chosen layout).
    *   Navigating between pages (saves current, loads selected).
    *   Deleting pages.
    *   Reordering pages (via a modal).
*   **Project Management:**
    *   Saving the entire project (including all pages, images, folder structure, custom layouts) to a JSON file.
    *   Loading a project from a JSON file.
    *   Starting a new project (with a prompt to save the current one).
*   **Layout Management:**
    *   Displays predefined and custom layouts.
    *   Allows creation of comics based on selected layouts.
    *   Supports uploading and processing custom layout JSON files.
    *   Loads custom layouts from `localStorage`.
*   **Other Notable Features:**
    *   Image Upload and Library (`ImageLibrary` is responsible, but `ComicCreator` orchestrates initial setup).
    *   Undo/Redo (`HistoryManager`).
    *   Auto-Save (`AutoSaveManager`).
    *   Export to PDF/Image (`ExportManager`).

## II. UI Management (`UIManager.js`)

Manages general UI interactions, separate from specific element controls.

*   **Sidebar Tab Switching:**
    *   Handles clicks on the main sidebar tabs (`.sidebar-tabs .tab-btn`).
    *   Updates `comicCreator.currentSidebarMode`.
    *   Visually marks the active tab.
    *   **Crucially, calls `comicCreator.deselectAll()` then `this.updateRightSidebarView()` to refresh the content of the right properties panel.**
*   **Right Sidebar Content Update (`updateRightSidebarView()`):**
    *   This is the **core function for dynamically showing controls** in the right-hand properties panel (`.properties-panel`).
    *   Clears the panel first.
    *   Based on `comicCreator.currentSidebarMode` (panels, backgrounds, stickers, text):
        *   **If "panels" mode:**
            *   Creates/shows a div with `id="panel-properties"`.
            *   If `comicCreator.panelManager.currentPanel` (a panel is selected on canvas):
                *   Calls `comicCreator.panelManager.updatePanelControls()` to populate this div with panel-specific image controls.
            *   Else (no panel selected):
                *   Shows "Select a panel to see its properties." in the `#panel-properties` div.
        *   **If "backgrounds" mode:**
            *   Calls `comicCreator.backgroundManager.updateBackgroundControls()` to populate the `.properties-panel` (which internally creates/uses a div with `id="background-properties"`).
        *   **If "stickers" mode:**
            *   Creates/shows a div with `id="sticker-properties"`.
            *   If `comicCreator.stickerManager.currentSticker` (a sticker is selected on canvas):
                *   Calls `comicCreator.stickerManager.updateStickerControls()` to populate this div.
            *   Else (no sticker selected):
                *   Shows "Select a sticker to see its properties." in the `#sticker-properties` div.
        *   **If "text" mode:**
            *   Creates/shows a div with `id="text-properties"`.
            *   If `comicCreator.textManager.currentTextBox` (a text element is selected on canvas):
                *   Calls `comicCreator.textManager.updateTextProperties()` to populate this div.
            *   Else (no text element selected):
                *   Shows "Select a text element to see its properties." in the `#text-properties` div.
*   **Notifications:** `showNotification(message, type)` displays temporary messages.
*   **Confirmation Modals:** `showConfirmationModal(title, message, buttons)` shows a dialog and returns a Promise with the user's choice. Used for "New Project" prompts.
*   **"Select Panel" Modal:** `showSelectPanelModal()` displays a simple modal, likely when an action requires a panel to be selected but none is.
*   **Editable Slider Values:** `makeSliderValueEditable(slider, valueDisplay, unitSuffix, precision)` enhances range sliders by allowing direct numeric input into an associated `<span>` or `<div>`. Handles 'Enter' to confirm, 'Escape' to cancel, and validation/clamping.

## III. Panel Management (`PanelManager.js`)

Handles everything related to comic panels on the canvas and their properties.

*   **Canvas Functionality:**
    *   `createPanels(layoutConfig, canvas)`: Adds `div.comic-panel` elements to the canvas based on the selected layout, calculating positions and sizes (including panel gaps).
    *   `addImageToPanel(panel, image)`:
        *   Called when an image is dropped on a panel in "panels" mode.
        *   Removes any existing image in the panel.
        *   Adds the new image, calculates an initial scale to cover the panel while maintaining aspect ratio.
        *   Stores image ID and scale data on the panel element.
        *   Sets up image dragging for the new image (via `DragAndDropManager`).
        *   **Selects the panel** (`this.selectPanel()`).
    *   `selectPanel(panel)`:
        *   Deselects any previously selected panel.
        *   Sets `this.currentPanel`.
        *   Adds a `.selected` class for visual feedback.
        *   Makes the image inside grabbable.
        *   **Crucially, ensures `comicCreator.currentSidebarMode` is 'panels' and then calls `comicCreator.uiManager.updateRightSidebarView()` to display panel controls.**
    *   `clearPanelImage(panel)`: Removes the `img` element from the panel, clears associated dataset attributes, and updates controls.
*   **Right Sidebar - Panel Settings (Populated by `updatePanelControls()` into `#panel-properties`):**
    *   This function is called by `UIManager.updateRightSidebarView()` when in "panels" mode and `this.currentPanel` is set.
    *   **If no panel is selected:** Shows "Select a panel to see its properties."
    *   **If a panel is selected:**
        *   Displays "Panel Settings" heading.
        *   Provides "Image Controls":
            *   **Zoom:** Slider (`.zoom-control`) and text input (`.zoom-value`, made editable by `UIManager`). Value is a percentage of the initial auto-calculated scale.
                *   A "Reset Zoom" button reverts to the initial scale.
            *   **Flip Horizontal:** Button (`.flip-horizontal-btn`) to toggle `scaleX(-1)` on the image's transform.
        *   Provides "Rotation" controls:
            *   **Angle:** Slider (`.rotation-control`) and text input (`.rotation-value`, made editable by `UIManager`) from -180° to 180°.
            *   A "Reset Rotation" button sets angle to 0°.
        *   Provides "Position" controls:
            *   **Step Size:** A number input (`.step-size-input`) to control how much the image moves with each click of the position buttons.
            *   **Arrow Buttons:** Up, Down, Left, Right buttons (`.position-btn`) to move the image within the panel by the specified step size. The image's `left` and `top` style properties (as percentages) are adjusted.
        *   *(Implicitly, if the panel contains no image, some of these controls might be hidden or disabled, though the code primarily focuses on populating them when an image is expected or present).*
*   **State Management:**
    *   `savePanelStates()`: Returns an array of objects, each representing a panel's state (imageId, transform, left, top, initialScale, currentScale, rotation, isFlippedHorizontally).
    *   `loadPanelStates(panelStates)`: Restores images and their transformations to panels based on saved state.

## IV. Background Management (`BackgroundManager.js`)

Manages the main canvas background.

*   **Canvas Functionality:**
    *   `addBackgroundImage(image)`:
        *   Called when an image is dropped on the canvas in "backgrounds" mode.
        *   Removes any existing custom background image or predefined style class.
        *   Adds the new image as `.canvas-background-image` (prepended to canvas, `z-index: 0`).
        *   Updates current page state to store the image ID and clear `canvasBackgroundStyle`.
        *   Calls `this.updateBackgroundControls()`.
    *   `removeBackgroundImage()`: Removes the `.canvas-background-image` and clears the `backgroundState` for the current page.
    *   `applyBackgroundStyle(style)`:
        *   Removes any custom background image.
        *   Removes other background style classes from the canvas.
        *   Adds the new `style` class (e.g., 'classic-white').
        *   If `useGlobalBackgroundStyle` is true, applies this style to all pages and updates `this.globalBackgroundStyle`.
        *   Otherwise, applies only to the current page's `canvasBackgroundStyle`.
        *   Calls `this.updateBackgroundControls()`.
    *   `loadCurrentPageBackground()`: Helper to apply the correct background (global, page-specific style, or page-specific image) when a page loads or global settings change.
*   **Right Sidebar - Background Settings (Populated by `updateBackgroundControls()` into `#background-properties`):**
    *   This function is called by `UIManager.updateRightSidebarView()` when in "backgrounds" mode.
    *   Displays "Background Settings" heading.
    *   **Style Presets:**
        *   Shows buttons for predefined styles (e.g., 'Classic White', 'Vintage Paper'). The active style (if no custom image) is highlighted.
        *   Clicking a style button calls `this.applyBackgroundStyle()`.
    *   **Global Control:**
        *   A checkbox "Apply style to all pages" (`#use-global-background`) toggles `this.useGlobalBackgroundStyle`.
        *   If checked, the current preset style becomes the global style and is applied to all pages.
    *   **Custom Image:**
        *   If a custom background image is active on the current page:
            *   Shows a message: "Custom image applied. Use <kbd>Delete</kbd> key to remove."
            *   An "Apply This Image to All Pages" button (`#apply-custom-bg-all-btn`). Clicking this applies the current page's background image to all other pages and disables the global style preset option.
        *   If no custom image: Shows a message "Drag an image... to set it as a custom background."
*   **State Management:**
    *   Tracks `this.useGlobalBackgroundStyle` (boolean) and `this.globalBackgroundStyle` (string for class name).
    *   Each page in `comicCreator.pages` stores its own `canvasBackgroundStyle` (string for class name) and `backgroundState: { imageId: '...' }` (if a custom image is used).
    *   `saveBackgroundState()`: Returns an object with the current effective imageId, style class, and the global settings.

## V. Sticker Management (`StickerManager.js`)

Handles sticker elements on the canvas.

*   **Canvas Functionality:**
    *   `addSticker(image, dropX, dropY)`: Adds a new sticker (`img.canvas-sticker-image`) to the canvas.
        *   Positioned based on drop coordinates or centered.
        *   Given initial properties (size, default rotation 0, not flipped).
        *   Made draggable (via `DragAndDropManager`).
        *   Clicking it calls `this.selectSticker()`.
    *   `selectSticker(stickerElement)`:
        *   Sets `this.currentSticker`.
        *   Adds `.selected-sticker` class.
        *   Increases z-index to bring it to front.
        *   Calls `this.updateStickerControls()`.
    *   `deselectCurrentSticker()`: Clears selection and resets z-index.
    *   `deleteSelectedSticker()`: Removes the current sticker.
    *   `updateStickerTransform(stickerElement)`: Applies CSS `transform` based on `dataset.rotationAngle` and `dataset.isFlippedHorizontally`.
    *   `updateStickerOutline(stickerElement)`: Applies CSS `outline` based on dataset properties.
    *   `positionSticker(sticker, position)`: Snaps sticker to predefined grid locations (e.g., 'top-left'), updating its `left`, `top`, and `transform` for centering. Sets `dataset.positionGrid`. Manual dragging resets this to 'custom'.
*   **Right Sidebar - Sticker Settings (Populated by `updateStickerControls()` into `#sticker-properties`):**
    *   This function is called by `UIManager.updateRightSidebarView()` when in "stickers" mode and `this.currentSticker` is set.
    *   **If no sticker is selected:** Shows "Select a sticker..."
    *   **If a sticker is selected:**
        *   "Delete Sticker" button.
        *   **Size:** Slider and editable numeric input for percentage (default 100px width scales by this %). "Reset Size" button.
        *   **Flip Horizontal:** Button to toggle horizontal flip (`scaleX(-1)`).
        *   **Rotation:** Slider and editable numeric input for angle (0-360°). "Reset Rotation" button.
        *   **Position Grid:** A visual grid of buttons to snap the sticker to 9 common positions.
        *   **Outline:**
            *   Checkbox to enable/disable outline.
            *   Controls (visible if enabled): Width (number input), Color (color picker), Style (dropdown: solid, dashed, dotted).
        *   *(Z-index/layer order controls might also be present, often as "Bring Forward", "Send Backward" buttons, managed by changing the `sticker.style.zIndex` and re-saving state)*
*   **State Management:**
    *   `saveStickerStates()`: Returns an array of objects, each representing a sticker's state (id, imageId, left, top, width, height, transform, zIndex, size (dataset), flipped (dataset), outline settings (dataset), positionGrid (dataset)).
    *   `loadStickerStates(page)`: Restores stickers with their properties and transformations.

## VI. Text Management (`TextManager.js`)

Manages text bubbles/elements on the canvas and within panels.

*   **Canvas/Panel Functionality:**
    *   `addTextToPanel(panel)` / `addTextToCanvas()`: Creates a new text element (`div.text-bubble`).
        *   Contains an editable `div.text-content`.
        *   Includes handles for drag, resize, format, and delete.
        *   Positioned initially near center of panel/canvas.
        *   Applies default text styles.
        *   Made draggable and resizable (via `DragAndDropManager`).
    *   `selectTextBox(textBox)`:
        *   Sets `this.currentTextBox`.
        *   Adds `.selected-text` class.
        *   **Calls `this.updateTextProperties()` to populate the right sidebar and potentially `this.showTextFormatPopup()`.**
    *   `deleteSelectedTextBox()`: Removes the current text box.
    *   Formatting is applied directly to the `text-content` element's style or the `text-bubble`'s style/dataset.
    *   `positionTextBox(textBox, position)`: Snaps text box to predefined grid locations.
*   **Right Sidebar - Text Settings (Populated by `updateTextProperties()` into `#text-properties`):**
    *   This function is called by `UIManager.updateRightSidebarView()` when in "text" mode and `this.currentTextBox` is set.
    *   **If no text box is selected:** Shows "Select a text element..."
    *   **If a text box is selected:**
        *   **Bubble Style:** Dropdown for type (speech, thought, caption, shout, whisper).
        *   **Font:** Dropdown for font family.
        *   **Size:** Slider and editable numeric input for font size.
        *   **Text Color:** Color picker and editable hex input.
        *   **Bubble Color:** Color picker and editable hex input for the bubble's background.
        *   **Text Style Buttons:** Bold, Italic, Underline, All Caps.
        *   **Rotation:** Slider and editable numeric input for bubble rotation.
        *   *(Other controls like alignment, line spacing, padding, border/outline for the bubble, shadow for the bubble, Z-index, and position grid are also typically found here or in the format popup).*
*   **Text Format Popup (`showTextFormatPopup()`):**
    *   A floating popup that appears near the selected text box when its format button is clicked.
    *   Provides quick access to:
        *   **Custom Styles:** Apply saved styles, save current as new, set current as default.
        *   **Bubble Toggle/Style:** Show/hide bubble, choose type (speech, thought, etc.).
        *   **Text Style:** Font family, size, line spacing, bold, italic, underline, all caps, alignment.
        *   **Color:** Text color, bubble color.
        *   **Effects:** Text outline (toggle, color), Text shadow (toggle, color, offset X/Y, blur), Bubble opacity.
        *   **Bubble Tail:** Dropdown for tail position (if bubble type supports it).
        *   **Position:** Grid snap buttons, rotation slider.
*   **State Management:**
    *   `saveTextStates()`: Returns `{ panelTextStates: [...], canvasTextElements: [...] }`. Each text state includes id, bubbleType, content (HTML), and a comprehensive `style` object (left, top, width, height, transform, colors, font properties, shadow, outline, zIndex, etc.).
    *   `loadTextStates(pageState)`: Restores text elements with all their content and styling.
    *   Manages `defaultTextSettings` and `customTextStyles` (saved to/loaded from localStorage).

## Key Interactions for Right Sidebar (Panel & Background Focus)

1.  **User clicks a main sidebar tab (e.g., "Panels" or "Backgrounds")**:
    *   `UIManager.setupSidebarTabs()` event listener fires.
    *   `comicCreator.currentSidebarMode` is updated.
    *   `comicCreator.deselectAll()` is called (this clears `currentPanel`, `currentSticker`, `currentTextBox`).
    *   `UIManager.updateRightSidebarView()` is called.

2.  **Inside `UIManager.updateRightSidebarView()`**:
    *   **If `currentSidebarMode` is "panels"**:
        *   It checks `comicCreator.panelManager.currentPanel`.
        *   If a panel IS selected: `PanelManager.updatePanelControls()` is called. This function then builds the HTML for zoom, rotation, flip, position controls and injects it into the `#panel-properties` div within `.properties-panel`.
        *   If NO panel is selected: A "Select a panel..." message is put into `#panel-properties`.
    *   **If `currentSidebarMode` is "backgrounds"**:
        *   `BackgroundManager.updateBackgroundControls()` is called. This function builds the HTML for style presets, global toggle, and custom image options (like "Apply to All Pages" or "Clear Background Image") and injects it into the `#background-properties` div within `.properties-panel`. This happens regardless of canvas selection.

3.  **User clicks on a panel on the canvas (while in "panels" mode or another mode)**:
    *   `ComicCreator`'s canvas click listener fires.
    *   `PanelManager.selectPanel(clickedPanel)` is called.
    *   Inside `selectPanel()`:
        *   `this.currentPanel` is set to `clickedPanel`.
        *   If `comicCreator.currentSidebarMode` is not already "panels", it's switched to "panels" (updating the visual tab).
        *   `comicCreator.uiManager.updateRightSidebarView()` is called. This then goes to step 2a, and because `currentPanel` is now set, the detailed panel controls are shown.

This detailed flow should help in understanding how the canvas interactions and sidebar mode changes lead to the correct display of settings in the right sidebar. 