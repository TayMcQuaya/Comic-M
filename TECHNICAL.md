# Technical Summary: Comic Creator

This document provides a comprehensive technical summary of the Comic Creator web application. It details the modular architecture, core functionalities, data structures, and implementation details, intended as a reference for understanding the current codebase and potentially guiding future development or integration.

## 1. Application Overview

The Comic Creator is a browser-based application allowing users to create multi-page digital comics. Users can:
- Upload images to a library.
- Organize images using a hierarchical folder system.
- Choose from predefined or create custom panel layouts for each page.
- Place images into panels, with controls for zooming, panning, rotating, and flipping.
- Add text bubbles (speech, thought, caption, etc.) with extensive formatting options (fonts, colors, styles, effects, custom presets).
- Add sticker images directly onto the canvas with controls for size, position, rotation, flipping, and outlining.
- Set page backgrounds using predefined styles or custom images.
- Manage multiple pages, including adding, deleting, and reordering.
- Save the entire project state (including images, pages, layouts, text, stickers, folder structure) to a JSON file.
- Load projects from saved JSON files.
- Export the final comic as a multi-page PDF document.
- Benefit from an undo system and an auto-save feature to prevent data loss.

## 2. Modular Architecture

The application employs a modular design, separating concerns into distinct JavaScript classes (Managers), coordinated by the main `ComicCreator` class.

### 2.1. Core Coordinator

- **`ComicCreator` (`src/js/main.js`)**:
  - **Responsibilities**: Main application entry point, initializes all manager modules, holds the central application state (pages array, current page index, available layouts, folder structure), coordinates high-level UI flow (page transitions, modal triggers, panel/element selection), handles top-level event listeners, manages page lifecycle (add, delete, reorder), orchestrates project save/load, and facilitates communication between managers. Passes its own instance (`this`) to managers upon instantiation, allowing them access to shared state and other managers.

### 2.2. Feature Modules (Managers)

Each manager handles a specific domain of functionality:

1.  **`UIManager` (`src/js/modules/UIManager.js`)**:
    - **Responsibilities**: Manages general UI interactions and elements not specific to one feature domain.
    - **Key Functions**: Sidebar tab switching logic, dynamic updates to the right-hand properties panel based on selected element/mode (panel, text, sticker, background, or default page state), displaying user notifications (`showNotification`), handling modal dialogs (confirmation, filename prompt, reorder pages, layout builder), making slider control values directly editable, managing the loading overlay, updating folder path breadcrumbs.

2.  **`ImageLibrary` (`src/js/modules/ImageLibrary.js`)**:
    - **Responsibilities**: Manages image assets and their display within the library sidebar.
    - **Key Functions**: Handles image uploads (delegating processing to `imageProcessor.worker.js`), stores image metadata (`uploadedImages` array: id, name, src (Object URL), width, height, `isObjectURL` flag), manages asset selection state (`selectedAssets`, `lastSelectedAsset`), updates thumbnail grids based on current folder and selection (`updateThumbnails`), deletes images (removing from library and folder structure), checks image usage (`#isImageUsed`), provides image lookup (`getImageById`). Uses Web Worker for background image processing (conversion to Object URL, dimension extraction). Coordinates with `FolderSystem` for display.

3.  **`FolderSystem` (`src/js/modules/FolderSystem.js`)**:
    - **Responsibilities**: Manages the hierarchical folder structure for organizing assets within the `ImageLibrary`.
    - **Key Functions**: Stores folder hierarchy (`folderStructure` object in `ComicCreator`), handles folder creation, deletion, renaming, navigation (`navigateToFolder`, `navigateBack`), moving items (images/folders) between folders (`moveItemToFolder`), updates the `ImageLibrary` display via `comicCreator.imageLibrary.updateThumbnails()`, updates breadcrumbs via `comicCreator.uiManager.updateFolderPath()`.

4.  **`DragAndDropManager` (`src/js/modules/DragAndDropManager.js`)**:
    - **Responsibilities**: Encapsulates all drag-and-drop logic for various elements.
    - **Key Functions**: Handles dragging:
        - Images from library to panels (adds image).
        - Images from library to canvas (sets background or adds sticker).
        - Images from library to folder icons (moves image).
        - Images within panels (panning).
        - Text bubbles (repositioning, panel-relative or canvas-relative).
        - Text bubble resize handles.
        - Stickers (repositioning).
        - Sticker resize/rotate handles.
        - Folder icons onto other folder icons (moves folder).
        - Assets within the library grid (reordering).
    - Uses a combination of `mousedown`, `mousemove`, `mouseup` for custom drag implementations (panels, text, stickers) and the standard HTML5 Drag and Drop API for library-to-canvas/folder interactions.

