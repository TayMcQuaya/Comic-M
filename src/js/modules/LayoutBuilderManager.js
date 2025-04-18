/**
 * Manages the creation and management of custom panel layouts.
 */
export class LayoutBuilderManager {
    /**
     * Creates an instance of LayoutBuilderManager.
     * @param {ComicCreator} comicCreator - A reference to the main ComicCreator instance.
     */
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        this.builderCanvas = null;
        this.selectedPanel = null;
        this.isDraggingGutter = false;
        this.draggedGutter = null;
        this.gutterSize = 12; // Default gutter size in pixels
        this.snapToGrid = false;
        this.gridSize = 10; // Grid size in pixels
        this.canvasSize = 700; // Builder canvas size in pixels
        this.canDrag = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.resizing = false;
        this.resizeHandle = null;
        this.aspectRatioMode = 'landscape'; // 'landscape' or 'portrait'
        
        // Store aspect ratios
        this.aspectRatios = {
            portrait: [
                { name: "1:3", width: 1, height: 3 },
                { name: "1:2", width: 1, height: 2 },
                { name: "9:16", width: 9, height: 16 },
                { name: "10:16", width: 10, height: 16 },
                { name: "2:3", width: 2, height: 3 },
                { name: "3:4", width: 3, height: 4 },
                { name: "4:5", width: 4, height: 5 },
                { name: "1:1", width: 1, height: 1 }
            ],
            landscape: [
                { name: "3:1", width: 3, height: 1 },
                { name: "2:1", width: 2, height: 1 },
                { name: "16:9", width: 16, height: 9 },
                { name: "16:10", width: 16, height: 10 },
                { name: "3:2", width: 3, height: 2 },
                { name: "4:3", width: 4, height: 3 },
                { name: "5:4", width: 5, height: 4 },
                { name: "1:1", width: 1, height: 1 }
            ]
        };
        
        // Default panel width (as percentage of canvas)
        this.defaultPanelWidth = 25;
        
