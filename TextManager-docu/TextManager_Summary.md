# TextManager System Summary

## Overview
The TextManager system is a comprehensive text and bubble management solution for comic creation, handling everything from basic text editing to complex bubble effects and state management.

## Core Components

### 1. Text Bubble System
- Creation and Management
  * Dynamic bubble creation
  * Type switching
  * Style application
  * Position handling
  * Event coordination

- Content Management
  * Text editing
  * Font handling
  * Style application
  * Effect management
  * State tracking

### 2. Bubble Tail System
- SVG Generation
  * Dynamic path creation
  * Position-based geometry
  * Style inheritance
  * Visual consistency

- Configuration
  * Length/width control
  * Position adjustment
  * Style customization
  * Effect application

### 3. State Management
- Serialization
  * Complete state capture
  * Style preservation
  * Position accuracy
  * Effect persistence

- Restoration
  * Exact state recovery
  * Style reapplication
  * Position precision
  * Effect recreation

### 4. Style System
- Custom Styles
  * Style creation
  * Preview generation
  * Application logic
  * State persistence

- Style Inheritance
  * Type-based inheritance
  * Color propagation
  * Effect coordination
  * State preservation

### 5. Export System
- Style Preservation
  * Font metrics
  * Layout stability
  * Visual consistency
  * Effect accuracy

- Position Management
  * Coordinate precision
  * Transform handling
  * Grid alignment
  * Boundary respect

## Integration Points

### 1. Manager Integration
- Event System
  * Pub/sub pattern
  * State synchronization
  * Error handling
  * Performance optimization

- API Surface
  * Public methods
  * Event handlers
  * State access
  * Error reporting

### 2. DOM Integration
- Element Structure
  * Bubble hierarchy
  * Style application
  * Event delegation
  * State tracking

- Visual Effects
  * SVG rendering
  * Style computation
  * Effect application
  * Performance optimization

### 3. State Integration
- Storage Systems
  * Local storage
  * Session storage
  * Cache management
  * State persistence

- History Management
  * Undo/redo support
  * State tracking
  * Change detection
  * Error recovery

## Performance Considerations

### 1. DOM Operations
- Batch Updates
  * Element creation
  * Style application
  * Position updates
  * Effect management

- Event Handling
  * Delegation patterns
  * Throttling/debouncing
  * Memory management
  * Error boundaries

### 2. State Management
- Optimization
  * Selective updates
  * Cache utilization
  * Memory efficiency
  * Error handling

- Serialization
  * Efficient formats
  * Minimal payload
  * Quick parsing
  * Error recovery

## Error Handling

### 1. Recovery Mechanisms
- State Recovery
  * Backup states
  * Rollback support
  * Error logging
  * User notification

- Visual Feedback
  * Error indicators
  * Status updates
  * Progress tracking
  * User guidance

### 2. Prevention
- Validation
  * Input checking
  * State verification
  * Type safety
  * Boundary testing

- Monitoring
  * Performance tracking
  * Error logging
  * State auditing
  * Resource usage

## Documentation

### 1. Code Documentation
- API Documentation
  * Method signatures
  * Parameter types
  * Return values
  * Error conditions

- Implementation Details
  * Algorithm explanations
  * State flow
  * Error handling
  * Performance considerations

### 2. Usage Documentation
- Integration Guide
  * Setup instructions
  * API usage
  * Event handling
  * Error management

- Best Practices
  * Performance tips
  * Error prevention
  * State management
  * Resource optimization

# `TextManager.js` Comprehensive Summary

The `originalfile.js` (assumed to be `TextManager.js` for this summary) defines the `TextManager` class, a vital component for managing all text-related operations within a comic creation application. It handles the creation, styling, selection, interaction, and persistence of various text elements like speech bubbles, thought bubbles, and captions. These elements can be placed within comic panels or directly onto the main comic canvas.

## I. Core Responsibilities & Initialization:

