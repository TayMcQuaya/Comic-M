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
            size: '200' // Default size percentage
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

        // Sticker is selected, populate controls
        const stickerElement = this.currentSticker; // Use internal reference
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
            const isFlipped = stickerElement.style.transform.includes('scaleX(-1)');
            flipHorizontalBtn.classList.toggle('active', isFlipped);

            flipHorizontalBtn.addEventListener('click', () => {
                const currentTransform = stickerElement.style.transform || '';
                const isCurrentlyFlipped = currentTransform.includes('scaleX(-1)');

                if (isCurrentlyFlipped) {
                    stickerElement.style.transform = currentTransform.replace(/\s*scaleX\(-1\)/, '').trim();
                    stickerElement.dataset.isFlippedHorizontally = 'false';
                } else {
                    // Ensure scaleX(-1) is added cleanly
                    stickerElement.style.transform = `${currentTransform} scaleX(-1)`.trim();
                    stickerElement.dataset.isFlippedHorizontally = 'true';
                }
                flipHorizontalBtn.classList.toggle('active');
                this.comicCreator.saveCurrentPageState(); // Save state after flip
            });
        }

        // Size control listener
        const sizeControl = stickerPropsContainer.querySelector('.size-control');
        const sizeValue = stickerPropsContainer.querySelector('.size-value');
        const resetSizeBtn = stickerPropsContainer.querySelector('.reset-size-btn');

        if (sizeControl && sizeValue) {
            // Set initial value based on dataset or default
            const currentSize = parseFloat(stickerElement.dataset.size) || 200; // Use 200% as default if not set
            sizeControl.value = currentSize;
            sizeValue.textContent = `${Math.round(currentSize)}%`;
            // Apply initial size visually (important if dataset was missing or different)
            const initialScale = currentSize / 100;
            stickerElement.style.width = `${initialScale * 100}px`; // Assuming base size is 100px conceptually
            stickerElement.style.height = 'auto';

            sizeControl.addEventListener('input', (e) => {
                const sizePercent = parseFloat(e.target.value);
                const scale = sizePercent / 100;
                stickerElement.style.width = `${scale * 100}px`; // Adjust width based on scale
                stickerElement.style.height = 'auto'; // Maintain aspect ratio
                stickerElement.dataset.size = sizePercent; // Store percentage in dataset
                sizeValue.textContent = `${Math.round(sizePercent)}%`;
                // No need to save state on every input tick, save on blur or final change?
                // Let's save on input for now for responsiveness
                this.comicCreator.saveCurrentPageState();
            });

             // Reset Size Button
            if (resetSizeBtn) {
                resetSizeBtn.addEventListener('click', () => {
                    const defaultSize = 200; // Default size percentage
                    sizeControl.value = defaultSize;
                    sizeValue.textContent = `${defaultSize}%`;
                    stickerElement.dataset.size = defaultSize;
                    stickerElement.style.width = `${(defaultSize / 100) * 100}px`;
                    stickerElement.style.height = 'auto';
                    this.comicCreator.saveCurrentPageState(); // Save state after reset
                });
            }

            // Make size value editable (using ComicCreator's helper)
            this.comicCreator.makeSliderValueEditable(sizeControl, sizeValue, '%', 0);
        }
    }


    // --- State Management ---

    saveStickerStates() {
        console.log("StickerManager: Saving sticker states");
        const stickers = Array.from(document.querySelectorAll('.canvas-sticker-image'));
        const stickerStates = stickers.map(sticker => ({
            id: sticker.id,
            imageId: sticker.dataset.imageId,
            left: sticker.style.left,
            top: sticker.style.top,
            width: sticker.style.width,
            height: sticker.style.height, // Might be 'auto', consider saving natural dimensions?
            transform: sticker.style.transform,
            // rotation: sticker.dataset.rotation || '0', // Assuming rotation might be added later
            zIndex: sticker.style.zIndex,
            size: sticker.dataset.size || '200', // Save size percentage
            isFlippedHorizontally: sticker.dataset.isFlippedHorizontally === 'true'
        }));
        // console.log("Saved States:", stickerStates); // Debug log
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
                    stickerImg.dataset.imageId = state.imageId;

                    // Restore styles and data attributes
                    Object.assign(stickerImg.style, {
                        position: 'absolute',
                        left: state.left || '0px',
                        top: state.top || '0px',
                        width: state.width || '100px', // Use saved width
                        height: state.height || 'auto', // Use saved height or auto
                        transform: state.transform || '', // Restore transform
                        zIndex: state.zIndex || '100', // Restore zIndex
                        cursor: 'grab' // Set cursor
                    });

                    if (state.size) stickerImg.dataset.size = state.size;
                    // if (state.rotation) stickerImg.dataset.rotation = state.rotation; // For future rotation
                    stickerImg.dataset.isFlippedHorizontally = state.isFlippedHorizontally ? 'true' : 'false'; // Store boolean state correctly

                     // Ensure flip state matches transform visually on load
                    const needsFlip = state.isFlippedHorizontally;
                    const hasFlip = stickerImg.style.transform.includes('scaleX(-1)');
                    if (needsFlip && !hasFlip) {
                        stickerImg.style.transform = `${stickerImg.style.transform} scaleX(-1)`.trim();
                    } else if (!needsFlip && hasFlip) {
                         stickerImg.style.transform = stickerImg.style.transform.replace(/\s*scaleX\(-1\)/, '').trim();
                    }


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