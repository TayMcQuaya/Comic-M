# TextManager Consolidated Refactoring Guide

## 1. Core Requirements & Principles

### 1.1 Fundamental Rules
- Maintain exact functionality without any alterations
- Preserve all existing behaviors and edge cases
- Keep current performance levels or better
- Ensure backward compatibility
- Follow single responsibility principle

### 1.2 Critical Dependencies
- ComicCreator Integration
  * Instance reference in constructor
  * Access to pages, currentPageIndex
  * State saving coordination
  * History management integration
  * Drag and drop coordination
  * UI updates and notifications

- DOM Structure Requirements
  * Element IDs:
    - #text-properties
    - #text-format-popup
    - #comic-canvas
    - Dynamic IDs (text_${timestamp}, etc.)
  * Core Classes:
    - .text-bubble
    - .text-content
    - .selected-text
    - .drag-handle
    - .resize-handle
  * Data Attributes:
    - data-bubble-type
    - data-tail-position
    - data-tail-settings
    - data-position-grid
    - data-has-outline

### 1.3 State Management Requirements
- Local Storage Integration
  * Default text settings
  * Custom styles persistence
  * User preferences
  * Cache management

- Runtime State
  * Current text box reference
  * Selection state
  * Export mode handling
  * Position tracking

## 2. File Structure & Responsibilities

### 2.1 Core Files
1. TextBubbleManager.js
   - Primary Responsibilities:
     * Bubble creation and initialization
     * Type management (speech, thought, caption)
     * Basic style application
     * Position handling
     * Event coordination
   - Key Methods:
     * addTextToPanel()
     * addTextToCanvas()
     * selectTextBox()
     * deleteSelectedTextBox()

2. TextContentManager.js
   - Primary Responsibilities:
     * Content editing interface
     * Font handling and text styles
     * Text effects (outline, shadow)
     * Content state management
   - Key Methods:
     * updateTextContent()
     * applyTextOutline()
     * applyTextShadow()
     * handleContentEditing()

3. TextTailManager.js
   - Primary Responsibilities:
     * SVG tail generation
     * Position calculations
     * Style inheritance
     * Visual updates
   - Key Methods:
     * createSpeechBubbleSvgTail()
     * createThoughtBubbleSvgTail()
     * updateBubbleTail()
     * updateSvgTailSettings()

4. TextStateManager.js
   - Primary Responsibilities:
     * State serialization
     * State restoration
     * History integration
     * Export handling
   - Key Methods:
     * saveTextStates()
     * loadTextStates()
     * restoreTextBubble()
     * finalizeTextBubblePosition()

5. TextStyleManager.js
   - Primary Responsibilities:
     * Style creation and application
     * Custom style management
     * Style inheritance rules
     * Preview generation
   - Key Methods:
     * createCustomTextStyle()
     * applyCustomTextStyle()
     * deleteCustomTextStyle()
     * setDefaultTextSettings()

6. TextEventManager.js
   - Primary Responsibilities:
     * Event delegation system
     * Handler coordination
     * Selection management
     * Keyboard shortcuts
   - Key Methods:
     * setupEventListeners()
     * handleTextSelection()
     * handleKeyboardShortcuts()
     * cleanupEventListeners()

7. TextPositionManager.js
   - Primary Responsibilities:
     * Position calculations
     * Grid system management
     * Boundary checking
     * Transform handling
   - Key Methods:
     * positionTextBox()
     * resetTextPositionGrid()
     * getRotationValue()
     * updatePosition()

8. TextExportManager.js
   - Primary Responsibilities:
     * Export mode detection
     * Style preservation
     * Layout stability
     * Visual consistency
   - Key Methods:
     * prepareForExport()
     * preserveExactStyles()
     * optimizeForExport()
     * restoreFromExport()

9. TextUIManager.js
   - Primary Responsibilities:
     * Format popup creation
     * Control updates
     * Preview handling
     * UI coordination
   - Key Methods:
     * showTextFormatPopup()
     * setupPopupEventListeners()
     * updatePopupControls()
     * generateCustomStylesHTML()

10. TextIntegrationManager.js
    - Primary Responsibilities:
      * Manager coordination
      * API exposure
      * Event broadcasting
      * Error handling
    - Key Methods:
      * initializeManagers()
      * coordinateStateChanges()
      * handleErrors()
      * broadcastEvents()

## 3. Integration Points & Dependencies

### 3.1 Manager Communication
- Event System
  * Use pub/sub pattern
  * Maintain loose coupling
  * Handle async operations
  * Manage state updates

### 3.2 State Flow
- Central State Store
  * Atomic updates
  * Validation checks
  * Error recovery
  * Cache management

### 3.3 DOM Interaction
- Element Creation
  * Maintain exact structure
  * Preserve class hierarchy
  * Handle event delegation
  * Manage cleanup

### 3.4 Style Management
- Style Application Order
  1. Custom styles
  2. Default styles
  3. Computed styles
  4. Export-specific styles

## 4. Critical Functionality Preservation

### 4.1 Text Bubble System
- Creation & Management
  * Dynamic bubble creation
  * Type switching
  * Style application
  * Position handling

### 4.2 SVG Tail System
- Generation & Updates
  * Dynamic path creation
  * Position-based geometry
  * Style inheritance
  * Visual consistency

### 4.3 State Management
- Serialization & Restoration
  * Complete state capture
  * Style preservation
  * Position accuracy
  * Effect persistence

### 4.4 Export System
- Style Preservation
  * Font metrics
  * Layout stability
  * Visual consistency
  * Effect accuracy

## 5. Validation Requirements

### 5.1 Functionality Tests
- [ ] All original functions work identically
- [ ] All state mutations preserved
- [ ] All event listeners maintained
- [ ] All UI behaviors identical

### 5.2 Integration Tests
- [ ] ComicCreator integration intact
- [ ] History management working
- [ ] Drag and drop functioning
- [ ] UI updates correct

### 5.3 Export Tests
- [ ] Font metrics preserved
- [ ] Layout remains stable
- [ ] Visual appearance consistent
- [ ] Performance optimized

### 5.4 Error Handling
- [ ] All error scenarios handled
- [ ] Graceful degradation works
- [ ] User notifications correct
- [ ] State recovery functions

## 6. Migration Steps

### 6.1 Preparation
1. Create all new files
2. Set up import/export structure
3. Create manager instances
4. Initialize core dependencies

### 6.2 Code Movement
1. Move core bubble functionality
2. Transfer state management
3. Migrate event handling
4. Relocate UI components

### 6.3 Integration
1. Update import paths
2. Connect manager instances
3. Test communication flow
4. Verify state management

### 6.4 Validation
1. Run all test scenarios
2. Verify visual consistency
3. Check performance metrics
4. Validate error handling 