*   **Centralized Text Handling**: Acts as the single source of truth for all text operations.
*   **Integration with `ComicCreator`**:
    *   Stores a reference to the main `comicCreator` instance.
    *   Accesses `comicCreator` properties (e.g., `pages`, `uploadedImages`) and methods (e.g., `showNotification`, `selectPanel`, `saveCurrentPageState`, `deselectAll`).
    *   Utilizes `comicCreator.historyManager` for undo/redo functionality.
    *   Leverages `comicCreator.dragAndDropManager` for making text elements draggable and resizable.
    *   Uses `comicCreator.uiManager` for UI interactions like notifications and making slider values editable.
*   **State Tracking**:
    *   `currentTextBox`: Tracks the currently selected text box element.
*   **Default Settings**:
    *   `defaultTextSettings`: Defines initial properties for new text elements (font family, size, weight, style, decoration, alignment, color, and default bubble type).
    *   `defaultSpeechTailSettings`: Default configuration for SVG tails on speech bubbles (e.g., color, length, width, inset, shear, outline).
    *   `defaultThoughtTailSettings`: Default configuration for SVG tails on thought bubbles (e.g., color, inset, number of circles, radius, spacing, offset).
*   **Custom Styles Management**:
    *   `customTextStyles`: An array to store user-defined text style presets.
*   **Persistence**:
    *   `loadTextSettings()`: Loads default text settings and custom text styles from `localStorage` upon initialization.
    *   `saveTextSettings()`: Saves current default and custom text styles to `localStorage`.

## II. Text Bubble Creation:

*   **`addTextToPanel(panel)`**:
    *   Deselects other elements.
    *   Records action for history.
    *   Creates a `div` container for the text bubble with a unique ID and default class (`text-bubble`, `speech-bubble`).
    *   Positions the bubble near the center of the target panel using pixel values.
    *   Sets initial dimensions (min-width, min-height) and padding.
    *   Sets a `zIndex` to ensure proper layering.
    *   Creates an inner `div` (`text-content`) for editable text, applying default font styles and reduced top padding.
    *   Adds UI controls:
        *   `drag-handle`: For moving the bubble.
        *   `resize-handle`: For resizing the bubble.
        *   `format-text-btn`: To open the advanced formatting popup.
        *   `delete-text-btn`: To remove the bubble.
    *   Appends the bubble to the provided `panel`.
    *   Registers the bubble with `dragAndDropManager` for drag and resize functionality.
    *   Sets up event listeners for delete, format, and selection.
    *   Includes logic for selecting the bubble when clicking its edge or padding.
    *   Automatically selects the newly created text box.
*   **`addTextToCanvas()`**:
    *   Similar to `addTextToPanel` but targets the main `#comic-canvas`.
    *   Positions the bubble relative to the canvas.
    *   Uses a specific draggable function (`makeCanvasTextDraggable`) if different from panel text.
    *   Ensures canvas text always has a high `zIndex`.

## III. Selection and Properties Panel Interaction:

*   **`selectTextBox(textBox)`**:
    *   Deselects any previously selected text box by removing the `selected-text` class.
    *   Explicitly deselects any currently selected panel (via `comicCreator.panelManager.selectPanel(null)`).
    *   Explicitly deselects any currently selected sticker (via `comicCreator.stickerManager.deselectCurrentSticker()`).
    *   Adds `selected-text` class to the clicked `textBox` and updates `this.currentTextBox`.
    *   Manages the visibility of the main properties panel (`.properties-panel`).
    *   Hides other property sections and shows/creates the `#text-properties` section.
    *   Calls `updateTextProperties()` to populate the panel.
