# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Comic Creator is a browser-based application for creating digital comic books with drag-and-drop interface, text bubbles, and PDF export capabilities. The application follows a modular JavaScript architecture with a central orchestrator pattern.

## Development Commands

### Frontend (Main Application)
```bash
# Start development server (port 5173)
npm start

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel (after building)
vercel --prod
```

### Backend (PDF Export Service)
```bash
# Navigate to backend directory
cd comic-pro-pdf-service-deploy

# Start local development server (port 3001)
npm start

# Development with auto-reload
npm run dev

# Production mode with PM2
npm run pm2:start
npm run pm2:restart
npm run pm2:logs
```

### Deployment Process

**Frontend Deployment:**
1. Make changes and commit: `git add . && git commit -m "message"`
2. Push to production branch: `git push origin production`
3. Build: `npm run build`
4. Deploy: `vercel --prod`

**Backend Deployment:**
1. Navigate to backend: `cd comic-pro-pdf-service-deploy`
2. Commit changes: `git add . && git commit -m "message"`
3. Push: `git push origin main`
4. SSH to server: `ssh root@IP_DROPLET` (password required)
5. Navigate: `cd Comic-M-Backend`
6. Pull changes: `git pull`
7. Restart: `pm2 restart all`

Backend nginx config location: `/etc/nginx/sites-available/comic-pro-pdf`

## Architecture Overview

### Core Structure
- **Entry Point**: `index.html` - Contains three main pages (upload, layout, editor) and modal structures
- **Main Controller**: `src/js/main.js` - `ComicCreator` class orchestrates all managers
- **Modules**: `src/js/modules/` - Feature-specific manager classes
- **Styles**: `src/styles/main.css` - All styling with extensive CSS variables
- **Config**: `src/js/config.js` - API endpoints and environment configuration

### Manager Pattern
Each manager is instantiated in `ComicCreator` constructor with `this` passed for cross-manager communication:

1. **PanelManager**: Comic panel creation, image placement, zoom/pan controls
2. **TextManager** (+ sub-modules): Text bubbles with rich formatting, custom styles, various bubble types
   - TextManagerBubbleManipulation, TextManagerCoreSetup, TextManagerCustomStyles, TextManagerState, TextManagerStyling, TextManagerUtils
3. **ImageLibrary**: Image uploads, thumbnails, asset management
4. **FolderSystem**: Hierarchical folder organization for assets
5. **DragAndDropManager**: All drag-drop interactions (images→panels, text positioning, stickers)
6. **StickerManager**: Sticker placement and manipulation
7. **BackgroundManager**: Page backgrounds (styles/images, global vs per-page)
8. **UIManager**: General UI, modals, notifications, properties panel
9. **HistoryManager**: Undo/redo functionality
10. **AutoSaveManager**: Periodic localStorage saves
11. **ProjectStorageManager**: Manual save/load file operations
12. **ExportManager**: PDF generation using html2canvas and jsPDF
13. **LayoutBuilderManager**: Custom panel layout creation
14. **ViewportManager**: Canvas viewport and zoom controls
15. **ThemeManager**: Application theming

### State Management
- Central state in `ComicCreator`: pages array, currentPageIndex, folderStructure
- Manager-specific state: currentPanel, currentTextBox, currentSticker
- Save/Load: Full project serialization to JSON with Object URL ↔ Data URL conversion
- Auto-save: Periodic saves to localStorage with prompt on reload

### Key Data Structures

**Project State:**
```javascript
{
  version: "1.3-autosave",
  pages: [/* Page objects */],
  images: [/* Image data with Data URLs */],
  currentPageIndex: 0,
  folderStructure: {/* Folder hierarchy */},
  customLayouts: {},
  customTextStyles: [],
  useGlobalBackgroundStyle: false
}
```

