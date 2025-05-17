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
                'Acme',
                'Holtwood One SC',
                'Creepster',
                'Bowlby One SC',
                'Bungee',
                'Freckle Face',
                'Ceviche One',
                'Finger Paint',
                'Kablammo',
                'Rubik Puddles',
                'Londrina Sketch',
                'Rock Salt'
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
                
                // Pre-load background image dimensions if it exists
                const backgroundImg = canvasElement.querySelector('.canvas-background-image');
                if (backgroundImg) {
                    try {
                        // Ensure the image dimensions are fully loaded before proceeding with html2canvas
                        await new Promise(resolve => {
                            if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
                                console.log(`Background image already loaded: ${backgroundImg.naturalWidth}x${backgroundImg.naturalHeight}`);
                                resolve();
                            } else {
                                backgroundImg.onload = () => {
                                    console.log(`Background image loaded: ${backgroundImg.naturalWidth}x${backgroundImg.naturalHeight}`);
                                    resolve();
                                };
                                backgroundImg.onerror = () => {
                                    console.error('Failed to load background image');
                                    resolve(); // Resolve anyway to continue export
                                };
                                // Trigger reload if needed
                                const currentSrc = backgroundImg.src;
                                backgroundImg.src = '';
                                backgroundImg.src = currentSrc;
                            }
                        });
                    } catch (imgError) {
                        console.warn('Error pre-loading background image:', imgError);
                    }
                }
                
                // Ensure all SVG tails are properly initialized before export
                this.prepareSvgTailsForExport(canvasElement);
                
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
                                // Ensure proper clone processing
                                onBeforeClone: (originalDocument) => {
                                    console.log('Preparing document for cloning');
                                    // Mark elements to track potential duplicates
                                    const bgImage = originalDocument.querySelector('.canvas-background-image');
                                    if (bgImage) {
                                        bgImage.setAttribute('data-export-id', 'background-image');
                                    }
                                    return originalDocument;
                                },
                                // Ensure background images render properly with object-fit
                                // This is critical for maintaining the aspect ratio without distortion
                                oncloneNode: (node) => {
                                    if (node.nodeType === 1) { // Element node
                                        const element = node;
                                        if (element.classList && element.classList.contains('canvas-background-image')) {
                                            // Force object-fit: none to prevent browser from applying its own scaling
                                            element.style.objectFit = 'none';
                                            element.setAttribute('data-processed-by', 'oncloneNode');
                                            return element;
                                        }
                                    }
                                    return node;
                                },
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
                                            
                                            // Process text content to maintain exact font sizing in the clone
                                            const textContent = el.querySelector('.text-content');
                                            if (textContent) {
                                                // Get all computed styles to preserve exactly as in preview
                                                const computedStyle = window.getComputedStyle(textContent);
                                                const exactFontSize = computedStyle.fontSize;
                                                
                                                // CRITICAL: Use EXACTLY the same line height as in preview - no adjustments
                                                const exactLineHeight = computedStyle.lineHeight;
                                                
                                                // Store in data attributes for debugging
                                                textContent.setAttribute('data-original-line-height', exactLineHeight);

                                                // Use important to ensure all styling is preserved exactly
                                                textContent.style.fontSize = `${exactFontSize} !important`;
                                                textContent.style.fontWeight = `${computedStyle.fontWeight} !important`;
                                                textContent.style.fontStyle = `${computedStyle.fontStyle} !important`;
                                                textContent.style.textDecoration = `${computedStyle.textDecoration} !important`;
                                                textContent.style.fontFamily = `${computedStyle.fontFamily} !important`;
                                                textContent.style.lineHeight = `${exactLineHeight} !important`;
                                                textContent.style.textTransform = `${computedStyle.textTransform} !important`;
                                                textContent.style.verticalAlign = 'baseline !important';
                                                
                                                // Store data attributes for debugging
                                                textContent.setAttribute('data-export-font-size', exactFontSize);
                                                textContent.setAttribute('data-export-font-weight', computedStyle.fontWeight);
                                                
                                                // No transforms
                                                textContent.style.transform = 'none';
                                                textContent.style.transformOrigin = 'initial';
                                            }
                                        }
                                    });
                                    
                                    // Fix background image objectFit to ensure it maintains correct cropping
                                    // First, check if multiple background images exist due to cloning issues
                                    const bgImages = clonedElement.querySelectorAll('.canvas-background-image');
                                    
                                    if (bgImages.length > 0) {
                                        console.log(`Found ${bgImages.length} background images in cloned document`);
                                        
                                        // Remove all but the first background image to prevent duplication
                                        if (bgImages.length > 1) {
                                            for (let i = 1; i < bgImages.length; i++) {
                                                if (bgImages[i].parentNode) {
                                                    bgImages[i].parentNode.removeChild(bgImages[i]);
                                                }
                                            }
                                            console.log(`Removed ${bgImages.length - 1} duplicate background images`);
                                        }
                                        
                                        // Now work with just the first image
                                        const bgImage = bgImages[0];
                                        
                                        // Get the original image's dimensions from the actual DOM
                                        const originalImage = document.querySelector('.canvas-background-image');
                                        
                                        // Get the natural dimensions of the image
                                        const imgNaturalWidth = originalImage?.naturalWidth || bgImage.naturalWidth || 1024;
                                        const imgNaturalHeight = originalImage?.naturalHeight || bgImage.naturalHeight || 1024;
                                        
                                        console.log(`Using background dimensions: ${imgNaturalWidth}x${imgNaturalHeight}`);
                                        
                                        const containerWidth = clonedElement.offsetWidth;
                                        const containerHeight = clonedElement.offsetHeight;
                                        
                                        // Calculate scale to fill container while maintaining aspect ratio
                                        const scaleX = containerWidth / imgNaturalWidth;
                                        const scaleY = containerHeight / imgNaturalHeight;
                                        const scale = Math.max(scaleX, scaleY);
                                        
                                        // Calculate dimensions at this scale
                                        const scaledWidth = imgNaturalWidth * scale;
                                        const scaledHeight = imgNaturalHeight * scale;
                                        
                                        // Calculate positioning to center the image
                                        const left = (containerWidth - scaledWidth) / 2;
                                        const top = (containerHeight - scaledHeight) / 2;
                                        
                                        // First clear all existing styling to prevent conflicts
                                        bgImage.removeAttribute('style');
                                        
                                        // Apply the calculated dimensions and position to create the "cover" effect
                                        Object.assign(bgImage.style, {
                                            position: 'absolute',
                                            left: left + 'px',
                                            top: top + 'px',
                                            width: scaledWidth + 'px',
                                            height: scaledHeight + 'px',
                                            objectFit: 'none', // Prevent browser from applying its own object-fit
                                            zIndex: '0'
                                        });
                                        
                                        // Add extra attributes to help with debugging
                                        bgImage.setAttribute('data-natural-width', imgNaturalWidth);
                                        bgImage.setAttribute('data-natural-height', imgNaturalHeight);
                                        bgImage.setAttribute('data-scaled-width', scaledWidth);
                                        bgImage.setAttribute('data-scaled-height', scaledHeight);
                                        
                                        console.log(`Applied manual crop for background: natural ${imgNaturalWidth}x${imgNaturalHeight}, scaled to ${scaledWidth}x${scaledHeight}`);
                                    }
                                    
                                                                            // COMPLETELY REVISED TEXT BUBBLE POSITIONING FOR PDF EXPORT
                                    console.log('Starting revised text bubble positioning for PDF export');
                                    
                                    // 1. First, capture positions in the original document
                                    const originalBubbles = document.querySelectorAll('.text-bubble');
                                    const originalCanvas = document.getElementById('comic-canvas');
                                    const originalCanvasRect = originalCanvas.getBoundingClientRect();
                                    const originalCanvasStyles = window.getComputedStyle(originalCanvas);
                                    
                                    // 2. Ensure all bubbles have unique IDs for consistent tracking
                                    originalBubbles.forEach((bubble, index) => {
                                        if (!bubble.id) {
                                            bubble.id = `text-bubble-${index}-${Date.now()}`;
                                        }
                                    });
                                    
                                    // 3. Create a map of element positions relative to their parent canvas
                                    //    We use getComputedStyle for exact rendered values rather than potentially
                                    //    stale inline style attributes
                                    const bubblePositionMap = {};
                                    
                                    console.log(`Original canvas: width=${originalCanvasRect.width}, height=${originalCanvasRect.height}`);
                                    
                                    originalBubbles.forEach(originalBubble => {
                                        // Get the bounding client rect relative to viewport
                                        const bubbleRect = originalBubble.getBoundingClientRect();
                                        const computedStyle = window.getComputedStyle(originalBubble);
                                        
                                        // Calculate position relative to canvas
                                        // Use offset values rather than getBoundingClientRect for more direct translation
                                        const bubbleOffset = {
                                            top: bubbleRect.top - originalCanvasRect.top,
                                            left: bubbleRect.left - originalCanvasRect.left,
                                            width: bubbleRect.width,
                                            height: bubbleRect.height
                                        };
                                        
                                        // Store complete position and style data
                                        bubblePositionMap[originalBubble.id] = {
                                            // Calculated offsets
                                            offset: bubbleOffset,
                                            // Raw values for diagnostics
                                            rect: {
                                                top: bubbleRect.top,
                                                left: bubbleRect.left,
                                                width: bubbleRect.width,
                                                height: bubbleRect.height
                                            },
                                            // Critical style properties
                                            style: {
                                                position: computedStyle.position,
                                                display: computedStyle.display,
                                                top: computedStyle.top,
                                                left: computedStyle.left,
                                                width: computedStyle.width,
                                                height: computedStyle.height,
                                                transform: computedStyle.transform,
                                                zIndex: computedStyle.zIndex,
                                                borderRadius: computedStyle.borderRadius,
                                                backgroundColor: computedStyle.backgroundColor
                                            }
                                        };
                                        
                                        console.log(`Mapped bubble ${originalBubble.id}: offset top=${bubbleOffset.top}, offset left=${bubbleOffset.left}`);
                                    });
                                    
                                    // 4. Process each bubble in the cloned document by applying precise positioning
                                    const clonedBubbles = clonedElement.querySelectorAll('.text-bubble');
                                    console.log(`Found ${clonedBubbles.length} text bubbles in cloned document`);
                                    
                                    // Get the cloned canvas dimensions for verification
                                    const clonedCanvasRect = clonedElement.getBoundingClientRect();
                                    console.log(`Cloned canvas: width=${clonedCanvasRect.width}, height=${clonedCanvasRect.height}`);
                                    
                                    Array.from(clonedBubbles).forEach(bubble => {
                                        const bubbleId = bubble.id;
                                        
                                        // Skip bubbles without IDs (shouldn't happen)
                                        if (!bubbleId) {
                                            console.warn('Found bubble without ID in cloned document');
                                            return;
                                        }
                                        
                                                                                    // Get the stored position data
                                        const positionData = bubblePositionMap[bubbleId];
                                        
                                        if (!positionData) {
                                            console.warn(`No position data found for bubble ${bubbleId}`);
                                            return;
                                        }
                                        
                                        // Apply absolute positioning with precise offsets from canvas top-left
                                        bubble.style.position = 'absolute';
                                        // CORRECTED: Use computedStyle top/left from the prepared original bubble
                                        bubble.style.top = positionData.style.top; 
                                        bubble.style.left = positionData.style.left;
                                        
                                        // CORRECTED: Use pre-transform width and height from computedStyle
                                        // (positionData.style contains computedStyle values of the original bubble)
                                        if (positionData.style.width) {
                                            bubble.style.width = positionData.style.width;
                                        } else {
                                            // Fallback if not available, though it should be
                                            bubble.style.width = `${positionData.offset.width}px`;
                                        }
                                        if (positionData.style.height) {
                                            bubble.style.height = positionData.style.height;
                                        } else {
                                            // Fallback if not available
                                            bubble.style.height = `${positionData.offset.height}px`;
                                        }
                                        
                                        // Lock in additional critical styles
                                        bubble.style.margin = '0';
                                        bubble.style.marginBottom = '0'; // Explicitly remove bottom margin
                                        bubble.style.paddingBottom = '0'; // Prevent bottom padding
                                        bubble.style.padding = positionData.style.padding || '0'; // Use computed padding
                                        bubble.style.zIndex = '100'; // Force high z-index to ensure visibility
                                        
                                        // Fix text content layout issues
                                        const textContent = bubble.querySelector('.text-content');
                                        if (textContent) {
                                            // Get exact computed styles from the original document
                                            const originalBubble = document.getElementById(bubbleId);
                                            if (originalBubble) {
                                                const originalTextContent = originalBubble.querySelector('.text-content');
                                                if (originalTextContent) {
                                                    const originalComputedStyle = window.getComputedStyle(originalTextContent);
                                                    
                                                    // CRITICAL: Preserve exact line height from the original
                                                    const exactLineHeight = originalComputedStyle.lineHeight;
                                                    const lineHeightValue = exactLineHeight === 'normal' ? '1.2' : exactLineHeight;
                                                    
                                                    // Apply exact styling
                                                    textContent.style.lineHeight = lineHeightValue;
                                                    textContent.setAttribute('data-original-line-height', exactLineHeight);
                                                }
                                            }
                                            
                                            // Remove any properties that could cause spacing issues
                                            textContent.style.transform = 'none'; // Remove transforms that add space
                                            textContent.style.paddingBottom = '0'; // Remove bottom padding
                                            textContent.style.marginBottom = '0';  // Remove bottom margin
                                            textContent.style.verticalAlign = 'baseline'; // Ensure consistent baseline
                                        }
                                        
                                        // CORRECTED: Apply transform, removing translational components
                                        // if style.top/left already account for them (which they do here).
                                        const originalTransform = positionData.style.transform;
                                        if (originalTransform && originalTransform !== 'none') {
                                            let transformToApply = originalTransform;
                                            // If the original transform included a translation, we only want to apply
                                            // the rotation/scale part here, because translation is in style.top/left.
                                            // This assumes top/left from positionData.style are the final ones.
                                            if (originalTransform.includes('translate')) {
                                                const rotationMatch = originalTransform.match(/rotate\(([-\d.]+)deg\)/);
                                                if (rotationMatch) {
                                                    transformToApply = `rotate(${rotationMatch[1]}deg)`;
                                                } else {
                                                    transformToApply = '';
                                                }
                                            }
                                            bubble.style.transform = transformToApply;
                                        } else {
                                            bubble.style.transform = '';
                                        }
                                        
                                        if (bubble.classList.contains('thought-bubble')) {
                                            bubble.style.borderRadius = positionData.style.borderRadius || '15px';
                                        }
                                        
                                        // Add diagnostic data attributes
                                        bubble.dataset.exportInfo = JSON.stringify({
                                            id: bubbleId,
                                            top: positionData.offset.top,
                                            left: positionData.offset.left,
                                            originalTop: positionData.rect.top,
                                            originalLeft: positionData.rect.left
                                        });
                                        
                                        console.log(`Positioned bubble ${bubbleId} at top=${positionData.offset.top}px, left=${positionData.offset.left}px`);
                                    });
                                    
                                    // Process text bubble SVG tails
                                    Array.from(clonedElement.querySelectorAll('.text-bubble')).forEach(bubble => {
                                        
                                        // First, check for SVG tails and process them
                                        const svgTails = bubble.querySelectorAll('.bubble-tail-svg');
                                        
                                        // Handle cases where no SVG tail is found - create one based on CSS classes for compatibility
                                        if (svgTails.length === 0) {
                                            console.log(`No SVG tail found for bubble - checking CSS classes`);
                                            
                                            // Check if this bubble has CSS tail classes (older styling method)
                                            const tailPosition = this.detectTailPositionFromClasses(bubble);
                                            if (tailPosition) {
                                                console.log(`Creating fallback SVG tail for position: ${tailPosition}`);
                                                this.createFallbackSvgTail(bubble, tailPosition);
                                            }
                                        }
                                        
                                        // Now process all SVG tails (including any we just created)
                                        bubble.querySelectorAll('.bubble-tail-svg').forEach(svgTail => {
                                            console.log(`ExportManager: Processing SVG tail for PDF export`);
                                            
                                            // Make SVG fully visible and properly positioned
                                            svgTail.style.display = 'block';
                                            svgTail.style.visibility = 'visible';
                                            svgTail.style.opacity = '1';
                                            svgTail.style.position = 'absolute';
                                            svgTail.style.zIndex = '30'; // Very high z-index to ensure visibility
                                            
                                            // Ensure SVG has dimensions
                                            const bubbleRect = bubble.getBoundingClientRect();
                                            const width = svgTail.getAttribute('width') || Math.max(bubbleRect.width * 0.3, 30).toString();
                                            const height = svgTail.getAttribute('height') || Math.max(bubbleRect.height * 0.3, 30).toString();
                                            
                                            // Set explicit dimensions
                                            svgTail.setAttribute('width', width);
                                            svgTail.setAttribute('height', height);
                                            
                                            // CRITICAL: Set viewBox attribute which is essential for proper rendering
                                            svgTail.setAttribute('viewBox', `0 0 ${width} ${height}`);
                                            
                                            // Get bubble background color for fills
                                            const bubbleBgColor = bubble.style.backgroundColor || 
                                                                window.getComputedStyle(bubble).backgroundColor || 
                                                                'white';
                                            
                                            // Make all SVG elements visible with explicit attributes
                                            Array.from(svgTail.querySelectorAll('*')).forEach(el => {
                                                // Set explicit visibility
                                                if (el.style) {
                                                    el.style.opacity = '1';
                                                    el.style.visibility = 'visible';
                                                    el.style.display = 'inline';
                                                    el.style.pointerEvents = 'none';
                                                }
                                                
                                                // For path elements
                                                if (el.tagName.toLowerCase() === 'path') {
                                                    // Check if this is an outline path (has stroke)
                                                    if (el.hasAttribute('stroke') && el.getAttribute('stroke') !== 'none') {
                                                        el.setAttribute('stroke', '#000000');
                                                        el.setAttribute('stroke-width', '2');
                                                        el.setAttribute('stroke-opacity', '1');
                                                        el.setAttribute('stroke-linecap', 'round');
                                                        el.setAttribute('stroke-linejoin', 'round');
                                                    }
                                                    
                                                    // Handle fill color for path
                                                    if (el.hasAttribute('fill') && el.getAttribute('fill') !== 'none') {
                                                        el.setAttribute('fill', bubbleBgColor);
                                                        el.setAttribute('fill-opacity', '1');
                                                    }
                                                }
                                                
                                                // For circle elements in thought bubbles
                                                if (el.tagName.toLowerCase() === 'circle') {
                                                    el.setAttribute('fill', bubbleBgColor);
                                                    el.setAttribute('fill-opacity', '1');
                                                    el.setAttribute('stroke', '#000000');
                                                    el.setAttribute('stroke-width', '2');
                                                    el.setAttribute('stroke-opacity', '1');
                                                    // Ensure circle has radius
                                                    if (!el.hasAttribute('r') || parseFloat(el.getAttribute('r')) < 1) {
                                                        el.setAttribute('r', '5');
                                                    }
                                                }
                                            });
                                            
                                            // Recreate the tail as a fallback SVG element with everything inline
                                            const svgWrapper = document.createElement('div');
                                            svgWrapper.style.position = 'absolute';
                                            svgWrapper.style.top = svgTail.style.top;
                                            svgWrapper.style.left = svgTail.style.left;
                                            svgWrapper.style.width = width + 'px';
                                            svgWrapper.style.height = height + 'px';
                                            svgWrapper.style.zIndex = '40';
                                            
                                            // Use innerHTML to ensure all attributes are properly parsed
                                            svgWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" 
                                                width="${width}" height="${height}" 
                                                viewBox="0 0 ${width} ${height}" 
                                                style="position:absolute;z-index:40;display:block;visibility:visible;opacity:1;"
                                                class="bubble-tail-svg-backup">
                                                ${svgTail.innerHTML}
                                            </svg>`;
                                            
                                            // Add the backup element to the bubble
                                            bubble.appendChild(svgWrapper);
                                        });
                                        
                                        // Handle various bubble types to improve export appearance
                                        if (bubble.classList.contains('thought-bubble')) {
                                            // Add extra border radius to thought bubbles if needed
                                            const bubbleStyle = window.getComputedStyle(bubble);
                                            if (parseFloat(bubbleStyle.borderRadius) < 15) {
                                                bubble.style.borderRadius = '15px';
                                            }
                                        }
                                    });
                                    
                                    // Process stickers to ensure outlines are properly handled in the export
                                    Array.from(clonedElement.querySelectorAll('.canvas-sticker-image')).forEach(sticker => {
                                        // Handle sticker outlines for export
                                        const outlineEnabled = sticker.dataset.outlineEnabled === 'true';
                                        const rotationAngle = parseInt(sticker.dataset.rotationAngle || '0');
                                        
                                        // CRITICAL: Use original data attributes if they exist for exactly consistent position
                                        const exportTop = sticker.getAttribute('data-export-top');
                                        const exportLeft = sticker.getAttribute('data-export-left');
                                        
                                        // Use either the data attributes or getBoundingClientRect for positioning
                                        if (exportTop && exportLeft) {
                                            // Use the precisely preserved position from the data attributes
                                            sticker.style.position = 'absolute';
                                            sticker.style.top = `${exportTop}px`;
                                            sticker.style.left = `${exportLeft}px`;
                                            console.log(`Using data attributes for sticker: top=${exportTop}px, left=${exportLeft}px`);
                                        } else {
                                            // Fallback to calculating position relative to canvas
                                            const originalRect = sticker.getBoundingClientRect();
                                            const canvasRect = clonedElement.getBoundingClientRect();
                                            const relativeTop = originalRect.top - canvasRect.top;
                                            const relativeLeft = originalRect.left - canvasRect.left;
                                            
                                            sticker.style.position = 'absolute';
                                            sticker.style.top = `${relativeTop}px`;
                                            sticker.style.left = `${relativeLeft}px`;
                                            console.log(`Calculated sticker position: top=${relativeTop}px, left=${relativeLeft}px`);
                                        }
                                        
                                        // Get the original rect to set width and height
                                        const stickerRect = sticker.getBoundingClientRect();
                                        sticker.style.width = `${stickerRect.width}px`;
                                        sticker.style.height = `${stickerRect.height}px`;
                                        
                                        // Reset any properties that could cause position shifts
                                        sticker.style.margin = '0px';
                                        sticker.style.padding = '0px';
                                        sticker.style.boxSizing = 'border-box';
                                        sticker.style.translate = 'none';
                                        sticker.style.willChange = 'transform';
                                        sticker.style.webkitFontSmoothing = 'subpixel-antialiased';
                                        
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
            
            console.log('Successfully captured PDF pages with bubble tails:', pageImages.length);
            
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

    // Helper method to ensure SVG tails are properly prepared for export
    prepareSvgTailsForExport(rootElement) {
        if (!rootElement) return;
        
        // Find all bubble tails
        const textBubbles = rootElement.querySelectorAll('.text-bubble');
        console.log(`ExportManager.prepareSvgTailsForExport: Found ${textBubbles.length} text bubbles`);
        
        // Ensure all bubbles have IDs for consistent tracking
        textBubbles.forEach((bubble, index) => {
            if (!bubble.id) {
                bubble.id = `text-bubble-${index}-${Date.now()}`;
            }
        });
        
        // Get precise canvas position for reference
        const canvasRect = rootElement.getBoundingClientRect();
        console.log(`ExportManager: Canvas position: top=${canvasRect.top}, left=${canvasRect.left}`);
        
        // Process each bubble to ensure proper positioning and SVG rendering
        textBubbles.forEach(bubble => {
            // Use our helper method to ensure consistent positioning
            this.ensureConsistentBubblePositioning(bubble, canvasRect);
            
            const svgTail = bubble.querySelector('.bubble-tail-svg');
            if (svgTail) {
                console.log(`ExportManager.prepareSvgTailsForExport: Processing SVG tail for bubble ${bubble.id}`);
                
                // Force the SVG to be visible and properly positioned
                svgTail.style.display = 'block';
                svgTail.style.visibility = 'visible';
                svgTail.style.opacity = '1';
                svgTail.style.zIndex = '10'; // Ensure it's prominently on top
                
                // Get SVG dimensions, with fallbacks
                const width = svgTail.getAttribute('width') || '50';
                const height = svgTail.getAttribute('height') || '50';
                
                // Ensure SVG has proper dimensions - never allow 0 dimensions
                if (!svgTail.getAttribute('width') || svgTail.getAttribute('width') === '0') {
                    const bubbleRect = bubble.getBoundingClientRect();
                    const newWidth = Math.max(bubbleRect.width * 0.3, 50);
                    svgTail.setAttribute('width', newWidth.toString());
                }
                
                if (!svgTail.getAttribute('height') || svgTail.getAttribute('height') === '0') {
                    const bubbleRect = bubble.getBoundingClientRect();
                    const newHeight = Math.max(bubbleRect.height * 0.3, 50);
                    svgTail.setAttribute('height', newHeight.toString());
                }
                
                // CRITICAL: Set appropriate viewBox which is required for proper html2canvas rendering
                if (!svgTail.getAttribute('viewBox')) {
                    const viewBoxWidth = svgTail.getAttribute('width') || '50';
                    const viewBoxHeight = svgTail.getAttribute('height') || '50';
                    svgTail.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
                }
                
                // Apply appropriate styling to all SVG elements with explicit opacity values
                Array.from(svgTail.querySelectorAll('*')).forEach(el => {
                    if (el.tagName.toLowerCase() === 'path') {
                        if (el.hasAttribute('stroke')) {
                            el.setAttribute('stroke', '#000000');
                            el.setAttribute('stroke-width', '2');
                            el.setAttribute('stroke-opacity', '1');
                            el.setAttribute('stroke-linecap', 'round');
                            el.setAttribute('stroke-linejoin', 'round');
                        }
                        
                        // Get bubble background color
                        const bgColor = bubble.style.backgroundColor || 
                                       window.getComputedStyle(bubble).backgroundColor || 
                                       'white';
                        el.setAttribute('fill', bgColor);
                        el.setAttribute('fill-opacity', '1');
                    } else if (el.tagName.toLowerCase() === 'circle') {
                        const bgColor = bubble.style.backgroundColor || 
                                       window.getComputedStyle(bubble).backgroundColor || 
                                       'white';
                        el.setAttribute('fill', bgColor);
                        el.setAttribute('fill-opacity', '1');
                        el.setAttribute('stroke', '#000000');
                        el.setAttribute('stroke-width', '2');
                        el.setAttribute('stroke-opacity', '1');
                    }
                });
                
                // Create an additional SVG clone with inline style attributes for backup rendering
                // This addresses html2canvas compatibility issues with some SVG attributes
                const svgClone = svgTail.cloneNode(true);
                svgClone.classList.add('bubble-tail-svg-clone');
                svgClone.style.zIndex = '15'; // Even higher z-index for clone
                
                // Explicitly set all styles inline for the clone
                svgClone.style.position = 'absolute';
                svgClone.style.pointerEvents = 'none';
                svgClone.style.display = 'block';
                svgClone.style.visibility = 'visible';
                svgClone.style.opacity = '1';
                
                // Make sure position matches original
                svgClone.style.top = svgTail.style.top;
                svgClone.style.left = svgTail.style.left;
                
                // Add clone to bubble
                bubble.appendChild(svgClone);
            }
        });
    }

    // Helper method to process CSS variables for export (Original Code)
    processElementsForExport(rootElement) {
        if (!rootElement) return;
        
        // Process text bubbles to ensure CSS variables are properly applied
        const textBubbles = rootElement.querySelectorAll('.text-bubble');
        const originalStyles = [];
        
        textBubbles.forEach(bubble => {
            // Get the current position values
            const rect = bubble.getBoundingClientRect();
            // Get the computed style - already declared later
            
            // Store original style for restoration including position data
            originalStyles.push({
                element: bubble,
                backgroundColor: bubble.style.backgroundColor,
                color: bubble.style.color,
                fontFamily: bubble.style.fontFamily,
                fontSize: bubble.style.fontSize,
                border: bubble.style.border,
                boxShadow: bubble.style.boxShadow,
                // Position data
                position: bubble.style.position,
                top: bubble.style.top,
                left: bubble.style.left,
                width: bubble.style.width,
                height: bubble.style.height,
                margin: bubble.style.margin,
                // Store SVG tail information if present
                hasSvgTail: !!bubble.querySelector('.bubble-tail-svg'),
                // Also store absolute coordinates for reference
                boundingRect: {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                }
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
            
            // Process SVG tail for export if it exists
            const svgTail = bubble.querySelector('.bubble-tail-svg');
            if (svgTail) {
                console.log(`ExportManager: Processing SVG tail for bubble ${bubble.id}`);
                
                // Ensure the SVG tail is visible during export
                svgTail.style.display = 'block';
                svgTail.style.visibility = 'visible';
                svgTail.style.opacity = '1';
                svgTail.style.zIndex = '1'; // Make sure it's on top of the bubble
                
                // If SVG has width/height of 0, fix it
                if (!svgTail.getAttribute('width') || svgTail.getAttribute('width') === '0') {
                    svgTail.setAttribute('width', '50');
                }
                if (!svgTail.getAttribute('height') || svgTail.getAttribute('height') === '0') {
                    svgTail.setAttribute('height', '50');
                }
                
                // Make sure SVG viewBox is set if not already
                if (!svgTail.getAttribute('viewBox')) {
                    svgTail.setAttribute('viewBox', '0 0 50 50');
                }
                
                // Fix SVG stroke color to match bubble border if needed
                const svgPaths = svgTail.querySelectorAll('path');
                if (svgPaths.length > 0) {
                    svgPaths.forEach(path => {
                        // Apply solid black strokes for visibility
                        if (path.hasAttribute('stroke')) {
                            path.setAttribute('stroke', '#000000');
                            path.setAttribute('stroke-width', '2px');
                        }
                        
                        // Match the fill to the bubble background
                        if (!path.hasAttribute('stroke') || path.getAttribute('stroke') === 'none') {
                            path.setAttribute('fill', bubble.style.backgroundColor || 'white');
                        }
                    });
                }
                
                // For thought bubbles, ensure all circles have correct fill
                const circles = svgTail.querySelectorAll('circle');
                if (circles.length > 0) {
                    circles.forEach(circle => {
                        circle.setAttribute('fill', bubble.style.backgroundColor || 'white');
                        circle.setAttribute('stroke', '#000000');
                        circle.setAttribute('stroke-width', '2px');
                    });
                }
            }
        } else {
            // For no-bubble elements, explicitly ensure transparent background and no border
            bubble.style.backgroundColor = 'transparent';
            bubble.style.border = 'none';
            bubble.style.boxShadow = 'none';
            
            // Hide SVG tail for no-bubble text elements
            const svgTail = bubble.querySelector('.bubble-tail-svg');
            if (svgTail) {
                svgTail.style.display = 'none';
            }
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
                
                // APPLY EXACT FONT SIZE PRESERVATION - Call the preserveExactFontSize method
                this.preserveExactFontSize(textElement);
                
                // NO SCALING - preserve exact styling without any changes
                // Capture all computed styles to preserve them exactly
                const computedStyle = window.getComputedStyle(textElement);
                const originalFontSize = computedStyle.fontSize;
                
                // Apply ALL original styling properties with !important flag
                textElement.style.setProperty('font-size', originalFontSize, 'important');
                textElement.style.setProperty('font-weight', computedStyle.fontWeight, 'important');
                textElement.style.setProperty('font-style', computedStyle.fontStyle, 'important');
                textElement.style.setProperty('text-decoration', computedStyle.textDecoration, 'important');
                textElement.style.setProperty('font-family', computedStyle.fontFamily, 'important');
                
                // CRITICAL: Ensure EXACT same line spacing as preview
                const exactLineHeight = computedStyle.lineHeight;
                if (exactLineHeight) {
                    textElement.style.setProperty('line-height', exactLineHeight, 'important');
                    textElement.setAttribute('data-original-line-height', exactLineHeight);
                } else {
                    textElement.style.setProperty('line-height', 'normal', 'important');
                    textElement.setAttribute('data-original-line-height', 'normal');
                }
                
                textElement.style.setProperty('text-transform', computedStyle.textTransform, 'important');
                textElement.style.setProperty('word-spacing', computedStyle.wordSpacing, 'important');
                textElement.style.setProperty('letter-spacing', computedStyle.letterSpacing, 'important');
                textElement.style.setProperty('word-break', 'normal', 'important');
                
                // Store data for debugging
                textElement.setAttribute('data-original-font-size', originalFontSize);
                textElement.setAttribute('data-original-font-weight', computedStyle.fontWeight);
                
                // Do NOT resize bubble - keep original dimensions
                // This ensures layout remains consistent between preview and PDF
            }
        });
        
        // Process background image if present to ensure object-fit is maintained
        // Check for multiple background images (should not happen, but just in case)
        const backgroundImages = rootElement.querySelectorAll('.canvas-background-image');
        if (backgroundImages.length > 1) {
            console.log(`Warning: Found ${backgroundImages.length} background images, should only be 1`);
            // Keep only the first one
            for (let i = 1; i < backgroundImages.length; i++) {
                if (backgroundImages[i].parentNode) {
                    backgroundImages[i].parentNode.removeChild(backgroundImages[i]);
                }
            }
        }
        
        // Now work with just the first/only background image
        const backgroundImage = rootElement.querySelector('.canvas-background-image');
        if (backgroundImage) {
            // Store original style for restoration but include all properties
            const computedStyle = window.getComputedStyle(backgroundImage);
            const storedStyle = {
                element: backgroundImage,
                cssText: backgroundImage.style.cssText, // Store the entire CSS text
                allStyles: {} // We'll store all computed properties
            };
            
            // Store all relevant CSS properties for restoration
            for (let i = 0; i < computedStyle.length; i++) {
                const prop = computedStyle[i];
                storedStyle.allStyles[prop] = backgroundImage.style[prop];
            }
            
            originalStyles.push(storedStyle);
            
            // Important: We don't modify the backgroundImage style here anymore
            // That will be done in the onclone handler to ensure consistent manual positioning
            console.log('Stored original background image style for later restoration');
        }
        
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
                border: sticker.style.border,
                position: sticker.style.position,
                top: sticker.style.top,
                left: sticker.style.left,
                width: sticker.style.width, 
                height: sticker.style.height,
                transform: sticker.style.transform,
                transformOrigin: sticker.style.transformOrigin
            });
            
            // IMPORTANT: Capture and preserve original sticker position with sub-pixel precision
            const originalRect = sticker.getBoundingClientRect();
            const canvasRect = rootElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(sticker);
            
            // Get original computed position values without rounding
            const currentTop = parseFloat(computedStyle.top);
            const currentLeft = parseFloat(computedStyle.left);
            
            // CRITICAL: Use original style values instead of calculating them
            // This prevents any shifts that might occur during PDF generation
            
            // Apply exact absolute positioning with precise coordinates
            sticker.style.position = 'absolute';
            sticker.style.top = `${currentTop}px`;
            sticker.style.left = `${currentLeft}px`;
            sticker.style.width = `${originalRect.width}px`;
            sticker.style.height = `${originalRect.height}px`;
            
            // Set these as data attributes for debugging
            sticker.setAttribute('data-export-top', currentTop);
            sticker.setAttribute('data-export-left', currentLeft);
            
            // Reset any potential CSS that could cause shifting
            sticker.style.margin = '0px';
            sticker.style.padding = '0px';
            sticker.style.borderWidth = '0px';
            sticker.style.translate = 'none';
            sticker.style.boxSizing = 'border-box';
            
            // Preserve rotation settings
            const rotationAngle = parseInt(sticker.dataset.rotationAngle || '0');
            if (rotationAngle !== 0) {
                sticker.style.transformOrigin = 'center center';
            }
            
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
                
                // Check if we stored the full cssText
                if (item.cssText !== undefined) {
                    // Restore full original styling
                    element.style.cssText = item.cssText;
                    return; // Skip the individual property handling below
                }
                
                // Handle stored allStyles object
                if (item.allStyles) {
                    // Clear all current styles first
                    element.removeAttribute('style');
                    
                    // Restore all original styles
                    for (const prop in item.allStyles) {
                        if (item.allStyles[prop]) {
                            element.style[prop] = item.allStyles[prop];
                        }
                    }
                    return; // Skip the individual property handling below
                }
                
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
                
                // Restore position properties
                if (item.position) {
                    element.style.position = item.position;
                } else {
                    element.style.removeProperty('position');
                }
                
                if (item.top) {
                    element.style.top = item.top;
                } else {
                    element.style.removeProperty('top');
                }
                
                if (item.left) {
                    element.style.left = item.left;
                } else {
                    element.style.removeProperty('left');
                }
                
                if (item.width) {
                    element.style.width = item.width;
                } else {
                    element.style.removeProperty('width');
                }
                
                if (item.height) {
                    element.style.height = item.height;
                } else {
                    element.style.removeProperty('height');
                }
                
                if (item.margin) {
                    element.style.margin = item.margin;
                } else {
                    element.style.removeProperty('margin');
                }
                
                // Restore SVG tail display if it exists
                const svgTail = element.querySelector('.bubble-tail-svg');
                if (svgTail && item.hasSvgTail) {
                    console.log(`ExportManager: Restoring SVG tail for bubble ${element.id}`);
                    svgTail.style.display = 'block';
                    
                    // Restore SVG path colors
                    const svgPaths = svgTail.querySelectorAll('path');
                    if (svgPaths.length > 0) {
                        // The fill color needs to be tied to the bubble background
                        // Let the CSS handle this via variables
                        svgPaths.forEach(path => {
                            if (path.hasAttribute('fill')) {
                                path.removeAttribute('fill'); // Let CSS determine fill based on custom properties
                            }
                        });
                    }
                    
                    // Restore circle styling for thought bubbles
                    const circles = svgTail.querySelectorAll('circle');
                    if (circles.length > 0) {
                        circles.forEach(circle => {
                            circle.removeAttribute('fill'); // Let CSS determine fill
                            circle.removeAttribute('stroke-width');
                        });
                    }
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
                
                // Handle background image specific properties
                if (element.classList.contains('canvas-background-image')) {
                    ['position', 'top', 'left', 'width', 'height', 'objectFit', 'zIndex'].forEach(prop => {
                        if (item[prop]) {
                            element.style[prop] = item[prop];
                        } else {
                            element.style.removeProperty(prop);
                        }
                    });
                }
                
                // Also restore padding and box-sizing if they were modified
                if (element.classList.contains('canvas-sticker-image')) {
                    element.style.removeProperty('padding');
                    element.style.removeProperty('box-sizing');
                }
            });
        };
    }

    // Helper to detect tail position from CSS classes on bubble
    detectTailPositionFromClasses(bubble) {
        const classNames = bubble.className.split(' ');
        
        // Check for speech bubble tail classes
        if (classNames.includes('speech-tail-bottom-left')) return 'bottom-left';
        if (classNames.includes('speech-tail-bottom-center')) return 'bottom';
        if (classNames.includes('speech-tail-bottom-right')) return 'bottom-right';
        if (classNames.includes('speech-tail-left-center')) return 'left';
        if (classNames.includes('speech-tail-right-center')) return 'right';
        if (classNames.includes('speech-tail-top-left')) return 'top-left';
        if (classNames.includes('speech-tail-top-center')) return 'top';
        if (classNames.includes('speech-tail-top-right')) return 'top-right';
        
        // Check for thought bubble tail classes
        if (classNames.includes('thought-tail-bottom-left')) return 'bottom-left';
        if (classNames.includes('thought-tail-bottom-center')) return 'bottom';
        if (classNames.includes('thought-tail-bottom-right')) return 'bottom-right';
        if (classNames.includes('thought-tail-left-center')) return 'left';
        if (classNames.includes('thought-tail-right-center')) return 'right';
        if (classNames.includes('thought-tail-top-left')) return 'top-left';
        if (classNames.includes('thought-tail-top-center')) return 'top';
        if (classNames.includes('thought-tail-top-right')) return 'top-right';
        
        return null; // No tail position classes found
    }
    
    // Create a fallback SVG tail for bubbles that don't have one
    createFallbackSvgTail(bubble, position) {
        const isThoughtBubble = bubble.classList.contains('thought-bubble');
        const bubbleBgColor = bubble.style.backgroundColor || 
                            window.getComputedStyle(bubble).backgroundColor || 
                            'white';
        
        if (isThoughtBubble) {
            this.createFallbackThoughtTail(bubble, position, bubbleBgColor);
        } else {
            this.createFallbackSpeechTail(bubble, position, bubbleBgColor);
        }
    }
    
    // Create a fallback speech bubble tail SVG
    createFallbackSpeechTail(bubble, position, bubbleColor) {
        const bubbleRect = bubble.getBoundingClientRect();
        const tailWidth = 20;
        const tailLength = 15;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        
        svg.classList.add('bubble-tail-svg', 'fallback-tail');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '5';
        svg.style.display = 'block';
        svg.style.visibility = 'visible';
        svg.style.opacity = '1';
        
        // Configure dimensions and position
        let svgWidth, svgHeight, svgTop, svgLeft;
        let pathPoints = [];
        
        // Configure SVG dimensions and position based on tail position
        if (position.includes('bottom')) {
            svgWidth = tailWidth;
            svgHeight = tailLength;
            svgTop = '100%';
            
            if (position === 'bottom-left') {
                svgLeft = '10%';
            } else if (position === 'bottom-right') {
                svgLeft = '90%';
            } else {
                // bottom-center
                svgLeft = '50%';
            }
            
            // Adjust left position to center the tail
            svgLeft = `calc(${svgLeft} - ${tailWidth/2}px)`;
            
            // Define the path points for a bottom tail
            pathPoints = [
                [0, 0], // Left point on bubble edge
                [tailWidth, 0], // Right point on bubble edge
                [tailWidth/2, tailLength] // Tip of tail
            ];
        } else if (position.includes('top')) {
            svgWidth = tailWidth;
            svgHeight = tailLength;
            svgTop = `calc(0% - ${tailLength}px)`;
            
            if (position === 'top-left') {
                svgLeft = '10%';
            } else if (position === 'top-right') {
                svgLeft = '90%';
            } else {
                // top-center
                svgLeft = '50%';
            }
            
            // Adjust left position to center the tail
            svgLeft = `calc(${svgLeft} - ${tailWidth/2}px)`;
            
            // Define the path points for a top tail
            pathPoints = [
                [0, tailLength], // Left point on bubble edge
                [tailWidth, tailLength], // Right point on bubble edge
                [tailWidth/2, 0] // Tip of tail
            ];
        } else if (position === 'left') {
            svgWidth = tailLength;
            svgHeight = tailWidth;
            svgLeft = `calc(0% - ${tailLength}px)`;
            svgTop = '50%';
            
            // Adjust top position to center the tail
            svgTop = `calc(${svgTop} - ${tailWidth/2}px)`;
            
            // Define the path points for a left tail
            pathPoints = [
                [tailLength, 0], // Top point on bubble edge
                [tailLength, tailWidth], // Bottom point on bubble edge
                [0, tailWidth/2] // Tip of tail
            ];
        } else if (position === 'right') {
            svgWidth = tailLength;
            svgHeight = tailWidth;
            svgLeft = '100%';
            svgTop = '50%';
            
            // Adjust top position to center the tail
            svgTop = `calc(${svgTop} - ${tailWidth/2}px)`;
            
            // Define the path points for a right tail
            pathPoints = [
                [0, 0], // Top point on bubble edge
                [0, tailWidth], // Bottom point on bubble edge
                [tailLength, tailWidth/2] // Tip of tail
            ];
        }
        
        // Set SVG dimensions and position
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        svg.style.top = svgTop;
        svg.style.left = svgLeft;
        
        // Create the filled path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('fill', bubbleColor);
        path.setAttribute('fill-opacity', '1');
        
        // Build the SVG path string
        let d = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
            d += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }
        d += ' Z'; // Close the path
        path.setAttribute('d', d);
        
        // Add the path to the SVG
        svg.appendChild(path);
        
        // Add outline
        const outlinePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        outlinePath.setAttribute('fill', 'none');
        outlinePath.setAttribute('stroke', '#000000');
        outlinePath.setAttribute('stroke-width', '2');
        outlinePath.setAttribute('stroke-opacity', '1');
        
        // Build the outline path
        const outlineD = `M ${pathPoints[0][0]} ${pathPoints[0][1]} L ${pathPoints[2][0]} ${pathPoints[2][1]} L ${pathPoints[1][0]} ${pathPoints[1][1]}`;
        outlinePath.setAttribute('d', outlineD);
        svg.appendChild(outlinePath);
        
        // Add the SVG to the text box
        bubble.appendChild(svg);
        
        return svg;
    }
    
    // Create a fallback thought bubble tail SVG
    createFallbackThoughtTail(bubble, position, bubbleColor) {
        const bubbleRect = bubble.getBoundingClientRect();
        const numCircles = 3;
        const maxRadius = 5;
        const spacing = 5;
        const padding = 5;
        
        // Create SVG element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('bubble-tail-svg', 'fallback-tail');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '5';
        svg.style.display = 'block';
        svg.style.visibility = 'visible';
        svg.style.opacity = '1';
        
        // The orientation determines which dimension gets the spacing
        const isHorizontal = position === 'left' || position === 'right';
        
        // Calculate dimensions for SVG
        const svgWidth = isHorizontal ? 
            spacing * numCircles + maxRadius * 2 + padding * 2 : 
            maxRadius * 2 + padding * 2;
            
        const svgHeight = isHorizontal ? 
            maxRadius * 2 + padding * 2 : 
            spacing * numCircles + maxRadius * 2 + padding * 2;
        
        // Set SVG dimensions
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        
        // Position the SVG based on the position parameter
        let svgTop, svgLeft;
        
        if (position.includes('bottom')) {
            svgTop = '100%';
            
            if (position === 'bottom-left') {
                svgLeft = '10%';
            } else if (position === 'bottom-right') {
                svgLeft = '90%';
            } else {
                // bottom-center
                svgLeft = '50%';
            }
            
            svgLeft = `calc(${svgLeft} - ${svgWidth/2}px)`;
        } else if (position.includes('top')) {
            svgTop = `calc(0% - ${svgHeight}px)`;
            
            if (position === 'top-left') {
                svgLeft = '10%';
            } else if (position === 'top-right') {
                svgLeft = '90%';
            } else {
                // top-center
                svgLeft = '50%';
            }
            
            svgLeft = `calc(${svgLeft} - ${svgWidth/2}px)`;
        } else if (position === 'left') {
            svgLeft = `calc(0% - ${svgWidth}px)`;
            svgTop = '50%';
            svgTop = `calc(${svgTop} - ${svgHeight/2}px)`;
        } else if (position === 'right') {
            svgLeft = '100%';
            svgTop = '50%';
            svgTop = `calc(${svgTop} - ${svgHeight/2}px)`;
        }
        
        svg.style.top = svgTop;
        svg.style.left = svgLeft;
        
        // Calculate starting positions with padding
        const startX = isHorizontal ? padding : svgWidth / 2;
        const startY = isHorizontal ? svgHeight / 2 : padding;

        // Create circles for the thought bubble tail
        for (let i = 0; i < numCircles; i++) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            
            // Calculate radius - circles get smaller as they move away from the bubble
            const radius = maxRadius * (1 - (i / numCircles) * 0.5);
            
            // Calculate position based on orientation and circle index
            let cx, cy;
            
            if (position.includes('bottom')) {
                cx = startX;
                cy = startY + i * spacing;
            } else if (position.includes('top')) {
                cx = startX;
                cy = svgHeight - (padding + i * spacing);
            } else if (position === 'left') {
                cx = svgWidth - (padding + i * spacing);
                cy = startY;
            } else if (position === 'right') {
                cx = padding + i * spacing;
                cy = startY;
            }
            
            // Set attributes for the circle
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', bubbleColor);
            circle.setAttribute('fill-opacity', '1');
            
            // Add 2px black outline to each circle
            circle.setAttribute('stroke', '#000000');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('stroke-opacity', '1');
            
            // Add circle to SVG
            svg.appendChild(circle);
        }
        
        // Add the SVG to the bubble
        bubble.appendChild(svg);
        
        return svg;
    }

    // Enhanced helper method to ensure consistent bubble positioning with SVG tails
    ensureConsistentBubblePositioning(bubble, canvasRect, originalPositions) {
        if (!bubble) {
            console.warn('ExportManager: Cannot position undefined bubble');
            return false;
        }
        
        // Make sure bubble has an ID for consistent tracking
        if (!bubble.id) {
            bubble.id = `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // First, capture the original bubble position before any modifications
        const originalRect = bubble.getBoundingClientRect();
        
        // If we have pre-mapped positions (sent in from onclone handler), use those
        if (originalPositions && bubble.id && originalPositions[bubble.id]) {
            const originalPos = originalPositions[bubble.id];
            
            // Apply the precise coordinates from original data
            bubble.style.position = 'absolute';
            bubble.style.top = `${originalPos.offset.top}px`;
            bubble.style.left = `${originalPos.offset.left}px`;
            bubble.style.width = `${originalPos.offset.width}px`;
            bubble.style.height = `${originalPos.offset.height}px`;
            bubble.style.margin = '0';
            bubble.style.marginBottom = '0';
            bubble.style.marginTop = '0';
            bubble.style.padding = originalPos.style.padding || '0';
            bubble.style.paddingBottom = '0';
            
            // Fix the text content to prevent extra space at bottom
            const textContent = bubble.querySelector('.text-content');
            if (textContent) {
                // Capture original computed styles to preserve exactly
                const computedStyle = window.getComputedStyle(textContent);
                
                // Capture and preserve the exact original padding
                const originalPadding = {
                    top: computedStyle.paddingTop,
                    right: computedStyle.paddingRight,
                    bottom: computedStyle.paddingBottom,
                    left: computedStyle.paddingLeft
                };
                
                // Apply exact padding from preview to ensure consistent spacing
                textContent.style.setProperty('padding-top', originalPadding.top, 'important');
                textContent.style.setProperty('padding-right', originalPadding.right, 'important');
                textContent.style.setProperty('padding-bottom', originalPadding.bottom, 'important');
                textContent.style.setProperty('padding-left', originalPadding.left, 'important');
                
                // Store original padding for debugging
                textContent.setAttribute('data-original-padding-top', originalPadding.top);
                
                // Zero out margins to prevent additional spacing
                textContent.style.marginBottom = '0';
                textContent.style.marginTop = '0';
                
                // Preserve the original line height from the style data
                if (originalPos.style && originalPos.style.lineHeight) {
                    textContent.style.lineHeight = originalPos.style.lineHeight;
                } else {
                    // Ensure we're preserving the line height that was applied
                    const computedLineHeight = computedStyle.lineHeight;
                    if (computedLineHeight && computedLineHeight !== 'normal') {
                        textContent.style.lineHeight = computedLineHeight;
                    }
                }
                
                // Set layout properties
                textContent.style.display = 'inline-block';
                textContent.style.overflow = 'hidden';
                textContent.style.height = originalPos.offset.height ? `${originalPos.offset.height - 4}px` : 'auto';
                textContent.style.boxSizing = 'border-box';
                textContent.style.whiteSpace = 'pre-wrap';
                textContent.style.textRendering = 'geometricPrecision';
                
                // IMPORTANT: Preserve font styling exactly to prevent size changes
                if (originalPos.style && originalPos.style.fontSize) {
                    textContent.style.fontSize = originalPos.style.fontSize;
                } else {
                    textContent.style.fontSize = computedStyle.fontSize;
                }
                
                // Preserve other font properties exactly
                textContent.style.fontWeight = originalPos.style?.fontWeight || computedStyle.fontWeight;
                textContent.style.fontStyle = originalPos.style?.fontStyle || computedStyle.fontStyle;
                textContent.style.letterSpacing = originalPos.style?.letterSpacing || computedStyle.letterSpacing;
                textContent.style.wordSpacing = originalPos.style?.wordSpacing || computedStyle.wordSpacing;
                
                // Set transformation properties last to avoid conflicts
                textContent.style.transformOrigin = 'top left';
                // Only use scale(1) without any other transforms to preserve exact font rendering
                textContent.style.transform = 'scale(1)';
                textContent.style.maxHeight = 'none';
            }
            
            // Copy over critical style properties for consistent rendering
            bubble.style.zIndex = '100'; // Force high z-index for visibility
            
            if (originalPos.style.transform && originalPos.style.transform !== 'none') {
                bubble.style.transform = originalPos.style.transform;
            }
            
            if (bubble.classList.contains('thought-bubble')) {
                bubble.style.borderRadius = originalPos.style.borderRadius || '15px';
            }
            
            // Store position data for debugging
            bubble.dataset.exportSource = 'mapped';
            bubble.dataset.exportInfo = JSON.stringify({
                id: bubble.id,
                top: originalPos.offset.top,
                left: originalPos.offset.left
            });
            
            console.log(`Applied mapped position to bubble ${bubble.id}: top=${originalPos.offset.top}px, left=${originalPos.offset.left}px`);
            return true;
        }
        
        // Otherwise calculate positions directly
        try {
            // For canvas, if it's not provided, try to find it
            let canvasReference = canvasRect;
            if (!canvasReference) {
                const canvasElement = bubble.closest('#comic-canvas') || document.getElementById('comic-canvas');
                if (canvasElement) {
                    canvasReference = canvasElement.getBoundingClientRect();
                } else {
                    console.warn('Could not find canvas reference for bubble positioning');
                    return false;
                }
            }
            
            // Get the exact position from computed style to prevent any rounding/shifting
            const computedStyle = window.getComputedStyle(bubble);
            const currentTop = parseFloat(computedStyle.top) || 0;
            const currentLeft = parseFloat(computedStyle.left) || 0;
            
            // Store the original position for debugging
            bubble.setAttribute('data-original-rect-top', originalRect.top - canvasReference.top);
            bubble.setAttribute('data-original-rect-left', originalRect.left - canvasReference.left);
            bubble.setAttribute('data-computed-top', currentTop);
            bubble.setAttribute('data-computed-left', currentLeft);
            
            // Force absolute positioning with the EXACT original coordinates
            bubble.style.position = 'absolute';
            bubble.style.top = `${currentTop}px`;
            bubble.style.left = `${currentLeft}px`;
            bubble.style.width = `${originalRect.width}px`;
            bubble.style.height = `${originalRect.height}px`;
            
            // Remove any spacing properties that could cause shifts
            bubble.style.margin = '0px';
            bubble.style.marginBottom = '0px';
            bubble.style.marginTop = '0px';
            bubble.style.padding = computedStyle.padding;
            bubble.style.paddingBottom = '0px';
            bubble.style.translate = 'none';
            bubble.style.boxSizing = 'border-box';
            bubble.style.zIndex = '100'; // Ensure it's on top
            
            // Fix the text content to prevent extra space at bottom
            const textContent = bubble.querySelector('.text-content');
            if (textContent) {
                // Capture original computed styles to preserve exactly
                const computedStyle = window.getComputedStyle(textContent);
                
                                // Capture and preserve the exact original padding
                const originalPadding = {
                    top: computedStyle.paddingTop,
                    right: computedStyle.paddingRight,
                    bottom: computedStyle.paddingBottom,
                    left: computedStyle.paddingLeft
                };
                
                // Apply exact padding from preview to ensure consistent spacing
                textContent.style.setProperty('padding-top', originalPadding.top, 'important');
                textContent.style.setProperty('padding-right', originalPadding.right, 'important');
                textContent.style.setProperty('padding-bottom', originalPadding.bottom, 'important');
                textContent.style.setProperty('padding-left', originalPadding.left, 'important');
                
                // Store original padding for debugging
                textContent.setAttribute('data-original-padding-top', originalPadding.top);
                
                // Zero out margins to prevent additional spacing
                textContent.style.marginBottom = '0';
                textContent.style.marginTop = '0';

                // CRITICAL: Preserve EXACT line height from preview
                const computedLineHeight = computedStyle.lineHeight;
                if (computedLineHeight) {
                    textContent.style.setProperty('line-height', computedLineHeight, 'important');
                    textContent.setAttribute('data-line-height-preserved', 'true');
                    textContent.setAttribute('data-original-line-height', computedLineHeight);
                } else {
                    textContent.style.setProperty('line-height', 'normal', 'important');
                }
                
                // Set layout properties
                textContent.style.display = 'inline-block';
                textContent.style.overflow = 'hidden';
                textContent.style.height = `${originalRect.height - 4}px`;
                textContent.style.boxSizing = 'border-box';
                textContent.style.whiteSpace = 'pre-wrap';
                textContent.style.textRendering = 'geometricPrecision';
                
                // IMPORTANT: Preserve font styling exactly to prevent size changes
                // Explicitly set font size to the computed value, no modification
                textContent.style.fontSize = computedStyle.fontSize;
                
                // CRITICAL: Capture and preserve exact line height
                const exactLineHeight = computedStyle.lineHeight;
                // Make sure we have a valid value for line height (not 'normal')
                const lineHeightValue = exactLineHeight === 'normal' ? '1.2' : exactLineHeight;
                textContent.style.lineHeight = lineHeightValue;
                textContent.setAttribute('data-original-line-height', exactLineHeight);
                textContent.setAttribute('data-export-line-height', lineHeightValue);
                
                // Preserve all font properties exactly
                textContent.style.fontWeight = computedStyle.fontWeight;
                textContent.style.fontStyle = computedStyle.fontStyle;
                textContent.style.letterSpacing = computedStyle.letterSpacing;
                textContent.style.wordSpacing = computedStyle.wordSpacing;
                textContent.style.verticalAlign = 'baseline';
                
                // Set transformation properties last to avoid conflicts
                textContent.style.transformOrigin = 'top left';
                // Only use scale(1) without any other transforms to preserve exact font rendering
                textContent.style.transform = 'scale(1)';
                textContent.style.maxHeight = 'none';
            }
            
            // Keep important style properties
            if (computedStyle.transform && computedStyle.transform !== 'none') {
                bubble.style.transform = computedStyle.transform;
            }
            
            // Always ensure thought bubbles have proper border radius
            if (bubble.classList.contains('thought-bubble')) {
                bubble.style.borderRadius = computedStyle.borderRadius;
                // Set minimum if not specified
                if (parseFloat(bubble.style.borderRadius) < 15) {
                    bubble.style.borderRadius = '15px';
                }
            }
            
            // Process any SVG tails associated with this bubble
            const svgTail = bubble.querySelector('.bubble-tail-svg');
            if (svgTail) {
                // Force the SVG to be visible and properly positioned
                svgTail.style.display = 'block';
                svgTail.style.visibility = 'visible';
                svgTail.style.opacity = '1';
                svgTail.style.zIndex = '101'; // Higher than the bubble
                
                // Ensure SVG has proper dimensions and viewBox
                const svgWidth = svgTail.getAttribute('width') || Math.max(originalRect.width * 0.3, 50).toString();
                const svgHeight = svgTail.getAttribute('height') || Math.max(originalRect.height * 0.3, 50).toString();
                
                svgTail.setAttribute('width', svgWidth);
                svgTail.setAttribute('height', svgHeight);
                svgTail.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
            }
            
            // Add data attributes for debugging
            bubble.dataset.exportSource = 'calculated';
            bubble.dataset.exportInfo = JSON.stringify({
                id: bubble.id,
                top: relativeTop,
                left: relativeLeft,
                width: originalRect.width,
                height: originalRect.height
            });
            
            console.log(`Calculated position for bubble ${bubble.id}: top=${relativeTop}px, left=${relativeLeft}px`);
            return true;
        } catch (error) {
            console.error(`Error positioning bubble:`, error);
            return false;
        }
    }

    // === Ensure exact font sizes are preserved during export ===
    // This method is called during PDF export to ensure font sizes are never reduced or changed
    preserveExactFontSize(textElement) {
        if (!textElement) return;
        
        // Get the computed style to capture the exact current font size
        const computedStyle = window.getComputedStyle(textElement);
        
        // Store the actual pixel value of the font size
        const exactFontSize = computedStyle.fontSize;
        console.log(`Preserving exact font size: ${exactFontSize} for ${textElement.innerText.substring(0, 20)}...`);
        
        // Force exact pixel size with !important flag to prevent any scaling or adjustment
        textElement.style.setProperty('font-size', exactFontSize, 'important');
        
        // Apply additional properties to prevent font size adjustment
        textElement.style.setProperty('-webkit-text-size-adjust', 'none', 'important');
        textElement.style.setProperty('text-size-adjust', 'none', 'important');
        
        // CRITICAL: Get exact line height - this is key to preserving spacing
        const exactLineHeight = computedStyle.lineHeight;
        
        // Preserve line height EXACTLY as in the preview
        if (exactLineHeight) {
            textElement.style.setProperty('line-height', exactLineHeight, 'important');
        } else {
            textElement.style.setProperty('line-height', 'normal', 'important');
        }
        
        // Preserve other text styling properties exactly
        textElement.style.setProperty('font-weight', computedStyle.fontWeight, 'important');
        textElement.style.setProperty('font-family', computedStyle.fontFamily, 'important');
        textElement.style.setProperty('font-style', computedStyle.fontStyle, 'important');
        textElement.style.setProperty('text-decoration', computedStyle.textDecoration, 'important');
        textElement.style.setProperty('text-transform', computedStyle.textTransform, 'important');
        textElement.style.setProperty('vertical-align', 'baseline', 'important');
        textElement.style.setProperty('word-spacing', computedStyle.wordSpacing, 'important');
        textElement.style.setProperty('word-break', 'normal', 'important');
        
        // Store the exact line height in a data attribute for debugging
        textElement.setAttribute('data-original-line-height', exactLineHeight);
        
        // NO SCALING - just preserve exact size
        textElement.style.setProperty('transform', 'none', 'important');
        textElement.style.setProperty('zoom', 'normal', 'important');
        
        // Add data attributes to mark this element as having its font size preserved
        textElement.setAttribute('data-font-size-preserved', 'true');
        textElement.setAttribute('data-original-font-size', exactFontSize);
        
        console.log(`Preserved exact font size: ${exactFontSize} for PDF export`);
    }
} 