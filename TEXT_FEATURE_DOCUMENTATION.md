# Comic-Pro Text Feature Documentation

This document provides a detailed overview of the text manipulation and management features within the Comic-Pro application. It is intended for developers and AI integrators (e.g., for N8N workflows) requiring a deep understanding of the text system's architecture and capabilities.

## 1. Overview

The text feature in Comic-Pro is managed by a modular system orchestrated by `TextManager.js`. This central manager delegates specific responsibilities to several sub-modules:

*   **`TextManagerCoreSetup.js`**: Handles initial default settings and their persistence in `localStorage`.
*   **`TextManagerBubbleManipulation.js`**: Manages the lifecycle of text bubbles (creation, selection, deletion, rotation).
*   **`TextManagerStyling.js`**: Controls all visual aspects of text bubbles, including the properties panel and a detailed formatting popup.
*   **`TextManagerCustomStyles.js`**: Manages user-defined style presets.
*   **`TextManagerState.js`**: Handles saving and loading the state of all text elements on a page.
*   **`TextManagerUtils.js`**: Provides utility functions for common text-related operations.

Interactions with other modules like `UIManager.js` (for UI elements like modals and notifications, and managing property panel visibility) and `Utils.js` (for general helper functions like color conversion) are also involved.

## 2. `TextManager.js` - Main Coordinator

`TextManager.js` acts as the primary interface and coordinator for all text-related functionalities.

*   **Initialization**:
    *   Instantiates all sub-modules (`TextManagerCoreSetup`, `TextManagerUtils`, `TextManagerBubbleManipulation`, `TextManagerStyling`, `TextManagerCustomStyles`, `TextManagerState`).
    *   Passes a reference to the main `ComicCreator` instance to these sub-modules.
    *   After all modules are initialized, it calls `this.coreSetup.loadTextSettings()` to load any previously saved default text settings and custom styles from `localStorage`.

*   **Public API (Properties and Methods)**:
    *   `currentTextBox`: Getter and setter for the currently selected text bubble.
    *   `defaultTextSettings`: Getter for the application's default text styles.
    *   `defaultSpeechTailSettings`: Getter for default speech bubble tail settings.
    *   `defaultThoughtTailSettings`: Getter for default thought bubble tail settings.
    *   `customTextStyles`: Getter and setter for the array of user-defined custom text styles.
    *   Delegates most of its methods to the appropriate sub-module. For example:
        *   `addTextToPanel(panel)` delegates to `bubbleManipulation.addTextToPanel(panel)`.
        *   `deleteSelectedTextBox()` delegates to `bubbleManipulation.deleteSelectedTextBox()`.
        *   `updateTextProperties(textBox)` delegates to `styling.updateTextProperties(textBox)`.
        *   `saveTextSettings()` delegates to `coreSetup.saveTextSettings()`.
        *   `createCustomTextStyle(textBox, styleName)` delegates to `customStyles.createCustomTextStyle(textBox, styleName)`.
        *   `saveTextStates()` delegates to `state.saveTextStates()`.
        *   `loadTextStates(pageState)` delegates to `state.loadTextStates(pageState)`.

*   **Facade Pattern**: The methods exposed by `TextManager.js` often mimic the API of an older, monolithic `TextManagerOld.js`, providing a consistent interface while using the newer modular architecture.

## 3. `TextManagerCoreSetup.js` - Settings and Persistence

This module is responsible for initializing and managing default settings and custom styles, and persisting them.

*   **Default Settings Initialization**:
    *   `defaultTextSettings`: An object defining the default appearance for new text bubbles (e.g., font family, size, color, weight, style, decoration, alignment, default bubble type).
    *   `defaultSpeechTailSettings`: An object defining default parameters for speech bubble SVG tails (e.g., usage flag, color, position, length, width, inset, shear, outline flag).
    *   `defaultThoughtTailSettings`: An object defining default parameters for thought bubble SVG tails (e.g., usage flag, color, position, inset, number of circles, circle radius, spacing, offset).
*   **Custom Styles Storage**:
    *   `customTextStyles`: An array that stores user-created text style presets. Each preset is an object containing the style properties.
*   **LocalStorage Interaction**:
    *   `saveTextSettings()`: Serializes `this.defaultTextSettings` to `localStorage` under the key `'comicCreator_defaultTextSettings'` and `this.customTextStyles` under the key `'comicCreator_customTextStyles'`.
    *   `loadTextSettings()`: Retrieves and parses settings from these respective `localStorage` keys. If found, it updates the module's internal state. If not found, the initial default values are used.