5.  **`LayoutBuilderManager` (`src/js/modules/LayoutBuilderManager.js`)**:
    - **Responsibilities**: Manages the creation, saving, and loading of custom panel layouts via a dedicated modal.
    - **Key Functions**: Provides a modal UI for visually building layouts, allows adding panels with specific aspect ratios, supports panel dragging and resizing (with aspect ratio lock), optional snap-to-grid functionality, saves custom layouts to `localStorage` (`saveLayoutToStorage`), loads custom layouts (`loadCustomLayouts`), applies selected custom layouts to the current page (`applyLayout`).

6.  **`PanelManager` (`src/js/modules/PanelManager.js`)**:
    - **Responsibilities**: Manages comic panels on the canvas, including their creation, content, and appearance.
    - **Key Functions**: Creates panel divs based on layout configuration (`createPanels`), adds/replaces images within panels (`addImageToPanel`), handles panel selection state (`currentPanel`), updates the properties panel with panel-specific controls (zoom, position, flip, rotation) via `UIManager`, clears panel images (`clearPanelImage`), removes panels (`removePanel`, not currently used for layout changes), saves/loads panel state (image ID, transform, position, scale, rotation, flip) (`savePanelStates`, `loadPanelStates`).

7.  **`TextManager` (`src/js/modules/TextManager.js`)**:
    - **Responsibilities**: Manages text elements (bubbles), including creation, editing, styling, and state.
    - **Key Functions**: Adds text bubbles to panels or the canvas (`addTextToPanel`, `addTextToCanvas`), handles text selection (`selectTextBox`, `currentTextBox`), updates properties panel with text controls via `UIManager`, manages bubble types and styles (speech, thought, caption, etc.), applies text formatting (font via Google Fonts API, size, color, weight, style, decoration, alignment, line height), handles text effects (outline via `text-shadow`, drop shadow, opacity), manages bubble tail positioning (`updateBubbleTail`), provides text positioning grid (`positionTextBox`), handles custom text style creation, saving (`localStorage`), application, and deletion, saves/loads text state (`saveTextStates`, `loadTextStates`, `restoreTextBubble`). Uses `contentEditable` divs for text input.

8.  **`StickerManager` (`src/js/modules/StickerManager.js`)**:
    - **Responsibilities**: Manages sticker elements placed directly on the canvas.
    - **Key Functions**: Adds stickers (`addSticker`), handles sticker selection (`selectSticker`, `currentSticker`), updates properties panel with sticker controls (size, rotation, flip, outline) via `UIManager`, deletes stickers (`deleteSelectedSticker`), manages sticker transformations (`updateStickerTransform`) and outlines (`updateStickerOutline`), provides sticker positioning grid (`positionSticker`), saves/loads sticker state (`saveStickerStates`, `loadStickerStates`).

9.  **`BackgroundManager` (`src/js/modules/BackgroundManager.js`)**:
    - **Responsibilities**: Manages page backgrounds (styles or images).
    - **Key Functions**: Adds background images (`addBackgroundImage`), removes background images (`removeBackgroundImage`), applies predefined background styles (CSS classes) (`applyBackgroundStyle`), toggles between global and per-page background styles (`toggleGlobalBackground`, `useGlobalBackgroundStyle`, `globalBackgroundStyle`), updates properties panel with background controls via `UIManager`, saves/loads background state (`saveBackgroundState`, `loadCurrentPageBackground`).

10. **`HistoryManager` (`src/js/modules/HistoryManager.js`)**:
    - **Responsibilities**: Implements undo/redo functionality.
    - **Key Functions**: Records snapshots of page state *before* actions occur (`recordSnapshotBeforeAction`), stores history (`historyStack`), performs undo operations (`undo`) by restoring previous states. Uses selective state copying (`createSelectiveStateCopy`) for specific actions (panel image change, text edit, sticker manipulation, background change) to optimize history size, falling back to full page state copy otherwise. Manages `redoStack` and `redo()` functionality.

