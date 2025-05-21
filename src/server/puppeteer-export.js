// This file will contain the Puppeteer logic for PDF export. 

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const { PDFDocument } = require('pdf-lib'); // Added for PDF merging

// Function to create a project state for a single page
function createSinglePageProjectState(fullProjectState, pageIndexToExport) {
    console.log(`[SinglePageState] Creating state for page index: ${pageIndexToExport}`);
    if (!fullProjectState || !fullProjectState.pages || pageIndexToExport < 0 || pageIndexToExport >= fullProjectState.pages.length) {
        console.error('[SinglePageState] Invalid input or page index out of bounds.');
        throw new Error('Invalid input for creating single page project state.');
    }

    const singlePageData = fullProjectState.pages[pageIndexToExport];
    const imagesForThisPage = [];
    const allImagesFromProject = fullProjectState.images || [];
    const usedImageIdsOnThisPage = new Set(); // Use a Set to store unique image IDs

    // console.log(`[SinglePageState] Page ${pageIndexToExport} data:`, JSON.stringify(singlePageData, null, 2).substring(0, 1000)); // Log first 1KB of page data
    // console.log(`[SinglePageState] Total images in project: ${allImagesFromProject.length}`);

    // Extract image IDs from panels on the current page
    if (singlePageData.panelStates && Array.isArray(singlePageData.panelStates)) {
        singlePageData.panelStates.forEach(panelState => {
            if (panelState.imageId) {
                usedImageIdsOnThisPage.add(String(panelState.imageId));
            }
        });
    }

    // Extract image ID from page background
    if (singlePageData.backgroundState && singlePageData.backgroundState.imageId) {
        usedImageIdsOnThisPage.add(String(singlePageData.backgroundState.imageId));
    }

    // Extract image IDs from stickers on the current page
    if (singlePageData.stickerStates && Array.isArray(singlePageData.stickerStates)) {
        singlePageData.stickerStates.forEach(stickerState => {
            if (stickerState.imageId) {
                usedImageIdsOnThisPage.add(String(stickerState.imageId));
            }
        });
    }

    console.log(`[SinglePageState] Page ${pageIndexToExport} uses image IDs:`, Array.from(usedImageIdsOnThisPage));

    // Populate imagesForThisPage with actual image objects from the project's image library
    usedImageIdsOnThisPage.forEach(imageId => {
        const foundImage = allImagesFromProject.find(img => String(img.id) === imageId);
        if (foundImage) {
            imagesForThisPage.push(foundImage);
        } else {
            console.warn(`[SinglePageState] Image ID ${imageId} used on page ${pageIndexToExport} but not found in project images library.`);
        }
    });

    // Retain all custom layouts, as they might be referenced by the page layout
    const customLayoutsToInclude = fullProjectState.customLayouts || [];

    const stateForSinglePage = {
        images: imagesForThisPage, // Only images used by this specific page
        customLayouts: customLayoutsToInclude, 
        // comicPanels global definition might not be needed if panel data is fully in pages[x].panelStates
        // However, if pages[x].layoutId refers to a layout in comicPanels that defines structure, it might be.
        // For now, let's assume ComicCreator._loadProjectFromState can reconstruct panels from page.panelStates and layout data.
        // We can add fullProjectState.comicPanels back if it proves necessary.
        pages: [singlePageData], // The current page being processed
        settings: fullProjectState.settings, // Global settings
        currentPageIndex: 0, // Since 'pages' array now has only one page
    };

    console.log(`[SinglePageState] Created state for page ${pageIndexToExport}. Images included: ${imagesForThisPage.length}. Original project images: ${allImagesFromProject.length}`);
    return stateForSinglePage;
}


