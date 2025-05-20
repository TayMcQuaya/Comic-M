// This file will contain the Puppeteer logic for PDF export. 

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

// Function to be called by our Vite server endpoint
async function capturePageAsImage(comicCreatorUrl, outputDirectory, projectState) {
  console.log(`[Puppeteer] Launching browser...`);
  const browser = await puppeteer.launch({
    headless: true, // Run in headless mode (no visible browser window)
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-gpu', // May help with consistency if GPU rendering differs
      '--disable-dev-shm-usage', // Often needed in CI/server environments
      '--force-color-profile=srgb', // Standard color profile
      '--disable-features=IsolateOrigins,site-per-process' // Can simplify rendering paths
    ]
  });
  console.log(`[Puppeteer] Browser launched.`);

  const page = await browser.newPage();
  // Set a much wider viewport to ensure the canvas is always fully visible
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 }); 
  console.log(`[Puppeteer] New page created and viewport set with deviceScaleFactor: 1.`);

  // Log what projectState Puppeteer received (first few keys for brevity)
  if (projectState) {
    console.log(`[Puppeteer] Received projectState. Page count: ${projectState.pages?.length}`);
  } else {
    console.warn('[Puppeteer] projectState was not provided.');
  }

  try {
    console.log(`[Puppeteer] Navigating to ${comicCreatorUrl}...`);
    // Adjust timeout if needed, default is 30 seconds
    await page.goto(comicCreatorUrl, { waitUntil: 'networkidle0' }); 
    console.log(`[Puppeteer] Navigation to ${comicCreatorUrl} successful.`);

    console.log('[Puppeteer] Attempting to load project state and initialize editor...');
    // Expose a function to the page to signal when comicCreator.loadProject is done
    let loadProjectPromiseResolver;
    const loadProjectDonePromise = new Promise(resolve => { loadProjectPromiseResolver = resolve; });
    await page.exposeFunction('onProjectLoadedByPuppeteer', () => {
      console.log('[Puppeteer - Page Context] onProjectLoadedByPuppeteer called.');
      loadProjectPromiseResolver();
    });

    await page.evaluate(async (stateToLoad) => {
      const uploadPage = document.getElementById('upload-page');
      const layoutPage = document.getElementById('layout-page');
      const editorPage = document.getElementById('editor-page');
      
      if (uploadPage) uploadPage.classList.remove('active');
      if (layoutPage) layoutPage.classList.remove('active');
      if (editorPage) {
        editorPage.classList.add('active');
      } else {
        console.error('[Puppeteer - Evaluate] #editor-page not found.');
        throw new Error('#editor-page not found during page evaluation.');
      }

      if (window.comicCreator && typeof window.comicCreator.loadPageState === 'function') {
        if (stateToLoad) {
          console.log('[Puppeteer - Evaluate] Calling comicCreator logic to load project state...');
          try {
            if (window.comicCreator.autoSaveManager) {
                await window.comicCreator.autoSaveManager.clearAutoSave();
                window.comicCreator.autoSaveManager.stopAutoSaveTimer();
            }
            window.comicCreator.loadCustomLayouts?.(); 

            if (stateToLoad.customLayouts) {
                Object.entries(stateToLoad.customLayouts).forEach(([layoutId, layout]) => {
                    window.comicCreator.layouts[layoutId] = layout;
                    window.comicCreator.layoutBuilderManager?.saveLayoutToStorage(layout.name, layout);
                });
                window.comicCreator.setupLayoutSelection?.();
            }

            window.comicCreator.imageLibrary?.clearImages();
            window.comicCreator.pages = [];
            window.comicCreator.currentPageIndex = 0;
            window.comicCreator.folderStructure = { root: { type: 'folder', name: 'root', items: [], parent: null } };
            window.comicCreator.currentFolderId = 'root';
            const canvasElement = document.getElementById('comic-canvas');
            if (canvasElement) canvasElement.innerHTML = '';
            if (stateToLoad.hasOwnProperty('useGlobalBackgroundStyle')) window.comicCreator.useGlobalBackgroundStyle = stateToLoad.useGlobalBackgroundStyle;
            if (stateToLoad.hasOwnProperty('globalBackgroundStyle')) window.comicCreator.globalBackgroundStyle = stateToLoad.globalBackgroundStyle;
            if(window.comicCreator.backgroundManager) { // Update manager too
              if (stateToLoad.hasOwnProperty('useGlobalBackgroundStyle')) window.comicCreator.backgroundManager.useGlobalBackgroundStyle = stateToLoad.useGlobalBackgroundStyle;
              if (stateToLoad.hasOwnProperty('globalBackgroundStyle'))  window.comicCreator.backgroundManager.globalBackgroundStyle = stateToLoad.globalBackgroundStyle;
            }

            const imageProcessingPromises = stateToLoad.images.map(async (img) => {
                if (!img.src || !img.src.startsWith('data:')) {
                    if (img.src && img.src.startsWith('blob:')) return { ...img, isObjectURL: true };
                    return { ...img, src: null, loadError: true }; 
                }
                try {
                    const response = await fetch(img.src);
                    if (!response.ok) throw new Error(`Failed to fetch data URL for ${img.name}`);
                    const blob = await response.blob();
                    const objectURL = URL.createObjectURL(blob);
                    return { ...img, src: objectURL, isObjectURL: true };
                } catch (error) {
                    return { ...img, loadError: true, conversionError: true };
                }
            });
            const loadedImages = await Promise.all(imageProcessingPromises);
            window.comicCreator.imageLibrary?.addImages(loadedImages.filter(img => img !== null));

            if (stateToLoad.folderStructure) {
                window.comicCreator.folderStructure = stateToLoad.folderStructure;
                window.comicCreator.currentFolderId = stateToLoad.currentFolderId || 'root';
            } else {
                window.comicCreator.imageLibrary?.getImages().forEach(image => {
                    if (!window.comicCreator.folderStructure.root.items.includes(image.id)) {
                        window.comicCreator.folderStructure.root.items.push(image.id.toString());
                    }
                });
            }
            window.comicCreator.imageLibrary?.updateThumbnails();
            window.comicCreator.pages = stateToLoad.pages;
            window.comicCreator.currentPageIndex = stateToLoad.currentPageIndex;
            
            await window.comicCreator.loadPageState(window.comicCreator.currentPageIndex);
            await document.fonts.ready; // Explicitly wait for all fonts to be loaded and ready
            
            window.comicCreator.updatePageIndicator?.();
            window.comicCreator.updateNavigationButtons?.();
            if (window.comicCreator.autoSaveManager) await window.comicCreator.autoSaveManager.init();
            console.log('[Puppeteer - Evaluate] Project state loaded and fonts ready.');
            window.onProjectLoadedByPuppeteer();

          } catch (e) {
            console.error('[Puppeteer - Evaluate] Error during project load:', e.message, e.stack);
            window.onProjectLoadedByPuppeteer(); 
          }
        } else {
          console.warn('[Puppeteer - Evaluate] No project state. Initializing default.');
          if (window.comicCreator && typeof window.comicCreator.createComic === 'function' && window.comicCreator.layouts) {
            const layoutKeys = Object.keys(window.comicCreator.layouts);
            if (layoutKeys.length > 0) window.comicCreator.createComic(window.comicCreator.layouts[layoutKeys[0]]);
          }
          window.onProjectLoadedByPuppeteer();
        }
      } else {
        throw new Error('comicCreator or methods not found');
      }
    }, projectState);

    console.log('[Puppeteer] Waiting for project load signal from page...');
    await loadProjectDonePromise;
    console.log('[Puppeteer] Frontend signaled project load complete.');
    
    console.log('[Puppeteer] Waiting for network idle after project load...');
    await page.waitForNetworkIdle({ idleTime: 750, timeout: 25000 });
    console.log('[Puppeteer] Network is idle.');

    await new Promise(resolve => setTimeout(resolve, 2500));
    console.log('[Puppeteer] Additional 2.5s delay complete.');

    // Inject CSS to force the canvas to the top-left and remove margin before screenshot
    await page.evaluate(() => {
      const canvas = document.getElementById('comic-canvas');
      if (canvas) {
        // Hide all siblings of the canvas
        Array.from(document.body.children).forEach(child => {
          if (child !== canvas && !child.contains(canvas)) {
            child.style.display = 'none';
          }
        });
        // Make sure the canvas is on top
        canvas.style.margin = '0';
        canvas.style.left = '0';
        canvas.style.right = 'auto';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.zIndex = '9999';
        canvas.style.background = 'white'; // or your desired background
      }
    });
    console.log('[Puppeteer] Hid all UI except #comic-canvas and forced it to top-left for screenshot.');

    console.log(`[Puppeteer] Final check for #comic-canvas readiness...`);
    await page.waitForFunction(() => {
        const canvas = document.getElementById('comic-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) return false;
        const panels = canvas.querySelectorAll('.comic-panel');
        if (panels.length > 0) {
            const firstPanel = panels[0];
            const firstPanelImage = firstPanel.querySelector('img');
            if (firstPanelImage) {
                return firstPanelImage.complete && firstPanelImage.naturalWidth > 0;
            }
            return true; 
        }
        return document.readyState === 'complete';
      },
      { timeout: 25000 }
    );
    console.log(`[Puppeteer] #comic-canvas is confirmed ready.`);

    const canvasElement = await page.$('#comic-canvas');
    if (!canvasElement) throw new Error('#comic-canvas not found after all waits');

    const boundingBox = await canvasElement.boundingBox();
    console.log('[Puppeteer] #comic-canvas bounding box after CSS injection:', boundingBox);
    if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0) {
        console.warn('[Puppeteer] #comic-canvas has no dimensions. Screenshot might be empty.');
    }
    
    await canvasElement.scrollIntoViewIfNeeded?.();
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('[Puppeteer] Brief 200ms delay after scroll complete.');

    const clip = boundingBox ? {
        x: boundingBox.x,
        y: boundingBox.y,
        width: Math.max(1, boundingBox.width),
        height: Math.max(1, boundingBox.height)
    } : undefined;

    const fullPageScreenshotPath = path.join(outputDirectory, 'fullpage_diagnostic.png');
    await page.screenshot({ path: fullPageScreenshotPath, fullPage: true });
    console.log(`[Puppeteer] Full page diagnostic screenshot saved: ${fullPageScreenshotPath}`);

    await fs.mkdir(outputDirectory, { recursive: true });
    const screenshotPath = path.join(outputDirectory, 'page.png');
    console.log(`[Puppeteer] Taking screenshot of #comic-canvas (element) to ${screenshotPath}...`);
    await canvasElement.screenshot({ path: screenshotPath }); 
    console.log(`[Puppeteer] Screenshot of #comic-canvas saved.`);

    return { success: true, imagePath: screenshotPath };

  } catch (error) {
    console.error('[Puppeteer] Error during page capture:', error.message, error.stack);
    // Also take a full page screenshot on error for diagnostics
    try {
        const errorScreenshotPath = path.join(outputDirectory || '.', 'error_page_diagnostic.png');
        await page.screenshot({ path: errorScreenshotPath, fullPage: true });
        console.log(`[Puppeteer] Error diagnostic screenshot saved: ${errorScreenshotPath}`);
    } catch (se) {
        console.error('[Puppeteer] Could not take error screenshot:', se);
    }
    return { success: false, error: error.message };
  } finally {
    console.log(`[Puppeteer] Closing browser...`);
    await browser.close();
    console.log(`[Puppeteer] Browser closed.`);
  }
}

// This export will be used by the Vite middleware
export { capturePageAsImage }; 