# CLAUDE.md - SRC Directory

This file provides guidance to Claude Code (claude.ai/code) when working with code in the src directory.

## Directory Structure

```
src/
├── client/           # PDF export client-side managers
├── js/              # Main JavaScript application code
│   ├── config.js    # API configuration and endpoints
│   ├── layouts.js   # Panel layout definitions
│   ├── main.js      # ComicCreator central orchestrator
│   ├── modules/     # Feature-specific manager classes
│   └── workers/     # Web Workers for background processing
├── server/          # Server-side utilities (legacy)
└── styles/          # CSS styling
```

## Core Architecture

### Central Orchestrator (`js/main.js`)

The `ComicCreator` class is the central hub that:
- Instantiates all manager modules in constructor
- Passes `this` to each manager for cross-communication
- Maintains global state (pages, currentPageIndex, folderStructure)
- Coordinates page lifecycle and state management

### Manager Modules (`js/modules/`)

Each manager handles a specific domain with clear responsibilities:

**Core Managers:**
- `PanelManager`: Panel creation, image placement, zoom/pan/rotate controls
- `TextManager` + sub-modules: Rich text bubbles with formatting
- `ImageLibrary`: Image uploads, thumbnails, asset management
- `DragAndDropManager`: All drag-drop interactions
- `UIManager`: General UI, modals, notifications, properties panel

**Feature Managers:**
- `FolderSystem`: Hierarchical folder organization
- `StickerManager`: Sticker placement and manipulation
- `BackgroundManager`: Page backgrounds (styles/images)
- `LayoutBuilderManager`: Custom panel layout creation
- `ViewportManager`: Canvas viewport and zoom controls
- `ThemeManager`: Application theming

**System Managers:**
- `HistoryManager`: Undo/redo functionality
- `AutoSaveManager`: Periodic localStorage saves
- `ProjectStorageManager`: Manual save/load file operations
- `Utils`: Shared utility functions

### TextManager Sub-modules

The TextManager is split into focused modules:
- `TextManagerCoreSetup`: Initialization and core setup
- `TextManagerBubbleManipulation`: Bubble creation and positioning
- `TextManagerStyling`: Text formatting and effects
- `TextManagerCustomStyles`: Custom style management
- `TextManagerState`: State serialization/restoration
- `TextManagerUtils`: Helper functions

### Client-Side Export (`client/`)

- `pdf-export-manager.js`: Coordinates PDF export with backend
- `pdf-export-progress.js`: Progress tracking and UI updates
- `pdf-export-tracker.js`: Export job state management

### Configuration (`js/config.js`)

Manages API endpoints and environment settings:
- Development: `http://localhost:3001/api`
- Production: Uses `VITE_API_BASE_URL` environment variable
- Export endpoints: `/export-pdf`, `/export-progress`, `/download-pdf`

### Layouts (`js/layouts.js`)

Defines three layout collections:
- `layouts`: Standard square layouts (1:1 ratio)
- `amazonKDPLayouts`: Portrait layouts (7:10 ratio)
- `landscapeLayouts`: Landscape layouts (10:8 ratio)

Each layout defines panel positions as percentages.

### Web Worker (`workers/imageProcessor.worker.js`)

Processes image uploads off main thread:
- Creates Object URLs for performance
- Extracts image dimensions
- Posts results back to ImageLibrary

## Key Patterns

### Manager Communication
```javascript
// Managers access each other via comicCreator instance
this.comicCreator.uiManager.showNotification('Success');
this.comicCreator.panelManager.updatePanelControls();
this.comicCreator.saveCurrentPageState();
```

### State Management
```javascript
// Before changes - record for undo
this.comicCreator.recordHistorySnapshot('action-type');

// After changes - save state
this.comicCreator.saveCurrentPageState();
```

### Image Handling
- In-memory: Object URLs for performance
- Saving: Convert to Data URLs for persistence
- Loading: Convert Data URLs back to Object URLs

### Event Handling
- Global events in `ComicCreator.setupEventListeners()`
- Manager-specific events in respective `init()` methods
- Drag operations via `DragAndDropManager`

## CSS Architecture (`styles/main.css`)

- Extensive CSS variables in `:root` for theming
- Component-based organization
- State classes: `.active`, `.selected`, `.dragging`
- Responsive breakpoints at 1400px and 1200px

## Adding New Features

1. **Create Manager**: Add to `js/modules/NewFeatureManager.js`
2. **Import**: Add import in `main.js`
3. **Instantiate**: Add to `ComicCreator` constructor
4. **Initialize**: Call init method if needed
5. **State Integration**: Update save/load methods
6. **UI Integration**: Add controls via `UIManager`
7. **Styling**: Add to `main.css` following patterns

## Data Flow

1. **User Action** → Event Handler
2. **Manager Method** → State Update
3. **History Snapshot** → Record change
4. **DOM Update** → Visual feedback
5. **State Save** → Persistence

## Critical Files

- `main.js`: Application entry and orchestration
- `UIManager.js`: UI updates and modal management
- `PanelManager.js`: Core comic panel functionality
- `TextManager.js`: Text bubble system
- `config.js`: API configuration

## Performance Considerations

- Web Worker for image processing
- Object URLs for in-memory performance
- Debounced auto-save to localStorage
- Selective history snapshots for undo/redo

## Common Issues

- **Text Manager**: If issues arise, revert to `TextManagerOld.js`
- **Image Conversion**: Large images slow Object↔Data URL conversion
- **Export**: Ensure fonts loaded before html2canvas capture
- **State**: Check localStorage limits for auto-save