11. **`AutoSaveManager` (`src/js/modules/AutoSaveManager.js`)**:
    - **Responsibilities**: Handles automatic project saving to `localStorage` at intervals.
    - **Key Functions**: Initializes on startup (`init`), checks for existing auto-save data, prompts user to restore if found, performs periodic saves (`performAutoSave` via `setInterval`), saves state on `beforeunload`, clears auto-save data (`clearAutoSave`) after manual save or discard. Uses `localStorage` key `comicCreatorAutoSave`.

12. **`ProjectStorageManager` (`src/js/modules/ProjectStorageManager.js`)**: (Note: Core save/load logic resides in `ComicCreator`. This module seems less utilized currently).
    - **Responsibilities**: Intended to handle manual project saving/loading logic, particularly the file interactions.
    - **Key Functions**: Provides helper functions potentially used by `ComicCreator` for data conversion (Object URL to Data URL `convertObjectUrlToDataUrl`) and initiating file downloads (`triggerDownload`). The main serialization and state restoration logic is within `ComicCreator.saveProject` and `ComicCreator.loadProject`.

13. **`ExportManager` (`src/js/modules/ExportManager.js`)**:
    - **Responsibilities**: Handles exporting the comic pages to a multi-page PDF document.
    - **Key Functions**: Preloads fonts used in the project (`preloadFontsForExport` using `FontFaceObserver`), iterates through pages, uses `html2canvas` to capture each page's `#comic-canvas` content as an image (with options for scaling, background handling, element cloning/processing), uses `jsPDF` to compile captured images into a multi-page PDF (`downloadComic`), prompts user for filename via `ComicCreator.uiManager`, processes elements during capture to ensure styles (CSS variables, outlines, text shadows) are rendered correctly (`processElementsForExport`).

14. **`Utils` (`src/js/modules/Utils.js`)**:
    - **Responsibilities**: Provides shared utility functions used across different modules.
    - **Key Functions**: Color conversion (`globalRgbToHex`), extracting text content while preserving line breaks from HTML (`getTextWithLineBreaks`), generating unique IDs (`generateUniqueId`), debouncing function calls (`debounce`).

### 2.3. Web Worker

- **`imageProcessor.worker.js` (`src/js/workers/imageProcessor.worker.js`)**:
  - **Responsibilities**: Processes uploaded image files off the main UI thread to prevent freezing.
  - **Key Functions**: Receives `File` objects from `ImageLibrary`, uses `createImageBitmap` to efficiently get dimensions, creates `Object URL`s (`URL.createObjectURL`) for performant preview/rendering within the browser session, posts processed data (id, name, objectURL, width, height) or errors back to the `ImageLibrary` on the main thread.

## 3. Core Data Structures

### 3.1. Project State (`projectState` object saved/loaded via `ComicCreator.saveProject`/`loadProject`)
```javascript
{
    version: "1.3-autosave", // Application version marker for compatibility checks
    pages: [ /* Array of Page State Objects (See 3.2) */ ],
    images: [ /* Array of Image Data Objects (See 3.6 - with Data URLs) */ ],
    currentPageIndex: 0,
    folderStructure: { /* Folder Hierarchy Object (See 3.7) */ },
    currentFolderId: "root", // ID of the currently viewed folder in the library
    customLayouts: { /* Object containing used custom layout definitions (See layouts.js/LayoutBuilderManager) */ },
    useGlobalBackgroundStyle: false, // Flag for global vs per-page backgrounds
    globalBackgroundStyle: "classic-white", // ID of the global background style/image
    customTextStyles: [ /* Array of custom text style objects (See TextManager) */ ],
    defaultTextSettings: { /* Object with default text properties (See TextManager) */ }
}
```

### 3.2. Page State (`pages` array element in `ComicCreator`)
```javascript
{
    layout: "layoutId" | { /* Custom Layout Definition Object */ }, // ID string for predefined or object for custom
    panelStates: [ /* Array of Panel State Objects (See 3.3) */ ],
    canvasTextElements: [ /* Array of Text Element State Objects on canvas (See 3.4) */ ],
    stickerStates: [ /* Array of Sticker State Objects (See 3.5) */ ],
    backgroundState: { 
        imageId: "bg-image-id" | null, // ID of image used as background
        imageTransform: "translate(...) scale(...)" // Optional transform for background image (if panning/zooming added)
    } | null,
    canvasBackgroundStyle: "css-style-class" | null // e.g., "vintage-paper"
}
```

