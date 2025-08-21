/**
 * ClientExportManager - Handles client-side PDF generation
 * This module processes comics directly in the browser using html2canvas and jsPDF,
 * eliminating server dependency for most exports.
 */

export class ClientExportManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        this.progressCallback = null;
        this.isExporting = false;
        this.currentExportId = null;
    }

    /**
     * Main export method - generates PDF entirely in the browser
     * @param {Object} options - Export options
     * @returns {Promise<boolean|Blob>} - Success status or PDF blob
     */
    async exportToClient(options = {}) {
        const { 
            quality = 0.85, 
            filename = 'comic.pdf',
            returnBlob = false,
            progressCallback = null 
        } = options;

        if (this.isExporting) {
            console.warn('[ClientExport] Export already in progress');
            return false;
        }

        this.isExporting = true;
        this.progressCallback = progressCallback;
        this.currentExportId = `client_${Date.now()}`;
        
        // CRITICAL: Set flag to prevent auto-save during export
        this.comicCreator.isExporting = true;
        console.log('[ClientExport] Starting client-side export with options:', options);
        console.log('[ClientExport] Auto-save disabled during export to prevent page corruption');

        try {
            // Get canvas dimensions
            const canvasDimension = this.comicCreator.canvasDimensions[this.comicCreator.selectedCanvasDimension];
            const canvasWidth = canvasDimension?.width || 700;
            const canvasHeight = canvasDimension?.height || 700;
            
            console.log(`[ClientExport] Canvas dimensions: ${canvasWidth}x${canvasHeight}`);

            // Initialize jsPDF with correct dimensions
            const pdf = new window.jspdf.jsPDF({
                orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [canvasWidth, canvasHeight]
            });

            const totalPages = this.comicCreator.pages.length;
            console.log(`[ClientExport] Processing ${totalPages} pages`);

            // CRITICAL: Save the current page state before export starts
            // This prevents corruption of the page we're currently viewing
            console.log('[ClientExport] Saving current page state before export');
            this.comicCreator.saveCurrentPageState();
            
            // Save current page index to restore later
            const originalPageIndex = this.comicCreator.currentPageIndex;
            
            // Prepare viewport for export (reset zoom/pan)
            console.log('[ClientExport] Preparing viewport for export');
            this.comicCreator.viewportManager.prepareForExport();

            for (let i = 0; i < totalPages; i++) {
                // Update progress
                const progress = ((i + 1) / totalPages) * 100;
                this.updateProgress('rendering', progress, `Processing page ${i + 1} of ${totalPages}`);

                // Load page
                console.log(`[ClientExport] Loading page ${i + 1}`);
                await this.comicCreator.loadPageState(i);
                
                // Verify page content loaded correctly
                const verificationResult = await this.verifyPageContent(i);
                if (!verificationResult.success) {
                    console.warn(`[ClientExport] Page ${i + 1} verification failed, attempting retry...`);
                    // Retry loading once
                    await this.comicCreator.loadPageState(i);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                // Wait for page to fully render
                await this.waitForPageRender();

                // Prepare elements for export
                this.preprocessForExport();

                // Capture canvas with retry logic
                console.log(`[ClientExport] Capturing page ${i + 1}`);
                let canvas = await this.captureCanvas(quality);
                
                // Verify captured content
                const captureVerification = this.verifyCapturedCanvas(canvas);
                if (!captureVerification.valid) {
                    console.warn(`[ClientExport] Page ${i + 1} capture seems incomplete, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    canvas = await this.captureCanvas(quality);
                }

                // Add page to PDF
                if (i > 0) {
                    pdf.addPage([canvasWidth, canvasHeight]);
                }

                // Add image to PDF
                const imgData = canvas.toDataURL('image/jpeg', quality);
                pdf.addImage(imgData, 'JPEG', 0, 0, canvasWidth, canvasHeight, undefined, 'FAST');

                // Clean up preprocessing
                this.cleanupAfterExport();

                console.log(`[ClientExport] Page ${i + 1} added to PDF`);
            }

            // Restore original page with extra care for backgrounds
            console.log('[ClientExport] Restoring original page:', originalPageIndex);
            await this.comicCreator.loadPageState(originalPageIndex);
            
            // Additional wait to ensure background images are loaded
            const backgroundCheck = document.querySelector('#comic-canvas .canvas-background-image');
            if (this.comicCreator.pages[originalPageIndex].backgroundState?.imageId && !backgroundCheck) {
                console.log('[ClientExport] Background missing after restore, waiting for reload...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Force background reload if still missing
                const bgStillMissing = !document.querySelector('#comic-canvas .canvas-background-image');
                if (bgStillMissing) {
                    console.log('[ClientExport] Forcing background reload...');
                    this.comicCreator.backgroundManager.loadCurrentPageBackground();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Restore viewport state after export
            console.log('[ClientExport] Restoring viewport after export');
            this.comicCreator.viewportManager.restoreAfterExport();

            // Update progress
            this.updateProgress('complete', 100, 'Export complete!');

            // Save or return PDF
            if (returnBlob) {
                const blob = pdf.output('blob');
                console.log(`[ClientExport] PDF blob generated, size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                return blob;
            } else {
                pdf.save(filename);
                console.log(`[ClientExport] PDF saved as ${filename}`);
                return true;
            }

        } catch (error) {
            console.error('[ClientExport] Export error:', error);
            this.updateProgress('error', 0, `Export failed: ${error.message}`);
            throw error;
        } finally {
            // CRITICAL: Always reset export flag to re-enable auto-save
            this.comicCreator.isExporting = false;
            this.isExporting = false;
            this.currentExportId = null;
            console.log('[ClientExport] Export finished, auto-save re-enabled');
        }
    }

    /**
     * Capture the comic canvas using html2canvas
     */
    async captureCanvas(quality = 0.85) {
        const canvasElement = document.getElementById('comic-canvas');
        
        if (!canvasElement) {
            throw new Error('Comic canvas not found');
        }

        const options = {
            scale: 2, // Higher quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 15000,
            ignoreElements: (element) => {
                // Ignore external stylesheets that might fail to load
                if (element.tagName === 'LINK' && element.rel === 'stylesheet') {
                    // Allow critical styles but ignore Vite-generated ones that might 403
                    return element.href && element.href.includes('/assets/');
                }
                return false;
            },
            onclone: (clonedDoc) => {
                // Additional processing on cloned document if needed
                const clonedCanvas = clonedDoc.getElementById('comic-canvas');
                if (clonedCanvas) {
                    // Ensure visibility and proper positioning
                    clonedCanvas.style.display = 'block';
                    clonedCanvas.style.opacity = '1';
                    clonedCanvas.style.visibility = 'visible';
                    clonedCanvas.style.position = 'relative';
                    clonedCanvas.style.transform = 'none';
                    clonedCanvas.style.left = '0';
                    clonedCanvas.style.top = '0';
                }
                
                // Ensure transform container is reset in clone too
                const clonedTransform = clonedDoc.querySelector('.canvas-transform-container');
                if (clonedTransform) {
                    clonedTransform.style.transform = 'none';
                }
            }
        };

        try {
            const canvas = await html2canvas(canvasElement, options);
            return canvas;
        } catch (error) {
            console.error('[ClientExport] html2canvas error:', error);
            throw new Error(`Failed to capture page: ${error.message}`);
        }
    }

    /**
     * Wait for page to fully render with enhanced timing and verification
     */
    async waitForPageRender() {
        console.log('[ClientExport] Starting enhanced page render wait...');
        
        // Wait for all images to load (panels, backgrounds, stickers)
        const allImages = document.querySelectorAll('#comic-canvas img');
        const backgroundImages = document.querySelectorAll('#comic-canvas .canvas-background-image');
        const panelImages = document.querySelectorAll('#comic-canvas .comic-panel img');
        const stickerImages = document.querySelectorAll('#comic-canvas .canvas-sticker-image');
        
        console.log(`[ClientExport] Waiting for images - Total: ${allImages.length}, Backgrounds: ${backgroundImages.length}, Panels: ${panelImages.length}, Stickers: ${stickerImages.length}`);
        
        const imagePromises = Array.from(allImages).map(img => {
            if (img.complete && img.naturalHeight !== 0) {
                return Promise.resolve();
            }
            return new Promise((resolve) => {
                const loadHandler = () => {
                    console.log(`[ClientExport] Image loaded: ${img.src.substring(0, 50)}...`);
                    resolve();
                };
                const errorHandler = () => {
                    console.warn(`[ClientExport] Image failed to load: ${img.src.substring(0, 50)}...`);
                    resolve(); // Resolve anyway to not block export
                };
                
                img.addEventListener('load', loadHandler, { once: true });
                img.addEventListener('error', errorHandler, { once: true });
                
                // Timeout after 8 seconds per image
                setTimeout(() => {
                    console.log(`[ClientExport] Image load timeout: ${img.src.substring(0, 50)}...`);
                    resolve();
                }, 8000);
            });
        });

        await Promise.all(imagePromises);
        console.log('[ClientExport] All images loaded or timed out');
        
        // Force reflow to ensure layout is calculated
        const canvas = document.getElementById('comic-canvas');
        if (canvas) {
            canvas.offsetHeight; // Force reflow
        }
        
        // Enhanced wait for text elements with positioning verification
        const textElements = document.querySelectorAll('#comic-canvas .text-bubble');
        if (textElements.length > 0) {
            console.log(`[ClientExport] Waiting for ${textElements.length} text elements to stabilize...`);
            
            // Wait for text elements to get their computed styles
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify text elements have proper positioning
            let unstableElements = 0;
            textElements.forEach(element => {
                const rect = element.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) {
                    unstableElements++;
                    console.warn('[ClientExport] Text element has zero dimensions:', element);
                }
            });
            
            if (unstableElements > 0) {
                console.log(`[ClientExport] ${unstableElements} text elements need more time...`);
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                // Additional wait for text rendering and font loading
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Wait for background images specifically
        if (backgroundImages.length > 0) {
            console.log(`[ClientExport] Additional wait for ${backgroundImages.length} background images...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Base wait for general rendering completion
        console.log('[ClientExport] Final rendering stabilization wait...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Force another reflow after all waits
        if (canvas) {
            canvas.offsetHeight; // Force reflow
        }
        
        console.log('[ClientExport] Page render wait complete');
    }

    /**
     * Preprocess elements for accurate export with enhanced transform management
     */
    preprocessForExport() {
        console.log('[ClientExport] Starting preprocessing for export...');
        
        // Add export class to body
        document.body.classList.add('exporting');

        // Get canvas and force layout recalculation
        const canvas = document.getElementById('comic-canvas');
        const transformContainer = document.querySelector('.canvas-transform-container');
        
        // Store original transform values for restoration
        if (canvas) {
            canvas.dataset.originalTransform = canvas.style.transform || '';
            canvas.dataset.originalTransition = canvas.style.transition || '';
            canvas.dataset.originalPosition = canvas.style.position || '';
            
            // Reset canvas transforms and positioning
            canvas.style.transform = 'none';
            canvas.style.transition = 'none';
            canvas.style.position = 'relative';
            canvas.style.left = '0';
            canvas.style.top = '0';
            
            // Force reflow
            canvas.offsetHeight;
        }
        
        // Reset viewport transform container (critical for proper positioning)
        if (transformContainer) {
            console.log('[ClientExport] Resetting transform container for export');
            transformContainer.dataset.originalTransform = transformContainer.style.transform || '';
            transformContainer.dataset.originalTransition = transformContainer.style.transition || '';
            
            transformContainer.style.transform = 'none';
            transformContainer.style.transition = 'none';
            
            // Force reflow
            transformContainer.offsetHeight;
        }
        
        // Wait a moment for transform reset to take effect
        const forceReflow = () => {
            if (canvas) canvas.offsetHeight;
            if (transformContainer) transformContainer.offsetHeight;
        };
        forceReflow();

        // Process text bubbles - apply CSS variables as inline styles
        const textBubbles = document.querySelectorAll('#comic-canvas .text-bubble');
        console.log(`[ClientExport] Processing ${textBubbles.length} text bubbles...`);
        
        textBubbles.forEach((bubble, index) => {
            const computedStyle = window.getComputedStyle(bubble);
            
            // Store original values to restore later
            bubble.dataset.originalBg = bubble.style.backgroundColor || '';
            bubble.dataset.originalOpacity = bubble.style.opacity || '';
            bubble.dataset.originalTransform = bubble.style.transform || '';
            
            // Handle bubble tails - convert CSS pseudo-elements to SVG for export
            const tailPositionClass = Array.from(bubble.classList)
                .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));
            
            if (tailPositionClass && !bubble.querySelector('.bubble-tail-svg')) {
                // Store original tail class for restoration
                bubble.dataset.originalTailClass = tailPositionClass;
                
                // Get tail position from class name
                const tailPosition = tailPositionClass.replace(/(?:speech|thought)-tail-/, '');
                
                // Check if it's a speech or thought bubble
                const isSpeechBubble = bubble.classList.contains('speech-bubble');
                const isThoughtBubble = bubble.classList.contains('thought-bubble');
                
                if (isSpeechBubble || isThoughtBubble) {
                    console.log(`[ClientExport] Creating SVG tail for ${isSpeechBubble ? 'speech' : 'thought'} bubble with position: ${tailPosition}`);
                    
                    // Simplify position for SVG creation (bottom-left -> bottom, top-right -> top, etc.)
                    let simplifiedPosition = tailPosition;
                    if (tailPosition.includes('-')) {
                        simplifiedPosition = tailPosition.split('-')[0]; // Get first part (bottom, top, left, right)
                        // Special case for middle positions
                        if (simplifiedPosition === 'middle') {
                            simplifiedPosition = tailPosition.includes('left') ? 'left' : 
                                               tailPosition.includes('right') ? 'right' : 'bottom';
                        }
                    }
                    
                    // Create SVG tail using TextManager's existing functions
                    if (this.comicCreator.textManager && this.comicCreator.textManager.styling) {
                        const settings = {
                            tailPosition: simplifiedPosition, // Use simplified position for SVG creation
                            tailColor: computedStyle.getPropertyValue('--bubble-background-color') || '#ffffff',
                            speechTailLength: 20,
                            speechTailWidth: 15,
                            speechTailInset: 50,
                            speechTailShear: 0,
                            speechTailOutline: true,
                            thoughtNumCircles: 3,
                            thoughtCircleRadius: 5,
                            thoughtCircleSpacing: 5,
                            thoughtTailInset: 50,
                            thoughtTailOffset: 0
                        };
                        
                        if (isSpeechBubble) {
                            this.comicCreator.textManager.styling.createSpeechBubbleSvgTail(bubble, settings);
                        } else {
                            this.comicCreator.textManager.styling.createThoughtBubbleSvgTail(bubble, settings);
                        }
                        
                        // Mark that we created an SVG tail for export
                        bubble.dataset.exportCreatedSvg = 'true';
                    }
                    
                    // Remove CSS tail class temporarily for export
                    bubble.classList.remove(tailPositionClass);
                }
            }
            
            // Apply CSS variable values as inline styles
            const bgColor = computedStyle.getPropertyValue('--bubble-background-color');
            const opacity = computedStyle.getPropertyValue('--bubble-opacity');
            
            if (bgColor) {
                bubble.style.backgroundColor = bgColor;
            }
            if (opacity) {
                bubble.style.opacity = opacity;
            }
            
            // Ensure text bubble transforms are preserved but stable
            const currentTransform = computedStyle.transform;
            if (currentTransform && currentTransform !== 'none') {
                bubble.style.transform = currentTransform;
            }

            // Mark for export
            bubble.classList.add('exporting-direct-style');
            
            // Process text content inside bubble (CRITICAL - match Puppeteer export)
            const textContent = bubble.querySelector('.text-content');
            if (textContent) {
                // Handle text shadows - same as Puppeteer does
                if (textContent.getAttribute('data-has-shadow') === 'true') {
                    const shadowX = textContent.getAttribute('data-shadow-x') || '2';
                    const shadowY = textContent.getAttribute('data-shadow-y') || '2';
                    const shadowBlur = textContent.getAttribute('data-shadow-blur') || '2';
                    const shadowColor = textContent.getAttribute('data-shadow-color') || '#666666';
                    
                    const shadowValue = `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}`;
                    textContent.style.setProperty('--export-text-shadow', shadowValue);
                    textContent.style.textShadow = shadowValue;
                    
                    // Store original for restoration
                    textContent.dataset.originalShadow = textContent.style.textShadow || '';
                }
                
                // Handle text outlines
                if (textContent.getAttribute('data-has-outline') === 'true') {
                    const outlineColor = textContent.getAttribute('data-outline-color') || '#000000';
                    const outlineThickness = textContent.getAttribute('data-outline-thickness') || '1';
                    
                    textContent.style.setProperty('--stroke-width', `${outlineThickness}px`);
                    textContent.style.setProperty('--stroke-color', outlineColor);
                    textContent.style.webkitTextStrokeWidth = `${outlineThickness}px`;
                    textContent.style.webkitTextStrokeColor = outlineColor;
                    
                    // Store originals
                    textContent.dataset.originalStrokeWidth = textContent.style.webkitTextStrokeWidth || '';
                    textContent.dataset.originalStrokeColor = textContent.style.webkitTextStrokeColor || '';
                }
            }
            
            // Log position for debugging
            const rect = bubble.getBoundingClientRect();
            console.log(`[ClientExport] Text bubble ${index}: pos(${rect.left}, ${rect.top}), size(${rect.width}x${rect.height})`);
        });

        // Process stickers - ensure proper positioning and outlines
        const stickers = document.querySelectorAll('#comic-canvas .canvas-sticker-image');
        console.log(`[ClientExport] Processing ${stickers.length} stickers...`);
        
        stickers.forEach(sticker => {
            // Store original values
            sticker.dataset.originalOutline = sticker.style.outline || '';
            sticker.dataset.originalTransform = sticker.style.transform || '';
            
            if (sticker.style.outline) {
                // Convert outline to border for better html2canvas support
                const outlineValue = sticker.style.outline;
                sticker.style.border = outlineValue;
                sticker.style.outline = 'none';
            }
            
            // Preserve sticker transforms
            const computedTransform = window.getComputedStyle(sticker).transform;
            if (computedTransform && computedTransform !== 'none') {
                sticker.style.transform = computedTransform;
            }
        });

        // Process background images - ensure they're properly positioned
        const bgImages = document.querySelectorAll('#comic-canvas .canvas-background-image');
        console.log(`[ClientExport] Processing ${bgImages.length} background images...`);
        
        bgImages.forEach(bgImg => {
            // Store original values
            bgImg.dataset.originalPosition = bgImg.style.position || '';
            bgImg.dataset.originalZIndex = bgImg.style.zIndex || '';
            
            // Ensure background is at bottom layer
            bgImg.style.position = 'absolute';
            bgImg.style.zIndex = '0';
            bgImg.style.top = '0';
            bgImg.style.left = '0';
            bgImg.style.width = '100%';
            bgImg.style.height = '100%';
        });
        
        // Process panel images
        const panelImages = document.querySelectorAll('#comic-canvas .comic-panel img');
        console.log(`[ClientExport] Processing ${panelImages.length} panel images...`);
        
        panelImages.forEach(img => {
            // Ensure panel images are visible
            img.style.opacity = '1';
            img.style.visibility = 'visible';
        });
        
        // Final forced reflow after all changes
        forceReflow();
        
        console.log('[ClientExport] Preprocessing complete');
    }

    /**
     * Clean up after export preprocessing with complete restoration
     */
    cleanupAfterExport() {
        console.log('[ClientExport] Starting cleanup after export...');
        
        // Remove export class
        document.body.classList.remove('exporting');

        // Restore canvas transforms and positioning
        const canvas = document.getElementById('comic-canvas');
        if (canvas) {
            if (canvas.dataset.originalTransform !== undefined) {
                canvas.style.transform = canvas.dataset.originalTransform;
                delete canvas.dataset.originalTransform;
            }
            if (canvas.dataset.originalTransition !== undefined) {
                canvas.style.transition = canvas.dataset.originalTransition;
                delete canvas.dataset.originalTransition;
            }
            if (canvas.dataset.originalPosition !== undefined) {
                canvas.style.position = canvas.dataset.originalPosition;
                delete canvas.dataset.originalPosition;
            }
            // Reset positioning if it was changed
            if (canvas.style.left === '0px') canvas.style.left = '';
            if (canvas.style.top === '0px') canvas.style.top = '';
        }
        
        // Restore transform container
        const transformContainer = document.querySelector('.canvas-transform-container');
        if (transformContainer) {
            console.log('[ClientExport] Restoring transform container...');
            if (transformContainer.dataset.originalTransform !== undefined) {
                transformContainer.style.transform = transformContainer.dataset.originalTransform;
                delete transformContainer.dataset.originalTransform;
            }
            if (transformContainer.dataset.originalTransition !== undefined) {
                transformContainer.style.transition = transformContainer.dataset.originalTransition;
                delete transformContainer.dataset.originalTransition;
            }
        }

        // Restore text bubbles
        const textBubbles = document.querySelectorAll('#comic-canvas .text-bubble.exporting-direct-style');
        console.log(`[ClientExport] Restoring ${textBubbles.length} text bubbles...`);
        
        textBubbles.forEach(bubble => {
            if (bubble.dataset.originalBg !== undefined) {
                bubble.style.backgroundColor = bubble.dataset.originalBg;
                delete bubble.dataset.originalBg;
            }
            if (bubble.dataset.originalOpacity !== undefined) {
                bubble.style.opacity = bubble.dataset.originalOpacity;
                delete bubble.dataset.originalOpacity;
            }
            if (bubble.dataset.originalTransform !== undefined) {
                bubble.style.transform = bubble.dataset.originalTransform;
                delete bubble.dataset.originalTransform;
            }
            
            // Restore bubble tail if we created an SVG for export
            if (bubble.dataset.exportCreatedSvg === 'true') {
                // Remove the SVG tail we created for export
                const svgTail = bubble.querySelector('.bubble-tail-svg');
                if (svgTail) {
                    svgTail.remove();
                }
                delete bubble.dataset.exportCreatedSvg;
            }
            
            // Restore original CSS tail class if it was removed
            if (bubble.dataset.originalTailClass) {
                bubble.classList.add(bubble.dataset.originalTailClass);
                delete bubble.dataset.originalTailClass;
            }
            
            // Restore text content properties
            const textContent = bubble.querySelector('.text-content');
            if (textContent) {
                // Restore shadow
                if (textContent.dataset.originalShadow !== undefined) {
                    textContent.style.textShadow = textContent.dataset.originalShadow;
                    textContent.style.removeProperty('--export-text-shadow');
                    delete textContent.dataset.originalShadow;
                }
                
                // Restore outline
                if (textContent.dataset.originalStrokeWidth !== undefined) {
                    textContent.style.webkitTextStrokeWidth = textContent.dataset.originalStrokeWidth;
                    delete textContent.dataset.originalStrokeWidth;
                }
                if (textContent.dataset.originalStrokeColor !== undefined) {
                    textContent.style.webkitTextStrokeColor = textContent.dataset.originalStrokeColor;
                    delete textContent.dataset.originalStrokeColor;
                }
                textContent.style.removeProperty('--stroke-width');
                textContent.style.removeProperty('--stroke-color');
            }
            
            bubble.classList.remove('exporting-direct-style');
        });

        // Restore stickers
        const stickers = document.querySelectorAll('#comic-canvas .canvas-sticker-image');
        console.log(`[ClientExport] Restoring ${stickers.length} stickers...`);
        
        stickers.forEach(sticker => {
            if (sticker.dataset.originalOutline !== undefined) {
                sticker.style.outline = sticker.dataset.originalOutline;
                sticker.style.border = '';
                delete sticker.dataset.originalOutline;
            }
            if (sticker.dataset.originalTransform !== undefined) {
                sticker.style.transform = sticker.dataset.originalTransform;
                delete sticker.dataset.originalTransform;
            }
        });
        
        // Restore background images
        const bgImages = document.querySelectorAll('#comic-canvas .canvas-background-image');
        console.log(`[ClientExport] Restoring ${bgImages.length} background images...`);
        
        bgImages.forEach(bgImg => {
            if (bgImg.dataset.originalPosition !== undefined) {
                bgImg.style.position = bgImg.dataset.originalPosition;
                delete bgImg.dataset.originalPosition;
            }
            if (bgImg.dataset.originalZIndex !== undefined) {
                bgImg.style.zIndex = bgImg.dataset.originalZIndex;
                delete bgImg.dataset.originalZIndex;
            }
        });
        
        console.log('[ClientExport] Cleanup complete');
    }

    /**
     * Verify page content loaded correctly
     */
    async verifyPageContent(pageIndex) {
        const page = this.comicCreator.pages[pageIndex];
        if (!page) {
            return { success: false, reason: 'Page data not found' };
        }

        const canvas = document.getElementById('comic-canvas');
        if (!canvas) {
            return { success: false, reason: 'Canvas not found' };
        }

        // Count expected vs actual elements
        const expectedPanels = page.panelStates ? page.panelStates.filter(p => p.imageId).length : 0;
        const actualPanels = canvas.querySelectorAll('.comic-panel img').length;
        
        const expectedText = page.canvasTextElements ? page.canvasTextElements.length : 0;
        const actualText = canvas.querySelectorAll('.text-bubble').length;
        
        const expectedStickers = page.stickerStates ? page.stickerStates.length : 0;
        const actualStickers = canvas.querySelectorAll('.canvas-sticker-image').length;
        
        const hasBackground = page.backgroundState && page.backgroundState.imageId;
        const actualBackground = canvas.querySelector('.canvas-background-image');
        
        console.log(`[ClientExport] Page ${pageIndex + 1} verification:
            Panels: expected=${expectedPanels}, actual=${actualPanels}
            Text: expected=${expectedText}, actual=${actualText}
            Stickers: expected=${expectedStickers}, actual=${actualStickers}
            Background: expected=${hasBackground}, actual=${!!actualBackground}`);
        
        // Check for major discrepancies
        if (actualPanels < expectedPanels || actualText < expectedText) {
            return { 
                success: false, 
                reason: `Missing elements: panels(${actualPanels}/${expectedPanels}), text(${actualText}/${expectedText})` 
            };
        }
        
        // Check if canvas has any content at all
        const hasContent = actualPanels > 0 || actualText > 0 || actualStickers > 0 || actualBackground;
        if (!hasContent && (expectedPanels > 0 || expectedText > 0 || expectedStickers > 0 || hasBackground)) {
            return { success: false, reason: 'Canvas appears empty' };
        }
        
        return { success: true };
    }

    /**
     * Verify captured canvas has content
     */
    verifyCapturedCanvas(canvas) {
        if (!canvas) {
            return { valid: false, reason: 'Canvas is null' };
        }
        
        // Check canvas dimensions
        if (canvas.width === 0 || canvas.height === 0) {
            return { valid: false, reason: 'Canvas has zero dimensions' };
        }
        
        // Sample some pixels to check if it's not completely blank
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
        const data = imageData.data;
        
        let nonWhitePixels = 0;
        for (let i = 0; i < data.length; i += 4) {
            // Check if pixel is not white (allowing for slight variations)
            if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
                nonWhitePixels++;
            }
        }
        
        // If less than 1% of sampled pixels are non-white, consider it blank
        const totalPixels = (imageData.width * imageData.height);
        const nonWhiteRatio = nonWhitePixels / totalPixels;
        
        if (nonWhiteRatio < 0.01) {
            console.warn(`[ClientExport] Canvas appears mostly blank (${(nonWhiteRatio * 100).toFixed(2)}% non-white)`);
            return { valid: false, reason: 'Canvas appears blank' };
        }
        
        return { valid: true };
    }

    /**
     * Update export progress
     */
    updateProgress(stage, percentage, message) {
        const progressData = {
            stage,
            percentage: Math.round(percentage),
            message,
            exportId: this.currentExportId
        };

        console.log(`[ClientExport] Progress: ${progressData.percentage}% - ${message}`);

        // Call progress callback if provided
        if (this.progressCallback) {
            this.progressCallback(progressData);
        }

        // Update UI through UIManager
        if (this.comicCreator.uiManager) {
            this.comicCreator.uiManager.showExportProgress(message, percentage, { stage });
        }
    }

    /**
     * Check if client-side export is suitable for current project
     */
    canExportClientSide() {
        const pageCount = this.comicCreator.pages.length;
        const imageCount = this.comicCreator.imageLibrary.getImages().length;
        
        // Check browser capabilities
        const hasHtml2Canvas = typeof html2canvas !== 'undefined';
        const hasJsPDF = typeof window.jspdf !== 'undefined';
        
        if (!hasHtml2Canvas || !hasJsPDF) {
            console.warn('[ClientExport] Required libraries not available');
            return false;
        }

        // Check memory availability (rough estimate)
        if (performance.memory) {
            const usedMemoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            const limitMemoryMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
            const availableMemoryMB = limitMemoryMB - usedMemoryMB;
            
            // Estimate needed memory (very rough: 10MB per page)
            const estimatedNeededMB = pageCount * 10;
            
            if (estimatedNeededMB > availableMemoryMB * 0.5) {
                console.warn(`[ClientExport] Insufficient memory. Need ~${estimatedNeededMB}MB, available: ${availableMemoryMB}MB`);
                return false;
            }
        }

        // Generally suitable for comics up to 50 pages
        return pageCount <= 50;
    }

    /**
     * Get export size estimate
     */
    getExportEstimate() {
        const pageCount = this.comicCreator.pages.length;
        const imageCount = this.comicCreator.imageLibrary.getImages().length;
        
        // Rough estimates
        const estimatedSizeMB = (pageCount * 2) + (imageCount * 0.5);
        const estimatedTimeSeconds = pageCount * 3; // ~3 seconds per page
        
        return {
            pages: pageCount,
            images: imageCount,
            estimatedSizeMB: Math.round(estimatedSizeMB),
            estimatedTimeSeconds: Math.round(estimatedTimeSeconds),
            suitable: this.canExportClientSide()
        };
    }
}