**Page State:**
```javascript
{
  layout: "layoutId" | {/* custom layout */},
  panelStates: [/* Panel data */],
  canvasTextElements: [/* Text elements */],
  stickerStates: [/* Stickers */],
  backgroundState: {/* Background config */}
}
```

## Important Implementation Details

### Image Processing
- Web Worker (`imageProcessor.worker.js`) handles uploads off main thread
- Object URLs used in-memory for performance
- Conversion to Data URLs during save for persistence
- Background images, stickers, and panel images all follow same pattern

### Text System
- ContentEditable divs for rich text editing
- Google Fonts API integration for dynamic font loading
- Complex text-shadow for outlines (multiple offsets)
- Bubble types via CSS classes with ::before/::after pseudo-elements for tails
- Custom styles saved to localStorage

### Export System
- Uses html2canvas for page capture
- Pre-processes elements for accurate rendering (CSS variables → inline styles)
- jsPDF for multi-page PDF assembly
- FontFaceObserver for font preloading

### Drag & Drop
- Custom implementations for panels, text, stickers (mousedown/move/up)
- HTML5 Drag API for library→canvas interactions
- Supports multi-select with Shift/Ctrl keys

## Adding New Features

1. Create manager in `src/js/modules/NewFeatureManager.js`
2. Import and instantiate in `ComicCreator` constructor
3. Add initialization call in `ComicCreator.init()`
4. Integrate with save/load methods
5. Add UI controls via `UIManager.updateRightSidebarView()`
6. Add styles to `main.css` following existing patterns
7. Update state management if needed

## Environment Variables

Frontend uses Vite environment variables:
- `VITE_API_BASE_URL`: Backend API URL (required in production)
- `VITE_PORT`: Development server port (default 5173)

Backend uses standard environment variables in `.env` file.

## Common Patterns

### Manager Communication
```javascript
// Access other managers via comicCreator instance
this.comicCreator.uiManager.showNotification('Success');
this.comicCreator.saveCurrentPageState();
```

### State Updates
```javascript
// Record history before changes
this.comicCreator.recordHistorySnapshot('action-type');
// Make changes
// Save state
this.comicCreator.saveCurrentPageState();
```

### Modal Usage
```javascript
// Show modal via UIManager
this.comicCreator.uiManager.showModal('modal-name');
```

## Testing Approach

No automated tests currently. Manual testing required for:
- Feature interactions across managers
- Save/load project integrity
- Export quality and accuracy
- Multi-page navigation
- Undo/redo functionality
- Cross-browser compatibility (Chrome recommended)

## Recent Fixes & Features (2025-08-21)

### Export Improvements
- **Bubble Tails in Client Export**: CSS pseudo-element tails converted to SVG during export for html2canvas compatibility
- **Current Page State Preservation**: Fixed corruption of current page during export
- **Text Position Accuracy**: Minimal CSS overrides preserve exact positioning
- **Background Preservation**: Global vs explicit backgrounds properly handled

### JSON Loading Enhancements
- **Custom Dimensions**: Automatically creates custom dimension entries for non-standard sizes
- **Legacy Migration**: Old JSON files missing modern fields are automatically migrated
- **hasExplicitBackground Flag**: Tracks intentionally set backgrounds vs global defaults

## Troubleshooting

### Text Manager Issues
If refactored TextManager has problems, revert to old version:
1. Delete current TextManager modules
2. Move `TextManager-docu/TextManagerOld.js` to `modules/`
3. Rename to `TextManager.js`

### Export Issues
- **Missing Bubble Tails**: Client-side export now converts CSS tails to SVG automatically
- **Text Shifting**: Use minimal CSS overrides in export mode (don't override display/vertical-align)
- **Page Corruption**: Current page state now saved before export begins
- Check browser console for html2canvas errors
- Verify fonts are loaded before export
- Check CORS settings for external resources
- Ensure backend service is running for PDF generation

### Performance
- Large projects may slow due to Object URL ↔ Data URL conversions
- Consider image optimization before upload
- Monitor localStorage size limits for auto-save