### 3.3. Panel State (`panelStates` array element, managed by `PanelManager`)
```javascript
{
    // From PanelManager.savePanelStates
    imageId: "image-id" | null, // ID of the image within the panel
    transform: "translate(...) scale(...) rotate(...) scaleX(...)", // CSS transform for image positioning/scaling/rotation/flip
    left: "50%", // CSS left value (usually % for centering)
    top: "50%", // CSS top value (usually % for centering)
    initialScale: 1.0, // Base scale factor (number)
    currentScale: 1.2, // Current scale factor relative to initial (number)
    rotation: 15, // Rotation angle in degrees (number)
    isFlippedHorizontally: true | false,

    // Added by ComicCreator.saveCurrentPageState from TextManager
    textElements: [ /* Array of Text Element State Objects within this panel (See 3.4) */ ]
}
```

### 3.4. Text Element State (`textElements` or `canvasTextElements` array element, managed by `TextManager`)
```javascript
{
    id: "text_timestamp_random", // Unique identifier
    bubbleType: "speech-bubble" | "thought-bubble" | "caption-box" | "shout-bubble" | "whisper-bubble" | "no-bubble",
    previousBubbleType: "speech-bubble", // Used when toggling bubble visibility
    tailPosition: "bottom-left" | "none" | ..., // Tail position identifier
    positionGrid: "top-left" | "custom" | ..., // Predefined grid position or custom
    content: "<p>HTML content...</p>", // Inner HTML of the contentEditable div
    style: {
        left: "150px", // Pixel or percentage value
        top: "200px", // Pixel or percentage value
        width: "200px" | "auto",
        height: "100px" | "auto",
        transform: "rotate(10deg)", // CSS transform string for rotation
        backgroundColor: "#FFFFFF", // Actual background color applied (might be transparent for no-bubble)
        bubbleBackgroundColor: "#FFFFFF", // Value from the --bubble-background-color CSS variable
        bubbleOpacity: 0.8, // Value from the --bubble-opacity CSS variable (number)
        color: "#FF0000", // Text color
        fontSize: "18px",
        fontFamily: "'Comic Sans MS', cursive",
        fontWeight: "bold" | "normal",
        fontStyle: "italic" | "normal",
        textDecoration: "underline" | "line-through" | "none",
        lineHeight: 1.5 | "normal", // Number or string
        textAlign: "left" | "center" | "right" | "justify",
        textTransform: "uppercase" | "lowercase" | "capitalize" | "none",
        padding: "10px", // Overall padding (might be overridden by specific padding)
        // Specific padding values might also be stored here if implemented
        textShadow: "2px 2px 2px #000000", // CSS text-shadow value (for outline or shadow)
        hasOutline: true | false, // Flag indicating if text outline is active
        outlineColor: "#00FF00", // Stored outline color
        outlineWidth: 2, // Outline width in pixels (number)
        zIndex: 100, // Stacking order (number)
        // Tail specific styles might be here too
        tailTransform: "rotate(45deg) scale(1)" // Transform for the tail pseudo-element
    }
}
```

### 3.5. Sticker State (`stickerStates` array element, managed by `StickerManager`)
```javascript
{
    id: "sticker_timestamp_random", // Unique identifier
    imageId: "source-image-id", // ID of the source image from ImageLibrary
    left: "50%", // CSS left value (% or px)
    top: "50%", // CSS top value (% or px)
    width: "150px", // CSS width value (px)
    height: "auto", // CSS height value (usually auto)
    transform: "translate(...) rotate(...) scaleX(...)", // CSS transform string for position/rotation/flip
    zIndex: 5, // Stacking order (number)
    size: 100, // Percentage size (relative to initial drop size) (number)
    rotationAngle: 45, // Rotation angle in degrees (number)
    isFlippedHorizontally: true | false,
    outlineEnabled: true | false,
    outlineWidth: 3, // Outline width in pixels (number)
    outlineColor: "#FFFF00", // Outline color hex string
    outlineStyle: "dashed" | "solid" | "dotted", // Outline style string
    positionGrid: "middle-right" | "custom" | ... // Predefined grid position or custom
}
```

