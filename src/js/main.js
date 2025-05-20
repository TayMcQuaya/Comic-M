import { layouts } from './layouts.js';
import { ExportManager } from './modules/ExportManager.js'; // Import the new manager
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

// Global helper function globalRgbToHex removed (now in Utils.js)

class ComicCreator {
    constructor() {
        // this.uploadedImages = []; // Moved to ImageLibrary
        this.pages = [{
            layout: null,
            panelStates: [], // Will store image positions and transforms for each panel
            canvasBackgroundStyle: 'classic-white' // Ensure default exists
        }];
        this.currentPageIndex = 0;
        this.layouts = layouts; // Store layouts in the instance
        this.currentSidebarMode = 'panels'; // Add this line: 'panels', 'backgrounds', 'stickers'
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
        
        // Instantiate the Managers
        this.exportManager = new ExportManager(this); 
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
        
        this.init();
    }

    async init() { // Make init async to await autoSaveManager.init
        // Initialize selection tracking - Moved to ImageLibrary
        // this.selectedAssets = [];
        // this.lastSelectedAsset = null;
        
        // Set up global document click handler for selection clearing
        document.addEventListener('click', (e) => {
            // Only clear selection if clicking outside of thumbnails and folders
            if (!e.target.closest('.thumbnail-container') && 
                !e.target.closest('.folder-container')) {
                this.imageLibrary.clearSelection(); // Ensure call uses imageLibrary instance
            }
        });
        
        // Load custom layouts from localStorage to make them available globally
        this.loadCustomLayouts();
        
        this.setupUploadArea();
        this.setupLayoutSelection();
        this.setupComicEditor();
        this.setupEventListeners();
        this.setupProjectControls(); // Add this line
        this.initializeUI(); // This might be moved/refactored later
        this.uiManager.setupSidebarTabs(); // Call UIManager method
        
        // Initialize history AFTER the initial setup seems complete
        // This assumes the initial state (e.g., first blank page) is ready
        // We might need to adjust this if loading a project happens later.
        try {
            this.historyManager.initializeWithInitialState();
        } catch (e) {
            console.error("Failed to initialize history manager state:", e);
            // Potentially notify user?
        }

        // Initialize AutoSaveManager AFTER other initializations
        // It might prompt the user, which could load state, so it should run late.
        await this.autoSaveManager.init(); // Await initialization
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
        
        // Render layout options
        Object.entries(this.layouts).forEach(([layoutId, layout]) => {
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
        return `<div style="position: relative; width: 100%; padding-bottom: 100%;">${previewHtml.join('')}</div>`;
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
                            ; // Do nothing
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
        return pageStateSnapshot;
    }

    setupEventListeners() {
        // Navigation
        document.querySelector('#next-step-btn').addEventListener('click', () => {
            document.querySelector('#upload-page').classList.remove('active');
            document.querySelector('#layout-page').classList.add('active');
        });

        document.querySelector('#back-to-upload').addEventListener('click', () => {
            document.querySelector('#layout-page').classList.remove('active');
            document.querySelector('#upload-page').classList.add('active');
        });

        document.querySelector('#back-to-editor-btn').addEventListener('click', () => {
            document.querySelector('#upload-page').classList.remove('active');
            document.querySelector('#editor-page').classList.add('active');
        });

        document.querySelector('#back-to-layout').addEventListener('click', () => {
            document.querySelector('#editor-page').classList.remove('active');
            document.querySelector('#layout-page').classList.add('active');
        });

        // Load Project Button in Upload Page
        document.querySelector('#load-project-btn').addEventListener('click', (event) => { // Add event arg
            const buttonElement = event.target; // Get the button element
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.loadProject(file);
                    // After loading, go directly to the editor page
                    document.querySelector('#upload-page').classList.remove('active');
                    document.querySelector('#editor-page').classList.add('active');
                } else {
                    console.log("Load Project cancelled by user.");
                }
                // Clean up the input element regardless of selection
                document.body.removeChild(input);
            });

            // Remove focus from the button BEFORE opening the dialog
            buttonElement.blur(); 

            input.click();
        });