        console.log("LayoutBuilderManager initialized");
    }

    /**
     * Initializes the builder UI and event listeners.
     */
    initBuilderUI() {
        // Create the custom layout modal in the DOM if it doesn't exist
        this.createModalIfNeeded();
        
        // Set up event listeners for the builder's buttons and controls
        this.setupEventListeners();
    }

    /**
     * Creates the layout builder modal in the DOM if it doesn't exist.
     */
    createModalIfNeeded() {
        // Check if modal already exists
        if (document.getElementById('custom-layout-modal')) {
            return;
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'custom-layout-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'custom-layout-modal';
        modal.className = 'modal layout-builder-modal';
        
        // Generate aspect ratio buttons based on the stored ratios
        const portraitButtons = this.generateAspectRatioButtons('portrait');
        const landscapeButtons = this.generateAspectRatioButtons('landscape');
        
        modal.innerHTML = `
            <h3>Custom Layout Builder</h3>
            
            <div id="layout-builder-container">
                <div id="layout-builder-sidebar">
                    <div class="aspect-ratio-section">
                        <h4>Add Panel / Aspect Ratio</h4>
                        
                        <div class="orientation-toggle">
                            <button id="portrait-toggle" class="orientation-btn ${this.aspectRatioMode === 'portrait' ? 'active' : ''}">
                                <i class="fas fa-mobile-alt"></i> Portrait
                            </button>
                            <button id="landscape-toggle" class="orientation-btn ${this.aspectRatioMode === 'landscape' ? 'active' : ''}">
                                <i class="fas fa-tablet-alt"></i> Landscape
                            </button>
                        </div>
                        
                        <div id="portrait-ratios" class="aspect-ratio-grid" ${this.aspectRatioMode === 'portrait' ? '' : 'style="display: none;"'}>
                            ${portraitButtons}
                        </div>
                        
                        <div id="landscape-ratios" class="aspect-ratio-grid" ${this.aspectRatioMode === 'landscape' ? '' : 'style="display: none;"'}>
                            ${landscapeButtons}
                        </div>
                        
                        <div class="custom-ratio-input">
                            <h4>Custom Aspect Ratio</h4>
                            <div class="ratio-input-group">
                                <input type="number" id="custom-ratio-width" min="1" max="100" value="16">
                                <span>:</span>
                                <input type="number" id="custom-ratio-height" min="1" max="100" value="9">
                                <button id="add-custom-ratio-btn" class="primary-btn">
                                    <i class="fas fa-plus"></i> Add
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="canvas-controls">
                        <h4>Canvas Controls</h4>
                        <div class="control-group">
                            <label for="show-grid">Show Grid</label>
                            <input type="checkbox" id="show-grid">
                        </div>
                        
                        <div class="control-group">
                            <label for="snap-to-grid">Snap to Grid</label>
                            <input type="checkbox" id="snap-to-grid">
                        </div>
                    </div>
                </div>
                
                <div id="layout-builder-main">
                    <div id="layout-builder-canvas" style="width: ${this.canvasSize}px; height: ${this.canvasSize}px;"></div>
                </div>
                
                <div id="layout-builder-properties">
                    <div id="panel-properties" class="panel-properties-section">
                        <h4>Panel Properties</h4>
                        <div class="panel-property-content">
                            <p class="no-panel-message">Select a panel to see its properties</p>
                        </div>
                    </div>
                    
                    <div class="save-layout-controls">
                        <h4>Save Layout</h4>
                        <div class="control-group">
                            <label for="custom-layout-name">Layout Name</label>
                            <input type="text" id="custom-layout-name" placeholder="My Custom Layout">
                        </div>
                        <div class="button-group">
                            <button id="save-custom-layout-btn" class="primary-btn">
                                <i class="fas fa-save"></i> Save Layout
                            </button>
                            <button id="close-builder-btn" class="secondary-btn">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    /**
     * Generates HTML for aspect ratio buttons based on the given orientation.
     * @param {string} orientation - The orientation ('portrait' or 'landscape').
     * @returns {string} HTML for aspect ratio buttons.
     */
    generateAspectRatioButtons(orientation) {
        return this.aspectRatios[orientation].map(ratio => {
            return `
                <button class="aspect-ratio-btn" data-ratio="${ratio.name}" data-width="${ratio.width}" data-height="${ratio.height}">
                    ${ratio.name}
                </button>
            `;
        }).join('');
    }

    /**
     * Sets up event listeners for the builder UI elements.
     */
    setupEventListeners() {
        // Wait for DOM to ensure elements exist
        document.addEventListener('DOMContentLoaded', () => {
            const saveBtn = document.getElementById('save-custom-layout-btn');
            const closeBtn = document.getElementById('close-builder-btn');
            const portraitToggle = document.getElementById('portrait-toggle');
            const landscapeToggle = document.getElementById('landscape-toggle');
            const snapCheckbox = document.getElementById('snap-to-grid');
            const showGridCheckbox = document.getElementById('show-grid');
            const addCustomRatioBtn = document.getElementById('add-custom-ratio-btn');
            const portraitRatios = document.getElementById('portrait-ratios');
            const landscapeRatios = document.getElementById('landscape-ratios');
            const layoutCanvas = document.getElementById('layout-builder-canvas');
            
            // Orientation toggle
            if (portraitToggle && landscapeToggle) {
                portraitToggle.addEventListener('click', () => this.switchAspectRatioMode('portrait'));
                landscapeToggle.addEventListener('click', () => this.switchAspectRatioMode('landscape'));
            }
            
            // Show/Hide Grid
            if (showGridCheckbox) {
                showGridCheckbox.addEventListener('change', (e) => {
                    if (layoutCanvas) {
                        if (e.target.checked) {
                            layoutCanvas.classList.add('show-grid');
                        } else {
                            layoutCanvas.classList.remove('show-grid');
                        }
                    }
                });
            }
            
            // Snap to Grid
            if (snapCheckbox) {
                snapCheckbox.addEventListener('change', (e) => {
                    this.snapToGrid = e.target.checked;
                });
            }
            
            // Handle aspect ratio button clicks
            if (portraitRatios) {
                portraitRatios.addEventListener('click', (e) => {
                    const ratioBtn = e.target.closest('.aspect-ratio-btn');
                    if (ratioBtn) {
                        const width = parseFloat(ratioBtn.dataset.width);
                        const height = parseFloat(ratioBtn.dataset.height);
                        const ratio = ratioBtn.dataset.ratio;
                        this.addNewPanel(width, height, ratio);
                    }
                });
            }
            
            if (landscapeRatios) {
                landscapeRatios.addEventListener('click', (e) => {
                    const ratioBtn = e.target.closest('.aspect-ratio-btn');
                    if (ratioBtn) {
                        const width = parseFloat(ratioBtn.dataset.width);
                        const height = parseFloat(ratioBtn.dataset.height);
                        const ratio = ratioBtn.dataset.ratio;
                        this.addNewPanel(width, height, ratio);
                    }
                });
            }
            
            // Custom ratio button
            if (addCustomRatioBtn) {
                addCustomRatioBtn.addEventListener('click', () => {
                    const widthInput = document.getElementById('custom-ratio-width');
                    const heightInput = document.getElementById('custom-ratio-height');
                    
                    if (widthInput && heightInput) {
                        const width = parseInt(widthInput.value, 10) || 1;
                        const height = parseInt(heightInput.value, 10) || 1;
                        const ratio = `${width}:${height}`;
                        this.addNewPanel(width, height, ratio);
                    }
                });
            }
            
            // Save and close buttons
            if (saveBtn) saveBtn.addEventListener('click', () => this.saveLayout());
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeBuilder());
            
            // Canvas click for deselection
            if (layoutCanvas) {
                layoutCanvas.addEventListener('click', (e) => {
                    // Only deselect if clicking directly on the canvas (not on a panel)
                    if (e.target === layoutCanvas) {
                        this.deselectPanel();
                        this.updatePanelProperties();
                    }
                });
                
                // Add keyboard event listener for delete key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Delete' && this.selectedPanel) {
                        this.deleteSelectedPanel();
                    }
                });
            }
        });
    }

    /**
     * Switches between portrait and landscape aspect ratio modes.
     * @param {string} mode - The mode to switch to ('portrait' or 'landscape').
     */
    switchAspectRatioMode(mode) {
        this.aspectRatioMode = mode;
        
        // Update UI
        const portraitToggle = document.getElementById('portrait-toggle');
        const landscapeToggle = document.getElementById('landscape-toggle');
        const portraitRatios = document.getElementById('portrait-ratios');
        const landscapeRatios = document.getElementById('landscape-ratios');
        
        if (portraitToggle && landscapeToggle) {
            if (mode === 'portrait') {
                portraitToggle.classList.add('active');
                landscapeToggle.classList.remove('active');
            } else {
                portraitToggle.classList.remove('active');
                landscapeToggle.classList.add('active');
            }
        }
        
        if (portraitRatios && landscapeRatios) {
            if (mode === 'portrait') {
                portraitRatios.style.display = 'grid';
                landscapeRatios.style.display = 'none';
            } else {
                portraitRatios.style.display = 'none';
                landscapeRatios.style.display = 'grid';
            }
        }
    }

    /**
     * Opens the layout builder interface.
     * @param {Object} layoutToEdit - Optional existing layout to edit.
     */
    openBuilder(layoutToEdit = null) {
        // Get references to modal elements
        const modal = document.getElementById('custom-layout-modal');
        const overlay = document.getElementById('custom-layout-modal-overlay');
        const canvas = document.getElementById('layout-builder-canvas');
        
        if (!modal || !overlay || !canvas) {
            console.error('Layout builder modal elements not found');
            return;
        }
        
        // Clear the builder canvas
        canvas.innerHTML = '';
        this.builderCanvas = canvas;
        
        // Reset state
        this.selectedPanel = null;
        
        // If layoutToEdit is provided, render it
        if (layoutToEdit) {
            this.renderExistingLayout(layout);
        }
        
        // Show the modal using UIManager
        this.comicCreator.uiManager.showModal(modal, overlay);
    }

    /**
     * Renders an existing layout for editing.
     * @param {Object} layout - The layout object to render.
     */
    renderExistingLayout(layout) {
        if (!this.builderCanvas || !layout || !layout.panels) return;
        
        // Create panels based on layout
        layout.panels.forEach(panelData => {
            // Convert percentages to pixels
            const left = (panelData.x / 100) * this.canvasSize;
            const top = (panelData.y / 100) * this.canvasSize;
            const width = (panelData.width / 100) * this.canvasSize;
            const height = (panelData.height / 100) * this.canvasSize;
            
            // Calculate aspect ratio
            const aspectWidth = Math.round((width / height) * 100) / 100;
            const aspectHeight = 1;
            const aspectRatio = `${aspectWidth}:${aspectHeight}`;
            
            // Create panel element
            const panel = this.createPanelElement(left, top, width, height, aspectRatio);
            this.builderCanvas.appendChild(panel);
        });
    }

    /**
     * Adds a new panel to the canvas with the specified aspect ratio.
     * @param {number} width - The width part of the aspect ratio.
     * @param {number} height - The height part of the aspect ratio.
     * @param {string} ratio - The aspect ratio as a string (e.g., "16:9").
     */
    addNewPanel(width, height, ratio) {
        if (!this.builderCanvas) return;
        
        // Calculate dimensions based on aspect ratio
        const defaultWidth = (this.defaultPanelWidth / 100) * this.canvasSize;
        const defaultHeight = defaultWidth * (height / width);
        
        // Place new panel at the center or at a slight offset from existing panels
        const centerX = (this.canvasSize - defaultWidth) / 2;
        const centerY = (this.canvasSize - defaultHeight) / 2;
        
        let left = centerX;
        let top = centerY;
        
        // Check if there are existing panels and offset slightly if so
        const existingPanels = this.builderCanvas.querySelectorAll('.layout-panel');
        if (existingPanels.length > 0) {
            left = (left + 20) % (this.canvasSize - defaultWidth);
            top = (top + 20) % (this.canvasSize - defaultHeight);
        }
        
        // Create panel element
        const panel = this.createPanelElement(left, top, defaultWidth, defaultHeight, ratio);
        this.builderCanvas.appendChild(panel);
        
        // Select the new panel
        this.selectPanel(panel);
    }

    /**
     * Creates a panel element with the specified dimensions.
     * @param {number} left - Left position in pixels.
     * @param {number} top - Top position in pixels.
     * @param {number} width - Width in pixels.
     * @param {number} height - Height in pixels.
     * @param {string} aspectRatio - The aspect ratio of the panel.
     * @returns {HTMLElement} The created panel element.
     */
    createPanelElement(left, top, width, height, aspectRatio) {
        const panel = document.createElement('div');
        panel.className = 'layout-panel';
        panel.style.position = 'absolute';
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.width = `${width}px`;
        panel.style.height = `${height}px`;
        panel.style.backgroundColor = '#f0f0f0';
        panel.style.border = '1px solid #ccc';
        panel.dataset.aspectRatio = aspectRatio;
        
        // Add click handler for panel selection
        panel.addEventListener('mousedown', (e) => {
            if (!this.resizing) {
                // If not clicking on a resize handle, handle panel selection and dragging
                this.selectPanel(panel);
                this.startDragPanel(e);
            }
        });
        
        // Add resize handles
        this.addResizeHandles(panel);
        
        return panel;
    }
    
    /**
     * Adds resize handles to a panel.
     * @param {HTMLElement} panel - The panel to add resize handles to.
     */
    addResizeHandles(panel) {
        const handlePositions = ['nw', 'ne', 'se', 'sw'];
        
        handlePositions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}-handle`;
            handle.dataset.handle = pos;
            
            // Add mousedown event to handle
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent panel selection/drag
                this.startResizePanel(e, panel, pos);
            });
            
            panel.appendChild(handle);
        });
    }
    
    /**
     * Starts the panel resizing operation.
     * @param {MouseEvent} e - The mousedown event.
     * @param {HTMLElement} panel - The panel being resized.
     * @param {string} handlePos - The handle position (nw, ne, se, sw).
     */
    startResizePanel(e, panel, handlePos) {
        e.preventDefault();
        
        this.resizing = true;
        this.selectedPanel = panel;
        this.resizeHandle = handlePos;
        
        const initialRect = panel.getBoundingClientRect();
        const aspectRatio = this.parseAspectRatio(panel.dataset.aspectRatio);
        
        // Store initial state for resizing
        this.resizeInitial = {
            x: initialRect.left,
            y: initialRect.top,
            width: initialRect.width,
            height: initialRect.height,
            mouseX: e.clientX,
            mouseY: e.clientY,
            aspectRatio: aspectRatio
        };
        
        // Bind event handlers to this instance
        this.handleResizeMove = this.handleResizeMove.bind(this);
        this.handleResizeUp = this.handleResizeUp.bind(this);
        
        // Add window event listeners
        window.addEventListener('mousemove', this.handleResizeMove);
        window.addEventListener('mouseup', this.handleResizeUp);
    }
    
    /**
     * Handles mouse movement during panel resizing.
     * @param {MouseEvent} e - The mousemove event.
     */
    handleResizeMove(e) {
        if (!this.resizing || !this.selectedPanel) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.resizeInitial.mouseX;
        const deltaY = e.clientY - this.resizeInitial.mouseY;
        const aspect = this.resizeInitial.aspectRatio;
        
        // Calculate new width/height based on which handle is being dragged
        let newWidth, newHeight, newLeft, newTop;
        
        switch (this.resizeHandle) {
            case 'se': // Bottom-right
                newWidth = this.resizeInitial.width + deltaX;
                newHeight = newWidth / aspect;
                newLeft = this.resizeInitial.x;
                newTop = this.resizeInitial.y;
                break;
            case 'sw': // Bottom-left
                newWidth = this.resizeInitial.width - deltaX;
                newHeight = newWidth / aspect;
                newLeft = this.resizeInitial.x + deltaX;
                newTop = this.resizeInitial.y;
                break;
            case 'ne': // Top-right
                newWidth = this.resizeInitial.width + deltaX;
                newHeight = newWidth / aspect;
                newLeft = this.resizeInitial.x;
                newTop = this.resizeInitial.y + this.resizeInitial.height - newHeight;
                break;
            case 'nw': // Top-left
                newWidth = this.resizeInitial.width - deltaX;
                newHeight = newWidth / aspect;
                newLeft = this.resizeInitial.x + deltaX;
                newTop = this.resizeInitial.y + this.resizeInitial.height - newHeight;
                break;
        }
        
        // Enforce minimum size
        if (newWidth < 20 || newHeight < 20) return;
        
        // Get panel's position relative to builder canvas
        const canvasRect = this.builderCanvas.getBoundingClientRect();
        const left = newLeft - canvasRect.left;
        const top = newTop - canvasRect.top;
        
        // Apply snap to grid if enabled
        let snappedLeft = left;
        let snappedTop = top;
        
        if (this.snapToGrid) {
            snappedLeft = Math.round(left / this.gridSize) * this.gridSize;
            snappedTop = Math.round(top / this.gridSize) * this.gridSize;
        }
        
        // Ensure panel stays within canvas bounds
        if (snappedLeft < 0) snappedLeft = 0;
        if (snappedTop < 0) snappedTop = 0;
        if (snappedLeft + newWidth > this.canvasSize) snappedLeft = this.canvasSize - newWidth;
        if (snappedTop + newHeight > this.canvasSize) snappedTop = this.canvasSize - newHeight;
        
        // Update panel dimensions
        this.selectedPanel.style.left = `${snappedLeft}px`;
        this.selectedPanel.style.top = `${snappedTop}px`;
        this.selectedPanel.style.width = `${newWidth}px`;
        this.selectedPanel.style.height = `${newHeight}px`;
        
        // Update panel properties display
        this.updatePanelProperties();
    }
    
    /**
     * Handles mouse up event during panel resizing.
     */
    handleResizeUp() {
        this.resizing = false;
        this.resizeHandle = null;
        
        // Remove window event listeners
        window.removeEventListener('mousemove', this.handleResizeMove);
        window.removeEventListener('mouseup', this.handleResizeUp);
    }
    
    /**
     * Parses an aspect ratio string into a numeric ratio.
     * @param {string} ratioStr - The aspect ratio string (e.g., "16:9").
     * @returns {number} The numeric aspect ratio (width/height).
     */
    parseAspectRatio(ratioStr) {
        if (!ratioStr) return 1; // Default to square
        
        const parts = ratioStr.split(':');
        if (parts.length !== 2) return 1;
        
        const width = parseFloat(parts[0]);
        const height = parseFloat(parts[1]);
        
        return (width && height) ? (width / height) : 1;
    }

    /**
     * Starts dragging a panel.
     * @param {MouseEvent} e - The mousedown event.
     */
    startDragPanel(e) {
        if (!this.selectedPanel || this.resizing) return;
        
        // Only start drag if clicking directly on the panel (not on a resize handle)
        if (e.target.classList.contains('resize-handle')) return;
        
        e.preventDefault();
        
        this.canDrag = true;
        const rect = this.selectedPanel.getBoundingClientRect();
        const canvasRect = this.builderCanvas.getBoundingClientRect();
        
        // Store starting positions
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.panelStartLeft = rect.left - canvasRect.left;
        this.panelStartTop = rect.top - canvasRect.top;
        
        // Bind event handlers to this instance
        this.handleDragMove = this.handleDragMove.bind(this);
        this.handleDragUp = this.handleDragUp.bind(this);
        
        // Add window event listeners
        window.addEventListener('mousemove', this.handleDragMove);
        window.addEventListener('mouseup', this.handleDragUp);
    }
    
    /**
     * Handles mouse movement during panel dragging.
     * @param {MouseEvent} e - The mousemove event.
     */
    handleDragMove(e) {
        if (!this.canDrag || !this.selectedPanel) return;
        
        e.preventDefault();
        
        // Calculate new position
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        
        let newLeft = this.panelStartLeft + deltaX;
        let newTop = this.panelStartTop + deltaY;
        
        // Apply snap to grid if enabled
        if (this.snapToGrid) {
            newLeft = Math.round(newLeft / this.gridSize) * this.gridSize;
            newTop = Math.round(newTop / this.gridSize) * this.gridSize;
        }
        
        // Get panel dimensions
        const width = parseInt(this.selectedPanel.style.width, 10);
        const height = parseInt(this.selectedPanel.style.height, 10);
        
        // Ensure panel stays within canvas bounds
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft + width > this.canvasSize) newLeft = this.canvasSize - width;
        if (newTop + height > this.canvasSize) newTop = this.canvasSize - height;
        
        // Update panel position
        this.selectedPanel.style.left = `${newLeft}px`;
        this.selectedPanel.style.top = `${newTop}px`;
        
        // Update panel properties display
        this.updatePanelProperties();
    }
    
    /**
     * Handles mouse up event during panel dragging.
     */
    handleDragUp() {
        this.canDrag = false;
        
        // Remove window event listeners
        window.removeEventListener('mousemove', this.handleDragMove);
        window.removeEventListener('mouseup', this.handleDragUp);
    }

    /**
     * Selects a panel in the builder.
     * @param {HTMLElement} panel - The panel to select.
     */
    selectPanel(panel) {
        // Deselect previous panel
        this.deselectPanel();
        
        // Select new panel
        this.selectedPanel = panel;
        panel.classList.add('selected');
        
        // Update panel properties
        this.updatePanelProperties();
    }
    
    /**
     * Deselects the currently selected panel.
     */
    deselectPanel() {
        if (this.selectedPanel) {
            this.selectedPanel.classList.remove('selected');
            this.selectedPanel = null;
        }
    }
    
    /**
     * Updates the panel properties display.
     */
    updatePanelProperties() {
        const propertiesSection = document.querySelector('.panel-property-content');
        if (!propertiesSection) return;
        
        if (!this.selectedPanel) {
            // No panel selected
            propertiesSection.innerHTML = '<p class="no-panel-message">Select a panel to see its properties</p>';
            return;
        }
        
        // Get panel properties
        const left = parseInt(this.selectedPanel.style.left, 10);
        const top = parseInt(this.selectedPanel.style.top, 10);
        const width = parseInt(this.selectedPanel.style.width, 10);
        const height = parseInt(this.selectedPanel.style.height, 10);
        const aspectRatio = this.selectedPanel.dataset.aspectRatio;
        
        // Calculate percentages for display
        const leftPercent = Math.round((left / this.canvasSize) * 100);
        const topPercent = Math.round((top / this.canvasSize) * 100);
        const widthPercent = Math.round((width / this.canvasSize) * 100);
        const heightPercent = Math.round((height / this.canvasSize) * 100);
        
        // Update properties display
        propertiesSection.innerHTML = `
            <div class="panel-property">
                <label>Aspect Ratio</label>
                <span>${aspectRatio}</span>
            </div>
            
            <div class="panel-property">
                <label>Width</label>
                <span>${width}px (${widthPercent}%)</span>
            </div>
            
            <div class="panel-property">
                <label>Height</label>
                <span>${height}px (${heightPercent}%)</span>
            </div>
            
            <div class="panel-property">
                <label>Position</label>
                <span>X: ${left}px (${leftPercent}%), Y: ${top}px (${topPercent}%)</span>
            </div>
            
            <div class="panel-property">
                <button id="delete-panel-btn" class="danger-btn">
                    <i class="fas fa-trash"></i> Delete Panel
                </button>
            </div>
        `;
        
        // Add event listener to delete button
        const deleteBtn = document.getElementById('delete-panel-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteSelectedPanel());
        }
    }

    /**
     * Deletes the currently selected panel.
     */
    deleteSelectedPanel() {
        if (!this.selectedPanel) {
            this.comicCreator.uiManager.showNotification("Please select a panel first.", "warning");
            return;
        }
        
        // Remove the panel from the canvas
        this.builderCanvas.removeChild(this.selectedPanel);
        
        // Reset state
        this.selectedPanel = null;
        
        // Update properties display
        this.updatePanelProperties();
        
        // Show confirmation
        this.comicCreator.uiManager.showNotification("Panel deleted.", "info");
    }

    /**
     * Converts the visual layout to the data format required by the application.
     * @returns {Array} The array of panel data objects.
     */
    getLayoutDataFromVisual() {
        const panels = Array.from(this.builderCanvas.querySelectorAll('.layout-panel'));
        const panelData = [];
        
        panels.forEach(panel => {
            const left = parseInt(panel.style.left, 10);
            const top = parseInt(panel.style.top, 10);
            const width = parseInt(panel.style.width, 10);
            const height = parseInt(panel.style.height, 10);
            
            // Convert pixel values to percentages
            const x = (left / this.canvasSize) * 100;
            const y = (top / this.canvasSize) * 100;
            const w = (width / this.canvasSize) * 100;
            const h = (height / this.canvasSize) * 100;
            
            panelData.push({
                x,
                y,
                width: w,
                height: h
            });
        });
        
        return panelData;
    }

    /**
     * Saves the current layout.
     */
    saveLayout() {
        // Get layout name
        const nameInput = document.getElementById('custom-layout-name');
        const layoutName = nameInput ? nameInput.value.trim() : '';
        
        if (!layoutName) {
            this.comicCreator.uiManager.showNotification("Please enter a layout name.", "warning");
            return;
        }
        
        // Get panel data
        const panelData = this.getLayoutDataFromVisual();
        
        if (panelData.length === 0) {
            this.comicCreator.uiManager.showNotification("Cannot save an empty layout. Please add at least one panel.", "error");
            return;
        }
        
        // Create layout object
        const layout = {
            name: layoutName,
            description: "Custom user-created layout",
            panels: panelData
        };
        
        // Save to localStorage
        this.saveLayoutToStorage(layoutName, layout);
        
        // Show confirmation
        this.comicCreator.uiManager.showNotification(`Layout "${layoutName}" saved successfully!`, "success");
        
        // Update layout selection screen
        this.comicCreator.setupLayoutSelection();
        
        // Close the builder
        this.closeBuilder();
    }

    /**
     * Saves a layout to localStorage.
     * @param {string} name - The name of the layout.
     * @param {Object} layout - The layout object to save.
     */
    saveLayoutToStorage(name, layout) {
        // Get existing layouts
        const customLayouts = this.loadCustomLayouts();
        
        // Add or update layout
        customLayouts[name] = layout;
        
        // Save to localStorage
        localStorage.setItem('customComicLayouts', JSON.stringify(customLayouts));
    }

    /**
     * Loads custom layouts from localStorage.
     * @returns {Object} The object containing custom layouts.
     */
    loadCustomLayouts() {
        const layoutsJson = localStorage.getItem('customComicLayouts');
        return layoutsJson ? JSON.parse(layoutsJson) : {};
    }

    /**
     * Closes the layout builder.
     */
    closeBuilder() {
        const modal = document.getElementById('custom-layout-modal');
        const overlay = document.getElementById('custom-layout-modal-overlay');
        
        if (modal && overlay) {
            this.comicCreator.uiManager.hideModal(modal, overlay);
        }
    }
} 