### 3.6. Image Data (`uploadedImages` array element in `ImageLibrary` / `images` in save file)
```javascript
// In memory (ImageLibrary.uploadedImages)
{
    id: "img_timestamp_random",
    name: "image.png",
    src: "blob:http://localhost:xxxx/...", // Object URL (temporary, session-specific)
    width: 800, // Natural width (number)
    height: 600, // Natural height (number)
    isObjectURL: true
}

// In save file (Project State.images array)
{
    id: "img_timestamp_random",
    name: "image.png",
    src: "data:image/png;base64,..." | null, // Data URL (persistent) or null if conversion failed
    width: 800,
    height: 600
    // saveError: true (optional flag if conversion failed)
}
```

### 3.7. Folder Structure (`folderStructure` object in `ComicCreator`)
```javascript
{
    "root": {
        type: "folder",
        name: "root", // Special name for the root
        items: ["img_123", "folder_abc", "img_456"], // Array of child image/folder IDs
        parent: null // Root has no parent
    },
    "folder_abc": {
        type: "folder",
        name: "My Characters", // User-defined name
        items: ["img_789"], // Child IDs
        parent: "root" // ID of the parent folder
    }
    // ... more folders, referenced by their unique IDs
}
```

## 4. Feature Implementation Details

### 4.1. Image Handling
- **Upload**: Uses standard HTML file input (`<input type="file">`) and drag/drop listeners on the library area. Files are passed to `ImageLibrary` which posts them to `imageProcessor.worker.js`.
- **Processing (Web Worker)**: Worker uses `createImageBitmap` for efficient dimension extraction and `URL.createObjectURL` to generate temporary blob URLs for fast rendering without high memory usage associated with Data URLs. Results (metadata including Object URL) are posted back to `ImageLibrary`.
- **Storage & Persistence**: `ImageLibrary` stores metadata in `uploadedImages`, using the Object URL (`src`). During project save (`ComicCreator.saveProject`), Object URLs are fetched using `fetch()` and converted to persistent Base64 Data URLs using `FileReader.readAsDataURL()` for embedding within the JSON save file (`ProjectState.images`). On project load (`ComicCreator.loadProject`), Data URLs are converted back to Object URLs using `fetch()` and `URL.createObjectURL()` for efficient use in the running application.
- **Panel Images**: Managed by `PanelManager`. Images (`<img>` tags) are placed inside panel divs (`.comic-panel`). `object-fit: cover` ensures they fill the panel. Zoom/pan is achieved by adjusting the `<img>` element's `transform: scale(...) translate(...)`, relative to the panel center. Rotation and flip are also applied via `transform`.
- **Background Images**: Managed by `BackgroundManager`. Applied directly to the `#comic-canvas` container. Can be either a CSS class applying a `background-image` style (`.background-styles`) or an `<img>` element (`.canvas-background-image`) inserted as the first child with `position: absolute`, `width: 100%`, `height: 100%`, and `object-fit: cover`. Image backgrounds use the same save/load conversion (Object URL <-> Data URL) as library images.
- **Stickers**: Managed by `StickerManager`. Added as `<img>` elements (`.canvas-sticker-image`) directly onto `#comic-canvas`. Position, size, rotation, flip are controlled via CSS `left`, `top`, `width`, `height`, and `transform`. Outlines are implemented using CSS `border` for better export compatibility (compared to `outline`). Stickers also use the Object URL <-> Data URL conversion.

### 4.2. Text Handling
- **Creation**: `TextManager` creates draggable/resizable text bubbles (`.text-bubble` div) containing a `contentEditable` div (`.text-content`) for user input. Added either relative to a panel or directly to the canvas.
- **Editing**: Direct rich text editing via `contentEditable` divs. `TextManager` listens for `input` events to update state.
- **Styling**: Applied via CSS styles directly to the `.text-content` (for font-related styles) and `.text-bubble` (for bubble appearance, position, transform, padding, etc.). Uses CSS variables (e.g., `--bubble-background-color`, `--bubble-opacity`) for some properties, which are resolved to concrete values during state saving.
- **Bubble Types & Tails**: Implemented using CSS classes on the `.text-bubble` element (e.g., `.speech-bubble`, `.thought-bubble`). Tails are created using `::after` and `::before` pseudo-elements, positioned and styled based on classes like `.speech-tail-bottom-left`. `updateBubbleTail` calculates and applies the necessary transform to the pseudo-elements.
- **Fonts**: Uses the Google Fonts API. Selected fonts are dynamically loaded via `WebFont.load` if not already available.
- **Effects**:
    - **Outline**: Achieved using complex `text-shadow` with multiple offsets on the `.text-content` element (see `applyTextOutline` in `TextManager`).
    - **Shadow**: Standard CSS `text-shadow`.
    - **Opacity**: CSS `opacity` applied via `--bubble-opacity` variable on `.text-bubble`.
