// This file will contain the Puppeteer logic for PDF export. 

import puppeteer from 'puppeteer';
import path from 'path';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import PDFDocument from 'pdfkit';

// Function to be called by our Vite server endpoint
async function capturePageAsImage(comicCreatorUrl, outputDirectory, projectState) {
  console.log(`[Puppeteer] Launching browser...`);
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
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
      deviceScaleFactor: 1
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
    const loadSuccess = await page.evaluate(async () => { // Removed state from evaluate arguments
        console.log('[Page Eval - Load] Entered page.evaluate for _loadProjectFromState.');
        try {
            console.log('[Page Eval - Load] Calling window.getPuppeteerProjectState()...');
            const projectStateJSON = await window.getPuppeteerProjectState();
            console.log(`[Page Eval - Load] Received potential JSON string from getPuppeteerProjectState. Length: ${projectStateJSON?.length}`);
            
            if (!projectStateJSON) {
                console.error('[Page Eval - Load] Received null/empty JSON string for project state.');
                throw new Error('Received null/empty JSON string for project state from Puppeteer.');
            }

            console.log('[Page Eval - Load] Parsing projectStateJSON...');
            const stateFromPuppeteer = JSON.parse(projectStateJSON);
            console.log('[Page Eval - Load] Parsed stateFromPuppeteer. Keys:', stateFromPuppeteer ? Object.keys(stateFromPuppeteer) : null);
            
            console.log('[Page Eval - Load] Attempting to call window.comicCreator._loadProjectFromState with received state...');
            const result = await window.comicCreator._loadProjectFromState(stateFromPuppeteer);
            console.log('[Page Eval - Load] _loadProjectFromState call completed. Result:', result);
            return { success: result, data: result };
        } catch (e) {
            console.error('[Page Eval - Load] Error during _loadProjectFromState execution (or getting state):', e.message, e.stack);
            return { success: false, error: e.message, stack: e.stack };
        }
    }); // projectState is no longer passed as a direct argument here

    console.log('[Puppeteer] page.evaluate for _loadProjectFromState finished. Raw loadSuccess object:', loadSuccess);

    if (!loadSuccess || !loadSuccess.success) {
        const errorMessage = loadSuccess && loadSuccess.error ? loadSuccess.error : 'Unknown error during _loadProjectFromState';
        const errorStack = loadSuccess && loadSuccess.stack ? loadSuccess.stack : 'No stack trace available';
        console.error(`[Puppeteer] _loadProjectFromState in page.evaluate reported failure. Error: ${errorMessage}`, errorStack);
        throw new Error(`Failed to load project state into the page via _loadProjectFromState: ${errorMessage}`);
    }
    console.log('[Puppeteer] Project state reportedly loaded by _loadProjectFromState.');

    // KEEP IMAGE VERIFICATION IN PUPPETEER for an explicit check after state load
    if (projectState.images && projectState.images.length > 0) {
        console.log('[Puppeteer] Verifying all images are truly loaded in the DOM...');
        const imageVerificationResults = await page.evaluate(async (imagesToVerify) => {
            const verificationPromises = imagesToVerify.map(imgData => {
                return new Promise((resolve) => {
                    const imgEl = new Image();
                    imgEl.onload = () => resolve({ src: imgData.src.substring(0,50) + "...", loaded: true });
                    imgEl.onerror = () => resolve({ src: imgData.src.substring(0,50) + "...", loaded: false, error: true });
                    imgEl.src = imgData.src; // Data URLs from projectState
                });
            });
            return Promise.all(verificationPromises);
        }, projectState.images);

        console.log('[Puppeteer] Image verification results:', imageVerificationResults);
        if (imageVerificationResults.some(r => !r.loaded)) {
            throw new Error('Some images failed to verify loading after _loadProjectFromState.');
        }
        console.log('[Puppeteer] All images verified successfully.');
    }
    
    // Wait for all elements to be ready after project load
    console.log('[Puppeteer] Waiting a bit longer for rendering after project load...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait slightly

    // Create output directory if it doesn't exist
    await fsPromises.mkdir(outputDirectory, { recursive: true });

    // Initialize PDF document
    const pdfDoc = new PDFDocument({
      size: [700, 700],
      margin: 0
    });
    const pdfPath = path.join(outputDirectory, 'comic.pdf');
    const writeStream = fs.createWriteStream(pdfPath);
    pdfDoc.pipe(writeStream);

    // Process each page
    for (let pageIndex = 0; pageIndex < projectState.pages.length; pageIndex++) {
      console.log(`[Puppeteer] Processing page ${pageIndex + 1} of ${projectState.pages.length}`);

      // Load the page and ensure it's fully rendered
      await page.evaluate(async (index) => {
        await window.comicCreator.navigateToPage(index, true);
        
        // Force a redraw and wait for all elements
        const canvas = document.querySelector('#comic-canvas');
        if (canvas) {
          canvas.style.display = 'none';
          canvas.offsetHeight;
          canvas.style.display = 'block';
          
          // Wait for all images in the canvas to load
          const images = Array.from(canvas.querySelectorAll('img'));
          await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
          }));
        }
        
        // Additional wait for rendering
        await new Promise(resolve => setTimeout(resolve, 1000));
      }, pageIndex);

      // Get the exact bounding box
      const boundingBox = await page.evaluate(() => {
        const canvas = document.querySelector('#comic-canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: 700,
          height: 700
        };
      });

      if (!boundingBox) {
        throw new Error('Could not find #comic-canvas for screenshot.');
      }

      // Take the screenshot
      const screenshot = await page.screenshot({
        clip: boundingBox,
        omitBackground: false,
        type: 'png'
      });

      // Add to PDF
      if (pageIndex > 0) {
        pdfDoc.addPage({
          size: [700, 700],
          margin: 0
        });
      }
      
      pdfDoc.image(screenshot, 0, 0, {
        width: 700,
        height: 700,
        align: 'center',
        valign: 'center'
      });

      console.log(`[Puppeteer] Successfully captured page ${pageIndex + 1}`);
    }

    // Finalize PDF
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        resolve({
          pdfPath,
          pageCount: projectState.pages.length
        });
      });
      writeStream.on('error', reject);
      pdfDoc.end();
    });

  } catch (error) {
    console.error('[Puppeteer] Error during export:', error);
    try {
      if (page && !page.isClosed()) {
      const errorScreenshot = await page.screenshot({ fullPage: true });
      const errorScreenshotPath = path.join(outputDirectory, 'error-screenshot.png');
      await fsPromises.writeFile(errorScreenshotPath, errorScreenshot);
      console.log(`[Puppeteer] Error screenshot saved to: ${errorScreenshotPath}`);
      } else {
        console.log('[Puppeteer] Could not save error screenshot because page was closed or undefined.');
      }
    } catch (screenshotError) {
      console.error('[Puppeteer] Failed to save error screenshot:', screenshotError);
    }
    throw error;
  } finally {
    await browser.close();
  }
}

export { capturePageAsImage }; 