# Cursor Rule: Refactoring BackgroundManager from main.js

## Goal
Extract all background management related logic (styles and images) from `src/js/main.js` into a new module `src/js/modules/BackgroundManager.js`.

## Constraint
- Maintain 100% identical functionality and visual design.
- Do not break or alter any unrelated functionality in `main.js`.
- The refactoring should happen incrementally.

## Identified Methods/Logic for `BackgroundManager`

*   **Properties:**
    *   `useGlobalBackgroundStyle`: Tracks whether the global style is active.
    *   `globalBackgroundStyle`: Stores the current global style class name.
    *   Possibly a way to track the currently selected background image element if needed, though direct DOM query might suffice.
*   **Core Methods:**
    *   `applyBackgroundStyle(style)`: Applies a predefined CSS class style to the canvas.
    *   `addBackgroundImage(image)`: Adds a custom image element as the canvas background.
    *   `removeBackgroundImage()`: Removes the custom background image element.
    *   `applyCustomBackgroundToAll()`: Applies the current page's background image to all other pages.
    *   `toggleGlobalBackground(useGlobal)`: Handles enabling/disabling the global style and updating page states accordingly.
*   **UI/Controls:**
    *   `updateBackgroundControls()`: Populates the right sidebar with controls for background styles and images. Includes event listeners for style buttons, global toggle, apply-all button.
*   **State Management:**
    *   `saveBackgroundState(currentPage)`: Extracts logic from `ComicCreator.saveCurrentPageState` to return the relevant state (`canvasBackgroundStyle`, `backgroundState.imageId`).
    *   `loadBackgroundState(page)`: Extracts logic from `ComicCreator.loadPageState` to apply the background style or image based on saved `page` data and `useGlobalBackgroundStyle`.
*   **Event Handling (to be updated in `main.js`):**
    *   Canvas `'drop'` listener: Needs to call `backgroundManager.addBackgroundImage` when in 'backgrounds' mode.
    *   Document `'keydown'` (Delete key): Needs to check for background image and call `backgroundManager.removeBackgroundImage` when in 'backgrounds' mode.
*   **Dependencies:**
    *   Needs access to `comicCreator` instance to call:
        *   `comicCreator.pages`
        *   `comicCreator.currentPageIndex`
        *   `comicCreator.imageLibrary.getImageById()`
        *   `comicCreator.saveCurrentPageState()` (called after actions like style change, add/remove image, toggle global)
        *   `comicCreator.loadPageState()` (called by `applyCustomBackgroundToAll` to refresh current page)
        *   `comicCreator.deselectAll()`
        *   `comicCreator.showNotification()`

## Strategy: Phased Approach

1.  **Create `BackgroundManager.js` Skeleton:**
    *   Create the file `src/js/modules/BackgroundManager.js`.
    *   Define a `BackgroundManager` class.
    *   Constructor accepts `comicCreator`, stores it.
    *   Initialize internal state properties: `this.useGlobalBackgroundStyle = comicCreator.useGlobalBackgroundStyle;`, `this.globalBackgroundStyle = comicCreator.globalBackgroundStyle;` (get initial values from comicCreator).

2.  **Instantiate in `ComicCreator`:**
    *   In `main.js`, import `BackgroundManager`.
    *   In `ComicCreator` constructor, create instance: `this.backgroundManager = new BackgroundManager(this);`.
    *   Remove `this.useGlobalBackgroundStyle` and `this.globalBackgroundStyle` initializations from `ComicCreator` constructor.

3.  **Move Core Background Methods:**
    *   Move `addBackgroundImage`, `applyBackgroundStyle`, `applyCustomBackgroundToAll`, and `updateBackgroundControls` one by one.
    *   **Update Call Sites:** Change calls in `main.js` (e.g., drop listener, `updateRightSidebarView`, `loadPageState`) to use `this.backgroundManager.methodName(...)`.
    *   **Update Internal References:** Within the moved methods, update references like:
        *   `this.useGlobalBackgroundStyle` -> `this.useGlobalBackgroundStyle` (within `BackgroundManager`)
        *   `this.globalBackgroundStyle` -> `this.globalBackgroundStyle` (within `BackgroundManager`)
        *   `this.pages` -> `this.comicCreator.pages`
        *   `this.currentPageIndex` -> `this.comicCreator.currentPageIndex`
        *   `this.imageLibrary...` -> `this.comicCreator.imageLibrary...`
        *   `this.saveCurrentPageState()` -> `this.comicCreator.saveCurrentPageState()`
        *   `this.loadPageState()` -> `this.comicCreator.loadPageState()`
        *   `this.applyBackgroundStyle(...)` -> `this.applyBackgroundStyle(...)`
        *   `this.showNotification(...)` -> `this.comicCreator.showNotification(...)`

