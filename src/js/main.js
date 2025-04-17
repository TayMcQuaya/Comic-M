import { layouts } from './layouts.js';
import { ExportManager } from './modules/ExportManager.js'; // Import the new manager
import { globalRgbToHex, getTextWithLineBreaks } from './modules/Utils.js'; // Import Utils
import { FolderSystem } from './modules/FolderSystem.js'; // Import FolderSystem
import { DragAndDropManager } from './modules/DragAndDropManager.js'; // Import DragAndDropManager
import { ImageLibrary } from './modules/ImageLibrary.js'; // Import ImageLibrary

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
        this.useGlobalBackgroundStyle = false; // Global background toggle
        this.globalBackgroundStyle = 'classic-white'; // Default global background style
        this.currentSidebarMode = 'panels'; // Add this line: 'panels', 'backgrounds', 'stickers'
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
        
        // Instantiate the ExportManager
        this.exportManager = new ExportManager(this); 
        this.folderSystem = new FolderSystem(this); // Instantiate FolderSystem
        this.dragAndDropManager = new DragAndDropManager(this); // Instantiate DragAndDropManager
        this.imageLibrary = new ImageLibrary(this); // Instantiate ImageLibrary
        
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
        this.initializeUI();
        this.setupSidebarTabs(); // Add this line to set up tab listeners
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
                        if (this.currentPanel && this.currentPanel.querySelector('img')) {
                            this.clearPanelImage(this.currentPanel);
                        }
                        break;
                    case 'backgrounds':
                        const backgroundElement = document.querySelector('.canvas-background-image');
                        if (backgroundElement) {
                            backgroundElement.remove();
                            // Clear state
                            const currentPage = this.pages[this.currentPageIndex];
                            if (currentPage) currentPage.backgroundState = null;
                            this.deselectAll();
                            this.updateRightSidebarView();
                            this.saveCurrentPageState();
                        }
                        break;
                    case 'stickers':
                        if (this.currentSticker) {
                            const stickerIdToDelete = this.currentSticker.id;
                            this.currentSticker.remove();
                            // Remove from state
                            const pageState = this.pages[this.currentPageIndex];
                            if (pageState && pageState.stickerStates) {
                                pageState.stickerStates = pageState.stickerStates.filter(s => s.id !== stickerIdToDelete);
                            }
                            this.deselectAll();
                            this.saveCurrentPageState();
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
                        this.addImageToPanel(panel, image);
                    } else {
                        console.log('Mode: Panels - Drop outside panel ignored.');
                    }
                    break;
                
                case 'backgrounds':
                    // Allow drop anywhere on the canvas for background
                    console.log('Mode: Backgrounds - Dropped image ID:', imageId, 'onto canvas');
                    this.addBackgroundImage(image);
                    // Remove drop-target from panel if dragged over one initially
                    if (panel) panel.classList.remove('drop-target');
                    break;

                case 'stickers':
                    // Allow drop anywhere on the canvas for stickers
                    console.log('Mode: Stickers - Dropped image ID:', imageId, 'onto canvas');
                    // Pass viewport drop coordinates (clientX, clientY)
                    this.addSticker(image, e.clientX, e.clientY); 
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
                // Clicked on a sticker - select it
                this.selectSticker(sticker);
            } else if (textBox) {
                // Clicked inside a text box (or its controls, handled by text box listeners)
                // Let the text box's own click listener handle selection/focus
                // Do nothing here to avoid deselecting when clicking format buttons etc.
                return; 
            } else if (panel) {
                // Clicked on a panel but not text/sticker inside it
                this.selectPanel(panel);
            } else {
                // Clicked on the canvas background or empty area
                this.deselectAll();
            }
        });
    }

    

    addImageToPanel(panel, image) {
        if (!panel || !image) {
            console.error('[addImageToPanel] Cannot add image: invalid panel or image', { panel, image }); // <<< Keep existing error log
            return;
        }
        
        console.log('[addImageToPanel] Called with panel:', panel, 'and image:', image); // <<< Debug log
        
        try {
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.name;
            console.log('[addImageToPanel] Created img element with src:', img.src); // <<< Debug log
            
            // Find and remove any existing image in the panel
            const existingImg = panel.querySelector('img');
            if (existingImg) {
                existingImg.remove();
                console.log('[addImageToPanel] Removed existing image from panel.');
            }
            
            // Append the new image
            panel.appendChild(img);
            console.log('[addImageToPanel] Appended img to panel:', panel); // <<< Debug log
            
            // Set initial image styles
            img.style.position = 'absolute';
            img.style.left = '50%';
            img.style.top = '50%';
            img.style.transform = 'translate(-50%, -50%) scale(1)';
    
            // Calculate initial scale to fit the panel while maintaining aspect ratio
            img.onload = () => {
                console.log('Image loaded, calculating scale...'); // Debug log
                const panelWidth = panel.offsetWidth;
                const panelHeight = panel.offsetHeight;
                const imageWidth = img.naturalWidth;
                const imageHeight = img.naturalHeight;
    
                console.log('Panel dimensions:', panelWidth, panelHeight); // Debug log
                console.log('Image dimensions:', imageWidth, imageHeight); // Debug log
    
                const scaleX = panelWidth / imageWidth;
                const scaleY = panelHeight / imageHeight;
                const scale = Math.max(scaleX, scaleY);
    
                img.style.transform = `translate(-50%, -50%) scale(${scale})`;
                
                panel.dataset.initialScale = scale;
                panel.dataset.currentScale = scale;
                
                console.log('Applied scale:', scale); // Debug log
            };
            
            // Store image data and update visual states
            panel.dataset.imageId = image.id.toString();
            this.imageLibrary.updateThumbnails(); // Update thumbnail states (FIXED CALL)
            
            this.dragAndDropManager.setupImageDragging(img);
            this.selectPanel(panel);
        } catch (error) {
            console.error('Error adding image to panel:', error);
        }
    }


    selectPanel(panel) {
        if (this.currentPanel) {
            this.currentPanel.classList.remove('selected');
            // Reset cursor for previous panel's image
            const prevImg = this.currentPanel.querySelector('img');
            if (prevImg) {
                prevImg.style.cursor = 'default';
                prevImg.style.pointerEvents = 'none';
            }
        }
        
        this.currentPanel = panel;
        
        if (panel) {
            panel.classList.add('selected');
            
            // Set cursor for current panel's image
            const img = panel.querySelector('img');
            if (img) {
                img.style.cursor = 'grab';
                img.style.pointerEvents = 'auto';
            }
            
            this.updatePanelControls(panel);
        } else {
            // Clear panel controls when no panel is selected
            const controls = document.querySelector('.panel-controls');
            if (controls) controls.innerHTML = '';
        }
    }

    updatePanelControls(panel) {
        const controls = document.querySelector('.panel-controls');
        if (!controls) return;

        if (!panel) {
            this.showSelectPanelModal();
            return;
        }

        // Clear existing controls
        controls.innerHTML = `
            <div class="control-group">
                <h4 style="text-align: center;">Image Controls</h4>
                <div class="zoom-group">
                    <label>Zoom</label>
                    <input type="range" class="zoom-control" min="50" max="300" value="100">
                    <span class="zoom-value">100%</span>
                    <button class="reset-zoom-btn">
                        <i class="fas fa-undo"></i> Reset Zoom
                    </button>
                </div>
                <div class="flip-group" style="margin-top: 1rem;">
                    <button class="flip-horizontal-btn" style="width: 100%; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--background-color); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-arrows-alt-h"></i> Flip Horizontal
                    </button>
                </div>
            </div>
            <div class="control-group">
                <h4 style="text-align: center;">Rotation</h4>
                <div class="rotation-group">
                    <label>Angle</label>
                    <input type="range" class="rotation-control" min="-180" max="180" value="0" step="1">
                    <span class="rotation-value">0°</span>
                    <button class="reset-rotation-btn">
                        <i class="fas fa-undo"></i> Reset Rotation
                    </button>
                </div>
            </div>
            <div class="control-group">
                <h4 style="text-align: center;">Position</h4>
                <div class="step-size-control" style="margin-bottom: 1rem; text-align: center;">
                    <label style="font-size: 16px;">Step Size: </label>
                    <input type="number" 
                           class="step-size-input" 
                           value="1" 
                           min="0.1" 
                           max="20" 
                           step="0.1" 
                           style="width: 80px; height: 30px; font-size: 16px; padding: 4px;">
                </div>
                <div class="position-controls" style="display: grid; grid-template-areas: '. up .' 'left center right' '. down .'; gap: 5px; justify-content: center;">
                    <button class="position-btn up" style="grid-area: up;"><i class="fas fa-arrow-up"></i></button>
                    <button class="position-btn left" style="grid-area: left;"><i class="fas fa-arrow-left"></i></button>
                    <div style="grid-area: center;"></div>
                    <button class="position-btn right" style="grid-area: right;"><i class="fas fa-arrow-right"></i></button>
                    <button class="position-btn down" style="grid-area: down;"><i class="fas fa-arrow-down"></i></button>
                </div>
            </div>`;

        // Add zoom control listeners
        const zoomControl = controls.querySelector('.zoom-control');
        const zoomValue = controls.querySelector('.zoom-value');
        
        if (zoomControl) {
            zoomControl.addEventListener('input', (e) => this.handleZoom(e, panel));
            
            // Make zoom value editable using the helper function
            this.makeSliderValueEditable(zoomControl, zoomValue, '%', 0);
        }

        // Add reset zoom button listener
        const resetZoomBtn = controls.querySelector('.reset-zoom-btn');
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', () => {
                const img = panel.querySelector('img');
                if (!img) return;

                // Reset zoom to 100%
                const initialScale = parseFloat(panel.dataset.initialScale) || 1;
                img.style.transform = img.style.transform.replace(/scale\(.*?\)/, `scale(${initialScale})`);
                panel.dataset.currentScale = initialScale;

                // Update zoom control and value display
                if (zoomControl) {
                    zoomControl.value = 100;
                    zoomValue.textContent = '100%';
                }

                // Save the current page state
                this.saveCurrentPageState();
            });
        }

        // Add flip horizontal button listener
        const flipHorizontalBtn = controls.querySelector('.flip-horizontal-btn');
        if (flipHorizontalBtn) {
            const img = panel.querySelector('img');
            if (img) {
                // Set initial state based on current transform
                const isFlipped = img.style.transform.includes('scaleX(-1)');
                flipHorizontalBtn.classList.toggle('active', isFlipped);
                
                flipHorizontalBtn.addEventListener('click', () => {
                    const currentTransform = img.style.transform || '';
                    const isCurrentlyFlipped = currentTransform.includes('scaleX(-1)');
                    
                    // Toggle the flip state
                    if (isCurrentlyFlipped) {
                        img.style.transform = currentTransform.replace(/\s*scaleX\(-1\)/, '');
                        panel.dataset.isFlippedHorizontally = 'false';
                    } else {
                        img.style.transform = `${currentTransform} scaleX(-1)`;
                        panel.dataset.isFlippedHorizontally = 'true';
                    }
                    
                    // Toggle button active state
                    flipHorizontalBtn.classList.toggle('active');
                    
                    // Save the current page state
                    this.saveCurrentPageState();
                });
            }
        }

        // Add rotation control listeners
        const rotationControl = controls.querySelector('.rotation-control');
        const rotationValue = controls.querySelector('.rotation-value');
        
        if (rotationControl) {
            // Get current rotation angle from image or panel dataset
            const img = panel.querySelector('img');
            if (img) {
                const currentRotation = parseInt(panel.dataset.rotation || '0');
                rotationControl.value = currentRotation;
                rotationValue.textContent = `${currentRotation}°`;
                
                rotationControl.addEventListener('input', (e) => {
                    const angle = parseInt(e.target.value);
                    panel.dataset.rotation = angle;
                    
                    // Update transform with new rotation while preserving other transforms
                    const currentTransform = img.style.transform || '';
                    if (currentTransform.includes('rotate')) {
                        img.style.transform = currentTransform.replace(/rotate\([^)]+\)/, `rotate(${angle}deg)`);
                    } else {
                        img.style.transform = currentTransform + ` rotate(${angle}deg)`;
                    }
                    
                    rotationValue.textContent = `${angle}°`;
                    this.saveCurrentPageState();
                });
                
                // Make rotation value editable
                this.makeSliderValueEditable(rotationControl, rotationValue, '°', 0);
            }
        }
        
        // Add reset rotation button listener
        const resetRotationBtn = controls.querySelector('.reset-rotation-btn');
        if (resetRotationBtn) {
            resetRotationBtn.addEventListener('click', () => {
                const img = panel.querySelector('img');
                if (!img) return;
                
                // Reset rotation to 0 degrees
                panel.dataset.rotation = '0';
                
                // Remove rotation from transform while preserving other transforms
                const currentTransform = img.style.transform || '';
                img.style.transform = currentTransform.replace(/\s*rotate\([^)]+\)/g, '');
                
                // Update rotation control and value display
                if (rotationControl) {
                    rotationControl.value = 0;
                    rotationValue.textContent = '0°';
                }

                // Save the current page state
                this.saveCurrentPageState();
            });
        }

        // Add position control listeners
        controls.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handlePositionChange(btn, panel));
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

    clearPanelImage(panel) {
        if (!panel) return;
        
        // Find and remove the image element specifically
        const img = panel.querySelector('img');
        if (img) {
            img.remove();
        }
        
        // Reset panel state related to the image
        delete panel.dataset.imageId;
        delete panel.dataset.initialScale;
        delete panel.dataset.currentScale;
        
        // Update controls and thumbnail states
        this.updatePanelControls(panel);
        this.updateImageLibrary();
        
        // Save the current page state
        this.saveCurrentPageState();
    }

    handleZoom(e, panel) {
        const img = panel.querySelector('img');
        if (!img) return;

        const initialScale = parseFloat(panel.dataset.initialScale) || 1;
        const zoomPercentage = parseFloat(e.target.value);
        const newScale = (initialScale * zoomPercentage) / 100;
        
        // Update transform while maintaining position
        const currentTransform = img.style.transform;
        const newTransform = currentTransform.replace(/scale\(.*?\)/, `scale(${newScale})`);
        img.style.transform = newTransform;
        
        // Store current scale
        panel.dataset.currentScale = newScale;
        
        const zoomValue = e.target.parentElement.querySelector('.zoom-value');
        if (zoomValue) {
            zoomValue.textContent = `${Math.round(zoomPercentage)}%`;
        }

        // Save the current page state
        this.saveCurrentPageState();
    }

    handlePositionChange(btn, panel) {
        const img = panel.querySelector('img');
        if (!img) return;

        // Get and validate step size from input
        const stepSizeInput = document.querySelector('.step-size-input');
        let step = 1; // Default value
        
        if (stepSizeInput) {
            const inputValue = parseFloat(stepSizeInput.value);
            // Ensure the value is a positive number and within bounds
            if (!isNaN(inputValue) && inputValue >= 0.1 && inputValue <= 20) {
                step = inputValue;
            } else {
                // Reset to default if invalid
                stepSizeInput.value = "1";
            }
        }

        const direction = btn.classList.contains('up') ? 'up' :
                        btn.classList.contains('down') ? 'down' :
                        btn.classList.contains('left') ? 'left' :
                        btn.classList.contains('right') ? 'right' : null;
        
        if (!direction) return;

        const currentLeft = parseFloat(img.style.left) || 50;
        const currentTop = parseFloat(img.style.top) || 50;

        switch (direction) {
            case 'up':
                img.style.top = `${(currentTop - step).toFixed(1)}%`;
                break;
            case 'down':
                img.style.top = `${(currentTop + step).toFixed(1)}%`;
                break;
            case 'left':
                img.style.left = `${(currentLeft - step).toFixed(1)}%`;
                break;
            case 'right':
                img.style.left = `${(currentLeft + step).toFixed(1)}%`;
                break;
        }

        // Save the current page state
        this.saveCurrentPageState();
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
        
        // Save panel states
        const panels = Array.from(document.querySelectorAll('.comic-panel'));
        currentPage.panelStates = panels.map(panel => {
            const img = panel.querySelector('img');
            const panelState = {
                backgroundStyle: panel.dataset.backgroundStyle || 'classic-white',
                textElements: []
            };
            
            // Save image data if present
            if (img) {
                const imageId = panel.dataset.imageId || img.dataset.imageId;
                
                panelState.imageId = imageId;
                panelState.transform = img.style.transform || 'translate(-50%, -50%) scale(1)';
                panelState.left = img.style.left || '50%';
                panelState.top = img.style.top || '50%';
                panelState.initialScale = panel.dataset.initialScale || '1';
                panelState.currentScale = panel.dataset.currentScale || '1';
                panelState.rotation = panel.dataset.rotation || '0';
                panelState.isFlippedHorizontally = panel.dataset.isFlippedHorizontally === 'true';
            }
            
            // Save text elements
            Array.from(panel.querySelectorAll('.text-bubble')).forEach(textBubble => {
                const textElement = textBubble.querySelector('.text-content');
                
                // Extract the class names for bubble type
                const bubbleClasses = Array.from(textBubble.classList)
                    .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                                    'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                                    'no-bubble'].includes(cls));
                
                // Extract tail position class
                const tailPositionClass = Array.from(textBubble.classList)
                    .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));
                
                panelState.textElements.push({
                    id: textBubble.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                    previousBubbleType: textBubble.dataset.previousBubbleType || '',
                    tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                    content: textElement.innerHTML,
                    style: {
                        left: textBubble.style.left,
                        top: textBubble.style.top,
                        // Only save width/height if they are explicitly set
                        ...(textBubble.style.width && { width: textBubble.style.width }),
                        ...(textBubble.style.height && { height: textBubble.style.height }),
                        transform: textBubble.style.transform,
                        zIndex: textBubble.style.zIndex,
                        fontSize: textElement.style.fontSize,
                        fontFamily: textElement.style.fontFamily,
                        fontWeight: textElement.style.fontWeight,
                        fontStyle: textElement.style.fontStyle,
                        textDecoration: textElement.style.textDecoration,
                        textAlign: textElement.style.textAlign,
                        textTransform: textElement.style.textTransform,
                        color: textElement.style.color,
                        opacity: textElement.style.opacity,
                        bubbleOpacity: textBubble.style.getPropertyValue('--bubble-opacity') || '1',
                        bubbleBackgroundColor: textBubble.style.getPropertyValue('--bubble-background-color') || 'white',
                        textShadow: textElement.style.textShadow,
                        lineHeight: textElement.style.lineHeight || 'normal',
                        hasOutline: textElement.dataset.hasOutline === 'true',
                        outlineWidth: textElement.style.getPropertyValue('--outline-width') || '2px',
                        outlineColor: textElement.style.getPropertyValue('--outline-color') || '#000000',
                        textContentPadding: textElement.style.padding // Save text content padding
                    }
                });
            });
            
            return panelState;
        });

        // Save sticker states
        const stickers = Array.from(document.querySelectorAll('.canvas-sticker-image'));
        currentPage.stickerStates = stickers.map(sticker => ({
            id: sticker.id,
            imageId: sticker.dataset.imageId,
            left: sticker.style.left,
            top: sticker.style.top,
            width: sticker.style.width,
            height: sticker.style.height,
            transform: sticker.style.transform,
            rotation: sticker.dataset.rotation || '0',
            zIndex: sticker.style.zIndex,
            size: sticker.dataset.size,
            isFlippedHorizontally: sticker.dataset.isFlippedHorizontally === 'true'
        }));

        // Save canvas background style
        const canvas = document.querySelector('#comic-canvas');
        if (canvas) {
            const backgroundClasses = [
                'classic-white', 'vintage-paper', 'dotted-pattern',
                'halftone', 'graph-paper', 'gradient-fade'
            ];
            
            // Find current background style
            const currentStyle = Array.from(canvas.classList)
                .find(cls => backgroundClasses.includes(cls)) || 'classic-white';
            
            // If global background is enabled, update global style
            if (this.useGlobalBackgroundStyle) {
                this.globalBackgroundStyle = currentStyle;
                // Set this style for all pages
                this.pages.forEach(page => {
                    page.canvasBackgroundStyle = currentStyle;
                });
            } else {
                // Only update current page's background style
                currentPage.canvasBackgroundStyle = currentStyle;
            }
            
            // Save canvas text elements (text bubbles directly on the canvas, not inside panels)
            const canvasTextBubbles = Array.from(canvas.querySelectorAll(':scope > .text-bubble'));
            if (canvasTextBubbles.length > 0) {
                console.log(`Saving ${canvasTextBubbles.length} canvas text elements`);
                
                currentPage.canvasTextElements = canvasTextBubbles.map(textBubble => {
                    const textElement = textBubble.querySelector('.text-content');
                    
                    // Extract the class names for bubble type
                    const bubbleClasses = Array.from(textBubble.classList)
                        .filter(cls => ['speech-bubble', 'thought-bubble', 'caption-box', 
                                      'shout-bubble', 'whisper-bubble', 'jagged-bubble', 
                                      'no-bubble'].includes(cls));
                    
                    // Extract tail position class
                    const tailPositionClass = Array.from(textBubble.classList)
                        .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));
                    
                    return {
                        id: textBubble.id || `canvas_text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                        previousBubbleType: textBubble.dataset.previousBubbleType || '',
                        tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                        content: textElement.innerHTML,
                        style: {
                            left: textBubble.style.left,
                            top: textBubble.style.top,
                            // Only save width/height if they are explicitly set
                            ...(textBubble.style.width && { width: textBubble.style.width }),
                            ...(textBubble.style.height && { height: textBubble.style.height }),
                            transform: textBubble.style.transform,
                            zIndex: textBubble.style.zIndex,
                            fontSize: textElement.style.fontSize,
                            fontFamily: textElement.style.fontFamily,
                            fontWeight: textElement.style.fontWeight,
                            fontStyle: textElement.style.fontStyle,
                            textDecoration: textElement.style.textDecoration,
                            textAlign: textElement.style.textAlign,
                            textTransform: textElement.style.textTransform,
                            color: textElement.style.color,
                            opacity: textElement.style.opacity,
                            bubbleOpacity: textBubble.style.getPropertyValue('--bubble-opacity') || '1',
                            bubbleBackgroundColor: textBubble.style.getPropertyValue('--bubble-background-color') || 'white',
                            textShadow: textElement.style.textShadow,
                            lineHeight: textElement.style.lineHeight || 'normal',
                            hasOutline: textElement.dataset.hasOutline === 'true',
                            outlineWidth: textElement.style.getPropertyValue('--outline-width') || '2px',
                            outlineColor: textElement.style.getPropertyValue('--outline-color') || '#000000',
                            textContentPadding: textElement.style.padding || '2.5px 2px 5px 2px' // Save text content padding
                        }
                    };
                });
            } else {
                // Ensure canvasTextElements is at least an empty array when no canvas text
                currentPage.canvasTextElements = [];
            }
        }
        
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
                    if (this.currentPanel) {
                        this.addTextToPanel(this.currentPanel);
                    } else {
                        // If no panel selected in panels mode, show modal
                        this.showSelectPanelModal();
                    }
                    break;
                case 'backgrounds':
                case 'stickers':
                    // Add text directly to canvas in backgrounds or stickers mode
                    this.addTextToCanvas(); 
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
        const panelAreaWidth = 620;
        const panelAreaHeight = 620;
        const panelGap = 12;

        // Create panels according to the layout
        layoutConfig.panels.forEach(panel => {
            const div = document.createElement('div');
            div.className = 'comic-panel';
            
            // Calculate base positions
            const baseX = panel.x * panelAreaWidth / 100;
            const baseY = panel.y * panelAreaHeight / 100;
            const baseWidth = panel.width * panelAreaWidth / 100;
            const baseHeight = panel.height * panelAreaHeight / 100;

            // Add spacing between panels
            const adjustedX = baseX + 40 + (panel.x > 0 ? panelGap / 2 : 0);
            const adjustedY = baseY + 40 + (panel.y > 0 ? panelGap / 2 : 0);
            const adjustedWidth = baseWidth - panelGap;
            const adjustedHeight = baseHeight - panelGap;
            
            div.style.left = adjustedX + 'px';
            div.style.top = adjustedY + 'px';
            div.style.width = adjustedWidth + 'px';
            div.style.height = adjustedHeight + 'px';
            
            canvas.appendChild(div);
        });

        // Apply default background style if no layout is provided
        if (!layout) {
            this.applyBackgroundStyle('classic-white');
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
        this.updateRightSidebarView();
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

        // Create comic structure first
        this.createComic(layoutConfig);

        // Set canvas background style
        if (comicCanvas) {
            comicCanvas.className = ''; // Clear existing classes
            if (this.useGlobalBackgroundStyle) {
                comicCanvas.classList.add(this.globalBackgroundStyle);
            } else if (page.canvasBackgroundStyle) {
                comicCanvas.classList.add(page.canvasBackgroundStyle);
            } else {
                comicCanvas.classList.add('classic-white');
            }
        }

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
        if (panelStates.length > 0) {
            const processablePanels = Math.min(panels.length, panelStates.length);
            console.log(`Restoring ${processablePanels} panel states`);
            
            for (let index = 0; index < processablePanels; index++) {
                const panel = panels[index];
                const state = panelStates[index];
                
                // Check if state exists before accessing its properties
                if (state) { 
                    if (state.backgroundStyle) {
                        panel.dataset.backgroundStyle = state.backgroundStyle;
                    }
                    
                    // Restore image if present (Check state AND state.imageId)
                    if (state.imageId) { 
                        const image = this.imageLibrary.getImageById(String(state.imageId));
                        if (image) {
                            const img = document.createElement('img');
                            img.src = image.dataUrl || image.src;
                            img.alt = image.name;
                            img.draggable = false;
                            img.dataset.imageId = state.imageId;
                            
                            Object.assign(img.style, {
                                position: 'absolute',
                                left: state.left || '50%',
                                top: state.top || '50%',
                                transform: state.transform || 'translate(-50%, -50%) scale(1)'
                            });
                            
                            panel.appendChild(img);
                            panel.classList.add('has-image');
                            
                            if (state.initialScale) panel.dataset.initialScale = state.initialScale;
                            if (state.currentScale) panel.dataset.currentScale = state.currentScale;
                            if (state.rotation) panel.dataset.rotation = state.rotation;
                            if (typeof state.isFlippedHorizontally === 'boolean') {
                                panel.dataset.isFlippedHorizontally = state.isFlippedHorizontally.toString();
                                // If flipped, ensure scaleX(-1) is in the transform
                                if (state.isFlippedHorizontally && !img.style.transform.includes('scaleX(-1)')) {
                                    img.style.transform = `${img.style.transform} scaleX(-1)`;
                                }
                            }
                            
                            this.dragAndDropManager.setupImageDragging(img);
                        } else {
                             console.warn(`Panel image ID ${state.imageId} not found in loaded images.`);
                        }
                    }

                    // Restore text elements if any (Check state AND state.textElements)
                    if (state.textElements) {
                        state.textElements.forEach(textState => {
                            const textBubble = document.createElement('div');
                            textBubble.className = 'text-bubble';
                            textBubble.id = textState.id;
                            textBubble.dataset.bubbleType = textState.bubbleType;
                            textBubble.dataset.previousBubbleType = textState.previousBubbleType;
                            textBubble.dataset.tailPosition = textState.tailPosition;
                            
                            const textContent = document.createElement('div');
                            textContent.className = 'text-content';
                            textContent.contentEditable = true; // Make text editable
                            textContent.innerHTML = textState.content;
                            textContent.style.outline = 'none';
                            textContent.style.wordWrap = 'break-word';
                            textContent.style.color = '#000000'; // Set default text color to black
                            textContent.style.padding = '2.5px 2px 5px 2px'; // Reduced top padding by 50%
                            
                            // Apply bubble styling
                            textBubble.classList.add(textState.bubbleType || 'speech-bubble');
                            
                            // Apply tail position classes if they exist
                            if (textState.tailPosition) {
                                const tailClass = `${textState.bubbleType.split('-')[0]}-tail-${textState.tailPosition}`;
                                textBubble.classList.add(tailClass);
                            }
                            
                            // Ensure position values are in pixels (convert from % if needed)
                            let leftValue = textState.style.left || '10px';
                            let topValue = textState.style.top || '10px';
                            
                            // Convert percentage to pixels if needed
                            if (leftValue.endsWith('%')) {
                                const panel = document.querySelectorAll('.comic-panel')[index];
                                if (panel) {
                                    const panelWidth = panel.offsetWidth;
                                    const percentValue = parseFloat(leftValue);
                                    leftValue = `${(percentValue / 100) * panelWidth}px`;
                                }
                            }
                            
                            if (topValue.endsWith('%')) {
                                const panel = document.querySelectorAll('.comic-panel')[index];
                                if (panel) {
                                    const panelHeight = panel.offsetHeight;
                                    const percentValue = parseFloat(topValue);
                                    topValue = `${(percentValue / 100) * panelHeight}px`;
                                }
                            }
                            
                            // Apply styles directly with pixel positions
                            Object.assign(textBubble.style, {
                                position: 'absolute',
                                left: leftValue,
                                top: topValue,
                                width: textState.style.width || 'auto',
                                height: textState.style.height || 'auto',
                                transform: textState.style.transform || 'none',
                                padding: textState.style.padding || '2.5px' // Restore padding
                            });
                            
                            // Apply text content styles
                            Object.assign(textContent.style, {
                                fontFamily: textState.style.fontFamily,
                                fontSize: textState.style.fontSize,
                                fontWeight: textState.style.fontWeight,
                                fontStyle: textState.style.fontStyle,
                                textDecoration: textState.style.textDecoration,
                                textAlign: textState.style.textAlign,
                                textTransform: textState.style.textTransform,
                                color: textState.style.color,
                                opacity: textState.style.opacity,
                                textShadow: textState.style.textShadow,
                                lineHeight: textState.style.lineHeight || 'normal',
                                padding: textState.style.textContentPadding || '2.5px 2px 5px 2px' // Restore text content padding with default
                            });
                            
                            // Set bubble background color from saved state (fallback to white if not set)
                            textBubble.style.setProperty('--bubble-background-color', 
                                textState.style.bubbleBackgroundColor || textState.style.backgroundColor || 'white');
                            
                            // Set bubble opacity if saved
                            if (textState.style.bubbleOpacity) {
                                textBubble.style.setProperty('--bubble-opacity', textState.style.bubbleOpacity);
                            }
                            
                            if (textState.style.hasOutline) {
                                textContent.dataset.hasOutline = 'true';
                                textContent.style.setProperty('--outline-width', textState.style.outlineWidth);
                                textContent.style.setProperty('--outline-color', textState.style.outlineColor);
                            }
                            
                            // Add drag handle
                            const dragHandle = document.createElement('div');
                            dragHandle.className = 'drag-handle';
                            dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
                            dragHandle.title = 'Drag to move';
                            
                            // Add resize handle
                            const resizeHandle = document.createElement('div');
                            resizeHandle.className = 'resize-handle';
                            resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
                            resizeHandle.title = 'Drag to resize';
                            
                            // Add edit formatting button
                            const formatButton = document.createElement('div');
                            formatButton.className = 'format-text-btn';
                            formatButton.innerHTML = '<i class="fas fa-palette"></i>';
                            formatButton.title = 'Format text';
                            
                            // Add delete button
                            const deleteButton = document.createElement('div');
                            deleteButton.className = 'delete-text-btn';
                            deleteButton.innerHTML = '<i class="fas fa-times"></i>';
                            deleteButton.title = 'Delete text';
                            
                            // Append elements
                            textBubble.appendChild(textContent);
                            textBubble.appendChild(dragHandle);
                            textBubble.appendChild(resizeHandle);
                            textBubble.appendChild(formatButton);
                            textBubble.appendChild(deleteButton);
                            panel.appendChild(textBubble);
                            
                            // Make draggable
                            this.dragAndDropManager.makeTextDraggable(textBubble, dragHandle);
                            
                            // Make resizable
                            this.dragAndDropManager.makeTextResizable(textBubble, resizeHandle);
                            
                            // Setup delete functionality
                            deleteButton.addEventListener('click', () => {
                                textBubble.remove();
                                
                                // Hide the formatting popup if open
                                const popup = document.getElementById('text-format-popup');
                                if (popup) popup.style.display = 'none';
                                
                                // Hide properties panel
                                document.getElementById('text-properties').style.display = 'none';
                            });
                            
                            // Setup formatting button
                            formatButton.addEventListener('click', (e) => {
                                this.showTextFormatPopup(textBubble, e);
                            });
                            
                            // Setup text selection
                            textBubble.addEventListener('click', (e) => {
                                if (e.target !== textContent && !e.target.closest('.format-text-btn') && 
                                    !e.target.closest('.resize-handle') && !e.target.closest('.delete-text-btn')) {
                                    this.selectTextBox(textBubble);
                                    
                                    // Prevent the event from propagating to avoid deselection
                                    e.stopPropagation();
                                }
                            });
                            
                            // Add a second click listener to the text element that lets the contentEditable work
                            // but also selects the text bubble when clicked on the edge/padding of the text element
                            textContent.addEventListener('click', (e) => {
                                // Calculate if the click is near the edge of the text element (within 10px of the border)
                                const rect = textContent.getBoundingClientRect();
                                const isNearEdge = 
                                    e.clientX - rect.left < 10 || 
                                    rect.right - e.clientX < 10 || 
                                    e.clientY - rect.top < 10 || 
                                    rect.bottom - e.clientY < 10;
                                    
                                if (isNearEdge) {
                                    // If clicking near the edge, select the text box but don't interfere with editing
                                    this.selectTextBox(textBubble);
                                    // Don't prevent default so text editing still works
                                }
                            });
                        });
                    } else {
                        // Log if a panel state entry was null/undefined
                        console.warn(`Panel state at index ${index} is null or undefined. Skipping restoration for this panel.`);
                    }
                } else {
                    // Log if a panel state entry was null/undefined
                    console.warn(`Panel state at index ${index} is null or undefined. Skipping restoration for this panel.`);
                }
            } // End for loop
        } // End if (panelStates.length > 0)

        // Restore stickers
        if (stickerStates.length > 0) {
            stickerStates.forEach(state => {
                const image = this.imageLibrary.getImageById(String(state.imageId));
                if (image) {
                    const stickerImg = document.createElement('img');
                    stickerImg.src = image.src;
                    stickerImg.alt = image.name || 'Sticker';
                    stickerImg.className = 'canvas-sticker-image';
                    stickerImg.id = state.id;
                    stickerImg.dataset.imageId = state.imageId;
                    
                    Object.assign(stickerImg.style, {
                        position: 'absolute',
                        left: state.left || '0px',
                        top: state.top || '0px',
                        width: state.width || '100px',
                        height: state.height || 'auto',
                        transform: state.transform || 'scale(1)',
                        zIndex: state.zIndex || '1'
                    });
                    
                    if (state.size) stickerImg.dataset.size = state.size;
                    if (state.rotation) stickerImg.dataset.rotation = state.rotation;
                    if (typeof state.isFlippedHorizontally === 'boolean') {
                        stickerImg.dataset.isFlippedHorizontally = state.isFlippedHorizontally.toString();
                        // If flipped, ensure scaleX(-1) is in the transform
                        if (state.isFlippedHorizontally && !stickerImg.style.transform.includes('scaleX(-1)')) {
                            stickerImg.style.transform = `${stickerImg.style.transform} scaleX(-1)`;
                        }
                    }
                    
                    comicCanvas.appendChild(stickerImg);
                    this.dragAndDropManager.makeStickerDraggable(stickerImg);
                    
                    stickerImg.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectSticker(stickerImg);
                    });
                }
            });
        }

        // ---> NEW: Restore canvas text elements
        const canvasTextStates = page.canvasTextElements || [];
        if (canvasTextStates.length > 0) {
            console.log(`Restoring ${canvasTextStates.length} canvas text elements`);
            canvasTextStates.forEach(textState => {
                const textBubble = document.createElement('div');
                textBubble.className = 'text-bubble';
                textBubble.id = textState.id;
                textBubble.dataset.bubbleType = textState.bubbleType;
                textBubble.dataset.previousBubbleType = textState.previousBubbleType;
                textBubble.dataset.tailPosition = textState.tailPosition;

                const textContent = document.createElement('div');
                textContent.className = 'text-content';
                textContent.contentEditable = true;
                textContent.innerHTML = textState.content;
                textContent.style.outline = 'none';
                textContent.style.wordWrap = 'break-word';

                // Apply bubble styling
                textBubble.classList.add(textState.bubbleType || 'speech-bubble');
                if (textState.tailPosition) {
                    const tailClass = `${textState.bubbleType.split('-')[0]}-tail-${textState.tailPosition}`;
                    textBubble.classList.add(tailClass);
                }

                // Apply styles directly (important: uses pixel values for left/top)
                // Use a temporary object to handle potential missing style properties gracefully
                const bubbleStyle = textState.style || {};
                
                // Ensure position values are in pixels (convert from % if needed)
                let leftValue = bubbleStyle.left || '10px';
                let topValue = bubbleStyle.top || '10px';
                
                // Convert percentage to pixels if needed
                if (leftValue.endsWith('%')) {
                    const canvasWidth = comicCanvas.offsetWidth;
                    const percentValue = parseFloat(leftValue);
                    leftValue = `${(percentValue / 100) * canvasWidth}px`;
                }
                
                if (topValue.endsWith('%')) {
                    const canvasHeight = comicCanvas.offsetHeight;
                    const percentValue = parseFloat(topValue);
                    topValue = `${(percentValue / 100) * canvasHeight}px`;
                }
                
                // Apply styles with pixel positions
                Object.assign(textBubble.style, {
                    position: 'absolute', // Canvas text is always absolute
                    left: leftValue,
                    top: topValue,
                    width: bubbleStyle.width || 'auto',
                    height: bubbleStyle.height || 'auto',
                    transform: bubbleStyle.transform || 'none',
                    zIndex: bubbleStyle.zIndex || '10', // Default z-index above panels/stickers
                    padding: bubbleStyle.padding || '10px' // Restore padding
                });

                // Apply text content styles
                    Object.assign(textContent.style, {
                    fontFamily: bubbleStyle.fontFamily,
                    fontSize: bubbleStyle.fontSize,
                    fontWeight: bubbleStyle.fontWeight,
                    fontStyle: bubbleStyle.fontStyle,
                    textDecoration: bubbleStyle.textDecoration,
                    textAlign: bubbleStyle.textAlign,
                    textTransform: bubbleStyle.textTransform,
                    color: bubbleStyle.color,
                    opacity: bubbleStyle.opacity,
                    textShadow: bubbleStyle.textShadow,
                    lineHeight: bubbleStyle.lineHeight || 'normal',
                    padding: bubbleStyle.textContentPadding || '2.5px 2px 5px 2px' // Reduced top padding by 50%
                });

                // Restore bubble background and opacity
                textBubble.style.setProperty('--bubble-background-color',
                    bubbleStyle.bubbleBackgroundColor || bubbleStyle.backgroundColor || 'white');
                if (bubbleStyle.bubbleOpacity) {
                    textBubble.style.setProperty('--bubble-opacity', bubbleStyle.bubbleOpacity);
                }

                // Restore outline if present
                if (bubbleStyle.hasOutline) {
                    textContent.dataset.hasOutline = 'true';
                    textContent.style.setProperty('--outline-width', bubbleStyle.outlineWidth || '2px');
                    textContent.style.setProperty('--outline-color', bubbleStyle.outlineColor || '#000000');
                    // Ensure outline text gets rendered correctly initially
                    this.applyTextOutline(textContent, bubbleStyle.outlineColor, bubbleStyle.outlineWidth);
                }

                // Add handles and buttons (same as panel text)
                const dragHandle = document.createElement('div');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
                dragHandle.title = 'Drag to move';

                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
                resizeHandle.title = 'Drag to resize';

                const formatButton = document.createElement('div');
                formatButton.className = 'format-text-btn';
                formatButton.innerHTML = '<i class="fas fa-palette"></i>';
                formatButton.title = 'Format text';

                const deleteButton = document.createElement('div');
                deleteButton.className = 'delete-text-btn';
                deleteButton.innerHTML = '<i class="fas fa-times"></i>';
                deleteButton.title = 'Delete text';

                // Append elements
                textBubble.appendChild(textContent);
                textBubble.appendChild(dragHandle);
                textBubble.appendChild(resizeHandle);
                textBubble.appendChild(formatButton);
                textBubble.appendChild(deleteButton);

                // Append to the main canvas, NOT a panel
                comicCanvas.appendChild(textBubble);

                // Add event listeners (same as panel text)
                this.dragAndDropManager.makeCanvasTextDraggable(textBubble, dragHandle);
                // Note: Resizing for canvas text might need review based on implementation
                this.dragAndDropManager.makeTextResizable(textBubble, resizeHandle); 

                deleteButton.addEventListener('click', () => {
                    textBubble.remove();
                    const popup = document.getElementById('text-format-popup');
                    if (popup) popup.style.display = 'none';
                    // Also hide properties if this text was selected
                     if (this.selectedElement === textBubble) {
                         document.getElementById('text-properties').style.display = 'none';
                         this.selectedElement = null; 
                         this.updateRightSidebarView(); // Update sidebar
                     }
                });

                formatButton.addEventListener('click', (e) => {
                    this.showTextFormatPopup(textBubble, e);
                });

                textBubble.addEventListener('click', (e) => {
                     // Prevent selecting when clicking buttons/handles inside
                    if (e.target.closest('.drag-handle, .resize-handle, .format-text-btn, .delete-text-btn')) {
                         return; 
                    }
                    // Select if clicking the bubble itself but not the editable content area directly
                    if (e.target === textBubble || e.target === textBubble.querySelector('.text-content-outline')) {
                        this.selectTextBox(textBubble);
                        e.stopPropagation();
                    }
                });

                textContent.addEventListener('click', (e) => {
                    // When clicking the text content, ensure it's selected for property panel updates
                        this.selectTextBox(textBubble);
                    // Don't stop propagation here, allow contentEditable focus
                 });

                 textContent.addEventListener('blur', () => {
                     // Update saved state on blur maybe?
                     // this.saveCurrentPageState(); // Potentially too frequent
                 });

                 textContent.addEventListener('input', () => {
                     // Update outline text if necessary
                     this.updateOutlineText(textContent);
                 });

            }); // End canvasTextStates.forEach
        } // End if(canvasTextStates.length > 0)
        // <--- END NEW

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

   
    applyBackgroundStyle(style) {
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) return;

        // Remove any existing background classes
        const backgroundClasses = [
            'classic-white', 'vintage-paper', 'dotted-pattern',
            'halftone', 'graph-paper', 'gradient-fade'
        ];
        canvas.classList.remove(...backgroundClasses);
        
        // Add the new style class
        canvas.classList.add(style);

        // Update current page state
        const currentPage = this.pages[this.currentPageIndex];
        if (currentPage) {
            currentPage.canvasBackgroundStyle = style;
        }

        // If global background is enabled, apply to all pages
        if (this.useGlobalBackgroundStyle) {
            this.globalBackgroundStyle = style;
            this.pages.forEach(page => {
                page.canvasBackgroundStyle = style;
            });
        }

        // Save the current state
        this.saveCurrentPageState();
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

    addTextToPanel(panel) {
        // Create text container with default speech bubble
        const textId = `text_${Date.now()}`;
        const textContainer = document.createElement('div');
        textContainer.className = 'text-bubble speech-bubble';
        textContainer.id = textId;
        textContainer.dataset.bubbleType = 'speech-bubble';
        textContainer.style.position = 'absolute';
        // Use pixels, position near panel center initially
        const panelRect = panel.getBoundingClientRect(); 
        // Use clientWidth/Height which includes padding
        const initialLeft = Math.max(0, (panel.clientWidth / 2) - 50); // Approx center minus half default width
        const initialTop = Math.max(0, (panel.clientHeight / 2) - 25); // Approx center minus half default height
        textContainer.style.left = `${initialLeft}px`; 
        textContainer.style.top = `${initialTop}px`;
        // textContainer.style.transform = 'translate(-50%, -50%)'; // No longer using transform for centering
        textContainer.style.minWidth = '100px';
        textContainer.style.minHeight = '50px';
        textContainer.style.padding = '10px';
        textContainer.style.zIndex = '10';
        
        // Create editable text element
        const textElement = document.createElement('div');
        textElement.className = 'text-content';
        textElement.contentEditable = true;
        textElement.innerHTML = 'Click to edit text';
        textElement.style.outline = 'none';
        textElement.style.wordWrap = 'break-word';
        textElement.style.color = '#000000'; // Set default text color to black
        textElement.style.padding = '2.5px 2px 5px 2px'; // Reduced top padding by 50%
        
        // Add drag handle for better usability
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
        dragHandle.title = 'Drag to move';
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        resizeHandle.title = 'Drag to resize';
        
        // Add edit formatting button
        const formatButton = document.createElement('div');
        formatButton.className = 'format-text-btn';
        formatButton.innerHTML = '<i class="fas fa-palette"></i>';
        formatButton.title = 'Format text';
        
        // Add delete button
        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-text-btn';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.title = 'Delete text';
        
        // Append elements
        textContainer.appendChild(textElement);
        textContainer.appendChild(dragHandle);
        textContainer.appendChild(resizeHandle);
        textContainer.appendChild(formatButton);
        textContainer.appendChild(deleteButton);
        panel.appendChild(textContainer);
        
        // Make draggable
        this.dragAndDropManager.makeTextDraggable(textContainer, dragHandle);
        
        // Make resizable
        this.dragAndDropManager.makeTextResizable(textContainer, resizeHandle);
        
        // Setup delete functionality
        deleteButton.addEventListener('click', () => {
            textContainer.remove();
            
            // Hide the formatting popup if open
            const popup = document.getElementById('text-format-popup');
            if (popup) popup.style.display = 'none';
            
            // Hide properties panel
            document.getElementById('text-properties').style.display = 'none';
        });
        
        // Setup formatting button
        formatButton.addEventListener('click', (e) => {
            this.showTextFormatPopup(textContainer, e);
        });
        
        // Setup text selection
        textContainer.addEventListener('click', (e) => {
            if (e.target !== textElement && !e.target.closest('.format-text-btn') && 
                !e.target.closest('.resize-handle') && !e.target.closest('.delete-text-btn')) {
                this.selectTextBox(textContainer);
                
                // Prevent the event from propagating to avoid deselection
                e.stopPropagation();
            }
        });
        
        // Add a second click listener to the text element that lets the contentEditable work
        // but also selects the text bubble when clicked on the edge/padding of the text element
        textElement.addEventListener('click', (e) => {
            // Calculate if the click is near the edge of the text element (within 10px of the border)
            const rect = textElement.getBoundingClientRect();
            const isNearEdge = 
                e.clientX - rect.left < 10 || 
                rect.right - e.clientX < 10 || 
                e.clientY - rect.top < 10 || 
                rect.bottom - e.clientY < 10;
                
            if (isNearEdge) {
                // If clicking near the edge, select the text box but don't interfere with editing
                this.selectTextBox(textContainer);
                // Don't prevent default so text editing still works
            }
        });
        
        // Automatically select the new text box
        this.selectTextBox(textContainer);
        
        return textContainer;
    }
    

    
    
    
    selectTextBox(textBox) {
        // Deselect any previously selected text box (visually)
        document.querySelectorAll('.text-bubble').forEach(box => {
            box.classList.remove('selected-text');
        });
        
        // Select the current text box
        textBox.classList.add('selected-text');
        this.currentTextBox = textBox;
        
        // Ensure the correct properties panel is visible
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) {
            console.error('Error: Main properties panel (.properties-panel) not found.');
            return;
        }

        // Hide all other property sections first
        propertiesPanel.querySelectorAll('.properties-section').forEach(sec => {
            sec.style.display = 'none';
        });

        // Find or create the text properties container
        let textProperties = propertiesPanel.querySelector('#text-properties');
        if (!textProperties) { 
            console.log('#text-properties not found, creating it.');
            textProperties = document.createElement('div');
            textProperties.id = 'text-properties';
            textProperties.className = 'properties-section'; // Add class for consistency
            propertiesPanel.appendChild(textProperties);
        }
        
        // Show the text properties panel
        textProperties.style.display = 'block';
        
        // Update properties panel content
        this.updateTextProperties(textBox); // Pass the textBox, updateTextProperties finds the container by ID
    }
    
    updateTextProperties(textBox) {
        const textProperties = document.getElementById('text-properties');
        if (!textProperties) { // Add check here too for safety
             console.error('Error: Text properties panel (#text-properties) not found in updateTextProperties.');
            return;
        }
        
        // Define textElement and computedStyle BEFORE using them in the template literal
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) {
            console.error("Could not find '.text-content' inside the provided textBox element.", textBox);
            textProperties.innerHTML = '<p>Error loading text properties.</p>'; 
            return;
        }
        const computedStyle = window.getComputedStyle(textElement);
        
        textProperties.innerHTML = `
            <h4>Text Settings</h4>
            <div class="text-controls">
                <div class="control-group">
                    <label>Bubble Style</label>
                    <select class="bubble-type">
                        <option value="speech-bubble">Speech Bubble</option>
                        <option value="thought-bubble">Thought Bubble</option>
                        <option value="caption-box">Caption/Narration</option>
                        <option value="shout-bubble">Shout Bubble</option>
                        <option value="whisper-bubble">Whisper Bubble</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Font</label>
                    <div class="custom-select">
                    <select class="font-family">
                            <option disabled class="font-category">Common Fonts</option>
                            <option value="Arial" class="font-option">
                                <span class="font-preview font-arial">Arial - Comic Text</span>
                            </option>
                            <option value="Comic Sans MS" class="font-option">
                                <span class="font-preview font-comic-sans">Comic Sans MS - Comic Text</span>
                            </option>
                            <option value="Times New Roman" class="font-option">
                                <span class="font-preview font-times">Times New Roman - Comic Text</span>
                            </option>
                            
                            <option disabled class="font-category">Sound Effects</option>
                            <option value="Impact" class="font-option">
                                <span class="font-preview font-impact">Impact - BOOM!</span>
                            </option>
                            <option value="Bangers" class="font-option">
                                <span class="font-preview font-bangers">Bangers - POW!</span>
                            </option>
                            <option value="Anton" class="font-option">
                                <span class="font-preview font-anton">Anton - CRASH!</span>
                            </option>
                            <option value="Russo One" class="font-option">
                                <span class="font-preview font-russo-one">Russo One - WHAM!</span>
                            </option>
                            <option value="Fredoka One" class="font-option">
                                <span class="font-preview font-fredoka-one">Fredoka One - SPLASH!</span>
                            </option>
                            
                            <option disabled class="font-category">Handwriting Styles</option>
                            <option value="Comic Neue" class="font-option">
                                <span class="font-preview font-comic-neue">Comic Neue - Casual</span>
                            </option>
                            <option value="Permanent Marker" class="font-option">
                                <span class="font-preview font-permanent-marker">Permanent Marker</span>
                            </option>
                            <option value="Gloria Hallelujah" class="font-option">
                                <span class="font-preview font-gloria-hallelujah">Gloria Hallelujah</span>
                            </option>
                            <option value="Architects Daughter" class="font-option">
                                <span class="font-preview font-architects-daughter">Architects Daughter</span>
                            </option>
                            <option value="Shadows Into Light" class="font-option">
                                <span class="font-preview font-shadows-into-light">Shadows Into Light</span>
                            </option>
                            
                            <option disabled class="font-category">Title/Header Fonts</option>
                            <option value="Luckiest Guy" class="font-option">
                                <span class="font-preview font-luckiest-guy">Luckiest Guy</span>
                            </option>
                            <option value="Boogaloo" class="font-option">
                                <span class="font-preview font-boogaloo">Boogaloo</span>
                            </option>
                            <option value="Acme" class="font-option">
                                <span class="font-preview font-acme">Acme</span>
                            </option>
                            <option value="Press Start 2P" class="font-option">
                                <span class="font-preview font-press-start-2p">Press Start 2P</span>
                            </option>
                    </select>
                    </div>
                </div>
                <div class="control-group">
                    <label>Size</label>
                    <input type="range" class="font-size" min="8" max="36" value="16">
                    <span class="font-size-value">16px</span>
                </div>
                <div class="control-group">
                    <label>Text Color</label>
                    <div class="color-picker-container">
                        <input type="color" class="font-color" value="#000000">
                        <div class="hex-display font-color-hex">#000000</div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Bubble Color</label>
                    <div class="color-picker-container">
                        <input type="color" class="bubble-color" value="#ffffff">
                        <div class="hex-display bubble-color-hex">#ffffff</div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Text Style</label>
                    <div class="text-style-buttons">
                        <button class="style-btn bold-btn ${textElement.style.fontWeight === 'bold' ? 'active' : ''}" title="Bold">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="style-btn italic-btn ${textElement.style.fontStyle === 'italic' ? 'active' : ''}" title="Italic">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button class="style-btn underline-btn ${textElement.style.textDecoration === 'underline' ? 'active' : ''}" title="Underline">
                            <i class="fas fa-underline"></i>
                        </button>
                        <button class="style-btn all-caps-btn ${textElement.style.textTransform === 'uppercase' ? 'active' : ''}" title="All Caps">
                            <i class="fas fa-font"></i>
                        </button>
                    </div>
                </div>
                <div class="control-group">
                    <label>Rotation</label>
                    <input type="range" class="rotation" min="-180" max="180" value="0">
                    <span class="rotation-value">0°</span>
                </div>
            </div>
        `;
        
        // Set initial values based on the current text box
        const bubbleType = textProperties.querySelector('.bubble-type');
        bubbleType.value = textBox.dataset.bubbleType || 'speech-bubble';
        
        const fontFamily = textProperties.querySelector('.font-family');
        fontFamily.value = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '') || 'Arial';
        
        const fontSize = textProperties.querySelector('.font-size');
        const fontSizeValue = parseInt(computedStyle.fontSize) || 16;
        fontSize.value = fontSizeValue;
        textProperties.querySelector('.font-size-value').textContent = `${fontSizeValue}px`;
        
        const fontColor = textProperties.querySelector('.font-color');
        const fontColorHex = textProperties.querySelector('.font-color-hex');
        // Use imported function directly
        const fontColorValue = globalRgbToHex(computedStyle.color) || '#000000'; 
        fontColor.value = fontColorValue;
        fontColorHex.textContent = fontColorValue;
        
        const bubbleColor = textProperties.querySelector('.bubble-color');
        const bubbleColorHex = textProperties.querySelector('.bubble-color-hex');
        // Use imported function directly
        const bubbleColorValue = globalRgbToHex(window.getComputedStyle(textBox).backgroundColor) || '#ffffff'; 
        bubbleColor.value = bubbleColorValue;
        bubbleColorHex.textContent = bubbleColorValue;
        
        const rotation = textProperties.querySelector('.rotation');
        const transform = textBox.style.transform;
        const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
        const rotationValue = rotateMatch ? parseFloat(rotateMatch[1]) : 0;
        rotation.value = rotationValue;
        textProperties.querySelector('.rotation-value').textContent = `${rotationValue}°`;
        
        // Add event listeners for property changes
        bubbleType.addEventListener('change', () => {
            // Remove all bubble type classes
            textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble');
            // Add the selected class
            textBox.classList.add(bubbleType.value);
            textBox.dataset.bubbleType = bubbleType.value;
            
            // Save state after changing bubble type
            this.saveCurrentPageState();
        });
        
        fontFamily.addEventListener('change', () => {
            textElement.style.fontFamily = fontFamily.value;
            
            // Save state after changing font family
            this.saveCurrentPageState();
        });
        
        fontSize.addEventListener('input', () => {
            textElement.style.fontSize = `${fontSize.value}px`;
            textProperties.querySelector('.font-size-value').textContent = `${fontSize.value}px`;
            
            // Save state after changing font size
            this.saveCurrentPageState();
        });
        
        fontColor.addEventListener('input', () => {
            textElement.style.color = fontColor.value;
            fontColorHex.textContent = fontColor.value.toUpperCase();
            
            // Save state after changing font color
            this.saveCurrentPageState();
        });
        
        // Allow user to enter hex color directly
        fontColorHex.contentEditable = true;
        fontColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Validate hex format
                const hexValue = fontColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    fontColor.value = hexValue;
                    textElement.style.color = hexValue;
                    this.saveCurrentPageState();
        } else {
                    // Reset to current value if invalid
                    fontColorHex.textContent = fontColor.value.toUpperCase();
                }
                fontColorHex.blur();
            }
        });
        fontColorHex.addEventListener('blur', () => {
            // Validate hex format when user clicks away
            const hexValue = fontColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                fontColor.value = hexValue;
                textElement.style.color = hexValue;
                this.saveCurrentPageState();
            } else {
                // Reset to current value if invalid
                fontColorHex.textContent = fontColor.value.toUpperCase();
            }
        });
        
        bubbleColor.addEventListener('input', () => {
            // Set both the background color and the CSS variable for the ::before element
            textBox.style.backgroundColor = bubbleColor.value;
            textBox.style.setProperty('--bubble-background-color', bubbleColor.value);
            bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
            
            // Save state after changing bubble color
            this.saveCurrentPageState();
        });
        
        // Allow user to enter hex color directly for bubble color
        bubbleColorHex.contentEditable = true;
        bubbleColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Validate hex format
                const hexValue = bubbleColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    bubbleColor.value = hexValue;
                    textBox.style.backgroundColor = hexValue;
                    textBox.style.setProperty('--bubble-background-color', hexValue);
                    this.saveCurrentPageState();
                } else {
                    // Reset to current value if invalid
                    bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
                }
                bubbleColorHex.blur();
            }
        });
        bubbleColorHex.addEventListener('blur', () => {
            // Validate hex format when user clicks away
            const hexValue = bubbleColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                bubbleColor.value = hexValue;
                textBox.style.backgroundColor = hexValue;
                textBox.style.setProperty('--bubble-background-color', hexValue);
                this.saveCurrentPageState();
            } else {
                // Reset to current value if invalid
                bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
            }
        });
        
        const boldBtn = textProperties.querySelector('.bold-btn');
        boldBtn.addEventListener('click', () => {
            const isBold = textElement.style.fontWeight === 'bold';
            textElement.style.fontWeight = isBold ? 'normal' : 'bold';
            boldBtn.classList.toggle('active');
            
            // Save state after toggling bold
            this.saveCurrentPageState();
        });
        
        const italicBtn = textProperties.querySelector('.italic-btn');
        italicBtn.addEventListener('click', () => {
            const isItalic = textElement.style.fontStyle === 'italic';
            textElement.style.fontStyle = isItalic ? 'normal' : 'italic';
            italicBtn.classList.toggle('active');
            
            // Save state after toggling italic
            this.saveCurrentPageState();
        });
        
        const underlineBtn = textProperties.querySelector('.underline-btn');
        underlineBtn.addEventListener('click', () => {
            const isUnderline = textElement.style.textDecoration === 'underline';
            textElement.style.textDecoration = isUnderline ? 'none' : 'underline';
            underlineBtn.classList.toggle('active');
            
            // Save state after toggling underline
            this.saveCurrentPageState();
        });
        
        const allCapsBtn = textProperties.querySelector('.all-caps-btn');
        allCapsBtn.addEventListener('click', () => {
            const isAllCaps = textElement.style.textTransform === 'uppercase';
            textElement.style.textTransform = isAllCaps ? 'none' : 'uppercase';
            allCapsBtn.classList.toggle('active');
            
            // Save state after toggling all caps
            this.saveCurrentPageState();
        });
        
        // Find the rotation slider and its value display within textProperties
        const rotationSlider = textProperties.querySelector('.rotation');
        const rotationValueDisplay = textProperties.querySelector('.rotation-value');

        // Initialize slider and display
        const currentTransform = textBox.style.transform || '';
        const currentRotateMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
        const initialRotationValue = currentRotateMatch ? parseFloat(currentRotateMatch[1]) : 0;
        if (rotationSlider) rotationSlider.value = initialRotationValue;
        if (rotationValueDisplay) rotationValueDisplay.textContent = `${Math.round(initialRotationValue)}°`;

        // Add listener to the slider
        if (rotationSlider) {
            rotationSlider.addEventListener('input', () => {
                const value = rotationSlider.value;
                rotationValue.textContent = `${Math.round(value)}°`;
                
                // Apply ONLY rotation, position is handled by left/top
                textBox.style.transform = `rotate(${value}deg)`;

                // Save state
                this.saveCurrentPageState(); 
            });
        }
        
        // Make rotation value editable
        // Check if elements exist before calling makeSliderValueEditable
        if (rotationSlider && rotationValueDisplay) { 
            this.makeSliderValueEditable(rotationSlider, rotationValueDisplay, '°', 0);
        } else {
            console.error("Could not find rotation slider or value display element in text properties panel.");
        }
        
        // Set the active state for the text style buttons
        if (textElement.style.fontWeight === 'bold') boldBtn.classList.add('active');
        if (textElement.style.fontStyle === 'italic') italicBtn.classList.add('active');
        if (textElement.style.textDecoration === 'underline') underlineBtn.classList.add('active');
        if (textElement.style.textTransform === 'uppercase') allCapsBtn.classList.add('active');
    }
    

    showTextFormatPopup(textBox, event) {
        // Remove any existing popup
        let popup = document.getElementById('text-format-popup');
        if (popup) {
            popup.remove();
        }
        
        // --- NEW: Select this text box and deselect others ---
        this.deselectAll(); // Deselect panels, stickers, etc.
        document.querySelectorAll('.text-bubble').forEach(box => {
             box.classList.remove('selected-text');
        });
        textBox.classList.add('selected-text');
        this.currentTextBox = textBox; 
        // --- END NEW ---
        
        // Create the popup
        popup = document.createElement('div');
        popup.id = 'text-format-popup';
        popup.className = 'text-format-popup';
        
        // Get properties panel position for docking
        const propertiesPanel = document.querySelector('.properties-panel');
        const propRect = propertiesPanel.getBoundingClientRect();
        
        // Position the popup to the left of the properties panel
        const top = propRect.top;
        const left = propRect.left - 310; // 300px width + 10px margin
        
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        
        const textElement = textBox.querySelector('.text-content');
        
        // Create the content for the popup
        popup.innerHTML = `
            <div class="popup-header">
                <h3>Text Formatting</h3>
                <button class="close-popup"><i class="fas fa-times"></i></button>
            </div>
            <div class="popup-content">
                <div class="popup-section">
                    <h4>Bubble Style</h4>
                    <div class="bubble-toggle">
                        <label>
                            <input type="checkbox" id="show-bubble" ${textBox.dataset.bubbleType !== 'no-bubble' ? 'checked' : ''}>
                            Show Bubble
                        </label>
                    </div>
                    <div class="bubble-options">
                        <div class="bubble-grid">
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'speech-bubble' ? 'selected' : ''}" data-type="speech-bubble">
                                <div class="bubble-preview speech-bubble-preview"></div>
                                <span>Speech</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'thought-bubble' ? 'selected' : ''}" data-type="thought-bubble">
                                <div class="bubble-preview thought-bubble-preview"></div>
                                <span>Thought</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'caption-box' ? 'selected' : ''}" data-type="caption-box">
                                <div class="bubble-preview caption-box-preview"></div>
                                <span>Caption</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'shout-bubble' ? 'selected' : ''}" data-type="shout-bubble">
                                <div class="bubble-preview shout-bubble-preview"></div>
                                <span>Shout</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'whisper-bubble' ? 'selected' : ''}" data-type="whisper-bubble">
                                <div class="bubble-preview whisper-bubble-preview"></div>
                                <span>Whisper</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'jagged-bubble' ? 'selected' : ''}" data-type="jagged-bubble">
                                <div class="bubble-preview jagged-bubble-preview"></div>
                                <span>Jagged</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Text Style</h4>
                    <div class="text-font-section">
                        <label for="font-family">Font</label>
                        <select id="font-family" class="font-family">
                            <option disabled class="font-category">Common Fonts</option>
                            <option value="Arial" class="font-option" ${textElement.style.fontFamily === 'Arial' ? 'selected' : ''}>
                                <span class="font-preview font-arial">Arial - Comic Text</span>
                            </option>
                            <option value="Comic Sans MS" class="font-option" ${textElement.style.fontFamily === 'Comic Sans MS' ? 'selected' : ''}>
                                <span class="font-preview font-comic-sans">Comic Sans MS - Comic Text</span>
                            </option>
                            <option value="Times New Roman" class="font-option" ${textElement.style.fontFamily === 'Times New Roman' ? 'selected' : ''}>
                                <span class="font-preview font-times">Times New Roman - Comic Text</span>
                            </option>
                            
                            <option disabled class="font-category">Sound Effects</option>
                            <option value="Impact" class="font-option" ${textElement.style.fontFamily === 'Impact' ? 'selected' : ''}>
                                <span class="font-preview font-impact">Impact - BOOM!</span>
                            </option>
                            <option value="Bangers" class="font-option" ${textElement.style.fontFamily === 'Bangers' ? 'selected' : ''}>
                                <span class="font-preview font-bangers">Bangers - POW!</span>
                            </option>
                            <option value="Anton" class="font-option" ${textElement.style.fontFamily === 'Anton' ? 'selected' : ''}>
                                <span class="font-preview font-anton">Anton - CRASH!</span>
                            </option>
                            <option value="Russo One" class="font-option" ${textElement.style.fontFamily === 'Russo One' ? 'selected' : ''}>
                                <span class="font-preview font-russo-one">Russo One - WHAM!</span>
                            </option>
                            <option value="Fredoka One" class="font-option" ${textElement.style.fontFamily === 'Fredoka One' ? 'selected' : ''}>
                                <span class="font-preview font-fredoka-one">Fredoka One - SPLASH!</span>
                            </option>
                            
                            <option disabled class="font-category">Handwriting Styles</option>
                            <option value="Comic Neue" class="font-option" ${textElement.style.fontFamily === 'Comic Neue' ? 'selected' : ''}>
                                <span class="font-preview font-comic-neue">Comic Neue - Casual</span>
                            </option>
                            <option value="Permanent Marker" class="font-option" ${textElement.style.fontFamily === 'Permanent Marker' ? 'selected' : ''}>
                                <span class="font-preview font-permanent-marker">Permanent Marker</span>
                            </option>
                            <option value="Gloria Hallelujah" class="font-option" ${textElement.style.fontFamily === 'Gloria Hallelujah' ? 'selected' : ''}>
                                <span class="font-preview font-gloria-hallelujah">Gloria Hallelujah</span>
                            </option>
                            <option value="Architects Daughter" class="font-option" ${textElement.style.fontFamily === 'Architects Daughter' ? 'selected' : ''}>
                                <span class="font-preview font-architects-daughter">Architects Daughter</span>
                            </option>
                            <option value="Shadows Into Light" class="font-option" ${textElement.style.fontFamily === 'Shadows Into Light' ? 'selected' : ''}>
                                <span class="font-preview font-shadows-into-light">Shadows Into Light</span>
                            </option>
                            
                            <option disabled class="font-category">Title/Header Fonts</option>
                            <option value="Luckiest Guy" class="font-option" ${textElement.style.fontFamily === 'Luckiest Guy' ? 'selected' : ''}>
                                <span class="font-preview font-luckiest-guy">Luckiest Guy</span>
                            </option>
                            <option value="Boogaloo" class="font-option" ${textElement.style.fontFamily === 'Boogaloo' ? 'selected' : ''}>
                                <span class="font-preview font-boogaloo">Boogaloo</span>
                            </option>
                            <option value="Acme" class="font-option" ${textElement.style.fontFamily === 'Acme' ? 'selected' : ''}>
                                <span class="font-preview font-acme">Acme</span>
                            </option>
                            <option value="Press Start 2P" class="font-option" ${textElement.style.fontFamily === 'Press Start 2P' ? 'selected' : ''}>
                                <span class="font-preview font-press-start-2p">Press Start 2P</span>
                            </option>
                        </select>
                    </div>
                    
                    <div class="text-style-grid">
                        <div class="style-control">
                            <label for="font-size">Size</label>
                            <div class="size-control">
                                <input type="range" id="font-size" class="font-size red-slider" min="8" max="72" value="${parseInt(textElement.style.fontSize) || 16}">
                                <span class="font-size-value">${parseInt(textElement.style.fontSize) || 16}px</span>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label for="line-height">Line Spacing</label>
                            <div class="line-height-control" style="display: flex; align-items: center; gap: 10px;">
                                <input type="range" id="line-height" class="line-height red-slider" min="0.8" max="5" step="0.1" value="1.2" style="flex-grow: 1;">
                                <span class="line-height-value" style="min-width: 30px; text-align: right;">1.2</span>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label>Style</label>
                            <div class="text-style-buttons">
                                <button class="style-btn bold-btn ${textElement.style.fontWeight === 'bold' ? 'active' : ''}" title="Bold">
                                    <i class="fas fa-bold"></i>
                                </button>
                                <button class="style-btn italic-btn ${textElement.style.fontStyle === 'italic' ? 'active' : ''}" title="Italic">
                                    <i class="fas fa-italic"></i>
                                </button>
                                <button class="style-btn underline-btn ${textElement.style.textDecoration === 'underline' ? 'active' : ''}" title="Underline">
                                    <i class="fas fa-underline"></i>
                                </button>
                                <button class="style-btn all-caps-btn ${textElement.style.textTransform === 'uppercase' ? 'active' : ''}" title="All Caps">
                                    <i class="fas fa-font"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label>Alignment</label>
                            <div class="text-align-buttons">
                                <button class="align-btn align-left ${textElement.style.textAlign === 'left' ? 'active' : ''}" title="Align Left">
                                    <i class="fas fa-align-left"></i>
                                </button>
                                <button class="align-btn align-center ${!textElement.style.textAlign || textElement.style.textAlign === 'center' ? 'active' : ''}" title="Align Center">
                                    <i class="fas fa-align-center"></i>
                                </button>
                                <button class="align-btn align-right ${textElement.style.textAlign === 'right' ? 'active' : ''}" title="Align Right">
                                    <i class="fas fa-align-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="color-section">
                        <div class="color-control">
                            <label for="text-color">Text Color</label>
                            <div class="color-picker-container">
                                <!-- Use imported function directly -->
                                <input type="color" id="text-color" class="text-color" value="${globalRgbToHex(window.getComputedStyle(textElement).color)}">
                                <div class="hex-display text-color-hex">${globalRgbToHex(window.getComputedStyle(textElement).color).toUpperCase()}</div>
                            </div>
                        </div>
                        <div class="color-control">
                            <label for="bubble-color">Bubble Color</label>
                            <div class="color-picker-container">
                                <!-- Use imported function directly -->
                                <input type="color" id="bubble-color" class="bubble-color" value="${globalRgbToHex(this.getBubbleBackgroundColor(textBox))}">
                                <div class="hex-display bubble-color-hex">${globalRgbToHex(this.getBubbleBackgroundColor(textBox)).toUpperCase()}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Effects</h4>
                    <div class="effects-grid">
                        <div class="effect-control">
                            <label>Text Effects</label>
                            <div class="outline-control">
                                <input type="checkbox" id="text-outline" ${textElement.style.webkitTextStroke ? 'checked' : ''}>
                                <input type="number" id="outline-thickness" class="outline-thickness" value="${this.getOutlineThickness(textElement)}" min="1" max="5" step="0.5" ${!textElement.style.webkitTextStroke ? 'disabled' : ''}>
                                <div class="color-picker-container">
                                    <!-- Use imported function directly -->
                                    <input type="color" id="outline-color" value="${globalRgbToHex(this.getOutlineColor(textElement))}" ${!textElement.style.webkitTextStroke ? 'disabled' : ''}>
                                    <div class="hex-display outline-color-hex" ${!textElement.style.webkitTextStroke ? 'disabled' : ''}>${globalRgbToHex(this.getOutlineColor(textElement)).toUpperCase()}</div>
                                </div>
                            </div>
                            <div class="shadow-control">
                                <input type="checkbox" id="text-shadow" ${textElement.style.textShadow ? 'checked' : ''}>
                                <div class="color-picker-container">
                                    <!-- Use imported function directly -->
                                    <input type="color" id="shadow-color" value="${globalRgbToHex(this.getShadowColor(textElement))}" ${!textElement.style.textShadow ? 'disabled' : ''}>
                                    <div class="hex-display shadow-color-hex" ${!textElement.style.textShadow ? 'disabled' : ''}>${globalRgbToHex(this.getShadowColor(textElement)).toUpperCase()}</div>
                                </div>
                            </div>
                            <div class="opacity-control">
                                <label>
                                    <input type="checkbox" id="bubble-opacity" ${textBox.style.opacity === '0.5' ? 'checked' : ''}>
                                    50% Opacity
                                </label>
                            </div>
                        </div>
                        
                        <div class="effect-control">
                            <label for="bubble-tail-position">Bubble Tail</label>
                            <select id="bubble-tail-position" ${textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box' ? 'disabled' : ''}>
                                <option value="bottom-left" ${textBox.dataset.tailPosition === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                                <option value="bottom-center" ${textBox.dataset.tailPosition === 'bottom-center' ? 'selected' : ''}>Bottom Center</option>
                                <option value="bottom-right" ${textBox.dataset.tailPosition === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                                <option value="left-center" ${textBox.dataset.tailPosition === 'left-center' ? 'selected' : ''}>Left Center</option>
                                <option value="right-center" ${textBox.dataset.tailPosition === 'right-center' ? 'selected' : ''}>Right Center</option>
                                <option value="top-left" ${textBox.dataset.tailPosition === 'top-left' ? 'selected' : ''}>Top Left</option>
                                <option value="top-center" ${textBox.dataset.tailPosition === 'top-center' ? 'selected' : ''}>Top Center</option>
                                <option value="top-right" ${textBox.dataset.tailPosition === 'top-right' ? 'selected' : ''}>Top Right</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Position</h4>
                    <div class="position-controls">
                        <div class="position-grid">
                            <button class="position-grid-btn" data-position="top-left">↖</button>
                            <button class="position-grid-btn" data-position="top-center">↑</button>
                            <button class="position-grid-btn" data-position="top-right">↗</button>
                            <button class="position-grid-btn" data-position="middle-left">←</button>
                            <button class="position-grid-btn" data-position="middle-center">•</button>
                            <button class="position-grid-btn" data-position="middle-right">→</button>
                            <button class="position-grid-btn" data-position="bottom-left">↙</button>
                            <button class="position-grid-btn" data-position="bottom-center">↓</button>
                            <button class="position-grid-btn" data-position="bottom-right">↘</button>
                        </div>
                        
                        <div class="rotation-control">
                            <label for="rotation">Rotation</label>
                            <div class="rotation-slider">
                                <input type="range" id="rotation" class="rotation" min="-180" max="180" value="${this.getRotationValue(textBox)}">
                                <span class="rotation-value">${this.getRotationValue(textBox)}°</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Set up event listeners for the popup
        this.setupPopupEventListeners(popup, textBox);
        
        // REMOVE: Do not call selectTextBox here, as it manages the sidebar panel
        // this.selectTextBox(textBox); 
    }
    
    setupPopupEventListeners(popup, textBox) {
        const textElement = textBox.querySelector('.text-content');
        
        // Close button
        popup.querySelector('.close-popup').addEventListener('click', () => {
            popup.remove();
            
            // Save the state when closing the popup
            this.saveCurrentPageState();
        });
        
        // Close when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!popup.contains(e.target) && !textBox.contains(e.target)) {
                popup.remove();
                
                // Save the state when closing the popup
                this.saveCurrentPageState();
            }
        });
        
        // Bubble toggle
        const bubbleToggle = popup.querySelector('#show-bubble');
        bubbleToggle.addEventListener('change', () => {
            if (bubbleToggle.checked) {
                // Restore previous bubble type or default to speech bubble
                const previousType = textBox.dataset.previousBubbleType || 'speech-bubble';
                textBox.classList.remove('no-bubble');
                textBox.classList.add(previousType);
                textBox.dataset.bubbleType = previousType;
                // Enable bubble tail dropdown
                popup.querySelector('#bubble-tail-position').disabled = (previousType === 'caption-box');
            } else {
                // Store current bubble type before removing
                textBox.dataset.previousBubbleType = textBox.dataset.bubbleType;
                // Remove all bubble classes and add no-bubble
                textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'jagged-bubble');
                textBox.classList.add('no-bubble');
                textBox.dataset.bubbleType = 'no-bubble';
                // Disable bubble tail dropdown
                popup.querySelector('#bubble-tail-position').disabled = true;
            }
            
            // Save the state after changing bubble toggle
            this.saveCurrentPageState();
        });
        
        // Bubble style options
        popup.querySelectorAll('.bubble-option').forEach(option => {
            option.addEventListener('click', () => {
                // Update selected state in UI
                popup.querySelectorAll('.bubble-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Get bubble type
                const bubbleType = option.dataset.type;
                
                // Remove all bubble classes and add the selected one
                textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'jagged-bubble', 'no-bubble');
                textBox.classList.add(bubbleType);
                textBox.dataset.bubbleType = bubbleType;
                
                // Update bubble toggle checkbox
                bubbleToggle.checked = true;
                
                // Enable/disable bubble tail dropdown based on bubble type
                popup.querySelector('#bubble-tail-position').disabled = (bubbleType === 'caption-box');
                
                // Apply default styling for the bubble type if needed
                if (bubbleType === 'shout-bubble') {
                    textElement.style.fontWeight = 'bold';
                    textElement.style.textTransform = 'uppercase';
                    popup.querySelector('.bold-btn').classList.add('active');
                } else if (bubbleType === 'whisper-bubble') {
                    textElement.style.fontStyle = 'italic';
                    textElement.style.opacity = '0.8';
                    popup.querySelector('.italic-btn').classList.add('active');
                } else if (bubbleType === 'caption-box') {
                    textElement.style.fontStyle = 'italic';
                    popup.querySelector('.italic-btn').classList.add('active');
                }
                
                // Save the state after changing bubble style
                this.saveCurrentPageState();
            });
        });
        
        // Font family
        popup.querySelector('#font-family').addEventListener('change', (e) => {
            textElement.style.fontFamily = e.target.value;
        });
        
        // Font size
        const fontSizeSlider = popup.querySelector('#font-size');
        const fontSizeValue = popup.querySelector('.font-size-value');
        fontSizeSlider.addEventListener('input', () => {
            textElement.style.fontSize = `${fontSizeSlider.value}px`;
            fontSizeValue.textContent = `${fontSizeSlider.value}px`;
        });
        
        // Make font size value editable
        this.makeSliderValueEditable(fontSizeSlider, fontSizeValue, 'px', 0);

        // Text style buttons
        popup.querySelector('.bold-btn').addEventListener('click', () => {
            const isBold = textElement.style.fontWeight === 'bold';
            textElement.style.fontWeight = isBold ? 'normal' : 'bold';
            popup.querySelector('.bold-btn').classList.toggle('active');
        });
        
        popup.querySelector('.italic-btn').addEventListener('click', () => {
            const isItalic = textElement.style.fontStyle === 'italic';
            textElement.style.fontStyle = isItalic ? 'normal' : 'italic';
            popup.querySelector('.italic-btn').classList.toggle('active');
        });
        
        popup.querySelector('.underline-btn').addEventListener('click', () => {
            const isUnderline = textElement.style.textDecoration === 'underline';
            textElement.style.textDecoration = isUnderline ? 'none' : 'underline';
            popup.querySelector('.underline-btn').classList.toggle('active');
        });
        
        // All Caps toggle
        popup.querySelector('.all-caps-btn').addEventListener('click', () => {
            const isAllCaps = textElement.style.textTransform === 'uppercase';
            textElement.style.textTransform = isAllCaps ? 'none' : 'uppercase';
            popup.querySelector('.all-caps-btn').classList.toggle('active');
            
            // Save state after toggling all caps
            this.saveCurrentPageState();
        });
        
        // Text alignment
        popup.querySelector('.align-left').addEventListener('click', () => {
            textElement.style.textAlign = 'left';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-left').classList.add('active');
        });
        
        popup.querySelector('.align-center').addEventListener('click', () => {
            textElement.style.textAlign = 'center';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-center').classList.add('active');
        });
        
        popup.querySelector('.align-right').addEventListener('click', () => {
            textElement.style.textAlign = 'right';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-right').classList.add('active');
        });
        
        // Colors
        const textColorPicker = popup.querySelector('#text-color');
        const textColorHex = popup.querySelector('.text-color-hex');
        
        textColorPicker.addEventListener('input', (e) => {
            textElement.style.color = e.target.value;
            textColorHex.textContent = e.target.value.toUpperCase();
        });
        
        // Allow user to enter hex color directly for text color
        textColorHex.contentEditable = true;
        textColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Validate hex format
                const hexValue = textColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    textColorPicker.value = hexValue;
                    textElement.style.color = hexValue;
                } else {
                    // Reset to current value if invalid
                    textColorHex.textContent = textColorPicker.value.toUpperCase();
                }
                textColorHex.blur();
            }
        });
        
        textColorHex.addEventListener('blur', () => {
            // Validate hex format when user clicks away
            const hexValue = textColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                textColorPicker.value = hexValue;
                textElement.style.color = hexValue;
            } else {
                // Reset to current value if invalid
                textColorHex.textContent = textColorPicker.value.toUpperCase();
            }
        });
        
        const bubbleColorPicker = popup.querySelector('#bubble-color');
        const bubbleColorHex = popup.querySelector('.bubble-color-hex');
        
        bubbleColorPicker.addEventListener('input', (e) => {
            textBox.style.backgroundColor = e.target.value;
            textBox.style.setProperty('--bubble-background-color', e.target.value);
            bubbleColorHex.textContent = e.target.value.toUpperCase();
        });
        
        // Allow user to enter hex color directly for bubble color
        bubbleColorHex.contentEditable = true;
        bubbleColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Validate hex format
                const hexValue = bubbleColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    bubbleColorPicker.value = hexValue;
                    textBox.style.backgroundColor = hexValue;
                    textBox.style.setProperty('--bubble-background-color', hexValue);
                } else {
                    // Reset to current value if invalid
                    bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
                }
                bubbleColorHex.blur();
            }
        });
        
        bubbleColorHex.addEventListener('blur', () => {
            // Validate hex format when user clicks away
            const hexValue = bubbleColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                bubbleColorPicker.value = hexValue;
                textBox.style.backgroundColor = hexValue;
                textBox.style.setProperty('--bubble-background-color', hexValue);
            } else {
                // Reset to current value if invalid
                bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
            }
        });
        
        // Text outline
        const textOutlineCheckbox = popup.querySelector('#text-outline');
        const outlineThicknessInput = popup.querySelector('#outline-thickness');
        const outlineColorPicker = popup.querySelector('#outline-color');
        const outlineColorHex = popup.querySelector('.outline-color-hex');
        
        textOutlineCheckbox.addEventListener('change', () => {
            if (textOutlineCheckbox.checked) {
                outlineThicknessInput.disabled = false;
                outlineColorPicker.disabled = false;
                outlineColorHex.removeAttribute('disabled');
                
                this.applyTextOutline(textElement, outlineColorPicker.value, outlineThicknessInput.value);
            } else {
                outlineThicknessInput.disabled = true;
                outlineColorPicker.disabled = true;
                outlineColorHex.setAttribute('disabled', true);
                
                this.removeTextOutline(textElement);
            }
            
            // Save state after changing outline
            this.saveCurrentPageState();
        });
        
        outlineThicknessInput.addEventListener('input', () => {
            if (textOutlineCheckbox.checked) {
                this.applyTextOutline(textElement, outlineColorPicker.value, outlineThicknessInput.value);
                
                // Save state after changing outline thickness
                this.saveCurrentPageState();
            }
        });
        
        outlineColorPicker.addEventListener('input', () => {
            if (textOutlineCheckbox.checked) {
                const thickness = outlineThicknessInput.value;
                this.applyTextOutline(textElement, outlineColorPicker.value, thickness);
                outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                
                // Save state after changing outline color
                this.saveCurrentPageState();
            }
        });
        
        // Allow direct hex input for outline color
        outlineColorHex.contentEditable = true;
        outlineColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !outlineColorHex.hasAttribute('disabled')) {
                e.preventDefault();
                const hexValue = outlineColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    outlineColorPicker.value = hexValue;
                    const thickness = outlineThicknessInput.value;
                    this.applyTextOutline(textElement, hexValue, thickness);
                    this.saveCurrentPageState();
                } else {
                    outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                }
                outlineColorHex.blur();
            }
        });
        
        outlineColorHex.addEventListener('blur', () => {
            if (!outlineColorHex.hasAttribute('disabled')) {
                const hexValue = outlineColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    outlineColorPicker.value = hexValue;
                    const thickness = outlineThicknessInput.value;
                    this.applyTextOutline(textElement, hexValue, thickness);
                    this.saveCurrentPageState();
                } else {
                    outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                }
            }
        });
        
        // Text shadow
        const textShadowCheckbox = popup.querySelector('#text-shadow');
        const shadowColorPicker = popup.querySelector('#shadow-color');
        const shadowColorHex = popup.querySelector('.shadow-color-hex');
        
        textShadowCheckbox.addEventListener('change', () => {
            if (textShadowCheckbox.checked) {
                shadowColorPicker.disabled = false;
                shadowColorHex.removeAttribute('disabled');
                this.applyTextShadow(textElement, shadowColorPicker.value);
            } else {
                shadowColorPicker.disabled = true;
                shadowColorHex.setAttribute('disabled', true);
                this.removeTextShadow(textElement);
            }
            
            // Save state after changing shadow
            this.saveCurrentPageState();
        });
        
        shadowColorPicker.addEventListener('input', () => {
            if (textShadowCheckbox.checked) {
                this.applyTextShadow(textElement, shadowColorPicker.value);
                shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                
                // Save state after changing shadow color
                this.saveCurrentPageState();
            }
        });
        
        // Allow direct hex input for shadow color
        shadowColorHex.contentEditable = true;
        shadowColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !shadowColorHex.hasAttribute('disabled')) {
                e.preventDefault();
                const hexValue = shadowColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    shadowColorPicker.value = hexValue;
                    this.applyTextShadow(textElement, hexValue);
                    this.saveCurrentPageState();
                } else {
                    shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                }
                shadowColorHex.blur();
            }
        });
        
        shadowColorHex.addEventListener('blur', () => {
            if (!shadowColorHex.hasAttribute('disabled')) {
                const hexValue = shadowColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    shadowColorPicker.value = hexValue;
                    this.applyTextShadow(textElement, hexValue);
                    this.saveCurrentPageState();
                } else {
                    shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                }
            }
        });
        
        // Bubble tail position
        popup.querySelector('#bubble-tail-position').addEventListener('change', (e) => {
            this.updateBubbleTail(textBox, e.target.value);
        });
        
        // Position grid buttons
        popup.querySelectorAll('.position-grid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                this.positionTextBox(textBox, position);
            });
        });
        
        // Rotation slider
        const rotationSlider = popup.querySelector('#rotation');
        const rotationValue = popup.querySelector('.rotation-value');
        
        // Initialize based on current rotation
        const currentTransform = textBox.style.transform || '';
        const currentRotateMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
        const initialRotationValue = currentRotateMatch ? parseFloat(currentRotateMatch[1]) : 0;
        rotationSlider.value = initialRotationValue;
        rotationValue.textContent = `${Math.round(initialRotationValue)}°`;

        // Add listener
        rotationSlider.addEventListener('input', () => {
            const value = rotationSlider.value;
            rotationValue.textContent = `${Math.round(value)}°`;
            
            // Apply ONLY rotation, position is handled by left/top
            textBox.style.transform = `rotate(${value}deg)`;

            // Save state
            this.saveCurrentPageState(); 
        });
        
        // Make rotation value editable
        this.makeSliderValueEditable(rotationSlider, rotationValue, '°', 0);

        // Add text content change observer
        const observer = new MutationObserver(() => {
            this.updateOutlineText(textElement);
        });
        
        observer.observe(textElement, {
            characterData: true,
            childList: true,
            subtree: true
        });

        // Add opacity control
        const opacityCheckbox = popup.querySelector('#bubble-opacity');
        opacityCheckbox.addEventListener('change', () => {
            // Set opacity on the background pseudo-element
            if (opacityCheckbox.checked) {
                textBox.style.setProperty('--bubble-opacity', '0.5');
            } else {
                textBox.style.setProperty('--bubble-opacity', '1');
            }
            // Save state after changing opacity
            this.saveCurrentPageState();
        });

        // Line spacing slider
        const lineHeightSlider = popup.querySelector('#line-height');
        const lineHeightValue = popup.querySelector('.line-height-value');

        // Initialize slider value
        const currentLineHeight = textElement.style.lineHeight;
        let initialValue = 1.2; // Default if 'normal' or not set
        if (currentLineHeight && currentLineHeight !== 'normal') {
            initialValue = parseFloat(currentLineHeight) || 1.2;
        }
        lineHeightSlider.value = initialValue;
        lineHeightValue.textContent = initialValue.toFixed(1);

        lineHeightSlider.addEventListener('input', () => {
            const value = lineHeightSlider.value;
            lineHeightValue.textContent = parseFloat(value).toFixed(1);
            textElement.style.lineHeight = value;
            // Save state after changing line height
            this.saveCurrentPageState();
        });
        
        // Make line height value editable
        this.makeSliderValueEditable(lineHeightSlider, lineHeightValue, '', 1);
    }
    
    // Helper methods for text formatting
    getRotationValue(textBox) {
        const transform = textBox.style.transform;
        const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
        return rotateMatch ? parseInt(rotateMatch[1]) : 0;
    }
    
    applyTextOutline(textElement, color, thickness = 2) {
        // Use imported function directly
        const text = getTextWithLineBreaks(textElement); 
        const computedStyle = window.getComputedStyle(textElement);
        
        // Set the data attributes for the outline effect
        textElement.setAttribute('data-has-outline', 'true');
        textElement.setAttribute('data-text', text); // Use the correctly processed text
        
        // Set the CSS custom properties for the outline
        textElement.style.setProperty('--outline-color', color);
        textElement.style.setProperty('--outline-width', `${thickness}px`);
        textElement.style.setProperty('--text-color', textElement.style.color || '#000000');
        
        // Copy all relevant text styling properties to ensure perfect matching
        const stylesToCopy = [
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontStyle',
            'letterSpacing',
            'wordSpacing',
            'lineHeight',
            'textTransform',
            'textAlign',
            'textDecoration',
            'whiteSpace'
        ];
        
        stylesToCopy.forEach(prop => {
            const value = computedStyle[prop];
            if (value) {
                textElement.style[prop] = value;
            }
        });
        
        // Add smooth text rendering
        textElement.style.webkitFontSmoothing = 'antialiased';
        textElement.style.mozOsxFontSmoothing = 'grayscale';
        textElement.style.textRendering = 'optimizeLegibility';
        
        // Create a MutationObserver to update the outline when text content changes
        if (!textElement._outlineObserver) {
            // Debounce timer variable
            let outlineUpdateTimer = null;

            textElement._outlineObserver = new MutationObserver((mutations) => {
                // Clear any existing timer
                clearTimeout(outlineUpdateTimer);

                // Set a new timer to run updateOutlineText after a short delay (e.g., 100ms)
                outlineUpdateTimer = setTimeout(() => {
                    this.updateOutlineText(textElement);
                }, 100); // 100ms delay - adjust if needed
            });
            
            textElement._outlineObserver.observe(textElement, {
                characterData: true,
                childList: true,
                subtree: true
            });
        }
    }
    
    removeTextOutline(textElement) {
        // Remove the outline-related attributes and styles
        textElement.removeAttribute('data-has-outline');
        textElement.removeAttribute('data-text');
        textElement.style.removeProperty('--outline-color');
        textElement.style.removeProperty('--outline-width');
        textElement.style.removeProperty('--text-color');
        
        // Disconnect the observer if it exists
        if (textElement._outlineObserver) {
            textElement._outlineObserver.disconnect();
            delete textElement._outlineObserver;
        }
    }
    
    applyTextShadow(textElement, color) {
        textElement.style.textShadow = `2px 2px 2px ${color}`;
    }
    
    removeTextShadow(textElement) {
        textElement.style.textShadow = 'none';
    }
    
    removeEffectFromShadow(shadow, prefix) {
        if (!shadow) return '';
        
        // Split shadow into individual shadows
        const shadows = shadow.split(',');
        
        // Filter out shadows that start with the prefix
        return shadows
            .filter(s => !s.trim().startsWith(prefix))
            .join(',');
    }
    
    updateBubbleTail(textBox, position) {
        // Remove any existing position classes
        textBox.className = textBox.className.replace(/(?:speech|thought)-tail-\S+/g, '').trim();
        
        // Add the new position class based on bubble type
        const bubbleType = textBox.dataset.bubbleType;
        if (bubbleType === 'speech-bubble') {
            textBox.classList.add(`speech-tail-${position}`);
        } else if (bubbleType === 'thought-bubble') {
            textBox.classList.add(`thought-tail-${position}`);
        }
        
        // Store the position in dataset
        textBox.dataset.tailPosition = position;
    }
    
    positionTextBox(textBox, position) {
        const panel = textBox.parentElement;
        const panelRect = panel.getBoundingClientRect();
        
        // Calculate positions as percentages
        let left, top;
        
        switch (position) {
            case 'top-left':
                left = 10;
                top = 10;
                break;
            case 'top-center':
                left = 50;
                top = 10;
                break;
            case 'top-right':
                left = 90;
                top = 10;
                break;
            case 'middle-left':
                left = 10;
                top = 50;
                break;
            case 'middle-center':
                left = 50;
                top = 50;
                break;
            case 'middle-right':
                left = 90;
                top = 50;
                break;
            case 'bottom-left':
                left = 10;
                top = 90;
                break;
            case 'bottom-center':
                left = 50;
                top = 90;
                break;
            case 'bottom-right':
                left = 90;
                top = 90;
                break;
            default:
                left = 50;
                top = 50;
        }
        
        // Set position
        textBox.style.left = `${left}%`;
        textBox.style.top = `${top}%`;
        
        // Adjust transform to account for the anchor point
        const translateX = position.includes('left') ? '0%' : 
                         position.includes('right') ? '-100%' : '-50%';
        const translateY = position.includes('top') ? '0%' : 
                         position.includes('bottom') ? '-100%' : '-50%';
        
        // Preserve rotation if present
        const rotation = this.getRotationValue(textBox);
        const rotateStyle = rotation !== 0 ? ` rotate(${rotation}deg)` : '';
        
        textBox.style.transform = `translate(${translateX}, ${translateY})${rotateStyle}`;
    }

    // Add these new helper methods to the ComicCreator class
    getOutlineThickness(textElement) {
        const stroke = textElement.style.webkitTextStroke || '';
        const match = stroke.match(/^(\d+(\.\d+)?)px/);
        return match ? match[1] : '2';
    }

    getOutlineColor(textElement) {
        const stroke = textElement.style.webkitTextStroke || '';
        const color = stroke.match(/[#][a-fA-F0-9]{6}/) || stroke.match(/rgba?\([^)]+\)/);
        return color ? globalRgbToHex(color[0]) : '#000000';
    }

    getShadowColor(textElement) {
        const shadow = textElement.style.textShadow || '';
        const color = shadow.match(/[#][a-fA-F0-9]{6}/) || shadow.match(/rgba?\([^)]+\)/);
        return color ? globalRgbToHex(color[0]) : '#666666';
    }

    // Method getTextWithLineBreaks removed (now imported from Utils.js)

    updateOutlineText(textElement) {
        if (textElement.dataset.hasOutline === 'true') { // Check the dataset property
            // Use imported function directly
            const text = getTextWithLineBreaks(textElement); 
            textElement.setAttribute('data-text', text);
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
            }
            
            if (projectState.hasOwnProperty('globalBackgroundStyle')) {
                this.globalBackgroundStyle = projectState.globalBackgroundStyle;
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
            alert('Error loading project file. Please make sure it is a valid comic project file.');
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

    // --- NEW: Setup Sidebar Tab Switching --- 
    setupSidebarTabs() {
        const tabsContainer = document.querySelector('.sidebar-tabs');
        if (!tabsContainer) return;

        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab-btn');
            if (!clickedTab) return;

            const newMode = clickedTab.dataset.tab;
            if (newMode === this.currentSidebarMode) return; // Do nothing if clicking the active tab

            // Update the active tab visually
            tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
                tab.classList.remove('active');
            });
            clickedTab.classList.add('active');

            // Update the internal mode state
            this.currentSidebarMode = newMode;
            console.log('Switched sidebar mode to:', this.currentSidebarMode);

            // Update the right sidebar based on the selected mode
            this.updateRightSidebarView();

            // Deselect any currently selected item when switching modes
            this.deselectAll(); 
        });
    }

    // --- NEW: Update Right Sidebar View --- 
    updateRightSidebarView() {
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) return;

        // Clear previous content
        propertiesPanel.innerHTML = '';

        // Show the relevant section based on mode AND current selection
        switch (this.currentSidebarMode) {
            case 'panels':
                console.log("Right sidebar: Panels tab active.");
                // Create panel properties container if it doesn't exist
                let panelProps = propertiesPanel.querySelector('#panel-properties');
                if (!panelProps) {
                    panelProps = document.createElement('div');
                    panelProps.id = 'panel-properties';
                    panelProps.className = 'properties-section';
                    propertiesPanel.appendChild(panelProps);
                }
                
                // Show panel controls ONLY if a panel is selected
                if (this.currentPanel) {
                    this.updatePanelControls(this.currentPanel);
                } else {
                    // Optional: Show a default message if no panel is selected
                    panelProps.innerHTML = '<h4>Panel Settings</h4><div class="panel-controls"><p>Select a panel to see its properties.</p></div>';
                    panelProps.style.display = 'block';
                }
                break;
                
            case 'backgrounds':
                 console.log("Right sidebar: Backgrounds tab active.");
                // Always show background controls when this tab is active
                this.updateBackgroundControls(this.currentBackground); // Pass current background if it exists
                break;
                
            case 'stickers':
                 console.log("Right sidebar: Stickers tab active.");
                // Create sticker properties container if it doesn't exist
                let stickerProps = propertiesPanel.querySelector('#sticker-properties');
                if (!stickerProps) {
                    stickerProps = document.createElement('div');
                    stickerProps.id = 'sticker-properties';
                    stickerProps.className = 'properties-section';
                    propertiesPanel.appendChild(stickerProps);
                }
                
                 // Show sticker controls ONLY if a sticker is selected
                 if (this.currentSticker) {
                     this.updateStickerControls(this.currentSticker);
                 } else if (stickerProps) {
                    // Optional: Show a default message if no sticker is selected
                    stickerProps.innerHTML = '<h4>Sticker Settings</h4><div class="panel-controls"><p>Select a sticker to see its properties.</p></div>';
                    stickerProps.style.display = 'block';
                 } else {
                    // Ensure sticker props div exists for the message
                    this.updateStickerControls(null); 
                 }
                break;
            default:
                 console.warn("Unknown sidebar mode:", this.currentSidebarMode);
        }
    }

    // --- Update Background Controls ---
    updateBackgroundControls(backgroundElement) {
        console.log("Updating controls for background:", backgroundElement ? backgroundElement.dataset.imageId : 'None');
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) return;

        let bgProps = propertiesPanel.querySelector('#background-properties');
        if (!bgProps) {
            bgProps = document.createElement('div');
            bgProps.id = 'background-properties';
            bgProps.className = 'properties-section';
            propertiesPanel.appendChild(bgProps);
        }

        // Hide others
        propertiesPanel.querySelectorAll('.properties-section:not(#background-properties)')
           .forEach(sec => sec.style.display = 'none');

        // Check if current page has a custom background image
        const currentPage = this.pages[this.currentPageIndex];
        const hasCustomBackground = currentPage && currentPage.backgroundState && currentPage.backgroundState.imageId;

        // Show background controls
        bgProps.innerHTML = `
            <h4>Background Settings</h4>
            <div class="panel-controls">
                <div class="control-group">
                    <h4 style="text-align: center;">Background Style</h4>
                    <div class="background-styles">
                        <button class="style-btn" data-style="classic-white">
                            <span class="preview classic-white"></span>
                            Classic White
                        </button>
                        <button class="style-btn" data-style="vintage-paper">
                            <span class="preview vintage-paper"></span>
                            Vintage Paper
                        </button>
                        <button class="style-btn" data-style="dotted-pattern">
                            <span class="preview dotted-pattern"></span>
                            Dotted Pattern
                        </button>
                        <button class="style-btn" data-style="halftone">
                            <span class="preview halftone"></span>
                            Halftone
                        </button>
                        <button class="style-btn" data-style="graph-paper">
                            <span class="preview graph-paper"></span>
                            Graph Paper
                        </button>
                        <button class="style-btn" data-style="gradient-fade">
                            <span class="preview gradient-fade"></span>
                            Gradient Fade
                        </button>
                    </div>
                    <div class="global-background-control" style="margin-top: 10px; text-align: left; display: flex; align-items: center;">
                        <input type="checkbox" id="use-global-background" ${this.useGlobalBackgroundStyle ? 'checked' : ''}>
                        <label for="use-global-background" style="margin-left: 8px; font-size: 14px;">Apply to all pages</label>
                    </div>
                </div>
                ${hasCustomBackground ? `
                <div class="control-group">
                    <h4 style="text-align: center;">Background Image</h4>
                    <button id="apply-custom-bg-all-btn" class="action-btn" style="width: 100%; margin-bottom: 1rem;">
                        <i class="fas fa-copy"></i> Apply This Image to All Pages
                    </button>
                </div>
                ` : ''}
                ${backgroundElement ? `
                <div class="control-group">
                    <h4 style="text-align: center;">Position</h4>
                    <div class="step-size-control" style="margin-bottom: 1rem; text-align: center;">
                        <label style="font-size: 16px;">Step Size: </label>
                        <input type="number" 
                               class="step-size-input" 
                               value="1" 
                               min="0.1" 
                               max="20" 
                               step="0.1" 
                               style="width: 80px; height: 30px; font-size: 16px; padding: 4px;">
                    </div>
                    <div class="position-controls" style="display: grid; grid-template-areas: '. up .' 'left center right' '. down .'; gap: 5px; justify-content: center;">
                        <button class="position-btn up" style="grid-area: up;"><i class="fas fa-arrow-up"></i></button>
                        <button class="position-btn left" style="grid-area: left;"><i class="fas fa-arrow-left"></i></button>
                        <div style="grid-area: center;"></div>
                        <button class="position-btn right" style="grid-area: right;"><i class="fas fa-arrow-right"></i></button>
                        <button class="position-btn down" style="grid-area: down;"><i class="fas fa-arrow-down"></i></button>
                    </div>
                </div>
                ` : '<p>Select a background image by dragging it onto the canvas while the "Backgrounds" tab is active.</p>'}
            </div>`;

        bgProps.style.display = 'block';

        // Add global background checkbox listener
        const globalBackgroundCheckbox = bgProps.querySelector('#use-global-background');
        if (globalBackgroundCheckbox) {
            globalBackgroundCheckbox.addEventListener('change', (e) => {
                this.useGlobalBackgroundStyle = e.target.checked;
                
                if (e.target.checked) {
                    // Get current background style
                    const canvas = document.querySelector('#comic-canvas');
                    const backgroundClasses = [
                        'classic-white', 'vintage-paper', 'dotted-pattern',
                        'halftone', 'graph-paper', 'gradient-fade'
                    ];
                    const currentStyle = Array.from(canvas.classList)
                        .find(cls => backgroundClasses.includes(cls)) || 'classic-white';
                    
                    // Set as global style
                    this.globalBackgroundStyle = currentStyle;
                    
                    // Apply to all pages
                    this.pages.forEach(page => {
                        page.canvasBackgroundStyle = currentStyle;
                    });
                }
                
                // Save current page state
                this.saveCurrentPageState();
            });
        }

        // Add apply custom background to all pages button listener
        const applyCustomBgAllBtn = bgProps.querySelector('#apply-custom-bg-all-btn');
        if (applyCustomBgAllBtn) {
            applyCustomBgAllBtn.addEventListener('click', () => {
                this.applyCustomBackgroundToAll();
            });
        }

        // Add event listeners if we have a background element
        if (backgroundElement) {
            // Delete button listener
            const deleteBtn = bgProps.querySelector('.delete-background-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    backgroundElement.remove();
                    // Clear state
                    const currentPage = this.pages[this.currentPageIndex];
                    if (currentPage) currentPage.backgroundState = null;
                    this.deselectAll();
                    this.updateRightSidebarView();
                    this.saveCurrentPageState();
                };
            }

            // Zoom control listener
            const zoomControl = bgProps.querySelector('.zoom-control');
            if (zoomControl) {
                const currentScale = parseFloat(backgroundElement.dataset.scale) || 1;
                zoomControl.value = currentScale * 100;
                const zoomValue = zoomControl.parentElement.querySelector('.zoom-value');
                if (zoomValue) {
                    zoomValue.textContent = `${Math.round(currentScale * 100)}%`;
                }

                zoomControl.addEventListener('input', (e) => {
                    const scale = parseFloat(e.target.value) / 100;
                    backgroundElement.style.transform = `scale(${scale})`;
                    backgroundElement.dataset.scale = scale;
                    zoomValue.textContent = `${Math.round(scale * 100)}%`;
                    this.saveCurrentPageState();
                });
            }

            // Reset zoom button listener
            const resetZoomBtn = bgProps.querySelector('.reset-zoom-btn');
            if (resetZoomBtn) {
                resetZoomBtn.addEventListener('click', () => {
                    backgroundElement.style.transform = 'scale(1)';
                    backgroundElement.dataset.scale = '1';
                    if (zoomControl) {
                        zoomControl.value = 100;
                        const zoomValue = zoomControl.parentElement.querySelector('.zoom-value');
                        if (zoomValue) {
                            zoomValue.textContent = '100%';
                        }
                    }
                    this.saveCurrentPageState();
                });
            }

            // Position controls
            const positionBtns = bgProps.querySelectorAll('.position-btn');
            positionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const stepSizeInput = bgProps.querySelector('.step-size-input');
                    let step = parseFloat(stepSizeInput?.value || '1');
                    if (isNaN(step) || step < 0.1 || step > 20) step = 1;

                    const currentLeft = parseFloat(backgroundElement.style.left) || 50;
                    const currentTop = parseFloat(backgroundElement.style.top) || 50;

                    if (btn.classList.contains('up')) {
                        backgroundElement.style.top = `${(currentTop - step).toFixed(1)}%`;
                    } else if (btn.classList.contains('down')) {
                        backgroundElement.style.top = `${(currentTop + step).toFixed(1)}%`;
                    } else if (btn.classList.contains('left')) {
                        backgroundElement.style.left = `${(currentLeft - step).toFixed(1)}%`;
                    } else if (btn.classList.contains('right')) {
                        backgroundElement.style.left = `${(currentLeft + step).toFixed(1)}%`;
                    }
                    this.saveCurrentPageState();
                });
            });
        }

        // Add background style button listeners
        const styleButtons = bgProps.querySelectorAll('.style-btn');
        styleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.style;
                // If there's a custom background image, remove it first
                const existingBg = document.querySelector('.canvas-background-image');
                if (existingBg) {
                    existingBg.remove();
                    const currentPage = this.pages[this.currentPageIndex];
                    if (currentPage) currentPage.backgroundState = null;
                }
                this.applyBackgroundStyle(style);
                styleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.saveCurrentPageState();
            });
        });

        // Set active state for current background style
        const canvas = document.querySelector('#comic-canvas');
        if (canvas) {
            const backgroundClasses = [
                'classic-white', 'vintage-paper', 'dotted-pattern',
                'halftone', 'graph-paper', 'gradient-fade'
            ];
            const currentStyle = Array.from(canvas.classList)
                .find(cls => backgroundClasses.includes(cls));
            if (currentStyle) {
                const activeBtn = bgProps.querySelector(`[data-style="${currentStyle}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }
        }
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
                this.makeSliderValueEditable(sizeControl, sizeValue, '%', 0);
            }
        }
    }

    // --- Add Background Image --- 
    addBackgroundImage(image) {
        console.log("[addBackgroundImage] Called with image:", image); // <<< Debug log
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) {
            console.error("[addBackgroundImage] Canvas element not found!"); // <<< Keep existing error log
            return;
        }

        // Store current states before making changes
        const currentPage = this.pages[this.currentPageIndex];
        const existingPanelStates = currentPage.panelStates ? [...currentPage.panelStates] : [];
        const existingStickerStates = currentPage.stickerStates ? [...currentPage.stickerStates] : [];

        // Remove existing background image for this page if any
        const existingBg = canvas.querySelector('.canvas-background-image');
        if (existingBg) {
            existingBg.remove();
        }

        // Create the new background image element
        const bgImg = document.createElement('img');
        bgImg.src = image.src;
        bgImg.alt = "Canvas Background";
        bgImg.className = 'canvas-background-image'; // Add class for identification
        console.log('[addBackgroundImage] Created img element with src:', bgImg.src); // <<< Debug log
        bgImg.style.position = 'absolute';
        bgImg.style.top = '0';
        bgImg.style.left = '0';
        bgImg.style.width = '100%'; // Cover the entire canvas
        bgImg.style.height = '100%';
        bgImg.style.objectFit = 'cover'; // Or 'contain' depending on desired behavior
        bgImg.style.zIndex = '0'; // Ensure it's behind panels and stickers
        bgImg.dataset.imageId = image.id; // Store image ID

        // Prepend to the canvas so it's behind other elements
        canvas.insertBefore(bgImg, canvas.firstChild);
        console.log('[addBackgroundImage] Inserted img into canvas:', canvas); // <<< Debug log

        // Update the page state while preserving existing states
        currentPage.backgroundState = {
            imageId: image.id
        };
        currentPage.panelStates = existingPanelStates;
        currentPage.stickerStates = existingStickerStates;

        console.log('Background state saved for page:', this.currentPageIndex, {
            background: currentPage.backgroundState,
            panels: currentPage.panelStates.length,
            stickers: currentPage.stickerStates.length
        });

        // Save the overall page state
        this.saveCurrentPageState();
    }

    // --- Apply Custom Background to All Pages ---
    applyCustomBackgroundToAll() {
        // Get the current page's background image ID
        const currentPage = this.pages[this.currentPageIndex];
        const currentImageId = currentPage?.backgroundState?.imageId;
        
        if (!currentImageId) {
            console.warn('No custom background image found on the current page.');
            this.showNotification('No custom background image to apply', 'warning');
            return;
        }
        
        console.log(`Applying background image ID ${currentImageId} to all pages`);
        
        // Apply the background image to all pages
        this.pages.forEach(page => {
            // Set the background image state for this page
            page.backgroundState = { imageId: currentImageId };
            
            // Remove any predefined style class (or set to default)
            page.canvasBackgroundStyle = null;
        });
        
        // Disable the global background style option to avoid conflicts
        this.useGlobalBackgroundStyle = false;
        
        // Update the UI checkbox if it exists
        const globalCheckbox = document.getElementById('use-global-background');
        if (globalCheckbox) {
            globalCheckbox.checked = false;
        }
        
        // Refresh the current page to show the changes
        this.loadPageState(this.currentPageIndex);
        
        // Save the current page state
        this.saveCurrentPageState();
        
        // Show success notification
        this.showNotification('Background image applied to all pages', 'success');
        
        console.log('Applied custom background image to all pages successfully.');
    }
    
    // --- Show Notification ---
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        // Set type-specific styles
        notification.className = 'notification'; // Reset
        notification.classList.add(`notification-${type}`);
        
        // Set content
        notification.textContent = message;
        
        // Show notification
        notification.classList.add('show');
        
        // Hide after delay
        setTimeout(() => {
            notification.classList.remove('show');
            
            // Remove element after animation completes
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500); // Match transition duration
        }, 3000);
    }

    // --- Add Sticker --- 
    addSticker(image, dropX, dropY) {
        console.log("[addSticker] Called with image:", image, "at viewport coords", dropX, dropY); // <<< Keep existing log
        const stickerCanvas = document.querySelector('#comic-canvas');
        if (!stickerCanvas) {
            console.error('[addSticker] Canvas element not found!'); // <<< Keep existing error log
            return;
        }

        const canvasRect = stickerCanvas.getBoundingClientRect();
        const relativeX = dropX - canvasRect.left;
        const relativeY = dropY - canvasRect.top;

        const stickerId = `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stickerImg = document.createElement('img');
        
        Object.assign(stickerImg, {
            id: stickerId,
            src: image.dataUrl || image.src,
            alt: "Sticker",
            className: 'canvas-sticker-image'
        });
        console.log('[addSticker] Created img element with src:', stickerImg.src); // <<< Debug log

        Object.assign(stickerImg.dataset, {
            imageId: image.id,
            size: '200'
        });

        Object.assign(stickerImg.style, {
            position: 'absolute',
            width: '200px',
            height: 'auto',
            cursor: 'grab',
            zIndex: '100'
        });

        // Wait for image to load to get dimensions and set position
        stickerImg.onload = () => {
            const imgWidth = stickerImg.offsetWidth;
            const imgHeight = stickerImg.offsetHeight;
            const canvasWidth = stickerCanvas.offsetWidth;
            const canvasHeight = stickerCanvas.offsetHeight;

            // Calculate bounded position
            let finalLeft = Math.max(0, Math.min(relativeX - imgWidth / 2, canvasWidth - imgWidth));
            let finalTop = Math.max(0, Math.min(relativeY - imgHeight / 2, canvasHeight - imgHeight));

            Object.assign(stickerImg.style, {
                left: `${finalLeft}px`,
                top: `${finalTop}px`
            });

            // Save state after position is set
            if (!this.pages[this.currentPageIndex].stickerStates) {
                this.pages[this.currentPageIndex].stickerStates = [];
            }
            
            this.pages[this.currentPageIndex].stickerStates = this.pages[this.currentPageIndex].stickerStates.filter(s => s.id !== stickerId);
            
            this.pages[this.currentPageIndex].stickerStates.push({
                id: stickerId,
                imageId: image.id,
                left: stickerImg.style.left,
                top: stickerImg.style.top,
                width: stickerImg.style.width,
                height: stickerImg.style.height,
                transform: stickerImg.style.transform || 'scale(1)',
                rotation: stickerImg.dataset.rotation || '0',
                zIndex: stickerImg.style.zIndex // Save zIndex too
            });

            this.saveCurrentPageState();
        };

        stickerCanvas.appendChild(stickerImg);
        console.log('[addSticker] Appended img to canvas:', stickerCanvas); // <<< Debug log
        this.dragAndDropManager.makeStickerDraggable(stickerImg);
        
        stickerImg.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectSticker(stickerImg);
        });

        this.selectSticker(stickerImg);
    }

    // --- Select Sticker --- 
    selectSticker(stickerElement) {
        console.log('Selecting sticker:', stickerElement.id);
        // Deselect any other selected element (panel, text, background, other sticker)
        this.deselectAll();

        this.currentSticker = stickerElement;
        stickerElement.classList.add('selected-sticker'); // Add a specific class for styling
        
        // Update the right sidebar with sticker controls
        this.updateStickerControls(stickerElement);
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
         this.updateRightSidebarView(); 
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

    // --- Make Slider Value Editable ---
    makeSliderValueEditable(slider, valueDisplay, unitSuffix = '', precision = 0) {
        // Add editable class for styling
        valueDisplay.classList.add('editable-slider-value');
        valueDisplay.contentEditable = true;
        
        // Store the unit suffix and precision for formatting
        valueDisplay.dataset.unitSuffix = unitSuffix;
        valueDisplay.dataset.precision = precision;
        
        // Handle Enter key and Escape key
        valueDisplay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Get the numeric value from the text (remove unit suffix)
                let value = valueDisplay.textContent.replace(unitSuffix, '').trim();
                value = parseFloat(value);
                
                // Validate the value
                if (!isNaN(value)) {
                    // Clamp value to slider's min/max
                    const min = parseFloat(slider.min);
                    const max = parseFloat(slider.max);
                    value = Math.min(Math.max(value, min), max);
                    
                    // Update slider value
                    slider.value = value;
                    
                    // Trigger input event on slider to activate its listeners
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Update the display with formatted value (this will happen in the slider's input handler)
                    
                    // Remove focus
                    valueDisplay.blur();
                } else {
                    // Revert to current slider value
                    const formattedValue = precision > 0 
                        ? parseFloat(slider.value).toFixed(precision) 
                        : Math.round(slider.value);
                    valueDisplay.textContent = `${formattedValue}${unitSuffix}`;
                    valueDisplay.blur();
                }
            } else if (e.key === 'Escape') {
                // Revert to current slider value
                const formattedValue = precision > 0 
                    ? parseFloat(slider.value).toFixed(precision) 
                    : Math.round(slider.value);
                valueDisplay.textContent = `${formattedValue}${unitSuffix}`;
                valueDisplay.blur();
            }
        });
        
        // Handle blur event (clicking away)
        valueDisplay.addEventListener('blur', () => {
            // Get the numeric value from the text
            let value = valueDisplay.textContent.replace(unitSuffix, '').trim();
            value = parseFloat(value);
            
            // Validate the value
            if (!isNaN(value) && value !== parseFloat(slider.value)) {
                // Clamp value to slider's min/max
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                value = Math.min(Math.max(value, min), max);
                
                // Update slider value
                slider.value = value;
                
                // Trigger input event on slider to activate its listeners
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                // Revert to current slider value or format correctly
                const formattedValue = precision > 0 
                    ? parseFloat(slider.value).toFixed(precision) 
                    : Math.round(slider.value);
                valueDisplay.textContent = `${formattedValue}${unitSuffix}`;
            }
        });
    }

    addTextToCanvas() {
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) {
            console.error("Cannot add text, canvas not found.");
            return;
        }

        // Determine z-index based on current mode
        const zIndex = this.currentSidebarMode === 'backgrounds' ? '5' : '100'; // Below panels for bg, same level as stickers otherwise

        // Create text container
        const textId = `canvas_text_${Date.now()}`;
        const textContainer = document.createElement('div');
        textContainer.className = 'text-bubble speech-bubble'; // Default style
        textContainer.id = textId;
        textContainer.dataset.bubbleType = 'speech-bubble';
        textContainer.style.position = 'absolute';
        // Center position based on canvas, not panel
        const canvasRect = canvas.getBoundingClientRect();
        // Position top-left corner near center initially
        const initialLeft = Math.max(0, (canvasRect.width / 2) - 50); // Approx center minus half default width
        const initialTop = Math.max(0, (canvasRect.height / 2) - 25); // Approx center minus half default height
        textContainer.style.left = `${initialLeft}px`; 
        textContainer.style.top = `${initialTop}px`;
        // textContainer.style.transform = 'translate(-50%, -50%)'; // REMOVE this centering transform
        textContainer.style.minWidth = '100px';
        textContainer.style.padding = '10px';
        textContainer.style.zIndex = zIndex; // Set z-index based on mode

        // Create editable text element
        const textElement = document.createElement('div');
        textElement.className = 'text-content';
        textElement.contentEditable = true;
        textElement.innerHTML = 'Click to edit text';
        textElement.style.outline = 'none';
        textElement.style.wordWrap = 'break-word';
        textElement.style.color = '#000000';
        textElement.style.padding = '2.5px 2px 5px 2px'; // Reduced top padding by 50%

        // Add control handles (same as addTextToPanel)
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
        dragHandle.title = 'Drag to move';

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        resizeHandle.title = 'Drag to resize';

        const formatButton = document.createElement('div');
        formatButton.className = 'format-text-btn';
        formatButton.innerHTML = '<i class="fas fa-palette"></i>';
        formatButton.title = 'Format text';

        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-text-btn';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.title = 'Delete text';

        // Append elements
        textContainer.appendChild(textElement);
        textContainer.appendChild(dragHandle);
        textContainer.appendChild(resizeHandle);
        textContainer.appendChild(formatButton);
        textContainer.appendChild(deleteButton);
        canvas.appendChild(textContainer); // Append directly to canvas

        // Make draggable (needs adaptation for canvas)
        this.dragAndDropManager.makeCanvasTextDraggable(textContainer, dragHandle); // Use a new/adapted function

        // Make resizable (should work as is)
        this.dragAndDropManager.makeTextResizable(textContainer, resizeHandle);

        // Setup delete functionality (same as addTextToPanel)
        deleteButton.addEventListener('click', () => {
            textContainer.remove();
            const popup = document.getElementById('text-format-popup');
            if (popup) popup.style.display = 'none';
            // No text properties panel to hide specifically here, deselectAll handles it
            this.deselectAll(); 
            this.saveCurrentPageState(); // Save state after deletion
        });

        // Setup formatting button (same as addTextToPanel)
        formatButton.addEventListener('click', (e) => {
            this.showTextFormatPopup(textContainer, e);
        });

        // Setup text selection (same logic, just ensure it works on canvas)
        textContainer.addEventListener('click', (e) => {
            if (e.target !== textElement && !e.target.closest('.format-text-btn') && 
                !e.target.closest('.resize-handle') && !e.target.closest('.delete-text-btn')) {
                this.selectTextBox(textContainer);
                e.stopPropagation();
            }
        });
        textElement.addEventListener('click', (e) => {
            const rect = textElement.getBoundingClientRect();
            const isNearEdge = 
                e.clientX - rect.left < 10 || 
                rect.right - e.clientX < 10 || 
                e.clientY - rect.top < 10 || 
                rect.bottom - e.clientY < 10;
            if (isNearEdge) {
                this.selectTextBox(textContainer);
            }
        });

        // Automatically select the new text box
        this.selectTextBox(textContainer);

        // Save state immediately after adding
        this.saveCurrentPageState(); 

        return textContainer;
    }

    // Helper methods for selection management
    clearSelection() {
        this.imageLibrary.clearSelectedAssets();
        this.imageLibrary.setLastSelectedAsset(null);
        document.querySelectorAll('.thumbnail-container.selected').forEach(el => {
            el.classList.remove('selected');
        });
    }

    getBubbleBackgroundColor(textBox) {
        // First try to get the bubble color from the CSS variable
        const bubbleColorVariable = textBox.style.getPropertyValue('--bubble-background-color');
        
        if (bubbleColorVariable && bubbleColorVariable.trim() !== '') {
            // If it's already a hex value, return it
            if (bubbleColorVariable.startsWith('#')) {
                return bubbleColorVariable;
            }
            // Otherwise convert from rgb/rgba to hex
            return globalRgbToHex(bubbleColorVariable);
        }
        
        // Fall back to computed background color
        const computedBackgroundColor = window.getComputedStyle(textBox).backgroundColor;
        return globalRgbToHex(computedBackgroundColor);
    }
}

// Initialize the comic creator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.comicCreator = new ComicCreator();
}); 