## 4. `TextManagerBubbleManipulation.js` - Bubble Lifecycle and Interaction

This module handles the creation, selection, deletion, and basic transformations of text bubbles.

*   **Creating Text Bubbles**:
    *   `addTextToPanel(panel)`: Creates a new text bubble and appends it to the specified comic panel.
    *   `addTextToCanvas()`: Creates a new text bubble and appends it to the main comic canvas (for text outside panels).
    *   **Initial Structure**: New bubbles are created with:
        *   A main `div` with class `.text-bubble`.
        *   An inner `div` with class `.text-content` (usually set to "Click to edit text").
        *   Control handles: `.drag-handle`, `.resize-handle` (corners), `.format-text-btn`, `.delete-text-btn`, `.rotate-text-handle`.
        *   Default styles applied from `TextManagerCoreSetup.defaultTextSettings`.
        *   Event listeners for selection, drag, resize, format, delete, and rotate.
*   **Selection and Deselection**:
    *   `selectTextBox(textBox)`:
        *   Manages the visual selection state (e.g., adding an `.selected` class).
        *   Deselects any other selected elements in the application via `comicCreator.deselectAll()`.
        *   Updates the main properties panel by calling `comicCreator.textManagerStyling.updateTextProperties(textBox)`.
        *   Makes the `textBox` the `comicCreator.textManager.currentTextBox`.
    *   `deselectCurrentTextBox()`:
        *   Clears the current selection.
        *   Hides the text format popup.
        *   Sets `comicCreator.textManager.currentTextBox` to `null`.
*   **Deletion**:
    *   `deleteSelectedTextBox()`: Removes the `currentTextBox` from the DOM and resets the selection state. Updates application state.
*   **Rotation**:
    *   `setupRotationHandle(rotationHandle, textBox)`:
        *   Attaches mousedown event listeners to the rotation handle.
        *   Implements drag-to-rotate functionality, calculating the angle based on mouse movement relative to the text box center and applying it via `textBox.style.transform = \`rotate(\${angle}deg)\`;`.
        *   A double-click on the rotation handle resets the rotation to 0 degrees.

## 5. `TextManagerStyling.js` - Visual Properties and UI

This module is responsible for all styling aspects of text bubbles, including managing the main properties panel and a detailed format popup.

*   **Main Properties Panel (`#text-properties`)**:
    *   `updateTextProperties(textBox)`: Populates the `#text-properties` panel (located in the right sidebar) with controls for the selected `textBox`.
    *   Controls typically include:
        *   Bubble type (speech, thought, caption, none).
        *   Font family, size, color.
        *   Simple styles (bold, italic, underline).
        *   Rotation input.
    *   Attaches event listeners to these controls to apply changes directly to the `textBox` and often triggers state saving.
    *   The visibility of this panel is controlled by `UIManager.updateRightSidebarView()`.
*   **Text Format Popup**:
    *   `showTextFormatPopup(textBox, event)`: Creates and displays a modal-like popup near the `textBox` when the format button is clicked.
    *   **Structure**: The popup is dynamically generated and contains comprehensive styling options organized into sections:
        *   **Custom Styles**: Displays saved custom style presets for application.
        *   **Bubble Style**: Controls for bubble type (speech, thought, caption, none), fill color, opacity, border/stroke, corner radius.
        *   **Bubble Tail**: Controls for tail visibility, position (8 points around the bubble), color. For speech/thought bubbles, includes SVG parameters for the tail shape (e.g., base width, curve points for speech; number of small bubbles, radius for thought). These settings are often stored in `textBox.dataset.tailSettings`.
        *   **Text Style**: Font family, size, weight, style (italic), decoration (underline), line height, character/word spacing, text alignment (horizontal/vertical), text color.
        *   **Effects**: Text outline (color, thickness), text shadow (color, x/y offset, blur).
        *   **Position & Size**: Grid-based quick positioning, rotation input, width/height inputs.
    *   `setupPopupEventListeners(popup, textBox)`: Attaches numerous event listeners to all interactive elements within the popup. These listeners:
        *   Modify the styles of the `textBox` and its `.text-content` element.
        *   Update `dataset` attributes on the `textBox` (e.g., `data-tail-settings`, `data-has-outline`).
        *   Often trigger `comicCreator.saveState()` or specific save functions.
        *   May call other `TextManagerStyling` methods like `updateBubbleTail()`.
    *   `updatePopupControls(popup, textBox)`: Synchronizes the state of the controls within the format popup to reflect the actual current styles of the selected `textBox`. This ensures UI consistency.
