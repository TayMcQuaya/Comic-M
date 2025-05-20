# Project Goal: Puppeteer-based PDF Export for Comic Creator

## 1. Overall Goal

The primary objective is to replace the existing PDF export functionality (currently handled by `ExportManager.js`) with a new system leveraging **Puppeteer**. This change aims to:

*   Achieve **high-fidelity PDF output** that accurately captures all visual elements on the canvas. This includes:
    *   Backgrounds
    *   Comic panels (with their images and transformations)
    *   Stickers
    *   Text elements (preserving content, styling, rotation, and textbox properties)
*   Reliably export **multi-page comics** with pages in the correct order.
*   Resolve existing issues with the preservation of visual details like element rotation and text properties during export.

## 2. Current Situation & Relevant Files

To implement this, we need to understand how the existing application works, especially these files:

*   **`src/js/main.js` (`ComicCreator` class):** This is the core of the application.
    *   Manages the comic's pages (`this.pages`), including their layouts and content.
    *   Controls the canvas (`#comic-canvas`) where the comic is displayed.
    *   Handles navigation between pages (`navigateToPage`, `loadPageState`).
    *   Manages the state of all elements on the canvas.
    *   Its functions will be called by Puppeteer to render each page for capture.
*   **`src/js/modules/ExportManager.js`:** This is the current export logic that we intend to replace.
*   **Element Managers (e.g., `PanelManager.js`, `TextManager.js`, `StickerManager.js`, `BackgroundManager.js`):** These modules are responsible for rendering and managing the state of specific elements on the canvas. Their output is what Puppeteer needs to capture accurately.
*   **`index.html`:** The main HTML file of your application. Puppeteer will load this page in a headless browser.
*   **`src/styles/main.css` (and other CSS files):** These define the visual appearance of your comic. Puppeteer will use these to render the pages correctly.
*   **`package.json`:** We'll need to add Puppeteer as a project dependency here.
*   **`vite.config.js`:** We'll likely need to modify this to set up a local server endpoint that Puppeteer can use.

## 3. Strategy: Using Puppeteer for PDF Export

### Why Puppeteer?

Puppeteer controls a real Chromium browser. This means it can render your web page exactly as it appears in Chrome. This is a significant advantage for accurately capturing complex CSS, transformations (like rotations), and precise text rendering, which are often challenging for other client-side export libraries.

### How It Will Work (Locally for Now)

1.  **User Action:** You click the "Download Comic" button in the application.
2.  **Frontend Request:** Your application (running in your browser) will send a request to a small, local server-side script. We can integrate this script into your existing Vite development server.
3.  **Backend Puppeteer Script Triggered:** This local server endpoint will run a Node.js script that uses Puppeteer.
4.  **Puppeteer in Action:**
    *   Puppeteer launches a "headless" (invisible) Chromium browser.
    *   It navigates this headless browser to your application's URL (e.g., `http://localhost:5173/`).
    *   **For each page in your comic:**
        *   Puppeteer will instruct your front-end `ComicCreator` (running in the headless browser) to load and fully render that specific comic page onto the canvas.
        *   It will wait for all elements (images, text, styles) to be ready.
        *   Puppeteer will then take a high-quality screenshot of the `#comic-canvas` element for that page.
5.  **PDF Assembly:** After capturing images of all pages, the Puppeteer script will use a library (like `pdf-lib`) to combine these images into a single, multi-page PDF file.
6.  **Download:** The local server will send this generated PDF file back to your browser, initiating a download.

## 4. Step-by-Step Implementation Plan

We'll break this down into manageable phases:

### Phase 1: Setup & Basic Single-Page Capture

1.  **Install Puppeteer:**
    *   **Action:** Add `puppeteer` to `devDependencies` in your `package.json` file.
    *   **Action:** Run `npm install` (or `yarn install` if you use Yarn) in your terminal.
    *   **Why:** This makes the Puppeteer library available for our Node.js script.
2.  **Create Server Endpoint (Using Vite):**
    *   **Action:** We'll need to modify your `vite.config.js` file. The goal is to add custom "middleware" (a small piece of server logic) that defines an API endpoint (e.g., `/api/export-pdf`). When your front-end calls this endpoint, it will trigger our Puppeteer script.
    *   **Action:** Create a new Node.js script file (e.g., `src/server/puppeteer-export.js`). This script will contain all the Puppeteer logic.
    *   **Why:** This provides a way for your browser-based application to communicate with the Node.js environment where Puppeteer runs.
3.  **Basic Puppeteer Script (Single Page Image):**
    *   **Action:** In the new `src/server/puppeteer-export.js`, write the initial Puppeteer code to:
        *   Launch a headless browser.
        *   Open a new page in the browser.
        *   Navigate to your application's URL.
        *   Target the `#comic-canvas` element.
        *   Take a screenshot of just this canvas element.
        *   Save this screenshot as an image file (e.g., `page.png`) temporarily on the server.
        *   Close the browser.
    *   **Why:** This step is to test the fundamental Puppeteer setup and ensure it can access your application and capture the canvas content correctly.
