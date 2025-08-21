export class BackgroundManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // Store reference to the main ComicCreator instance

        // Initialize state from the main comic creator instance
        this.useGlobalBackgroundStyle = comicCreator.useGlobalBackgroundStyle;
        this.globalBackgroundStyle = comicCreator.globalBackgroundStyle;

        // Define background style classes
        this.backgroundClasses = [
            'classic-white', 'vintage-paper', 'dotted-pattern',
            'halftone', 'graph-paper', 'gradient-fade'
        ];

        console.log('BackgroundManager initialized with global style:', this.globalBackgroundStyle, 'Global enabled:', this.useGlobalBackgroundStyle);
    }

    // --- Add Background Image ---
    addBackgroundImage(image) {
        console.log("[BackgroundManager.addBackgroundImage] Called with image:", image);
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) {
            console.error("[BackgroundManager.addBackgroundImage] Canvas element not found!");
            return;
        }

        // Make sure any existing background images are removed first
        // Use the specific removeBackgroundImage method which handles state properly
        this.removeBackgroundImage(false); // Don't save state yet, we'll do it after adding the new image
        
        // Double-check for any remaining background images (just to be safe)
        const remainingBgs = canvas.querySelectorAll('.canvas-background-image');
        if (remainingBgs.length > 0) {
            console.warn(`[BackgroundManager.addBackgroundImage] There are still ${remainingBgs.length} background images after removal. Forcibly removing them.`);
            remainingBgs.forEach(bg => bg.remove());
        }

        // Create the new background image element
        const bgImg = document.createElement('img');
        bgImg.src = image.src;
        bgImg.alt = "Canvas Background";
        bgImg.className = 'canvas-background-image';
        console.log('[BackgroundManager.addBackgroundImage] Created img element with src:', bgImg.src);
        bgImg.style.position = 'absolute';
        bgImg.style.top = '0';
        bgImg.style.left = '0';
        bgImg.style.width = '100%';
        bgImg.style.height = '100%';
        bgImg.style.objectFit = 'cover';
        bgImg.style.zIndex = '0';
        bgImg.dataset.imageId = image.id;

        // Prepend to the canvas
        canvas.insertBefore(bgImg, canvas.firstChild);
        console.log('[BackgroundManager.addBackgroundImage] Inserted img into canvas');

        // Update the page state
        const currentPage = this.comicCreator.pages[this.comicCreator.currentPageIndex];
        if (currentPage) {
            currentPage.backgroundState = { imageId: image.id };
            currentPage.canvasBackgroundStyle = null; // Clear style when image is added
            currentPage.hasExplicitBackground = true; // Mark as explicitly set
            
            // Remove any background style classes from the canvas
            if (this.backgroundClasses) {
                canvas.classList.remove(...this.backgroundClasses);
            }
        }

        // Save the overall page state
        this.comicCreator.saveCurrentPageState();
        this.comicCreator.imageLibrary.updateThumbnails();
        // Update sidebar controls to show image options
        this.updateBackgroundControls();
    }

    // --- Remove Background Image ---
    removeBackgroundImage(saveState = true) {
        console.log("[BackgroundManager.removeBackgroundImage] Removing background image.");
        const canvas = document.querySelector('#comic-canvas');
        
        if (!canvas) {
            console.error("[BackgroundManager.removeBackgroundImage] Canvas element not found!");
            return false;
        }
        
        // Find ALL existing background images, not just one
        const existingBgs = canvas.querySelectorAll('.canvas-background-image');
        let removed = false;
        
        if (existingBgs.length > 0) {
            console.log(`[BackgroundManager.removeBackgroundImage] Found ${existingBgs.length} background images to remove.`);
            existingBgs.forEach(bg => {
                bg.remove();
                removed = true;
            });
            
            // Clear state
            const currentPage = this.comicCreator.pages[this.comicCreator.currentPageIndex];
            if (currentPage) {
                currentPage.backgroundState = null;
                // When removing background, check if we should revert to global
                if (this.useGlobalBackgroundStyle) {
                    // Remove explicit flag so global can apply again
                    delete currentPage.hasExplicitBackground;
                }
            }
            
            if (saveState) {
                this.comicCreator.saveCurrentPageState();
                this.updateBackgroundControls(); // Update sidebar
            }
        } else {
            console.log("[BackgroundManager.removeBackgroundImage] No background images found to remove.");
        }
        
        return removed; // Indicate if something was removed
    }

    // --- Apply Predefined Background Style ---
    applyBackgroundStyle(style) {
        console.log(`[BackgroundManager.applyBackgroundStyle] Applying style: ${style}`);
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas || !this.backgroundClasses.includes(style)) {
            console.warn(`[BackgroundManager.applyBackgroundStyle] Invalid style or canvas not found: ${style}`);
            return;
        }

        // Remove all existing background images
        const existingBgs = canvas.querySelectorAll('.canvas-background-image');
        if (existingBgs.length > 0) {
            console.log(`[BackgroundManager.applyBackgroundStyle] Removing ${existingBgs.length} existing background images`);
            existingBgs.forEach(bg => bg.remove());
        } else {
            // If no backgrounds found by direct query, try the formal method which has additional logic
            this.removeBackgroundImage(false); // Don't save state yet
        }

        // Remove any existing background classes
        canvas.classList.remove(...this.backgroundClasses);
        
        // Add the new style class
        canvas.classList.add(style);
        console.log(`[BackgroundManager.applyBackgroundStyle] Added style class: ${style}`);

        // Update manager state if global is active
        if (this.useGlobalBackgroundStyle) {
            this.globalBackgroundStyle = style;
            // Update all pages in the comicCreator instance
            this.comicCreator.pages.forEach(page => {
                page.canvasBackgroundStyle = style;
                page.backgroundState = null; // Ensure image is cleared for all pages
                // Remove explicit flag since we're applying global
                delete page.hasExplicitBackground;
            });
            console.log(`[BackgroundManager.applyBackgroundStyle] Updated all pages with global style: ${style}`);
        } else {
            // Update only the current page state
            const currentPage = this.comicCreator.pages[this.comicCreator.currentPageIndex];
            if (currentPage) {
                currentPage.canvasBackgroundStyle = style;
                currentPage.backgroundState = null; // Ensure image is cleared
                // Mark this page as having explicit background (even if it's white/empty)
                currentPage.hasExplicitBackground = true;
                console.log(`[BackgroundManager.applyBackgroundStyle] Updated current page with style: ${style} (marked as explicit)`);
            }
        }

        // Save the current page state
        this.comicCreator.saveCurrentPageState();
        
        // Update the UI controls to reflect the change
        this.updateBackgroundControls();
    }

    // --- Toggle Global Background Style ---
    toggleGlobalBackground(useGlobal) {
        console.log(`[BackgroundManager.toggleGlobalBackground] Setting global background to: ${useGlobal}`);
        this.useGlobalBackgroundStyle = useGlobal;

        if (useGlobal) {
            // Get current canvas background style
            const canvas = document.querySelector('#comic-canvas');
            const currentStyle = Array.from(canvas?.classList || [])
                .find(cls => this.backgroundClasses.includes(cls)) || 'classic-white';

            // Set as global style
            this.globalBackgroundStyle = currentStyle;
            console.log(`[BackgroundManager.toggleGlobalBackground] Global style set to: ${this.globalBackgroundStyle}`);

            // Apply to all pages that don't have explicit backgrounds
            this.comicCreator.pages.forEach(page => {
                // Only apply global style to pages without explicit backgrounds
                if (!page.hasExplicitBackground) {
                    page.canvasBackgroundStyle = this.globalBackgroundStyle;
                    page.backgroundState = null; // Clear potential background images
                    console.log(`[BackgroundManager.toggleGlobalBackground] Applied global style to page without explicit background`);
                } else {
                    console.log(`[BackgroundManager.toggleGlobalBackground] Skipped page with explicit background`);
                }
            });
        } else {
            // If disabling global, mark current page as having explicit background
            // so it retains its current style
            const currentPage = this.comicCreator.pages[this.comicCreator.currentPageIndex];
            if (currentPage) {
                currentPage.hasExplicitBackground = true;
                console.log(`[BackgroundManager.toggleGlobalBackground] Global disabled. Current page marked as explicit.`);
            }
        }

        // Refresh the current page display to reflect potential changes
        this.loadCurrentPageBackground(); 
        // Save current page state (reflects changes)
        this.comicCreator.saveCurrentPageState();
    }

    // --- Apply Custom Background to All Pages ---
    applyCustomBackgroundToAll() {
        const currentPage = this.comicCreator.pages[this.comicCreator.currentPageIndex];
        const currentImageId = currentPage?.backgroundState?.imageId;

        if (!currentImageId) {
            console.warn('[BackgroundManager.applyCustomBackgroundToAll] No custom background image on current page.');
            this.comicCreator.uiManager.showNotification('No custom background image to apply', 'warning');
            return;
        }

        console.log(`[BackgroundManager.applyCustomBackgroundToAll] Applying image ID ${currentImageId} to all pages`);

        // Apply the background image to all pages
        this.comicCreator.pages.forEach(page => {
            page.backgroundState = { imageId: currentImageId };
            page.canvasBackgroundStyle = null; // Remove any predefined style class
        });

        // Ensure global style is disabled
        this.useGlobalBackgroundStyle = false;

        // Refresh the current page to show the changes
        // We need to reload the *whole* page state as panel states etc. might be affected
        this.comicCreator.loadPageState(this.comicCreator.currentPageIndex);

        // Save the current page state (which should now reflect the change)
        this.comicCreator.saveCurrentPageState();

        // Show success notification
        this.comicCreator.uiManager.showNotification('Background image applied to all pages', 'success');
        console.log('[BackgroundManager.applyCustomBackgroundToAll] Applied custom background to all pages successfully.');
        // Update sidebar controls to reflect global checkbox state
        this.updateBackgroundControls(); 
    }

    // --- Update Background Controls (Right Sidebar) ---
    updateBackgroundControls() {
        console.log("[BackgroundManager.updateBackgroundControls] Updating controls.");
        const propertiesPanel = document.querySelector('.properties-panel');
        if (!propertiesPanel) return;

        let bgProps = propertiesPanel.querySelector('#background-properties');
        if (!bgProps) {
            bgProps = document.createElement('div');
            bgProps.id = 'background-properties';
            bgProps.className = 'properties-section';
            propertiesPanel.appendChild(bgProps);
        }

        // Hide other property sections
        propertiesPanel.querySelectorAll('.properties-section:not(#background-properties)')
           .forEach(sec => sec.style.display = 'none');

        // Determine current state
        const currentPage = this.comicCreator.pages[this.comicCreator.currentPageIndex];
        const hasCustomBackground = currentPage?.backgroundState?.imageId;
        const canvas = document.querySelector('#comic-canvas');
        const currentStyle = Array.from(canvas?.classList || [])
            .find(cls => this.backgroundClasses.includes(cls)) || 'classic-white';

        // Build HTML
        bgProps.innerHTML = `
            <h4>Background Settings</h4>
            <div class="panel-controls">
                <div class="control-group">
                    <h5 style="text-align: center; margin-bottom: 0.5rem;">Style Presets</h5>
                    <div class="background-styles">
                        ${this.backgroundClasses.map(style => `
                        <button class="style-btn ${currentStyle === style && !hasCustomBackground ? 'active' : ''}" data-style="${style}">
                            <span class="preview ${style}"></span>
                            ${style.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                        </button>
                        `).join('')}
                    </div>
                    <div class="global-background-control" style="margin-top: 10px; text-align: left; display: flex; align-items: center;">
                        <input type="checkbox" id="use-global-background" ${this.useGlobalBackgroundStyle ? 'checked' : ''}>
                        <label for="use-global-background" style="margin-left: 8px; font-size: 14px;">Apply style to all pages</label>
                    </div>
                </div>
                <hr>
                <div class="control-group">
                    <h5 style="text-align: center; margin-bottom: 0.5rem;">Custom Image</h5>
                    ${hasCustomBackground ? `
                    <p style="font-size: 0.8em; text-align: center; margin-bottom: 1rem;">Custom image applied. Use <kbd>Delete</kbd> key to remove.</p>
                    <button id="apply-custom-bg-all-btn" class="action-btn" style="width: 100%; margin-bottom: 1rem;">
                        <i class="fas fa-copy"></i> Apply This Image to All Pages
                    </button>
                    ` : '<p style="font-size: 0.8em; text-align: center;">Drag an image from the library onto the canvas to set it as a custom background.</p>'}
                </div>
            </div>`;
        bgProps.style.display = 'block';

        // --- Add Event Listeners ---

        // Global background checkbox listener
        const globalBackgroundCheckbox = bgProps.querySelector('#use-global-background');
        if (globalBackgroundCheckbox) {
            globalBackgroundCheckbox.addEventListener('change', (e) => {
                this.toggleGlobalBackground(e.target.checked);
                // No need to save state here, toggleGlobalBackground handles it
            });
        }

        // Apply custom background to all pages button listener
        const applyCustomBgAllBtn = bgProps.querySelector('#apply-custom-bg-all-btn');
        if (applyCustomBgAllBtn) {
            applyCustomBgAllBtn.addEventListener('click', () => {
                this.applyCustomBackgroundToAll();
                // No need to save state here, applyCustomBackgroundToAll handles it
            });
        }

        // Style button listeners
        const styleButtons = bgProps.querySelectorAll('.style-btn');
        styleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const style = btn.dataset.style;
                this.applyBackgroundStyle(style); // This handles removing image & saving state
                // Update active state visually
                styleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    // --- Load Current Page Background (Helper for state loading/toggling) ---
    loadCurrentPageBackground() {
        console.log("[BackgroundManager.loadCurrentPageBackground] Loading background for current page.");
        const page = this.comicCreator.pages[this.comicCreator.currentPageIndex];
        const canvas = document.querySelector('#comic-canvas');
        if (!page || !canvas) {
            console.error("[BackgroundManager.loadCurrentPageBackground] Page or canvas not found.");
            return;
        }

        // Thoroughly clear existing backgrounds
        // Remove any existing background images
        const existingBgs = canvas.querySelectorAll('.canvas-background-image');
        if (existingBgs.length > 0) {
            console.log(`[BackgroundManager.loadCurrentPageBackground] Removing ${existingBgs.length} existing background images`);
            existingBgs.forEach(bg => bg.remove());
        }
        
        // Remove all background style classes
        canvas.classList.remove(...this.backgroundClasses);

        // Determine what to apply
        let styleToApply = 'classic-white'; // Default
        let imageToApply = null;

        // Check if this page has an explicit background set (even if it's white/empty)
        // If so, don't apply global background
        if (this.useGlobalBackgroundStyle && !page.hasExplicitBackground) {
            // Only apply global style if page doesn't have explicit background
            styleToApply = this.globalBackgroundStyle;
            console.log(`[BackgroundManager.loadCurrentPageBackground] Applying global style: ${styleToApply} (page has no explicit background)`);
        } else {
            // Page has explicit background or global is disabled
            if (page.backgroundState?.imageId) {
                imageToApply = this.comicCreator.imageLibrary.getImageById(String(page.backgroundState.imageId));
                if (imageToApply) {
                    console.log(`[BackgroundManager.loadCurrentPageBackground] Applying page image: ${imageToApply.id}`);
                } else {
                    console.warn(`[BackgroundManager.loadCurrentPageBackground] Page background image ID ${page.backgroundState.imageId} not found.`);
                    // Clear the invalid image ID from state to avoid future issues
                    page.backgroundState = null;
                }
            } else if (page.canvasBackgroundStyle && this.backgroundClasses.includes(page.canvasBackgroundStyle)) {
                styleToApply = page.canvasBackgroundStyle;
                console.log(`[BackgroundManager.loadCurrentPageBackground] Applying page style: ${styleToApply} (explicit)`);
            } else if (page.hasExplicitBackground) {
                // Page was explicitly set but has no style - keep default white
                console.log(`[BackgroundManager.loadCurrentPageBackground] Keeping default white (page has explicit background flag)`);
            }
        }

        // Apply the determined background
        if (imageToApply) {
            // Double check no existing background images remain
            if (canvas.querySelector('.canvas-background-image')) {
                console.warn("[BackgroundManager.loadCurrentPageBackground] Background image still exists after removal. Forcibly removing.");
                canvas.querySelectorAll('.canvas-background-image').forEach(bg => bg.remove());
            }
            
            const bgImg = document.createElement('img');
            bgImg.src = imageToApply.src;
            bgImg.alt = "Canvas Background";
            bgImg.className = 'canvas-background-image';
            Object.assign(bgImg.style, {
                position: 'absolute', top: '0', left: '0',
                width: '100%', height: '100%', objectFit: 'cover', zIndex: '0'
            });
            bgImg.dataset.imageId = imageToApply.id;
            canvas.insertBefore(bgImg, canvas.firstChild);
            console.log("[BackgroundManager.loadCurrentPageBackground] Successfully added background image to canvas.");
        } else {
            // Apply style class
            canvas.classList.add(styleToApply);
            console.log(`[BackgroundManager.loadCurrentPageBackground] Applied style class: ${styleToApply}`);
        }
    }

    // --- Save Background State ---
    saveBackgroundState() {
        console.log("[BackgroundManager.saveBackgroundState] Saving background state");
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) {
            console.error("[BackgroundManager.saveBackgroundState] Canvas element not found!");
            return null;
        }

        // Get current background image if any
        const bgImage = canvas.querySelector('.canvas-background-image');
        const imageId = bgImage?.dataset?.imageId;

        // Get current background style class if any
        const currentStyle = Array.from(canvas.classList)
            .find(cls => this.backgroundClasses.includes(cls));

        return {
            imageId: imageId || null,
            style: currentStyle || null,
            useGlobalStyle: this.useGlobalBackgroundStyle,
            globalStyle: this.globalBackgroundStyle
        };
    }
} 