async function capturePageAsImage(comicCreatorUrl, outputDirectory, projectState, outputPdfPath) { // Added outputPdfPath
  console.log(`[Puppeteer] Launching browser for output: ${outputPdfPath}`);
  // const browser = await puppeteer.launch({ // Previous launch options
  //   headless: false, 
  //   devtools: true,  
  //   args: [
  //     '--no-sandbox',
  //     '--disable-setuid-sandbox',
  //     '--disable-web-security', 
  //     '--font-render-hinting=none', 
  //     '--force-color-profile=srgb' 
  //   ],
  //   userDataDir: path.join(__dirname, '..', '..', 'puppeteer_cache') 
  // });
  
  // Simplified launch options for potentially more stability during chunked processing
  const browser = await puppeteer.launch({
    headless: "new", // Use the new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Often helps in CI/limited resource environments
      '--font-render-hinting=none',
      '--force-color-profile=srgb'
    ],
    // Consider removing userDataDir if it's causing EBUSY errors, or ensure unique dirs per browser instance
    // userDataDir: path.join(os.tmpdir(), `puppeteer_dev_chrome_profile_${Date.now()}`) // Example for unique dir
  });

  let page;

  try {
    page = await browser.newPage();
    
    // Set a global flag indicating Puppeteer environment BEFORE any page scripts run
    await page.evaluateOnNewDocument(() => {
      window.IS_PUPPETEER_EXPORT = true;
      console.log('[Puppeteer Pre-Script] window.IS_PUPPETEER_EXPORT set to true.');
    });
    
    // Set longer timeout for navigation and element waiting
    page.setDefaultTimeout(60000); // 60 seconds timeout
    
    // Set a consistent viewport size
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 2
    });

    // Enable request interception to ensure all resources load
    await page.setRequestInterception(true);
    page.on('request', request => {
      // Log all requested URLs (optional, can be noisy)
      // console.log(`[Puppeteer] Requesting: ${request.url()}`);
      
      request.continue().catch(err => console.error('[Puppeteer] Error continuing request:', err));
      
      if (request.failure()) {
        console.error(`[Puppeteer] Request failed: URL: ${request.url()}, Error: ${request.failure().errorText}`);
      }
    });

    // Log console messages from the page
    page.on('console', msg => console.log('[Page Console]', msg.text()));
    page.on('pageerror', err => console.error('[Page Error]', err));

    console.log(`[Puppeteer] Navigating to URL: ${comicCreatorUrl}`);
    
    const response = await page.goto(comicCreatorUrl, { 
      waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      timeout: 60000
    });

    if (!response.ok()) {
      throw new Error(`Failed to load page: ${response.status()} ${response.statusText()}`);
    }

    console.log(`[Puppeteer] Navigation complete. Waiting for comic canvas...`);

    // Wait for the comic canvas with extended timeout and visibility check
    try {
      console.log('[Puppeteer] Attempting simple waitForFunction for document.readyState...');
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 }); // Shorter timeout for this test
      console.log('[Puppeteer] document.readyState is complete.');

      console.log('[Puppeteer] Now attempting original waitForFunction for #comic-canvas...');
      await page.waitForFunction(() => {
        const canvas = document.querySelector('#comic-canvas');
        // Add more logging inside this function if it still fails
        if (!canvas) console.log('[Page Eval] #comic-canvas not found yet.');
        else if (window.getComputedStyle(canvas).display === 'none') console.log('[Page Eval] #comic-canvas found but display is none.');
        return canvas && window.getComputedStyle(canvas).display !== 'none';
      }, { timeout: 60000 });
      console.log('[Puppeteer] Successfully found #comic-canvas.');

    } catch (error) {
      console.error('[Puppeteer] Failed to find comic canvas. DOM state before error:');
      try {
        const domState = await page.evaluate(() => document.body.innerHTML);
        console.error(domState);
      } catch (evalError) {
        console.error('[Puppeteer] Could not even evaluate document.body.innerHTML after waitForFunction error:', evalError.message);
      }
      throw error;
    }

    // Inject CSS to ensure consistent rendering
    await page.addStyleTag({
      content: `
        #comic-canvas {
          transform: none !important;
          transition: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
        .text-bubble {
          transform-origin: center center !important;
          transition: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .canvas-sticker-image {
          transform-origin: center center !important;
          transition: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .comic-panel img {
          transition: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .canvas-background-image {
          transition: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      `
    });

    // STEP 1: Verify comicCreator and the method exist
    console.log('[Puppeteer] Verifying window.comicCreator and _loadProjectFromState method...');
    const comicCreatorCheck = await page.evaluate(() => {
      let attempts = 0;
      while (!window.comicCreator && attempts < 100) {
        // Not using await new Promise here as it might be too complex if page is unstable
        // Synchronous wait/check is fine within evaluate for this simple check.
        // For longer waits, use waitForFunction directly in Puppeteer's context.
        // This loop is primarily to catch if comicCreator is defined *slightly* later.
        console.log(`[Page Eval - Check] Attempt ${attempts + 1}: window.comicCreator is ${typeof window.comicCreator}`);
        // Basic synchronous delay, less reliable but avoids nested promises in a potentially unstable context
        const start = Date.now();
        while (Date.now() - start < 100) { /* do nothing */ }
        attempts++;
      }

      if (!window.comicCreator) {
        console.error('[Page Eval - Check] window.comicCreator not found after checks.');
        return { found: false, methodFound: false, error: 'window.comicCreator not found' };
      }
      console.log('[Page Eval - Check] window.comicCreator IS found.');
      if (typeof window.comicCreator._loadProjectFromState !== 'function') {
        console.error('[Page Eval - Check] window.comicCreator._loadProjectFromState is NOT a function. Type: ' + typeof window.comicCreator._loadProjectFromState);
        return { found: true, methodFound: false, error: '_loadProjectFromState is not a function' };
      }
      console.log('[Page Eval - Check] window.comicCreator._loadProjectFromState IS a function.');
      return { found: true, methodFound: true };
    });

    console.log('[Puppeteer] Comic creator check results:', comicCreatorCheck);

    if (!comicCreatorCheck || !comicCreatorCheck.found || !comicCreatorCheck.methodFound) {
      const errorMessage = comicCreatorCheck && comicCreatorCheck.error ? comicCreatorCheck.error : 'Comic creator or method not found.';
      console.error(`[Puppeteer] Failed comic creator sanity check: ${errorMessage}`);
      throw new Error(`Failed comic creator sanity check: ${errorMessage}`);
    }
    console.log('[Puppeteer] window.comicCreator and method _loadProjectFromState verified.');

    // Expose a function to the page that can return the projectState.
    // This avoids serializing the potentially huge projectState as a direct argument to page.evaluate.
    console.log('[Puppeteer] Exposing window.getPuppeteerProjectState function...');
    await page.exposeFunction('getPuppeteerProjectState', () => {
        console.log('[Puppeteer Node.js Context] getPuppeteerProjectState called from page. Returning JSON string...');
        try {
            const jsonString = JSON.stringify(projectState);
            console.log(`[Puppeteer Node.js Context] projectState stringified. Length: ${jsonString.length}`);
            return jsonString;
        } catch (stringifyError) {
            console.error('[Puppeteer Node.js Context] Error stringifying projectState:', stringifyError);
            return null; // Or throw, so the page knows something went wrong
        }
    });
    console.log('[Puppeteer] window.getPuppeteerProjectState exposed.');

    // STEP 2: Now attempt to load the project state
    console.log('[Puppeteer] Attempting to call _loadProjectFromState via page.evaluate, using exposed function for state...');
    const loadResult = await page.evaluate(async () => { // Renamed from loadSuccess
        console.log('[Page Eval - Load] Entered page.evaluate for _loadProjectFromState.');
        let stateFromNode;
        try {
            console.log('[Page Eval - Load] Calling window.getPuppeteerProjectState()...');
            const projectStateJSON = await window.getPuppeteerProjectState();
            console.log(`[Page Eval - Load] Received potential JSON string from getPuppeteerProjectState. Length: ${projectStateJSON ? projectStateJSON.length : 'null/undefined'}`);
            if (!projectStateJSON) {
                console.error('[Page Eval - Load] projectStateJSON is null or undefined after calling getPuppeteerProjectState.');
                return { success: false, error: 'Received null/undefined projectStateJSON from getPuppeteerProjectState' };
            }
            console.log('[Page Eval - Load] Parsing projectStateJSON...');
            stateFromNode = JSON.parse(projectStateJSON);
            console.log('[Page Eval - Load] projectStateJSON parsed successfully.');
        } catch (e) {
            console.error('[Page Eval - Load] Error calling getPuppeteerProjectState or parsing its result:', e);
            return { success: false, error: `Error getting/parsing state: ${e.message}` };
      }
      
        if (!window.comicCreator) {
            console.error('[Page Eval - Load] window.comicCreator not found.');
            return { success: false, error: 'window.comicCreator not found' };
        }
        if (typeof window.comicCreator._loadProjectFromState !== 'function') {
            console.error('[Page Eval - Load] window.comicCreator._loadProjectFromState is not a function.');
            return { success: false, error: 'window.comicCreator._loadProjectFromState not a function' };
        }

        try {
            console.log('[Page Eval - Load] Calling window.comicCreator._loadProjectFromState...');
            await window.comicCreator._loadProjectFromState(stateFromNode);
            console.log('[Page Eval - Load] _loadProjectFromState completed.');
            // Add a slight delay or a more robust check to ensure rendering is complete
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 sec for rendering
            return { success: true };
        } catch (e) {
            console.error('[Page Eval - Load] Error executing _loadProjectFromState:', e);
            return { success: false, error: `Error in _loadProjectFromState: ${e.message}` };
        }
    });

    // console.log('[Puppeteer] Load success status from page.evaluate:', loadSuccess); // old
    console.log('[Puppeteer] Load result from page.evaluate:', loadResult);


    // if (!loadSuccess || (typeof loadSuccess === 'object' && !loadSuccess.success)) { // old
    //     const errorMessage = typeof loadSuccess === 'object' && loadSuccess.error ? loadSuccess.error : 'Failed to load project state in Puppeteer page.';
    //     console.error(`[Puppeteer] Project loading failed: ${errorMessage}`);
    //     throw new Error(`Project loading failed in Puppeteer: ${errorMessage}`);
    // }
    if (!loadResult || !loadResult.success) {
        const errorMessage = loadResult && loadResult.error ? loadResult.error : 'Unknown error during project state loading in Puppeteer page.';
        console.error(`[Puppeteer] Project loading failed: ${errorMessage}`);
        // Try to get more details from the page if possible
        const pageError = await page.evaluate(() => {
          return window.comicCreator ? window.comicCreator.lastError : "No specific error found on comicCreator.";
        }).catch(e => `Could not get error from page: ${e.message}`);
        console.error(`[Puppeteer] Page-specific error detail: ${pageError}`);
        throw new Error(`Project loading failed in Puppeteer: ${errorMessage}. Page detail: ${pageError}`);
    }


    console.log('[Puppeteer] Project state loaded successfully. Waiting for any final rendering...');
    
    // console.log(`[Puppeteer] Waiting for element #page-0-panel-0 or #page-0-canvas-text-0...`);
    // await page.waitForFunction(() => {
    //     return document.querySelector('#page-0-panel-0') || document.querySelector('#page-0-canvas-text-0');
    // }, { timeout: 30000 });
    // console.log('[Puppeteer] At least one expected page element found.');
    
    // Instead of specific elements, let's wait for images to be loaded if that's a concern
    console.log('[Puppeteer] Waiting for images to load on the page (if any)...');
    await page.evaluate(async () => {
        const images = Array.from(document.images);
        const promises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.onload = resolve;
                img.onerror = () => resolve(); // Resolve on error too, don't block indefinitely
            });
        });
        await Promise.all(promises);
    }, { timeout: 60000 }); // Extended timeout for image loading
    console.log('[Puppeteer] All images on page considered loaded or timed out.');

    // Wait for a short fixed time after image loading to allow final rendering tweaks
    await new Promise(resolve => setTimeout(resolve, 1500)); // Adjust as needed
    console.log('[Puppeteer] Final rendering delay complete.');

    // Temporarily hide all elements except the comic canvas and its parents/ancestors
    // to ensure only the canvas is captured.
    await page.evaluate(() => {
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) return;

        // Function to apply style to an element and store its original style
        const setStyle = (element, styleProperty, value) => {
            if (!element.dataset.originalInlineStyle) {
                element.dataset.originalInlineStyle = element.getAttribute('style') || '';
            }
            element.style.setProperty(styleProperty, value, 'important');
        };

        // Hide all direct children of body initially
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(child => {
            // Check if the child is the canvas itself or contains the canvas
            if (child !== canvas && !child.contains(canvas)) {
                setStyle(child, 'display', 'none');
            } else {
                // If it's an ancestor or the canvas itself, ensure it's visible
                // and remove any transformations that might affect its position for capture
                let current = child;
                while (current && current !== document.body) {
                    setStyle(current, 'display', 'block'); // Or initial, or revert to original display
                    setStyle(current, 'transform', 'none');
                    setStyle(current, 'position', 'static'); // Temporarily make static if it helps isolate
                    if (current === canvas.parentElement) {
                         setStyle(current, 'position', 'relative'); // Ensure parent is relative for absolute children if any
                    }
                    current = current.parentElement;
                }
            }
        });
        // Ensure the canvas itself is correctly positioned and sized for capture
        setStyle(canvas, 'position', 'absolute'); 
        setStyle(canvas, 'top', '0px');
        setStyle(canvas, 'left', '0px');
        setStyle(canvas, 'margin', '0');
        setStyle(canvas, 'transform', 'none'); // Remove any transforms
        
        // Ensure body and html have no margin/padding that could offset the canvas
        setStyle(document.body, 'margin', '0');
        setStyle(document.body, 'padding', '0');
        setStyle(document.documentElement, 'margin', '0');
        setStyle(document.documentElement, 'padding', '0');
    });
    console.log('[Puppeteer] Temporarily hid non-canvas elements.');

    // Get the exact bounding box of the comic-canvas AFTER applying styles
      const boundingBox = await page.evaluate(() => {
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) return null;
        // Force a reflow to ensure styles are applied and dimensions are correct
        canvas.offsetHeight;
        const rect = canvas.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
            // Use explicit 700x700 as per user request, but ensure rect.width/height are logged
            width: 700, // Forcing to 700 as requested
            height: 700, // Forcing to 700 as requested
            actualWidth: Math.round(rect.width),
            actualHeight: Math.round(rect.height)
        };
      });

      if (!boundingBox) {
        console.error('[Puppeteer] Could not find #comic-canvas for bounding box after style changes.');
        // Attempt to restore styles before throwing error
        await page.evaluate(() => { /* ... style restoration logic ... */ });
        throw new Error('Could not find #comic-canvas for screenshot bounding box.');
      }
    console.log(`[Puppeteer] Canvas bounding box for PDF: x=${boundingBox.x}, y=${boundingBox.y}, width=${boundingBox.width}, height=${boundingBox.height}. Actual on-page w/h: ${boundingBox.actualWidth}x${boundingBox.actualHeight}`);

    // const tempImageDir = path.join(outputDirectory, 'temp_export_images'); // Not used for PDF
    // await fs.mkdir(tempImageDir, { recursive: true }); // Not used for PDF

    // console.log('[Puppeteer] Generating PDF for #comic-canvas...'); // Old log
    // await page.pdf({ // OLD METHOD
    //     path: outputPdfPath,
    //     // format: 'A4', // Remove format to use width/height
    //     printBackground: true,
    //     width: `${boundingBox.width}px`, // Use canvas width
    //     height: `${boundingBox.height}px`, // Use canvas height
    //     margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    //     scale: 1,
    //     clip: {
    //         x: boundingBox.x,
    //         y: boundingBox.y,
    //         width: boundingBox.width,
    //         height: boundingBox.height
    //     },
    //     timeout: 120000
    // });
    // console.log(`[Puppeteer] PDF for current page's canvas exported successfully to ${outputPdfPath}`); // Old log

    console.log('[Puppeteer] Taking screenshot of #comic-canvas...');
    const pngScreenshotBuffer = await page.screenshot({
        clip: {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
        },
        type: 'png',
        omitBackground: false // Set to false to include canvas background; true if it should be transparent and handled by PDF bg
    });
    console.log('[Puppeteer] Screenshot taken.');

    console.log('[Puppeteer] Creating PDF with embedded screenshot...');
    const pdfDoc = await PDFDocument.create();
    const pageOfPdf = pdfDoc.addPage([boundingBox.width, boundingBox.height]); // Page size from boundingBox
    
    const pngImage = await pdfDoc.embedPng(pngScreenshotBuffer);

    pageOfPdf.drawImage(pngImage, {
        x: 0,
        y: 0, // In pdf-lib, for a page of H, drawing at y=0 places it at the bottom. 
             // Since page height IS image height, y=0 works.
        width: boundingBox.width,
        height: boundingBox.height,
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPdfPath, pdfBytes);
    console.log(`[Puppeteer] PDF with screenshot for current page saved to ${outputPdfPath}`);


    // Restore visibility of hidden elements
    await page.evaluate(() => {
        const elementsWithOriginalStyle = document.querySelectorAll('[data-original-inline-style]');
        elementsWithOriginalStyle.forEach(el => {
            el.setAttribute('style', el.dataset.originalInlineStyle);
            el.removeAttribute('data-original-inline-style');
        });
        // Also restore body and html if modified directly and not via dataset
        document.body.style.margin = ''; 
        document.body.style.padding = ''; 
        document.documentElement.style.margin = '';
        document.documentElement.style.padding = '';

    });
    console.log('[Puppeteer] Restored non-canvas element visibility.');

    return outputPdfPath;

  } catch (error) {
    console.error('[Puppeteer] Error during export:', error);
    try {
      if (page && !page.isClosed()) {
      const errorScreenshot = await page.screenshot({ fullPage: true });
      const errorScreenshotPath = path.join(outputDirectory, 'error-screenshot.png');
      await fs.writeFile(errorScreenshotPath, errorScreenshot);
      console.log(`[Puppeteer] Error screenshot saved to: ${errorScreenshotPath}`);
      } else {
        console.log('[Puppeteer] Could not save error screenshot because page was closed or undefined.');
      }
    } catch (screenshotError) {
      console.error('[Puppeteer] Failed to save error screenshot:', screenshotError);
    }
    throw error;
  } finally {
    if (browser) {
      console.log('[Puppeteer] Closing browser...');
    await browser.close();
      console.log('[Puppeteer] Browser closed.');
  }
}
}