- **Custom Styles**: Saved/loaded by `TextManager` to/from `localStorage` (`comicCustomTextStyles`). Styles are essentially snapshots of the `TextElement.style` object.
- **Positioning**: Draggable via `DragAndDropManager`. Can be snapped to a 9-point grid (`positionTextBox` in `TextManager`) which applies percentage `left`/`top` and centering `translate` transform. Manual dragging overrides grid positioning and uses pixel values.

### 4.3. Layout System
- **Predefined**: Stored as objects in `src/js/layouts.js` and loaded into `ComicCreator.layouts` on initialization.
- **Custom**: Created using the `LayoutBuilderManager` modal. Panels are positioned/sized visually using absolute pixel values relative to the builder canvas. When saving (`saveLayoutToStorage`), these pixel values are converted to percentages relative to the builder canvas size. Custom layouts are saved to `localStorage` (`comicCustomLayouts`) and also embedded within saved project JSON files (`ProjectState.customLayouts`) for portability.
- **Application**: `PanelManager.createPanels` creates panel divs (`.comic-panel`) on `#comic-canvas` based on the percentage dimensions defined in the selected layout configuration (either predefined or custom).

### 4.4. State Management & Persistence
- **In-Memory State**: `ComicCreator` holds the primary state: `pages` array (containing page states), `currentPageIndex`, `folderStructure`, `uploadedImages` (via `ImageLibrary`), etc. Individual managers hold temporary UI state (e.g., `PanelManager.currentPanel`, `TextManager.currentTextBox`).
- **Undo/Redo**: `HistoryManager` stores snapshots of the *entire current page state* (obtained via `ComicCreator.getCurrentPageState()`) in `historyStack` before most actions occur (`recordSnapshotBeforeAction`). `undo()` restores the previous page state using `ComicCreator.loadPageData()`. `redo()` applies the next state from `redoStack`. Selective state copying (`createSelectiveStateCopy`) is used for performance in some cases, but the primary mechanism relies on full page state snapshots.
- **Auto-Save**: `AutoSaveManager` periodically calls `ComicCreator.saveProject(true)` (save silently) which serializes the *entire project state* (including Data URL conversion) and saves it to `localStorage` (`comicCreatorAutoSave`). It prompts the user on load if auto-save data exists.
- **Manual Save/Load**: `ComicCreator.saveProject()` serializes the full project state (including image Data URL conversion) and triggers a JSON file download. `ComicCreator.loadProject()` handles file reading, JSON parsing, restoring the entire application state, including converting Data URLs back to Object URLs and loading page data.
- **Settings Persistence**: `TextManager` saves default text settings and custom text styles to `localStorage`. `LayoutBuilderManager` saves custom layouts to `localStorage`. `UIManager` might save sidebar state (like last open tab) to `localStorage`.

### 4.5. Export (PDF)
- **Process**: `ExportManager.downloadComic` orchestrates the export, triggered via `ComicCreator`.
- **Page Capture**: Iterates through all pages in the `ComicCreator.pages` array. For each page, it temporarily loads the page data (`ComicCreator.loadPageData`), waits briefly for rendering (`setTimeout`), then uses `html2canvas` library to capture the `#comic-canvas` content.
- **Style Handling & Accuracy**: `html2canvas` is configured with options (`scale`, `useCORS`, etc.). Crucially, `processElementsForExport` is called before capture to temporarily modify element styles in the DOM (e.g., applies CSS variable values like `--bubble-background-color` directly, uses `border` for sticker outlines instead of CSS `outline`, applies `text-shadow` for outlines) to ensure more accurate rendering by `html2canvas`. A cleanup function restores original styles afterwards. The `onclone` option in `html2canvas` might be used to handle specific cloning issues (e.g., with background images).
- **PDF Assembly**: Each captured page (as a canvas element) is converted to a Data URL (`toDataURL('image/png')`) and added as a new page to a `jsPDF` instance. Finally, `jsPDF.save()` triggers the PDF download.
- **Fonts**: Attempts to preload fonts used in the project via `FontFaceObserver` before starting the capture loop to improve the chance of correct font rendering in the captured images.

