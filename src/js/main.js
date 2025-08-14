import { layouts, amazonKDPLayouts, landscapeLayouts } from './layouts.js'; // Added amazonKDPLayouts and landscapeLayouts
import { globalRgbToHex, getTextWithLineBreaks } from './modules/Utils.js'; // Import Utils
import { FolderSystem } from './modules/FolderSystem.js'; // Import FolderSystem
import { DragAndDropManager } from './modules/DragAndDropManager.js'; // Import DragAndDropManager
import { ImageLibrary } from './modules/ImageLibrary.js'; // Import ImageLibrary
import { PanelManager } from './modules/PanelManager.js'; // Import PanelManager
import { TextManager } from './modules/TextManager.js'; // Import TextManager
import { StickerManager } from './modules/StickerManager.js'; // Import StickerManager
import { BackgroundManager } from './modules/BackgroundManager.js'; // Import BackgroundManager
import { UIManager } from './modules/UIManager.js'; // Import UIManager
import { LayoutBuilderManager } from './modules/LayoutBuilderManager.js'; // Import LayoutBuilderManager
import { HistoryManager } from './modules/HistoryManager.js'; // Import HistoryManager
import { AutoSaveManager } from './modules/AutoSaveManager.js'; // Import AutoSaveManager
import { ViewportManager } from './modules/ViewportManager.js'; // Import ViewportManager
import { ThemeManager } from './modules/ThemeManager.js'; // Import ThemeManager
import { ClientExportManager } from './modules/ClientExportManager.js'; // Import ClientExportManager for client-side PDF generation
import config from './config.js';

// Global helper function globalRgbToHex removed (now in Utils.js)

class ComicCreator {
    constructor() {
        // this.uploadedImages = []; // Moved to ImageLibrary
        this.pages = [{
            layout: 'empty', // Set a default layout ID, e.g., 'empty' or 'single'
            panelStates: [], // Will store image positions and transforms for each panel
            canvasBackgroundStyle: 'classic-white' // Ensure default exists
        }];
        this.currentPageIndex = 0;
        this.layouts = layouts; // Store layouts in the instance
        this.amazonKDPLayouts = amazonKDPLayouts; // Added for Amazon KDP
        this.landscapeLayouts = landscapeLayouts; // Added for landscape
        this.currentSidebarMode = 'panels'; // Add this line: 'panels', 'backgrounds', 'stickers'
        
        this.canvasDimensions = {
            current: { width: 700, height: 700, name: "Square (1:1)" },
            amazonKDP: { width: 490, height: 700, name: "Portrait (7:10)" },
            landscape10x8: { width: 700, height: 560, name: "Landscape (10:8)" }
        };
        this.selectedCanvasDimension = 'current'; // Default to 1:1

        // this.currentPanel = null; // Moved to PanelManager
        // this.currentTextBox = null; // Will be managed by TextManager
        // Add folder system properties
        this.folderStructure = {
            root: {
                type: 'folder',
                name: 'root',
                items: [], // Will store image IDs and folder IDs
                parent: null
            }
        };
        this.currentFolderId = 'root';
        this.isSavingProject = false; // Add this line
        
        // Instantiate the Managers
        // Remove exportManager instantiation
        this.folderSystem = new FolderSystem(this); // Instantiate FolderSystem
        this.dragAndDropManager = new DragAndDropManager(this); // Instantiate DragAndDropManager
        this.imageLibrary = new ImageLibrary(this); // Instantiate ImageLibrary
        this.layoutBuilderManager = new LayoutBuilderManager(this); // Instantiate LayoutBuilderManager
        this.panelManager = new PanelManager(this); // Instantiate PanelManager
        this.textManager = new TextManager(this); // Instantiate TextManager
        this.stickerManager = new StickerManager(this); // Instantiate StickerManager
        this.backgroundManager = new BackgroundManager(this); // Instantiate BackgroundManager
        this.uiManager = new UIManager(this); // Instantiate UIManager
        this.historyManager = new HistoryManager(this); // Instantiate HistoryManager
        this.autoSaveManager = new AutoSaveManager(this); // Instantiate AutoSaveManager
        this.viewportManager = new ViewportManager(this); // Instantiate ViewportManager
        this.themeManager = new ThemeManager(this); // Instantiate ThemeManager
        this.clientExportManager = new ClientExportManager(this); // Instantiate ClientExportManager for browser-based PDF generation
        
        this.init();
    }

