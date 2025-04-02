import { layouts } from './layouts.js';

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
            .filter(id => id); // Filter out undefined/null values
        
        // Update each grid with the images
        grids.forEach(grid => {
            // Clear existing content
            grid.innerHTML = '';

            // Add images
            this.uploadedImages.forEach(image => {
                const container = document.createElement('div');
                container.className = 'thumbnail-container';
                if (usedImageIds.includes(image.id.toString())) {
                    container.classList.add('in-use');
                }
                container.draggable = true;
                container.dataset.imageId = image.id;

                container.innerHTML = `
                    <img src="${image.src}" alt="${image.name}">
                    <div class="image-name">${image.name}</div>
                    ${grid.closest('.editor-sidebar') ? '' : `<button class="delete-btn" data-image-id="${image.id}">×</button>`}
                `;

                // Setup drag functionality
                this.setupDragAndDrop(container, image);
                
                // Setup delete button if it exists
                const deleteBtn = container.querySelector('.delete-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.deleteImage(image.id));
                }
                
                grid.appendChild(container);
            });
        });
    }

    setupDragAndDrop(container, image) {
        container.addEventListener('dragstart', (e) => {
            container.classList.add('dragging');
            e.dataTransfer.setData('image/id', image.id.toString());
            e.dataTransfer.effectAllowed = 'copy';
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
        console.log('Adding image to panel:', image); // Debug log
        
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
    }

    setupImageDragging(img) {
        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;

        const onMouseDown = (e) => {
            if (!img.parentElement.classList.contains('selected')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(img.style.left) || 50;
            startTop = parseInt(img.style.top) || 50;
            
            // Change cursor
            img.style.cursor = 'grabbing';
            
            // Prevent image drag default behavior
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            // Calculate the distance moved
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Convert pixel movement to percentage based on panel size
            const panel = img.parentElement;
            const percentX = (deltaX / panel.offsetWidth) * 100;
            const percentY = (deltaY / panel.offsetHeight) * 100;

            // Update image position
            img.style.left = `${startLeft + percentX}%`;
            img.style.top = `${startTop + percentY}%`;
        };

        const onMouseUp = () => {
            isDragging = false;
            img.style.cursor = 'grab';
        };

        // Add mouse event listeners
        img.style.cursor = 'grab';
        img.style.pointerEvents = 'auto'; // Enable pointer events for dragging
        img.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
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
            if (controls) {
                controls.innerHTML = '';
            }
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
                    <input type="range" class="zoom-control" min="50" max="200" value="100">
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
        const currentPage = this.pages[this.currentPageIndex];
        if (!currentPage) return;
        
        // Save layout
        currentPage.layout = this.layouts[this.selectedLayout];
        
        // Save panel states
        currentPage.panelStates = Array.from(document.querySelectorAll('.comic-panel')).map(panel => {
            const img = panel.querySelector('img');
            if (!img) return { 
                imageId: null,
                backgroundStyle: panel.dataset.backgroundStyle || 'classic-white'
            };
            
            // Ensure we're saving the actual image ID from the panel
            const imageId = panel.dataset.imageId || img.dataset.imageId;
            
            return {
                imageId: imageId,
                transform: img.style.transform || 'translate(-50%, -50%) scale(1)',
                left: img.style.left || '50%',
                top: img.style.top || '50%',
                initialScale: panel.dataset.initialScale || '1',
                currentScale: panel.dataset.currentScale || '1',
                backgroundStyle: panel.dataset.backgroundStyle || 'classic-white'
            };
        });

        // Save canvas background style
        const canvas = document.querySelector('#comic-canvas');
        if (canvas) {
            currentPage.canvasBackgroundStyle = Array.from(canvas.classList)
                .find(cls => ['classic-white', 'vintage-paper', 'dotted-pattern', 
                             'halftone', 'graph-paper', 'gradient-fade'].includes(cls)) 
                || 'classic-white';
        }
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
        if (!layoutConfig) return;

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
        canvas.style.backgroundColor = 'white';
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

        // Only save state if this is a new page creation
        if (!layout) {
            this.saveCurrentPageState();
        }
    }

    getLayoutConfig(layoutName) {
        return this.layouts[layoutName]; // Use the instance property instead of window.comicLayouts
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
            <button class="primary-btn" id="addPage">
                <i class="fas fa-plus"></i> Add New Page
            </button>
        `;
        editorHeader.appendChild(pageNavigation);

        // Add event listeners for page navigation
        this.setupPageNavigation();
    }

    setupPageNavigation() {
        const addPageBtn = document.getElementById('addPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');

        addPageBtn.addEventListener('click', () => this.showLayoutSelection());
        prevPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex - 1));
        nextPageBtn.addEventListener('click', () => this.navigateToPage(this.currentPageIndex + 1));
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
        // Save current page state before creating new page
        this.saveCurrentPageState();
        
        // Create new page with the selected layout
        this.pages.push({
            layout: this.layouts[layoutId],
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

    navigateToPage(index) {
        if (index < 0 || index >= this.pages.length) return;
        
        // Save current page state before navigating
        this.saveCurrentPageState();
        
        // Update current page index
        this.currentPageIndex = index;
        
        // Get the target page
        const page = this.pages[index];
        if (!page || !page.layout) return;
        
        // Set the current layout
        this.selectedLayout = Object.entries(this.layouts).find(
            ([_, layout]) => layout === page.layout
        )?.[0];
        
        // Create panels with the saved layout
        this.createComic(page.layout);
        
        // Restore panel states
        if (page.panelStates && page.panelStates.length > 0) {
            const panels = document.querySelectorAll('.comic-panel');
            page.panelStates.forEach((state, i) => {
                if (panels[i]) {
                    // Apply background style to panel
                    panels[i].dataset.backgroundStyle = state.backgroundStyle || 'classic-white';
                    
                    if (state.imageId) {
                        // Find the image by ID, ensuring string comparison
                        const image = this.uploadedImages.find(img => String(img.id) === String(state.imageId));
                        if (image) {
                            // Create and add the image
                            const img = document.createElement('img');
                            img.src = image.src;
                            img.alt = image.name;
                            img.style.position = 'absolute';
                            img.style.left = state.left || '50%';
                            img.style.top = state.top || '50%';
                            img.style.transform = state.transform || 'translate(-50%, -50%) scale(1)';
                            
                            // Clear panel and add new image
                            panels[i].innerHTML = '';
                            panels[i].appendChild(img);
                            
                            // Set data attributes
                            panels[i].dataset.imageId = state.imageId;
                            img.dataset.imageId = state.imageId;
                            panels[i].dataset.initialScale = state.initialScale || '1';
                            panels[i].dataset.currentScale = state.currentScale || '1';
                            
                            // Setup image dragging
                            this.setupImageDragging(img);
                        }
                    }
                }
            });
        }
        
        // Restore canvas background style
        if (page.canvasBackgroundStyle) {
            this.applyBackgroundStyle(page.canvasBackgroundStyle);
        }
        
        // Update page indicator and navigation buttons
        this.updatePageIndicator();
        this.updateNavigationButtons();
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
        // Save current page and panel state
        const currentPageIndex = this.currentPageIndex;
        const currentSelectedPanel = this.currentPanel;
        
        // Create a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating comic...';
        document.body.appendChild(loadingIndicator);

        try {
            // Temporarily remove selection
            if (this.currentPanel) {
                this.currentPanel.classList.remove('selected');
                this.currentPanel = null;
            }

            // Add a temporary style to hide selection styles during download
            const tempStyle = document.createElement('style');
            tempStyle.innerHTML = `
                .comic-panel { border-color: #2c3e50 !important; }
                .comic-panel:hover { border-color: #2c3e50 !important; }
                .comic-panel.selected { 
                    border-color: #2c3e50 !important;
                    box-shadow: none !important;
                }
                .comic-panel img {
                    cursor: default !important;
                }
            `;
            document.head.appendChild(tempStyle);

            // Create a zip file for multiple pages
            const zip = new JSZip();
            
            // Download each page
            for (let i = 0; i < this.pages.length; i++) {
                // Navigate to the page (without saving state since we already saved)
                this.navigateToPage(i);
                
                try {
                    // Wait for any images to load
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Create canvas from the comic page
                    const canvas = await html2canvas(document.querySelector('#comic-canvas'), {
                        backgroundColor: 'white',
                        scale: 2, // Higher quality
                        logging: false,
                        removeContainer: false,
                        onclone: (clonedDoc) => {
                            // Remove any selection styles from the cloned document
                            clonedDoc.querySelectorAll('.comic-panel').forEach(panel => {
                                panel.classList.remove('selected', 'drop-target');
                                panel.style.boxShadow = 'none';
                            });
                        }
                    });
                    
                    // Convert canvas to blob
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    
                    // Add to zip file
                    zip.file(`page-${i + 1}.png`, blob);
                    
                } catch (error) {
                    console.error(`Error capturing page ${i + 1}:`, error);
                }
            }
            
            // Generate zip file
            const content = await zip.generateAsync({type: 'blob'});
            
            // Create download link
            const link = document.createElement('a');
            link.download = 'my-comic.zip';
            link.href = URL.createObjectURL(content);
            link.click();
            
            // Cleanup
            URL.revokeObjectURL(link.href);
            document.head.removeChild(tempStyle);
            
        } catch (error) {
            console.error('Error creating zip file:', error);
        } finally {
            // Remove loading indicator
            document.body.removeChild(loadingIndicator);
            
            // Restore original page and selection state
            this.navigateToPage(currentPageIndex);
            if (currentSelectedPanel) {
                this.selectPanel(currentSelectedPanel);
            }
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
    }
}

// Initialize the comic creator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.comicCreator = new ComicCreator();
}); 