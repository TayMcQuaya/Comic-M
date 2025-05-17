# TextManagerOld.js Refactoring Plan

This document outlines the methods within `TextManagerOld.js` categorized for refactoring. The goal is to move the logic for each category into its own separate file while keeping the functionality and logic of each method *exactly the same*.

## 1. Initialization and Core Setup **DONE**
*   `constructor(comicCreator)`: Initializes the `TextManager`, sets up default properties and settings for text, speech/thought bubbles, and loads any saved settings.
*   `loadTextSettings()`: Loads default text settings and custom text styles from persistent storage (e.g., local storage).
*   `saveTextSettings()`: Saves current default text settings and custom text styles to persistent storage.

## 2. Text Bubble Creation and Selection **DONE**
*   `addTextToPanel(panel)`: Creates a new text bubble and adds it to a specified comic panel, including default text, styles, and control handles.
*   `addTextToCanvas()`: Creates a new text bubble and adds it directly to the main comic canvas (outside of panels).
*   `selectTextBox(textBox)`: Handles the selection of a text bubble, updating UI elements (properties panel) and deselecting other items.
*   `deleteSelectedTextBox()`: Deletes the currently active/selected text bubble.

## 3. Text and Bubble Styling (Properties Panel & Formatting Popup) **DONE**
*   `updateTextProperties(textBox)`: Populates the main "Text Settings" in the properties panel based on the selected text bubble's style and sets up its controls.
*   `showTextFormatPopup(textBox, event)`: Displays a detailed formatting popup for advanced styling of the selected text bubble (bubble shapes, tails, effects, etc.).
*   `setupPopupEventListeners(popup, textBox)`: Attaches event listeners to all interactive controls within the detailed formatting popup.
*   `updatePopupControls(popup, textBox)`: Refreshes the controls in the formatting popup to reflect the current state of the text bubble (e.g., after applying a custom style).
*   `applyTextOutline(textElement, color, thickness)`: Applies a visual outline effect to the text content (using text shadows).
*   `removeTextOutline(textElement)`: Removes the text outline effect.
*   `applyTextShadow(textElement, color, offsetX, offsetY, blur)`: Applies a drop shadow effect to the text.
*   `removeTextShadow(textElement)`: Removes the text shadow effect.
*   `updateBubbleTail(textBox, position)`: Modifies or creates the tail (pointer) of a speech/thought bubble, setting its position and triggering SVG creation.
*   `createSpeechBubbleSvgTail(textBox, settings)`: Generates and attaches an SVG for a traditional pointy speech bubble tail.
*   `createThoughtBubbleSvgTail(textBox, settings)`: Generates and attaches an SVG for a thought bubble tail (series of circles).
*   `updateSvgTailSettings(textBox, newSettings)`: Updates and redraws an SVG tail (speech or thought) with new settings.
*   `positionTextBox(textBox, position)`: Aligns a text bubble within its parent (panel/canvas) based on a predefined grid position (e.g., "top-left").

## 4. Custom Text Styles Management **DONE**
*   `setDefaultTextSettings(textBox)`: Sets the style of the current text bubble as the new default for future text bubbles.
    *   *Dependencies: `saveTextSettings()` (from Category 1: CoreSetup), `comicCreator.uiManager`.*
*   `createCustomTextStyle(textBox, styleName)`: Saves the complete style of the current text bubble as a named "custom style."
    *   *Dependencies: `saveTextSettings()` (from Category 1: CoreSetup), `comicCreator.uiManager`.*
*   `applyCustomTextStyle(textBox, styleId)`: Applies a previously saved custom style to the selected text bubble.
    *   *Dependencies: `applyTextOutline()`, `removeTextOutline()` (from Category 3: Styling), `comicCreator.saveCurrentPageState()`.*
*   `deleteCustomTextStyle(styleId)`: Deletes a custom style.
    *   *Dependencies: `saveTextSettings()` (from Category 1: CoreSetup), `comicCreator.uiManager`.*
