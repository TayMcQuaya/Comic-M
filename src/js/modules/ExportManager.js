import { jsPDF } from 'jspdf'; // Assuming jsPDF is available via import
import html2canvas from 'html2canvas'; // Assuming html2canvas is available via import
// Assume FontFaceObserver is available globally or via import if needed

// This class handles the exporting of the comic to PDF format.
export class ExportManager {
    // Constructor accepts the main ComicCreator instance
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // Store reference to the main class
    }

    // Helper function to preload fonts for PDF export (Original Code)
    preloadFontsForExport() {
        return new Promise(async (resolve) => {
            // List of fonts to ensure are loaded
            const fontsToLoad = [
                'Arial',
                'Comic Sans MS', 
                'Times New Roman',
                'Impact',
                'Bangers',
                'Permanent Marker',
                'Luckiest Guy',
                'Boogaloo',
                'Acme'
            ];
            
            // Create the Font Face Observer promises
            if (typeof FontFaceObserver === 'undefined') {
                console.log('FontFaceObserver not available, skipping font preloading');
                resolve(); // Resolve immediately if FontFaceObserver is not available
                return;
            }
            
            try {
                const fontPromises = fontsToLoad.map(font => {
                    // Use FontFaceObserver as in the original code
                    // Make sure FontFaceObserver is loaded/available in the project
                    return new FontFaceObserver(font).load('BESbswy', 5000); // 5 second timeout
                });
                
                // Wait for all fonts with a timeout
                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
                
                // Race between all fonts loading and the timeout
                await Promise.race([
                    Promise.all(fontPromises),
                    timeoutPromise
                ]);
                
                console.log('Fonts preloaded for PDF export');
            } catch (error) {
                console.warn('Error preloading fonts, continuing anyway:', error);
            }
            
            resolve();
        });
    }

    // Downloads the comic as a PDF file (Original Code)
    async downloadComic() {
        // Show custom modal and wait for user input
        const filename = await this.comicCreator.promptForFilename("My Comic", ".pdf"); // Use comicCreator instance
        if (!filename) {
            console.log("PDF generation cancelled by user.");
            return; // Exit if user cancelled or entered nothing
        }

        // Filename already validated and sanitized in promptForFilename

        // Save the current page state before generating the PDF
        this.comicCreator.saveCurrentPageState(); // Use comicCreator instance
        
        console.log('Starting PDF generation for all pages...');

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        document.body.appendChild(loadingIndicator);

        // Store current UI state and page index
        const originalPageIndex = this.comicCreator.currentPageIndex; // Use comicCreator instance
        console.log(`Current page index before export: ${originalPageIndex}`);
        
        const selectedPanel = document.querySelector('.comic-panel.selected');
        const selectedTextBoxes = document.querySelectorAll('.text-bubble.selected-text');
        
        // Temporarily hide UI elements for the export
        if (selectedPanel) {
            selectedPanel.classList.remove('selected');
        }
        
        selectedTextBoxes.forEach(textBox => {
            textBox.classList.remove('selected-text');
        });

        try {
            // Try to preload fonts for better PDF export
            await this.preloadFontsForExport();
            
            // Check if html2canvas is available
            if (typeof html2canvas === 'undefined') {
                // Attempt to dynamically load html2canvas if not available
                console.log('html2canvas not found, attempting to load it dynamically');
                
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load html2canvas'));
                    document.head.appendChild(script);
                });
                
                // Double check after loading
                if (typeof html2canvas === 'undefined') {
                    throw new Error('Could not load html2canvas library');
                }
            }
            
            // Create a new array to store page images
            const pageImages = [];
            
            // Process each page one by one
            for (let index = 0; index < this.comicCreator.pages.length; index++) { // Use comicCreator instance
                // Update loading message
                loadingIndicator.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Capturing page ${index + 1} of ${this.comicCreator.pages.length}...`; // Use comicCreator instance
                
                // Navigate to the page - this will load the page with its own state
                await this.comicCreator.navigateToPage(index, true); // Use comicCreator instance and await
                
                console.log(`Capturing page ${index + 1}`);
                
                // Allow more time for the page to render completely
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Get the comic canvas
                const canvasElement = document.getElementById('comic-canvas');
                if (!canvasElement) {
                    console.error(`Comic canvas element not found for page ${index + 1}`);
                    continue; // Skip this page but try the others
                }
                
                // Add export class to hide UI elements during capture
                canvasElement.classList.add('exporting');
                
                // Hide any selected elements on this page
                canvasElement.querySelectorAll('.comic-panel.selected').forEach(panel => {
                    panel.classList.remove('selected');
                });
                
                canvasElement.querySelectorAll('.text-bubble.selected-text').forEach(textBox => {
                    textBox.classList.remove('selected-text');
                });
                
                // Process elements for export and get restoration function
                const restoreStyles = this.processElementsForExport(canvasElement);
                
                // Use html2canvas with a more robust approach including retries
                try {
                    let h2c = null;
                    const maxRetries = 2;
                    
                    for (let attempt = 0; attempt <= maxRetries; attempt++) {
                        try {
                            h2c = await html2canvas(canvasElement, {
                                allowTaint: true,
                                useCORS: true,
                                scale: 2, // Higher quality
                                backgroundColor: null,
                                logging: attempt > 0, // Enable logging on retry attempts
                                foreignObjectRendering: false, // Try disabling for better compatibility
                                removeContainer: true,
                                // Add options to improve border rendering quality
                                width: canvasElement.offsetWidth, 
                                height: canvasElement.offsetHeight,
                                x: 0,
                                y: 0,
                                imageTimeout: 0,
                                ignoreElements: (element) => {
                                    // Ignore any helper elements that shouldn't be in the export
                                    return element.classList && 
                                           (element.classList.contains('resize-handle') || 
                                            element.classList.contains('drag-handle') ||
                                            element.classList.contains('format-text-btn') ||
                                            element.classList.contains('delete-text-btn'));
                                },
                                onclone: (clonedDoc, clonedElement) => {
                                    // Additional processing on the cloned document if needed
                                    console.log(`Cloned document for page ${index + 1}`);
                                    
                                    // Look specifically for elements with thin borders and fix them
                                    Array.from(clonedElement.querySelectorAll('.comic-panel, .text-bubble')).forEach(el => {
                                        // Ensure element has computed border
                                        const computedStyle = window.getComputedStyle(el);
                                        if (el.classList.contains('comic-panel')) {
                                            el.style.border = '3px solid #000';
                                        } else if (el.classList.contains('text-bubble')) {
                                            el.style.border = '2px solid #000';
                                        }
                                    });
                                    
                                    // Process stickers to ensure outlines are properly handled in the export
                                    Array.from(clonedElement.querySelectorAll('.canvas-sticker-image')).forEach(sticker => {
                                        // Handle sticker outlines for export
                                        const outlineEnabled = sticker.dataset.outlineEnabled === 'true';
                                        const rotationAngle = parseInt(sticker.dataset.rotationAngle || '0');
                                        
                                        // Ensure proper rotation handling
                                        if (rotationAngle !== 0) {
                                            // Set transform-origin to center for proper rotation behavior
                                            sticker.style.transformOrigin = 'center center';
                                        }
                                        
                                        if (outlineEnabled) {
                                            const outlineWidth = sticker.dataset.outlineWidth || '2';
                                            const outlineColor = sticker.dataset.outlineColor || '#000000';
                                            const outlineStyle = sticker.dataset.outlineStyle || 'solid';
                                            
                                            // FIXED: Instead of creating a wrapper div, directly apply border to the sticker
                                            // This ensures the outline stays with the image when transformations are applied
                                            sticker.style.border = `${outlineWidth}px ${outlineStyle} ${outlineColor}`;
                                            sticker.style.outline = 'none';
                                            sticker.style.boxSizing = 'border-box';
                                            
                                            // Remove selection styling for clean export
                                            sticker.classList.remove('selected-sticker');
                                        }
                                        else {
                                            // Remove selection styling during export
                                            sticker.classList.remove('selected-sticker');
                                            sticker.style.outline = 'none';
                                            sticker.style.border = 'none';
                                        }
                                    });
                                }
                            });
                            break; // Success, exit retry loop
                        } catch (retryError) {
                            console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed for page ${index + 1}:`, retryError);
                            
                            if (attempt === maxRetries) {
                                throw retryError; // Re-throw on final attempt
                            }
                            
                            // Wait before retrying
                            await new Promise(resolve => setTimeout(resolve, 300));
                        }
                    }
                    
                    if (h2c) {
                        // Store the page image with its index
                        pageImages.push({
                            canvas: h2c,
                            index: index
                        });
                    }
                } catch (captureError) {
                    console.error(`Error capturing page ${index + 1}:`, captureError);
                    this.comicCreator.uiManager.showNotification(`Error capturing page ${index + 1}. It might be missing from the PDF.`, 'error'); // Use UIManager
                } finally {
                    // Remove the export class
                    canvasElement.classList.remove('exporting');
                    
                    // Restore original styles
                    if (restoreStyles) {
                        restoreStyles();
                    }
                }
            }
            
            // Update loading message
            loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating PDF...';
            
            if (pageImages.length === 0) {
                console.error('Failed to generate any page images');
                // Use comicCreator notification method via UIManager
                this.comicCreator.uiManager.showNotification('Failed to generate the PDF. Please try again.', 'error'); 
                return;
            }
            
            // Sort by page index (in case async processing completed out of order)
            pageImages.sort((a, b) => a.index - b.index);
            
            // Create PDF
            // Note: jspdf might need to be accessed differently if not global
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [700, 700] // Maintain aspect ratio close to canvas (Original format)
            });

            // Add Title to the first page
            const titleText = filename.endsWith('.pdf') ? filename.slice(0, -4) : filename; // Remove .pdf for display
            pdf.setFontSize(20); // Use a reasonable font size for the title
            pdf.text(titleText, 350, 30, { align: 'center' }); // Add title text, centered, near the top
            
            // Add pages
            pageImages.forEach((result, i) => {
                // Add a new page for each page after the first
                if (i > 0) {
                    pdf.addPage();
                }
                
                // Add the image to the PDF
                pdf.addImage(
                    result.canvas.toDataURL('image/jpeg', 0.85),
                    'JPEG',
                    0,
                    0,
                    700,
                    700
                );
            });
            
            // Save the PDF
            pdf.save(filename); // Use the user-provided filename
            
            console.log('PDF generated successfully with', pageImages.length, 'pages');
            this.comicCreator.uiManager.showNotification('Comic PDF downloaded successfully!', 'success'); // Use UIManager
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Use comicCreator notification method via UIManager
            this.comicCreator.uiManager.showNotification('An error occurred while generating the PDF: ' + error.message, 'error'); 
        } finally {
            // Remove loading indicator
            loadingIndicator.remove();
            
            // Remove export class from any remaining
            document.querySelectorAll('.exporting').forEach(el => {
                el.classList.remove('exporting');
            });
            
            // Navigate back to the original page
            console.log(`Returning to original page: ${originalPageIndex}`);
            await this.comicCreator.navigateToPage(originalPageIndex, true); // Use comicCreator instance and await
            
            // Restore UI state
            if (selectedPanel) {
                selectedPanel.classList.add('selected');
            }
            
            selectedTextBoxes.forEach(textBox => {
                textBox.classList.add('selected-text');
            });
        }
    }

    // Helper method to process CSS variables for export (Original Code)
    processElementsForExport(rootElement) {
        if (!rootElement) return;
        
        // Process text bubbles to ensure CSS variables are properly applied
        const textBubbles = rootElement.querySelectorAll('.text-bubble');
        const originalStyles = [];
        
        textBubbles.forEach(bubble => {
            // Store original style for restoration
            originalStyles.push({
                element: bubble,
                backgroundColor: bubble.style.backgroundColor,
                color: bubble.style.color,
                fontFamily: bubble.style.fontFamily,
                fontSize: bubble.style.fontSize,
                border: bubble.style.border,
                boxShadow: bubble.style.boxShadow
            });
            
            // Get computed styles
            const computedStyle = window.getComputedStyle(bubble);
            
            // Check if this is a no-bubble text element
            const isNoBubble = bubble.classList.contains('no-bubble');
            
            if (!isNoBubble) {
                // Check for custom bubble background color from CSS variable
                const bubbleBgColor = bubble.style.getPropertyValue('--bubble-background-color') || 
                                      computedStyle.getPropertyValue('--bubble-background-color');
                
                if (bubbleBgColor && bubbleBgColor !== 'transparent') {
                    // Apply the custom bubble background color directly
                    bubble.style.backgroundColor = bubbleBgColor;
                } else {
                    // Fallback to computed background color
                    const bgColor = computedStyle.getPropertyValue('background-color');
                    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                        bubble.style.backgroundColor = bgColor;
                    } else {
                        bubble.style.backgroundColor = '#ffffff'; // Default to white
                    }
                }
                
                // Ensure regular bubbles have proper borders if not already set
                if (!bubble.style.border || bubble.style.border === 'none') {
                    bubble.style.border = '1px solid rgba(0, 0, 0, 0.7)';
                }
            } else {
                // For no-bubble elements, explicitly ensure transparent background and no border
                bubble.style.backgroundColor = 'transparent';
                bubble.style.border = 'none';
                bubble.style.boxShadow = 'none';
            }
            
            // Apply computed text color directly (for all bubble types)
            const textColor = computedStyle.getPropertyValue('color');
            if (textColor) {
                bubble.style.color = textColor;
            }
            
            // Apply computed font properties directly (for all bubble types)
            const fontFamily = computedStyle.getPropertyValue('font-family');
            const fontSize = computedStyle.getPropertyValue('font-size');
            if (fontFamily) bubble.style.fontFamily = fontFamily;
            if (fontSize) bubble.style.fontSize = fontSize;
            
            // Ensure text content is visible (for all bubble types)
            const textElement = bubble.querySelector('.text-content');
            if (textElement) {
                textElement.style.opacity = '1';
                textElement.style.visibility = 'visible';
            }
        });
        
        // Process stickers to ensure outlines are properly applied during export
        const stickers = rootElement.querySelectorAll('.canvas-sticker-image');
        stickers.forEach(sticker => {
            // Store original style for restoration
            originalStyles.push({
                element: sticker,
                outline: sticker.style.outline,
                outlineWidth: sticker.style.outlineWidth,
                outlineColor: sticker.style.outlineColor,
                outlineStyle: sticker.style.outlineStyle,
                outlineOffset: sticker.style.outlineOffset,
                border: sticker.style.border
            });
            
            // Check if outline is enabled for this sticker
            const outlineEnabled = sticker.dataset.outlineEnabled === 'true';
            if (outlineEnabled) {
                // Get outline properties from dataset
                const outlineWidth = sticker.dataset.outlineWidth || '2';
                const outlineColor = sticker.dataset.outlineColor || '#000000';
                const outlineStyle = sticker.dataset.outlineStyle || 'solid';
                
                // Use border instead of outline for better HTML2Canvas compatibility
                sticker.style.border = `${outlineWidth}px ${outlineStyle} ${outlineColor}`;
                
                // Use border-box to ensure border touches the image content
                sticker.style.boxSizing = 'border-box';
                sticker.style.padding = '0';
                
                // Make sure outline doesn't show during export (we're using border instead)
                sticker.style.outline = 'none';
            } else {
                // Make sure outline and border are removed if not enabled
                sticker.style.outline = 'none';
                sticker.style.border = 'none';
            }
            
            // Remove selection styling during export
            sticker.classList.remove('selected-sticker');
        });
        
        // Return function to restore original styles
        return function restoreOriginalStyles() {
            originalStyles.forEach(item => {
                const element = item.element;
                
                // Only restore properties that were originally set
                if (item.backgroundColor) {
                    element.style.backgroundColor = item.backgroundColor;
                } else {
                    element.style.removeProperty('background-color');
                }
                
                if (item.color) {
                    element.style.color = item.color;
                } else {
                    element.style.removeProperty('color');
                }
                
                if (item.fontFamily) {
                    element.style.fontFamily = item.fontFamily;
                } else {
                    element.style.removeProperty('font-family');
                }
                
                if (item.fontSize) {
                    element.style.fontSize = item.fontSize;
                } else {
                    element.style.removeProperty('font-size');
                }
                
                if (item.border) {
                    element.style.border = item.border;
                } else {
                    element.style.removeProperty('border');
                }
                
                if (item.boxShadow) {
                    element.style.boxShadow = item.boxShadow;
                } else {
                    element.style.removeProperty('box-shadow');
                }
                
                if (item.outline) {
                    element.style.outline = item.outline;
                } else {
                    element.style.removeProperty('outline');
                }
                
                if (item.outlineWidth) {
                    element.style.outlineWidth = item.outlineWidth;
                } else {
                    element.style.removeProperty('outline-width');
                }
                
                if (item.outlineColor) {
                    element.style.outlineColor = item.outlineColor;
                } else {
                    element.style.removeProperty('outline-color');
                }
                
                if (item.outlineStyle) {
                    element.style.outlineStyle = item.outlineStyle;
                } else {
                    element.style.removeProperty('outline-style');
                }
                
                if (item.outlineOffset) {
                    element.style.outlineOffset = item.outlineOffset;
                } else {
                    element.style.removeProperty('outline-offset');
                }
                
                // Also restore padding and box-sizing if they were modified
                if (element.classList.contains('canvas-sticker-image')) {
                    element.style.removeProperty('padding');
                    element.style.removeProperty('box-sizing');
                }
            });
        };
    }
} 