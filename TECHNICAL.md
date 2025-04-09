# Technical Summary: Comic Creator (main.js)

This document provides a technical summary of the `src/js/main.js` codebase, which implements the core logic for a web-based comic creation tool.

## Core Component: `ComicCreator` Class

The application logic is encapsulated within the `ComicCreator` class.

**Instance Properties:**

*   `uploadedImages`: Array storing metadata for uploaded images (`{ id, name, src (Data URL), width, height }`).
*   `pages`: Array representing the comic pages. Each page object contains:
    *   `layout`: String ID referencing a layout in `this.layouts`.
    *   `panelStates`: Array storing the state of each panel on the page. Each panel state object contains:
        *   `backgroundStyle`: String (e.g., 'classic-white').
        *   `imageId`: String (ID of the image in the panel, if any).
        *   `transform`: String (CSS transform for the image).
        *   `left`, `top`: String (CSS position for the image).
        *   `initialScale`, `currentScale`: String (image scaling factors).
        *   `textElements`: Array of text bubble states (see below).
    *   `stickerStates`: Array storing the state of each sticker on the page. Each sticker state object contains:
        *   `id`: String (Unique sticker instance ID).
        *   `imageId`: String (ID of the source image).
        *   `left`, `top`: String (CSS pixel position).
        *   `width`, `height`: String (CSS size).
        *   `transform`: String (CSS transform).
        *   `zIndex`: String (CSS z-index).
        *   `size`: String (Dataset value representing percentage size).
    *   `backgroundState`: Object `{ imageId: string }` if a custom background image is used.
    *   `canvasBackgroundStyle`: String (CSS class name for predefined backgrounds, e.g., 'classic-white', 'vintage-paper').
*   `currentPageIndex`: Number indicating the currently active page index.
*   `layouts`: Object containing predefined layout configurations (imported from `./layouts.js`). Structure: `{ layoutId: { name, description, panels: [{x,y,width,height}] } }`.
*   `useGlobalBackgroundStyle`: Boolean toggle for applying background style to all pages.
*   `globalBackgroundStyle`: String storing the current global background style name.
*   `currentSidebarMode`: String ('panels', 'backgrounds', 'stickers') indicating the active tool mode.
*   `selectedLayout`: String ID of the layout chosen for a new page or the current page.
*   `currentPanel`: DOM element reference to the currently selected panel.
*   `currentTextBox`: DOM element reference to the currently selected text bubble.
*   `currentSticker`: DOM element reference to the currently selected sticker.
*   `currentBackground`: (Likely intended, but seems unused/inconsistently managed) Reference to a selected background element.

**Initialization (`constructor`, `init`):**

1.  Initializes default properties.
2.  Calls `init()`.
3.  `init()` calls various `setup...` methods:
    *   `setupUploadArea()`: Sets up listeners for the initial image upload area.
    *   `setupLayoutSelection()`: Renders layout options and sets up selection listeners.
    *   `setupComicEditor()`: Sets up primary event listeners (drag/drop, click, delete key) on the main canvas.
    *   `setupEventListeners()`: Sets up navigation button listeners (page transitions, load project, add text, download). **(Note: Contains redundant panel control listeners)**.
    *   `setupProjectControls()`: Sets up Save/Load Project button listeners.
    *   `initializeUI()`: Creates and appends the page navigation UI in the header, sets up its listeners. **(Note: `setupPageNavigation` seems like a duplicate/older version)**.
    *   `setupSidebarTabs()`: Sets up listeners for switching between 'panels', 'backgrounds', 'stickers' modes.

## Feature Breakdown

**1. Image Upload & Library:**

*   Uses `FileReader` (`readAsDataURL`) to get image data URLs.
*   Stores image metadata (`id`, `name`, `src`, `width`, `height`) in `uploadedImages`.
*   `updateImageLibrary()` dynamically renders thumbnails in `.thumbnails-grid` elements (upload page and editor sidebar).
    *   Adds `.in-use` class to thumbnails used in panels.
    *   Adds delete buttons (only on upload page).
    *   Sets up drag (`setupDragAndDrop`) and reorder (`setupReorderDrag`, `setupGridDropZone`) functionality.
*   `handleImageUpload()` processes files, updates `uploadedImages`, and calls `updateImageLibrary()`.

