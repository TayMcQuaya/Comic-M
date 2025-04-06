import { layouts } from './layouts.js';

// Global helper function to convert RGB to Hex
function globalRgbToHex(rgb) {
    // Convert rgb(r, g, b) to #rrggbb
    if (!rgb) return '#000000';
    
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!match) return '#000000';
    
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
}

class ComicCreator {
    constructor() {
        this.uploadedImages = [];
        this.pages = [{
            layout: null,
            panelStates: [] // Will store image positions and transforms for each panel
        }];
        this.currentPageIndex = 0;
        this.layouts = layouts; // Store layouts in the instance
        this.init();
    }

    init() {
        this.setupUploadArea();
        this.setupLayoutSelection();
        this.setupComicEditor();
        this.setupEventListeners();
        this.initializeUI();
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
            this.handleImageUpload(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });
    }

    async handleImageUpload(files) {
        const imagePromises = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            resolve({
                                id: Date.now() + Math.random(),
                                name: file.name,
                                src: e.target.result,
                                width: img.width,
                                height: img.height
                            });
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            });

        const newImages = await Promise.all(imagePromises);
        this.uploadedImages.push(...newImages);
        this.updateImageLibrary();
        this.enableNextButton();
    }

    updateImageLibrary() {
        // Find all thumbnails-grid containers
        const grids = document.querySelectorAll('.thumbnails-grid');
        
        // Get all currently used image IDs from panels
        const usedImageIds = Array.from(document.querySelectorAll('.comic-panel'))
            .map(panel => panel.dataset.imageId)
            .filter(id => id);
        
        // Update each grid with the images
        grids.forEach(grid => {
            // Clear existing content
            grid.innerHTML = '';

            // Add images
            this.uploadedImages.forEach(image => {
                const container = document.createElement('div');
                container.className = 'thumbnail-container';
                if (usedImageIds.includes(String(image.id))) {
                    container.classList.add('in-use');
                }
                container.draggable = true;
                container.dataset.imageId = image.id;

                container.innerHTML = `
                    <img src="${image.src}" alt="${image.name}">
                    <div class="image-name">${image.name}</div>
                    ${grid.closest('.editor-sidebar') ? '' : `<button class="delete-btn" data-image-id="${image.id}">×</button>`}
                `;

                // Setup drag functionality for both image dragging and reordering
                this.setupDragAndDrop(container, image);
                
                // Setup delete button if it exists
                const deleteBtn = container.querySelector('.delete-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteImage(image.id));
                }
                
                grid.appendChild(container);

                // Add reordering drag events for both upload page and editor sidebar
                this.setupReorderDrag(container);
            });

            // Add drop zone functionality to the grid itself
            this.setupGridDropZone(grid);
        });
    }

    setupDragAndDrop(container, image) {
        container.addEventListener('dragstart', (e) => {
            container.classList.add('dragging');
            // Set both data types for compatibility
            e.dataTransfer.setData('image/id', image.id.toString());
            e.dataTransfer.setData('reorder/id', image.id.toString());
            e.dataTransfer.effectAllowed = 'copyMove';
        });

        container.addEventListener('dragend', () => {
            container.classList.remove('dragging');
        });
    }

    deleteImage(imageId) {
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
        this.updateImageLibrary();
        this.enableNextButton();
    }

    enableNextButton() {
        const nextBtn = document.querySelector('#next-step-btn');
        nextBtn.disabled = this.uploadedImages.length === 0;
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
            if (e.key === 'Delete' && this.currentPanel && this.currentPanel.querySelector('img')) {
                this.clearPanelImage(this.currentPanel);
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
            const panel = e.target.closest('.comic-panel');
            if (panel) {
                panel.classList.remove('drop-target');
                const imageId = e.dataTransfer.getData('image/id');
                console.log('Dropped image ID:', imageId); // Debug log
                const image = this.uploadedImages.find(img => String(img.id) === imageId);
                console.log('Found image:', image); // Debug log
                if (image) {
                    this.addImageToPanel(panel, image);
                } else {
                    console.error('Image not found for ID:', imageId);
                }
            }
        });

        canvas.addEventListener('click', (e) => {
            const panel = e.target.closest('.comic-panel');
            if (panel) {
                this.selectPanel(panel);
            }
        });
    }

    handleDragStart(e, image) {
        e.dataTransfer.setData('image/id', image.id.toString());
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
    }

    addImageToPanel(panel, image) {
        if (!panel || !image) {
            console.error('Cannot add image to panel: invalid panel or image', { panel, image });
            return;
        }
        
        console.log('Adding image to panel:', image); // Debug log
        
        try {
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.name;
            
            // Clear existing content and add new image
            panel.innerHTML = '';
            panel.appendChild(img);
            
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
            this.updateImageLibrary(); // Update thumbnail states
            
            this.setupImageDragging(img);
            this.selectPanel(panel);
        } catch (error) {
            console.error('Error adding image to panel:', error);
        }
    }

    setupImageDragging(img) {
        if (!img) {
            console.error("setupImageDragging called with undefined image");
            return;
        }
        
        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;

        const onMouseDown = (e) => {
            // Initialize dragging state
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get the current position values (defaulting to 50% if not set)
            startLeft = parseFloat(img.style.left) || 50;
            startTop = parseFloat(img.style.top) || 50;
            
            // Set cursor and visual feedback
            img.style.cursor = 'grabbing';
            
            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            // Ensure opacity stays at 1 during drag
            img.style.opacity = '1';

            // Calculate the distance moved
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Convert pixel movement to percentage based on panel size
            const panel = img.parentElement;
            if (!panel) return;
            
            const percentX = (deltaX / panel.offsetWidth) * 100;
            const percentY = (deltaY / panel.offsetHeight) * 100;

            // Update image position
            img.style.left = `${startLeft + percentX}%`;
            img.style.top = `${startTop + percentY}%`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            img.style.cursor = 'grab';
            img.style.opacity = '1';
            
            // Save the current page state when we finish dragging
            this.saveCurrentPageState();
        };

        // Add mouse event listeners
        img.style.cursor = 'grab';
        img.style.pointerEvents = 'auto'; // Enable pointer events for dragging
        img.style.opacity = '1'; // Ensure initial opacity is 1
        img.draggable = false; // Disable native dragging
        
        img.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Prevent default drag behavior
        img.addEventListener('dragstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
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

        // Clear existing controls
        controls.innerHTML = `
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
            </div>
            <div class="control-group">
                <h4 style="text-align: center;">Image Controls</h4>
                ${panel.querySelector('img') ? `
                    <button class="delete-panel-image-btn" style="width: 100%; margin-bottom: 1rem;">
                        <i class="fas fa-trash"></i> Remove Image
                    </button>
                ` : ''}
                <div class="zoom-group">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <label>Zoom</label>
                        <button class="reset-zoom-btn" style="padding: 4px 8px; font-size: 14px;">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    </div>
                    <input type="range" class="zoom-control" min="50" max="300" value="100">
                    <span class="zoom-value">100%</span>
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
                <div class="position-controls">
                    <button class="position-btn up"><i class="fas fa-chevron-up"></i></button>
                    <button class="position-btn left"><i class="fas fa-chevron-left"></i></button>
                    <button class="position-btn right"><i class="fas fa-chevron-right"></i></button>
                    <button class="position-btn down"><i class="fas fa-chevron-down"></i></button>
                </div>
            </div>
        `;

        // Add event listener for delete button
        const deleteBtn = controls.querySelector('.delete-panel-image-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.clearPanelImage(panel));
        }

        // Get the current scale value
        const img = panel.querySelector('img');
        if (!img) return;

        const currentScale = parseFloat(panel.dataset.currentScale) || 1;
        const initialScale = parseFloat(panel.dataset.initialScale) || 1;
        
        // Update zoom control
        const zoomControl = controls.querySelector('.zoom-control');
        if (zoomControl) {
            // Convert scale to percentage relative to initial scale
            const zoomPercentage = (currentScale / initialScale) * 100;
            zoomControl.value = zoomPercentage;
            const zoomValue = zoomControl.parentElement.querySelector('.zoom-value');
            if (zoomValue) {
                zoomValue.textContent = `${Math.round(zoomPercentage)}%`;
            }

            // Add zoom event listener
            zoomControl.addEventListener('input', (e) => this.handleZoom(e, panel));
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
                    const zoomValue = zoomControl.parentElement.querySelector('.zoom-value');
                    if (zoomValue) {
                        zoomValue.textContent = '100%';
                    }
                }

                // Save the current page state
                this.saveCurrentPageState();
            });
        }

        // Add position control listeners
        controls.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handlePositionChange(btn, panel));
        });

        // Add background style event listeners
        const styleButtons = controls.querySelectorAll('.style-btn');
        styleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.style;
                this.applyBackgroundStyle(style);
                
                // Update active state of buttons
                styleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    clearPanelImage(panel) {
        if (!panel) return;
        
        // Remove the image and reset panel state
        panel.innerHTML = '';
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
                        width: textBubble.style.width,
                        height: textBubble.style.height,
                        transform: textBubble.style.transform,
                        backgroundColor: textBubble.style.backgroundColor,
                        fontFamily: textElement.style.fontFamily,
                        fontSize: textElement.style.fontSize,
                        fontWeight: textElement.style.fontWeight,
                        fontStyle: textElement.style.fontStyle,
                        textDecoration: textElement.style.textDecoration,
                        textAlign: textElement.style.textAlign,
                        textTransform: textElement.style.textTransform,
                        color: textElement.style.color,
                        opacity: textElement.style.opacity,
                        textShadow: textElement.style.textShadow
                    }
                });
            });
            
            return panelState;
        });

        // Save canvas background style
        const canvas = document.querySelector('#comic-canvas');
        if (canvas) {
            currentPage.canvasBackgroundStyle = Array.from(canvas.classList)
                .find(cls => ['classic-white', 'vintage-paper', 'dotted-pattern', 
                             'halftone', 'graph-paper', 'gradient-fade'].includes(cls)) 
                || 'classic-white';
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

        // Add Text Button
        document.querySelector('#add-text-btn')?.addEventListener('click', () => {
            if (this.currentPanel) {
                this.addTextToPanel(this.currentPanel);
            } else {
                alert('Please select a panel first');
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
            this.downloadComic();
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
                    this.handleImageUpload(e.dataTransfer.files);
                });
                fileInput.addEventListener('change', (e) => {
                    this.handleImageUpload(e.target.files);
                });
            }
            
            // Update image library
            this.updateImageLibrary();
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
                <button class="tool-btn" id="prevPage">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span class="page-indicator">Page 1 of 1</span>
                <button class="tool-btn" id="nextPage">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="page-actions">
                <button class="primary-btn" id="addPage">
                    <i class="fas fa-plus"></i> Add New Page
                </button>
                <button class="danger-btn" id="deletePage">
                    <i class="fas fa-trash"></i> Delete Page
                </button>
            </div>
        `;
        editorHeader.appendChild(pageNavigation);

        // Add event listeners for page navigation
        this.setupPageNavigation();
    }

    setupPageNavigation() {
        const addPageBtn = document.getElementById('addPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const deletePageBtn = document.getElementById('deletePage');

        addPageBtn.addEventListener('click', () => this.showLayoutSelection());
        prevPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex - 1));
        nextPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex + 1));
        deletePageBtn.addEventListener('click', () => this.deleteCurrentPage());
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
        if (!page || !page.layout) return false;
        
        console.log(`Loading page ${pageIndex} with layout: ${page.layout}`);
        
        // Set the current layout and create the comic structure
        this.selectedLayout = page.layout; // This is now the layout ID
        
        // We need to check if page.layout is an ID string or a layout object
        let layoutConfig;
        if (typeof page.layout === 'string') {
            // It's an ID, look it up in this.layouts
            layoutConfig = this.layouts[page.layout];
        } else if (typeof page.layout === 'object') {
            // It's an object, use it directly (this handles legacy data)
            layoutConfig = page.layout;
            // Fix the page to store the ID for next time
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
        
        // Only proceed if we have a valid layout config
        if (!layoutConfig) {
            console.error(`Failed to find layout configuration for page ${pageIndex}`);
            return false;
        }
        
        this.createComic(layoutConfig);
        
        // Set canvas background style
        const canvas = document.querySelector('#comic-canvas');
        if (canvas && page.canvasBackgroundStyle) {
            canvas.className = ''; // Clear existing classes
            canvas.classList.add(page.canvasBackgroundStyle);
        }
        
        // Restore panel states
        const panels = document.querySelectorAll('.comic-panel');
        
        // Check if we have panel states stored and if they match the layout's panel count
        if (page.panelStates && page.panelStates.length > 0) {
            // Make sure we only process as many panels as we have in the layout
            const processablePanels = Math.min(panels.length, page.panelStates.length);
            
            console.log(`Restoring ${processablePanels} panel states`);
            
            // Restore each panel's state
            for (let index = 0; index < processablePanels; index++) {
                const panel = panels[index];
                const state = page.panelStates[index];
                
                // Set panel background style
                if (state.backgroundStyle) {
                    panel.dataset.backgroundStyle = state.backgroundStyle;
                    // Apply background styling here if needed
                }
                
                // Restore image if it exists
                if (state.imageId) {
                    const image = this.uploadedImages.find(img => String(img.id) === String(state.imageId));
                    if (image) {
                        // For images, we need to clear the panel first
                        panel.innerHTML = '';
                        
                        // Create and add the image
                        const img = document.createElement('img');
                        img.src = image.src;
                        img.alt = image.name || 'Panel image';
                        img.style.position = 'absolute';
                        img.style.left = state.left || '50%';
                        img.style.top = state.top || '50%';
                        img.style.transform = state.transform || 'translate(-50%, -50%) scale(1)';
                        
                        // Set data attributes
                        panel.dataset.imageId = state.imageId;
                        img.dataset.imageId = state.imageId;
                        panel.dataset.initialScale = state.initialScale || '1';
                        panel.dataset.currentScale = state.currentScale || '1';
                        
                        // Add the image to the panel
                        panel.appendChild(img);
                        
                        // Setup image dragging
                        this.setupImageDragging(img);
                    }
                }
                
                // Restore text elements
                if (state.textElements && state.textElements.length > 0) {
                    state.textElements.forEach(textData => {
                        // Create the text bubble
                        const textContainer = this.addTextToPanel(panel);
                        
                        // Set the ID
                        textContainer.id = textData.id;
                        
                        // Store previous bubble type if it exists
                        if (textData.previousBubbleType) {
                            textContainer.dataset.previousBubbleType = textData.previousBubbleType;
                        }
                        
                        // Apply the bubble type
                        textContainer.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'jagged-bubble', 'no-bubble');
                        textContainer.classList.add(textData.bubbleType);
                        textContainer.dataset.bubbleType = textData.bubbleType;
                        
                        // Apply tail position if it exists
                        if (textData.tailPosition) {
                            const tailPrefix = textData.bubbleType === 'speech-bubble' ? 'speech-tail-' : 'thought-tail-';
                            textContainer.classList.add(`${tailPrefix}${textData.tailPosition}`);
                            textContainer.dataset.tailPosition = textData.tailPosition;
                        }
                        
                        // Set content
                        const textElement = textContainer.querySelector('.text-content');
                        textElement.innerHTML = textData.content;
                        
                        // Apply styles
                        const style = textData.style;
                        
                        // Apply bubble styles
                        textContainer.style.left = style.left;
                        textContainer.style.top = style.top;
                        textContainer.style.width = style.width;
                        textContainer.style.height = style.height;
                        textContainer.style.transform = style.transform;
                        textContainer.style.backgroundColor = style.backgroundColor;
                        
                        // Apply text styles
                        textElement.style.fontFamily = style.fontFamily;
                        textElement.style.fontSize = style.fontSize;
                        textElement.style.fontWeight = style.fontWeight;
                        textElement.style.fontStyle = style.fontStyle;
                        textElement.style.textDecoration = style.textDecoration;
                        textElement.style.textAlign = style.textAlign;
                        textElement.style.textTransform = style.textTransform;
                        textElement.style.color = style.color;
                        textElement.style.opacity = style.opacity;
                        textElement.style.textShadow = style.textShadow;
                    });
                }
            }
        }
        
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

    async downloadComic() {
        // Save the current page state before generating the PDF
        this.saveCurrentPageState();
        
        console.log('Starting PDF generation for all pages...');

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        document.body.appendChild(loadingIndicator);

        // Store current UI state and page index
        const currentPageIndex = this.currentPageIndex;
        console.log(`Current page index before export: ${currentPageIndex}`);
        
        const selectedPanel = document.querySelector('.comic-panel.selected');
        const selectedTextBoxes = document.querySelectorAll('.text-bubble.selected-text');
        
        // Temporarily hide UI elements for the export
        if (selectedPanel) {
            selectedPanel.classList.remove('selected');
        }
        
        selectedTextBoxes.forEach(textBox => {
            textBox.classList.remove('selected-text');
        });

        try {
            // Create a new array to store page images
            const pageImages = [];
            
            // Process each page one by one
            for (let index = 0; index < this.pages.length; index++) {
                // Update loading message
                loadingIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Capturing page ${index + 1} of ${this.pages.length}...`;
                
                // Navigate to the page - this will load the page with its own state
                this.navigateToPage(index, true);
                
                console.log(`Capturing page ${index + 1}`);
                
                // Allow time for the page to render completely
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Get the comic canvas
                const canvas = document.getElementById('comic-canvas');
                
                // Add export class to hide UI elements during capture
                canvas.classList.add('exporting');
                
                // Hide any selected elements on this page
                canvas.querySelectorAll('.comic-panel.selected').forEach(panel => {
                    panel.classList.remove('selected');
                });
                
                canvas.querySelectorAll('.text-bubble.selected-text').forEach(textBox => {
                    textBox.classList.remove('selected-text');
                });
                
                // Use html2canvas to convert to canvas
                try {
                    const h2c = await html2canvas(canvas, {
                        allowTaint: true,
                        useCORS: true,
                        scale: 2, // Higher quality
                        backgroundColor: null,
                        logging: false
                    });
                    
                    // Store the page image with its index
                    pageImages.push({
                        canvas: h2c,
                        index: index
                    });
                    
                    // Remove the export class
                    canvas.classList.remove('exporting');
                } catch (error) {
                    console.error(`Error capturing page ${index + 1}:`, error);
                }
            }
            
            // Update loading message
            loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating PDF...';
            
            if (pageImages.length === 0) {
                console.error('Failed to generate any page images');
                alert('Failed to generate the PDF. Please try again.');
                return;
            }
            
            // Sort by page index (in case async processing completed out of order)
            pageImages.sort((a, b) => a.index - b.index);
            
            // Create PDF
            const pdf = new jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [700, 700]
            });
            
            // Add pages
            pageImages.forEach((result, i) => {
                // Add a new page for each page after the first
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Add the image to the PDF
                pdf.addImage(
                    result.canvas.toDataURL('image/jpeg', 0.85),
                    'JPEG',
                    0,
                    0,
                    700,
                    700
                );
            });
            
            // Save the PDF
            pdf.save('my-comic.pdf');
            
            console.log('PDF generated successfully with', pageImages.length, 'pages');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('An error occurred while generating the PDF: ' + error.message);
        } finally {
            // Remove loading indicator
            loadingIndicator.remove();
            
            // Remove export class from any remaining
            document.querySelectorAll('.exporting').forEach(el => {
                el.classList.remove('exporting');
            });
            
            // Navigate back to the original page
            console.log(`Returning to original page: ${currentPageIndex}`);
            this.navigateToPage(currentPageIndex, true);
            
            // Restore UI state
            if (selectedPanel) {
                selectedPanel.classList.add('selected');
            }
            
            selectedTextBoxes.forEach(textBox => {
                textBox.classList.add('selected-text');
            });
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

        // Save the current page state
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

    setupReorderDrag(container) {
        // Remove the dragstart listener since it's handled in setupDragAndDrop
        container.addEventListener('dragend', () => {
            container.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });

        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (!container.classList.contains('dragging')) {
                container.classList.add('drag-over');
            }
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.target.closest('.comic-panel') ? 'copy' : 'move';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('reorder/id');
            if (draggedId && draggedId !== container.dataset.imageId) {
                this.reorderImages(draggedId, container.dataset.imageId);
            }
        });
    }

    setupGridDropZone(grid) {
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const draggingElement = document.querySelector('.dragging');
            if (draggingElement) {
                const siblings = [...grid.querySelectorAll('.thumbnail-container:not(.dragging)')];
                const nextSibling = siblings.find(sibling => {
                    const rect = sibling.getBoundingClientRect();
                    return e.clientY < rect.top + rect.height / 2;
                });
                if (nextSibling) {
                    grid.insertBefore(draggingElement, nextSibling);
                } else {
                    grid.appendChild(draggingElement);
                }
            }
        });
    }

    reorderImages(fromId, toId) {
        const fromIndex = this.uploadedImages.findIndex(img => String(img.id) === fromId);
        const toIndex = this.uploadedImages.findIndex(img => String(img.id) === toId);
        
        if (fromIndex !== -1 && toIndex !== -1) {
            // Reorder the array
            const [movedImage] = this.uploadedImages.splice(fromIndex, 1);
            this.uploadedImages.splice(toIndex, 0, movedImage);
            
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
        textContainer.style.left = '50%';
        textContainer.style.top = '50%';
        textContainer.style.transform = 'translate(-50%, -50%)';
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
        this.makeTextDraggable(textContainer, dragHandle);
        
        // Make resizable
        this.makeTextResizable(textContainer, resizeHandle);
        
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
            if (e.target !== textElement && !e.target.closest('.format-text-btn')) {
                this.selectTextBox(textContainer);
            }
        });
        
        // Automatically select the new text box
        this.selectTextBox(textContainer);
        
        return textContainer;
    }
    
    makeTextDraggable(element, handle) {
        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;
        let panelRect;
        
        const onMouseDown = (e) => {
            // Only drag when using the handle or the bubble border (not controls or content)
            const isHandle = e.target === handle || e.target.closest('.drag-handle');
            const isBubbleBorder = e.target === element && !e.target.closest('.text-content, .resize-handle, .format-text-btn, .delete-text-btn');
            
            if (!isHandle && !isBubbleBorder) {
                return;
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get the panel rectangle to calculate boundaries
            const panel = element.parentElement;
            panelRect = panel.getBoundingClientRect();
            
            // Calculate position relative to panel
            const rect = element.getBoundingClientRect();
            startLeft = ((rect.left - panelRect.left) / panelRect.width) * 100;
            startTop = ((rect.top - panelRect.top) / panelRect.height) * 100;
            
            // Add dragging class for visual feedback
            element.classList.add('dragging-text');
            handle.style.cursor = 'grabbing';
            
            e.preventDefault();
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const panel = element.parentElement;
            const percentX = (deltaX / panel.offsetWidth) * 100;
            const percentY = (deltaY / panel.offsetHeight) * 100;
            
            // Calculate new position
            let newLeft = startLeft + percentX;
            let newTop = startTop + percentY;
            
            // Get element dimensions
            const elementRect = element.getBoundingClientRect();
            const elementWidth = elementRect.width;
            const elementHeight = elementRect.height;
            
            // Calculate boundaries (keeping at least 10% of the element inside the panel)
            const minLeft = -elementWidth * 0.9 / panelRect.width * 100;
            const maxLeft = 100 - elementWidth * 0.1 / panelRect.width * 100;
            const minTop = -elementHeight * 0.9 / panelRect.height * 100;
            const maxTop = 100 - elementHeight * 0.1 / panelRect.height * 100;
            
            // Apply boundaries
            newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
            newTop = Math.max(minTop, Math.min(newTop, maxTop));
            
            // Set position
            element.style.left = `${newLeft}%`;
            element.style.top = `${newTop}%`;
        };
        
        const onMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            element.classList.remove('dragging-text');
            handle.style.cursor = 'grab';
        };
        
        handle.style.cursor = 'grab';
        handle.addEventListener('mousedown', onMouseDown);
        element.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    makeTextResizable(element, handle) {
        let isResizing = false;
        let startX, startY;
        let startWidth, startHeight;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            element.style.width = `${startWidth + deltaX}px`;
            element.style.height = `${startHeight + deltaY}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }
    
    selectTextBox(textBox) {
        // Deselect any previously selected text box
        document.querySelectorAll('.text-bubble').forEach(box => {
            box.classList.remove('selected-text');
        });
        
        // Select the current text box
        textBox.classList.add('selected-text');
        this.currentTextBox = textBox;
        
        // Show text properties panel
        const textProperties = document.getElementById('text-properties');
        textProperties.style.display = 'block';
        
        // Update properties panel with the current text box's styles
        this.updateTextProperties(textBox);
    }
    
    updateTextProperties(textBox) {
        const textProperties = document.getElementById('text-properties');
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
                    <input type="color" class="font-color" value="#000000">
                </div>
                <div class="control-group">
                    <label>Bubble Color</label>
                    <input type="color" class="bubble-color" value="#ffffff">
                </div>
                <div class="control-group">
                    <label>Text Style</label>
                    <div class="text-style-buttons">
                        <button class="style-btn bold-btn" title="Bold"><i class="fas fa-bold"></i></button>
                        <button class="style-btn italic-btn" title="Italic"><i class="fas fa-italic"></i></button>
                        <button class="style-btn underline-btn" title="Underline"><i class="fas fa-underline"></i></button>
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
        
        const textElement = textBox.querySelector('.text-content');
        const computedStyle = window.getComputedStyle(textElement);
        
        const fontFamily = textProperties.querySelector('.font-family');
        fontFamily.value = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '') || 'Arial';
        
        const fontSize = textProperties.querySelector('.font-size');
        const fontSizeValue = parseInt(computedStyle.fontSize) || 16;
        fontSize.value = fontSizeValue;
        textProperties.querySelector('.font-size-value').textContent = `${fontSizeValue}px`;
        
        const fontColor = textProperties.querySelector('.font-color');
        fontColor.value = this.rgbToHex(computedStyle.color) || '#000000';
        
        const bubbleColor = textProperties.querySelector('.bubble-color');
        bubbleColor.value = this.rgbToHex(window.getComputedStyle(textBox).backgroundColor) || '#ffffff';
        
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
            
            // Save state after changing font color
            this.saveCurrentPageState();
        });
        
        bubbleColor.addEventListener('input', () => {
            textBox.style.backgroundColor = bubbleColor.value;
            
            // Save state after changing bubble color
            this.saveCurrentPageState();
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
        
        rotation.addEventListener('input', () => {
            const value = rotation.value;
            textProperties.querySelector('.rotation-value').textContent = `${value}°`;
            
            // Preserve the translate part of the transform
            const transform = textBox.style.transform;
            const translateMatch = transform.match(/translate\(([^)]+)\)/);
            const translate = translateMatch ? `translate(${translateMatch[1]})` : 'translate(-50%, -50%)';
            
            textBox.style.transform = `${translate} rotate(${value}deg)`;
            
            // Save state after changing rotation
            this.saveCurrentPageState();
        });
        
        // Set the active state for the text style buttons
        if (textElement.style.fontWeight === 'bold') boldBtn.classList.add('active');
        if (textElement.style.fontStyle === 'italic') italicBtn.classList.add('active');
        if (textElement.style.textDecoration === 'underline') underlineBtn.classList.add('active');
    }
    
    // Helper function for the text properties
    rgbToHex(rgb) {
        return globalRgbToHex(rgb);
    }

    showTextFormatPopup(textBox, event) {
        // Remove any existing popup
        let popup = document.getElementById('text-format-popup');
        if (popup) {
            popup.remove();
        }
        
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
                                <input type="range" id="font-size" class="font-size" min="8" max="72" value="${parseInt(textElement.style.fontSize) || 16}">
                                <span class="font-size-value">${parseInt(textElement.style.fontSize) || 16}px</span>
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
                            <input type="color" id="text-color" class="text-color" value="${this.rgbToHex(window.getComputedStyle(textElement).color)}">
                        </div>
                        <div class="color-control">
                            <label for="bubble-color">Bubble Color</label>
                            <input type="color" id="bubble-color" class="bubble-color" value="${this.rgbToHex(window.getComputedStyle(textBox).backgroundColor)}">
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
                                <input type="color" id="outline-color" value="${this.getOutlineColor(textElement)}" ${!textElement.style.webkitTextStroke ? 'disabled' : ''}>
                            </div>
                            <div class="shadow-control">
                                <input type="checkbox" id="text-shadow" ${textElement.style.textShadow ? 'checked' : ''}>
                                <input type="color" id="shadow-color" value="${this.getShadowColor(textElement)}" ${!textElement.style.textShadow ? 'disabled' : ''}>
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
        
        // Select the current text box
        this.selectTextBox(textBox);
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
        popup.querySelector('#text-color').addEventListener('input', (e) => {
            textElement.style.color = e.target.value;
        });
        
        popup.querySelector('#bubble-color').addEventListener('input', (e) => {
            textBox.style.backgroundColor = e.target.value;
        });
        
        // Text outline
        const textOutlineCheckbox = popup.querySelector('#text-outline');
        const outlineThicknessInput = popup.querySelector('#outline-thickness');
        const outlineColorPicker = popup.querySelector('#outline-color');

        textOutlineCheckbox.addEventListener('change', () => {
            if (textOutlineCheckbox.checked) {
                outlineThicknessInput.disabled = false;
                outlineColorPicker.disabled = false;
                this.applyTextOutline(textElement, outlineColorPicker.value, parseFloat(outlineThicknessInput.value));
            } else {
                outlineThicknessInput.disabled = true;
                outlineColorPicker.disabled = true;
                this.removeTextOutline(textElement);
            }
            
            // Save state after changing outline
            this.saveCurrentPageState();
        });

        outlineThicknessInput.addEventListener('input', () => {
            if (textOutlineCheckbox.checked) {
                this.applyTextOutline(textElement, outlineColorPicker.value, parseFloat(outlineThicknessInput.value));
                // Save state after changing outline thickness
                this.saveCurrentPageState();
            }
        });

        outlineColorPicker.addEventListener('input', () => {
            if (textOutlineCheckbox.checked) {
                this.applyTextOutline(textElement, outlineColorPicker.value, parseFloat(outlineThicknessInput.value));
                // Save state after changing outline color
                this.saveCurrentPageState();
            }
        });
        
        // Text shadow
        const textShadowCheckbox = popup.querySelector('#text-shadow');
        const shadowColorPicker = popup.querySelector('#shadow-color');

        textShadowCheckbox.addEventListener('change', () => {
            if (textShadowCheckbox.checked) {
                shadowColorPicker.disabled = false;
                this.applyTextShadow(textElement, shadowColorPicker.value);
            } else {
                shadowColorPicker.disabled = true;
                this.removeTextShadow(textElement);
            }
            
            // Save state after changing shadow
            this.saveCurrentPageState();
        });

        shadowColorPicker.addEventListener('input', () => {
            if (textShadowCheckbox.checked) {
                this.applyTextShadow(textElement, shadowColorPicker.value);
                // Save state after changing shadow color
                this.saveCurrentPageState();
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
        
        rotationSlider.addEventListener('input', () => {
            const value = rotationSlider.value;
            rotationValue.textContent = `${value}°`;
            
            // Preserve the translate part of the transform
            const transform = textBox.style.transform;
            const translateMatch = transform.match(/translate\(([^)]+)\)/);
            const translate = translateMatch ? `translate(${translateMatch[1]})` : 'translate(-50%, -50%)';
            
            textBox.style.transform = `${translate} rotate(${value}deg)`;
        });

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
    }
    
    // Helper methods for text formatting
    getRotationValue(textBox) {
        const transform = textBox.style.transform;
        const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);
        return rotateMatch ? parseInt(rotateMatch[1]) : 0;
    }
    
    applyTextOutline(textElement, color, thickness = 2) {
        // Store the current text content
        const text = textElement.textContent || textElement.innerText;
        
        // Set the data attributes for the outline effect
        textElement.setAttribute('data-has-outline', 'true');
        textElement.setAttribute('data-text', text);
        
        // Set the CSS custom properties for the outline
        textElement.style.setProperty('--outline-color', color);
        textElement.style.setProperty('--outline-width', `${thickness}px`);
        textElement.style.setProperty('--text-color', textElement.style.color || '#000000');
        
        // Add smooth text rendering
        textElement.style.webkitFontSmoothing = 'antialiased';
        textElement.style.mozOsxFontSmoothing = 'grayscale';
        textElement.style.textRendering = 'optimizeLegibility';
    }
    
    removeTextOutline(textElement) {
        // Remove the outline-related attributes and styles
        textElement.removeAttribute('data-has-outline');
        textElement.removeAttribute('data-text');
        textElement.style.removeProperty('--outline-color');
        textElement.style.removeProperty('--outline-width');
        textElement.style.removeProperty('--text-color');
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
        return color ? this.rgbToHex(color[0]) : '#000000';
    }

    getShadowColor(textElement) {
        const shadow = textElement.style.textShadow || '';
        const color = shadow.match(/[#][a-fA-F0-9]{6}/) || shadow.match(/rgba?\([^)]+\)/);
        return color ? this.rgbToHex(color[0]) : '#666666';
    }

    // Add a new method to update the outline text content when text changes
    updateOutlineText(textElement) {
        if (textElement.hasAttribute('data-has-outline')) {
            textElement.setAttribute('data-text', textElement.textContent || textElement.innerText);
        }
    }
}

// Initialize the comic creator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.comicCreator = new ComicCreator();
}); 