4.  **Modify "Download Comic" Button:**
    *   **Action:** In `src/js/main.js`, find the event listener for the `#download-btn`.
    *   **Action:** Change its current action (which likely calls `this.exportManager.downloadComic()`). Instead, it should make a `fetch` request to our new `/api/export-pdf` server endpoint.
    *   **Why:** This connects the user interface action to our new backend Puppeteer process.

### Phase 2: Multi-Page Capture & PDF Generation

1.  **Communication (Frontend -> Puppeteer -> Frontend):**
    *   **Action (Frontend):** When the front-end makes the `/api/export-pdf` request, it should send the total number of pages (`this.pages.length`) to the Puppeteer script.
    *   **Action (Puppeteer & Frontend):** The Puppeteer script needs to tell the `ComicCreator` (running in the headless browser) which page to render. We'll use Puppeteer's `page.evaluate()` method to call `comicCreator.navigateToPage(currentPageIndex, false)` for each page.
    *   **Action (Frontend & Puppeteer):** The `ComicCreator` needs to signal back to Puppeteer when a page is fully rendered and ready for capture. We can use `page.exposeFunction()` in Puppeteer to create a function (e.g., `window.notifyPageReady()`) that the `ComicCreator` can call from the headless browser once `loadPageState()` is complete.
    *   **Why:** This establishes a two-way communication channel to control the page rendering and capture sequence.
2.  **Puppeteer Loop for Capturing All Pages:**
    *   **Action:** In `src/server/puppeteer-export.js`, the script will:
        *   Receive the total number of pages from the initial request.
        *   Loop from page 0 to (totalPages - 1).
        *   Inside the loop:
            *   Instruct the front-end to render the current page number (using `page.evaluate()`).
            *   Wait for the `window.notifyPageReady()` signal from the front-end (or a reasonable timeout).
            *   Take a screenshot of the `#comic-canvas` for the current page.
            *   Store these screenshots (e.g., as image buffers in an array).
    *   **Why:** To systematically go through each page of the comic and capture its visual representation.
3.  **Combine Images into a Single PDF:**
    *   **Action:** We'll add another Node.js library, `pdf-lib`, to the project (`devDependencies` in `package.json` and install it).
    *   **Action:** In `src/server/puppeteer-export.js`, after all page images are captured:
        *   Use `pdf-lib` to create a new PDF document.
        *   For each captured image, add it to a new page in the PDF document.
        *   Get the final PDF content as a byte array/buffer.
    *   **Why:** `pdf-lib` allows us to programmatically construct a PDF from multiple images.
4.  **Send PDF to the Client for Download:**
    *   **Action:** In your Vite middleware (the `/api/export-pdf` endpoint):
        *   Set the correct HTTP response headers (e.g., `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="comic.pdf"`).
        *   Send the PDF byte array (from `pdf-lib`) as the response body.
    *   **Action (Frontend):** The `fetch` request made by the "Download Comic" button will receive this PDF. JavaScript will then be used to trigger a file download in the browser.
    *   **Why:** This delivers the generated multi-page PDF to you.

### Phase 3: Refinements & Error Handling

1.  **Precise Canvas Targeting:**
    *   **Action:** Ensure Puppeteer's screenshot function (`elementHandle.screenshot()`) precisely targets only the `#comic-canvas` element. We might need to adjust the headless browser's viewport size to match the canvas or ensure the canvas is fully in view.
    *   **Why:** To avoid capturing unwanted UI elements and to get a clean image of the comic page.
2.  **Waiting for All Assets to Load:**
    *   **Action:** Investigate if `loadPageState()` in `main.js` already handles waiting for images, fonts, etc. If not, we may need to add more robust waiting mechanisms in Puppeteer (e.g., `page.waitForSelector` for specific elements, `page.waitForNetworkIdle` to wait for network activity to cease) before taking a screenshot.
    *   **Why:** To prevent capturing pages before they are fully rendered, which could lead to missing images or incorrect styling.
3.  **Robust Error Handling:**
    *   **Action:** Implement `try...catch` blocks in the Puppeteer script (`puppeteer-export.js`) and in the front-end `fetch` call.
    *   **Action:** If an error occurs during PDF generation, provide clear feedback to you in the UI.
    *   **Why:** To make the export process more resilient and to help diagnose issues if they arise.
4.  **Clean up Old `ExportManager.js`:**
    *   **Action:** Once the new Puppeteer-based export is working reliably and tested, we can safely delete the old `src/js/modules/ExportManager.js` file and remove its import from `src/js/main.js`.
    *   **Why:** To remove obsolete code and keep the project clean.

## 5. Files Requiring More Context / Next Steps

To proceed effectively, I'll need a bit more information:

*   **`vite.config.js`:** Please provide the content of this file. I need to see its current structure to advise on the best way to add the custom middleware for our `/api/export-pdf` endpoint.
*   **`src/js/modules/ExportManager.js` (Current Version):** While we're replacing it, seeing its current implementation might give clues about any specific data or configurations it uses that we might need to consider (though the main goal is a fresh, Puppeteer-based approach).

**Our immediate next steps will be:**

1.  You provide the content of `vite.config.js`.
2.  Based on that, I'll guide you on how to modify it to include the server endpoint.
3.  Then, we'll proceed with adding `puppeteer` to your `package.json` and installing it. 