*   **Style Application**:
    *   `applyTextOutline()`, `removeTextOutline()`: Manages text outlines using CSS `text-shadow` with multiple offsets to simulate a stroke. Stores outline state in `data-has-outline` and `data-outline-color` attributes.
    *   `applyTextShadow()`, `removeTextShadow()`: Manages standard CSS `text-shadow`.
*   **Bubble Tail Management**:
    *   `updateBubbleTail(textBox)`: The core function for drawing or updating a bubble's tail. It reads settings from `textBox.dataset.tailSettings` and the selected tail position.
    *   `createSpeechBubbleSvgTail(textBox, settings)`: Generates an SVG element for a speech bubble tail based on parameters like base width, control points for curves, and tip position. Appends it to the `textBox`.
    *   `createThoughtBubbleSvgTail(textBox, settings)`: Generates SVG elements (multiple circles) for a thought bubble tail.
    *   `updateSvgTailSettings(textBox, newSettings)`: Updates the `textBox.dataset.tailSettings` with new values and redraws the tail.
    *   The tail is dynamically positioned and styled based on the bubble's dimensions and tail settings.
*   **Quick Positioning**:
    *   `positionTextBox(textBox, gridPosition)`: Allows quick positioning of the `textBox` to predefined locations on its parent (e.g., top-left, center-center). Updates `textBox.dataset.positionGrid`.

## 6. `TextManagerCustomStyles.js` - User-Defined Style Presets

This module handles the creation, application, deletion, and UI for custom text style presets.

*   **Managing Default Styles**:
    *   `setDefaultTextSettings(textBox)`: Takes the current style of the provided `textBox` and sets it as the new application-wide default style by updating `comicCreator.textManager.coreSetup.defaultTextSettings`. It then saves all settings via `comicCreator.textManager.saveTextSettings()`.
*   **Custom Style Lifecycle**:
    *   `createCustomTextStyle(textBox, styleName)`:
        *   Extracts all relevant style properties from the given `textBox` (similar to what `TextManagerState` saves).
        *   Creates a new style preset object, including the `styleName` and a unique `id`.
        *   Adds this preset to the `comicCreator.textManager.coreSetup.customTextStyles` array.
        *   Saves all settings.
        *   Regenerates the custom styles HTML in the format popup.
    *   `applyCustomTextStyle(textBox, styleId)`:
        *   Finds the custom style preset by `styleId` from `customTextStyles`.
        *   Applies all stored properties from the preset to the `textBox`. This involves setting CSS styles, `dataset` attributes, and potentially calling `updateBubbleTail()`.
    *   `deleteCustomTextStyle(styleId)`:
        *   Removes the style preset with the given `styleId` from `customTextStyles`.
        *   Saves settings and regenerates the custom styles UI.
*   **UI Generation and Interaction**:
    *   `generateCustomStylesHTML()`: Creates the HTML markup for displaying custom style previews (usually small representations of bubbles with their styles) within the text format popup.
    *   `setupCustomStylesListeners()`: Attaches event listeners to the "Save as Custom Style" button in the format popup.
    *   `setupStylePreviewListeners(container)`: Attaches event listeners to the generated style previews. Clicking a preview applies the style; a delete icon on the preview allows deletion.
*   **Persistence**: Relies on `TextManagerCoreSetup` (via `comicCreator.textManager.coreSetup`) to store and persist the `customTextStyles` array.

## 7. `TextManagerState.js` - Saving and Loading Text Element States

This module is responsible for serializing the state of all text bubbles on a page and restoring them.