        // Add Text Button
        document.querySelector('#add-text-btn')?.addEventListener('click', () => {
            switch (this.currentSidebarMode) {
                case 'panels':
                    // Check the currentPanel property of the PanelManager instance
                    if (this.panelManager.currentPanel) { 
                        // Pass the selected panel from PanelManager to addTextToPanel
                        this.textManager.addTextToPanel(this.panelManager.currentPanel); // Use TextManager
                    } else {
                        // If no panel selected in panels mode, show modal via UIManager
                        this.uiManager.showSelectPanelModal(); 
                    }
                    break;
                case 'backgrounds':
                case 'stickers':
                    // Add text directly to canvas in backgrounds or stickers mode
                    this.textManager.addTextToCanvas(); // Use TextManager
                    break;
                default:
                    console.warn('Add Text button clicked in unknown mode:', this.currentSidebarMode);
            }
        });

        // New Project Button
        document.querySelector('#new-project-btn')?.addEventListener('click', () => {
            this.promptForNewProject();
        });

        // Panel Controls
        const zoomControl = document.querySelector('.zoom-control');
        if (zoomControl) {
            zoomControl.addEventListener('input', (e) => {
                if (!this.currentPanel) return;
                const img = this.currentPanel.querySelector('img');
                if (!img) return;

                const initialScale = parseFloat(this.currentPanel.dataset.initialScale) || 1;
                const zoomPercentage = parseFloat(e.target.value);
                const newScale = (initialScale * zoomPercentage) / 100;
                
                // Update transform while maintaining position
                const currentTransform = img.style.transform;
                const newTransform = currentTransform.replace(/scale\(.*?\)/, `scale(${newScale})`);
                img.style.transform = newTransform;
                
                // Store current scale
                this.currentPanel.dataset.currentScale = newScale;
                
                const zoomValue = e.target.parentElement.querySelector('.zoom-value');
                if (zoomValue) {
                    zoomValue.textContent = `${Math.round(zoomPercentage)}%`;
                }
            });
        }