**2. Layouts & Page Structure:**

*   Layout configurations are imported.
*   `setupLayoutSelection()` renders previews using `generateLayoutPreview()`.
*   Selecting a layout triggers `createComic()`.
*   `createComic()`:
    *   Switches to the editor page.
    *   Sets up the editor sidebar upload area if needed.
    *   Clears and styles the main `#comic-canvas`.
    *   Creates `div.comic-panel` elements based on the layout config, applying calculated positions and sizes (including gaps).

**3. Canvas Interaction (Editor):**

*   **Drag/Drop:**
    *   Listens for `drop` events on `#comic-canvas`.
    *   Retrieves `imageId` from `dataTransfer`.
    *   Behavior depends on `currentSidebarMode`:
        *   `panels`: If dropped on `.comic-panel`, calls `addImageToPanel()`.
        *   `backgrounds`: Calls `addBackgroundImage()`.
        *   `stickers`: Calls `addSticker()`, passing drop coordinates.
*   **Click:**
    *   Selects stickers (`selectSticker()`), panels (`selectPanel()`), or deselects all (`deselectAll()`).
*   **Delete Key:**
    *   Removes selected panel image (`clearPanelImage()`), background (`.canvas-background-image`), or sticker (`.canvas-sticker-image`) based on `currentSidebarMode`. Updates state and sidebar.

**4. Panel Image Manipulation:**

*   `addImageToPanel()`: Creates `img`, calculates initial scale (`Math.max(scaleX, scaleY)`), sets transform, adds to panel, updates dataset, calls `setupImageDragging()`, selects panel.
*   `setupImageDragging()`: Allows dragging the `img` within the panel using mouse events, updating `left`/`top` percentages. Saves state on mouseup.
*   `updatePanelControls()`: Generates HTML for zoom/position controls in the right sidebar. Uses `makeSliderValueEditable()`.
*   `handleZoom()`, `handlePositionChange()`: Update image `transform` or `left`/`top` based on controls, save state.

**5. Text Bubbles:**

*   `addTextToPanel()`: Creates `.text-bubble` structure with editable `.text-content` and control handles (drag, resize, format, delete). Sets up listeners.
*   `makeTextDraggable()`, `makeTextResizable()`: Implement dragging (with boundaries) and resizing.
*   `selectTextBox()`: Manages selection state (`.selected-text`, `this.currentTextBox`) and updates the properties panel (`updateTextProperties()`).
*   `updateTextProperties()`: Basic properties panel for selected text.
*   `showTextFormatPopup()`: Creates a detailed modal (`#text-format-popup`) with extensive formatting options.
*   `setupPopupEventListeners()`: Adds listeners to controls in the popup. **(Note: Potential missing `saveCurrentPageState` calls)**.
*   **Formatting Helpers:**
    *   `applyTextOutline()`, `removeTextOutline()`: Manage CSS properties and `data-text` attribute for pseudo-element outline effect. Use `MutationObserver` (`_outlineObserver`) to update `data-text` via `updateOutlineText()` on content change.
    *   `applyTextShadow()`, `removeTextShadow()`: Apply/remove simple `text-shadow`.
    *   `updateBubbleTail()`: Adds/removes CSS classes for bubble tail position.
    *   `positionTextBox()`: Sets `left`, `top`, and `transform: translate()` based on 9-grid position buttons.
    *   `get...`, `getTextWithLineBreaks`: Helper functions for parsing styles and getting text content.

**6. Stickers:**

*   `addSticker()`: Creates `img.canvas-sticker-image`, calculates initial position from drop coords (bounded), appends to canvas, calls `makeStickerDraggable()`, adds listeners, saves state (in `onload`), selects sticker.
*   `makeStickerDraggable()`: Implements dragging using mouse events, updates `left`/`top` pixels (bounded). Saves state on mouseup.
*   `updateStickerControls()`: Generates HTML for delete, size, and position controls in the right sidebar.

**7. Backgrounds:**