*   **`saveTextStates()`**:
    *   Iterates through all `.comic-panel` elements and the main `#comic-canvas`.
    *   For each `.text-bubble` found within these containers, it extracts a comprehensive state object.
    *   **Data Extracted per Bubble**:
        *   `id`: The bubble's HTML ID.
        *   `bubbleType`: e.g., 'speech', 'thought', 'caption', 'none'.
        *   `previousBubbleType`: The type before it was set to 'none' (if applicable).
        *   `tailPosition`: e.g., 'bottom-center', 'top-left'.
        *   `tailSettings`: A JSON string parsed from `textBox.dataset.tailSettings`.
        *   `positionGrid`: Value of `textBox.dataset.positionGrid`.
        *   `content`: The `innerHTML` of the `.text-content` element.
        *   `originalPosition`: An object storing `left`, `top`, `width`, `height`.
            *   For text in panels, these are **percentage** values relative to the panel's dimensions.
            *   For text on the canvas, these are **percentage** values relative to the canvas's dimensions. This is crucial for responsive loading.
        *   `style`: A detailed object including:
            *   `left`, `top`, `width`, `height` (again, as percentages, reflecting the current state which might differ from `originalPosition` if not yet "finalized" for save).
            *   `transform`: The CSS transform string (e.g., `rotate(10deg)`).
            *   `backgroundColor`, `opacity`, and other direct CSS properties.
            *   Custom CSS properties like `--bubble-background-color`, `--bubble-border-color`, `--bubble-opacity`.
            *   Text styling: `color`, `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `textDecoration`, `textAlign`, `lineHeight`, `letterSpacing`, `wordSpacing`.
            *   `textShadow`: The CSS `text-shadow` string.
            *   `dataHasOutline`, `dataOutlineColor`, `dataOutlineThickness`: Attributes related to the text outline.
            *   `zIndex`.
    *   **Output Structure**: Returns an object: `{ panelTextStates: [], canvasTextElements: [] }`. `panelTextStates` is an array of objects, where each object contains a `panelId` and an array `textStates` for bubbles in that panel. `canvasTextElements` is a direct array of text state objects for bubbles on the main canvas.
*   **`loadTextStates(pageState)`**:
    *   Takes a `pageState` object (which should contain `panelStates` and `canvasTextElements` in the format produced by `saveTextStates`).
    *   Clears all existing text bubbles from panels and the canvas to prevent duplication.
    *   Iterates through `pageState.panelStates` and `pageState.canvasTextElements`.
    *   For each saved text state object, calls `restoreTextBubble()` to recreate it.
*   **`restoreTextBubble(textState, parentContainer)`**:
    *   Recreates the text bubble's DOM structure (`.text-bubble`, `.text-content`, control handles) and appends it to `parentContainer`.
    *   Applies all saved styles from `textState.style` and `textState.originalPosition`. Percentage-based positions and dimensions are applied directly as style strings (e.g., `style.left = "50%"`).
    *   **Export Mode Considerations**: If `document.body.classList.contains('exporting')`, specific adjustments might be made (e.g., to font size and line height) to ensure pixel-perfect rendering consistency.
    *   Re-attaches event listeners for selection and control handles (delete, format).
    *   Re-initializes draggable and resizable functionalities, often by calling methods on a `DragAndDropManager`.
    *   Re-applies bubble tails by calling `comicCreator.textManagerStyling.updateBubbleTail()`.
    *   Restores grid positioning classes based on `textState.positionGrid`.
    *   Calls `comicCreator.textManagerUtils.finalizeTextBubblePosition(newTextBox, textState)` for final style applications and adjustments.

## 8. `TextManagerUtils.js` - Utility Functions

This module provides helper functions used by other `TextManager` modules.

*   **`getRotationValue(textBox)`**: Extracts the rotation angle (in degrees) from `textBox.style.transform`.
*   **`getOutlineThickness(textElement)`**: Returns `1` if `textElement.getAttribute('data-has-outline') === 'true'`, else `0`.
*   **`getOutlineColor(textElement)`**: Retrieves outline color from `data-outline-color` attribute or by parsing `style.textShadow`. Uses `globalRgbToHex`.
*   **`getShadowColor(textElement)`**: Retrieves shadow color from `style.textShadow`. Uses `globalRgbToHex`.
*   **`getShadowOffset(textElement)`**: Parses `style.textShadow` to get `x`, `y`, and `blur` values.
*   **`getBubbleBackgroundColor(textBox)`**: Gets bubble background color from CSS custom property `--bubble-background-color` or `computedStyle`. Uses `globalRgbToHex`.
*   **`updateOutlineText(textElement)`**: Deprecated; no longer needed.
*   **`resetTextPositionGrid(textBox)`**: Called after manual dragging. Sets `dataset.positionGrid` to 'custom', removes `positioned-X-Y` classes, and converts `transform: translate()` into `style.left`/`top`, preserving rotation. This ensures consistent state saving.
*   **`finalizeTextBubblePosition(textBubble, textState)`**: Applies detailed positioning and sizing from `textState.style` (or `textState.originalPosition` as fallback) during bubble restoration. Ensures styles on the `.text-content` element are also correctly set.

## 9. Relevant General Utilities (`Utils.js`)

General utility functions that support text features.

*   **`globalRgbToHex(rgbString)`**: Converts RGB or RGBA color strings (e.g., "rgb(255,0,0)", "rgba(0,255,0,0.5)") to a 6-digit hexadecimal color string (e.g., "#ff0000"). Handles cases where the input is already hex. Returns "#000000" for invalid input. This is crucial for standardizing color representations, especially when reading computed styles or custom properties.
*   **`getTextWithLineBreaks(element)`**: Extracts text content from an HTML element, converting `<br>` tags and closing block tags (`</div>`, `</p>`) into newline characters (`\n`). It then strips all remaining HTML tags to return a plain text string with preserved line breaks. This can be useful for getting a textual representation of bubble content for systems that don't process HTML.

## 10. UI Manager Interactions (`UIManager.js`)

`UIManager.js` provides general UI services and manages the visibility of some text-related UI components.

*   **Sidebar and Properties Panel Management**:
    *   `setupSidebarTabs()`: Handles switching between main application modes (Panels, Backgrounds, Text, etc.). When switching modes, it calls `comicCreator.deselectAll()`, which deselects any active text box.
    *   `updateRightSidebarView()`: Controls the visibility of the main `#text-properties` panel. It shows the panel if `comicCreator.textManager.currentTextBox` is set and hides it otherwise.
