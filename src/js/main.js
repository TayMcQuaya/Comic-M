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

// Global helper function globalRgbToHex removed (now in Utils.js)

class ComicCreator {
    constructor() {
        // this.uploadedImages = []; // Moved to ImageLibrary
        this.pages = [{
            layout: null,
            panelStates: [] // Will store image positions and transforms for each panel
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
        this.panelManager = new PanelManager(this); // Instantiate PanelManager
        this.textManager = new TextManager(this); // Instantiate TextManager
        this.stickerManager = new StickerManager(this); // Instantiate StickerManager
        this.backgroundManager = new BackgroundManager(this); // Instantiate BackgroundManager
        this.uiManager = new UIManager(this); // Instantiate UIManager
        
        this.init();
    }

    init() {
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
        
        this.setupUploadArea();
        this.setupLayoutSelection();
        this.setupComicEditor();
        this.setupEventListeners();
        this.setupProjectControls(); // Add this line
        this.initializeUI(); // This might be moved/refactored later
        this.uiManager.setupSidebarTabs(); // Call UIManager method
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
            
            layoutOption.innerHTML = `
                <h3>${layout.name}</h3>
                <div class="layout-preview">
                    ${this.generateLayoutPreview(layout)}
                </div>
                <p>${layout.description || ''}</p>
            `;
            
            layoutGrid.appendChild(layoutOption);
        });

        // Setup click handler
        layoutGrid.addEventListener('click', (e) => {
            const layoutOption = e.target.closest('.layout-option');
            if (layoutOption) {
                this.selectedLayout = layoutOption.dataset.layout;
                document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
                layoutOption.classList.add('selected');
                this.createComic();
            }
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
            if (e.key === 'Delete') {
                // Check current sidebar mode and selected element
                switch (this.currentSidebarMode) {
                    case 'panels':
                        // Use the PanelManager's currentPanel property and clear method
                        if (this.panelManager.currentPanel && this.panelManager.currentPanel.querySelector('img')) {
                            this.panelManager.clearPanelImage(this.panelManager.currentPanel);
                        } else if (this.textManager.currentTextBox) { // Check TextManager for selected text
                            this.textManager.deleteSelectedTextBox(); // Use TextManager method
                        }
                        break;
                    case 'backgrounds':
                        const backgroundElement = document.querySelector('.canvas-background-image');
                        if (backgroundElement) {
                            // Call BackgroundManager to handle removal and state
                            this.backgroundManager.removeBackgroundImage(); 
                            this.deselectAll(); // Keep deselectAll here
                            // updateRightSidebarView is called within removeBackgroundImage if needed
                        } else {
                             console.log("Delete key pressed in background mode, but no background image found.");
                        }
                        break;
                    case 'stickers':
                        // Use the StickerManager's currentSticker property and delete method
                        if (this.stickerManager.currentSticker) {
                            this.stickerManager.deleteSelectedSticker();
                        } else if (this.textManager.currentTextBox) { // Also check for selected text
                            this.textManager.deleteSelectedTextBox();
                        }
                        break;
                }
            }
        });

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            const panel = e.target.closest('.comic-panel');
            if (panel) {
                panel.classList.add('drop-target');
            }
        });

        canvas.addEventListener('dragleave', (e) => {
            const panel = e.target.closest('.comic-panel');
            if (panel) {
                panel.classList.remove('drop-target');
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
                        console.log('Mode: Panels - Dropped image ID:', imageId, 'onto panel');
                        // Call the method on the PanelManager instance
                        this.panelManager.addImageToPanel(panel, image); 
                    } else {
                        console.log('Mode: Panels - Drop outside panel ignored.');
                    }
                    break;
                
                case 'backgrounds':
                    // Allow drop anywhere on the canvas for background
                    console.log('Mode: Backgrounds - Dropped image ID:', imageId, 'onto canvas');
                    // Call the method on the BackgroundManager instance
                    this.backgroundManager.addBackgroundImage(image);
                    // Remove drop-target from panel if dragged over one initially
                    if (panel) panel.classList.remove('drop-target');
                    break;

                case 'stickers':
                    // Allow drop anywhere on the canvas for stickers
                    console.log('Mode: Stickers - Dropped image ID:', imageId, 'onto canvas');
                    // Pass viewport drop coordinates (clientX, clientY)
                    // Call the method on the StickerManager instance
                    this.stickerManager.addSticker(image, e.clientX, e.clientY);
                    // Remove drop-target from panel if dragged over one initially
                    if (panel) panel.classList.remove('drop-target');
                    break;

                default:
                    console.warn('Unknown sidebar mode:', this.currentSidebarMode);
            }
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
            return;
        }
        
        // Preserve existing layout (should be an ID)
        const existingLayout = currentPage.layout;
        if (!existingLayout) {
            // If somehow layout got lost, restore it from selectedLayout
            currentPage.layout = this.selectedLayout;
            console.log(`Restored missing layout ID: ${this.selectedLayout}`);
        } else if (typeof existingLayout === 'object') {
            // Convert object to ID if we have an old format
            try {
                const layoutId = Object.entries(this.layouts).find(
                    ([id, layout]) => JSON.stringify(layout) === JSON.stringify(existingLayout)
                )?.[0];
                
                if (layoutId) {
                    currentPage.layout = layoutId;
                    console.log(`Converted layout object to ID: ${layoutId}`);
                } else {
                    console.warn("Could not match layout object to an ID");
                }
            } catch (e) {
                console.error("Error trying to find layout ID:", e);
            }
        }
        
        // Save panel image states (via PanelManager)
        const panelImageStates = this.panelManager.savePanelStates();

        // --- Save Text States (via TextManager) ---
        const textStates = this.textManager.saveTextStates(); 
        currentPage.canvasTextElements = textStates.canvasTextElements; // Save canvas text
        // --- End Text State Saving ---

        // --- Save Sticker States (via StickerManager) ---
        currentPage.stickerStates = this.stickerManager.saveStickerStates();
        // --- End Sticker State Saving ---

        const panels = Array.from(document.querySelectorAll('.comic-panel'));

        currentPage.panelStates = panels.map((panel, index) => {
            const state = panelImageStates[index] || {}; 

            // Assign saved panel text state
            state.textElements = textStates.panelTextStates[index] || []; 

            // Add background style saving (can be moved later)
            state.backgroundStyle = panel.dataset.backgroundStyle || 'classic-white'; 
            
            return state;
        });

        // --- Background State Saving (Handled by BackgroundManager actions) ---
        // The BackgroundManager methods (applyBackgroundStyle, addBackgroundImage, etc.)
        // directly update the relevant properties (canvasBackgroundStyle, backgroundState) 
        // on the current page object within this.comicCreator.pages.
        // So, no specific extraction needed here for saving, but ensure those methods do update the page state.
        // We also need to ensure the global state is saved correctly in saveProject.

        // --- Update ComicCreator state from BackgroundManager ---
        // Reflect the manager's state back onto the main instance for saving project state
        this.useGlobalBackgroundStyle = this.backgroundManager.useGlobalBackgroundStyle;
        this.globalBackgroundStyle = this.backgroundManager.globalBackgroundStyle;
        // --- End BackgroundManager State Update ---
        
        console.log(`Saved page ${this.currentPageIndex} with ${currentPage.panelStates.length} panel states and layout ID ${currentPage.layout}`);
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
        document.querySelector('#download-btn')?.addEventListener('click', () => {
            this.exportManager.downloadComic(); // Call method on the manager instance
        });

        // Custom Layout Upload - File input listener
        const customLayoutInput = document.getElementById('custom-layout-input');
        if (customLayoutInput) {
            customLayoutInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
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
            });
        }
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
        
        // Save current page state before creating new page
        this.saveCurrentPageState();
        
        // Create new page with the selected layout
        this.pages.push({
            layout: layoutId, // Store just the layout ID, not the layout object
            panelStates: [],
            canvasBackgroundStyle: 'classic-white' // Default background style
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

        // Clear existing elements
        comicCanvas.querySelectorAll('.canvas-sticker-image').forEach(sticker => sticker.remove());
        comicCanvas.querySelectorAll('.canvas-background-image').forEach(bg => bg.remove());

        // Set the current layout and create the comic structure
        this.selectedLayout = page.layout;
        
        // Get layout configuration
        let layoutConfig;
        if (typeof page.layout === 'string') {
            layoutConfig = this.layouts[page.layout];
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
            console.error(`Failed to find layout configuration for page ${pageIndex}`);
            return false;
        }

        // Create comic structure first (calls PanelManager.createPanels)
        this.createComic(layoutConfig);

        // Set canvas background style using BackgroundManager
        this.backgroundManager.loadCurrentPageBackground(); 
        // REMOVED: Direct manipulation of canvas classList for background

        // Store the states we need to restore
        const panelStates = page.panelStates || [];
        const stickerStates = page.stickerStates || [];
        
        // Restore background image if present
        if (page.backgroundState && page.backgroundState.imageId) {
            const bgImage = this.imageLibrary.getImageById(String(page.backgroundState.imageId));
            if (bgImage) {
                const bgImg = document.createElement('img');
                bgImg.src = bgImage.src;
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
        this.textManager.loadTextStates(page); // Pass the whole page state
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

        // Save current page state before exporting
        this.saveCurrentPageState();
        
        // Create project state object
        const projectState = {
            version: '1.1', // Increment version to indicate folder structure support
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
            images: this.imageLibrary.getImages().map(img => ({
                id: img.id,
                name: img.name,
                width: img.width,
                height: img.height,
                src: img.src // Keep the data URL for now
            })),
            currentPageIndex: this.currentPageIndex,
            // Add folder structure and current folder ID
            folderStructure: this.folderStructure,
            currentFolderId: this.currentFolderId
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
    }

    async loadProject(file) {
        try {
            const text = await file.text();
            const projectState = JSON.parse(text);
            
            // Version check
            if (!projectState.version) {
                throw new Error('Invalid project file format');
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
            const loadedImages = await Promise.all(projectState.images.map(img => {
                return new Promise((resolve) => {
                    const image = new Image();
                    image.onload = () => {
                        resolve({
                            id: img.id,
                            name: img.name,
                            src: img.src,
                            width: img.width || image.width,
                            height: img.height || image.height
                        });
                    };
                    image.onerror = () => {
                        console.error(`Failed to load image: ${img.name} (${img.id})`);
                        // Resolve with the image data anyway, but it won't display properly
                        resolve({
                            id: img.id,
                            name: img.name,
                            src: img.src,
                            width: img.width || 100,
                            height: img.height || 100,
                            loadError: true
                        });
                    };
                    image.src = img.src;
                });
            }));
            
            this.imageLibrary.addImages(loadedImages);
            
            // Log the loaded images data
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
            
            // Load the current page
            await this.loadPageState(this.currentPageIndex);
            
            // Update navigation
            this.updatePageIndicator();
            this.updateNavigationButtons();
            
            console.log('Project loaded successfully');
        } catch (error) {
            console.error('Error loading project:', error);
            // Use UIManager to show notification
            this.uiManager.showNotification('Error loading project file. Please make sure it is a valid comic project file.', 'error'); 
            // alert('Error loading project file. Please make sure it is a valid comic project file.'); // Keep alert as backup?
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

   

    


    // --- Update Sticker Controls ---
    updateStickerControls(stickerElement) {
        console.log("Updating controls for sticker:", stickerElement ? stickerElement.id : 'None');

        const stickerProps = document.querySelector('.properties-panel');
        if (!stickerProps) return;

        if (!stickerElement) {
            stickerProps.innerHTML = `
                <div class="panel-properties">
                    <h4>Select a sticker to edit its properties</h4>
                </div>`;
            return;
        }

        if (stickerElement) {
            stickerProps.innerHTML = `
                <h4>Sticker Settings</h4>
                <div class="panel-controls">
                    <div class="control-group">
                        <h4 style="text-align: center;">Image Controls</h4>
                        <button class="danger-btn delete-sticker-btn" style="width: 100%; margin-bottom: 1rem;">
                            <i class="fas fa-trash"></i> Delete Sticker
                        </button>
                        <div class="zoom-group">
                            <label>Size</label>
                            <input type="range" class="size-control" min="10" max="1000" value="200">
                            <span class="size-value">200%</span>
                            <button class="reset-size-btn" style="background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; font-size: 0.9rem; width: 100%; justify-content: center; margin-top: 10px;">
                                <i class="fas fa-undo"></i> Reset Size
                            </button>
                        </div>
                        <div class="flip-group" style="margin-top: 1rem;">
                            <button class="flip-horizontal-btn" style="width: 100%; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--background-color); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                                <i class="fas fa-arrows-alt-h"></i> Flip Horizontal
                            </button>
                        </div>
                    </div>
                </div>`;

            // Add delete listener
            const deleteBtn = stickerProps.querySelector('.delete-sticker-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    const stickerIdToDelete = stickerElement.id;
                    stickerElement.remove();
                    
                    // Remove from state
                    const pageState = this.pages[this.currentPageIndex];
                    if (pageState && pageState.stickerStates) {
                        pageState.stickerStates = pageState.stickerStates.filter(s => s.id !== stickerIdToDelete);
                    }

                    this.deselectAll();
                    this.saveCurrentPageState();
                };
            }

            // Add flip horizontal button listener
            const flipHorizontalBtn = stickerProps.querySelector('.flip-horizontal-btn');
            if (flipHorizontalBtn) {
                // Set initial state based on current transform
                const isFlipped = stickerElement.style.transform.includes('scaleX(-1)');
                flipHorizontalBtn.classList.toggle('active', isFlipped);
                
                flipHorizontalBtn.addEventListener('click', () => {
                    const currentTransform = stickerElement.style.transform || '';
                    const isCurrentlyFlipped = currentTransform.includes('scaleX(-1)');
                    
                    // Toggle the flip state
                    if (isCurrentlyFlipped) {
                        stickerElement.style.transform = currentTransform.replace(/\s*scaleX\(-1\)/, '');
                        stickerElement.dataset.isFlippedHorizontally = 'false';
                    } else {
                        stickerElement.style.transform = `${currentTransform} scaleX(-1)`;
                        stickerElement.dataset.isFlippedHorizontally = 'true';
                    }
                    
                    // Toggle button active state
                    flipHorizontalBtn.classList.toggle('active');
                    
                    // Save the current page state
                    this.saveCurrentPageState();
                });
            }

            // Size control listener
            const sizeControl = stickerProps.querySelector('.size-control');
            if (sizeControl) {
                const currentSize = parseFloat(stickerElement.dataset.size) || 200;
                sizeControl.value = currentSize;
                const sizeValue = sizeControl.parentElement.querySelector('.size-value');
                if (sizeValue) {
                    sizeValue.textContent = `${Math.round(currentSize)}%`;
                }

                sizeControl.addEventListener('input', (e) => {
                    const size = parseFloat(e.target.value);
                    const scale = size / 100;
                    stickerElement.style.width = `${scale * 100}px`; // Base size is 100px
                    stickerElement.style.height = 'auto'; // Maintain aspect ratio
                    stickerElement.dataset.size = size;
                    sizeValue.textContent = `${Math.round(size)}%`;
                    this.saveCurrentPageState();
                });
                
                // Make size value editable
                this.uiManager.makeSliderValueEditable(sizeControl, sizeValue, '%', 0);
            }
        }
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
        if (this.currentSticker) {
            this.currentSticker.classList.remove('selected-sticker');
            this.currentSticker.style.zIndex = '100'; // Reset z-index on deselect too
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
            
            // Refresh the layout selection UI to include the new layout
            this.setupLayoutSelection();
            
            // Show a success message
            alert(`Custom layout "${layoutData.name}" has been added successfully!`);
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
    
}

// Initialize the comic creator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.comicCreator = new ComicCreator();
}); 