4.  **Create and Move Deletion Logic:**
    *   Create `removeBackgroundImage()` in `BackgroundManager`. Move the background removal logic (DOM removal, state update, deselect, save) from the 'Delete' keydown handler in `main.js` into this method.
    *   Update the 'Delete' keydown handler in `main.js` to call `this.backgroundManager.removeBackgroundImage()` when appropriate.

5.  **Create Global Toggle Logic:**
    *   Create `toggleGlobalBackground(useGlobal)` in `BackgroundManager`. Move the logic from the checkbox listener inside `updateBackgroundControls` into this method. This method will update `this.useGlobalBackgroundStyle`, potentially update `this.globalBackgroundStyle`, apply changes to `comicCreator.pages`, and trigger `saveCurrentPageState`.
    *   Update the checkbox listener in `updateBackgroundControls` to call `this.toggleGlobalBackground(e.target.checked)`. Also update the initial checkbox state reading from `this.useGlobalBackgroundStyle`.

6.  **Refactor State Management:**
    *   **Saving:** Update `ComicCreator.saveCurrentPageState`: Replace direct access to `useGlobalBackgroundStyle`/`globalBackgroundStyle` with calls to getters in `BackgroundManager` if needed, or simply ensure `BackgroundManager` updates the properties on the `comicCreator` instance directly (simpler). The saving of `page.canvasBackgroundStyle` and `page.backgroundState` can remain in `main.js` for now, as `BackgroundManager` modifies these via `this.comicCreator.pages`. Similarly, saving `comicCreator.useGlobalBackgroundStyle` and `comicCreator.globalBackgroundStyle` in `saveProject` should fetch current values from the manager instance.
    *   **Loading:** Modify `ComicCreator.loadPageState`: Replace direct checks of `this.useGlobalBackgroundStyle`/`this.globalBackgroundStyle` with checks on `this.backgroundManager.useGlobalBackgroundStyle`/`this.backgroundManager.globalBackgroundStyle`. Replace direct `canvas.classList.add` with calls to `this.backgroundManager.applyBackgroundStyle()` or `this.backgroundManager.addBackgroundImage()` based on the loaded state.
    *   Modify `ComicCreator.loadProject`: Ensure `this.backgroundManager.useGlobalBackgroundStyle` and `this.backgroundManager.globalBackgroundStyle` are updated from the loaded `projectState`.

7.  **Final Cleanup and Verification:**
    *   Review `main.js` and remove any remaining direct references or properties related to background management (`useGlobalBackgroundStyle`, `globalBackgroundStyle`) that are now handled by `BackgroundManager`.
    *   Ensure `deselectAll` in `main.js` correctly handles deselecting background elements (it might not need specific changes if `currentBackground` wasn't a formal property).
    *   Ensure `updateRightSidebarView` correctly calls `this.backgroundManager.updateBackgroundControls()` when needed.

8.  **Testing (After Each Major Step):**
    *   Manually test background functionality thoroughly:
        *   Applying different predefined styles.
        *   Adding custom background images via drag-and-drop in 'backgrounds' mode.
        *   Toggling 'Apply to all pages' for styles and ensuring it affects other pages and saves correctly.
        *   Using 'Apply This Image to All Pages' button.
        *   Deleting custom background images using the Delete key.
        *   Switching between sidebar modes (ensure selection/sidebar updates correctly).
        *   Saving/Loading projects (ensure background styles, images, and global settings are restored correctly).

## Key Considerations Checklist:
- [ ] Passed `ComicCreator` instance to `BackgroundManager` constructor?
- [ ] Stored `comicCreator` instance as `this.comicCreator`?
- [ ] Initialized `BackgroundManager` properties from `comicCreator`?
- [ ] Imported `BackgroundManager` in `main.js`?
- [ ] Instantiated `this.backgroundManager = new BackgroundManager(this);` in `ComicCreator` constructor?
- [ ] Removed original properties (`useGlobalBackgroundStyle`, `globalBackgroundStyle`) from `ComicCreator` constructor?
- [ ] Updated *all* relevant external calls in `main.js` to use `this.backgroundManager.methodName()`?
- [ ] Updated *all* internal references within moved methods?
- [ ] Refactored save/load logic for background states in `main.js` to use manager?
- [ ] Updated relevant event handlers (Drop, Delete key)?
- [ ] Moved global toggle logic and updated listener?
- [ ] Updated `loadProject` to set manager state?
- [ ] Tested thoroughly after each step? 