*   **Generic UI Components**:
    *   `showNotification(message, type)`: Can be used by text modules to display non-blocking feedback to the user (e.g., "Custom style saved.").
    *   `showConfirmationModal(title, message, buttonLabels)`: Can be used to ask for user confirmation for actions like deleting a custom style.
*   **Input Enhancements**:
    *   `makeSliderValueEditable(sliderElement, valueDisplayElement, ...)`: A utility that allows users to click on a slider's numerical display (e.g., for font size, opacity in the text format popup) and directly type in a value. This enhances the usability of text styling controls.

## 11. Key Data Structures

Understanding these data structures is essential for interacting with the text system.

*   **`defaultTextSettings` (in `TextManagerCoreSetup`)**:
    ```javascript
    // Example structure based on TextManagerCoreSetup.js
    {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        color: '#000000',
        bubbleType: 'speech-bubble' // Default type of bubble to create
        // Note: actual implementation might not include all bubble visual defaults here,
        // as bubble styling (background, border) can be separate or part of a theme.
    }
    ```
*   **`defaultSpeechTailSettings` / `defaultThoughtTailSettings` (in `TextManagerCoreSetup`)**:
    ```javascript
    // Example for defaultSpeechTailSettings based on TextManagerCoreSetup.js
    {
        useSvgTail: true,
        tailColor: '#ffffff',
        tailPosition: 'bottom', // e.g., 'top', 'bottom', 'left', 'right', 'top-left', etc.
        speechTailLength: 20,   // pixels
        speechTailWidth: 15,    // pixels, base width of the tail
        speechTailInset: 50,    // percentage, how far along the bubble edge the tail starts
        speechTailShear: 0,     // percentage, skew factor for the tail
        speechTailOutline: true // boolean, whether the tail has an outline
    }

    // Example for defaultThoughtTailSettings based on TextManagerCoreSetup.js
    {
        useSvgTail: true,
        tailColor: '#ffffff',
        tailPosition: 'bottom',
        thoughtTailInset: 50,     // percentage
        thoughtNumCircles: 3,
        thoughtCircleRadius: 5,   // pixels
        thoughtCircleSpacing: 5,  // pixels
        thoughtTailOffset: 0      // pixels, offset from the bubble edge
    }
    ```
*   **`customTextStyles` items (in `TextManagerCoreSetup`)**:
    An array of objects, where each object represents a saved style:
    ```javascript
    {
        id: 'unique-style-id-timestamp',
        name: 'User-Defined Style Name',
        // Properties mirror the structure saved by TextManagerState (see below),
        // including bubble styles, text styles, tail settings, etc.
        style: { /* ... detailed style object ... */ },
        tailSettings: { /* ... parsed tail settings ... */ },
        bubbleType: 'speech',
        // ... any other relevant properties captured at save time
    }
    ```
