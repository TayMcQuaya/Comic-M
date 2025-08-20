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
        
        console.log('[ClientExport] Starting client-side export with options:', options);

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
                
                // Wait for page to fully render
                await this.waitForPageRender();

                // Prepare elements for export
                this.preprocessForExport();

                // Capture canvas
                console.log(`[ClientExport] Capturing page ${i + 1}`);
                const canvas = await this.captureCanvas(quality);

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

            // Restore original page
            await this.comicCreator.loadPageState(originalPageIndex);
            
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
            this.isExporting = false;
            this.currentExportId = null;
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
     * Wait for page to fully render
     */
    async waitForPageRender() {
        // Wait for images to load
        const images = document.querySelectorAll('#comic-canvas img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', reject, { once: true });
                // Timeout after 5 seconds
                setTimeout(() => resolve(), 5000);
            });
        });

        await Promise.all(imagePromises);
        
        // Wait for text elements to be properly positioned
        const textElements = document.querySelectorAll('#comic-canvas .text-bubble');
        if (textElements.length > 0) {
            console.log(`[ClientExport] Waiting for ${textElements.length} text elements to position`);
            // Give text elements more time to render and position correctly
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            // Standard wait for other content
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Preprocess elements for accurate export
     */
    preprocessForExport() {
        // Add export class to body
        document.body.classList.add('exporting');

        // Process text bubbles - apply CSS variables as inline styles
        const textBubbles = document.querySelectorAll('#comic-canvas .text-bubble');
        console.log(`[ClientExportManager] Found ${textBubbles.length} text bubbles to preprocess for export`);
        textBubbles.forEach(bubble => {
            const computedStyle = window.getComputedStyle(bubble);
            
            // Store original values to restore later
            bubble.dataset.originalBg = bubble.style.backgroundColor;
            bubble.dataset.originalOpacity = bubble.style.opacity;
            
            // Apply CSS variable values as inline styles
            const bgColor = computedStyle.getPropertyValue('--bubble-background-color');
            const opacity = computedStyle.getPropertyValue('--bubble-opacity');
            
            if (bgColor) {
                bubble.style.backgroundColor = bgColor;
            }
            if (opacity) {
                bubble.style.opacity = opacity;
            }

            // Mark for export
            bubble.classList.add('exporting-direct-style');
        });

        // Process stickers - ensure outlines are visible
        const stickers = document.querySelectorAll('#comic-canvas .canvas-sticker-image');
        stickers.forEach(sticker => {
            if (sticker.style.outline) {
                // Store original outline
                sticker.dataset.originalOutline = sticker.style.outline;
                // Convert outline to border for better html2canvas support
                const outlineValue = sticker.style.outline;
                sticker.style.border = outlineValue;
                sticker.style.outline = 'none';
            }
        });

        // Check for background images
        const bgImages = document.querySelectorAll('#comic-canvas .canvas-background-image');
        console.log(`[ClientExportManager] Found ${bgImages.length} background images in canvas`);
        
        // Check for panel images
        const panelImages = document.querySelectorAll('#comic-canvas .comic-panel img');
        console.log(`[ClientExportManager] Found ${panelImages.length} panel images in canvas`);
        
        // Ensure canvas is visible and at correct size
        const canvas = document.getElementById('comic-canvas');
        if (canvas) {
            canvas.style.transform = 'none';
            canvas.style.transition = 'none';
        }
        
        // Reset viewport transform container (critical for proper positioning)
        const transformContainer = document.querySelector('.canvas-transform-container');
        if (transformContainer) {
            console.log('[ClientExportManager] Resetting transform container for export');
            transformContainer.style.transform = 'none';
            transformContainer.style.transition = 'none';
        }
    }

    /**
     * Clean up after export preprocessing
     */
    cleanupAfterExport() {
        // Remove export class
        document.body.classList.remove('exporting');

        // Restore text bubbles
        const textBubbles = document.querySelectorAll('#comic-canvas .text-bubble.exporting-direct-style');
        textBubbles.forEach(bubble => {
            if (bubble.dataset.originalBg !== undefined) {
                bubble.style.backgroundColor = bubble.dataset.originalBg;
                delete bubble.dataset.originalBg;
            }
            if (bubble.dataset.originalOpacity !== undefined) {
                bubble.style.opacity = bubble.dataset.originalOpacity;
                delete bubble.dataset.originalOpacity;
            }
            bubble.classList.remove('exporting-direct-style');
        });

        // Restore stickers
        const stickers = document.querySelectorAll('#comic-canvas .canvas-sticker-image');
        stickers.forEach(sticker => {
            if (sticker.dataset.originalOutline) {
                sticker.style.outline = sticker.dataset.originalOutline;
                sticker.style.border = '';
                delete sticker.dataset.originalOutline;
            }
        });
        
        // Restore transform container
        const transformContainer = document.querySelector('.canvas-transform-container');
        if (transformContainer) {
            console.log('[ClientExportManager] Restoring transform container after export');
            transformContainer.style.transform = '';
            transformContainer.style.transition = '';
        }
        
        // Restore canvas transform
        const canvas = document.getElementById('comic-canvas');
        if (canvas) {
            canvas.style.transform = '';
            canvas.style.transition = '';
        }
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