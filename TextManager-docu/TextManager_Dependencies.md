# TextManager Dependencies and Integration Map

## External Class Dependencies

### Application Integration (main.js)
- [x] Initialization:
  - Instantiated in ComicCreator constructor
  - Receives ComicCreator instance reference
  - Initialized after DragAndDropManager but before UIManager
  - Part of the core application managers

### ComicCreator Integration
- [x] Direct Access to ComicCreator Properties:
  - pages: Array of page states
  - currentPageIndex: Current page index
  - saveCurrentPageState: Method to save state
  - deselectAll: Method to clear selections
  - historyManager: For state management
  - dragAndDropManager: For interaction
  - uiManager: For UI updates

### Manager Dependencies
- [x] Direct Dependencies on Other Managers:
  - DragAndDropManager
    * makeTextDraggable(element, handle)
      - Handles mouse events (down, move, up)
      - Manages dragging state
      - Updates element position
      - Saves state after drag
    * makeTextResizable(element, handle)
      - Handles mouse events for resizing
      - Updates element dimensions
      - Preserves aspect ratio if needed
  - HistoryManager
    * recordSnapshotBeforeAction(isNewPage, actionType, options)
      - Called before text creation with 'text_create' type
      - Called before text modifications with 'text' type
      - Stores selective state copy for text elements
      - Maintains undo/redo functionality
  - UIManager
    * showNotification
    * updateRightSidebarView

### Utility Dependencies
- [x] Utils.js Functions Used:
  - globalRgbToHex: Converts RGB/RGBA colors to hex format
  - getTextWithLineBreaks: Preserves line breaks in text content

### UI Integration
- [x] UIManager.js Integration Points:
  - Properties panel management
  - Notification system (showNotification method)
  - Sidebar tab management
  - Modal dialogs
  - Editable slider values (makeSliderValueEditable)

### State Management
- [x] Internal State:
  - currentTextBox: Tracks selected text box
  - defaultTextSettings: Default font and style settings
  - defaultSpeechTailSettings: SVG tail settings for speech bubbles
  - defaultThoughtTailSettings: SVG tail settings for thought bubbles
  - customTextStyles: Array of saved custom styles

### State Persistence
- [x] History States:
  - Text Creation State:
    * Panel text elements
    * Canvas text elements
    * Layout information
  - Text Modification State:
    * Text content
    * Style properties
    * Position data
    * Bubble settings

### DOM Elements Created
- [x] Text Bubble Structure:
  - text-bubble container (div)
    * text-content (contentEditable div)
    * drag-handle (for DragAndDropManager)
    * resize-handle (for DragAndDropManager)
    * format-text-btn
    * delete-text-btn

### Event Listeners
- [x] Direct Event Handlers:
  - Click handlers for:
    * Text selection
    * Format button
    * Delete button
    * Text content edge detection
  - Drag and resize (via DragAndDropManager):
    * mousedown on handles
    * mousemove for position/size updates
    * mouseup for state saving
    * dragstart prevention

### CSS Classes Used
- [x] Identified Classes:
  - .text-bubble
  - .speech-bubble
  - .thought-bubble
  - .text-content
  - .drag-handle
  - .resize-handle
  - .format-text-btn
  - .delete-text-btn
  - .selected-text
  - .dragging
  - .dragging-active

### Required Steps Before Refactoring
1. **Gather Full Context**
   ```javascript
   // Need to analyze:
   - [x] All files that import TextManager
     * UIManager.js (confirmed)
     * main.js (confirmed)
     * Other manager files (need analysis)
   - [x] All files that TextManager imports
     * Utils.js (confirmed)
   - [x] All event listeners that reference TextManager
     * Text bubble selection
     * Format button clicks
     * Delete button clicks
     * Edge detection clicks
     * Drag and resize events
   - [x] All DOM elements that TextManager interacts with
     * .text-bubble
     * .text-content
     * .properties-panel
     * #text-format-popup
     * Drag and resize handles
   ```

