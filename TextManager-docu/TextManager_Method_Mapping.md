# TextManager Method Distribution Map

## TextBubbleManager.js
### Core Methods
- addTextToPanel(panel)
- addTextToCanvas()
- selectTextBox(textBox)
- deleteSelectedTextBox()

### Helper Methods
- getBubbleBackgroundColor(textBox)
- resetBubbleType(textBox)
- initializeBubbleControls(textBox)

## TextContentManager.js
### Core Methods
- updateTextContent(textElement)
- handleContentEditing(textElement)
- applyTextOutline(textElement, color, thickness)
- removeTextOutline(textElement)
- applyTextShadow(textElement, color, offsetX, offsetY, blur)
- removeTextShadow(textElement)

### Helper Methods
- getOutlineThickness(textElement)
- getOutlineColor(textElement)
- getShadowColor(textElement)
- getShadowOffset(textElement)
- updateOutlineText(textElement)

## TextTailManager.js
### Core Methods
- updateBubbleTail(textBox, position)
- createSpeechBubbleSvgTail(textBox, settings)
- createThoughtBubbleSvgTail(textBox, settings)
- updateSvgTailSettings(textBox, newSettings)

### Helper Methods
- calculateTailDimensions(textBox, settings)
- generateTailPath(points)
- applyTailStyles(svg, settings)

## TextStateManager.js
### Core Methods
- saveTextStates()
- loadTextStates(pageState)
- restoreTextBubble(textState, parentElement)
- finalizeTextBubblePosition(textBubble, textState)

### Helper Methods
- serializeTextState(textBox)
- deserializeTextState(textState)
- validateState(state)
- cleanupStaleStates()

## TextStyleManager.js
### Core Methods
- createCustomTextStyle(textBox, styleName)
- applyCustomTextStyle(textBox, styleId)
- deleteCustomTextStyle(styleId)
- setDefaultTextSettings(textBox)

### Helper Methods
- saveTextSettings()
- loadTextSettings()
- generateCustomStylesHTML()
- validateStyleData(style)

## TextEventManager.js
### Core Methods
- setupEventListeners(textBox)
- handleTextSelection(event)
- handleKeyboardShortcuts(event)
- cleanupEventListeners(textBox)

### Helper Methods
- delegateEvent(event, handler)
- throttleEventHandler(handler)
- validateEventTarget(target)
- trackEventState(event)

## TextPositionManager.js
### Core Methods
- positionTextBox(textBox, position)
- resetTextPositionGrid(textBox)
- getRotationValue(textBox)
- updatePosition(textBox, x, y)

### Helper Methods
- calculateGridPosition(position)
- preserveRotation(textBox)
- validateBoundaries(textBox)
- snapToGrid(textBox)

## TextExportManager.js
### Core Methods
- prepareForExport(textBox)
- preserveExactStyles(textBox)
- optimizeForExport(textBox)
- restoreFromExport(textBox)

### Helper Methods
- captureExportState(textBox)
- applyExportOptimizations(textBox)
- validateExportStyles(textBox)
- cleanupExportState(textBox)

## TextUIManager.js
### Core Methods
- showTextFormatPopup(textBox, event)
- setupPopupEventListeners(popup, textBox)
- updatePopupControls(popup, textBox)
- updateOutlineButtonsInPopup(popup, textElement)

### Helper Methods
- generatePopupHTML(textBox)
- positionPopup(popup)
- handlePopupInteractions(popup)
- cleanupPopup(popup)

## TextIntegrationManager.js
### Core Methods
- initializeManagers()
- coordinateStateChanges(change)
- handleErrors(error)
- broadcastEvents(event)

### Helper Methods
- validateManagerState()
- synchronizeManagers()
- logManagerActivity()
- cleanupManagerResources()

## Method Dependencies Map
### Critical Paths
1. Text Creation Flow:
   ```
   addTextToPanel
   ↓
   initializeBubbleControls
   ↓
   setupEventListeners
   ↓
   positionTextBox
   ```

2. Style Application Flow:
   ```
   applyCustomTextStyle
   ↓
   updateTextContent
   ↓
   updateBubbleTail
   ↓
   saveTextStates
   ```

3. State Management Flow:
   ```
   saveTextStates
   ↓
   serializeTextState
   ↓
   validateState
   ↓
   broadcastEvents
   ```

4. Export Flow:
   ```
   prepareForExport
   ↓
   preserveExactStyles
   ↓
   optimizeForExport
   ↓
   validateExportStyles
   ```

## Shared Utilities
### Color Management
- globalRgbToHex (from Utils.js)
- getTextWithLineBreaks (from Utils.js)

### DOM Utilities
- createElement
- getComputedStyle
- getBoundingClientRect

### Event Utilities
- preventDefault
- stopPropagation
- addEventListener
- removeEventListener

### State Utilities
- localStorage methods
- JSON parsing/stringifying
- Dataset manipulation 