        // Position Controls
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.currentPanel) return;
                const img = this.currentPanel.querySelector('img');
                if (!img) return;

                const step = 10;
                const direction = btn.classList.contains('up') ? 'up' :
                                btn.classList.contains('down') ? 'down' :
                                btn.classList.contains('left') ? 'left' :
                                btn.classList.contains('right') ? 'right' : null;
                
                if (!direction) return;

                const currentLeft = parseInt(img.style.left) || 50;
                const currentTop = parseInt(img.style.top) || 50;

                switch (direction) {
                    case 'up':
                        img.style.top = `${currentTop - step}%`;
                        break;
                    case 'down':
                        img.style.top = `${currentTop + step}%`;
                        break;
                    case 'left':
                        img.style.left = `${currentLeft - step}%`;
                        break;
                    case 'right':
                        img.style.left = `${currentLeft + step}%`;
                        break;
                }
            });
        });

        // Update download button event listener
        document.querySelector('#download-btn')?.addEventListener('click', async () => {
            // this.exportManager.downloadComic(); // Old method, commented out
            console.log('[Frontend] Download button clicked, requesting PDF export...');
            try {
                // Get the current project state
                const projectState = await this.getCurrentProjectState();
                if (!projectState) {
                    alert('Could not retrieve project state for export.');
                    return;
                }

                const response = await fetch('/api/export-pdf', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(projectState),
                });

                if (!response.ok) {
                    let errorMsg = `Error fetching PDF: ${response.status} ${response.statusText}`;
                    try {
                        const errDetails = await response.json();
                        errorMsg += ` - ${errDetails.error || 'Unknown server error'}`;
                    } catch (e) { /* Ignore if error response is not JSON */ }
                    console.error(errorMsg);
                    alert(errorMsg); // Inform the user
                    return;
                }

                // For Phase 1, we expect an image back
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Get filename from Content-Disposition header if available, else default
                const disposition = response.headers.get('content-disposition');
                let filename = 'captured_page.png'; // Default filename
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"])(?<filename>.*?)\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches.groups && matches.groups.filename) {
                        filename = matches.groups.filename;
                    }
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                console.log('[Frontend] Captured image download initiated.');

            } catch (error) {
                console.error('[Frontend] Error during PDF export request:', error);
                alert(`An error occurred while trying to export: ${error.message}`);
            }
        });

        // Custom Layout Upload - File input listener
        const customLayoutInput = document.getElementById('custom-layout-input');
        if (customLayoutInput) {
            customLayoutInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length === 0) return;
                
                // For multiple files
                if (files.length > 1) {
                    this.processBatchLayouts(files);
                } 
                // For single file
                else {
                    const file = files[0];
                    if (file && file.type === 'application/json') {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const layoutData = JSON.parse(event.target.result);
                                this.processCustomLayout(layoutData);
                            } catch (error) {
                                console.error('Error parsing custom layout JSON:', error);
                                alert('Invalid JSON file. Please check the format.');
                            }
                        };
                        reader.readAsText(file);
                    } else {
                        alert('Please select a valid .json file.');
                    }
                }
            });
        }

        // Add keyboard event listener for delete key and UNDO
        document.addEventListener('keydown', (e) => {
            // Check for Ctrl+Z (or Cmd+Z on Mac) for UNDO
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault(); // Prevent browser's default undo behavior
                console.log("Ctrl+Z detected, attempting undo...");
                this.historyManager.undo();
                return; // Don't process other keys if undo was triggered
            }
            
            // Add Ctrl+Y for REDO later if needed
            // if ((e.ctrlKey || e.metaKey) && event.key === 'y') {
            //    e.preventDefault(); 
            //    console.log("Ctrl+Y detected, attempting redo...");
            //    this.historyManager.redo();
            //    return;
            // }

            // Existing Delete key logic
            if (e.key === 'Delete') {
                // Check current sidebar mode and selected element
                switch (this.currentSidebarMode) {
                    case 'panels':
                        // FIRST check if a text box is selected
                        if (this.textManager.currentTextBox) {
                            // Check if the key press originated INSIDE the editable text area
                            const editableTextElement = this.textManager.currentTextBox.querySelector('.text-content');
                            if (editableTextElement && editableTextElement.contains(e.target)) {
                                // If triggered inside the editable area, let the browser handle character deletion
                                // Do nothing here.
                            } else {
                                // If triggered outside the editable area (e.g., bubble selected), delete the whole box
                                // *** Record state BEFORE deleting text box ***
                                this.historyManager.recordSnapshotBeforeAction(false, 'text');
                                this.textManager.deleteSelectedTextBox(); // Use TextManager method
                            }
                        } 
                        // ONLY if NO text box is selected (or deletion wasn't handled above), THEN check if a panel image should be deleted
                        else if (this.panelManager.currentPanel && this.panelManager.currentPanel.querySelector('img')) {
                            // *** Record state BEFORE clearing panel image ***
                            this.historyManager.recordSnapshotBeforeAction(false, 'panel');
                            this.panelManager.clearPanelImage(this.panelManager.currentPanel);
                        }
                        break;
                    case 'backgrounds':
                        const backgroundElement = document.querySelector('.canvas-background-image');
                        if (backgroundElement) {
                            // *** Record state BEFORE removing background ***
                            this.historyManager.recordSnapshotBeforeAction();
                            this.backgroundManager.clearCustomBackground(); // Use BackgroundManager method
                        }
                        break;
                    case 'stickers':
                         // Check StickerManager for selected sticker
                        if (this.stickerManager.selectedSticker) {
                             // *** Record state BEFORE deleting sticker ***
                            this.historyManager.recordSnapshotBeforeAction();
                            this.stickerManager.deleteSelectedSticker(); // Use StickerManager method
                        }
                        break;
                    case 'library':
                         // Call ImageLibrary's delete method
                         if (this.imageLibrary.selectedAssets.length > 0) {
                            // *** Record state BEFORE deleting library image(s) ***
                            this.historyManager.recordSnapshotBeforeAction();
                            this.imageLibrary.deleteSelectedImages();
                         }
                         break;
                }
            }

             // Deselect elements on Escape key
            if (e.key === 'Escape') {
                this.deselectAll();
            }
        });

        // Add other specific listeners (like canvas interactions, sidebar controls) if not handled by managers
        const canvas = document.querySelector('#comic-canvas');
        canvas.addEventListener('click', (e) => {
            // Clicking on the canvas background deselects panels/text
            if (e.target === canvas || e.target.classList.contains('canvas-background') || e.target.classList.contains('canvas-background-image')) {
                this.deselectAll();
            }
        });
        
        // Global click listener for deselecting assets in image library moved to init()

        // Listener for window resize (optional, but good for responsiveness)
        // window.addEventListener('resize', () => {
            // Might need to redraw canvas or adjust element positions
        // });
    }

    createComic(layout = null) {
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
        canvas.style.width = '700px';
        canvas.style.height = '700px';
        canvas.style.position = 'relative';
        canvas.style.margin = '0 auto';
        canvas.style.display = 'block';

        // Create a container for the canvas with padding
        const canvasContainer = canvas.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('comic-canvas-container')) {
            canvasContainer.style.padding = '2rem';
            canvasContainer.style.paddingTop = '120px';
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
            currentPageForLayoutUpdate.layout = layout ? (typeof layout === 'string' ? layout : this.selectedLayout) : this.selectedLayout;
            console.log(`[createComic] Updated page ${this.currentPageIndex} layout to: ${currentPageForLayoutUpdate.layout}`);
        }
        // --- End layout update ---

        // Apply default background style if no layout is provided
        if (!layout) {
            // Call the method on the BackgroundManager instance
            this.backgroundManager.applyBackgroundStyle('classic-white'); 
        }

        // Only save state if this is a new page creation and not loading an existing page
        // This is important to avoid overriding existing page states
        // Check if we're creating a new page vs loading an existing one
        const currentPage = this.pages[this.currentPageIndex];
        if (!layout && (!currentPage.panelStates || currentPage.panelStates.length === 0)) {
            console.log("Creating new page state from scratch");
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
        
        // If it's a string, look it up in the layouts object
        if (typeof layoutName === 'string' && this.layouts[layoutName]) {
            return this.layouts[layoutName];
        }
        
        console.error(`Layout not found: ${layoutName}`);
        
        // Return the first available layout as fallback
        const firstLayout = Object.values(this.layouts)[0];
        if (firstLayout) {
            console.warn(`Using fallback layout: ${Object.keys(this.layouts)[0]}`);
            return firstLayout;
        }
        
        return null;
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
        addPageBtn.addEventListener('click', () => this.showLayoutSelection());
        prevPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex - 1));
        nextPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex + 1));
        deletePageBtn.addEventListener('click', () => this.deleteCurrentPage());
        reorderPagesBtn.addEventListener('click', () => this.reorderPages());

        // Add event listeners for direct page navigation
        const handlePageNavigation = () => {
            const pageNum = parseInt(pageNumberInput.value, 10);
            if (pageNum && pageNum >= 1 && pageNum <= this.pages.length) {
                this.navigateToPage(pageNum - 1);
            } else {
                // Reset to current page if invalid
                pageNumberInput.value = this.currentPageIndex + 1;
            }
        };

        goToPageBtn.addEventListener('click', handlePageNavigation);
        pageNumberInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handlePageNavigation();
            }
        });

        // Update input when navigating with prev/next buttons
        this.updatePageIndicator = () => {
            const indicator = document.querySelector('.page-indicator');
            const input = document.getElementById('pageNumberInput');
            if (indicator) {
                indicator.textContent = `of ${this.pages.length}`;
            }
            if (input) {
                input.value = this.currentPageIndex + 1;
                input.max = this.pages.length;
            }
        };
    }

    setupPageNavigation() {
        const pageNavigation = document.createElement('div');
        pageNavigation.className = 'page-navigation';
        pageNavigation.innerHTML = `
            <div class="page-controls">
                <div class="nav-group" style="display: flex; flex-direction: column; align-items: center;">
                    <span class="page-indicator">Page 1 of 1</span>
                    <div class="input-group" style="margin: 8px 0; display: flex; flex-direction: row; align-items: center; gap: 5px;">
                        <button class="tool-btn" id="prevPage" style="
                            width: 32px;
                            height: 32px;
                            background: #ff4444;
                            color: #fff;
                            border: 2px solid #ffff00;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <input type="number" id="pageNumberInput" class="page-number-input" min="1" value="1" style="
                            width: 25px;
                            height: 32px;
                            padding: 2px;
                            text-align: center;
                            background: #333;
                            color: #fff;
                            border: 2px solid #ffff00;
                            border-radius: 4px;
                        ">
                        <button class="tool-btn" id="nextPage" style="
                            width: 32px;
                            height: 32px;
                            background: #ff4444;
                            color: #fff;
                            border: 2px solid #ffff00;
                            border-radius: 4px;
                        ">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="tool-btn" id="goToPage" style="
                            height: 32px;
                            padding: 0 8px;
                            background: #ff4444;
                            color: #fff;
                            border: 2px solid #ffff00;
                            border-radius: 4px;
                        ">GO</button>
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
        const editorHeader = document.querySelector('.editor-header');
        editorHeader.appendChild(pageNavigation);

        // Rest of the event listener code stays the same...
    }

    showLayoutSelection() {
        // Save current page state before showing layout selection
        this.saveCurrentPageState();
        
        // Show layout selection page
        document.getElementById('editor-page').classList.remove('active');
        document.getElementById('layout-page').classList.add('active');
        
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
        this.createComic(this.layouts[layoutId]);
        
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
        
        // Update the sidebar content to show panel controls
        this.uiManager.updateRightSidebarView();
    }

    navigateToPage(pageIndex, saveCurrentState = true) {
        // Validate page index
        if (pageIndex < 0 || pageIndex >= this.pages.length) {
            console.error('Invalid page index:', pageIndex);
            return;
        }
        
        console.log(`Navigating from page ${this.currentPageIndex} to page ${pageIndex}`);
        
        // Save current page state if requested
        if (saveCurrentState) {
            console.log(`Saving state of current page ${this.currentPageIndex} before navigation`);
            this.saveCurrentPageState();
        }
        
        // Update current page index
        this.currentPageIndex = pageIndex;
        
        // Load the page state
        this.loadPageState(pageIndex);
        
        // Update page indicator and navigation buttons
        this.updatePageIndicator();
        this.updateNavigationButtons();
        
        // This ensures the correct default message or empty state is shown.
        this.uiManager.updateRightSidebarView(); 
    }
    
    loadPageState(pageIndex) {
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
            layoutConfig = this.layouts[page.layout];
            
            // If layout not found, try to reload custom layouts from localStorage
            if (!layoutConfig && page.layout.startsWith('custom-')) {
                console.warn(`Custom layout not found: ${page.layout}. Attempting to load from localStorage.`);
                this.loadCustomLayouts();
                layoutConfig = this.layouts[page.layout];
            }
        } else if (typeof page.layout === 'object') {
            layoutConfig = page.layout;
            try {
                const layoutId = Object.entries(this.layouts).find(
                    ([id, layout]) => JSON.stringify(layout) === JSON.stringify(page.layout)
                )?.[0];
                if (layoutId) {
                    page.layout = layoutId;
                    console.log(`Updated page layout to use ID: ${layoutId}`);
                }
            } catch (e) {
                console.error("Error trying to find layout ID:", e);
            }
        }
        
        if (!layoutConfig) {
            console.error(`Failed to find layout configuration for page ${pageIndex}. Using fallback layout.`);
            // Use the first available layout as fallback
            const firstLayout = Object.values(this.layouts)[0];
            if (firstLayout) {
                layoutConfig = firstLayout;
                const layoutId = Object.keys(this.layouts)[0];
                page.layout = layoutId; // Update the page's layout reference
                console.warn(`Using fallback layout: ${layoutId}`);
                this.uiManager.showNotification(
                    `Could not find layout "${page.layout}" for page ${pageIndex + 1}. Using "${layoutId}" instead.`, 
                    "warning"
                );
            } else {
                console.error('No layouts available as fallback!');
                return false;
            }
        }

        // Create comic structure first (calls PanelManager.createPanels)
        this.createComic(layoutConfig);
        
        // Log panels created
        const panelsAfterCreation = comicCanvas.querySelectorAll('.comic-panel').length;
        console.log(`After createComic - Panels created: ${panelsAfterCreation}`);

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
        const panels = document.querySelectorAll('.comic-panel');
        // Call PanelManager to handle image/transform loading
        this.panelManager.loadPanelStates(panelStates);

        // --- Restore Text Elements (via TextManager) ---
        console.log(`Main.loadPageState: Preparing to restore text elements. Page has ${page.panelStates?.length || 0} panel states and ${page.canvasTextElements?.length || 0} canvas text elements`);
        
        // Debug log the canvas text elements before restoration
        if (page.canvasTextElements && page.canvasTextElements.length > 0) {
            console.log(`Main.loadPageState: Canvas text elements before restoration:`);
            page.canvasTextElements.forEach((element, idx) => {
                console.log(`Main.loadPageState: Canvas text element ${idx}: id=${element.id}, position: (${element.style?.left || 'none'}, ${element.style?.top || 'none'}), transform=${element.style?.transform || 'none'}`);
            });
        } else {
            console.log(`Main.loadPageState: No canvas text elements to restore.`);
        }
        
        this.textManager.loadTextStates(page); // Pass the whole page state
        console.log(`Main.loadPageState: Text restoration completed. Canvas now has ${comicCanvas.querySelectorAll(':scope > .text-bubble').length} direct text bubbles.`);
        // --- End Text Restoration --- 

        // --- Restore Sticker Elements (via StickerManager) ---
        this.stickerManager.loadStickerStates(page);
        // --- End Sticker Restoration ---

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
            alert('Cannot delete the last page. Add a new page first.');
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
        // Prompt for filename
        const filename = await this.promptForFilename("comic-project", ".json"); // Pass default and extension
        if (!filename) {
            console.log("Save project cancelled by user.");
            return; // Exit if user cancelled
        }

        // Force save current page state before exporting (including any new text elements)
        console.log("Saving final page state before exporting project");
        this.saveCurrentPageState();
        
        // Make sure all text elements are recorded
        // Refresh canvas to ensure we capture everything in the DOM
        const canvasTextElements = document.querySelectorAll('#comic-canvas > .text-bubble');
        console.log(`Found ${canvasTextElements.length} canvas text elements - making sure they're all saved`);
        
        // Get the current page object
        const currentPage = this.pages[this.currentPageIndex];
        if (!currentPage) {
            console.error("Cannot save project - current page not found");
            return;
        }
        
        // Double-check if canvasTextElements in current page matches the DOM
        if (currentPage.canvasTextElements && 
            canvasTextElements.length > 0 && 
            canvasTextElements.length !== currentPage.canvasTextElements.length) {
            console.warn(`Mismatch between DOM text elements (${canvasTextElements.length}) and saved state (${currentPage.canvasTextElements.length}). Forcing state refresh.`);
            // Force refresh the page state to capture all elements
            this.saveCurrentPageState();
        }
        
        // Identify custom layouts used in this project
        const customLayoutIds = new Set();
        this.pages.forEach(page => {
            const layoutId = page.layout;
            if (layoutId && typeof layoutId === 'string' && layoutId.startsWith('custom-')) {
                customLayoutIds.add(layoutId);
            }
        });
        
        // Create a map of custom layouts that are used in this project
        const customLayouts = {};
        customLayoutIds.forEach(layoutId => {
            if (this.layouts[layoutId]) {
                const layoutName = this.layouts[layoutId].name;
                customLayouts[layoutId] = this.layouts[layoutId];
                console.log(`Including custom layout in project: ${layoutName} (${layoutId})`);
            }
        });
        
        // --- MODIFIED: Convert Object URLs back to Data URLs before saving ---
        const imageProcessingPromises = this.imageLibrary.getImages().map(async (img) => {
            if (img.isObjectURL && img.src && img.src.startsWith('blob:')) {
                try {
                    // Fetch the blob data from the Object URL
                    const response = await fetch(img.src);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch blob URL for ${img.name} (status: ${response.status})`);
                    }
                    const blob = await response.blob();
                    
                    // Use FileReader to convert Blob to Data URL
                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    
                    console.log(`Converted Object URL back to Data URL for saving: ${img.name}`);
                    // Return image data with the persistent Data URL
                    return {
                        id: img.id,
                        name: img.name,
                        width: img.width,
                        height: img.height,
                        src: dataUrl
                        // No need to save isObjectURL flag
                    };
                } catch (error) {
                    console.error(`Failed to convert Object URL to Data URL for image: ${img.name} (${img.id})`, error);
                    // Fallback: Save with a null src or indicate error? Saving null might be safer.
                    return { 
                        id: img.id, 
                        name: img.name, 
                        width: img.width, 
                        height: img.height, 
                        src: null, // Indicate data loss 
                        saveError: true
                    };
                }
            } else {
                // If it's not an Object URL (e.g., already a Data URL or failed load),
                // save the existing src (which might be null or a Data URL)
                return {
                    id: img.id,
                    name: img.name,
                    width: img.width,
                    height: img.height,
                    src: img.src // Keep original src 
                };
            }
        });

        // Wait for all conversions to complete
        const imagesToSave = await Promise.all(imageProcessingPromises);
        // --- END MODIFICATION ---

        // Create project state object
        const projectState = {
            version: '1.3-autosave', // Update version
            useGlobalBackgroundStyle: this.useGlobalBackgroundStyle,
            globalBackgroundStyle: this.globalBackgroundStyle,
            pages: this.pages.map(page => ({
                ...page,
                panelStates: page.panelStates.map(panel => ({
                    ...panel,
                    // Convert image data URLs to just IDs
                    imageId: panel.imageId || null
                }))
            })),
            images: imagesToSave, // <-- Use the processed images array
            currentPageIndex: this.currentPageIndex,
            // Add folder structure and current folder ID
            folderStructure: this.folderStructure,
            currentFolderId: this.currentFolderId,
            // Add custom layouts to ensure portability across devices
            customLayouts: customLayouts
        };
        
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
        
        const imageProcessingPromises = this.imageLibrary.getImages().map(async (img) => {
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
            version: '1.3-autosave-puppeteer', // New version marker
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

    async loadProject(file) {
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
            
            // Verify text elements were loaded correctly
            const canvasTextElements = document.querySelectorAll('#comic-canvas > .text-bubble');
            const currentPage = this.pages[this.currentPageIndex];
            
            if (currentPage && currentPage.canvasTextElements) {
                console.log(`Verification: Found ${canvasTextElements.length} canvas text elements in DOM vs ${currentPage.canvasTextElements.length} in page state`);
                
                // If there's a mismatch and we should have text elements but don't, try loading again
                if (canvasTextElements.length === 0 && currentPage.canvasTextElements.length > 0) {
                    console.warn("Text elements missing after load - attempting to reload text state");
                    this.textManager.loadTextStates(currentPage);
                }
            }
            
            // Restart the auto-save timer after successfully loading a project
            // Reference the constant from AutoSaveManager
            const AUTOSAVE_INTERVAL = 30000; // 30 seconds, matching the value in AutoSaveManager
            this.autoSaveManager.saveIntervalId = setInterval(this.autoSaveManager.performAutoSave, AUTOSAVE_INTERVAL);
            window.addEventListener('beforeunload', this.autoSaveManager.handleBeforeUnload);
            this.uiManager.showNotification("Project loaded successfully!", "success");

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
        const saveProjectBtn = document.getElementById('save-project-btn');
        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', () => this.saveProject());
        }
        
        // Load Project button
        const loadProjectBtn = document.getElementById('load-project-btn');
        if (loadProjectBtn) {
            loadProjectBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.loadProject(file);
                    }
                };
                input.click();
            });
        }
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

        list.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0); // Style the dragged item
        });

        list.addEventListener('dragend', (e) => {
            setTimeout(() => {
                if (draggedItem) {
                    draggedItem.classList.remove('dragging');
                }
                draggedItem = null;
                // Remove any lingering drag-over styles
                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            }, 0);
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetItem = e.target.closest('li');
            if (targetItem && targetItem !== draggedItem) {
                const listItems = Array.from(list.children);
                const targetIndex = listItems.indexOf(targetItem);
                const draggedIndex = listItems.indexOf(draggedItem);

                // Remove previous drag-over styles
                list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                targetItem.classList.add('drag-over'); // Add style to target

                // Reorder visually in the list
                if (targetIndex > draggedIndex) {
                    list.insertBefore(draggedItem, targetItem.nextSibling);
                } else {
                    list.insertBefore(draggedItem, targetItem);
                }
            }
        });
        
        list.addEventListener('dragleave', (e) => {
            const targetItem = e.target.closest('li');
            if (targetItem) {
                 targetItem.classList.remove('drag-over');
            }
        });

        // --- Modal Control Logic ---
        const closeModal = (confirm = false) => {
            modal.classList.remove('active');
            overlay.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
                // Clean up event listeners (important!)
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                list.removeEventListener('dragstart', list.dragStartHandler);
                list.removeEventListener('dragend', list.dragEndHandler);
                list.removeEventListener('dragover', list.dragOverHandler);
                 list.removeEventListener('dragleave', list.dragLeaveHandler);
            }, 300); // Wait for transition

            if (confirm) {
                this.applyPageReorder(list);
            }
        };

        const handleConfirm = () => closeModal(true);
        const handleCancel = () => closeModal(false);

        // Add temporary references to handlers for removal
        list.dragStartHandler = list.listeners?.['dragstart'];
        list.dragEndHandler = list.listeners?.['dragend'];
        list.dragOverHandler = list.listeners?.['dragover'];
        list.dragLeaveHandler = list.listeners?.['dragleave'];

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

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
        this.autoSaveManager.stopAutoSaveTimer();

        // Reset pages
        this.pages = [{
            layout: null,
            panelStates: [],
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
        await this.autoSaveManager.init(); // Re-initialize the manager to restart timer/listeners
    }

    // --- Update Sticker Controls ---
    updateStickerControls(stickerElement) {
        // Delegate to the StickerManager to handle sticker controls
        this.stickerManager.updateStickerControls();
    }

    // --- Deselect All Elements --- 
    deselectAll() {
        const propertiesPanel = document.querySelector('.properties-panel'); // Get panel ref

        if (this.currentPanel) {
            this.currentPanel.classList.remove('selected');
            const img = this.currentPanel.querySelector('img');
            if (img) {
                img.style.cursor = 'default';
                img.style.pointerEvents = 'none';
            }
            this.currentPanel = null;
            // Hide panel props if they exist
             if (propertiesPanel) {
                const panelProps = propertiesPanel.querySelector('#panel-properties');
                 if (panelProps) panelProps.style.display = 'none';
             }
        }
        if (this.currentTextBox) {
            this.currentTextBox.classList.remove('selected-text');
            this.currentTextBox = null;
             // Hide text props if they exist
             if (propertiesPanel) {
                const textProps = propertiesPanel.querySelector('#text-properties');
                if (textProps) textProps.style.display = 'none';
            }
        }
        if (this.currentBackground) {
            this.currentBackground.classList.remove('selected-background');
            this.currentBackground = null;
             // Hide background props if they exist
            if (propertiesPanel) {
                const bgProps = propertiesPanel.querySelector('#background-properties');
                if (bgProps) bgProps.style.display = 'none';
            }
        }
        
        // Use StickerManager to deselect stickers
        if (this.currentSticker) {
            this.stickerManager.deselectCurrentSticker();
            this.currentSticker = null;
            
             // Hide sticker props if they exist
             if (propertiesPanel) {
                 const stickerProps = propertiesPanel.querySelector('#sticker-properties');
                 if (stickerProps) stickerProps.style.display = 'none';
             }
        }
        
         // After deselecting everything, update the sidebar based on the current mode
         // This ensures the correct default message or empty state is shown.
         this.uiManager.updateRightSidebarView(); 
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
}

// Initialize the comic creator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.comicCreator = new ComicCreator();
}); 