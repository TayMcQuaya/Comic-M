export class PanelManager {
    constructor(comicCreator) {
        // Store the reference to the main ComicCreator instance
        // This allows the PanelManager to access other parts of the application 
        // like the image library or UI update methods if needed.
        this.comicCreator = comicCreator;

        // Track the currently selected panel element within the editor
        this.currentPanel = null; 
    }

    /**
     * Creates the panel elements on the canvas based on the layout configuration.
     * @param {object} layoutConfig - The layout configuration object.
     * @param {HTMLElement} canvas - The canvas element to add panels to.
     */
    createPanels(layoutConfig, canvas) {
        // Calculate the available space for panels, considering padding/margins
        // These values might need adjustment based on final canvas styling
        const panelAreaWidth = 620;
        const panelAreaHeight = 620;
        const panelGap = 12; // Gap between panels

        layoutConfig.panels.forEach(panel => {
            const div = document.createElement('div');
            div.className = 'comic-panel';
            
            // Calculate base positions and dimensions based on percentage layout
            const baseX = panel.x * panelAreaWidth / 100;
            const baseY = panel.y * panelAreaHeight / 100;
            const baseWidth = panel.width * panelAreaWidth / 100;
            const baseHeight = panel.height * panelAreaHeight / 100;

            // Adjust for panel gap and canvas padding (assuming 40px padding)
            const adjustedX = baseX + 40 + (panel.x > 0 ? panelGap / 2 : 0);
            const adjustedY = baseY + 40 + (panel.y > 0 ? panelGap / 2 : 0);
            // Subtract the gap from width/height to create space
            const adjustedWidth = baseWidth - (panel.width < 100 ? panelGap : 0); 
            const adjustedHeight = baseHeight - (panel.height < 100 ? panelGap : 0);
            
            div.style.left = adjustedX + 'px';
            div.style.top = adjustedY + 'px';
            div.style.width = adjustedWidth + 'px';
            div.style.height = adjustedHeight + 'px';
            
            // Add the panel to the canvas
            canvas.appendChild(div);
        });
    }

    /**
     * Adds an image to a specified panel, replacing any existing image.
     * Calculates initial scale and sets up dragging.
     * @param {HTMLElement} panel - The panel element to add the image to.
     * @param {object} image - The image object (with src, id, etc.).
     */
    addImageToPanel(panel, image) {
        if (!panel || !image) {
            console.error('[addImageToPanel] Cannot add image: invalid panel or image', { panel, image });
            return;
        }
        
        console.log('[addImageToPanel] Called with panel:', panel, 'and image:', image);
        
        try {
            const img = document.createElement('img');
            img.src = image.src;
            img.alt = image.name;
            console.log('[addImageToPanel] Created img element with src:', img.src);
            
            // Find and remove any existing image in the panel
            const existingImg = panel.querySelector('img');
            if (existingImg) {
                existingImg.remove();
                console.log('[addImageToPanel] Removed existing image from panel.');
            }
            
            // Append the new image
            panel.appendChild(img);
            console.log('[addImageToPanel] Appended img to panel:', panel);
            
            // Set initial image styles
            img.style.position = 'absolute';
            img.style.left = '50%';
            img.style.top = '50%';
            img.style.transform = 'translate(-50%, -50%) scale(1)';
    
            // Calculate initial scale to fit the panel while maintaining aspect ratio
            img.onload = () => {
                console.log('Image loaded, calculating scale...');
                const panelWidth = panel.offsetWidth;
                const panelHeight = panel.offsetHeight;
                const imageWidth = img.naturalWidth;
                const imageHeight = img.naturalHeight;
    
                console.log('Panel dimensions:', panelWidth, panelHeight);
                console.log('Image dimensions:', imageWidth, imageHeight);
    
                const scaleX = panelWidth / imageWidth;
                const scaleY = panelHeight / imageHeight;
                // Use max scale to cover the panel area
                const scale = Math.max(scaleX, scaleY);
    
                img.style.transform = `translate(-50%, -50%) scale(${scale})`;
                
                // Store initial scale for reset functionality
                panel.dataset.initialScale = scale;
                panel.dataset.currentScale = scale; // Initialize current scale
                
                console.log('Applied scale:', scale);
            };
            
            // Store image ID for state saving
            panel.dataset.imageId = image.id.toString();
            // Update thumbnail states via the ComicCreator instance
            this.comicCreator.imageLibrary.updateThumbnails(); 
            
            // Setup dragging for the newly added image via the ComicCreator instance
            this.comicCreator.dragAndDropManager.setupImageDragging(img);
            // Select the panel after adding the image
            this.selectPanel(panel);
        } catch (error) {
            console.error('Error adding image to panel:', error);
        }
    }

    /**
     * Selects a panel, deselecting the previous one and updating controls.
     * @param {HTMLElement} panel - The panel element to select.
     */
    selectPanel(panel) {
        // Deselect the previously selected panel, if any
        if (this.currentPanel) {
            this.currentPanel.classList.remove('selected');
            // Reset cursor and pointer events for the image in the deselected panel
            const prevImg = this.currentPanel.querySelector('img');
            if (prevImg) {
                prevImg.style.cursor = 'default';
                prevImg.style.pointerEvents = 'none';
            }
        }
        
        // Set the new current panel
        this.currentPanel = panel;
        
        if (panel) {
            // Apply selected style
            panel.classList.add('selected');
            
            // Set cursor and enable pointer events for the image in the selected panel
            const img = panel.querySelector('img');
            if (img) {
                img.style.cursor = 'grab';
                img.style.pointerEvents = 'auto';
            }
            
            // First ensure we're in panels mode
            if (this.comicCreator.currentSidebarMode !== 'panels') {
                this.comicCreator.currentSidebarMode = 'panels';
                // Update tab UI
                const tabsContainer = document.querySelector('.sidebar-tabs');
                if (tabsContainer) {
                    tabsContainer.querySelectorAll('.tab-btn').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    const panelsTab = tabsContainer.querySelector('[data-tab="panels"]');
                    if (panelsTab) panelsTab.classList.add('active');
                }
            }
            
            // Update the UI
            this.comicCreator.uiManager.updateRightSidebarView();
        } else {
            // If no panel is selected (e.g., clicked outside), clear the panel controls
            const controls = document.querySelector('.panel-controls');
            if (controls) controls.innerHTML = ''; // Simple clearing for now
        }
    }

    /**
     * Clears the image from a specified panel and resets its state.
     * @param {HTMLElement} panel - The panel element to clear.
     */
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
        delete panel.dataset.rotation; // Also clear rotation data
        delete panel.dataset.isFlippedHorizontally; // Also clear flip data

        // Update controls (method will be moved here too)
        this.updatePanelControls(panel);
        // Update thumbnail states via ComicCreator
        this.comicCreator.imageLibrary.updateThumbnails();

        // Save the current page state via ComicCreator
        this.comicCreator.saveCurrentPageState();
    }

    /**
     * Updates the panel control sidebar based on the selected panel's state.
     * @param {HTMLElement} panel - The selected panel element.
     * @param {HTMLElement} container - The DOM element to render controls into.
     */
    updatePanelControls(panel, container) {
        // const controls = document.querySelector('.panel-controls'); // Removed querySelector
        // if (!controls) return; // Removed check based on querySelector
        
        // Use the provided container
        if (!container) {
            console.error("Panel controls container not provided to updatePanelControls");
            return;
        }

        if (!panel) {
            // If no panel is selected, show a prompt
            container.innerHTML = '<h4>Panel Settings</h4><div class="panel-controls"><p>Select a panel to see its properties.</p></div>';
            // this.comicCreator.showSelectPanelModal(); // Consider if modal is still needed here
            return;
        }

        // Clear existing controls and rebuild HTML structure *inside the container*
        container.innerHTML = `
            <h4>Panel Settings</h4>
            <div class="panel-controls">  <!-- Added wrapper div -->
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
                        <button class="flip-horizontal-btn">
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
                </div>
            </div> <!-- Closing wrapper div -->
            `;

        // Get references to the control elements *within the container*
        const controlsContainer = container.querySelector('.panel-controls'); // Find the new wrapper
        if (!controlsContainer) {
            console.error("Could not find .panel-controls wrapper inside container");
            return;
        }

        const zoomControl = controlsContainer.querySelector('.zoom-control');
        const zoomValue = controlsContainer.querySelector('.zoom-value');
        const resetZoomBtn = controlsContainer.querySelector('.reset-zoom-btn');
        const flipHorizontalBtn = controlsContainer.querySelector('.flip-horizontal-btn');
        const rotationControl = controlsContainer.querySelector('.rotation-control');
        const rotationValue = controlsContainer.querySelector('.rotation-value');
        const resetRotationBtn = controlsContainer.querySelector('.reset-rotation-btn');
        const positionBtns = controlsContainer.querySelectorAll('.position-btn');
        
        const img = panel.querySelector('img'); // Get the image within the panel

        // --- Setup Zoom Controls --- 
        if (zoomControl && img) {
            // Initialize slider value based on current state
            const currentScale = parseFloat(panel.dataset.currentScale) || 1;
            const initialScale = parseFloat(panel.dataset.initialScale) || 1;
            const zoomPercentage = (currentScale / initialScale) * 100;
            zoomControl.value = Math.round(zoomPercentage); 
            zoomValue.textContent = `${Math.round(zoomPercentage)}%`;
            
            // Add listener for zoom changes (will call handleZoom within this class)
            zoomControl.addEventListener('input', (e) => this.handleZoom(e, panel));
            
            // Make zoom value editable via UIManager
            this.comicCreator.uiManager.makeSliderValueEditable(zoomControl, zoomValue, '%', 0);
        }

        // --- Setup Reset Zoom Button --- 
        if (resetZoomBtn && img) {
            resetZoomBtn.addEventListener('click', () => {
                // Reset zoom to initial scale
                const initialScale = parseFloat(panel.dataset.initialScale) || 1;
                img.style.transform = img.style.transform.replace(/scale\(.*?\)/, `scale(${initialScale})`);
                panel.dataset.currentScale = initialScale;

                // Update zoom control and value display
                if (zoomControl) {
                    zoomControl.value = 100;
                    zoomValue.textContent = '100%';
                }

                // Save the current page state via ComicCreator
                this.comicCreator.saveCurrentPageState();
            });
        }

        // --- Setup Flip Horizontal Button --- 
        if (flipHorizontalBtn && img) {
            // Set initial button state based on current transform
            const isFlipped = img.style.transform.includes('scaleX(-1)');
            flipHorizontalBtn.classList.toggle('active', isFlipped);
            
            flipHorizontalBtn.addEventListener('click', () => {
                const currentTransform = img.style.transform || '';
                const isCurrentlyFlipped = currentTransform.includes('scaleX(-1)');
                
                // Toggle the flip state in the transform
                if (isCurrentlyFlipped) {
                    img.style.transform = currentTransform.replace(/\s*scaleX\(-1\)/, '');
                    panel.dataset.isFlippedHorizontally = 'false';
                } else {
                    img.style.transform = `${currentTransform} scaleX(-1)`;
                    panel.dataset.isFlippedHorizontally = 'true';
                }
                
                // Toggle button active state
                flipHorizontalBtn.classList.toggle('active');
                
                // Save the current page state via ComicCreator
                this.comicCreator.saveCurrentPageState();
            });
        }

        // --- Setup Rotation Controls --- 
        if (rotationControl && img) {
            // Initialize slider value based on current state
            const currentRotation = parseInt(panel.dataset.rotation || '0');
            rotationControl.value = currentRotation;
            rotationValue.textContent = `${currentRotation}°`;
            
            // Add listener for rotation changes
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
                // Save the current page state via ComicCreator
                this.comicCreator.saveCurrentPageState();
            });
            
            // Make rotation value editable via UIManager
            this.comicCreator.uiManager.makeSliderValueEditable(rotationControl, rotationValue, '°', 0);
        }
        
        // --- Setup Reset Rotation Button --- 
        if (resetRotationBtn && img) {
            resetRotationBtn.addEventListener('click', () => {
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

                // Save the current page state via ComicCreator
                this.comicCreator.saveCurrentPageState();
            });
        }

        // --- Setup Position Controls --- 
        positionBtns.forEach(btn => {
            // Add listener for position changes (will call handlePositionChange within this class)
            btn.addEventListener('click', () => this.handlePositionChange(btn, panel));
        });

        // --- Make values editable via UIManager ---
        // These lines seem redundant now as they were added at the end, but the original calls were higher up.
        // Removing the redundant calls at the end and keeping the corrected ones in place.
        // this.comicCreator.uiManager.makeSliderValueEditable(zoomControl, zoomValue, '%', 0);
        // this.comicCreator.uiManager.makeSliderValueEditable(rotationControl, rotationValue, '°');
    }

    /**
     * Handles the zoom input event for an image within a panel.
     * @param {Event} e - The input event object.
     * @param {HTMLElement} panel - The panel containing the image.
     */
    handleZoom(e, panel) {
        const img = panel.querySelector('img');
        if (!img) return;

        const initialScale = parseFloat(panel.dataset.initialScale) || 1;
        const zoomPercentage = parseFloat(e.target.value);
        const newScale = (initialScale * zoomPercentage) / 100;
        
        // Update transform while maintaining position and other transforms (like rotation, flip)
        const currentTransform = img.style.transform || '';
        let newTransform = currentTransform;

        // Find the existing scale part of the transform
        const scaleRegex = /scale\([\d.]+\)/;
        if (scaleRegex.test(newTransform)) {
            // Replace existing scale
            newTransform = newTransform.replace(scaleRegex, `scale(${newScale})`);
        } else {
            // Add scale if it doesn't exist
            newTransform = `${newTransform} scale(${newScale})`.trim();
        }

        img.style.transform = newTransform;
        
        // Store current scale in dataset
        panel.dataset.currentScale = newScale;
        
        // Update the percentage display
        const zoomValue = e.target.parentElement.querySelector('.zoom-value');
        if (zoomValue) {
            zoomValue.textContent = `${Math.round(zoomPercentage)}%`;
        }

        // Save the current page state via ComicCreator
        this.comicCreator.saveCurrentPageState();
    }

    /**
     * Handles the position change event for an image within a panel.
     * @param {HTMLElement} btn - The position control button that was clicked.
     * @param {HTMLElement} panel - The panel containing the image.
     */
    handlePositionChange(btn, panel) {
        const img = panel.querySelector('img');
        if (!img) return;

        // Get and validate step size from input within the panel controls
        // Assume panel controls are updated/available when this is called
        const stepSizeInput = document.querySelector('.panel-controls .step-size-input');
        let step = 1; // Default value
        
        if (stepSizeInput) {
            const inputValue = parseFloat(stepSizeInput.value);
            // Ensure the value is a positive number and within bounds
            if (!isNaN(inputValue) && inputValue >= 0.1 && inputValue <= 20) {
                step = inputValue;
            } else {
                // Reset to default if invalid and update input display
                stepSizeInput.value = "1";
            }
        }

        // Determine direction based on the button clicked
        const direction = btn.classList.contains('up') ? 'up' :
                        btn.classList.contains('down') ? 'down' :
                        btn.classList.contains('left') ? 'left' :
                        btn.classList.contains('right') ? 'right' : null;
        
        if (!direction) return;

        // Get current position (as percentage)
        const currentLeft = parseFloat(img.style.left) || 50;
        const currentTop = parseFloat(img.style.top) || 50;

        // Calculate new position
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

        // Save the current page state via ComicCreator
        this.comicCreator.saveCurrentPageState();
    }

    /**
     * Saves the state of all panels currently on the canvas.
     * This includes image ID, position, transform, scale, rotation, and flip state.
     * @returns {Array<object>} An array of panel state objects.
     */
    savePanelStates() {
        const panels = Array.from(document.querySelectorAll('.comic-panel'));
        return panels.map(panel => {
            const img = panel.querySelector('img');
            const panelState = {
                // backgroundStyle: panel.dataset.backgroundStyle || 'classic-white', // Keep in ComicCreator? Or move later?
                // textElements: [] // Text state saving remains in ComicCreator for now
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
            
            return panelState;
        });
    }

    /**
     * Loads the state of panels from a saved state array.
     * Applies image, position, transform, scale, rotation, and flip state.
     * @param {Array<object>} panelStates - The array of panel state objects to load.
     */
    loadPanelStates(panelStates) {
        const panels = document.querySelectorAll('.comic-panel');
        if (!panelStates || panelStates.length === 0 || panels.length === 0) {
            console.log('No panel states to load or no panels found on canvas.');
            return;
        }

        const processablePanels = Math.min(panels.length, panelStates.length);
        console.log(`PanelManager: Restoring ${processablePanels} panel image states`);
            
        for (let index = 0; index < processablePanels; index++) {
            const panel = panels[index];
            const state = panelStates[index];
                
            // Check if state exists before accessing its properties
            if (state) { 
                // Restore image if present (Check state AND state.imageId)
                if (state.imageId) { 
                    // Use comicCreator instance to access imageLibrary
                    const image = this.comicCreator.imageLibrary.getImageById(String(state.imageId));
                    if (image) {
                        const img = document.createElement('img');
                        img.src = image.dataUrl || image.src;
                        img.alt = image.name;
                        img.draggable = false; // Prevent native dragging
                        img.dataset.imageId = state.imageId;
                        
                        // Apply saved styles and transforms
                        Object.assign(img.style, {
                            position: 'absolute',
                            left: state.left || '50%',
                            top: state.top || '50%',
                            transform: state.transform || 'translate(-50%, -50%) scale(1)'
                        });
                        
                        // Append the image
                        panel.appendChild(img);
                        // panel.classList.add('has-image'); // Maybe add this? Check if needed
                        
                        // Restore dataset attributes used by controls
                        if (state.initialScale) panel.dataset.initialScale = state.initialScale;
                        if (state.currentScale) panel.dataset.currentScale = state.currentScale;
                        if (state.rotation) panel.dataset.rotation = state.rotation;
                        if (typeof state.isFlippedHorizontally === 'boolean') {
                            panel.dataset.isFlippedHorizontally = state.isFlippedHorizontally.toString();
                            // Ensure transform matches dataset (important if transform didn't save correctly)
                            if (state.isFlippedHorizontally && !img.style.transform.includes('scaleX(-1)')) {
                                img.style.transform = `${img.style.transform} scaleX(-1)`;
                            } else if (!state.isFlippedHorizontally && img.style.transform.includes('scaleX(-1)')) {
                                img.style.transform = img.style.transform.replace(/\s*scaleX\(-1\)/, '');
                            }
                        }
                        
                        // Setup dragging for the restored image via ComicCreator
                        this.comicCreator.dragAndDropManager.setupImageDragging(img);
                    } else {
                         console.warn(`PanelManager: Panel image ID ${state.imageId} not found in loaded images.`);
                    }
                }
                // Text element restoration remains in ComicCreator.loadPageState

            } else {
                console.warn(`PanelManager: Panel state at index ${index} is null or undefined. Skipping image restoration.`);
            }
        } // End for loop
    }

    // Other methods will follow
} 