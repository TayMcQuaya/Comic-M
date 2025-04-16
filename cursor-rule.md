# Cursor Rule: Refactoring PanelManager from main.js

## Goal
Extract all panel management related logic from `src/js/main.js` into a new module `src/js/modules/PanelManager.js`.

## Constraint
- Maintain 100% identical functionality and visual design.
- Do not break or alter any unrelated functionality in `main.js`.
- The refactoring should happen incrementally.

## Identified Methods/Logic for `PanelManager`

*   **Panel Creation:** Part of `createComic` (creating `.comic-panel` divs based on layout).
*   **Image Handling:** `addImageToPanel`, `clearPanelImage`.
*   **Selection:** `selectPanel`.
*   **Controls:** `updatePanelControls`, `handleZoom`, `handlePositionChange`.
*   **State Management:** Parts of `saveCurrentPageState` and `loadPageState` related to panel image ID, transform, position, etc.

## Strategy: Phased Approach

1.  **Create `PanelManager.js` Skeleton:**
    *   Create the file `src/js/modules/PanelManager.js`.
    *   Define a `PanelManager` class.
    *   Constructor should accept `comicCreator` instance and store it (`this.comicCreator`).
    *   Initialize internal state property: `this.currentPanel = null;`.

2.  **Instantiate in `ComicCreator`:**
    *   In `main.js`, import `PanelManager`.
    *   In `ComicCreator` constructor, create instance: `this.panelManager = new PanelManager(this);`.
    *   Remove `this.currentPanel = null;` initialization from `ComicCreator` (or update accessors if it remains temporarily).

3.  **Move Panel Creation Logic:**
    *   Create a `createPanels(layoutConfig, canvas)` method in `PanelManager`.
    *   Move the panel div creation loop from `ComicCreator.createComic` into `PanelManager.createPanels`.
    *   Update internal references (e.g., `canvas.appendChild` can stay if `canvas` is passed in).
    *   Update `ComicCreator.createComic` to call `this.panelManager.createPanels(layoutConfig, canvas);`.

4.  **Move Panel Interaction Methods:**
    *   Move `addImageToPanel`, `selectPanel`, `clearPanelImage` one by one.
    *   **Update Call Sites:** Change calls in `main.js` (e.g., in `drop` listener, `click` listener, `keydown` listener) to use `this.panelManager.methodName(...)`.
    *   **Update Internal References:**
        *   `this.currentPanel` -> `this.currentPanel` (within `PanelManager`).
        *   `this.updateImageLibrary()` -> `this.comicCreator.imageLibrary.updateThumbnails()`.
        *   `this.dragAndDropManager.setupImageDragging(...)` -> `this.comicCreator.dragAndDropManager.setupImageDragging(...)`.
        *   `this.updatePanelControls(...)` -> `this.updatePanelControls(...)` (will be moved).
        *   `this.saveCurrentPageState()` -> `this.comicCreator.saveCurrentPageState()`.
        *   `this.showSelectPanelModal()` -> `this.comicCreator.showSelectPanelModal()` (or move later to UIManager).

5.  **Move Panel Control Methods:**
    *   Move `updatePanelControls`, `handleZoom`, `handlePositionChange` one by one.
    *   **Update Call Sites:** Ensure calls within `selectPanel`, `clearPanelImage`, and the event listeners set up by `updatePanelControls` now correctly reference the methods within `PanelManager` (they should just work if moved correctly).
    *   **Update Internal References:**
        *   References to panel controls UI elements (e.g., `.zoom-control`) remain the same.
        *   `this.saveCurrentPageState()` -> `this.comicCreator.saveCurrentPageState()`.
        *   `this.makeSliderValueEditable(...)` -> `this.comicCreator.makeSliderValueEditable(...)` (this is a UI helper, could move later).

6.  **Refactor State Management:**
    *   **Saving:** Create `savePanelStates()` method in `PanelManager`. Move the panel state mapping logic from `ComicCreator.saveCurrentPageState` into this new method. `ComicCreator.saveCurrentPageState` will then call `currentPage.panelStates = this.panelManager.savePanelStates();`.
    *   **Loading:** Create `loadPanelStates(panelStates)` method in `PanelManager`. Move the panel state application logic (finding panels, restoring image, transforms, position) from `ComicCreator.loadPageState` into this new method. `ComicCreator.loadPageState` will then call `this.panelManager.loadPanelStates(page.panelStates);`.
    *   Verify `this.imageLibrary.getImageById` is used correctly within the loading logic.

7.  **Testing (After Each Major Step):**
    *   Manually test panel functionality thoroughly:
        *   Panel creation on new page/load.
        *   Dragging images to panels.
        *   Selecting panels.
        *   Using panel controls (zoom, flip, rotate, position).
        *   Clearing panel image (via Delete key or future button).
        *   Saving/Loading projects (ensure panel images and transforms are restored).

## Key Considerations Checklist:
- [ ] Passed `ComicCreator` instance to `PanelManager` constructor?
- [ ] Stored `comicCreator` instance as `this.comicCreator`?
- [ ] Imported `PanelManager` in `main.js`?
- [ ] Instantiated `this.panelManager = new PanelManager(this);` in `ComicCreator` constructor?
- [ ] Initialized `this.currentPanel = null` in `PanelManager` constructor?
- [ ] Updated *all* external calls in `main.js` to use `this.panelManager.methodName()`?
- [ ] Updated *all* internal references within moved methods?
- [ ] Refactored save/load logic for panel states?
- [ ] Tested thoroughly after each step? 