*   **`updateTextProperties(textBox)`**:
    *   Populates the `#text-properties` panel with controls for the selected `textBox`.
    *   Records action for history.
    *   Generates HTML for controls:
        *   Bubble Style (dropdown: speech, thought, caption, etc.).
        *   Font Family (dropdown with categorized fonts and previews).
        *   Font Size (range slider and value display).
        *   Text Color (color picker and hex input).
        *   Bubble Color (color picker and hex input).
        *   Text Style (buttons: bold, italic, underline, all caps).
        *   Rotation (range slider and value display).
    *   Sets initial values for these controls based on the `textBox`'s current computed styles (using `globalRgbToHex` for colors).
    *   Attaches event listeners to all controls. Changes trigger style updates on the `textElement` or `textBox` and call `comicCreator.saveCurrentPageState()`.
    *   Makes hex color inputs and slider value displays editable.

## IV. Advanced Formatting Popup (`showTextFormatPopup` and `setupPopupEventListeners`):

*   **`showTextFormatPopup(textBox, event)`**:
    *   Removes any existing popup.
    *   Selects the target `textBox`.
    *   Creates a `div` for the popup (`#text-format-popup`) and positions it to the left of the main properties panel.
    *   Generates extensive HTML for various formatting sections:
        *   **Header**: Title and close button.
        *   **Custom Styles**:
            *   Grid to display saved custom styles (`generateCustomStylesHTML`).
            *   Buttons: "Save Current Style", "Set as Default".
        *   **Bubble Style**:
            *   Checkbox "Show Bubble" (toggles between `no-bubble` and previous/default type).
            *   Grid of bubble type options (speech, thought, caption, etc.) with visual previews.
        *   **Bubble Tail**:
            *   Tail Position dropdown (none, bottom, top, left, right).
            *   `tail-settings-container` (shows/hides based on bubble type and tail position):
                *   Common: Tail Color picker.
                *   Speech Tail Settings (sliders for length, width, inset, shear; checkbox for outline).
                *   Thought Tail Settings (sliders for inset, number of circles, radius, spacing, offset).
        *   **Text Style**:
            *   Font Family dropdown (same as properties panel).
            *   Font Size slider.
            *   Line Spacing slider.
            *   Style buttons (bold, italic, underline, all caps).
            *   Alignment buttons (left, center, right).
            *   Color pickers for Text Color and Bubble Color.
        *   **Effects**:
            *   Text Outline (checkbox, color picker, hex input).
            *   Text Shadow (checkbox, color picker, hex input, sliders for X/Y offset and blur).
            *   Opacity control (checkbox for 50% opacity).
        *   **Position**:
            *   9-button grid for quick alignment (top-left, middle-center, etc.).
            *   Rotation slider.
    *   Appends the popup to `document.body`.
    *   Calls `setupPopupEventListeners()` and `setupCustomStylesListeners()`.
*   **`setupPopupEventListeners(popup, textBox)`**:
    *   **Close Button**: Removes popup, saves state.
    *   **Outer Click**: Closes popup if clicked outside.
    *   **Bubble Toggle**:
        *   Shows/hides bubble, updates `dataset.bubbleType`.
        *   Stores/restores previous background color and bubble type when toggling.
        *   Disables/enables tail position dropdown.
    *   **Bubble Style Options**: Updates bubble class, `dataset.bubbleType`, and applies type-specific styles (e.g., bold for shout).
    *   **Font Family, Size, Style Buttons, Alignment**: Updates `textElement` styles.
    *   **Color Pickers (Text, Bubble, Tail, Outline, Shadow)**: Updates relevant styles and hex displays. Hex inputs are editable.
    *   **Text Outline/Shadow Checkboxes & Controls**:
        *   Toggles visibility of related controls.
        *   Calls `applyTextOutline`, `removeTextOutline`, `applyTextShadow`, `removeTextShadow`.
        *   Updates associated `data-attributes` and CSS variables.
    *   **Bubble Tail Position Dropdown**: Calls `updateBubbleTail`, shows/hides specific tail settings sections.
    *   **SVG Tail Setting Sliders/Inputs**:
        *   For Speech (Length, Width, Inset, Shear, Outline toggle).
        *   For Thought (Inset, Num Circles, Radius, Spacing, Offset).
        *   All call `updateSvgTailSettings()` on input/change, which then calls `updateBubbleTail`.
        *   Slider values are made editable via `comicCreator.uiManager.makeSliderValueEditable`.
    *   **Position Grid Buttons**: Calls `positionTextBox()`.
    *   **Rotation Slider**: Updates `textBox.style.transform`, saves state.
    *   **Opacity Checkbox**: Sets `--bubble-opacity` CSS variable.
    *   **Line Spacing Slider**: Updates `textElement.style.lineHeight`.
    *   **MutationObserver**: Observes `textElement` for content changes to update outline text (though `updateOutlineText` is currently a no-op).
