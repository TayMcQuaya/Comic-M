# Image Library Logic Analysis (main.js)

This document outlines the properties and methods within `src/js/main.js` that are responsible for image library functionality. This analysis will guide the extraction of this logic into a dedicated `ImageLibrary.js` module.

## Relevant Properties in `ComicCreator`

*   `this.uploadedImages`: (Line 11) Array storing the metadata (id, name, src, width, height) for all images uploaded by the user.
*   `this.selectedAssets`: (Line 40) Array storing the IDs of the currently selected image(s) or folder(s) in the library view.
*   `this.lastSelectedAsset`: (Line 41) Stores the ID of the last asset (image or folder) that was clicked, used for shift-click range selection.

## Relevant Methods in `ComicCreator`

*   `constructor()`: (Lines 10-36) Initializes `this.uploadedImages`.
*   `init()`: (Lines 38-53) Initializes selection tracking (`this.selectedAssets`, `this.lastSelectedAsset`) and sets up the global click handler for clearing selections. Calls `setupUploadArea()`.
*   `setupUploadArea()`: (Lines 55-76) Sets up event listeners for the initial image upload area (click, drag/drop). Calls `handleImageUpload`.
*   `handleImageUpload(files)`: (Lines 78-111) Processes uploaded files, reads them as data URLs, creates image metadata objects, adds them to `this.uploadedImages` and the current folder in `this.folderStructure`, and calls `updateImageLibrary` and `enableNextButton`.
*   `updateImageLibrary()`: (Lines 113-248) Renders the image and folder thumbnails in the library views (both initial upload page and editor sidebar). It handles displaying items from the `currentFolderId`, showing 'in-use' status, restoring selection states, adding back/create folder buttons, and setting up calls to `setupImageSelection` and `dragAndDropManager` methods for each item. ***Note:*** *This method currently also handles folder rendering logic, which belongs to `FolderSystem`. It also calls DragAndDropManager methods.*
*   `setupImageSelection(container)`: (Lines 250-297) Adds click event listeners to thumbnail containers (`.thumbnail-container`) to handle single selection, multi-selection (Ctrl/Cmd), and range selection (Shift). Updates `this.selectedAssets` and `this.lastSelectedAsset`.
*   `deleteImage(imageId)`: (Lines 302-316) Removes an image from `this.uploadedImages` and all folders in `this.folderStructure`. Calls `updateImageLibrary` and `enableNextButton`.
*   `enableNextButton()`: (Lines 318-321) Enables/disables the "Next Step" button based on whether any images have been uploaded (`this.uploadedImages.length`).
*   `clearSelection()`: (Lines 5295-5301) Clears the `this.selectedAssets` array and removes the `.selected` class from thumbnails.
*   `createComic()`: (Lines 1182-1246) Part of this method sets up the *editor sidebar's* upload area and calls `updateImageLibrary` to populate the sidebar library view.

## Dependencies & Interactions

*   **`FolderSystem`**: `updateImageLibrary` reads `this.folderStructure` and `this.currentFolderId` to display the correct items. `handleImageUpload` adds new image IDs to the current folder. `deleteImage` removes image IDs from folders.
*   **`DragAndDropManager`**: `updateImageLibrary` calls D&D setup methods (`setupImageDragAndDrop`).
*   **`PanelManager` (Future)**: `updateImageLibrary` checks panel `dataset.imageId` to mark thumbnails as 'in-use'.
*   **UI Elements**: Methods interact with DOM elements like `.upload-area`, `#file-input`, `.thumbnails-grid`, `.thumbnail-container`, `#next-step-btn`.
*   **`Utils`**: Uses `getTextWithLineBreaks` indirectly via `applyTextOutline` call within `loadPageState` (though this seems less directly related to the library itself).
*   **State Management**: `saveCurrentPageState` reads `panel.dataset.imageId` but doesn't directly manage the library state itself. `loadProject` loads images into `this.uploadedImages` and populates the initial folder structure.

## Refactoring Considerations

*   The `ImageLibrary` module should encapsulate `uploadedImages`, `selectedAssets`, and `lastSelectedAsset`.
*   Methods like `handleImageUpload`, `updateImageLibrary`, `setupImageSelection`, `deleteImage`, `enableNextButton`, and `clearSelection` should be moved to `ImageLibrary`.
*   `updateImageLibrary` needs careful refactoring to separate its responsibilities:
    *   Image/Folder data retrieval (potentially staying in `ImageLibrary` or interacting with `FolderSystem`).
    *   DOM manipulation/rendering (should ideally be handled by `ImageLibrary`).
    *   Event listener setup for selection (belongs in `ImageLibrary`).
    *   Calls to `DragAndDropManager` setup methods (should be managed either by `ImageLibrary` or potentially the main `ComicCreator` after the library is rendered).
    *   Folder-specific rendering (like back button, create folder button) should be delegated to or handled in coordination with `FolderSystem`.
*   The `ImageLibrary` will need access to the `ComicCreator` instance to interact with `FolderSystem`, `DragAndDropManager`, and potentially trigger UI updates or read panel states.
*   The initial `setupUploadArea` and the editor sidebar's upload area setup might need slight adjustments to call the new `ImageLibrary`'s upload handler.
*   The `loadProject` method in `ComicCreator` will need to interact with the `ImageLibrary` instance to load image data. 