import { globalRgbToHex, getTextWithLineBreaks } from './Utils.js'; // May need Utils later

export class StickerManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // Store reference to the main ComicCreator instance
        this.currentSticker = null; // Track the currently selected sticker element
        console.log('StickerManager initialized');
    }

    // --- Add Sticker ---
    addSticker(image, dropX, dropY) {
        if (!image) {
            console.error('StickerManager: Cannot add sticker - no image provided');
            return;
        }

        const comicCanvas = document.querySelector('#comic-canvas');
        if (!comicCanvas) {
            console.error('StickerManager: Comic canvas not found');
            return;
        }
        
        // Create sticker element
        const stickerId = `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stickerImg = document.createElement('img');
        stickerImg.src = image.src;
        stickerImg.alt = image.name || 'Sticker';
        stickerImg.className = 'canvas-sticker-image';
        stickerImg.id = stickerId;
        
        // Set initial properties
        stickerImg.dataset.imageId = image.id || image.getAttribute('data-id');
        stickerImg.dataset.size = '200'; // Default 200%
        stickerImg.dataset.isFlippedHorizontally = 'false';
        stickerImg.dataset.rotationAngle = '0';
        stickerImg.dataset.outlineEnabled = 'false';
        stickerImg.dataset.outlineWidth = '2';
        stickerImg.dataset.outlineColor = '#000000';
        stickerImg.dataset.outlineStyle = 'solid';
        stickerImg.dataset.positionGrid = 'custom'; // Start with custom position
        
        // Position based on drop coordinates or center if not provided
        const canvasRect = comicCanvas.getBoundingClientRect();
        
        let left, top;
        if (dropX !== undefined && dropY !== undefined) {
            // Convert global coordinates to relative to canvas
            left = (dropX - canvasRect.left) / canvasRect.width * 100;
            top = (dropY - canvasRect.top) / canvasRect.height * 100;
        } else {
            // Default to center if no coordinates provided
            left = 50;
            top = 50;
        }
        
        // Apply styles
        Object.assign(stickerImg.style, {
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: '100px', // Initial width, will be adjusted by size control
            height: 'auto',  // Maintain aspect ratio
            zIndex: '200', // Increased from 100 to 200 to ensure it's above text elements
            cursor: 'grab'
        });
        
        // Add to canvas
        comicCanvas.appendChild(stickerImg);
        
        // Make draggable after adding to DOM
        const that = this; // Store reference for the callback
        this.comicCreator.dragAndDropManager.makeStickerDraggable(stickerImg, {
            onDragEnd: function(element) {
                that.resetPositionGrid(element); // Reset position grid after manual drag
                that.comicCreator.saveCurrentPageState(); // Save state
            }
        });
        
        // Add click handler to select
            stickerImg.addEventListener('click', (e) => {
            e.stopPropagation();
                this.selectSticker(stickerImg);
            });

        // Select the sticker after adding it
        this.selectSticker(stickerImg);

        // Save the canvas state
        this.comicCreator.saveCurrentPageState();

        return stickerImg;
    }

    // --- Select Sticker ---
    selectSticker(stickerElement) {
        if (!stickerElement || stickerElement === this.currentSticker) {
            // Avoid re-selecting the same sticker or selecting null
            return;
        }
        console.log('StickerManager: Selecting sticker:', stickerElement.id);

        // Deselect any other selected element (handled by ComicCreator)
        this.comicCreator.deselectAll();

        this.currentSticker = stickerElement;
        stickerElement.classList.add('selected-sticker'); // Add a specific class for styling
        stickerElement.style.zIndex = '201'; // Increased from 101 to 201 for selected stickers

        // Update the right sidebar with sticker controls
        this.updateStickerControls();
    }

    // --- Deselect Current Sticker --- (Called by ComicCreator.deselectAll)
    deselectCurrentSticker() {
        if (this.currentSticker) {
            console.log('StickerManager: Deselecting sticker:', this.currentSticker.id);
            this.currentSticker.classList.remove('selected-sticker');
            this.currentSticker.style.zIndex = '200'; // Increased from 100 to 200 when deselected
            this.currentSticker = null;
        }
    }

    // --- Delete Selected Sticker --- (Called by keydown listener or delete button)
    deleteSelectedSticker() {
        if (!this.currentSticker) return;

        const stickerIdToDelete = this.currentSticker.id;
        console.log('StickerManager: Deleting sticker:', stickerIdToDelete);
        this.currentSticker.remove();

        // Clear the selection internally
        this.currentSticker = null;

        // Trigger a full page state save in ComicCreator
        // This will implicitly update the stickerStates array
        this.comicCreator.saveCurrentPageState();

        // Update the sidebar view (will show the "Select a sticker" message)
        this.updateStickerControls(); // Refresh sidebar
    }

    // --- Update Rotation Transform ---
    updateStickerTransform(stickerElement) {
        if (!stickerElement) return;
        
        // Get current properties from dataset
        const isFlipped = stickerElement.dataset.isFlippedHorizontally === 'true';
        const rotationAngle = parseInt(stickerElement.dataset.rotationAngle || '0');
        
        // Set transform-origin to center for consistent rotation behavior
        stickerElement.style.transformOrigin = 'center center';
        
        // Get current transform that might contain translate() set by positionSticker
        const currentTransform = stickerElement.style.transform || '';
        let translatePart = '';
        
        // Extract translate part from current transform if it exists
        const translateMatch = currentTransform.match(/translate\([^)]+\)/);
        if (translateMatch) {
            translatePart = translateMatch[0] + ' ';
        }
        
        // Build transform string starting with translation (if any)
        let transform = translatePart;
        
        // Add rotation if needed
        if (rotationAngle !== 0) {
            transform += `rotate(${rotationAngle}deg) `;
        }
        
        // Add flip if needed
        if (isFlipped) {
            transform += `scaleX(-1) `;
        }
        
        // Apply transform
        stickerElement.style.transform = transform.trim();
    }

    // --- Update Sticker Outline ---
    updateStickerOutline(stickerElement) {
        if (!stickerElement) return;
        
        // Get outline properties from dataset
        const outlineEnabled = stickerElement.dataset.outlineEnabled === 'true';
        const outlineWidth = stickerElement.dataset.outlineWidth || '2';
        const outlineColor = stickerElement.dataset.outlineColor || '#000000';
        const outlineStyle = stickerElement.dataset.outlineStyle || 'solid';
        
        // Apply outline style
        if (outlineEnabled) {
            // Use the full outline property for better browser compatibility
            stickerElement.style.outline = `${outlineWidth}px ${outlineStyle} ${outlineColor}`;
            stickerElement.style.outlineOffset = '0px'; // No offset for better visibility
        } else {
            stickerElement.style.outline = 'none';
            stickerElement.style.outlineOffset = '0px';
        }
    }

    /**
     * Position a sticker at a predefined grid position
     * @param {HTMLElement} sticker - The sticker element to position
     * @param {string} position - Grid position like 'top-left', 'middle-center', etc.
     */
    positionSticker(sticker, position) {
        if (!sticker) return;
        
        const container = sticker.parentElement;
        if (!container) return;
        
        let left, top;
        
        // Define positions as percentages
        switch (position) {
            case 'top-left': left = 10; top = 10; break;
            case 'top-center': left = 50; top = 10; break;
            case 'top-right': left = 90; top = 10; break;
            case 'middle-left': left = 10; top = 50; break;
            case 'middle-center': left = 50; top = 50; break;
            case 'middle-right': left = 90; top = 50; break;
            case 'bottom-left': left = 10; top = 90; break;
            case 'bottom-center': left = 50; top = 90; break;
            case 'bottom-right': left = 90; top = 90; break;
            default: left = 50; top = 50; // Default to middle center
        }
        
        // Set position as percentage
        sticker.style.left = `${left}%`;
        sticker.style.top = `${top}%`;
        
        // Calculate transform to center the sticker on the position point
        // This accounts for the sticker's size (similar to TextManager)
        const translateX = position.includes('left') ? '0%' : 
                         position.includes('right') ? '-100%' : '-50%';
        const translateY = position.includes('top') ? '0%' : 
                         position.includes('bottom') ? '-100%' : '-50%';
        
        // Get rotation value
        const rotationAngle = parseInt(sticker.dataset.rotationAngle || '0');
        const rotateStyle = rotationAngle !== 0 ? ` rotate(${rotationAngle}deg)` : '';
        
        // Get flip value
        const isFlipped = sticker.dataset.isFlippedHorizontally === 'true';
        const flipStyle = isFlipped ? ' scaleX(-1)' : '';
        
        // Apply transform with translation for centering, rotation and flip
        sticker.style.transform = `translate(${translateX}, ${translateY})${rotateStyle}${flipStyle}`;
        
        // Save information about the position in a data attribute for easier loading
        sticker.dataset.positionGrid = position;
        
        // Save the current page state after positioning
        this.comicCreator.saveCurrentPageState();
    }
    
    /**
     * Updates the sticker control UI to include position grid buttons
     */
    updatePositionControls(controlsContainer, sticker) {
        if (!controlsContainer || !sticker) return;
        
        // Create a container div for position grid
        const positionContainer = document.createElement('div');
        positionContainer.className = 'position-control-container';
        
        // Add description for the position grid
        const description = document.createElement('p');
        description.className = 'position-description';
        description.style.fontSize = '0.9rem';
        description.style.marginBottom = '8px';
        description.style.color = 'var(--text-muted)';
        description.textContent = 'Click a position to snap the sticker to that location.';
        
        // Create position grid container
        const positionGrid = document.createElement('div');
        positionGrid.className = 'position-grid';
        
        // Define positions to create grid buttons for
        const positions = [
            'top-left', 'top-center', 'top-right',
            'middle-left', 'middle-center', 'middle-right',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        
        // Create a button for each position
        positions.forEach(pos => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'position-btn';
            btn.dataset.position = pos;
            
            // Add position indicator dot
            const dot = document.createElement('div');
            dot.className = `dot ${pos}`;
            
            btn.appendChild(dot);
            
            // Add click handler
            btn.addEventListener('click', () => {
                this.positionSticker(sticker, pos);
            });
            
            positionGrid.appendChild(btn);
        });
        
        // Append all elements to the container
        positionContainer.appendChild(description);
        positionContainer.appendChild(positionGrid);
        
        return positionContainer;
    }

    // --- Update Sticker Controls ---
    updateStickerControls() {
        console.log("StickerManager: Updating controls for sticker:", this.currentSticker ? this.currentSticker.id : 'None');
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) return;

        // Ensure the sticker properties container exists
        let stickerPropsContainer = propertiesPanel.querySelector('#sticker-properties');
        if (!stickerPropsContainer) {
            stickerPropsContainer = document.createElement('div');
            stickerPropsContainer.id = 'sticker-properties';
            stickerPropsContainer.className = 'properties-section';
            propertiesPanel.appendChild(stickerPropsContainer); // Append directly to propertiesPanel
        }

        // Make sure only sticker controls are visible
        propertiesPanel.querySelectorAll('.properties-section').forEach(sec => {
            sec.style.display = sec.id === 'sticker-properties' ? 'block' : 'none';
        });

        if (!this.currentSticker) {
            stickerPropsContainer.innerHTML = `
                <h4>Sticker Settings</h4>
                <div class="panel-controls">
                    <p>Select a sticker on the canvas to see its properties.</p>
                </div>`;
            return;
        }

        // Get current sticker properties
        const sticker = this.currentSticker;
        const currentSize = parseFloat(sticker.dataset.size || '200');
        const rotationAngle = parseInt(sticker.dataset.rotationAngle || '0');
        const outlineEnabled = sticker.dataset.outlineEnabled === 'true';
        const outlineWidth = parseInt(sticker.dataset.outlineWidth || '2');
        const outlineColor = sticker.dataset.outlineColor || '#000000';
        const outlineStyle = sticker.dataset.outlineStyle || 'solid';
        const isFlipped = sticker.dataset.isFlippedHorizontally === 'true';

        // Sticker is selected, populate controls
        stickerPropsContainer.innerHTML = `
            <h4>Sticker Settings</h4>
            <div class="panel-controls">
                <div class="control-group">
                    <h4 style="text-align: center;">Image Controls</h4>
                    <button class="danger-btn delete-sticker-btn" style="width: 100%; margin-bottom: 1rem;">
                        <i class="fas fa-trash"></i> Delete Sticker
                    </button>
                    <div class="zoom-group">
                        <label>Size</label>
                        <input type="range" class="size-control" min="10" max="1000" value="${currentSize}">
                        <span class="size-value">${Math.round(currentSize)}%</span>
                        <button class="reset-size-btn" style="background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; font-size: 0.9rem; width: 100%; justify-content: center; margin-top: 10px;">
                            <i class="fas fa-undo"></i> Reset Size
                        </button>
                    </div>
                    <div class="transform-group" style="margin-top: 1rem;">
                        <div class="flip-group" style="margin-bottom: 0.5rem;">
                            <button class="flip-horizontal-btn">
                            <i class="fas fa-arrows-alt-h"></i> Flip Horizontal
                        </button>
                        </div>
                        <div class="rotation-group" style="margin-top: 1rem;">
                            <label>Rotation</label>
                            <input type="range" class="rotation-control" min="0" max="360" value="${rotationAngle}">
                            <span class="rotation-value">${rotationAngle}°</span>
                            <button class="reset-rotation-btn" style="background: var(--background-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; font-size: 0.9rem; width: 100%; justify-content: center; margin-top: 10px;">
                                <i class="fas fa-undo"></i> Reset Rotation
                            </button>
                        </div>
                        <div class="position-group" style="margin-top: 1rem;">
                            <label style="display: block; margin-bottom: 5px;">Position Grid</label>
                            <div class="position-grid-container"></div>
                        </div>
                    </div>
                    <div class="outline-group" style="margin-top: 1rem;">
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem;">
                            <input type="checkbox" class="outline-toggle" ${outlineEnabled ? 'checked' : ''}>
                            <span>Outline</span>
                        </label>
                        <div class="outline-controls" style="display: ${outlineEnabled ? 'block' : 'none'};">
                            <div style="display: flex; gap: 10px; margin-bottom: 0.5rem;">
                                <label style="flex: 1;">Width</label>
                                <input type="number" class="outline-width" value="${outlineWidth}" min="1" max="20" style="width: 60px;">
                                <span>px</span>
                            </div>
                            <div style="display: flex; gap: 10px; margin-bottom: 0.5rem;">
                                <label style="flex: 1;">Color</label>
                                <input type="color" class="outline-color" value="${outlineColor}">
                            </div>
                            <div style="display: flex; gap: 10px; margin-bottom: 0.5rem;">
                                <label style="flex: 1;">Style</label>
                                <select class="outline-style" style="width: 100px;">
                                    <option value="solid" ${outlineStyle === 'solid' ? 'selected' : ''}>Solid</option>
                                    <option value="dashed" ${outlineStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
                                    <option value="dotted" ${outlineStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        // --- Add Listeners for the controls ---

        // Delete listener
        const deleteBtn = stickerPropsContainer.querySelector('.delete-sticker-btn');
        if (deleteBtn) {
            // Use an instance method reference for the listener
            deleteBtn.onclick = () => this.deleteSelectedSticker();
        }

        // Flip horizontal listener
        const flipHorizontalBtn = stickerPropsContainer.querySelector('.flip-horizontal-btn');
        if (flipHorizontalBtn) {
            flipHorizontalBtn.addEventListener('click', () => {
                const isCurrentlyFlipped = sticker.dataset.isFlippedHorizontally === 'true';
                sticker.dataset.isFlippedHorizontally = isCurrentlyFlipped ? 'false' : 'true';
                flipHorizontalBtn.classList.toggle('active');
                this.updateStickerTransform(sticker);
                this.comicCreator.saveCurrentPageState(); // Save state after flip
            });
        }

        // Position grid
        const positionGridContainer = stickerPropsContainer.querySelector('.position-grid-container');
        if (positionGridContainer) {
            const positionGrid = this.updatePositionControls(positionGridContainer, sticker);
            positionGridContainer.appendChild(positionGrid);
        }

        // Size control listener
        const sizeControl = stickerPropsContainer.querySelector('.size-control');
        const sizeValue = stickerPropsContainer.querySelector('.size-value');
        const resetSizeBtn = stickerPropsContainer.querySelector('.reset-size-btn');

        if (sizeControl && sizeValue) {
            sizeControl.addEventListener('input', (e) => {
                const sizePercent = parseFloat(e.target.value);
                const scale = sizePercent / 100;
                sticker.style.width = `${scale * 100}px`; // Adjust width based on scale
                sticker.style.height = 'auto'; // Maintain aspect ratio
                sticker.dataset.size = sizePercent; // Store percentage in dataset
                sizeValue.textContent = `${Math.round(sizePercent)}%`;
                this.comicCreator.saveCurrentPageState();
            });

             // Reset Size Button
            if (resetSizeBtn) {
                resetSizeBtn.addEventListener('click', () => {
                    const defaultSize = 200; // Default size percentage
                    sizeControl.value = defaultSize;
                    sizeValue.textContent = `${defaultSize}%`;
                    sticker.style.width = `${defaultSize}px`;
                    sticker.style.height = 'auto';
                    sticker.dataset.size = defaultSize;
                    this.comicCreator.saveCurrentPageState();
                });
            }
        }

        // Rotation control listener
        const rotationControl = stickerPropsContainer.querySelector('.rotation-control');
        const rotationValue = stickerPropsContainer.querySelector('.rotation-value');
        const resetRotationBtn = stickerPropsContainer.querySelector('.reset-rotation-btn');

        if (rotationControl && rotationValue) {
            rotationControl.addEventListener('input', (e) => {
                const angle = parseInt(e.target.value);
                sticker.dataset.rotationAngle = angle;
                rotationValue.textContent = `${angle}°`;
                this.updateStickerTransform(sticker);
                this.comicCreator.saveCurrentPageState();
            });

            // Reset Rotation Button
            if (resetRotationBtn) {
                resetRotationBtn.addEventListener('click', () => {
                    rotationControl.value = 0;
                    rotationValue.textContent = '0°';
                    sticker.dataset.rotationAngle = 0;
                    this.updateStickerTransform(sticker);
                    this.comicCreator.saveCurrentPageState();
                });
            }
        }

        // Outline controls
        const outlineToggle = stickerPropsContainer.querySelector('.outline-toggle');
        const outlineControls = stickerPropsContainer.querySelector('.outline-controls');
        const outlineWidthInput = stickerPropsContainer.querySelector('.outline-width');
        const outlineColorInput = stickerPropsContainer.querySelector('.outline-color');
        const outlineStyleInput = stickerPropsContainer.querySelector('.outline-style');

        if (outlineToggle && outlineControls) {
            // Toggle outline controls visibility
            outlineToggle.addEventListener('change', () => {
                const enabled = outlineToggle.checked;
                outlineControls.style.display = enabled ? 'block' : 'none';
                sticker.dataset.outlineEnabled = enabled;
                this.updateStickerOutline(sticker);
                this.comicCreator.saveCurrentPageState();
            });

            // Width input
            if (outlineWidthInput) {
                outlineWidthInput.addEventListener('change', () => {
                    sticker.dataset.outlineWidth = outlineWidthInput.value;
                    this.updateStickerOutline(sticker);
                    this.comicCreator.saveCurrentPageState();
                });
            }

            // Color input
            if (outlineColorInput) {
                outlineColorInput.addEventListener('change', () => {
                    sticker.dataset.outlineColor = outlineColorInput.value;
                    this.updateStickerOutline(sticker);
                    this.comicCreator.saveCurrentPageState();
                });
            }

            // Style input
            if (outlineStyleInput) {
                outlineStyleInput.addEventListener('change', () => {
                    sticker.dataset.outlineStyle = outlineStyleInput.value;
                    this.updateStickerOutline(sticker);
                    this.comicCreator.saveCurrentPageState();
                });
            }
        }
    }

    saveStickerStates() {
        console.log("StickerManager: Saving sticker states");
        const stickers = Array.from(document.querySelectorAll('.canvas-sticker-image'));
        const stickerStates = stickers.map(sticker => {
            // Extract position information from transform/styles
            const position = sticker.dataset.positionGrid || this.getPositionFromSticker(sticker);
            
            return {
            id: sticker.id,
            imageId: sticker.dataset.imageId,
            left: sticker.style.left,
            top: sticker.style.top,
            width: sticker.style.width,
                height: sticker.style.height,
            transform: sticker.style.transform,
            zIndex: sticker.style.zIndex,
                size: sticker.dataset.size || '200',
                isFlippedHorizontally: sticker.dataset.isFlippedHorizontally === 'true',
                rotationAngle: parseInt(sticker.dataset.rotationAngle || '0'),
                outlineEnabled: sticker.dataset.outlineEnabled === 'true',
                outlineWidth: sticker.dataset.outlineWidth || '2',
                outlineColor: sticker.dataset.outlineColor || '#000000',
                outlineStyle: sticker.dataset.outlineStyle || 'solid',
                position: position // Add position information
            };
        });
        return stickerStates;
    }

    /**
     * Determine position identifier from sticker's current position
     * @param {HTMLElement} sticker - The sticker element
     * @returns {string} Position identifier (e.g., 'top-left', 'middle-center')
     */
    getPositionFromSticker(sticker) {
        if (!sticker) return 'middle-center'; // Default
        
        const left = sticker.style.left;
        const top = sticker.style.top;
        
        // If not percentage-based positioning, return default
        if (!left.endsWith('%') || !top.endsWith('%')) {
            return 'custom'; // Custom position
        }
        
        const leftValue = parseInt(left);
        const topValue = parseInt(top);
        
        // Determine horizontal position
        let horizontal;
        if (leftValue <= 20) horizontal = 'left';
        else if (leftValue >= 80) horizontal = 'right';
        else horizontal = 'center';
        
        // Determine vertical position
        let vertical;
        if (topValue <= 20) vertical = 'top';
        else if (topValue >= 80) vertical = 'bottom';
        else vertical = 'middle';
        
        return `${vertical}-${horizontal}`;
    }

    loadStickerStates(page) {
        console.log("StickerManager: Loading sticker states for page");
        const stickerStates = page.stickerStates || [];
        const stickerCanvas = document.querySelector('#comic-canvas');
        if (!stickerCanvas) {
            console.error("StickerManager: Canvas not found during sticker loading.");
            return;
        }

        // Clear any existing stickers managed by this instance before loading
        stickerCanvas.querySelectorAll('.canvas-sticker-image').forEach(sticker => sticker.remove());
        this.currentSticker = null; // Reset selection

        if (stickerStates.length > 0) {
            stickerStates.forEach(state => {
                const image = this.comicCreator.imageLibrary.getImageById(String(state.imageId));
                if (image) {
                    const stickerImg = document.createElement('img');
                    stickerImg.src = image.src; // Use source from image library
                    stickerImg.alt = image.name || 'Sticker';
                    stickerImg.className = 'canvas-sticker-image';
                    stickerImg.id = state.id;
                    
                    // Set dataset attributes
                    stickerImg.dataset.imageId = state.imageId;
                    stickerImg.dataset.size = state.size || '200';
                    stickerImg.dataset.isFlippedHorizontally = state.isFlippedHorizontally ? 'true' : 'false';
                    stickerImg.dataset.rotationAngle = state.rotationAngle !== undefined ? state.rotationAngle : 0;
                    stickerImg.dataset.outlineEnabled = state.outlineEnabled ? 'true' : 'false';
                    stickerImg.dataset.outlineWidth = state.outlineWidth || '2';
                    stickerImg.dataset.outlineColor = state.outlineColor || '#000000';
                    stickerImg.dataset.outlineStyle = state.outlineStyle || 'solid';
                    
                    // Store position grid information
                    if (state.position) {
                        stickerImg.dataset.positionGrid = state.position;
                    }

                    // Restore position and size
                    Object.assign(stickerImg.style, {
                        position: 'absolute',
                        left: state.left || '0px',
                        top: state.top || '0px',
                        width: state.width || '100px',
                        height: state.height || 'auto',
                        zIndex: '200', // Always set to 200 regardless of saved state to ensure consistency
                        cursor: 'grab'
                    });
                    
                    stickerCanvas.appendChild(stickerImg);
                    
                    // If it has a standard position, apply it (this will set transform)
                    if (state.position && state.position !== 'custom') {
                        this.positionSticker(stickerImg, state.position);
                    } else {
                        // Otherwise apply the transform directly
                        // Apply transform (rotation + flip)
                        this.updateStickerTransform(stickerImg);
                    }
                    
                    // Apply outline (after transform is set)
                    this.updateStickerOutline(stickerImg);

                    // Make draggable and add click listener AFTER appending and styling
                    const that = this; // Store reference for the callback
                    this.comicCreator.dragAndDropManager.makeStickerDraggable(stickerImg, {
                        onDragEnd: function(element) {
                            that.resetPositionGrid(element); // Reset position grid after manual drag
                            that.comicCreator.saveCurrentPageState(); // Save state
                        }
                    });
                    
                    stickerImg.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectSticker(stickerImg);
                    });
                } else {
                    console.warn(`StickerManager: Image ID ${state.imageId} not found in library for sticker ${state.id}. Skipping sticker.`);
                }
            });
        }
        console.log(`StickerManager: Loaded ${stickerStates.length} stickers.`);
    }

    /**
     * Resets position grid value when a sticker is manually moved
     * This should be called by the DragAndDropManager after dragging ends
     * @param {HTMLElement} sticker - The sticker element that was moved
     */
    resetPositionGrid(sticker) {
        if (!sticker) return;
        
        // Set to custom to indicate it's not on the grid anymore
        sticker.dataset.positionGrid = 'custom';
        
        // Also ensure there's no transform applied after a drag
        // that might conflict with future grid positioning
        if (sticker.style.transform && !sticker.style.transform.includes('rotate') && !sticker.style.transform.includes('scaleX')) {
            sticker.style.transform = '';
            
            // Re-apply just rotation and flip if needed
            this.updateStickerTransform(sticker);
        }
    }
} 