2. **Create Method Call Graph**
   ```javascript
   // For each public method in TextManager:
   - Who calls it?
   - When is it called?
   - What state must exist before call?
   - What state changes after call?
   ```

3. **Document State Dependencies**
   ```javascript
   // For each piece of state:
   - Where is it initialized?
   - Which methods read it?
   - Which methods write to it?
   - What other state depends on it?
   ```

4. **Map Event Chains**
   ```javascript
   // For each event handler:
   - What triggers it?
   - What other events it triggers?
   - What state it depends on?
   - What state it modifies?
   ```

### State Dependencies
- [x] Identified State Dependencies:
  - ComicCreator:
    * currentPageIndex
    * pages array
    * saveCurrentPageState()
  - History:
    * Before text creation
    * Before text modification
    * Before text deletion
  - Local Storage:
    * Default text settings
    * Custom text styles
  - DOM State:
    * Text content
    * Style properties
    * Position data
    * Selection state

### Initialization Order
1. DragAndDropManager
2. TextManager
3. UIManager
4. HistoryManager
5. AutoSaveManager

### Project State Integration
- [x] State Saving:
  - Part of page state
  - Included in project saves
  - Included in auto-saves
  - Preserved during page navigation

### Error Handling
- [x] Required Error Checks:
  - Text element existence
  - Parent element validity
  - Style property validation
  - Event handler cleanup
  - State consistency

## Required Additional Context

### 1. File Analysis Needed
- [ ] All CSS files (for class names and styling dependencies)
- [ ] All HTML templates or fragments
- [ ] All utility files imported
- [ ] All manager classes that interact with TextManager

### 2. DOM Structure Dependencies
- [x] Element IDs Used:
  - `#text-properties`: Properties panel section
  - `#text-format-popup`: Format popup container
  - `#comic-canvas`: Main canvas element
  - Dynamic IDs:
    * `text_${timestamp}`: Text bubble elements
    * `style_${timestamp}`: Custom styles
    * `canvas_text_${timestamp}`: Canvas text elements

- [x] CSS Classes Referenced:
  - Core Classes:
    * `.text-bubble`: Main container
    * `.text-content`: Editable text element
    * `.selected-text`: Selection state
  - Control Classes:
    * `.drag-handle`: Movement control
    * `.resize-handle`: Size control
    * `.format-text-btn`: Format button
    * `.delete-text-btn`: Delete button
  - Bubble Types:
    * `.speech-bubble`
    * `.thought-bubble`
    * `.caption-box`
    * `.shout-bubble`
    * `.whisper-bubble`
    * `.jagged-bubble`
    * `.no-bubble`
  - Position Classes:
    * `.positioned-custom`
    * `.positioned-top-left`
    * `.positioned-top-center`
    * `.positioned-top-right`
    * `.positioned-middle-left`
    * `.positioned-middle-center`
    * `.positioned-middle-right`
    * `.positioned-bottom-left`
    * `.positioned-bottom-center`
    * `.positioned-bottom-right`
  - UI Classes:
    * `.properties-panel`
    * `.properties-section`
    * `.custom-styles-grid`
    * `.style-preview`
    * `.bubble-tail-svg`

- [x] Data Attributes:
  - Text Bubble:
    * `data-bubble-type`: Current bubble style
    * `data-previous-bubble-type`: Previous style
    * `data-tail-position`: Tail location
    * `data-tail-settings`: SVG tail configuration
    * `data-position-grid`: Position preset
    * `data-original-left`: Original x position
    * `data-original-top`: Original y position
  - Text Content:
    * `data-has-outline`: Outline state
    * `data-outline-color`: Outline color
    * `data-outline-width`: Outline thickness
  - Style Preview:
    * `data-style-id`: Custom style identifier