*   **`updatePopupControls(popup, textBox)`**: Syncs popup controls with the `textBox`'s current style after a custom style is applied.
*   **`updateOutlineButtonsInPopup(popup, textElement)`**: Specifically updates the state of outline controls in the popup.

## V. Styling Helpers & SVG Generation:

*   **`getRotationValue(textBox)`**: Extracts rotation value from `textBox.style.transform`.
*   **`applyTextOutline(textElement, color, thickness)`**:
    *   Uses multiple `text-shadow` offsets (currently hardcoded to achieve a specific visual thickness) to simulate an outline. The `thickness` parameter is present but not used to dynamically adjust the thickness of this shadow-based effect in the current implementation.
    *   Sets `data-outline-color` and `data-has-outline` attributes.
*   **`removeTextOutline(textElement)`**: Clears text shadow and outline attributes.
*   **`applyTextShadow(textElement, color, offsetX, offsetY, blur)`**: Applies `text-shadow`.
*   **`removeTextShadow(textElement)`**: Clears `text-shadow`.
*   **`updateBubbleTail(textBox, position)`**:
    *   Removes old tail classes and any existing SVG tail.
    *   Updates `dataset.tailPosition` and `dataset.tailSettings`.
    *   Calls `createSpeechBubbleSvgTail` or `createThoughtBubbleSvgTail` based on `bubbleType`.
*   **`createSpeechBubbleSvgTail(textBox, settings)`**:
    *   Dynamically creates an `<svg>` element for speech bubble tails.
    *   Calculates path points for a triangular tail based on settings (position, color, length, width, inset, shear).
    *   Applies fill color and an optional outline. The outline color is derived from the bubble's `borderColor`, and its thickness is based on the bubble's `borderWidth` (normalized to a value between 1-3px).
    *   Positions the SVG absolutely relative to the `textBox`.
*   **`createThoughtBubbleSvgTail(textBox, settings)`**:
    *   Creates an `<svg>` for thought bubble tails composed of multiple circles.
    *   Calculates circle positions and radii based on settings (position, color, numCircles, maxRadius, spacing, offset, inset).
    *   Applies fill color and a fixed black outline to each circle.
    *   Positions the SVG absolutely.
*   **`updateSvgTailSettings(textBox, newSettings)`**: Merges new tail settings with existing ones, saves to `dataset`, and calls `updateBubbleTail`.
*   **`positionTextBox(textBox, position)`**:
    *   Aligns the `textBox` within its parent based on a 9-point grid (e.g., "top-left", "middle-center").
    *   Uses percentage-based `left` and `top` and CSS `transform: translate()` for centering/alignment.
    *   Preserves existing rotation.
    *   Updates `dataset.positionGrid` and adds a `positioned-*` class.
*   **Color/Style Getters**:
    *   `getOutlineThickness(textElement)`
    *   `getOutlineColor(textElement)` (reads from `data-attribute` or parses `text-shadow`)
    *   `getShadowColor(textElement)` (parses `text-shadow`)
    *   `getShadowOffset(textElement)` (parses `text-shadow` for x, y, blur)
    *   `getBubbleBackgroundColor(textBox)` (reads from `--bubble-background-color` CSS variable or `backgroundColor` style).