*   `addBackgroundImage()`: Creates `img.canvas-background-image`, styles to cover canvas, prepends to canvas, updates `backgroundState`, saves page state.
*   `applyBackgroundStyle()`: Applies predefined CSS classes to the canvas, updates `canvasBackgroundStyle` (and potentially global state), saves page state.
*   `updateBackgroundControls()`: Generates HTML for predefined style buttons, global toggle, "Apply to All" button (if custom BG exists). Includes listeners.
*   `applyCustomBackgroundToAll()`: Copies current custom background `imageId` to all pages' `backgroundState`, disables global style toggle, reloads current page, saves state, shows notification.

**8. Page Navigation & Management:**

*   Managed via buttons in the header (`initializeUI`).
*   `addNewPage()`: Pushes new page object, calls `createComic()`, updates UI.
*   `navigateToPage()`: Saves current state (optional), updates `currentPageIndex`, calls `loadPageState()`, updates UI.
*   `deleteCurrentPage()`: Removes page from `pages` array, determines next index, loads state, updates UI.
*   `reorderPages()`, `applyPageReorder()`: Use a modal with drag/drop list to reorder the `pages` array, maintaining the view of the currently edited page content.

**9. State Management (`saveCurrentPageState`, `loadPageState`):**

*   **Saving:** Iterates through panels, text bubbles, stickers on the current page, collecting styles, content, image IDs, positions, transforms, etc., and stores them in the corresponding object within `this.pages[this.currentPageIndex]`. Also saves background state/style. Ensures layout is stored as ID.
*   **Loading:** Clears canvas elements (stickers, background). Calls `createComic()` to build panel structure. Iterates through saved states (background, panels, text, stickers), finds corresponding images in `uploadedImages`, creates elements, applies saved styles/content, and re-attaches necessary event listeners (dragging, resizing, selection).

**10. Project Save/Load:**

*   `saveProject()`: Uses `promptForFilename()`. Creates a `projectState` object (version, settings, pages, images with data URLs, currentIndex). Stringifies to JSON and triggers download.
*   `loadProject()`: Parses JSON, checks version, clears current state, restores images (using `new Image()` on `src`), restores `pages` array and settings, updates image library, loads current page state, updates navigation.

**11. UI & Interaction Modes:**

*   **Sidebar Tabs (`setupSidebarTabs`, `updateRightSidebarView`):** Switches `currentSidebarMode`, updates active tab UI, updates the content of the right `.properties-panel` based on the mode and current selection (panel, sticker, or background controls/messages), deselects elements on mode switch.
*   **Selection (`selectPanel`, `selectTextBox`, `selectSticker`, `deselectAll`):** Manages adding/removing selection classes (`.selected`, `.selected-text`, `.selected-sticker`), updating `this.current...` properties, and showing/hiding relevant controls in the properties panel via `updateRightSidebarView`.
*   **Modals:**
    *   Filename Prompt (`promptForFilename`).
    *   Page Reorder (`reorderPages`).
    *   Select Panel (`showSelectPanelModal`).
    *   Text Format Popup (`showTextFormatPopup`).
*   **Notifications (`showNotification`):** Temporary feedback messages.
*   **Editable Slider Values (`makeSliderValueEditable`):** Enhances range sliders by making the associated text display directly editable.

**12. Dependencies (Implied):**

*   `layouts.js`: Contains predefined layout data.
*   `html2canvas`: Used in `downloadComic` to capture page content.
*   `jspdf`: Used in `downloadComic` to create the PDF.
*   Font Awesome: Used for icons in buttons and controls.

**Potential Issues/Notes:**

*   Redundant event listeners added in `setupEventListeners` for panel controls, which are also added in `updatePanelControls`.
*   Potentially missing `saveCurrentPageState()` calls in several `setupPopupEventListeners` handlers (font, size, style, alignment, color pickers, tail, position, rotation). Changes made only in the popup might not persist if the popup is closed via clicking outside or if another action triggers a save before the popup close listener's save call.
*   `setupPageNavigation` appears redundant with `initializeUI`.
*   Background image manipulation (`updateBackgroundControls`) seems less developed than panel/sticker controls, lacking direct selection and potentially having unused control logic (`backgroundElement` parameter).
*   `removeEffectFromShadow` helper function appears unused.
*   Error handling is present but basic (console logs, alerts).
*   Heavy reliance on direct DOM manipulation and querying.

This summary covers the technical implementation details found within the `main.js` file. 