*   **`tailSettings` object (typically stored as JSON in `dataset.tailSettings`)**:
    This object's structure varies based on `bubbleType` (speech or thought).
    *   **Speech Tail Example**:
        ```json
        {
            "baseWidth": "20", "pointX": "10", "pointY": "30", "tipX": "0", "tipY": "40",
            "strokeColor": "#000000", "fillColor": "#FFFFFF", "strokeWidth": "2"
        }
        ```
    *   **Thought Tail Example**:
        ```json
        {
            "bubbleCount": "3", "mainBubbleOffset": "15", "smallBubbleRadius": "5",
            "largeBubbleRadius": "8", "strokeColor": "#000000", "fillColor": "#FFFFFF",
            "strokeWidth": "2"
        }
        ```
        *(Note: Values are often stored as strings from form inputs).*
*   **Text State Object (as saved by `TextManagerState.saveTextStates()`)**:
    The core object representing a single text bubble's state.
    ```javascript
    {
        id: "textbubble-1678886400000",
        bubbleType: "speech",
        previousBubbleType: "none",
        tailPosition: "bottom-center",
        tailSettings: "{\"baseWidth\":\"20\", ...}", // JSON string
        positionGrid: "custom",
        content: "<div>Hello World!</div><br><div>Another line.</div>", // innerHTML
        originalPosition: { // Percentages relative to parent
            left: "10.5%",
            top: "20.0%",
            width: "30.25%",
            height: "15.7%"
        },
        style: {
            left: "10.5%", // Current percentages
            top: "20.0%",
            width: "30.25%",
            height: "15.7%",
            transform: "rotate(5deg)",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            "--bubble-background-color": "rgba(255, 255, 255, 0.9)",
            "--bubble-border-color": "#000000",
            "--bubble-opacity": "0.9",
            "--bubble-corner-radius": "15px",
            "--bubble-stroke-width": "2px",
            color: "#333333",
            fontFamily: "Comic Sans MS",
            fontSize: "18px", // May include 'px' during save, esp. if from computed style
            fontWeight: "bold",
            fontStyle: "italic",
            textDecoration: "underline",
            textAlign: "center",
            lineHeight: "1.4", // Can be unitless or with 'px'
            letterSpacing: "0.5px",
            wordSpacing: "1px",
            textShadow: "rgb(102, 102, 102) 2px 2px 2px",
            dataHasOutline: "true",
            dataOutlineColor: "#FF0000",
            dataOutlineThickness: "1", // or pixel value like "1px"
            zIndex: "100"
        }
    }
    ```

This concludes the detailed documentation for the Comic-Pro text feature.

## 12. Project Save Functionality and JSON Structure

While the preceding sections detail the text-specific modules and their state serialization, this section explains how that text data is incorporated into the overall project save file. The main orchestrator for project saving is the `ComicCreator` class (found in `src/js/main.js`).

### A. Overview of the Saving Process

The project saving mechanism involves several key methods within `ComicCreator.js`:

1.  **`saveProject()` (User-Initiated Save):**
    *   This asynchronous function is typically triggered by a user action (e.g., clicking a "Save Project" button).
    *   It prompts the user for a filename (defaulting to something like "comic-project.json").
    *   Calls `this.saveCurrentPageState()` to ensure the state of the currently active page is fully captured and updated in the internal `this.pages` array.
    *   Calls `await this.getCurrentProjectState()` to retrieve a comprehensive object representing the entire project.
    *   Serializes this project object into a JSON string (`JSON.stringify(projectState, null, 2)`).
    *   Creates a `Blob` and initiates a file download for the user.
    *   On successful save, it may also clear any auto-saved data from `localStorage`.

2.  **`getCurrentProjectState()` (Project Data Aggregation):**
    *   This asynchronous function is responsible for assembling all data that defines the project.
    *   It also calls `this.saveCurrentPageState()` as a preliminary step to ensure all page data is current.
    *   **Image Handling**: A crucial step here is processing images from the image library. For any image whose `src` is a `blob:` URL (Object URL), this function fetches the blob, reads it using `FileReader`, and converts it into a Base64 Data URL string. This embeds the image data directly within the JSON, making the project file portable. Images with regular URLs are stored as is.
    *   It gathers definitions of any custom layouts used.
    *   The function returns a single `projectState` object, which is the complete representation of the comic project.