## VI. State Management (Saving & Loading):

*   **`saveTextStates()`**:
    *   Iterates through all `.comic-panel` elements and the main `#comic-canvas`.
    *   For each panel/canvas, finds all `.text-bubble` elements.
    *   For each bubble, extracts comprehensive state:
        *   `id`, `bubbleType`, `previousBubbleType`, `tailPosition`, `tailSettings`, `positionGrid`.
        *   `content` (innerHTML of `text-content`).
        *   `originalPosition`: `getBoundingClientRect()` based `left`, `top`, `width`, `height` relative to parent, stored as pixel values.
        *   `style`: An object containing all relevant inline styles from the `textBubble` and `textElement` (left, top, width, height, transform, colors, font properties, padding, text-shadow, outline data, zIndex, opacity).
    *   Returns an object `{ panelTextStates: [], canvasTextElements: [] }`.
*   **`loadTextStates(pageState)`**:
    *   Clears ALL existing text bubbles from panels and the canvas to prevent duplicates.
    *   Iterates through `pageState.panelStates` and `pageState.canvasTextElements`.
    *   For each `textState` object, calls `restoreTextBubble()`.
    *   Resets `this.currentTextBox`.
*   **`restoreTextBubble(textState, parentElement)`**:
    *   Creates the DOM structure for a text bubble (outer `div`, inner `text-content`, controls) based on `textState`.
    *   Sets `id`, `className`, `dataset.bubbleType`, `dataset.tailPosition`, etc.
    *   Applies styles from `textState.style`.
        *   **Positioning Priority**:
            1.  `originalPosition` (if available) for `left`, `top`, `width`, `height` (most accurate).
            2.  Fallback to `textState.style.left`, `textState.style.top`, etc. (converting percentages to pixels for initial placement if necessary).
        *   The `transform` style is applied: if the saved transform contains `translate` components, these are typically stripped, preserving mainly the `rotate` component. This ensures the primary positioning is handled by `left`/`top` styles (ideally from `originalPosition`), while `transform` is primarily used for rotation.
    *   Applies bubble colors, text styles, effects (outline, shadow), padding.
    *   Handles special styling considerations if `document.body.classList.contains('exporting')` for precise rendering during export (e.g., `white-space: pre-wrap`, fixed line heights).
    *   Appends the restored bubble to `parentElement`.
    *   Makes the bubble draggable and resizable via `comicCreator.dragAndDropManager`.
    *   Re-attaches event listeners for delete, format, and selection.
    *   Calls `updateBubbleTail()` if tail data exists.
    *   Calls `positionTextBox()` if `positionGrid` data exists.
    *   Calls `finalizeTextBubblePosition()` for final pixel-perfect placement.
*   **`finalizeTextBubblePosition(textBubble, textState)`**:
    *   Ensures exact positioning, especially when `originalPosition` data is available from the saved state.
    *   Re-applies `dataset.originalLeft` and `dataset.originalTop`.
    *   Preserves rotation while potentially clearing other transforms.
    *   Adjusts text content styles (padding, line-height) during export for layout consistency.
*   **`resetTextPositionGrid(textBox)`**:
    *   Called by `DragAndDropManager` after a text box is manually dragged.
    *   Sets `dataset.positionGrid` to `'custom'`.
    *   Removes `positioned-*` classes and adds `positioned-custom`.
    *   Adjusts `left`, `top`, and `transform` styles to reflect the new manual position, converting previous transform-based positioning to direct `left`/`top` values while preserving rotation.

## VII. Custom and Default Text Styles Management:

*   **`setDefaultTextSettings(textBox)`**:
    *   Updates `this.defaultTextSettings` object based on the styles of the provided `textBox` and its `textElement`.
    *   Calls `saveTextSettings()` to persist.
    *   Shows a "Default text style set" notification.
