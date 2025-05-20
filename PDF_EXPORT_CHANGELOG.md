# PDF Export Evolution: From Direct PDF to Screenshot & Embed

This document outlines the major changes made to the PDF export functionality in `src/server/puppeteer-export.js`, focusing on how individual comic pages are captured and converted to PDF.

## Initial Approaches and Challenges

### 1. Direct `page.pdf()` with Clipping (Early `pdf-lib` attempt)

*   **Method:** The initial attempts with `pdf-lib` for multi-page output involved using Puppeteer's `page.pdf()` function directly for each page.
*   **Goal:** To capture a specific area of the page (the `#comic-canvas`) using the `clip` option within `page.pdf()`. We also tried to force the canvas to the top-left `(0,0)` of the viewport by temporarily hiding other UI elements and adjusting styles.
*   **Problem:** Despite correctly calculating the canvas's bounding box (e.g., `x=16, y=133, width=700, height=700`) and providing this to the `clip` option, the output PDF often included UI elements positioned above or to the left of the intended clip area. It seemed the `clip` coordinates were relative to the viewport, but the PDF generation itself might have had a different origin, leading to an offset. Modifying styles with `!important` helped somewhat but didn't fully resolve the cropping issue consistently.

## The Screenshot & Embed Solution (Inspired by `old.txt`)

The previous implementation (`old.txt`) used `pdfkit` and had a more reliable method for isolating the canvas:

1.  **Capture PNG Screenshot:** It first took a PNG screenshot of *only* the `#comic-canvas` using `page.screenshot({ clip: boundingBox })`.
2.  **Embed Screenshot in PDF:** This isolated PNG was then embedded onto a fresh PDF page using `pdfkit`.

This ensured that only the canvas content was part of the image, which was then placed cleanly onto the PDF.

### 2. Current Method: Screenshot with Puppeteer, Embed with `pdf-lib`

To achieve reliable and clean canvas-only capture, the `capturePageAsImage` function in `src/server/puppeteer-export.js` was significantly refactored to adopt the "screenshot-then-embed" strategy, using `pdf-lib` for PDF creation (as `pdf-lib` was already in use for merging the final PDF).

**Key Steps in the Current `capturePageAsImage` function:**

1.  **Hide UI & Position Canvas:** The page is manipulated using `page.evaluate()` to:
    *   Hide all elements except the `#comic-canvas` and its direct ancestors.
    *   Attempt to position the `#comic-canvas` at the top-left of the visible area with no transformations.
    *   Styles are applied with `setProperty(style, value, 'important')` to ensure they take precedence.

2.  **Calculate Bounding Box:** The precise dimensions and position (`x, y, width, height`) of the `#comic-canvas` are determined using `canvas.getBoundingClientRect()`. The width and height are consistently treated as 700x700.

3.  **Take a Clipped Screenshot:**
    ```javascript
    const pngScreenshotBuffer = await page.screenshot({
        clip: { // Uses the calculated x, y, width, height
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
        },
        type: 'png',
        omitBackground: false // Captures canvas background
    });
    ```
    This step produces a PNG image buffer containing *only* the pixels of the comic canvas.

4.  **Create a New PDF and Embed Screenshot:**
    ```javascript
    const pdfDoc = await PDFDocument.create();
    // Create a page with the exact dimensions of the canvas
    const pageOfPdf = pdfDoc.addPage([boundingBox.width, boundingBox.height]); 
    const pngImage = await pdfDoc.embedPng(pngScreenshotBuffer);

    // Draw the captured PNG onto the PDF page at (0,0)
    pageOfPdf.drawImage(pngImage, {
        x: 0,
        y: 0, // For a page of H, drawing at y=0 in pdf-lib places it at the bottom.
             // Since page height IS image height, y=0 works to fill from bottom up.
        width: boundingBox.width,
        height: boundingBox.height,
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPdfPath, pdfBytes); // Saves the single-page PDF
    ```
    Each call to `capturePageAsImage` now generates a single-page PDF containing *only* the perfectly cropped canvas image. These individual PDFs are then merged by the `mergePdfs` function.

## Subsequent Improvements

*   **Addressing Blurriness:** To improve image sharpness, the `deviceScaleFactor` in `page.setViewport()` was increased from `1` to `2`.
    ```javascript
    await page.setViewport({ 
      width: 1920, 
      height: 1080,
      deviceScaleFactor: 2 // Produces a higher-resolution screenshot
    });
    ```
    This effectively doubles the pixel density of the captured screenshot, resulting in a clearer image when embedded in the PDF at the original 700x700 point size.

## Summary of "Big" Changes

*   **Capture Method:** Moved from `page.pdf()` (direct PDF generation by Chromium) to `page.screenshot()` (capturing a PNG image).
*   **PDF Page Creation:** Individual page PDFs are now created by `pdf-lib` by embedding the captured PNG, rather than relying on Chromium's internal PDF renderer for the initial page content and cropping.
*   **Reliability:** This approach has proven much more reliable for isolating *only* the comic canvas and its elements, preventing UI components from appearing in the final export.
*   **Quality:** Image sharpness was subsequently improved by adjusting `deviceScaleFactor`. 