## 5. Module Communication

- **Central Coordinator**: `ComicCreator` (`main.js`) acts as the central hub and orchestrator.
- **Instance Passing**: When `ComicCreator` initializes, it creates instances of all manager modules and passes its own instance (`this`) to each manager's constructor. This gives managers access to the central `ComicCreator` instance.
- **Direct Calls & Access**: Managers typically access other managers or shared state via the passed `comicCreator` instance. Examples:
    - `PanelManager` calls `comicCreator.uiManager.updatePanelControls()`.
    - `TextManager` calls `comicCreator.dragAndDropManager.setupTextDragging()`.
    - `ImageLibrary` accesses `comicCreator.folderStructure`.
    - Many managers call `comicCreator.saveCurrentPageState()` after making changes.
    - Managers call `comicCreator.recordHistorySnapshot()` before making state changes that should be undoable.
- **State Updates & UI**: Managers update their own internal state (e.g., `currentPanel`, `currentTextBox`) and the shared state in `ComicCreator` (e.g., modifying the `pages` array data). They often trigger UI updates either directly (manipulating DOM elements they control) or by calling methods on `UIManager` (e.g., `updatePropertiesPanel`).
- **Events**: While direct calls are the primary method, some basic DOM event handling exists (e.g., button clicks in `UIManager`, drag events in `DragAndDropManager`). A more formal event bus system is not used.

## 6. Future Technical Considerations

(Based on the previous version and current analysis)

1.  **Performance**: 
    - **Image Conversion**: `Object URL` <-> `Data URL` conversion during save/load, especially for many large images, can be slow and memory-intensive. Exploring IndexedDB for storing blobs directly could be significantly more performant and scalable.
    - **Rendering**: Performance with a very large number of complex elements (stickers with outlines, text with complex shadows/outlines) per page might degrade. Canvas rendering or WebGL could be alternatives for specific high-performance needs, but add complexity.
    - **DOM Manipulation**: Frequent direct DOM manipulations could be optimized, potentially by batching updates or using a virtual DOM library (though this would be a major architectural shift).
2.  **Testing**: The modular structure is conducive to unit testing individual managers. Comprehensive integration tests are crucial to verify the complex interactions between managers coordinated by `ComicCreator`.
3.  **Extensibility**: Adding new element types (e.g., shapes, frames) would likely involve creating new Manager classes, integrating them into the `ComicCreator` state and initialization, adding UI controls via `UIManager`, handling drag/drop via `DragAndDropManager`, ensuring save/load/history compatibility, and updating export logic.
4.  **PWA/Offline**: 
    - **Dependencies**: External libraries (jsPDF, html2canvas, FontFaceObserver, WebFontLoader) are currently loaded via CDN. Bundling these locally (e.g., using a build tool like Webpack or Vite) is necessary for reliable offline use.
    - **Service Workers**: Implementing a service worker could cache application assets and potentially enable offline project access (though full offline editing requires careful state management and handling image storage/conversion without network access).
5.  **Backend Integration Potential**: Shifting to a backend model would involve:
    - **Authentication**: User accounts for managing projects.
    - **Asset Storage**: Storing images/assets in cloud storage (S3, etc.) instead of embedding Data URLs in JSON. Project files would reference asset URLs/IDs.
    - **Database**: Storing project metadata, page structures, element states, etc., in a database instead of a single JSON file.
    - **Collaboration**: Would require a robust backend architecture for real-time state synchronization (e.g., using WebSockets, conflict resolution logic).
    - **Server-Side Operations**: Offloading intensive tasks like PDF generation or complex image processing to the server.
6.  **Error Handling**: Current error handling is basic. More robust handling (e.g., specific error messages for failed image loads/conversions, graceful recovery from corrupted save files, better feedback during export failures) would improve user experience.
7.  **Code Structure & Build Process**: Introducing a modern JavaScript build process (Webpack, Vite, Parcel) would enable features like ES module imports/exports consistently, dependency management via npm/yarn, code splitting, minification, and transpilation for wider browser compatibility.
8.  **Accessibility**: Reviewing and improving UI accessibility (semantic HTML, ARIA attributes, keyboard navigation) would make the application usable by more people.