*   **`createCustomTextStyle(textBox, styleName)`**:
    *   Extracts styles from the `textBox` (bubble type, tail position, font styles, colors, effects) to create a `newStyle` object with a unique ID and the given name.
    *   Adds `newStyle` to `this.customTextStyles` array.
    *   Calls `saveTextSettings()`.
    *   Shows a "Style created" notification.
*   **`applyCustomTextStyle(textBox, styleId)`**:
    *   Finds the style in `this.customTextStyles` by `styleId`.
    *   Applies all properties from the style (bubble type, tail, font styles, colors, effects) to the target `textBox` and its `textElement`.
    *   Calls `comicCreator.saveCurrentPageState()`.
*   **`deleteCustomTextStyle(styleId)`**:
    *   Removes the style from `this.customTextStyles`.
    *   Calls `saveTextSettings()`.
    *   Shows a "Style deleted" notification.
*   **`generateCustomStylesHTML()`**: Returns HTML string for displaying custom style previews in the formatting popup. Each preview shows the style name and a visual representation.
*   **`setupCustomStylesListeners(popup, textBox)`**:
    *   Adds event listeners for "Set as Default" and "Save Current Style" buttons in the popup.
    *   Calls `setupStylePreviewListeners()`.
*   **`setupStylePreviewListeners(popup, textBox)`**:
    *   Adds click listeners to each style preview: calls `applyCustomTextStyle` and `updatePopupControls`.
    *   Adds click listeners to delete buttons on style previews: calls `deleteCustomTextStyle` and refreshes the style grid.

## VIII. Event Handling & Miscellaneous:

*   **`deleteSelectedTextBox()`**:
    *   Removes `this.currentTextBox` from the DOM if one is selected.
    *   Records action for history.
    *   Updates UI and saves state.
*   **Utilities**:
    *   `globalRgbToHex` and `getTextWithLineBreaks` are imported from `./Utils.js`.

## Export Mode Handling
- **Export-Specific Styling**:
  - Triggered when `document.body.classList.contains('exporting')`
  - Special text content handling:
    * Padding adjustments (bottom: 0, top: 2px)
    * Margin elimination
    * Inline-block display
    * Overflow control
  - Font preservation:
    * Exact line height maintenance
    * Font size preservation
    * Font weight consistency
    * Font style retention
  - Layout stability:
    * Transform origin: top left
    * Scale(1) transform
    * No max height constraints
    * White-space: pre-wrap
    * Geometric precision text rendering

## Position Restoration
- **Priority-Based Position System**:
  1. Original Position (Primary):
     * Uses exact pixel values from getBoundingClientRect()
     * Stores left, top, width, height
     * Maintains dataset attributes for future reference
  2. Style-Based Position (Fallback):
     * Converts percentage values to pixels
     * Uses parent element dimensions for calculations
     * Preserves aspect ratios and dimensions
  3. Transform Handling:
     * Extracts and preserves rotation
     * Removes translate components if using original position
     * Maintains z-index values

## Style Inheritance
- **Bubble Type Inheritance**:
  - Preserves previous bubble type in dataset
  - Maintains bubble visibility state
  - Handles transition between bubble types
- **Style Cascading**:
  1. Custom Style Application:
     * Complete style replacement
     * Bubble type transition
     * Tail position preservation
  2. Default Style Fallbacks:
     * Font family defaults
     * Size and weight standards
     * Alignment preferences
  3. Computed Style Integration:
     * Export mode computed style preservation
     * Dynamic style calculation
     * Style conflict resolution

## Text Outline Implementation
- **Outline Creation**:
  - Multiple text-shadow technique
  - Color and thickness customization
  - Data attribute tracking
- **Outline Management**:
  - Addition and removal methods
  - Style preservation during state changes
  - Export mode considerations
- **Integration with Effects**:
  - Coordination with text shadows
  - Opacity handling
  - Style preview generation

This `TextManager` class is a sophisticated module that provides a rich set of features for text manipulation, styling, and management, deeply integrated with the overall comic creation application. 