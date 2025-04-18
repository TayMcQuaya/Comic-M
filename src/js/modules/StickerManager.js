import { globalRgbToHex, getTextWithLineBreaks } from './Utils.js'; // May need Utils later

export class StickerManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // Store reference to the main ComicCreator instance
        this.currentSticker = null; // Track the currently selected sticker element
        console.log('StickerManager initialized');
    }

    // --- Add Sticker ---
    addSticker(image, dropX, dropY) {
        console.log("[StickerManager.addSticker] Called with image:", image, "at viewport coords", dropX, dropY);
        const stickerCanvas = document.querySelector('#comic-canvas');
        if (!stickerCanvas) {
            console.error('[StickerManager.addSticker] Canvas element not found!');
            return;
        }

        const canvasRect = stickerCanvas.getBoundingClientRect();
        const relativeX = dropX - canvasRect.left;
        const relativeY = dropY - canvasRect.top;

        const stickerId = `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stickerImg = document.createElement('img');

        Object.assign(stickerImg, {
            id: stickerId,
            src: image.dataUrl || image.src, // Use dataUrl if available (consistency?)
            alt: "Sticker",
            className: 'canvas-sticker-image'
        });
        console.log('[StickerManager.addSticker] Created img element with src:', stickerImg.src);

        Object.assign(stickerImg.dataset, {
            imageId: image.id,
            size: '200', // Default size percentage
            rotationAngle: '0', // Initialize rotation angle to 0
            outlineEnabled: 'false', // Outline is disabled by default
            outlineWidth: '2', // Default outline width in pixels
            outlineColor: '#000000', // Default outline color (black)
            outlineStyle: 'solid' // Default outline style
        });

        Object.assign(stickerImg.style, {
            position: 'absolute',
            width: '200px', // Set initial width based on percentage
            height: 'auto',
            cursor: 'grab',
            zIndex: '100' // Default z-index for new stickers
        });

        // Wait for image to load to get dimensions and set position accurately
        stickerImg.onload = () => {
            const imgWidth = stickerImg.offsetWidth;
            const imgHeight = stickerImg.offsetHeight;
            const canvasWidth = stickerCanvas.offsetWidth;
            const canvasHeight = stickerCanvas.offsetHeight;

            // Calculate bounded position, centering the drop point on the image
            let finalLeft = Math.max(0, Math.min(relativeX - imgWidth / 2, canvasWidth - imgWidth));
            let finalTop = Math.max(0, Math.min(relativeY - imgHeight / 2, canvasHeight - imgHeight));

            Object.assign(stickerImg.style, {
                left: `${finalLeft}px`,
                top: `${finalTop}px`
            });

            // Attach drag functionality AFTER position is set
            this.comicCreator.dragAndDropManager.makeStickerDraggable(stickerImg);

            // Add click listener for selection AFTER setup
            stickerImg.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent canvas click listener from deselecting
                this.selectSticker(stickerImg);
            });

            // Save state immediately after adding and positioning
            this.comicCreator.saveCurrentPageState(); // Let ComicCreator handle saving the whole page

            // Select the newly added sticker
            this.selectSticker(stickerImg);
        };

        stickerCanvas.appendChild(stickerImg);
        console.log('[StickerManager.addSticker] Appended img to canvas');
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
        stickerElement.style.zIndex = '101'; // Bring selected sticker to front temporarily

        // Update the right sidebar with sticker controls
        this.updateStickerControls();
    }

    // --- Deselect Current Sticker --- (Called by ComicCreator.deselectAll)
    deselectCurrentSticker() {
        if (this.currentSticker) {
            console.log('StickerManager: Deselecting sticker:', this.currentSticker.id);
            this.currentSticker.classList.remove('selected-sticker');
            this.currentSticker.style.zIndex = '100'; // Reset z-index on deselect
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
        
        // Build transform string
        let transform = '';
        
        // Add rotation if needed (must come before flip for proper visual)
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
                            <button class="flip-horizontal-btn" style="width: 100%; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--background-color); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; ${isFlipped ? 'background: var(--primary-color); color: white;' : ''}">
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
        const stickerStates = stickers.map(sticker => ({
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
            outlineStyle: sticker.dataset.outlineStyle || 'solid'
        }));
        return stickerStates;
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

                    // Restore position and size
                    Object.assign(stickerImg.style, {
                        position: 'absolute',
                        left: state.left || '0px',
                        top: state.top || '0px',
                        width: state.width || '100px',
                        height: state.height || 'auto',
                        zIndex: state.zIndex || '100',
                        cursor: 'grab'
                    });

                    // Apply transform (rotation + flip)
                    this.updateStickerTransform(stickerImg);
                    
                    // Apply outline
                    this.updateStickerOutline(stickerImg);

                    stickerCanvas.appendChild(stickerImg);

                    // Make draggable and add click listener AFTER appending and styling
                    this.comicCreator.dragAndDropManager.makeStickerDraggable(stickerImg);
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
} 