*   `generateCustomStylesHTML()`: Creates HTML for displaying the grid of saved custom styles in the formatting popup.
    *   *Dependencies: None external to its own properties (`this.customTextStyles`).*
*   `setupCustomStylesListeners(popup, textBox)`: Attaches event listeners for the custom styles section in the formatting popup.
    *   *Dependencies: Calls local methods `setDefaultTextSettings`, `createCustomTextStyle`, `generateCustomStylesHTML`, `setupStylePreviewListeners`.*
*   `setupStylePreviewListeners(popup, textBox)`: Attaches event listeners to individual custom style previews (for applying or deleting them).
    *   *Dependencies: Calls local methods `applyCustomTextStyle`, `deleteCustomTextStyle`, `generateCustomStylesHTML`. Also calls `updatePopupControls()` (from Category 3: Styling).*
*   `updateOutlineButtonsInPopup(popup, textElement)`: Updates the text outline controls in the formatting popup to match the selected text element.
    *   *Dependencies: `getOutlineColor()` (from Category 6: Utilities, currently temporarily in Category 3: Styling), `comicCreator.uiManager.rgbToHex` (likely used internally by `getOutlineColor`).*

## 5. State Management (Saving & Loading Project Data) **DONE**
*   `saveTextStates()`: Collects and structures all data about every text bubble on the current page for saving.
    *   *Dependencies: None directly within its own logic, but it reads DOM elements that are created/managed by other categories.*
*   `loadTextStates(pageState)`: Recreates all text bubbles on a page based on a saved state object, clearing existing bubbles first.
    *   *Dependencies: Calls local helper `restoreTextBubble()`.*
*   `restoreTextBubble(textState, parentElement)`: Helper for `loadTextStates`; creates a single text bubble's HTML elements and applies its saved styles and properties.
    *   *Dependencies: `comicCreator.dragAndDropManager`, `showTextFormatPopup()` (Category 3: Styling), `selectTextBox()` (Category 2: BubbleManipulation), `updateBubbleTail()` (Category 3: Styling), `positionTextBox()` (Category 3: Styling), `applyTextOutline()` (Category 3: Styling), `finalizeTextBubblePosition()` (Category 6: Utilities).*

## 6. Utility and Helper Methods **DONE**
*   `getRotationValue(textBox)`: Extracts the rotation angle of a text bubble from its CSS.
    *   *Dependencies: None.*
*   `getOutlineThickness(textElement)`: Checks if text has an outline and returns its thickness (currently seems to return 1 or 0).
    *   *Dependencies: None.*
*   `getOutlineColor(textElement)`: Retrieves the color of the text outline.
    *   *Dependencies: `globalRgbToHex` (from `Utils.js`).*
*   `getShadowColor(textElement)`: Retrieves the color of the text shadow.
    *   *Dependencies: `globalRgbToHex` (from `Utils.js`).*
*   `getShadowOffset(textElement)`: Retrieves the X/Y offsets and blur radius of the text shadow.
    *   *Dependencies: None.*
*   `getBubbleBackgroundColor(textBox)`: Gets the background color of the text bubble.
    *   *Dependencies: `globalRgbToHex` (from `Utils.js`).*
*   `updateOutlineText(textElement)`: Currently marked as not needed due to text-shadow approach for outlines.
    *   *Dependencies: None (but deprecated).*
*   `resetTextPositionGrid(textBox)`: Clears a text bubble's grid position (e.g., "top-left") after it's manually dragged, setting it to "custom."
    *   *Dependencies: Calls its own `getRotationValue()` (which will be in this same Utils class).*
*   `finalizeTextBubblePosition(textBubble, textState)`: Precisely sets a text bubble's position and size, especially during loading/exporting, using "originalPosition" data if available. 
    *   *Dependencies: None beyond DOM manipulation and input parameters.* 