async function mergePdfs(pdfFilePaths, finalOutputPath) {
    console.log(`[PDFMerge] Starting to merge ${pdfFilePaths.length} PDF files into ${finalOutputPath}`);
    const mergedPdf = await PDFDocument.create();
    for (const filePath of pdfFilePaths) {
        try {
            console.log(`[PDFMerge] Reading PDF: ${filePath}`);
            const pdfBytes = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
                console.log(`[PDFMerge] Added page from ${filePath}`);
            });
        } catch (err) {
            console.error(`[PDFMerge] Error processing file ${filePath}:`, err);
            // Optionally, decide if one failed page should stop the whole process
        }
    }
    const mergedPdfBytes = await mergedPdf.save();
    await fs.writeFile(finalOutputPath, mergedPdfBytes);
    console.log(`[PDFMerge] Merged PDF saved successfully to ${finalOutputPath}`);
}


// Your Express router POST handler
// Make sure this is how your router is defined. If it's app.post, use that.
// Example: const router = express.Router();
// router.post('/api/export-pdf', async (req, res) => { ... });
// Or if it's directly on the app:
// app.post('/api/export-pdf', async (req, res) => { ... });
// For this example, I'll assume it's part of a router object passed to this module.

export default function(router, comicCreatorUrl, outputDirBase) { // New ES Module export

    router.post('/export-pdf', async (req, res) => { // Changed from '/api/export-pdf' to '/export-pdf'
        console.log('[Vite Server/PuppeteerModule] Received POST request for /export-pdf');
        const projectState = req.body;

        if (!projectState || !projectState.pages || projectState.pages.length === 0) {
            console.error('[Vite Server] Invalid or empty project state received.');
            return res.status(400).send('Invalid or empty project state.');
        }
        console.log(`[Vite Server] Parsed projectState from request body. Number of pages: ${projectState.pages.length}`);

        // Create a unique directory for this export job's temporary files
        const exportTimestamp = Date.now();
        const jobOutputDir = path.join(outputDirBase, `export_${exportTimestamp}`);
        const tempPdfDir = path.join(jobOutputDir, 'temp_pages');

        try {
            await fs.ensureDir(tempPdfDir); // Ensure temp directory for individual PDFs exists
            console.log(`[Vite Server] Temporary directory for PDF pages: ${tempPdfDir}`);
            
            const individualPdfPaths = [];
            const totalPages = projectState.pages.length;

            for (let i = 0; i < totalPages; i++) {
                console.log(`[Vite Server] Processing page ${i + 1} of ${totalPages}...`);
                const singlePageProjectState = createSinglePageProjectState(projectState, i);
                const tempPdfPath = path.join(tempPdfDir, `page_${i + 1}.pdf`);

                console.log(`[Vite Server] Calling capturePageAsImage for page ${i + 1}... Output: ${tempPdfPath}`);
                // Pass jobOutputDir as the base for capturePageAsImage, it might create subdirs like 'temp_export_images'
                await capturePageAsImage(comicCreatorUrl, jobOutputDir, singlePageProjectState, tempPdfPath);
                individualPdfPaths.push(tempPdfPath);
                console.log(`[Vite Server] Successfully captured page ${i + 1} to ${tempPdfPath}`);
            }

            console.log('[Vite Server] All pages processed. Starting PDF merge...');
            const finalPdfPath = path.join(jobOutputDir, 'comic_export_final.pdf');
            await mergePdfs(individualPdfPaths, finalPdfPath);
            console.log(`[Vite Server] Final PDF merged and saved to ${finalPdfPath}`);

            // Clean up temporary individual PDF files
            // await fs.remove(tempPdfDir); // Keep for debugging for now, or remove later
            // console.log(`[Vite Server] Cleaned up temporary PDF pages directory: ${tempPdfDir}`);
            
            // Send the final PDF
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="comic_export_${exportTimestamp}.pdf"`);
            const pdfFileStream = fs.createReadStream(finalPdfPath);
            pdfFileStream.pipe(res);

            pdfFileStream.on('end', async () => {
                console.log('[Vite Server] Final PDF sent to client.');
                // Optionally clean up the entire job directory after successful sending
                try {
                    await fs.remove(jobOutputDir);
                    console.log(`[Vite Server] Cleaned up job output directory: ${jobOutputDir}`);
                } catch (cleanupError) {
                    console.error(`[Vite Server] Error cleaning up job output directory ${jobOutputDir}:`, cleanupError);
                }
            });
            pdfFileStream.on('error', (err) => {
                console.error('[Vite Server] Error streaming final PDF to client:', err);
                // Don't try to send another response if headers already sent
                if (!res.headersSent) {
                    res.status(500).send('Error streaming PDF.');
                }
                // Consider cleanup here too, or mark for later cleanup
            });

        } catch (error) {
            console.error('[Vite Server] Error processing /export-pdf POST request:', error);
            // Attempt to clean up jobOutputDir on error as well
            try {
                if (await fs.pathExists(jobOutputDir)) {
                    await fs.remove(jobOutputDir);
                    console.log(`[Vite Server] Cleaned up job output directory due to error: ${jobOutputDir}`);
                }
            } catch (cleanupError) {
                console.error(`[Vite Server] Error cleaning up job output directory ${jobOutputDir} after main error:`, cleanupError);
            }
            
            if (!res.headersSent) {
                return res.status(500).send(`Error exporting PDF: ${error.message}`);
            }
        }
    });

    // You might have other routes or helper functions here
    // For example, a function to get Puppeteer browser options
    // function getPuppeteerLaunchOptions() { ... }
};
