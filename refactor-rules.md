# Cursor Rule: Refactoring UIManager from main.js

## Goal
Extract all UI management related logic from `src/js/main.js` into a new module `src/js/modules/UIManager.js`. This includes sidebar functionality, modals, notifications, and page navigation UI.

## Constraint
- Maintain 100% identical functionality and visual design.
- Do not break or alter any unrelated functionality in `main.js`.
- The refactoring should happen incrementally.

## Identified Methods/Logic for `UIManager`

*   **Core UI Setup:**
    *   `initializeUI()`: Sets up the initial UI elements, particularly page navigation. (Parts of this might remain in `main.js` for initial structure, but event listeners and dynamic updates move to UIManager).
    *   `setupPageNavigation()`: (Seems like a duplicate/alternative of `initializeUI`'s page navigation part, needs clarification, but the logic for creating and managing page nav controls belongs here).
*   **Sidebar Management:**
    *   `setupSidebarTabs()`: Handles switching between 'panels', 'backgrounds', 'stickers' tabs in the left sidebar.
    *   `updateRightSidebarView()`: Clears and populates the right properties panel based on the current mode and selection (delegates to specific manager methods like `backgroundManager.updateBackgroundControls`, `stickerManager.updateStickerControls`, `panelManager.updatePanelControls`, `textManager.updateTextProperties`).
*   **Modals:**
    *   `promptForFilename(...)`: Logic for showing/hiding the filename input modal and handling confirmation/cancellation.
    *   `reorderPages()`: Logic for showing/hiding the page reorder modal, populating the list, handling drag/drop within the modal, and confirming/cancelling the reorder (calls `applyPageReorder`).
    *   `showSelectPanelModal()`: Logic for showing/hiding the "Select a panel" notification modal.
*   **Notifications:**
    *   `showNotification(message, type)`: Handles creating, displaying, and hiding temporary notifications.
*   **Page Navigation Updates:**
    *   `updatePageIndicator()`: Updates the "Page X of Y" text and input value.
    *   `updateNavigationButtons()`: Enables/disables the previous/next page buttons.
*   **Utility/Helper:**
    *   `makeSliderValueEditable(...)`: Helper function to make slider value spans editable. (Could potentially go into `Utils.js` if deemed generic enough, but currently used only by UI controls setup).
*   **Event Handling (to be updated in `main.js` or delegated):**
    *   Page navigation button listeners (`#addPage`, `#prevPage`, `#nextPage`, `#deletePage`, `#reorderPagesBtn`, `#goToPage`, `#pageNumberInput`) set up in `initializeUI` need to call methods on `ComicCreator` or `UIManager` as appropriate.
    *   Sidebar tab click listener (`setupSidebarTabs`).
*   **Dependencies:**
    *   Needs access to `comicCreator` instance to call:
        *   `comicCreator.pages` (for page count, reordering)
        *   `comicCreator.currentPageIndex` (for page indicators)
        *   `comicCreator.panelManager`, `comicCreator.backgroundManager`, `comicCreator.stickerManager`, `comicCreator.textManager` (to call their `update...Controls` methods from `updateRightSidebarView`)
        *   `comicCreator.showLayoutSelection()` (called by Add Page button listener)
        *   `comicCreator.navigateToPage(...)` (called by page navigation listeners)
        *   `comicCreator.deleteCurrentPage()` (called by Delete Page button listener)
        *   `comicCreator.applyPageReorder(...)` (called by reorder modal confirmation)
        *   `comicCreator.deselectAll()` (called when switching sidebar tabs)
        *   Potentially other managers if UI directly interacts with them.

## Strategy: Phased Approach

1.  **Create `UIManager.js` Skeleton:**
    *   Create the file `src/js/modules/UIManager.js`.
    *   Define a `UIManager` class.
    *   Constructor accepts `comicCreator`, stores it as `this.comicCreator`.

2.  **Instantiate in `ComicCreator`:**
    *   In `main.js`, import `UIManager`.
    *   In `ComicCreator` constructor, create instance: `this.uiManager = new UIManager(this);`.

3.  **Move UI Setup and Management Methods:**
    *   Move `setupSidebarTabs`, `updateRightSidebarView`, `showNotification`, `showSelectPanelModal`, `makeSliderValueEditable`.
    *   **Update Call Sites:** Change calls in `main.js` (e.g., `init`, `deselectAll`, manager `update...Controls` methods if they call `showNotification`, Add Text button listener) to use `this.uiManager.methodName(...)`.
    *   **Update Internal References:** Within the moved methods, update references like:
        *   `this.currentSidebarMode` -> `this.comicCreator.currentSidebarMode` (UIManager might need to read this state)
        *   `this.updateRightSidebarView()` -> `this.updateRightSidebarView()` (internal call within UIManager)
        *   `this.deselectAll()` -> `this.comicCreator.deselectAll()`
        *   References to other managers (`panelManager`, etc.) -> `this.comicCreator.panelManager`, etc.

4.  **Move Modal Logic:**
    *   Move `promptForFilename` and `reorderPages` (including the drag/drop logic *within* the modal).
    *   **Update Call Sites:** Update calls in `saveProject`, `downloadComic` (`exportManager`), and the reorder button listener (`initializeUI`) to use `this.uiManager.methodName(...)`.
    *   **Update Internal References:** Ensure callbacks within modals (e.g., confirm/cancel) call appropriate `comicCreator` methods (`applyPageReorder`).

5.  **Move Page Navigation Logic:**
    *   Move `initializeUI` (specifically the part creating page nav elements and attaching listeners).
    *   Move `updatePageIndicator`, `updateNavigationButtons`. Note: `setupPageNavigation` seems redundant and its code should be merged/handled within `initializeUI`.
    *   **Update Call Sites:**
        *   `init` in `main.js` should call `this.uiManager.initializeUI()`.
        *   Methods in `main.js` that affect page count or index (`addNewPage`, `navigateToPage`, `deleteCurrentPage`, `loadProject`, `applyPageReorder`) should call `this.uiManager.updatePageIndicator()` and `this.uiManager.updateNavigationButtons()`.
    *   **Update Internal References:** Listeners within the moved `initializeUI` should call `this.comicCreator` methods (`showLayoutSelection`, `navigateToPage`, `deleteCurrentPage`) or `this.comicCreator.uiManager.reorderPages()`.

6.  **Refactor State Management (UI State):**
    *   The `UIManager` primarily reads state from `ComicCreator` (like `currentPageIndex`, `pages.length`, `currentSidebarMode`) and calls methods on `ComicCreator` or other managers. It likely won't hold much state itself, except potentially references to DOM elements it manages (modals, sidebars, etc.). Ensure all necessary state is accessed via `this.comicCreator`.

7.  **Final Cleanup and Verification:**
    *   Review `main.js` and remove the original methods that were moved to `UIManager`.
    *   Ensure all event listeners related to UI elements managed by `UIManager` are either set up within `UIManager` or correctly delegate to `UIManager` methods.

8.  **Testing (After Each Major Step):**
    *   Manually test all UI functionality thoroughly:
        *   Sidebar tab switching and corresponding right sidebar updates.
        *   Notifications appearing correctly.
        *   Filename prompt modal working for Save/Export.
        *   Page reorder modal working (drag/drop, confirm/cancel).
        *   "Select Panel" modal appearing correctly.
        *   Page navigation controls (buttons, input, indicator text) updating correctly after adding/deleting/navigating/reordering/loading pages.
        *   Editable slider values working.

## Key Considerations Checklist:
- [ ] Passed `ComicCreator` instance to `UIManager` constructor?
- [ ] Stored `comicCreator` instance as `this.comicCreator`?
- [ ] Imported `UIManager` in `main.js`?
- [ ] Instantiated `this.uiManager = new UIManager(this);` in `ComicCreator` constructor?
- [ ] Updated *all* relevant external calls in `main.js` to use `this.uiManager.methodName()`?
- [ ] Updated *all* internal references within moved methods to use `this.comicCreator...`?
- [ ] Updated relevant event handlers to call `UIManager` or `ComicCreator` methods?
- [ ] Ensured page navigation updates are called correctly from `main.js`?
- [ ] Removed original methods from `main.js` after moving?
- [ ] Tested thoroughly after each step?