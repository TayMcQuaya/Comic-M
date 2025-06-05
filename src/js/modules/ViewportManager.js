/**
 * ViewportManager - Manages zoom and pan functionality for the comic canvas viewport
 * Uses CSS transforms to provide visual zoom/pan without affecting coordinate calculations
 */
export class ViewportManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        
        // Viewport state
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        
        // Viewport limits
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.maxPanX = 2000;
        this.maxPanY = 2000;
        
        // DOM elements
        this.viewportContainer = null;
        this.transformContainer = null;
        this.canvasContainer = null;
        
        // Pan state
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        // UI elements
        this.zoomControls = null;
        this.zoomDisplay = null;
        
        // Export state preservation
        this.preExportState = null;
        
        console.log('[ViewportManager] Initialized');
    }
    
    /**
     * Initialize the viewport system
     */
    init() {
        console.log('[ViewportManager] Setting up viewport...');
        this.setupViewportStructure();
        this.setupEventListeners();
        this.setupUIControls();
        console.log('[ViewportManager] Viewport setup complete');
    }
    
    /**
     * Create the DOM structure for viewport management
     */
    setupViewportStructure() {
        const existingCanvasContainer = document.querySelector('.comic-canvas-container');
        if (!existingCanvasContainer) {
            console.error('[ViewportManager] Canvas container not found');
            return;
        }
        
        console.log('[ViewportManager] Found canvas container:', existingCanvasContainer);
        
        // Create viewport container (outermost)
        this.viewportContainer = document.createElement('div');
        this.viewportContainer.className = 'viewport-container';
        
        // Create transform container (applies zoom/pan transforms)
        this.transformContainer = document.createElement('div');
        this.transformContainer.className = 'canvas-transform-container';
        
        // Insert viewport structure
        const parent = existingCanvasContainer.parentNode;
        console.log('[ViewportManager] Parent element:', parent);
        
        parent.insertBefore(this.viewportContainer, existingCanvasContainer);
        this.viewportContainer.appendChild(this.transformContainer);
        this.transformContainer.appendChild(existingCanvasContainer);
        
        this.canvasContainer = existingCanvasContainer;
        
        console.log('[ViewportManager] Viewport DOM structure created');
        console.log('[ViewportManager] Viewport container:', this.viewportContainer);
        console.log('[ViewportManager] Transform container:', this.transformContainer);
    }
    
    /**
     * Set up event listeners for zoom and pan
     */
    setupEventListeners() {
        // Mouse wheel zoom
        this.viewportContainer.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Pan with middle mouse button or space+click
        this.viewportContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Touch events for mobile (basic support)
        this.viewportContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.viewportContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.viewportContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        console.log('[ViewportManager] Event listeners attached');
    }
    
    /**
     * Add zoom/pan controls to the editor header
     */
    setupUIControls() {
        const editorTools = document.querySelector('.editor-tools');
        if (!editorTools) {
            console.error('[ViewportManager] Editor tools container not found');
            return;
        }
        
        // Create viewport controls container
        const viewportControls = document.createElement('div');
        viewportControls.className = 'viewport-controls';
        viewportControls.innerHTML = `
            <button id="zoom-out-btn" class="tool-btn" title="Zoom Out (Ctrl + -)">
                <i class="fas fa-search-minus"></i>
            </button>
            <div class="zoom-display-container">
                <span id="zoom-display" class="zoom-display" title="Click to set custom zoom">100%</span>
            </div>
            <button id="zoom-in-btn" class="tool-btn" title="Zoom In (Ctrl + +)">
                <i class="fas fa-search-plus"></i>
            </button>
            <button id="zoom-reset-btn" class="tool-btn" title="Reset View (Ctrl + 0)">
                <i class="fas fa-expand-arrows-alt"></i>
            </button>
        `;
        
        // Insert before the download button or at the end
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            editorTools.insertBefore(viewportControls, downloadBtn);
        } else {
            editorTools.appendChild(viewportControls);
        }
        
        // Set up control event listeners
        this.setupControlListeners();
        this.zoomDisplay = document.getElementById('zoom-display');
        
        console.log('[ViewportManager] UI controls added');
    }
    
    /**
     * Set up event listeners for UI controls
     */
    setupControlListeners() {
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomResetBtn = document.getElementById('zoom-reset-btn');
        const zoomDisplay = document.getElementById('zoom-display');
        
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.resetView());
        
        // Click to set custom zoom
        if (zoomDisplay) {
            zoomDisplay.addEventListener('click', this.showZoomInput.bind(this));
        }
    }
    
    /**
     * Handle mouse wheel zoom
     */
    handleWheel(e) {
        e.preventDefault();
        
        // Get mouse position relative to the viewport container
        const rect = this.viewportContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Determine zoom factor based on wheel direction
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        // Zoom at the mouse position
        this.zoomAtPoint(mouseX, mouseY, zoomFactor);
    }
    
    /**
     * Handle mouse down for panning
     */
    handleMouseDown(e) {
        // Don't pan if clicking on interactive elements
        if (e.target.closest('.comic-panel, .text-bubble, .canvas-sticker-image, .drag-handle, .resize-handle, .format-text-btn, .delete-text-btn, .rotation-handle, .editor-sidebar, .properties-panel')) {
            return;
        }
        
        // Pan with middle mouse button or space + left click
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            e.preventDefault();
            this.startPan(e.clientX, e.clientY);
        }
    }
    
    /**
     * Handle mouse move for panning
     */
    handleMouseMove(e) {
        if (this.isPanning) {
            e.preventDefault();
            this.updatePan(e.clientX, e.clientY);
        }
    }
    
    /**
     * Handle mouse up to stop panning
     */
    handleMouseUp(e) {
        if (this.isPanning) {
            this.stopPan();
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '=':
                case '+':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case '0':
                    e.preventDefault();
                    this.resetView();
                    break;
            }
        }
        
        // Arrow keys for pan (when no input is focused)
        if (!e.target.matches('input, textarea, select')) {
            const panStep = 50;
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.panBy(0, panStep);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.panBy(0, -panStep);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.panBy(panStep, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.panBy(-panStep, 0);
                    break;
            }
        }
    }
    
    /**
     * Basic touch support for mobile
     */
    handleTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            // Store initial pinch state
            this.touchStartDistance = this.getTouchDistance(e.touches);
            this.touchStartZoom = this.zoom;
        } else if (e.touches.length === 1) {
            // Single touch pan
            this.startPan(e.touches[0].clientX, e.touches[0].clientY);
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length === 2 && this.touchStartDistance) {
            e.preventDefault();
            const currentDistance = this.getTouchDistance(e.touches);
            const scale = currentDistance / this.touchStartDistance;
            const newZoom = this.touchStartZoom * scale;
            this.setZoom(newZoom);
        } else if (e.touches.length === 1 && this.isPanning) {
            e.preventDefault();
            this.updatePan(e.touches[0].clientX, e.touches[0].clientY);
        }
    }
    
    handleTouchEnd(e) {
        if (e.touches.length === 0) {
            this.touchStartDistance = null;
            this.touchStartZoom = null;
            this.stopPan();
        }
    }
    
    /**
     * Get distance between two touch points
     */
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Zoom in by a fixed factor
     */
    zoomIn(factor = 1.2) {
        const rect = this.viewportContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomAtPoint(centerX, centerY, factor);
    }
    
    /**
     * Zoom out by a fixed factor
     */
    zoomOut(factor = 0.8) {
        const rect = this.viewportContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        this.zoomAtPoint(centerX, centerY, factor);
    }
    
    /**
     * Zoom at a specific point (mouse position)
     */
    zoomAtPoint(x, y, factor) {
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        if (newZoom === this.zoom) return;
        
        console.log(`[ViewportManager] Zoom: ${this.zoom} -> ${newZoom}, factor: ${factor}, point: (${x}, ${y})`);
        
        // Get viewport container rect for proper coordinate calculation
        const rect = this.viewportContainer.getBoundingClientRect();
        
        // Convert mouse position to center-based coordinates
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseOffsetX = x - centerX;
        const mouseOffsetY = y - centerY;
        
        console.log(`[ViewportManager] Center: (${centerX}, ${centerY}), MouseOffset: (${mouseOffsetX}, ${mouseOffsetY})`);
        console.log(`[ViewportManager] Before: panX=${this.panX}, panY=${this.panY}`);
        
        // Calculate the scale factor
        const scaleFactor = newZoom / this.zoom;
        
        // Apply zoom transformation: maintain the point under the cursor
        // Formula: newPan = mouseOffset + (oldPan - mouseOffset) * scaleFactor
        this.panX = mouseOffsetX + (this.panX - mouseOffsetX) * scaleFactor;
        this.panY = mouseOffsetY + (this.panY - mouseOffsetY) * scaleFactor;
        
        console.log(`[ViewportManager] After: panX=${this.panX}, panY=${this.panY}`);
        
        // Update zoom level
        this.zoom = newZoom;
        
        this.constrainPan();
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    /**
     * Set zoom to a specific level
     */
    setZoom(newZoom) {
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        if (newZoom === this.zoom) return;
        
        // Simple zoom from center - just update zoom and apply
        this.zoom = newZoom;
        this.constrainPan();
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    /**
     * Start panning operation
     */
    startPan(x, y) {
        this.isPanning = true;
        this.lastPanX = x;
        this.lastPanY = y;
        this.viewportContainer.style.cursor = 'grabbing';
        this.viewportContainer.classList.add('panning');
    }
    
    /**
     * Update pan position during drag
     */
    updatePan(x, y) {
        if (!this.isPanning) return;
        
        const deltaX = x - this.lastPanX;
        const deltaY = y - this.lastPanY;
        
        this.panX += deltaX;
        this.panY += deltaY;
        
        this.constrainPan();
        this.applyTransform(false); // No transition during drag
        
        this.lastPanX = x;
        this.lastPanY = y;
    }
    
    /**
     * Stop panning operation
     */
    stopPan() {
        this.isPanning = false;
        this.viewportContainer.style.cursor = '';
        this.viewportContainer.classList.remove('panning');
    }
    
    /**
     * Pan by a specific amount
     */
    panBy(deltaX, deltaY) {
        this.panX += deltaX;
        this.panY += deltaY;
        this.constrainPan();
        this.applyTransform(false); // No transition for keyboard panning
    }
    
    /**
     * Constrain pan values to reasonable limits
     */
    constrainPan() {
        this.panX = Math.max(-this.maxPanX, Math.min(this.maxPanX, this.panX));
        this.panY = Math.max(-this.maxPanY, Math.min(this.maxPanY, this.panY));
    }
    
    /**
     * Apply transform to the canvas
     */
    applyTransform(withTransition = true) {
        if (!this.transformContainer) return;
        
        // Manage transition class
        if (withTransition) {
            this.transformContainer.classList.remove('no-transition');
        } else {
            this.transformContainer.classList.add('no-transition');
        }
        
        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        this.transformContainer.style.transform = transform;
    }
    
    /**
     * Reset viewport to default state
     */
    resetView() {
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
        this.updateZoomDisplay();
    }
    
    /**
     * Update zoom percentage display
     */
    updateZoomDisplay() {
        if (this.zoomDisplay) {
            this.zoomDisplay.textContent = Math.round(this.zoom * 100) + '%';
        }
    }
    
    /**
     * Show input for custom zoom level
     */
    showZoomInput() {
        const current = Math.round(this.zoom * 100);
        
        // Create a custom modal for zoom input
        this.createZoomInputModal(current);
    }
    
    /**
     * Create a custom zoom input modal using the app's design system
     */
    createZoomInputModal(currentZoom) {
        // Create modal elements
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal zoom-input-modal';
        
        // Set content with input field
        modal.innerHTML = `
            <h3>Set Zoom Level</h3>
            <div class="modal-content">
                <label for="zoom-input" style="display: block; margin-bottom: 0.5rem; color: #555; font-weight: 500;">
                    Zoom Percentage (10% - 500%):
                </label>
                <input 
                    type="number" 
                    id="zoom-input" 
                    min="10" 
                    max="500" 
                    value="${currentZoom}"
                    style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; margin-bottom: 1rem;"
                >
                <div class="zoom-presets" style="margin-bottom: 1rem;">
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">Quick presets:</div>
                    <div class="preset-buttons" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="preset-btn" data-zoom="25" style="padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #f8f9fa; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">25%</button>
                        <button class="preset-btn" data-zoom="50" style="padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #f8f9fa; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">50%</button>
                        <button class="preset-btn" data-zoom="75" style="padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #f8f9fa; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">75%</button>
                        <button class="preset-btn" data-zoom="100" style="padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #f8f9fa; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">100%</button>
                        <button class="preset-btn" data-zoom="150" style="padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #f8f9fa; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">150%</button>
                        <button class="preset-btn" data-zoom="200" style="padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #f8f9fa; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">200%</button>
                    </div>
                </div>
            </div>
            <div class="modal-buttons">
                <button class="primary-btn zoom-apply-btn">Apply</button>
                <button class="secondary-btn zoom-cancel-btn">Cancel</button>
            </div>
        `;
        
        // Get elements
        const zoomInput = modal.querySelector('#zoom-input');
        const applyBtn = modal.querySelector('.zoom-apply-btn');
        const cancelBtn = modal.querySelector('.zoom-cancel-btn');
        const presetBtns = modal.querySelectorAll('.preset-btn');
        
        // Handle preset buttons
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const zoomValue = btn.dataset.zoom;
                zoomInput.value = zoomValue;
                // Update visual selection
                presetBtns.forEach(b => b.style.background = '#f8f9fa');
                btn.style.background = '#e3f2fd';
            });
        });
        
        // Handle input validation
        zoomInput.addEventListener('input', () => {
            const value = parseInt(zoomInput.value);
            const isValid = !isNaN(value) && value >= 10 && value <= 500;
            zoomInput.style.borderColor = isValid ? '#ddd' : '#ff6b6b';
            applyBtn.disabled = !isValid;
            applyBtn.style.opacity = isValid ? '1' : '0.5';
            
            // Update preset selection
            presetBtns.forEach(btn => {
                btn.style.background = btn.dataset.zoom === value.toString() ? '#e3f2fd' : '#f8f9fa';
            });
        });
        
        // Handle apply button
        const applyZoom = () => {
            const percentage = parseInt(zoomInput.value);
            if (!isNaN(percentage) && percentage >= 10 && percentage <= 500) {
                this.setZoom(percentage / 100);
                closeModal();
            }
        };
        
        // Handle close modal
        const closeModal = () => {
            modal.classList.remove('active');
            modalOverlay.classList.remove('active');
            
            setTimeout(() => {
                if (modal.parentNode) document.body.removeChild(modal);
                if (modalOverlay.parentNode) document.body.removeChild(modalOverlay);
            }, 300);
        };
        
        // Event listeners
        applyBtn.addEventListener('click', applyZoom);
        cancelBtn.addEventListener('click', closeModal);
        
        // Handle Enter key in input
        zoomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyZoom();
            } else if (e.key === 'Escape') {
                closeModal();
            }
        });
        
        // Handle clicking on overlay to close
        modalOverlay.addEventListener('click', closeModal);
        
        // Prevent modal content clicks from closing the modal
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Add to DOM
        document.body.appendChild(modalOverlay);
        document.body.appendChild(modal);
        
        // Show modal with transition
        setTimeout(() => {
            modalOverlay.style.display = 'block';
            modal.style.display = 'block';
            
            setTimeout(() => {
                modal.classList.add('active');
                modalOverlay.classList.add('active');
                
                // Focus the input and select current value
                zoomInput.focus();
                zoomInput.select();
            }, 10);
        }, 0);
    }
    
    /**
     * Prepare viewport for export (reset to 100% zoom, center)
     */
    prepareForExport() {
        console.log('[ViewportManager] Preparing for export - saving current state');
        this.preExportState = {
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
        
        // Reset to default view for export
        this.resetView();
    }
    
    /**
     * Restore viewport state after export
     */
    restoreAfterExport() {
        if (this.preExportState) {
            console.log('[ViewportManager] Restoring viewport state after export');
            this.zoom = this.preExportState.zoom;
            this.panX = this.preExportState.panX;
            this.panY = this.preExportState.panY;
            this.applyTransform();
            this.updateZoomDisplay();
            this.preExportState = null;
        }
    }
    
    /**
     * Get current viewport state
     */
    getState() {
        return {
            zoom: this.zoom,
            panX: this.panX,
            panY: this.panY
        };
    }
    
    /**
     * Set viewport state
     */
    setState(state) {
        this.zoom = state.zoom || 1.0;
        this.panX = state.panX || 0;
        this.panY = state.panY || 0;
        this.constrainPan();
        this.applyTransform();
        this.updateZoomDisplay();
    }
} 