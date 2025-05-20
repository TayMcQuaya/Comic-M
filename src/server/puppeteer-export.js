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
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });

  try {
    const page = await browser.newPage();
    
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
      request.continue();
      if (request.failure()) {
        console.error(`[Puppeteer] Request failed:`, request.url(), request.failure());
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
      await page.waitForFunction(() => {
        const canvas = document.querySelector('#comic-canvas');
        return canvas && window.getComputedStyle(canvas).display !== 'none';
      }, { timeout: 60000 });
    } catch (error) {
      console.error('[Puppeteer] Failed to find comic canvas. DOM state:', await page.evaluate(() => document.body.innerHTML));
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

    // Initialize project state and wait for images to load
    await page.evaluate(async (state) => {
      // Wait for comic creator
      let attempts = 0;
      while (!window.comicCreator && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!window.comicCreator) throw new Error('Comic creator not initialized after 5 seconds');

      console.log('[Page] Comic creator found, initializing project...');
      await window.comicCreator.resetProject(false);

      // Load and verify images first
      if (state.images && state.images.length > 0) {
        console.log('[Page] Loading images:', state.images.length);
        window.comicCreator.imageLibrary.clearImages();
        window.comicCreator.imageLibrary.addImages(state.images);
        
        // Verify images are loaded
        const imageLoadPromises = state.images.map(img => {
          return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = img.src;
          });
        });
        
        const results = await Promise.all(imageLoadPromises);
        console.log('[Page] Image load results:', results);
        
        if (results.some(result => !result)) {
          throw new Error('Some images failed to load');
        }
      }

      // Load other state components
      if (state.folderStructure) {
        window.comicCreator.folderStructure = state.folderStructure;
        window.comicCreator.currentFolderId = state.currentFolderId || 'root';
      }
      
      if (state.customLayouts) {
        Object.entries(state.customLayouts).forEach(([layoutId, layout]) => {
          window.comicCreator.layouts[layoutId] = layout;
        });
      }

      // Finally load pages
      window.comicCreator.pages = state.pages;
      window.comicCreator.currentPageIndex = 0;
      
      // Force initial page load
      await window.comicCreator.loadPageState(0);
      
      // Wait for all elements to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return 'Project state loaded successfully';
    }, projectState);

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
      const errorScreenshot = await page.screenshot({ fullPage: true });
      const errorScreenshotPath = path.join(outputDirectory, 'error-screenshot.png');
      await fsPromises.writeFile(errorScreenshotPath, errorScreenshot);
      console.log(`[Puppeteer] Error screenshot saved to: ${errorScreenshotPath}`);
    } catch (screenshotError) {
      console.error('[Puppeteer] Failed to save error screenshot:', screenshotError);
    }
    throw error;
  } finally {
    await browser.close();
  }
}

export { capturePageAsImage }; 