3.  **`saveCurrentPageState()` (Page-Level Data Aggregation):**
    *   This function captures the state of the *currently visible page*.
    *   It calls the respective `save...States()` methods on various managers:
        *   `this.panelManager.savePanelStates()`: Returns an array of panel state objects (containing information like panel dimensions, applied image ID, image transformations, etc.).
        *   `this.textManager.saveTextStates()`: This is the method detailed in **Section 7**. It returns an object:
            ```javascript
            {
                panelTextStates: [ /* array for panel 0 texts */ [], /* array for panel 1 texts */ [], ... ],
                canvasTextElements: [ /* array of texts directly on canvas */ ]
            }
            ```
            Each element within these arrays is a **Text State Object** as detailed in **Section 11**.
        *   `this.stickerManager.saveStickerStates()`: Returns an array of sticker states.
        *   `this.backgroundManager.saveBackgroundState()`: Returns an object describing the page's background.
    *   **Integrating Text into Panels**: A key step is merging `textStates.panelTextStates` into the panel data. The code iterates through the `panelImageStates` array (from `PanelManager`) and, for each panel state object, adds a new property `textElements`. The value of `textElements` is the array of text state objects corresponding to that specific panel from `textStates.panelTextStates`.
    *   The function then constructs a `pageStateSnapshot` object containing all this information (layout ID, the modified panel states including their `textElements`, `canvasTextElements`, sticker states, and background state).
    *   This `pageStateSnapshot` is used to update the corresponding page entry in the `this.pages` array within the `ComicCreator` instance.

### B. Top-Level Project JSON Structure

The `projectState` object returned by `getCurrentProjectState()` and subsequently serialized to JSON has the following approximate top-level structure:

```json
{
    "version": "1.4-dimensions", // Project version identifier
    "canvasDimensionKey": "current", // Identifier for the selected canvas dimensions preset
    "canvasWidth": 700,              // Actual width of the canvas in pixels
    "canvasHeight": 700,             // Actual height of the canvas in pixels
    "useGlobalBackgroundStyle": false, // Boolean flag
    "globalBackgroundStyle": {},       // Object describing global background (if used)
    "pages": [                       // Array of Page State Objects
        // Each object in this array represents a page in the comic
        // See structure below
    ],
    "images": [                      // Array of Image Objects
        // Each object represents an image in the project's library
        // { "id": "image-id", "name": "image.png", "width": 300, "height": 200, "src": "data:image/png;base64,..." /* or original URL */ }
    ],
    "currentPageIndex": 0,             // Index of the currently active page
    "folderStructure": {             // Object describing the image library folder organization
        /* ...folder data... */
    },
    "currentFolderId": "root",         // ID of the currently selected folder in the image library
    "customLayouts": {               // Object containing definitions of any custom layouts used
        /* "custom-layout-id": { ...layout definition... } */
    }
}
```

### C. Page State Object Structure (within the `pages` array)

Each element within the `"pages"` array of the main project JSON represents a single page and has the following structure (as assembled by `saveCurrentPageState()`):

```json
{
    "layout": "layout-id-string", // Identifier for the layout applied to this page
    "panelStates": [             // Array of Panel State Objects for this page
        {
            // ...other panel properties (e.g., imageId, transform, dimensions, etc.)...
            "textElements": [    // Array of Text State Objects belonging to this panel
                // Structure of each object as defined in Section 11
            ]
        },
        // ...more panel objects for this page...
    ],
    "canvasTextElements": [      // Array of Text State Objects placed directly on the canvas (not in a panel)
        // Structure of each object as defined in Section 11
    ],
    "stickerStates": [           // Array of Sticker State Objects
        // { ...sticker properties... }
    ],
    "backgroundState": {         // Object describing this page's specific background
        /* ...background properties... */
    },
    "canvasBackgroundStyle": "style-name-string" // Identifier for a predefined background style
}
```

**In summary:** To get the JSON representation for text elements, you would look inside each page object within the `"pages"` array. Text elements associated with specific panels are found in the `"textElements"` array within each object in the `"panelStates"` array. Text elements placed directly on the canvas are found in the `"canvasTextElements"` array of the page object. The detailed structure for each individual text element's JSON is provided in **Section 11** of this document. 