    async init() { 
        console.log("[ComicCreator] Initializing...");
        this.autoSaveRestoredSuccessfully = false; // Initialize the flag
        console.log("[Main] ComicCreator init called.");
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.thumbnail-container') && 
                !e.target.closest('.folder-container')) {
                this.imageLibrary.clearSelection(); 
            }
        });
        
        this.loadCustomLayouts();
        console.log("[Main] Custom layouts loaded.");
        
        this.setupUploadArea();
        console.log("[Main] Upload area set up.");
        this.setupLayoutSelection();
        console.log("[Main] Layout selection set up.");
        this.setupComicEditor();
        console.log("[Main] Comic editor set up.");
        this.setupEventListeners(); // General listeners
        console.log("[Main] General event listeners set up.");
        this.setupProjectControls(); 
        console.log("[Main] Project controls set up.");
        // this.setupPageNavigation(); // Listeners for page navigation buttons // Intentionally commented out
        // console.log("[Main] Page navigation set up."); // Intentionally commented out
        
        this.initializeUI(); 
        console.log("[Main] UI initialized.");
        this.uiManager.setupSidebarTabs(); 
        console.log("[Main] UIManager setupSidebarTabs called.");
        
        try {
            this.historyManager.initializeWithInitialState();
            console.log("[Main] HistoryManager initialized.");
        } catch (e) {
            console.error("[Main] Failed to initialize history manager state:", e);
        }

        await this.autoSaveManager.init(); 
        console.log("[Main] AutoSaveManager initialized.");

        // Check for auto-save after AutoSaveManager is initialized
        const autoSaveFlag = localStorage.getItem('comicCreator_autoSaveExists');
        if (autoSaveFlag === 'true' && !window.IS_PUPPETEER_EXPORT) {
            console.log("[ComicCreator.init] Auto-save flag is true. Prompting user.");
            await this.autoSaveManager.promptLoadAutoSave(); // This will set autoSaveRestoredSuccessfully if loaded
        } else {
            console.log("[ComicCreator.init] No auto-save flag or in Puppeteer mode. Skipping prompt.");
        }

        console.log("[ComicCreator.init] After auto-save check and potential prompt, autoSaveRestoredSuccessfully is:", this.autoSaveRestoredSuccessfully);
        console.log("[ComicCreator.init] window.IS_PUPPETEER_EXPORT is:", window.IS_PUPPETEER_EXPORT);

        // Initialize canvas dimensions only if not restoring from auto-save and not in Puppeteer export mode (where dimensions are set differently)
        if (!this.autoSaveRestoredSuccessfully && !window.IS_PUPPETEER_EXPORT) {
            console.log("[ComicCreator.init] Setting canvas dimension via init flow because not restored from auto-save and not puppeteer.");
            this.setCanvasDimension(this.selectedCanvasDimension);

            console.log("[ComicCreator.init] Ensuring #upload-page is active for a new session.");
            document.getElementById('upload-page')?.classList.add('active');
            document.getElementById('layout-page')?.classList.remove('active');
            document.getElementById('editor-page')?.classList.remove('active');
            
            // Ensure timer is stopped if starting fresh on upload page
            if (this.autoSaveManager) {
                this.autoSaveManager.stopPeriodicAutoSave();
            }

        } else {
            console.log("[ComicCreator.init] Skipping canvas dimension setting in init flow due to auto-save restore or Puppeteer.");
        }

        // Initialize the back to editor button state based on current images
        this.updateBackToEditorButton();
        
        // this.setupInitialPage(); // Commented out as the function doesn't exist / to prevent error
        console.log("[Main] ComicCreator init finished.");
    }

    setupUploadArea() {
        const uploadArea = document.querySelector('.upload-area');
        const fileInput = document.querySelector('#file-input');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drop-target');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drop-target');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drop-target');
            this.imageLibrary.handleImageUpload(e.dataTransfer.files); // Updated call
        });

        fileInput.addEventListener('change', (e) => {
            this.imageLibrary.handleImageUpload(e.target.files); // Updated call
        });
    }

    async handleImageUpload(files) {
        console.log('[handleImageUpload] Starting upload process with files:', files);
        const imagePromises = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        console.log('[handleImageUpload] FileReader loaded for:', file.name);
                        const img = new Image();
                        img.onload = () => {
                            const imageData = {
                                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                name: file.name,
                                src: e.target.result,
                                width: img.width,
                                height: img.height
                            };
                            console.log('[handleImageUpload] Image processed:', imageData.name, 'with ID:', imageData.id);
                            resolve(imageData);
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            });

        const newImages = await Promise.all(imagePromises);
        console.log('[handleImageUpload] All images processed:', newImages.length, 'images');
        this.imageLibrary.addImages(newImages);
        
        // Add new images to current folder
        newImages.forEach(image => {
            this.folderStructure[this.currentFolderId].items.push(image.id.toString());
        });
        
        console.log('[handleImageUpload] Current uploadedImages array:', this.imageLibrary.getImages().length, 'total images');
        this.imageLibrary.updateThumbnails();
        this.imageLibrary.enableNextButton(); // Updated call
    }

    

   

    setupLayoutSelection() {
        const layoutGrid = document.querySelector('.layout-grid');
        
        // Clear existing content
        layoutGrid.innerHTML = '';
        
        let activeLayoutCollection;
        switch (this.selectedCanvasDimension) {
            case 'amazonKDP':
                activeLayoutCollection = this.amazonKDPLayouts;
                break;
            case 'landscape10x8':
                activeLayoutCollection = this.landscapeLayouts;
                break;
            default: // 'current' or any other case
                activeLayoutCollection = this.layouts;
                break;
        }
        
        // Render layout options
        Object.entries(activeLayoutCollection).forEach(([layoutId, layout]) => {
            const layoutOption = document.createElement('div');
            layoutOption.className = 'layout-option';
            layoutOption.dataset.layout = layoutId;
            
            // Add panel count as a data attribute for filtering
            const panelCount = layout.panels.length;
            layoutOption.dataset.panelCount = panelCount;
            
            layoutOption.innerHTML = `
                <h3>${layout.name}</h3>
                <div class="layout-preview">
                    ${this.generateLayoutPreview(layout)}
                </div>
                <p>${layout.description || ''}</p>
            `;
            
            layoutGrid.appendChild(layoutOption);
        });

        // Setup click handler for layout options
        layoutGrid.addEventListener('click', (e) => {
            const layoutOption = e.target.closest('.layout-option');
            if (layoutOption) {
                this.selectedLayout = layoutOption.dataset.layout;
                document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
                layoutOption.classList.add('selected');
                this.createComic();
            }
        });
        
        // Setup filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active filter button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const filter = button.dataset.filter;
                
                // Apply filter to layout options
                document.querySelectorAll('.layout-option').forEach(option => {
                    const panelCount = parseInt(option.dataset.panelCount);
                    
                    if (filter === 'all') {
                        option.style.display = 'block';
                    } else if (filter === '5' && panelCount >= 5) {
                        option.style.display = 'block';
                    } else if (filter === panelCount.toString()) {
                        option.style.display = 'block';
                    } else {
                        option.style.display = 'none';
                    }
                });
            });
        });
    }

    generateLayoutPreview(layout) {
        const previewHtml = [];
        layout.panels.forEach(panel => {
            previewHtml.push(`
                <div class="preview-panel" style="
                    position: absolute;
                    left: ${panel.x}%;
                    top: ${panel.y}%;
                    width: ${panel.width}%;
                    height: ${panel.height}%;
                    background: #f0f0f0;
                    border: 1px solid #ccc;
                "></div>
            `);
        });
        
        // Calculate correct aspect ratio based on selected canvas dimension
        const currentDimensions = this.canvasDimensions[this.selectedCanvasDimension];
        const aspectRatio = (currentDimensions.height / currentDimensions.width) * 100;
        
        return `<div style="position: relative; width: 100%; padding-bottom: ${aspectRatio}%;">${previewHtml.join('')}</div>`;
    }

    setupComicEditor() {
        const canvas = document.querySelector('#comic-canvas');
        
        // Add keyboard event listener for delete key
        document.addEventListener('keydown', (e) => {
            // Existing Delete key logic
            if (e.key === 'Delete') {
                // Check current sidebar mode and selected element
                switch (this.currentSidebarMode) {
                    case 'panels':
                        // FIRST check if a text box is selected
                        if (this.textManager.currentTextBox) {
                            // If a text box is selected, do nothing here.
                            // Let the browser handle the default Delete key behavior
                            // for the contenteditable element (deleting text, not the box).
                            // Do nothing
                        }
                        // ONLY if NO text box is selected, THEN check if a panel image should be deleted
                        else if (this.panelManager.currentPanel && this.panelManager.currentPanel.querySelector('img')) {
                            // *** Record state BEFORE clearing panel image ***
                            this.historyManager.recordSnapshotBeforeAction(false, 'panel');
                            this.panelManager.clearPanelImage(this.panelManager.currentPanel);
                        }
                        break;
                    case 'backgrounds':
                        const backgroundElement = document.querySelector('.canvas-background-image');
                        if (backgroundElement) {
                            this.historyManager.recordSnapshotBeforeAction(false, 'background');
                            this.backgroundManager.clearCustomBackground(); // Use BackgroundManager method
                        }
                        break;
                    case 'stickers':
                         // Check StickerManager for selected sticker
                        if (this.stickerManager.selectedSticker) {
                            this.historyManager.recordSnapshotBeforeAction(false, 'sticker');
                            this.stickerManager.deleteSelectedSticker(); // Use StickerManager method
                        }
                        break;
                }
            }
        });

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            
            // Find the panel under the cursor (if any)
            const panel = e.target.closest('.comic-panel');
            if (panel && this.currentSidebarMode === 'panels') {
                panel.classList.add('drop-target');
                // Add data attribute to identify panel mode for custom drop message
                panel.setAttribute('data-panel-mode', 'true');
            }
        });

        canvas.addEventListener('dragleave', (e) => {
            // Find the panel that was being dragged over (if any)
            const panel = e.target.closest('.comic-panel');
            if (panel) {
                panel.classList.remove('drop-target');
                // Remove the data attribute when leaving
                panel.removeAttribute('data-panel-mode');
            }
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            console.log('[Canvas Drop] Drop event detected.');
            
            // Try different formats to get the image ID
            let imageId = e.dataTransfer.getData('image/id') || 
                         e.dataTransfer.getData('text/plain') ||
                         e.dataTransfer.getData('reorder/id');
            
            console.log('[Canvas Drop] Retrieved image/id from dataTransfer:', imageId);

            if (!imageId) {
                console.log('[Canvas Drop] No image/id found in dataTransfer. Exiting.');
                return;
            }
            
            const image = this.imageLibrary.getImageById(imageId);
            console.log('[Canvas Drop] Found image object in uploadedImages:', image);
            if (!image) {
                console.error('[Canvas Drop] Image not found in uploadedImages for ID:', imageId); // <<< Error log if not found
                return;
            }

            const panel = e.target.closest('.comic-panel');
            console.log('[Canvas Drop] Target panel (if any):', panel); // <<< Debug log
            console.log('[Canvas Drop] Current sidebar mode:', this.currentSidebarMode); // <<< Debug log

            // Handle drop based on current sidebar mode
            switch (this.currentSidebarMode) {
                case 'panels':
                    if (panel) {
                        panel.classList.remove('drop-target');

                        // --- Find the index of the target panel --- 
                        const panelsNodeList = document.querySelectorAll('#comic-canvas .comic-panel');
                        const targetPanelIndex = Array.from(panelsNodeList).indexOf(panel);
                        console.log(`[Canvas Drop] Target panel index: ${targetPanelIndex}`);
                        // --- End find index ---

                        // Pass targetPanelIndex to recordSnapshotBeforeAction
                        this.historyManager.recordSnapshotBeforeAction(false, 'panel', { targetPanelIndex }); 
                        
                        this.panelManager.addImageToPanel(panel, image); 
                    } else {
                        console.log('Mode: Panels - Drop outside panel ignored.');
                    }
                    break;
                
                case 'backgrounds':
                    // Allow drop anywhere on the canvas for background
                    console.log('Mode: Backgrounds - Dropped image ID:', imageId, 'onto canvas');
                    this.historyManager.recordSnapshotBeforeAction(false, 'background');
                    this.backgroundManager.addBackgroundImage(image);
                    // Remove drop-target from panel if dragged over one initially
                    if (panel) panel.classList.remove('drop-target');
                    break;

                case 'stickers':
                    // Allow drop anywhere on the canvas for stickers
                    console.log('Mode: Stickers - Dropped image ID:', imageId, 'onto canvas');
                    this.historyManager.recordSnapshotBeforeAction(false, 'sticker');
                    // Pass viewport drop coordinates (clientX, clientY)
                    // Call the method on the StickerManager instance
                    this.stickerManager.addSticker(image, e.clientX, e.clientY);
                    // Remove drop-target from panel if dragged over one initially
                    if (panel) panel.classList.remove('drop-target');
                    break;

                default:
                    console.warn('Unknown sidebar mode:', this.currentSidebarMode);
            }

            // Clear any lingering drop-target classes
            document.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
                // Remove any panel mode data attributes
                if (el.hasAttribute('data-panel-mode')) {
                    el.removeAttribute('data-panel-mode');
                }
            });
        });

        canvas.addEventListener('click', (e) => {
            const panel = e.target.closest('.comic-panel');
            const textBox = e.target.closest('.text-bubble');
            const sticker = e.target.closest('.canvas-sticker-image'); // Check for sticker click

            if (sticker) {
                // Clicked on a sticker - select it via StickerManager
                this.stickerManager.selectSticker(sticker);
            } else if (textBox) {
                // Clicked inside a text box (or its controls, handled by text box listeners)
                // Let the text box's own click listener handle selection/focus
                // Do nothing here to avoid deselecting when clicking format buttons etc.
                return; 
            } else if (panel) {
                // Clicked on a panel but not text/sticker inside it
                // Call the method on the PanelManager instance
                this.panelManager.selectPanel(panel);
            } else {
                            // Clicked on the canvas background or empty area
            this.deselectAll();
        }
    });
    
    // Initialize ViewportManager after setting up the canvas
    this.viewportManager.init();
}

    
    // Helper method to update a specific transform function in a transform string
    updateTransform(transform, type, newValue) {
        if (!transform) {
            // If no transform exists, create one with the new value
            if (type === 'scale') return `translate(-50%, -50%) ${newValue}`;
            if (type === 'rotate') return `translate(-50%, -50%) ${newValue}`;
            return transform;
        }
        
        // Convert the transform string to an array of transform functions
        const regex = /(translate|scale|rotate)\([^)]+\)/g;
        const transformFunctions = transform.match(regex) || [];
        
        // Create a map of transform functions
        const transformMap = {};
        transformFunctions.forEach(func => {
            const funcType = func.substring(0, func.indexOf('('));
            transformMap[funcType] = func;
        });
        
        // Update or add the specified transform function
        if (newValue) {
            transformMap[type] = newValue;
        } else {
            delete transformMap[type]; // Remove the transform if newValue is empty
        }
        
        // Rebuild the transform string with the correct order: translate -> rotate -> scale
        let newTransform = '';
        if (transformMap.translate) newTransform += transformMap.translate + ' ';
        if (transformMap.rotate) newTransform += transformMap.rotate + ' ';
        if (transformMap.scale) newTransform += transformMap.scale + ' ';
        
        return newTransform.trim();
    }

    saveCurrentPageState() {
        console.log(`Saving current page state for page ${this.currentPageIndex}`);
        const currentPage = this.pages[this.currentPageIndex];
        if (!currentPage) {
            console.error("Cannot save state - current page not found");
            return null;
        }
        
        // Get states from managers
        const panelImageStates = this.panelManager.savePanelStates();
        console.log(`Main.saveCurrentPageState: Getting text states from TextManager...`);
        
        // Count text elements in DOM to verify they are all captured
        const comicCanvas = document.querySelector('#comic-canvas');
        if (comicCanvas) {
            const domCanvasTextElements = comicCanvas.querySelectorAll(':scope > .text-bubble');
            const domPanelTextCounts = [];
            document.querySelectorAll('.comic-panel').forEach(panel => {
                domPanelTextCounts.push(panel.querySelectorAll('.text-bubble').length);
            });
            console.log(`Main.saveCurrentPageState: DOM has ${domCanvasTextElements.length} canvas text elements and panel text counts: [${domPanelTextCounts.join(', ')}]`);
        }
        
        const textStates = this.textManager.saveTextStates(); 
        
        // Debug logging for text states
        console.log(`Main.saveCurrentPageState: Received ${textStates.panelTextStates.length} panel text state arrays and ${textStates.canvasTextElements.length} canvas text elements`);
        
        const stickerStates = this.stickerManager.saveStickerStates();
        
        // Get background state safely
        let backgroundState = null;
        try {
            backgroundState = this.backgroundManager.saveBackgroundState();
        } catch (e) {
            console.warn("Error saving background state:", e);
            backgroundState = currentPage.backgroundState || null;
        }

        // Combine panel states with text states
        const combinedPanelStates = panelImageStates.map((panelState, index) => {
            return {
                ...(panelState || {}), // Merge existing panel state (image, transform)
                textElements: textStates.panelTextStates[index] || [] // Add text for this panel
            };
        });

        // Construct the state object
        const pageStateSnapshot = {
            layout: currentPage.layout,
            panelStates: combinedPanelStates,
            canvasTextElements: textStates.canvasTextElements || [],
            stickerStates: stickerStates || [],
            backgroundState: backgroundState,
            canvasBackgroundStyle: currentPage.canvasBackgroundStyle || 'classic-white'
        };

        // Debug log for the page state snapshot
        console.log(`Main.saveCurrentPageState: Page state snapshot created with ${pageStateSnapshot.panelStates.length} panel states and ${pageStateSnapshot.canvasTextElements.length} canvas text elements`);
        
        // For detailed debugging of canvas text elements
        if (pageStateSnapshot.canvasTextElements.length > 0) {
            pageStateSnapshot.canvasTextElements.forEach((element, idx) => {
                console.log(`Main.saveCurrentPageState: Canvas text element ${idx} properties:`, 
                    JSON.stringify({
                        id: element.id,
                        position: {
                            left: element.style.left,
                            top: element.style.top,
                        },
                        transform: element.style.transform
                    })
                );
            });
        }
        
        // Update the actual page object
        Object.assign(currentPage, pageStateSnapshot);

        console.log(`Saved page ${this.currentPageIndex} state snapshot`);
        
        // Update back to editor button when page content changes
        this.updateBackToEditorButton();
        
        return pageStateSnapshot;
    }

    setupEventListeners() {
        console.log("[Main] setupEventListeners called.");

        // --- Page Navigation ---
        const nextStepBtn = document.getElementById('next-step-btn');
        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => {
                console.log("[Main] Next Step button clicked (Upload to Layout).");
                document.getElementById('upload-page').classList.remove('active');
                document.getElementById('layout-page').classList.add('active');
                this.setupLayoutSelection(); // Refresh layouts for current dimension
            });
        } else { console.error("[Main] #next-step-btn not found"); }

        const backToUploadBtn = document.getElementById('back-to-upload');
        if (backToUploadBtn) {
            backToUploadBtn.addEventListener('click', () => {
                console.log("[Main] Back to Upload button clicked (Layout to Upload).");
                if (this.autoSaveManager) {
                    console.log("[ComicCreator.backToUpload] Stopping periodic auto-save.");
                    this.autoSaveManager.stopPeriodicAutoSave();
                }
                document.getElementById('layout-page').classList.remove('active');
                document.getElementById('upload-page').classList.add('active');
            });
        } else { console.error("[Main] #back-to-upload-btn not found"); }

        const backToLayoutBtn = document.getElementById('back-to-layout');
        if (backToLayoutBtn) {
            backToLayoutBtn.addEventListener('click', () => {
                console.log("[Main] Back to Layout button clicked (Editor to Layout).");
                if (this.autoSaveManager) {
                    console.log("[ComicCreator.backToLayout] Stopping periodic auto-save (from editor) and starting for layout page.");
                    this.autoSaveManager.stopPeriodicAutoSave(); // Stop it from editor context
                    // No initial save for layout page, just start the timer
                    this.autoSaveManager.startPeriodicAutoSave(); 
                } else {
                    console.warn("[ComicCreator.backToLayout] AutoSaveManager not available.");
                }
                document.getElementById('editor-page').classList.remove('active');
                document.getElementById('layout-page').classList.add('active');
                this.setupLayoutSelection(); // Refresh layouts for current dimension
            });
        } else { console.error("[Main] #back-to-layout-btn not found"); }

        const backToEditorBtn = document.getElementById('back-to-editor-btn');
        if (backToEditorBtn) {
            backToEditorBtn.addEventListener('click', () => {
                console.log("[Main] Back to Editor button clicked (Upload to Editor).");
                // Basic check: if there's content on the current page
                if (this.pages[this.currentPageIndex] && (this.pages[this.currentPageIndex].layout || this.pages[this.currentPageIndex].panelStates.length > 0)) {
                    document.getElementById('upload-page').classList.remove('active');
                    document.getElementById('editor-page').classList.add('active');
                    this.showBackToEditorButton(); // Show button when editor is visited
                } else {
                    // If no project seems active, go to layout selection
                    document.getElementById('upload-page').classList.remove('active');
                    document.getElementById('layout-page').classList.add('active');
                    this.uiManager.showNotification("No active project. Select a layout to start.", "info");
                }
            });
        } else { console.error("[Main] #back-to-editor-btn not found"); }

        // --- Canvas Size Selection ---
        const currentSizeBtn = document.getElementById('current-size-btn');
        if (currentSizeBtn) {
            currentSizeBtn.addEventListener('click', () => this.setCanvasDimension('current'));
        } else { console.error("[Main] #current-size-btn not found"); }

        const amazonKDPSizeBtn = document.getElementById('amazon-kdp-size-btn');
        if (amazonKDPSizeBtn) {
            amazonKDPSizeBtn.addEventListener('click', () => this.setCanvasDimension('amazonKDP'));
        } else { console.error("[Main] #amazon-kdp-size-btn not found"); }

        const landscape10x8Btn = document.getElementById('landscape-10x8-size-btn');
        if (landscape10x8Btn) {
        landscape10x8Btn.addEventListener('click', () => this.setCanvasDimension('landscape10x8'));
        } else { console.error("[Main] #landscape-10x8-size-btn not found"); }

        // --- Add Text Button ---
        const addTextBtn = document.getElementById('add-text-btn');
        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                console.log("[Main] Add Text button clicked. Mode:", this.currentSidebarMode);
                
                // Always use sticker text (addTextToCanvas) regardless of current layer mode
                this.textManager.addTextToCanvas();
            });
        } else { console.error("[Main] #add-text-btn not found"); }
        
        // --- Project Actions ---
        const saveProjectBtn = document.getElementById('save-project-btn');
        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', () => this.saveProject());
        } else { console.error("[Main] #save-project-btn not found"); }

        const loadProjectBtnUploadPage = document.querySelector('#upload-page #load-project-btn'); // Specific to upload page
        if (loadProjectBtnUploadPage) {
            loadProjectBtnUploadPage.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            await this.loadProject(file);
                                        // Go to editor after loading
            document.getElementById('upload-page').classList.remove('active');
            document.getElementById('editor-page').classList.add('active');
                        } catch (error) {
                            console.error("Error loading project:", error);
                            this.uiManager.showNotification("Error loading project. Check console.", "error");
                        }
                    }
                };
                input.click();
            });
        } else { console.error("[Main] #load-project-btn on upload page not found"); }

        const newProjectBtn = document.getElementById('new-project-btn');
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => this.promptForNewProject());
        } else { console.error("[Main] #new-project-btn not found"); }

        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                console.log('[Main] Download button clicked. Prompting for filename...');
                const filename = await this.promptForFilename("MyComic", ".pdf");

                if (!filename) { 
                    console.log('[Main] Filename prompt cancelled or no filename entered.');
                    this.uiManager.showNotification('Export cancelled: No filename provided.', 'info');
                    return;
                }
                
                // Select export method based on project size
                const exportMethod = await this.selectExportMethod();
                console.log(`[Main] Export method selected: ${exportMethod}`);
                
                if (exportMethod === 'client') {
                    // Client-side export - process in browser
                    await this.exportViaClient(filename);
                } else {
                    // Server-side export - existing flow
                    await this.exportViaServer(filename);
                }
            });
        } else { console.error("[Main] #download-btn not found"); }

        // --- Panel Controls (Zoom, Position) ---
        // These are more complex and often tied to a selected panel.
        // Initial setup might be here, but updates/event handling might be better in PanelManager or UIManager
        // when a panel is selected. For now, keeping basic listeners if elements are always present.
        const zoomControl = document.querySelector('#panel-properties .zoom-control');
        if (zoomControl) {
            zoomControl.addEventListener('input', (e) => {
                if (this.panelManager && this.panelManager.currentPanel) {
                    this.panelManager.handleZoom(e, this.panelManager.currentPanel);
                }
            });
        } // else { console.warn("[Main] Zoom control in panel properties not found during setup."); }

        const positionButtons = document.querySelectorAll('#panel-properties .position-btn');
        if (positionButtons.length > 0) {
            positionButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.panelManager && this.panelManager.currentPanel) {
                        this.panelManager.handlePositionChange(btn, this.panelManager.currentPanel);
                    }
                });
            });
        } // else { console.warn("[Main] Position buttons in panel properties not found during setup."); }
        
        // Listener for the "Empty Canvas" filter button on layout page
        const emptyCanvasFilterBtn = document.querySelector('.filter-btn[data-filter="0"]');
        if (emptyCanvasFilterBtn) {
            emptyCanvasFilterBtn.addEventListener('click', () => {
                this.selectedLayout = 'empty'; 
                document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
                console.log("[Main] Empty canvas selected via filter button.");
                this.createComic({ name: "Empty Canvas", panels: [] }); // Pass an empty layout object
            });
        } else { console.warn("[Main] Empty canvas filter button not found."); }

        // Custom Layout Upload
        const customLayoutInput = document.getElementById('custom-layout-input');
        if (customLayoutInput) {
            customLayoutInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (!files.length) return;
                if (files.length > 1) {
                    this.processBatchLayouts(files);
                } else {
                    this.processSingleLayoutFile(files[0]);
                }
            });
        } else { console.warn("[Main] #custom-layout-input not found."); }


        // Global click listener for deselecting items (if not handled elsewhere more specifically)
        // document.addEventListener('click', (e) => {
        //    if (!e.target.closest('.comic-panel, .text-bubble, .canvas-sticker-image, .properties-panel, .sidebar-tabs, .tool-btn')) {
        //        this.deselectAll(); // deselectAll should handle what to deselect
        //    }
        // });
        console.log("[Main] setupEventListeners finished.");

        // Add Undo/Redo listeners
        document.addEventListener('keydown', (e) => {
            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault(); // Prevent browser's default undo action
                if (this.historyManager) {
                    this.historyManager.undo();
                }
            }
        });

        // Add undo button click listener
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.historyManager) {
                    this.historyManager.undo();
                }
            });
        } else {
            console.error("[Main] #undo-btn not found");
        }
    }

    // Helper for polling export progress (extracted from download listener)
    pollExportProgress(jobId, totalPages) {
        const progressInterval = setInterval(async () => {
                    if (!jobId) {
                        clearInterval(progressInterval);
                        return;
                    }
                    try {
                const progressResponse = await fetch(config.endpoints.exportProgress(jobId));
                        if (!progressResponse.ok) {
                            clearInterval(progressInterval);
                            this.uiManager.showNotification(`Error checking export progress: ${progressResponse.statusText}`, 'error');
                            this.uiManager.updateExportProgress('Error checking progress.', 0, totalPages, true);
                            return;
                        }
                        const progressData = await progressResponse.json();
                        const percentage = totalPages > 0 ? Math.round((progressData.currentPage / totalPages) * 100) : 0;
                console.log(`[Main] Progress for Job ID ${jobId}: Status: ${progressData.status}, Page: ${progressData.currentPage}/${totalPages}`);

                        if (progressData.status === 'processing') {
                            this.uiManager.updateExportProgress(`Processing page ${progressData.currentPage} of ${totalPages}...`, percentage, totalPages);
                } else if (progressData.status === 'merging') {
                    this.uiManager.updateExportProgress('Finalizing PDF...', 99, totalPages, false, 'merging');
                        } else if (progressData.status === 'compressing') {
                    this.uiManager.updateExportProgress('Compressing PDF... This may take a few minutes. <br>Please be patient.', 100, totalPages, false, 'compressing');
                        } else if (progressData.status === 'complete') {
                            clearInterval(progressInterval);
                    this.uiManager.updateExportProgress('PDF ready! Preparing download...', 100, totalPages, false, 'complete');
                    window.location.href = config.endpoints.downloadPdf(jobId);
                            setTimeout(() => {
                                this.uiManager.hideExportProgress();
                                this.uiManager.showNotification('PDF download initiated!', 'success');
                                // Restore viewport state after export
                                this.viewportManager.restoreAfterExport();
                    }, 3000);
                        } else if (progressData.status === 'error') {
                            clearInterval(progressInterval);
                            const errorMessage = progressData.error || 'Unknown error during PDF generation.';
                            this.uiManager.updateExportProgress(`Error: ${errorMessage}`, percentage, totalPages, true);
                            // Restore viewport state on error
                            this.viewportManager.restoreAfterExport();
                        }
                    } catch (pollError) {
                console.error('[Main] Error polling for PDF export progress:', pollError);
                        clearInterval(progressInterval);
                this.uiManager.showNotification('Error polling for export progress.', 'error');
                        this.uiManager.hideExportProgress();
                        // Restore viewport state on polling error
                        this.viewportManager.restoreAfterExport();
                    }
        }, config.export.progressPollInterval);
    }
    
    /**
     * Select the appropriate export method based on project size and capabilities
     */
    async selectExportMethod() {
        const pageCount = this.pages.length;
        const estimate = this.clientExportManager.getExportEstimate();
        
        console.log('[selectExportMethod] Export estimate:', estimate);
        
        // Auto-select for small comics
        if (pageCount <= 20 && estimate.suitable) {
            console.log('[selectExportMethod] Auto-selecting client export for small comic');
            return 'client';
        }
        
        // Auto-select server for very large comics
        if (pageCount > 50 || !estimate.suitable) {
            console.log('[selectExportMethod] Auto-selecting server export for large comic');
            this.uiManager.showNotification('Large comic detected - using server export for best results', 'info');
            return 'server';
        }
        
        // For medium comics (20-50 pages), ask user preference
        // For now, default to client if suitable, server otherwise
        return estimate.suitable ? 'client' : 'server';
    }
    
    /**
     * Export via client-side (browser) processing
     */
    async exportViaClient(filename) {
        console.log('[exportViaClient] Starting client-side export');
        
        try {
            this.uiManager.showExportProgress('Starting client-side export...', 0);
            
            const success = await this.clientExportManager.exportToClient({
                filename: filename + '.pdf',
                quality: 0.85,
                progressCallback: (progress) => {
                    this.uiManager.showExportProgress(progress.message, progress.percentage, { stage: progress.stage });
                }
            });
            
            if (success) {
                this.uiManager.hideExportProgress();
                this.uiManager.showNotification('PDF exported successfully!', 'success');
                console.log('[exportViaClient] Export completed successfully');
            }
        } catch (error) {
            console.error('[exportViaClient] Export error:', error);
            this.uiManager.hideExportProgress();
            
            // Ask user if they want to try server export
            const retry = confirm('Client-side export failed. Would you like to try server-side export instead?');
            if (retry) {
                await this.exportViaServer(filename);
            } else {
                this.uiManager.showNotification('Export cancelled', 'info');
            }
        }
    }
    
    /**
     * Export via server-side processing (existing method)
     */
    async exportViaServer(filename) {
        console.log('[exportViaServer] Starting server-side export');
        
        const comicName = filename;
        console.log(`[exportViaServer] Filename: ${comicName}. Prompting for compression choice...`);

        // Ask about compression
        const compressionChoice = await this.uiManager.showCompressionChoiceModal();

        if (compressionChoice === "Cancel" || compressionChoice === null) {
            console.log('[exportViaServer] Compression choice cancelled.');
            this.uiManager.showNotification('Export cancelled by user.', 'info');
            return;
        }

        const shouldCompress = compressionChoice === "Yes";
        console.log(`[exportViaServer] Compression: ${shouldCompress}. Initiating PDF export job...`);
        
        this.uiManager.showExportProgress('Starting server export...', 0);
        
        // Prepare viewport for export (reset zoom/pan)
        this.viewportManager.prepareForExport();
        
        try {
            const projectState = await this.getCurrentProjectState();
            if (!projectState) {
                this.uiManager.hideExportProgress();
                this.uiManager.showNotification('Could not retrieve project state for export.', 'error');
                return;
            }
            projectState.comicName = comicName;
            projectState.shouldCompress = shouldCompress;

            console.log('[exportViaServer] Making request to:', config.endpoints.exportPdf);
            
            const initiateResponse = await fetch(config.endpoints.exportPdf, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectState),
            });

            if (initiateResponse.status !== 202) {
                let errorMsg = `Error starting PDF export: ${initiateResponse.status}`;
                try { 
                    const errDetails = await initiateResponse.json(); 
                    errorMsg += ` - ${errDetails.message || 'Server error'}`; 
                } catch (e) { /* ignore */ }
                this.uiManager.hideExportProgress();
                this.uiManager.showNotification(errorMsg, 'error');
                return;
            }

            const jobDetails = await initiateResponse.json();
            this.pollExportProgress(jobDetails.jobId, jobDetails.totalPages);
        } catch (error) {
            console.error('[exportViaServer] Error during PDF export initiation:', error);
            this.uiManager.hideExportProgress();
            this.uiManager.showNotification(`PDF Export failed: ${error.message}`, 'error');
            this.viewportManager.restoreAfterExport();
        }
    }

    // Helper to process a single layout file (extracted from custom layout listener)
    processSingleLayoutFile(file) {
                    if (file && file.type === 'application/json') {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const layoutData = JSON.parse(event.target.result);
                                if (this.validateCustomLayout(layoutData)) {
                                    const layoutId = 'custom-' + layoutData.name.toLowerCase().replace(/\s+/g, '-');
                                    this.layouts[layoutId] = layoutData;
                        this.layoutBuilderManager.saveLayoutToStorage(layoutData.name, layoutData); // Persist
                        this.uiManager.showNotification(`Custom layout "${layoutData.name}" added.`, "success");
                        this.setupLayoutSelection(); // Refresh layout grid
                                } else {
                        this.uiManager.showNotification(`Invalid layout format in ${file.name}.`, "error");
                                }
                            } catch (error) {
                    this.uiManager.showNotification(`Error parsing ${file.name}.`, "error");
                                console.error(`Error parsing JSON file ${file.name}:`, error);
                            }
                        };
                        reader.readAsText(file);
                    } else {
            this.uiManager.showNotification(`File ${file.name} is not a valid JSON file.`, "error");
        }
    }


    setCanvasDimension(dimensionKey) {
        if (!this.canvasDimensions[dimensionKey]) {
            console.error("Invalid canvas dimension key:", dimensionKey);
            return;
        }

        this.selectedCanvasDimension = dimensionKey;
        const newDim = this.canvasDimensions[dimensionKey];

        document.documentElement.style.setProperty('--canvas-width', `${newDim.width}px`);
        document.documentElement.style.setProperty('--canvas-height', `${newDim.height}px`);

        // Update button active states
        const currentSizeBtn = document.getElementById('current-size-btn');
        const amazonKDPSizeBtn = document.getElementById('amazon-kdp-size-btn');
        const landscape10x8Btn = document.getElementById('landscape-10x8-size-btn');
        

        if (currentSizeBtn) currentSizeBtn.classList.toggle('active-size', dimensionKey === 'current');
        if (amazonKDPSizeBtn) amazonKDPSizeBtn.classList.toggle('active-size', dimensionKey === 'amazonKDP');
        if (landscape10x8Btn) landscape10x8Btn.classList.toggle('active-size', dimensionKey === 'landscape10x8');
        
        // Update button text to reflect the selected dimension more clearly if needed (optional)
        // For instance, if you want the button text itself to change.
        // currentSizeBtn.textContent = this.canvasDimensions.current.name;
        // amazonKDPSizeBtn.textContent = this.canvasDimensions.amazonKDP.name;
        // currentSizeBtn.classList.toggle('active-size', dimensionKey === 'current');
        // amazonKDPSizeBtn.classList.toggle('active-size', dimensionKey === 'amazonKDP');


        // Propagate this change to PanelManager
        // LayoutBuilderManager's internal canvas is assumed to be fixed size for defining percentages.
        // So, it does not need to be updated with the main canvas dimensions.
        // if (this.layoutBuilderManager) {
        //    this.layoutBuilderManager.updateCanvasSize(newDim.width, newDim.height); 
        // }
        if (this.panelManager) {
            this.panelManager.updateCanvasSize(newDim.width, newDim.height);
        }

        // If the layout page is active, refresh the layout selection
        if (document.getElementById('layout-page').classList.contains('active')) {
            this.setupLayoutSelection();
        }

        // After updating dimensions, if a comic is already on screen, re-render it.
        // This assumes createComic() can be called to redraw with current settings.
        // We need to ensure it uses the new canvas size.
        // It might be better to have a dedicated "refreshLayout" or "redrawCanvas" method.
        if (document.getElementById('editor-page').classList.contains('active')) {
            // Only redraw if the editor is active and showing a comic.
            // Pass the currently selected layout for the current page.
             const currentPageLayout = this.pages[this.currentPageIndex]?.layout;
             if (currentPageLayout) {
                this.createComic(currentPageLayout, false); 
             } else if (this.selectedLayout) { // Fallback to overall selected layout if page has no specific one
                this.createComic(this.selectedLayout, false);
                            } else {
                this.createComic('empty', false); // Or just create an empty canvas
             }
        }
        
        // Record state after dimension change using the existing method
        if (this.historyManager && typeof this.historyManager.recordSnapshotBeforeAction === 'function') {
            this.historyManager.recordSnapshotBeforeAction(false, 'canvas_dimension_change'); 
        } else {
            console.warn("[ComicCreator.setCanvasDimension] HistoryManager or recordSnapshotBeforeAction not available.");
        }
        console.log(`Canvas dimension set to: ${dimensionKey} (${newDim.width}x${newDim.height}px)`);
    }

    createComic(layout = null, isNewPageCreation = true) {
        // Use provided layout or get from selected layout
        const layoutConfig = layout || this.getLayoutConfig(this.selectedLayout);
        if (!layoutConfig) {
            console.error('No layout configuration found.');
            return;
        }

        console.log('Creating comic with layout:', layoutConfig.name || 'Unnamed Layout');

        // Navigate to editor page
        document.querySelector('#layout-page').classList.remove('active');
        document.querySelector('#editor-page').classList.add('active');
        console.log("[ComicCreator.createComic] Navigated to editor page.");

        // --- Auto-save calls --- 
        if (isNewPageCreation && this.autoSaveManager) {
            console.log("[ComicCreator.createComic] Called by new page creation. Calling performInitialSaveOnEditorEntry and startPeriodicAutoSave.");
            this.autoSaveManager.performInitialSaveOnEditorEntry();
            this.autoSaveManager.startPeriodicAutoSave();
        } else if (this.autoSaveManager) {
            console.log("[ComicCreator.createComic] Called by page load or redraw. Skipping initial save, ensuring periodic save is running if not already.");
            // Ensure timer is running if we are in editor, but don't do an initial destructive save.
            // This might already be handled by loadPageState's own auto-save calls at the end.
            // For now, let's just ensure it starts if not running.
            this.autoSaveManager.startPeriodicAutoSave(); 
        } else {
            console.warn("[ComicCreator.createComic] AutoSaveManager not available.");
        }
        // --- End Auto-save calls ---

        // Update the editor sidebar with uploaded images and upload button
        const editorSidebar = document.querySelector('.editor-sidebar');
        if (editorSidebar) {
            // Add upload button if it doesn't exist
            if (!editorSidebar.querySelector('.upload-area')) {
                const uploadArea = document.createElement('div');
                uploadArea.className = 'upload-area';
                uploadArea.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Click to add more images</p>
                    <input type="file" id="sidebar-file-input" multiple accept="image/*" style="display: none;">
                `;
                editorSidebar.insertBefore(uploadArea, editorSidebar.firstChild);
                
                // Setup upload functionality
                const fileInput = uploadArea.querySelector('#sidebar-file-input');
                uploadArea.addEventListener('click', () => fileInput.click());
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('drop-target');
                });
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('drop-target');
                });
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('drop-target');
                    this.imageLibrary.handleImageUpload(e.dataTransfer.files); // Update call
                });
                fileInput.addEventListener('change', (e) => {
                    this.imageLibrary.handleImageUpload(e.target.files); // Update call
                });
            }
            
            // Update image library
            this.imageLibrary.updateThumbnails(); // Verify call
        }
        
        const canvas = document.querySelector('#comic-canvas');
        canvas.innerHTML = '';
        
        // Set canvas dimensions and center it
        canvas.style.position = 'relative'; // Keep this if not set in CSS
        //If canvas is not centered, uncomment this line and change style.paddingTOp form 120px to 2rem
        //canvas.style.margin = '0 auto'; // Keep this for centering if not in CSS
        canvas.style.display = 'block'; // Keep this if not set in CSS

        // Create a container for the canvas with padding
        const canvasContainer = canvas.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('comic-canvas-container')) {
            canvasContainer.style.padding = '2rem';
            canvasContainer.style.paddingTop = '120px'; //changed from 2 rem to 120px
            canvasContainer.style.display = 'flex';
            canvasContainer.style.justifyContent = 'center';
            canvasContainer.style.alignItems = 'flex-start';
            canvasContainer.style.minHeight = 'calc(100vh - 100px)';
        }

        // Calculate the available space for panels
        // const panelAreaWidth = 620; // Moved to PanelManager
        // const panelAreaHeight = 620; // Moved to PanelManager
        // const panelGap = 12; // Moved to PanelManager

        // Create panels using the PanelManager
        this.panelManager.createPanels(layoutConfig, canvas);

        // --- Update the actual page object's layout property --- 
        // Ensure this happens BEFORE saveCurrentPageState might be called below
        const currentPageForLayoutUpdate = this.pages[this.currentPageIndex];
        if (currentPageForLayoutUpdate) {
            // Use the ID stored in this.selectedLayout if createComic was called without a specific layout argument
            // Or if layout is an object, try to find its ID or use the object itself (though ID is preferred for consistency)
            let layoutToSave = layout;
            if (typeof layout === 'object' && layout !== null && layout.name) {
                // Attempt to find a matching ID for the layout object
                const foundLayoutId = Object.keys(this.layouts).find(id => this.layouts[id] === layout);
                if (foundLayoutId) {
                    layoutToSave = foundLayoutId;
                } else {
                    // If no ID found (e.g. 'empty' object), this could be problematic for saving/reloading
                    // For 'empty', page.layout should ideally be 'empty' (string)
                    if (layout.name === "Empty Canvas" && Array.isArray(layout.panels) && layout.panels.length === 0) {
                        layoutToSave = 'empty'; 
                    }
                }
            } else if (typeof layout === 'string') {
                layoutToSave = layout;
            } else {
                layoutToSave = this.selectedLayout; // Fallback
            }
            currentPageForLayoutUpdate.layout = layoutToSave;
            console.log(`[createComic] Updated page ${this.currentPageIndex} layout to: ${currentPageForLayoutUpdate.layout}`);
        }
        // --- End layout update ---

        // Apply default background style if no layout is provided
        // This logic might need refinement: when is 'layout' null vs when is it 'empty'?
        if (!layout || (typeof layout === 'string' && layout === 'empty')) { 
            // Call the method on the BackgroundManager instance
            this.backgroundManager.applyBackgroundStyle('classic-white'); 
        }

        // Update back to editor button after layout is created
        this.updateBackToEditorButton();

        // Only save state if this is a new page creation and not loading an existing page
        // This is important to avoid overriding existing page states
        // Check if we're creating a new page vs loading an existing one
        const currentPage = this.pages[this.currentPageIndex];
        // If isNewPageCreation is true, and the page is genuinely blank (no panelStates yet)
        if (isNewPageCreation && (!currentPage.panelStates || currentPage.panelStates.length === 0)) {
            console.log("[createComic] Creating new page state from scratch because isNewPageCreation is true.");
            this.saveCurrentPageState();
        }
    }

    getLayoutConfig(layoutName) {
        if (!layoutName) {
            console.error("No layout name provided to getLayoutConfig");
            return null;
        }
        
        // If layoutName is already an object (a layout configuration), return it directly
        if (typeof layoutName === 'object' && layoutName !== null) {
            return layoutName;
        }
        
        let config = null;
        // If it's a string, look it up in the appropriate layout collections
        if (typeof layoutName === 'string') {
            config = this.layouts[layoutName] || 
                     this.amazonKDPLayouts[layoutName] || 
                     this.landscapeLayouts[layoutName];
        }
        
        if (config) {
            return config;
        }
        
        console.error(`Layout not found: ${layoutName}`);
        
        // Fallback to the 'single' layout from the default collection if the requested one isn't found
        const fallbackLayoutKey = 'single'; // Explicitly fallback to 'single'
        if (this.layouts[fallbackLayoutKey]) {
            console.warn(`Using fallback layout: '${fallbackLayoutKey}' from default collection.`);
            this.uiManager.showNotification(`Layout "${layoutName}" not found. Using default 'Single Panel'.`, "warning");
            return this.layouts[fallbackLayoutKey];
        } else {
            // Absolute fallback if even 'single' is missing (should not happen)
            console.error("Critical: Default fallback layout 'single' also not found!");
            this.uiManager.showNotification(`Layout "${layoutName}" not found. Critical error: default fallback missing.`, "error");
            return { name: "Error - No Layout", description: "Critical error", panels: [] }; // Return a minimal empty layout
        }
    }

    initializeUI() {
        // Add page navigation UI to editor header
        const editorHeader = document.querySelector('.editor-header');
        const pageNavigation = document.createElement('div');
        pageNavigation.className = 'page-navigation';
        pageNavigation.innerHTML = `
            <div class="page-controls">
                <div class="nav-group" style="display: flex; flex-direction: column; align-items: center;">
                    <span class="page-indicator">Page 1 of 1</span>
                    <div class="input-group" style="margin: 8px 0; display: flex; flex-direction: row; align-items: center;">
                        <button class="tool-btn" id="prevPage">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <input type="number" id="pageNumberInput" class="page-number-input" min="1" value="1">
                        <button class="tool-btn" id="nextPage">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="tool-btn" id="goToPage">GO</button>
                    </div>
                </div>
            </div>
            <div class="page-actions">
                <button class="primary-btn" id="addPage">
                    <i class="fas fa-plus"></i> Add New Page
                </button>
                <button class="danger-btn" id="deletePage">
                    <i class="fas fa-trash"></i> Delete Page
                </button>
                <button class="tool-btn" id="reorderPagesBtn">
                    <i class="fas fa-sort"></i> Reorder Pages
                </button>
            </div>
        `;
        editorHeader.appendChild(pageNavigation);

        // Add event listeners for page navigation
        const addPageBtn = document.getElementById('addPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const deletePageBtn = document.getElementById('deletePage');
        const reorderPagesBtn = document.getElementById('reorderPagesBtn');
        const pageNumberInput = document.getElementById('pageNumberInput');
        const goToPageBtn = document.getElementById('goToPage');

        // Add event listeners for existing buttons
        if (addPageBtn) addPageBtn.addEventListener('click', () => this.showLayoutSelection());
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex - 1));
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex + 1));
        if (deletePageBtn) deletePageBtn.addEventListener('click', () => this.deleteCurrentPage());
        if (reorderPagesBtn) reorderPagesBtn.addEventListener('click', () => this.reorderPages());

        // Add event listeners for direct page navigation
        const handlePageNavigation = () => {
            if (pageNumberInput) { // Check if input exists
            const pageNum = parseInt(pageNumberInput.value, 10);
            if (pageNum && pageNum >= 1 && pageNum <= this.pages.length) {
                this.navigateToPage(pageNum - 1);
            } else {
                // Reset to current page if invalid
                pageNumberInput.value = this.currentPageIndex + 1;
                }
            }
        };

        if (goToPageBtn) goToPageBtn.addEventListener('click', handlePageNavigation);
        if (pageNumberInput) {
        pageNumberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handlePageNavigation();
            }
        });
        }

        // Define updatePageIndicator within initializeUI as it's closely tied to these elements
        this.updatePageIndicator = () => {
            const indicatorSpan = document.querySelector('.page-indicator'); 
            const input = document.getElementById('pageNumberInput');
        
            if (indicatorSpan) {
                indicatorSpan.textContent = `Page ${this.currentPageIndex + 1} of ${this.pages.length}`;
            }
            if (input) {
                input.value = this.currentPageIndex + 1;
                input.max = this.pages.length;
            }
        };

        this.updateNavigationButtons(); 
        this.updatePageIndicator(); 
        console.log("[Main] initializeUI finished, page navigation updated.");
    }

    

    showLayoutSelection() {
        // Save current page state before showing layout selection
        this.saveCurrentPageState();
        
        // Show layout selection page
        document.getElementById('editor-page').classList.remove('active');
        document.getElementById('layout-page').classList.add('active');
        this.setupLayoutSelection(); // Refresh layouts for current dimension
        
        // Reset filter to "All"
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
        
        // Make sure all layout options are visible
        document.querySelectorAll('.layout-option').forEach(option => {
            option.style.display = 'block';
        });
        
        // Update layout selection behavior for new page
        const layoutOptions = document.querySelectorAll('.layout-option');
        layoutOptions.forEach(option => {
            option.onclick = () => {
                const layoutId = option.dataset.layout;
                this.addNewPage(layoutId);
            };
        });
    }

    addNewPage(layoutId) {
        console.log(`Adding new page with layout: ${layoutId}`);
        
        // Record the current state before adding new page
        this.historyManager.recordSnapshotBeforeAction(true);
        
        // Create new page with the selected layout
        this.pages.push({
            layout: layoutId,
            panelStates: [],
            canvasBackgroundStyle: 'classic-white'
        });
        
        // Update current page index
        this.currentPageIndex = this.pages.length - 1;
        
        // Set the layout for the new page
        this.selectedLayout = layoutId;
        
        // Create panels for new layout
        // Pass the layoutId (string) directly, createComic will resolve it using getLayoutConfig
        this.createComic(layoutId); 
        
        // Update page indicator and navigation buttons
        this.updatePageIndicator();
        this.updateNavigationButtons();
        
        // Show editor page
        document.getElementById('layout-page').classList.remove('active');
        document.getElementById('editor-page').classList.add('active');
        
        // Set sidebar mode to 'panels' when a new page is created
        this.currentSidebarMode = 'panels';
        
        // Update the UI to show the panels tab as active
        const tabsContainer = document.querySelector('.sidebar-tabs');
        if (tabsContainer) {
            // Remove active class from all tabs
            tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active class to the panels tab
            const panelsTab = tabsContainer.querySelector('.tab-btn[data-tab="panels"]');
            if (panelsTab) {
                panelsTab.classList.add('active');
            }
        }

        // Update back to editor button after new page is created
        this.updateBackToEditorButton();
        
        // Update the sidebar content to show panel controls
        this.uiManager.updateRightSidebarView();

        // --- Auto-save calls ---
        if (this.autoSaveManager) {
            console.log("[ComicCreator.addNewPage] Calling performInitialSaveOnEditorEntry and startPeriodicAutoSave.");
            this.autoSaveManager.performInitialSaveOnEditorEntry();
            this.autoSaveManager.startPeriodicAutoSave();
        } else {
            console.warn("[ComicCreator.addNewPage] AutoSaveManager not available.");
        }
        // --- End Auto-save calls ---
    }

    async navigateToPage(pageIndex, saveCurrentState = true) {
        if (pageIndex < 0 || pageIndex >= this.pages.length) {
            console.error('Invalid page index:', pageIndex);
            return;
        }
        
        if (saveCurrentState) {
            this.saveCurrentPageState();
        }
        
        this.currentPageIndex = pageIndex;
        await this.loadPageState(this.currentPageIndex); // Added await
        this.updateNavigationButtons();
        this.updatePageIndicator();
        this.uiManager.updateRightSidebarView(); 
    }
    
    async loadPageState(pageIndex) { // Made async
        const page = this.pages[pageIndex];
        if (!page) {
            console.error('Invalid page:', pageIndex);
            return false;
        }

        const comicCanvas = document.querySelector('#comic-canvas');
        if (!comicCanvas) {
            console.error('Canvas element not found!');
            return false;
        }

        // Clear existing elements with logging
        const stickersBefore = comicCanvas.querySelectorAll('.canvas-sticker-image').length;
        const backgroundsBefore = comicCanvas.querySelectorAll('.canvas-background-image').length;
        const textBubblesBefore = comicCanvas.querySelectorAll('.text-bubble').length;
        const panelsBefore = comicCanvas.querySelectorAll('.comic-panel').length;
        
        console.log(`Before clearing canvas - Stickers: ${stickersBefore}, Backgrounds: ${backgroundsBefore}, Text bubbles: ${textBubblesBefore}, Panels: ${panelsBefore}`);
        
        // Completely clear the canvas to avoid any element inheritance
        comicCanvas.innerHTML = '';
        console.log('Canvas cleared completely - All elements removed');
        console.log(`After clearing canvas - Elements remaining: ${comicCanvas.children.length}`);

        // Set the current layout and create the comic structure
        this.selectedLayout = page.layout;
        
        // Get layout configuration
        let layoutConfig;
        if (typeof page.layout === 'string') {
            // Use the improved getLayoutConfig to find the layout in any collection
            layoutConfig = this.getLayoutConfig(page.layout);
            
            // If layout not found by getLayoutConfig, it will handle logging and fallback.
            // The original custom layout loading logic might still be useful if getLayoutConfig somehow fails for custom ones.
            if (!layoutConfig && page.layout.startsWith('custom-')) {
                console.warn(`Custom layout not found by getLayoutConfig: ${page.layout}. Attempting to load from localStorage as a fallback.`);
                this.loadCustomLayouts(); // Ensure custom layouts from localStorage are loaded
                layoutConfig = this.getLayoutConfig(page.layout); // Try again after loading
            }
        } else if (typeof page.layout === 'object') {
            // If page.layout is an object, assume it's a full config (e.g., 'empty' can be an object)
            layoutConfig = page.layout;
            // Attempt to normalize to an ID if possible, for consistency in page.layout storage
            try {
                const layoutId = Object.entries(this.layouts)
                    .concat(Object.entries(this.amazonKDPLayouts))
                    .concat(Object.entries(this.landscapeLayouts))
                    .find(([id, layoutObj]) => JSON.stringify(layoutObj) === JSON.stringify(page.layout))?.[0];
                if (layoutId) {
                    page.layout = layoutId; // Update page.layout to be the ID string
                    console.log(`Updated page layout to use ID: ${layoutId}`);
                }
            } catch (e) {
                console.error("Error trying to find layout ID for object-based layout:", e);
            }
        }
        
        if (!layoutConfig) {
            // This block should ideally not be reached if getLayoutConfig's fallback works.
            // If it is reached, it means getLayoutConfig returned null, which implies even its fallback failed.
            console.error(`CRITICAL: Failed to find or fallback for layout configuration for page ${pageIndex}. Layout was:`, page.layout);
            this.uiManager.showNotification(
                `Layout for page ${pageIndex + 1} ("${page.layout || 'Unknown'}") is missing or corrupt.`, 
                "error"
            );
            // As a last resort, create a truly empty canvas structure
            layoutConfig = { name: "Critical Error - Empty Fallback", panels: [] }; 
            page.layout = 'empty'; // Force page.layout to 'empty' string for this severe case
        }

        // Create comic structure first (calls PanelManager.createPanels)
        console.log(`[loadPageState] About to call createComic with layoutConfig for page ${pageIndex}:`, layoutConfig ? layoutConfig.name : 'undefined layoutConfig');
        this.createComic(layoutConfig, false); // Pass false to prevent premature auto-save
        
        // Log panels created by createComic
        const panelsAfterCreation = comicCanvas.querySelectorAll('.comic-panel').length;
        console.log(`[loadPageState] After createComic for page ${pageIndex} - Panels found in DOM: ${panelsAfterCreation}`);
        if(panelsAfterCreation === 0 && layoutConfig && layoutConfig.panels && layoutConfig.panels.length > 0){
            console.error(`[loadPageState] CRITICAL: createComic was called for a layout with ${layoutConfig.panels.length} panels, but 0 .comic-panel elements were found in the DOM immediately after.`);
        }

        // Set canvas background style using BackgroundManager
        this.backgroundManager.loadCurrentPageBackground();

        // Store the states we need to restore
        const panelStates = page.panelStates || [];
        const stickerStates = page.stickerStates || [];
        
        // Restore background image if present
        if (page.backgroundState && page.backgroundState.imageId) {
            // *** CRITICAL PART for Background Image ***
            const bgImage = this.imageLibrary.getImageById(String(page.backgroundState.imageId)); // Lookup by ID
            console.log(`[loadPageState] Attempting to load background. Found image data:`, bgImage); // Log lookup result
            if (bgImage && bgImage.src) { // Check if found and has src
                const bgImg = document.createElement('img');
                console.log(`[loadPageState] Setting background img.src to: ${bgImage.src.substring(0, 100)}...`); // Log the src being set
                bgImg.src = bgImage.src; // <-- USE THE SRC FROM ImageLibrary
                bgImg.alt = "Canvas Background";
                bgImg.className = 'canvas-background-image';
                bgImg.style.position = 'absolute';
                bgImg.style.top = '0';
                bgImg.style.left = '0';
                bgImg.style.width = '100%';
                bgImg.style.height = '100%';
                bgImg.style.objectFit = 'cover';
                bgImg.style.zIndex = '0';
                bgImg.dataset.imageId = bgImage.id;
                comicCanvas.insertBefore(bgImg, comicCanvas.firstChild);
            } else {
                console.warn(`Background image ID ${page.backgroundState.imageId} not found in uploaded images.`);
            }
        }

        // Restore panel states
        const panels = document.querySelectorAll('.comic-panel'); // Re-query for panels
        console.log(`[loadPageState] Page ${pageIndex} - Panel states to load:`, JSON.stringify(panelStates));
        console.log(`[loadPageState] Page ${pageIndex} - Panels found in DOM before panelManager.loadPanelStates: ${panels.length}`);
        
        // Call PanelManager to handle image/transform loading and WAIT for it to complete
        await this.panelManager.loadPanelStates(panelStates);
        console.log(`[loadPageState] Page ${pageIndex} - PanelManager.loadPanelStates COMPLETED.`);

        // --- Restore Text Elements (via TextManager) ---
        console.log(`[loadPageState] Page ${pageIndex} - canvasTextElements to load:`, JSON.stringify(page.canvasTextElements));
        console.log(`[loadPageState] Page ${pageIndex} - Full page object for textManager:`, JSON.stringify(page));
        this.textManager.loadTextStates(page); // Pass the whole page state
        console.log(`Main.loadPageState: Text restoration completed. Canvas now has ${comicCanvas.querySelectorAll(':scope > .text-bubble').length} direct text bubbles.`);
        // --- End Text Restoration --- 

        // --- Restore Sticker Elements (via StickerManager) ---
        this.stickerManager.loadStickerStates(page);
        // --- End Sticker Restoration ---

        // --- Auto-save calls after successfully loading page state to editor ---
        if (this.autoSaveManager) {
            console.log("[ComicCreator.loadPageState] Calling performInitialSaveOnEditorEntry and startPeriodicAutoSave.");
            // It might be good to perform an initial save of the just-loaded state.
            // This ensures the auto-save is up-to-date with what the user is now seeing.
            this.autoSaveManager.performInitialSaveOnEditorEntry(); 
            this.autoSaveManager.startPeriodicAutoSave();
        } else {
            console.warn("[ComicCreator.loadPageState] AutoSaveManager not available.");
        }
        // --- End Auto-save calls ---

        return true;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPageIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPageIndex === this.pages.length - 1;
        }
    }

    updatePageIndicator() {
        const indicator = document.querySelector('.page-indicator');
        if (indicator) {
            indicator.textContent = `Page ${this.currentPageIndex + 1} of ${this.pages.length}`;
        }
    }

    // Update the upload area to be always available
    initializeUploadArea() {
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            uploadArea.style.display = 'block';
            // ... existing upload area code ...
        }
    }

   

    deleteCurrentPage() {
        console.log('Delete page clicked. Current page index:', this.currentPageIndex);
        console.log('Total pages before deletion:', this.pages.length);

        // Don't delete if there's only one page
        if (this.pages.length <= 1) {
            // Use the custom confirmation modal
            this.uiManager.showConfirmationModal(
                'Delete Page Error', // Title of the modal
                'Cannot delete the last page. Add a new page first.', // Message
                ['OK'] // Button label
            );
            return;
        }

        // Store the current page index before deletion
        const currentIndex = this.currentPageIndex;
        
        // Remove the current page from the pages array
        this.pages.splice(currentIndex, 1);
        console.log('Page deleted. Remaining pages:', this.pages.length);

        // After deleting the current page, we want to show the next page
        // If we deleted the last page, go to the new last page
        // Otherwise, stay at the same index which will show the next page
        let newPageIndex;
        if (currentIndex >= this.pages.length) {
            // If we deleted the last page, go to the new last page
            newPageIndex = this.pages.length - 1;
            console.log('Deleted last page, navigating to new last page:', newPageIndex);
        } else {
            // If we deleted any page (including first), stay at the same index
            // This will automatically show the next page
            newPageIndex = currentIndex;
            console.log('Deleted current page, navigating to next page:', newPageIndex);
        }

        // Instead of directly loading the page state here, use the navigateToPage method
        // This ensures consistent state management
        this.currentPageIndex = newPageIndex; // Set index first to avoid confusion
        this.loadPageState(newPageIndex);
        
        // Update navigation UI
        this.updatePageIndicator();
        this.updateNavigationButtons();
        
        // Update back to editor button after page deletion
        this.updateBackToEditorButton();
    }


    reorderImages(fromId, toId) {
        const fromIndex = this.imageLibrary.getImages().findIndex(img => String(img.id) === fromId);
        const toIndex = this.imageLibrary.getImages().findIndex(img => String(img.id) === toId);
        
        if (fromIndex !== -1 && toIndex !== -1) {
            // Reorder the array
            const [movedImage] = this.imageLibrary.getImages().splice(fromIndex, 1);
            this.imageLibrary.getImages().splice(toIndex, 0, movedImage);
            
            // Update the display
            this.updateImageLibrary();
        }
    }





    async saveProject() { // Make async
        if (this.isSavingProject) {
            console.log("[saveProject] Already in progress. Ignoring additional call.");
            return;
        }
        this.isSavingProject = true;
        console.log("[saveProject] Entered method. Timestamp:", Date.now());

        try {
        // Prompt for filename
            const filename = await this.promptForFilename("comic-project", ".json"); 
        if (!filename) {
            console.log("Save project cancelled by user.");
                this.uiManager.showNotification('Save cancelled: No filename provided.', 'info');
                // this.isSavingProject = false; // Moved to finally
            return; // Exit if user cancelled
        }
            // const filename = filenameResult.filename; // No longer needed, filename is already the string

        // Force save current page state before exporting (including any new text elements)
        console.log("Saving final page state before exporting project");
        this.saveCurrentPageState();
        
            // Use getCurrentProjectState to get all data including dimensions and processed images
            const projectState = await this.getCurrentProjectState();

            if (!projectState) {
                this.uiManager.showNotification('Could not retrieve project state for saving.', 'error');
                console.error("Failed to get project state in saveProject.");
                // this.isSavingProject = false; // Moved to finally
            return;
        }
        
        // Create and trigger download
        const blob = new Blob([JSON.stringify(projectState, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename; // Use the user-provided filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // --- Clear auto-save data after successful manual save ---
        await this.autoSaveManager.clearAutoSave();
        console.log("Manual save successful, cleared auto-save data.");
         this.uiManager.showNotification("Project saved successfully!", "success");
        } catch (error) {
            console.error("[saveProject] Error during save:", error);
            this.uiManager.showNotification("Error saving project.", "error");
        } finally {
            this.isSavingProject = false; // Reset flag in all cases
        }
    }

    // Helper method to get only images that are actually used in the comic
    getUsedImageIds() {
        const usedIds = new Set();
        
        this.pages.forEach(page => {
            // Panel images
            if (page.panelStates) {
                page.panelStates.forEach(panel => {
                    if (panel.imageId) {
                        usedIds.add(panel.imageId);
                    }
                });
            }
            
            // Background images
            if (page.backgroundState && page.backgroundState.imageId) {
                usedIds.add(page.backgroundState.imageId);
            }
            
            // Sticker images
            if (page.stickerStates) {
                page.stickerStates.forEach(sticker => {
                    if (sticker.imageId) {
                        usedIds.add(sticker.imageId);
                    }
                });
            }
        });
        
        console.log(`[getUsedImageIds] Found ${usedIds.size} used images out of ${this.imageLibrary.getImages().length} total library images`);
        return usedIds;
    }

    async getCurrentProjectState() {
        console.log("[getCurrentProjectState] Getting current project state for export...");
        // Force save current page state before exporting (including any new text elements)
        this.saveCurrentPageState();

        // Make sure all text elements are recorded
        const canvasTextElements = document.querySelectorAll('#comic-canvas > .text-bubble');
        console.log(`[getCurrentProjectState] Found ${canvasTextElements.length} canvas text elements - ensuring they're saved.`);
        
        const currentPage = this.pages[this.currentPageIndex];
        if (currentPage && currentPage.canvasTextElements && canvasTextElements.length > 0 && canvasTextElements.length !== currentPage.canvasTextElements.length) {
            console.warn(`[getCurrentProjectState] Mismatch in canvas text elements. Forcing state refresh.`);
            this.saveCurrentPageState();
        }
        
        const customLayoutIds = new Set();
        this.pages.forEach(page => {
            const layoutId = page.layout;
            if (layoutId && typeof layoutId === 'string' && layoutId.startsWith('custom-')) {
                customLayoutIds.add(layoutId);
            }
        });
        
        const customLayouts = {};
        customLayoutIds.forEach(layoutId => {
            if (this.layouts[layoutId]) {
                customLayouts[layoutId] = this.layouts[layoutId];
            }
        });
        
        // --- OPTIMIZATION: Only include images that are actually used in the comic ---
        const usedImageIds = this.getUsedImageIds();
        const imagesToProcess = this.imageLibrary.getImages().filter(img => usedImageIds.has(img.id));
        
        console.log(`[getCurrentProjectState] Filtering images: ${imagesToProcess.length} used out of ${this.imageLibrary.getImages().length} total`);
        
        // --- Convert used blob: images to data URLs for export ---
        const imageProcessingPromises = imagesToProcess.map(async (img) => {
            if (img.isObjectURL && img.src && img.src.startsWith('blob:')) {
                try {
                    const response = await fetch(img.src);
                    if (!response.ok) throw new Error(`Failed to fetch blob URL for ${img.name}`);
                    const blob = await response.blob();
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    return { id: img.id, name: img.name, width: img.width, height: img.height, src: dataUrl };
                } catch (error) {
                    console.error(`[getCurrentProjectState] Failed to convert Object URL to Data URL for image: ${img.name}`, error);
                    return { id: img.id, name: img.name, width: img.width, height: img.height, src: null, saveError: true };
                }
            }
            return { id: img.id, name: img.name, width: img.width, height: img.height, src: img.src };
        });

        const imagesToSave = await Promise.all(imageProcessingPromises);

        const projectState = {
            version: '1.4-dimensions', // New version marker for dimension awareness
            canvasDimensionKey: this.selectedCanvasDimension, // Save the key e.g., "current", "amazonKDP"
            canvasWidth: this.canvasDimensions[this.selectedCanvasDimension]?.width || 700, // Save actual width
            canvasHeight: this.canvasDimensions[this.selectedCanvasDimension]?.height || 700, // Save actual height
            useGlobalBackgroundStyle: this.useGlobalBackgroundStyle,
            globalBackgroundStyle: this.globalBackgroundStyle,
            pages: this.pages.map(page => ({
                ...page,
                panelStates: page.panelStates.map(panel => ({ ...panel, imageId: panel.imageId || null }))
            })),
            images: imagesToSave,
            currentPageIndex: this.currentPageIndex,
            folderStructure: this.folderStructure,
            currentFolderId: this.currentFolderId,
            customLayouts: customLayouts
        };
        console.log("[getCurrentProjectState] Project state prepared:", projectState);
        return projectState;
    }

    async loadProject(file) { // Make async
         // --- Clear any existing auto-save data before loading a manual project ---
         await this.autoSaveManager.clearAutoSave();
         console.log("Loading manual project, cleared any existing auto-save data.");
         // Stop the timer while loading a new project
         this.autoSaveManager.stopAutoSaveTimer();

        try {
            // Load custom layouts first to ensure they're available when restoring pages
            this.loadCustomLayouts();
            
            const text = await file.text();
            const projectState = JSON.parse(text);
            
            // Version check
            if (!projectState.version) {
                throw new Error('Invalid project file format');
            }
            
            // --- Load and Set Canvas Dimension from Project State (MUST be done early) ---
            if (projectState.canvasDimensionKey && this.canvasDimensions[projectState.canvasDimensionKey]) {
                this.setCanvasDimension(projectState.canvasDimensionKey);
                console.log(`[loadProject] Canvas dimension set from project file to: ${projectState.canvasDimensionKey}`);
            } else if (projectState.canvasWidth && projectState.canvasHeight) {
                // Fallback if key is missing but width/height are present (e.g. older interim save)
                // This requires finding a matching key or creating a temporary custom one.
                // For simplicity, we'll try to match an existing key first.
                let foundKey = null;
                for (const key in this.canvasDimensions) {
                    if (this.canvasDimensions[key].width === projectState.canvasWidth && this.canvasDimensions[key].height === projectState.canvasHeight) {
                        foundKey = key;
                        break;
                    }
                }
                if (foundKey) {
                    this.setCanvasDimension(foundKey);
                    console.log(`[loadProject] Canvas dimension (W/H) matched to existing key: ${foundKey}`);
                } else {
                    // If no matching key, create a temporary custom entry for these dimensions if needed
                    // or default. For now, log a warning and potentially default.
                    console.warn(`[loadProject] Saved canvas dimensions (${projectState.canvasWidth}x${projectState.canvasHeight}) do not match a predefined key. Using current default.`);
                    // this.setCanvasDimension(this.selectedCanvasDimension); // Or a fixed default like 'current'
                }
            } else {
                console.warn('[loadProject] No canvas dimension information found in project file. Using current default.');
                // this.setCanvasDimension(this.selectedCanvasDimension); // Use current app default if not in project
            }
            // --- End Canvas Dimension Loading ---
            
            // Load custom layouts from the project file if they exist (v1.2+)
            if (projectState.customLayouts) {
                console.log('Found custom layouts in project file. Importing...');
                
                // Import each custom layout
                Object.entries(projectState.customLayouts).forEach(([layoutId, layout]) => {
                    // Add layout to this.layouts
                    this.layouts[layoutId] = layout;
                    
                    // Extract the name from the layout
                    const layoutName = layout.name;
                    
                    // Save to localStorage as well
                    this.layoutBuilderManager.saveLayoutToStorage(layoutName, layout);
                    
                    console.log(`Imported custom layout: ${layoutName} (${layoutId})`);
                });
                
                // Refresh the layout selection UI
                this.setupLayoutSelection();
            } else {
                console.log('No custom layouts found in project file.');
            }
            
            // Save the previous uploadedImages and folderStructure for potential recovery
            const previousImages = [...this.imageLibrary.getImages()];
            const previousFolderStructure = JSON.parse(JSON.stringify(this.folderStructure));
            
            // Clear current state
            this.imageLibrary.clearImages();
            this.pages = [];
            this.currentPageIndex = 0;
            
            // Reset folder structure to default
            this.folderStructure = {
                root: {
                    type: 'folder',
                    name: 'root',
                    items: [],
                    parent: null
                }
            };
            this.currentFolderId = 'root';
            
            // Ensure the comic canvas is completely cleared
            const canvasElement = document.querySelector('#comic-canvas');
            if (canvasElement) {
                console.log('Clearing comic canvas before loading new project');
                canvasElement.innerHTML = '';
            }
            
            // Load global background settings if present
            if (projectState.hasOwnProperty('useGlobalBackgroundStyle')) {
                this.useGlobalBackgroundStyle = projectState.useGlobalBackgroundStyle;
                this.backgroundManager.useGlobalBackgroundStyle = projectState.useGlobalBackgroundStyle; // Update manager too
            }
            
            if (projectState.hasOwnProperty('globalBackgroundStyle')) {
                this.globalBackgroundStyle = projectState.globalBackgroundStyle;
                this.backgroundManager.globalBackgroundStyle = projectState.globalBackgroundStyle; // Update manager too
            }
            
            // Load images first
            // --- MODIFIED: Convert Data URLs to Object URLs during load ---
            const imageProcessingPromises = projectState.images.map(async (img) => {
                // If the src is already an object URL or not a data URL, skip conversion
                if (!img.src || !img.src.startsWith('data:')) {
                    // If src is missing or not a Data URL, check if it might be a leftover Object URL
                    // (though ideally projects shouldn't save these). Treat as error or skip.
                    if (img.src && img.src.startsWith('blob:')) {
                        console.warn(`Image ${img.name} has a blob URL in save file. Attempting to use as is, but it might be invalid.`);
                        return { ...img, isObjectURL: true }; // Assume it *might* be valid, needs revoke
                    }
                    // If src is missing or invalid, return data but log error
                    console.error(`Invalid or missing image source for ${img.name} (${img.id}) in project file.`);
                    return { ...img, src: null, loadError: true }; 
                }

                try {
                    // Fetch the Data URL to get a Blob
                    const response = await fetch(img.src);
                    if (!response.ok) {
                         throw new Error(`Failed to fetch data URL for ${img.name} (status: ${response.status})`);
                    }
                    const blob = await response.blob();
                    
                    // Create an Object URL from the Blob
                    const objectURL = URL.createObjectURL(blob);
                    
                    console.log(`Converted Data URL to Object URL for: ${img.name}`);
                    
                    // Return the updated image data object
                    return {
                        id: img.id,
                        name: img.name,
                        src: objectURL, // Use the efficient Object URL
                        width: img.width, // Keep width/height from save file
                        height: img.height,
                        isObjectURL: true // Mark for later revocation
                    };
                } catch (error) {
                    console.error(`Failed to convert Data URL to Object URL for image: ${img.name} (${img.id})`, error);
                    // Return data with original src (or null) and error flag
                    return {
                        id: img.id,
                        name: img.name,
                        src: img.src, // Keep original data URL on error? Or null?
                        width: img.width,
                        height: img.height,
                        loadError: true, 
                        conversionError: true // Specific flag for conversion error
                    };
                }
            });

            const loadedImages = await Promise.all(imageProcessingPromises);
            // Filter out any potential nulls if errors occurred during promise phase itself (unlikely here)
            const validLoadedImages = loadedImages.filter(img => img !== null);
            
            this.imageLibrary.addImages(validLoadedImages);
            // --- END MODIFICATION ---
            
            // Log the loaded images data (src will now be Object URLs)
            console.log('Images loaded into this.imageLibrary:', this.imageLibrary.getImages().map(img => ({
                id: img.id, 
                name: img.name, 
                srcStart: img.src.substring(0, 60)
            })));
            
            // Handle folder structure based on project version
            if (projectState.folderStructure) {
                // New format with folder structure
                console.log('Loading project with folder structure (v1.1+)');
                this.folderStructure = projectState.folderStructure;
                if (projectState.currentFolderId) {
                    this.currentFolderId = projectState.currentFolderId;
                } else {
                    this.currentFolderId = 'root'; // Default to root if not specified
                }
                console.log('Folder structure loaded:', {
                    folderCount: Object.keys(this.folderStructure).length,
                    rootItemCount: this.folderStructure.root.items.length,
                    currentFolder: this.currentFolderId
                });
                console.log('Final folder structure before UI update:', JSON.stringify(this.folderStructure, null, 2));
            } else {
                // Old format without folder structure, place all images in root folder
                console.log('Loading older project format without folder structure (v1.0)');
                // Add all image IDs to root folder
                this.imageLibrary.getImages().forEach(image => {
                    // Avoid duplicate entries
                    if (!this.folderStructure.root.items.includes(image.id)) {
                        this.folderStructure.root.items.push(image.id.toString());
                    }
                });
                console.log('Created root folder with all images:', {
                    imageCount: this.imageLibrary.getImages().length,
                    rootItemCount: this.folderStructure.root.items.length
                });
                console.log('Final folder structure before UI update:', JSON.stringify(this.folderStructure, null, 2));
            }
            
            // Verify folder structure integrity
            let integrityError = false;
            if (!this.folderStructure.root) {
                console.error('CRITICAL ERROR: Root folder missing in folder structure after load');
                integrityError = true;
            } else if (!Array.isArray(this.folderStructure.root.items)) {
                console.error('CRITICAL ERROR: Root folder items is not an array after load');
                integrityError = true;
            }
            
            // If there's a critical integrity error, recover previous state
            if (integrityError) {
                console.warn('Recovering previous folder structure and images due to integrity error');
                this.imageLibrary.addImages(previousImages);
                this.folderStructure = previousFolderStructure;
                throw new Error('Failed to load project due to folder structure integrity error');
            }
            
            // Load pages
            this.pages = projectState.pages;
            this.currentPageIndex = projectState.currentPageIndex;
            
            // Ensure the currentFolderId actually exists in the structure
            if (!this.folderStructure[this.currentFolderId]) {
                console.warn(`Current folder ID ${this.currentFolderId} not found in structure, resetting to root`);
                this.currentFolderId = 'root';
            }
            
            // Update UI - after both images and folder structure are fully loaded
            this.imageLibrary.updateThumbnails(); // Corrected call
            
            // Ensure we clear the canvas completely before loading the new project state
            if (canvasElement) {
                console.log('Clearing all elements from canvas before loading project...');
                // Remove all text bubbles, stickers, and backgrounds
                canvasElement.querySelectorAll('.text-bubble').forEach(textBubble => textBubble.remove());
                canvasElement.querySelectorAll('.canvas-sticker-image').forEach(sticker => sticker.remove());
                canvasElement.querySelectorAll('.canvas-background-image').forEach(bg => bg.remove());
            }
            
            // Load the current page
            await this.loadPageState(this.currentPageIndex);
            
            // Update navigation
            this.updatePageIndicator();
            this.updateNavigationButtons();

            console.log('Project loaded successfully');
            this.uiManager.showNotification("Project loaded successfully!", "success");

            // Initialize history with the loaded project state
            this.historyManager.initializeWithLoadedState();
            console.log("[ComicCreator.loadProject] History initialized with loaded state.");

            // --- Auto-save calls after project load to editor ---
            if (this.autoSaveManager) {
                console.log("[ComicCreator.loadProject] Calling performInitialSaveOnEditorEntry and startPeriodicAutoSave.");
                await this.autoSaveManager.performInitialSaveOnEditorEntry();
                this.autoSaveManager.startPeriodicAutoSave();
            } else {
                console.warn("[ComicCreator.loadProject] AutoSaveManager not available.");
            }
            // --- End Auto-save calls ---
            
            // Update back to editor button after project is fully loaded
            this.updateBackToEditorButton();

        } catch (error) {
            console.error('Error loading project:', error);
            // Use UIManager to show notification
            this.uiManager.showNotification('Error loading project file. Please make sure it is a valid comic project file.', 'error'); 
            // alert('Error loading project file. Please make sure it is a valid comic project file.'); // Keep alert as backup?
            // Ensure timer is stopped/restarted appropriately on error?
            this.autoSaveManager.stopAutoSaveTimer(); // Stop timer on load error
        }
    }

    setupProjectControls() {
        // Save Project button
        // const saveProjectBtn = document.getElementById('save-project-btn');
        // if (saveProjectBtn) {
        //     saveProjectBtn.addEventListener('click', () => this.saveProject());
        // }
        
        // Load Project button is already handled in setupEventListeners() method
        // to avoid duplicate event listeners that cause the file dialog to open twice
    }

    // New method to handle custom filename prompt
    promptForFilename(defaultName = "My Comic", extension = ".pdf") { // Add parameters with defaults
        return new Promise((resolve) => {
            const overlay = document.getElementById('filename-modal-overlay');
            const modal = document.getElementById('filename-modal');
            const input = document.getElementById('comic-filename-input');
            const confirmBtn = document.getElementById('confirm-filename-btn');
            const cancelBtn = document.getElementById('cancel-filename-btn');

            // Show the modal
            input.value = defaultName; // Use the provided default name
            overlay.style.display = 'block';
            modal.style.display = 'block';
            // Trigger transitions by adding active class after a short delay
            setTimeout(() => {
                modal.classList.add('active');
                overlay.classList.add('active');
                input.focus(); // Focus the input field
                input.select(); // Select the default text
            }, 10);

            const closeModal = (result) => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
                // Wait for transition before hiding
                setTimeout(() => {
                    modal.style.display = 'none';
                    overlay.style.display = 'none';
                    // Remove event listeners to prevent memory leaks
                    confirmBtn.removeEventListener('click', handleConfirm);
                    cancelBtn.removeEventListener('click', handleCancel);
                    input.removeEventListener('keydown', handleKeydown);
                    resolve(result);
                }, 300);
            };

            const handleConfirm = () => {
                let filename = input.value.trim();
                if (!filename) {
                    filename = defaultName; // Use default if empty
                }
                if (!filename.toLowerCase().endsWith(extension)) { // Use the provided extension
                    filename += extension;
                }
                // Basic sanitization
                filename = filename.replace(/[/\\?%*:|"<>]/g, '-');
                closeModal(filename);
            };

            const handleCancel = () => {
                closeModal(null);
            };

            const handleKeydown = (event) => {
                if (event.key === 'Enter') {
                    handleConfirm();
                } else if (event.key === 'Escape') {
                    handleCancel();
                }
            };

            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            input.addEventListener('keydown', handleKeydown);
        });
    }

    // --- New Reorder Pages Functionality ---
    reorderPages() {
        const overlay = document.getElementById('reorder-modal-overlay');
        const modal = document.getElementById('reorder-modal');
        const list = document.getElementById('reorder-page-list');
        const confirmBtn = document.getElementById('confirm-reorder-btn');
        const cancelBtn = document.getElementById('cancel-reorder-btn');

        // --- Populate the list ---
        list.innerHTML = ''; // Clear previous list items
        this.pages.forEach((page, index) => {
            const listItem = document.createElement('li');
            listItem.draggable = true;
            listItem.dataset.originalIndex = index; // Store original index
            listItem.innerHTML = `
                <i class="fas fa-grip-vertical"></i>
                <span>Page ${index + 1}</span>
            `;
            list.appendChild(listItem);
        });

        // --- Drag and Drop Logic ---
        let draggedItem = null;

        // Define named event handlers for the list
        const handleDragStart = (e) => {
            draggedItem = e.target.closest('li'); // Ensure we get the li
            if (draggedItem) {
                setTimeout(() => draggedItem.classList.add('dragging'), 0);
            }
        };

        const handleDragEnd = (e) => {
                if (draggedItem) {
                    draggedItem.classList.remove('dragging');
                }
                draggedItem = null;
                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('li');
            if (targetItem && draggedItem && targetItem !== draggedItem) {
                const listItems = Array.from(list.children);
                const targetIndex = listItems.indexOf(targetItem);
                const draggedIndex = listItems.indexOf(draggedItem);

                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                targetItem.classList.add('drag-over');

                if (targetIndex > draggedIndex) {
                    list.insertBefore(draggedItem, targetItem.nextSibling);
                } else {
                    list.insertBefore(draggedItem, targetItem);
                }
            }
        };
        
        const handleDragLeave = (e) => {
            const targetItem = e.target.closest('li');
            if (targetItem) {
                 targetItem.classList.remove('drag-over');
            }
        };

        // Add list event listeners using the named handlers
        list.addEventListener('dragstart', handleDragStart);
        list.addEventListener('dragend', handleDragEnd);
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);

        // --- Modal Control Logic ---
        const closeModal = (confirm = false) => {
            modal.classList.remove('active');
            overlay.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
                
                // Remove event listeners using the same named handlers
                confirmBtn.removeEventListener('click', handleConfirmClick);
                cancelBtn.removeEventListener('click', handleCancelClick);
                list.removeEventListener('dragstart', handleDragStart);
                list.removeEventListener('dragend', handleDragEnd);
                list.removeEventListener('dragover', handleDragOver);
                list.removeEventListener('dragleave', handleDragLeave);
            }, 300); 

            if (confirm) {
                this.applyPageReorder(list);
            }
        };

        // Define named handlers for confirm/cancel buttons
        const handleConfirmClick = () => closeModal(true);
        const handleCancelClick = () => closeModal(false);

        confirmBtn.addEventListener('click', handleConfirmClick);
        cancelBtn.addEventListener('click', handleCancelClick);

        // Show the modal
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('active');
            overlay.classList.add('active');
        }, 10);
    }

    applyPageReorder(listElement) {
        console.log('Applying page reorder...');
        const pageContentBeforeReorder = this.pages[this.currentPageIndex]; // Identify the content we are currently viewing
        const newOrderIndices = Array.from(listElement.children).map(li => parseInt(li.dataset.originalIndex));

        // Create the new pages array based on the new order
        const reorderedPages = newOrderIndices.map(originalIndex => this.pages[originalIndex]);

        // Update the main pages array
        this.pages = reorderedPages;

        // Find the new index of the page content we were viewing
        // We compare the actual page objects
        const newPageIndex = this.pages.findIndex(page => page === pageContentBeforeReorder);

        if (newPageIndex !== -1) {
            this.currentPageIndex = newPageIndex;
            console.log(`Current page index updated to ${newPageIndex} after reorder.`);
        } else {
            console.warn('Could not find the current page content after reorder. Staying at index 0.');
            this.currentPageIndex = 0; // Fallback
        }

        // Update the UI
        this.updatePageIndicator();
        this.updateNavigationButtons();

        // Optionally, reload the current page visually if needed, though updating index should be sufficient
        // this.loadPageState(this.currentPageIndex);
        console.log('Page reorder complete.');
    }

    /**
     * Prompts the user to confirm starting a new project and handles saving if requested.
     */
    async promptForNewProject() {
        // Save current page state before showing prompt
        this.saveCurrentPageState();
        
        // Show confirmation modal
        const choice = await this.uiManager.showConfirmationModal(
            "Create New Project?", 
            "Do you want to save your current project first?", 
            ["Save & New", "New (Discard)", "Cancel"]
        );
        
        // Handle user's choice
        switch (choice) {
            case "Save & New":
                await this.saveProject();
                this.resetProject();
                break;
                
            case "New (Discard)":
                await this.autoSaveManager.clearAutoSave(); // Clear auto-save when discarding
                this.resetProject();
                break;
                
            case "Cancel":
            case null:
                // User cancelled, do nothing
                break;
        }
    }
    
    /**
     * Resets the application state to a blank project.
     * @param {boolean} [navigateToLayout=true] - Whether to navigate to the layout selection page.
     */
    async resetProject(navigateToLayout = true) { // Make async
        // Stop the auto-save timer during reset
        if (this.autoSaveManager) {
            console.log("[ComicCreator.resetProject] Stopping periodic auto-save and clearing data.");
            this.autoSaveManager.stopPeriodicAutoSave();
            await this.autoSaveManager.clearAutoSave(true); // Clear flag and data
        } else {
            console.warn("[ComicCreator.resetProject] AutoSaveManager not available for stopping/clearing.");
        }

        // Reset pages
        this.pages = [{
            layout: 'empty', // Set a default layout ID, e.g., 'empty' or 'single'
            panelStates: [], // Will store image positions and transforms for each panel
            canvasBackgroundStyle: 'classic-white' // Ensure default exists
        }];
        
        // Reset page state
        this.currentPageIndex = 0;
        this.selectedLayout = null;
        
        // Clear canvas
        document.getElementById('comic-canvas').innerHTML = '';
        
        // Reset any other necessary state variables
        this.imageLibrary.clearSelection();
        this.imageLibrary.clearImages(); // Clear images as well for a truly new project
        
        // Reset folder structure
        this.folderStructure = {
            root: { type: 'folder', name: 'root', items: [], parent: null }
        };
        this.currentFolderId = 'root';
        this.imageLibrary.updateThumbnails(); // Update library UI
        
        // Reset background style
        this.backgroundManager.applyBackgroundStyle('classic-white'); // Apply default style
        
        // Update navigation UI
        this.updatePageIndicator();
        this.updateNavigationButtons();

        if (navigateToLayout) {
            // Ensure we navigate to layout page regardless of current page
            // Hide all pages first
            document.querySelector('#upload-page').classList.remove('active');
            document.querySelector('#editor-page').classList.remove('active');

            // Then show only the layout page
            document.querySelector('#layout-page').classList.add('active');

            // Reset filter to "All"
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');

            // Make sure all layout options are visible
            document.querySelectorAll('.layout-option').forEach(option => {
                option.style.display = 'block';
            });

            // Update layout selection behavior for new page
            const layoutOptions = document.querySelectorAll('.layout-option');
            layoutOptions.forEach(option => {
                option.onclick = () => {
                    const layoutId = option.dataset.layout;
                    this.addNewPage(layoutId);
                };
            });
        }

        // Show notification only if navigating
        if (navigateToLayout) {
            this.uiManager.showNotification("New project created", "success");
        }

        // Restart the auto-save timer for the new blank project by re-initializing the manager
        // this.autoSaveManager.saveIntervalId = setInterval(this.autoSaveManager.performAutoSave, AUTOSAVE_INTERVAL); // Removed: Incorrect approach
        // window.addEventListener('beforeunload', this.autoSaveManager.handleBeforeUnload); // Removed: Handled by init
        // await this.autoSaveManager.init(); // Re-initialize the manager to restart timer/listeners. This will be handled by navigation if it goes to editor.

        // If navigating to layout, no timer should be started yet.
        // If for some reason resetProject was called and we remain on editor (not typical), then timer would need restart.
        // For now, assume resetProject leads away from editor or to a state where editor entry will handle timer.

        // Update back to editor button after project reset
        this.updateBackToEditorButton();
    }

    // --- Update Sticker Controls ---
    updateStickerControls(stickerElement) {
        // Delegate to the StickerManager to handle sticker controls
        this.stickerManager.updateStickerControls();
    }

    // --- Deselect All Elements --- 
    deselectAll() {
        console.log("ComicCreator: deselectAll called");
        if (this.panelManager) {
            this.panelManager.selectPanel(null); // Deselect current panel
        }
        if (this.textManager) {
            this.textManager.deselectTextBox(); // Deselect current text box
        }
        if (this.stickerManager) {
            this.stickerManager.deselectCurrentSticker(); // Deselect current sticker
        }
        // Add other managers as needed
        // Update the right sidebar (e.g., to show a default view or be empty)
        this.uiManager.updateRightSidebarView(); // This should clear or reset the properties panel
    }

    /**
     * Deselects any currently active panels or text boxes.
     * This is typically called before selecting a sticker to ensure only one element type is active.
     */
    deselectPanelsAndText() {
        console.log("ComicCreator: deselectPanelsAndText called");
        if (this.panelManager && this.panelManager.currentPanel) {
            this.panelManager.selectPanel(null); // Deselect current panel
        }
        if (this.textManager && this.textManager.currentTextBox) {
            this.textManager.deselectTextBox(); // Deselect current text box
        }
        // We don't deselect stickers here.
        // We also don't call uiManager.updateRightSidebarView() as the sticker selection will handle it.
    }

    loadPage(pageIndex) {
// ... existing code ...
        
        // Apply the page's background style
        if (this.useGlobalBackgroundStyle) {
            this.applyBackgroundStyle(this.globalBackgroundStyle);
        } else if (page.canvasBackgroundStyle) {
            this.applyBackgroundStyle(page.canvasBackgroundStyle);
        } else {
            this.applyBackgroundStyle('classic-white'); // Default style
        }
        
        // ... existing code ...
    }

    showSelectPanelModal() {
        const modal = document.getElementById('select-panel-modal');
        const overlay = document.getElementById('select-panel-modal-overlay');
        
        if (!modal || !overlay) return;
        
        // Show the modal and overlay
        overlay.style.display = 'block';
        modal.style.display = 'block';
        
        // Trigger transitions by adding active class after a short delay
        setTimeout(() => {
            modal.classList.add('active');
            overlay.classList.add('active');
        }, 10);
        
        const okButton = document.getElementById('ok-select-panel-btn');
        if (okButton) {
            okButton.onclick = () => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
                // Wait for transition before hiding
                setTimeout(() => {
                    modal.style.display = 'none';
                    overlay.style.display = 'none';
                }, 300);
            };
        }
    }

    // Helper methods for selection management
    clearSelection() {
        this.imageLibrary.clearSelectedAssets();
        this.imageLibrary.setLastSelectedAsset(null);
        document.querySelectorAll('.thumbnail-container.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

        /**
     * Validates and processes a custom layout from uploaded JSON
     * @param {Object} layoutData - The parsed JSON object containing the layout data
     */
        processCustomLayout(layoutData) {
            // Validate the layout structure
            if (!this.validateCustomLayout(layoutData)) {
                alert('Invalid layout format. The JSON file must include a name, description, and an array of panels with x, y, width, and height properties.');
                return;
            }
            
            // Generate a unique ID for this layout based on name
            const layoutId = 'custom-' + layoutData.name.toLowerCase().replace(/\s+/g, '-');
            
            // Check if a layout with this ID already exists
            if (this.layouts[layoutId]) {
                const confirmReplace = confirm(`A layout named "${layoutData.name}" already exists. Do you want to replace it?`);
                if (!confirmReplace) return;
            }
            
            // Add the layout to the available layouts
            this.layouts[layoutId] = layoutData;
            
            // Save to localStorage for persistence between sessions
            this.layoutBuilderManager.saveLayoutToStorage(layoutData.name, layoutData);
            
            // Refresh the layout selection UI to include the new layout
            this.setupLayoutSelection();
            
            // Show a success message
            alert(`Custom layout "${layoutData.name}" has been added successfully!`);
        }
        
        /**
         * Process multiple layout files at once
         * @param {FileList} files - List of JSON files to process
         */
        processBatchLayouts(files) {
            let successCount = 0;
            let failCount = 0;
            let totalCount = files.length;
            let processingCount = 0;
            
            // Show loading message
            const loadingMessage = `Processing ${totalCount} layout files...`;
            alert(loadingMessage);
            
            // Process each file
            Array.from(files).forEach(file => {
                if (file && file.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const layoutData = JSON.parse(event.target.result);
                            
                            // Validate the layout structure
                            if (this.validateCustomLayout(layoutData)) {
                                // Generate a unique ID for this layout based on name
                                const layoutId = 'custom-' + layoutData.name.toLowerCase().replace(/\s+/g, '-');
                                
                                // Add the layout to the available layouts
                                this.layouts[layoutId] = layoutData;
                                
                                // Save to localStorage for persistence between sessions
                                this.layoutBuilderManager.saveLayoutToStorage(layoutData.name, layoutData);
                                
                                successCount++;
                            } else {
                                console.error(`Invalid layout format in file: ${file.name}`);
                                failCount++;
                            }
                        } catch (error) {
                            console.error(`Error parsing JSON file ${file.name}:`, error);
                            failCount++;
                        }
                        
                        processingCount++;
                        
                        // When all files have been processed
                        if (processingCount === totalCount) {
                            // Refresh the layout selection UI
                            this.setupLayoutSelection();
                            
                            // Show completion message
                            const resultMessage = `Batch processing complete:\n` +
                                `✅ ${successCount} layouts added successfully\n` +
                                `❌ ${failCount} layouts had errors`;
                            alert(resultMessage);
                        }
                    };
                    reader.readAsText(file);
                } else {
                    failCount++;
                    processingCount++;
                    console.error(`File ${file.name} is not a valid JSON file.`);
                }
            });
        }

        /**
         * Validates that a custom layout has the required structure
         * @param {Object} layout - The parsed JSON object to validate
         * @returns {boolean} - True if valid, false otherwise
         */
        validateCustomLayout(layout) {
            // Check for required properties
            if (!layout.name || typeof layout.name !== 'string') {
                console.error('Layout is missing a name property or it is not a string');
                return false;
            }
            
            if (!layout.description || typeof layout.description !== 'string') {
                console.error('Layout is missing a description property or it is not a string');
                return false;
            }
            
            if (!Array.isArray(layout.panels)) {
                console.error('Layout.panels is not an array');
                return false;
            }
            
            // Check each panel has the required properties
            for (let i = 0; i < layout.panels.length; i++) {
                const panel = layout.panels[i];
                
                // Check for required numeric properties
                const requiredProps = ['x', 'y', 'width', 'height'];
                for (const prop of requiredProps) {
                    if (typeof panel[prop] !== 'number') {
                        console.error(`Panel ${i} is missing ${prop} property or it is not a number`);
                        return false;
                    }
                    
                    // Ensure values are within percentage range (0-100)
                    if (panel[prop] < 0 || panel[prop] > 100) {
                        console.error(`Panel ${i} has invalid ${prop} value: ${panel[prop]}. Must be between 0 and 100.`);
                        return false;
                    }
                }
            }
            
            return true;
        }
    
    /**
     * Loads custom layouts from localStorage and merges them into the layouts object
     * Ensures custom layouts are always available for project loading
     */
    loadCustomLayouts() {
        try {
            // Use the LayoutBuilderManager's method to load custom layouts from localStorage
            const customLayouts = this.layoutBuilderManager?.loadCustomLayouts() || {};
            
            // Log the custom layouts found
            console.log(`Loading ${Object.keys(customLayouts).length} custom layouts from localStorage`);
            
            // Convert the custom layouts to the format used by the ComicCreator
            // Create a layoutId for each custom layout based on its name
            Object.entries(customLayouts).forEach(([name, layout]) => {
                const layoutId = `custom-${name.toLowerCase().replace(/\s+/g, '-')}`;
                
                // Only add if not already present, or update if it has changed
                if (!this.layouts[layoutId] || JSON.stringify(this.layouts[layoutId]) !== JSON.stringify(layout)) {
                    this.layouts[layoutId] = layout;
                    console.log(`Added/updated custom layout: ${name} with ID: ${layoutId}`);
                }
            });
        } catch (error) {
            console.error('Error loading custom layouts from localStorage:', error);
        }
    }

    async _loadProjectFromState(projectState) {
        console.log('[ComicCreator Headless] Loading project from state object...');

        // Add the 'exporting' class to the body for Puppeteer-specific styling
        if (window.IS_PUPPETEER_EXPORT) {
            document.body.classList.add('exporting');
            console.log('[ComicCreator Headless] Added "exporting" class to body.');
            // Reset viewport for export consistency
            if (this.viewportManager) {
                this.viewportManager.resetView();
            }
        }

        // await this.autoSaveManager.clearAutoSave(); // AutoSaveManager calls this *before* _loadProjectFromState
        // this.autoSaveManager.stopAutoSaveTimer(); // AutoSaveManager also calls this

        try {
            // --- Load and Set Canvas Dimension from Project State (MUST be done early) ---
            if (projectState.canvasDimensionKey && this.canvasDimensions[projectState.canvasDimensionKey]) {
                this.setCanvasDimension(projectState.canvasDimensionKey);
                console.log('[_loadProjectFromState] Canvas dimension set from project state to:', projectState.canvasDimensionKey);
            } else if (projectState.canvasWidth && projectState.canvasHeight) {
                let foundKey = null;
                for (const key in this.canvasDimensions) {
                    if (this.canvasDimensions[key].width === projectState.canvasWidth && this.canvasDimensions[key].height === projectState.canvasHeight) {
                        foundKey = key;
                        break;
                    }
                }
                if (foundKey) {
                    this.setCanvasDimension(foundKey);
                    console.log('[_loadProjectFromState] Canvas dimension (W/H) matched to existing key:', foundKey);
                } else {
                    console.warn(`[_loadProjectFromState] Saved canvas dimensions (${projectState.canvasWidth}x${projectState.canvasHeight}) do not match a predefined key. Using current default.`);
                    // Consider if a default should be forced here if a project is restored without dimension info
                    // Forcing a default might be safer than using whatever the app was last set to.
                    // this.setCanvasDimension('current'); 
                }
            } else {
                console.warn('[_loadProjectFromState] No canvas dimension information found in project state. Using current default.');
                // this.setCanvasDimension('current'); // Default for older auto-saves
            }
            // --- End Canvas Dimension Loading ---

            this.loadCustomLayouts(); // Load from localStorage first

            if (projectState.customLayouts) {
                console.log('[ComicCreator Headless] Importing custom layouts from project state...');
                Object.entries(projectState.customLayouts).forEach(([layoutId, layout]) => {
                    this.layouts[layoutId] = layout;
                    this.layoutBuilderManager.saveLayoutToStorage(layout.name, layout); // Also save to localStorage for consistency
                });
                // No need to call setupLayoutSelection() in headless, UI won't be interacted with for this
            }

            this.imageLibrary.clearImages();
            this.pages = [];
            this.currentPageIndex = 0;
            this.folderStructure = { root: { type: 'folder', name: 'root', items: [], parent: null } };
            this.currentFolderId = 'root';

            const canvasElement = document.querySelector('#comic-canvas');
            if (canvasElement) canvasElement.innerHTML = '';

            if (projectState.hasOwnProperty('useGlobalBackgroundStyle')) {
                this.useGlobalBackgroundStyle = projectState.useGlobalBackgroundStyle;
                this.backgroundManager.useGlobalBackgroundStyle = projectState.useGlobalBackgroundStyle;
            }
            if (projectState.hasOwnProperty('globalBackgroundStyle')) {
                this.globalBackgroundStyle = projectState.globalBackgroundStyle;
                this.backgroundManager.globalBackgroundStyle = projectState.globalBackgroundStyle;
            }

            // Images are expected to be Data URLs from projectState for headless
            const imagesToLoad = projectState.images.map(img => ({ ...img, isObjectURL: false })); // Ensure isObjectURL is false
            this.imageLibrary.addImages(imagesToLoad);
            // The image verification will happen in puppeteer-export.js if we keep it

            if (projectState.folderStructure) {
                this.folderStructure = projectState.folderStructure;
                this.currentFolderId = projectState.currentFolderId || 'root';
            } else {
                this.imageLibrary.getImages().forEach(image => {
                    if (!this.folderStructure.root.items.includes(image.id)) {
                        this.folderStructure.root.items.push(image.id.toString());
                    }
                });
            }
            
            this.pages = projectState.pages;
            this.currentPageIndex = projectState.currentPageIndex || 0;

            if (!this.folderStructure[this.currentFolderId]) {
                this.currentFolderId = 'root';
            }

            // Navigate to Editor Page
            document.querySelector('#upload-page')?.classList.remove('active');
            document.querySelector('#layout-page')?.classList.remove('active');
            document.querySelector('#editor-page')?.classList.add('active');
            this.showBackToEditorButton(); // Show button when editor is visited
            
            console.log('[ComicCreator Headless] Core state loaded. Loading page content for index:', this.currentPageIndex);
            await this.loadPageState(this.currentPageIndex); // Load the initial page

            // UI updates for sidebar/nav are less critical for headless but good for consistency if loadPageState expects them
            this.uiManager.updateRightSidebarView(); 
            this.updatePageIndicator();
            this.updateNavigationButtons();

            // Restart auto-save timer (optional for headless, but part of loadProject)
            // const AUTOSAVE_INTERVAL = 30000; 
            // this.autoSaveManager.saveIntervalId = setInterval(this.autoSaveManager.performAutoSave, AUTOSAVE_INTERVAL);
            // window.addEventListener('beforeunload', this.autoSaveManager.handleBeforeUnload);
            // Or better: await this.autoSaveManager.init(); if it handles restart logic

            console.log('[ComicCreator Headless] Project from state object loaded successfully.');
            return true; // Indicate success
        } catch (error) {
            console.error('[ComicCreator Headless] Error loading project from state object:', error);
            return false; // Indicate failure
        }
    }

    /**
     * Shows or hides the back to editor button based on whether images are uploaded AND a layout exists
     */
    updateBackToEditorButton() {
        const backToEditorBtn = document.getElementById('back-to-editor-btn');
        if (backToEditorBtn) {
            const hasImages = this.imageLibrary.getImages().length > 0;
            const hasLayout = this.hasValidLayout();
            
            if (hasImages && hasLayout) {
                backToEditorBtn.style.display = 'flex';
                console.log('[ComicCreator] Back to editor button now visible - images uploaded and layout exists');
            } else {
                backToEditorBtn.style.display = 'none';
                if (!hasImages) {
                    console.log('[ComicCreator] Back to editor button hidden - no images uploaded');
                } else if (!hasLayout) {
                    console.log('[ComicCreator] Back to editor button hidden - no layout chosen yet');
                }
            }
        }
    }

    /**
     * Checks if the current page has a valid layout (not empty) or has any content
     */
    hasValidLayout() {
        const currentPage = this.pages[this.currentPageIndex];
        if (!currentPage) return false;
        
        // Check if layout is set and not 'empty'
        const hasNonEmptyLayout = currentPage.layout && currentPage.layout !== 'empty';
        
        // Check if there are any panels with content
        const hasPanelContent = currentPage.panelStates && currentPage.panelStates.length > 0;
        
        // Check if there are any text elements, stickers, or background content
        const hasTextContent = currentPage.textStates && currentPage.textStates.length > 0;
        const hasStickerContent = currentPage.stickerStates && currentPage.stickerStates.length > 0;
        const hasBackgroundContent = currentPage.backgroundState && currentPage.backgroundState.imageId;
        
        // Return true if any content exists or if a non-empty layout is chosen
        return hasNonEmptyLayout || hasPanelContent || hasTextContent || hasStickerContent || hasBackgroundContent;
    }

    /**
     * @deprecated Use updateBackToEditorButton() instead
     * Legacy method for backwards compatibility
     */
    showBackToEditorButton() {
        this.updateBackToEditorButton();
    }
}

// Initialize the comic creator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.comicCreator = new ComicCreator();
}); 