### 3. Event Flow Documentation
- [x] Direct Event Listeners:
  - Mouse Events:
    * `mousedown`: Drag/resize initiation
    * `mousemove`: Position/size updates
    * `mouseup`: Operation completion
    * `click`: Selection, formatting, deletion
  - Content Events:
    * `input`: Text content changes
    * `blur`: Edit completion
    * `focus`: Edit start
  - Form Events:
    * `change`: Style control updates
    * `input`: Slider value changes
  - Custom Events:
    * `textboxCreated`: New text box added
    * `textboxDeleted`: Text box removed
    * `textboxMoved`: Position changed
    * `textboxResized`: Size changed
    * `textboxStyled`: Style updated
    * `textboxSelected`: Selection changed

- [x] Event Delegation Patterns:
  - Parent Containers:
    * `.comic-panel`: Panel text events
    * `#comic-canvas`: Canvas text events
    * `.properties-panel`: Control events
    * `#text-format-popup`: Format events
  - Delegate Handlers:
    * Text box operations
    * Style applications
    * Position updates
    * State changes

- [x] Event Cleanup:
  - Selection clearing
  - Popup removal
  - Listener removal
  - Reference clearing

### 4. Export Mode Dependencies
- [x] Required States:
  - `document.body.classList.contains('exporting')`
  - Computed styles preservation
  - Exact positioning maintenance
  - Font rendering optimization

- [x] Style Requirements:
  - Exact font metrics
  - Precise positioning
  - Layout stability
  - Visual consistency

### 5. Font Loading Requirements
- [x] Required Font Families:
  - Common Fonts:
    * Arial
    * Comic Sans MS
    * Times New Roman
  - Sound Effects:
    * Impact
    * Bangers
    * Anton
  - Handwriting:
    * Comic Neue
    * Permanent Marker
    * Gloria Hallelujah
  - Title/Header:
    * Luckiest Guy
    * Boogaloo
    * Acme
    * Bowlby One SC
    * Bungee
    * Ceviche One
  - Horror/Special:
    * Creepster
    * Freckle Face
    * Kablammo
    * Rubik Puddles

- [x] Font Loading States:
  - Initial load
  - Dynamic loading
  - Fallback handling
  - Export preparation

## Action Items Before Refactoring

1. **Create Complete Method Trace**
```javascript
// For each method:
methodName: {
    calledBy: [], // List of methods/events that call this
    calls: [],    // List of methods this calls
    state: {
        reads: [], // State this method reads
        writes: [] // State this method modifies
    },
    events: {
        listensTo: [], // Events this method handles
        triggers: []   // Events this method dispatches
    }
}
```

2. **Create State Dependency Graph**
```javascript
// For each state property:
stateName: {
    initializedIn: "", // Where/when is it first set
    dependencies: [], // What other state it depends on
    dependents: [],  // What depends on it
    persistence: "", // How/where is it saved
    validation: ""   // Any validation rules
}
```

3. **Create DOM Interaction Map**
```javascript
// For each DOM interaction:
elementId: {
    created: "", // Where is it created
    modified: [], // What methods modify it
    events: [], // What events are attached
    cleanup: "" // How/when is it cleaned up
}
```

4. **Create Integration Test Points**
```javascript
// Key points to test after refactoring:
- Text bubble creation flow
- Style application chain
- State save/load cycle
- Event handling sequences
- Error handling paths
```

## Required Tool Support

1. **Source Code Analysis**
- Need to analyze all source files for TextManager references
- Need to track all import/export relationships
- Need to find all string references to TextManager

2. **Runtime Analysis**
- Need to capture all method call sequences
- Need to track all event chains
- Need to monitor state mutations
- Need to verify DOM modifications

3. **Integration Verification**
- Need to verify all external calls still work
- Need to verify all callbacks still trigger
- Need to verify all events still flow
- Need to verify all state still persists

## Next Steps

1. **Before Starting Refactor**
- [ ] Get full source code access
- [ ] Run source code analysis
- [ ] Create complete dependency graph
- [ ] Document all integration points

2. **During Refactor**
- [ ] Maintain method trace log
- [ ] Verify each step maintains integrations
- [ ] Test each module in isolation
- [ ] Test all modules together

3. **After Refactor**
- [ ] Verify all original functionality
- [ ] Verify all integrations work
- [ ] Verify all state management
- [ ] Verify all event handling 