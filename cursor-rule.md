# Cursor Rule: Refactoring StickerManager from main.js

## Goal
Extract all sticker management related logic from `src/js/main.js` into a new module `src/js/modules/StickerManager.js`.

## Constraint
- Maintain 100% identical functionality and visual design.
- Do not break or alter any unrelated functionality in `main.js`.
- The refactoring should happen incrementally.

## Identified Methods/Logic for `StickerManager`

*   **Properties:**
    *   `currentSticker`: Tracks the currently selected sticker element.
*   **Core Methods:**
    *   `addSticker(image, dropX, dropY)`: Handles adding a new sticker to the canvas.
    *   `selectSticker(stickerElement)`: Manages the selection state of stickers.
    *   `deleteSelectedSticker()`: Handles the deletion of the currently selected sticker.
*   **UI/Controls:**
    *   `updateStickerControls(stickerElement)`: Populates the right sidebar with controls for the selected sticker.
    *   Event listeners within `updateStickerControls` for delete, size, flip, etc.
*   **State Management:**
    *   `saveStickerStates()`: Extracts logic from `ComicCreator.saveCurrentPageState` to gather state data (position, size, flip, etc.) from all sticker elements on the canvas.
    *   `loadStickerStates(page)`: Extracts logic from `ComicCreator.loadPageState` to recreate sticker elements on the canvas based on saved state in the `page` object.
*   **Event Handling (to be updated in `main.js`):**
    *   Canvas `'drop'` listener: Needs to call `stickerManager.addSticker` when in 'stickers' mode.
    *   Canvas `'click'` listener: Needs to call `stickerManager.selectSticker` when a sticker is clicked.
    *   Document `'keydown'` (Delete key): Needs to check `stickerManager.currentSticker` and call `stickerManager.deleteSelectedSticker` when in 'stickers' mode.
*   **Dependencies:**
    *   Needs access to `comicCreator` instance to call:
        *   `comicCreator.imageLibrary.getImageById()`
        *   `comicCreator.dragAndDropManager.makeStickerDraggable()`
        *   `comicCreator.saveCurrentPageState()` (called after actions like delete, flip, resize)
        *   `comicCreator.deselectAll()`
        *   `comicCreator.makeSliderValueEditable()`

## Strategy: Phased Approach

1.  **Create `StickerManager.js` Skeleton:**
    *   Create the file `src/js/modules/StickerManager.js`.
    *   Define a `StickerManager` class.
    *   Constructor should accept `comicCreator` instance and store it (`this.comicCreator`).
    *   Initialize internal state property: `this.currentSticker = null;`.

2.  **Instantiate in `ComicCreator`:**
    *   In `main.js`, import `StickerManager`.
    *   In `ComicCreator` constructor, create instance: `this.stickerManager = new StickerManager(this);`.
    *   Remove `this.currentSticker = null;` initialization from `ComicCreator` (if it exists). Currently, it's implicitly null.

3.  **Move Core Sticker Methods:**
    *   Move `addSticker`, `selectSticker`, and `updateStickerControls` one by one.
    *   **Update Call Sites:** Change calls in `main.js` (e.g., drop listener, click listener, `updateRightSidebarView`) to use `this.stickerManager.methodName(...)`.
    *   **Update Internal References:** Within the moved methods, update references like:
        *   `this.currentSticker` -> `this.currentSticker` (within `StickerManager`).
        *   `this.imageLibrary...` -> `this.comicCreator.imageLibrary...`
        *   `this.dragAndDropManager...` -> `this.comicCreator.dragAndDropManager...`
        *   `this.saveCurrentPageState()` -> `this.comicCreator.saveCurrentPageState()`
        *   `this.selectSticker(...)` -> `this.selectSticker(...)`
        *   `this.updateStickerControls(...)` -> `this.updateStickerControls(...)`
        *   `this.deselectAll()` -> `this.comicCreator.deselectAll()`
        *   `this.makeSliderValueEditable(...)` -> `this.comicCreator.makeSliderValueEditable(...)`

4.  **Create and Move Deletion Logic:**
    *   Create `deleteSelectedSticker()` in `StickerManager`. Move the sticker removal logic (DOM removal, state update, deselect, save) from the 'Delete' keydown handler in `main.js` into this method.
    *   Update the 'Delete' keydown handler in `main.js` to call `this.stickerManager.deleteSelectedSticker()` when appropriate.
    *   Update the delete button listener within `updateStickerControls` to call `this.deleteSelectedSticker()`. 

5.  **Refactor State Management:**
    *   **Saving:** Create `saveStickerStates()` in `StickerManager`. Move the sticker mapping logic from `ComicCreator.saveCurrentPageState` into this new method. It should query `.canvas-sticker-image` and return an array of state objects. `ComicCreator.saveCurrentPageState` will call `currentPage.stickerStates = this.stickerManager.saveStickerStates();`.
    *   **Loading:** Create `loadStickerStates(page)` in `StickerManager`. Move the sticker restoration loop from `ComicCreator.loadPageState` into this method. It needs the `page` object to access `page.stickerStates`. `ComicCreator.loadPageState` will call `this.stickerManager.loadStickerStates(page);`.
    *   Ensure internal calls within loading logic (`this.comicCreator.imageLibrary...`, `this.comicCreator.dragAndDropManager...`, `this.selectSticker`) use the correct references.

6.  **Final Cleanup and Verification:**
    *   Review `main.js` and remove any remaining direct references or properties related to sticker management that are now handled by `StickerManager`.
    *   Ensure `deselectAll` in `main.js` calls `this.stickerManager.deselectCurrentSticker()` (or similar method to be added in StickerManager to handle internal state `this.currentSticker = null`).
    *   Ensure `updateRightSidebarView` correctly calls `this.stickerManager.updateStickerControls()` when needed.

7.  **Testing (After Each Major Step):**
    *   Manually test sticker functionality thoroughly:
        *   Adding stickers via drag-and-drop in 'stickers' mode.
        *   Selecting/deselecting stickers.
        *   Using sticker controls (size, flip, delete button) in the sidebar.
        *   Deleting selected stickers using the Delete key.
        *   Dragging stickers.
        *   Switching between sidebar modes (ensure selection/sidebar updates correctly).
        *   Saving/Loading projects (ensure stickers, positions, sizes, flip state are restored correctly).

## Key Considerations Checklist:
- [ ] Passed `ComicCreator` instance to `StickerManager` constructor?
- [ ] Stored `comicCreator` instance as `this.comicCreator`?
- [ ] Imported `StickerManager` in `main.js`?
- [ ] Instantiated `this.stickerManager = new StickerManager(this);` in `ComicCreator` constructor?
- [ ] Initialized `this.currentSticker = null` in `StickerManager` constructor?
- [ ] Updated *all* relevant external calls in `main.js` to use `this.stickerManager.methodName()`?
- [ ] Updated *all* internal references within moved methods (check `this.` vs `this.comicCreator.`)?
- [ ] Refactored save/load logic for sticker states?
- [ ] Updated relevant event handlers (Drop, Click, Delete key)?
- [ ] Added method in `StickerManager` to handle deselecting its internal `currentSticker` and called it from `ComicCreator.deselectAll`?
- [ ] Tested thoroughly after each step? 