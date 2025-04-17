# Cursor Rule: Refactoring TextManager from main.js

## Goal
Extract all text bubble management related logic from `src/js/main.js` into a new module `src/js/modules/TextManager.js`.

## Constraint
- Maintain 100% identical functionality and visual design.
- Do not break or alter any unrelated functionality in `main.js`.
- The refactoring should happen incrementally.

## Identified Methods/Logic for `TextManager`

*   **Text Bubble Creation:** `addTextToPanel`, `addTextToCanvas`.
*   **Selection:** `selectTextBox`.
*   **UI/Controls:** `updateTextProperties`, `showTextFormatPopup`, `setupPopupEventListeners`.
*   **Styling/Effects Helpers:** `getRotationValue`, `applyTextOutline`, `removeTextOutline`, `applyTextShadow`, `removeTextShadow`, `updateBubbleTail`, `positionTextBox`, `getOutlineThickness`, `getOutlineColor`, `getShadowColor`, `getBubbleBackgroundColor`. (Note: `getTextWithLineBreaks` and `globalRgbToHex` are already in `Utils`).
*   **State Management:** Parts of `saveCurrentPageState` (saving `textElements` in panel state, saving `canvasTextElements` on page state) and `loadPageState` (restoring `textElements` and `canvasTextElements`).
*   **Event Handling:** Logic within the 'Add Text' button listener, Delete keydown listener (related to text), and click listeners set up on text bubbles/elements.
*   **Properties:** `currentTextBox` (or potentially `selectedElement` if used for text).

## Strategy: Phased Approach

1.  **Create `TextManager.js` Skeleton:**
    *   Create the file `src/js/modules/TextManager.js`.
    *   Define a `TextManager` class.
    *   Constructor should accept `comicCreator` instance and store it (`this.comicCreator`).
    *   Initialize internal state property: `this.currentTextBox = null;`.

2.  **Instantiate in `ComicCreator`:**
    *   In `main.js`, import `TextManager`.
    *   In `ComicCreator` constructor, create instance: `this.textManager = new TextManager(this);`.
    *   Remove `this.currentTextBox = null;` initialization from `ComicCreator` (or update accessors).

3.  **Move Text Creation Methods:**
    *   Move `addTextToPanel` and `addTextToCanvas` one by one.
    *   **Update Call Sites:** Change calls in `main.js` (e.g., 'Add Text' button listener) to use `this.textManager.addTextToPanel(...)` or `this.textManager.addTextToCanvas(...)`. Remember to pass necessary arguments like the target panel if needed.
    *   **Update Internal References:**
        *   `this.dragAndDropManager...` -> `this.comicCreator.dragAndDropManager...`.
        *   `this.selectTextBox(...)` -> `this.selectTextBox(...)` (will be moved next).
        *   `this.showTextFormatPopup(...)` -> `this.showTextFormatPopup(...)` (will be moved).
        *   `this.saveCurrentPageState()` -> `this.comicCreator.saveCurrentPageState()`.

4.  **Move Selection and UI Methods:**
    *   Move `selectTextBox`, `updateTextProperties`, `showTextFormatPopup`, `setupPopupEventListeners`.
    *   **Update Call Sites:** Ensure calls from `addTextToPanel`, `addTextToCanvas`, and event listeners are correctly referencing methods within `TextManager`.
    *   **Update Internal References:**
        *   `this.currentTextBox` -> `this.currentTextBox` (within `TextManager`).
        *   `this.deselectAll()` -> `this.comicCreator.deselectAll()`.
        *   Accessing UI elements (e.g., `#text-properties`, `#text-format-popup`) remains the same.
        *   `this.saveCurrentPageState()` -> `this.comicCreator.saveCurrentPageState()`.
        *   Helper methods (`getRotationValue`, etc.) -> `this.helperMethod(...)` (will be moved).
        *   Utility methods like `globalRgbToHex` -> `this.comicCreator.utils.globalRgbToHex` or import `Utils` directly.
        *   `this.makeSliderValueEditable(...)` -> `this.comicCreator.makeSliderValueEditable(...)` (potential UIManager candidate).

5.  **Move Helper Methods:**
    *   Move all identified helper methods for styling/effects one by one.
    *   Verify they are called correctly using `this.methodName(...)` within `TextManager`.

6.  **Refactor State Management:**
    *   **Saving:** Create `saveTextStates()` in `TextManager`. This method should return an object like `{ panelText: [...], canvasText: [...] }`. Extract the logic for mapping panel `textElements` and canvas `textElements` from `ComicCreator.saveCurrentPageState` into this new method. `ComicCreator.saveCurrentPageState` will call `const textStates = this.textManager.saveTextStates();`, then assign `currentPage.panelStates[index].textElements = textStates.panelText[index];` (carefully, inside the panel mapping) and `currentPage.canvasTextElements = textStates.canvasText;`.
    *   **Loading:** Create `loadTextStates(page)` in `TextManager`. Extract the logic for restoring panel `textElements` and `canvasTextElements` from `ComicCreator.loadPageState`. This method will need the `page` object to access the saved states and the DOM elements (panels, canvas) to append the restored text bubbles. `ComicCreator.loadPageState` will call `this.textManager.loadTextStates(page);`.
    *   Ensure internal calls within loading logic (e.g., `this.dragAndDropManager...`, `this.selectTextBox`, `this.showTextFormatPopup`) use `this.comicCreator.` or `this.` appropriately.

7.  **Update Event Handlers:**
    *   Modify the 'Delete' keydown listener in `main.js` to check `this.textManager.currentTextBox` and call a new `this.textManager.deleteSelectedTextBox()` method if applicable.
    *   Ensure click listeners set up within text bubble creation correctly call `this.selectTextBox()` or `this.showTextFormatPopup()`.

8.  **Testing (After Each Major Step):**
    *   Manually test text functionality thoroughly:
        *   Adding text to panels and canvas in different modes.
        *   Selecting text bubbles.
        *   Using all controls in the text properties panel and the format popup.
        *   Dragging and resizing text bubbles.
        *   Deleting text bubbles (via Delete key or future button).
        *   Saving/Loading projects (ensure text bubbles, content, styles, positions are restored correctly in panels and on canvas).

## Key Considerations Checklist:
- [ ] Passed `ComicCreator` instance to `TextManager` constructor?
- [ ] Stored `comicCreator` instance as `this.comicCreator`?
- [ ] Imported `TextManager` in `main.js`?
- [ ] Instantiated `this.textManager = new TextManager(this);` in `ComicCreator` constructor?
- [ ] Initialized `this.currentTextBox = null` in `TextManager` constructor?
- [ ] Updated *all* external calls in `main.js` to use `this.textManager.methodName()`?
- [ ] Updated *all* internal references within moved methods (check `this.` vs `this.comicCreator.`)?
- [ ] Refactored save/load logic for text states?
- [ ] Updated relevant event handlers (Add Text, Delete key)?
- [ ] Tested thoroughly after each step? 