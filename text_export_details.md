# Text Bubble Export and Usage in PDF/Screenshotting

This document outlines how text bubbles, their properties, and content are saved and utilized during PDF export and screenshotting processes in the comic creator application.

## 1. Saving Text Bubble State

The primary module responsible for capturing the state of text bubbles from the DOM is `TextManagerState.js`.

### `src/js/modules/TextManagerState.js`

**Key Function: `saveTextStates()`**

This function iterates through all comic panels and the main comic canvas to find `.text-bubble` elements. For each bubble, it extracts and saves a comprehensive set of properties.

```javascript
// Relevant snippet from src/js/modules/TextManagerState.js

export class TextManagerState {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        // ...
    }

    saveTextStates() {
        console.log('TextManagerState.saveTextStates: Starting to save text states...');
        const panelTextStates = [];
        const canvasTextElements = [];
        const canvas = document.querySelector('#comic-canvas');
        
        // Save panel text elements
        const panels = Array.from(document.querySelectorAll('.comic-panel'));
        panels.forEach((panel, panelIndex) => {
            const panelTexts = [];
            const textBubbles = Array.from(panel.querySelectorAll('.text-bubble'));
            textBubbles.forEach((textBubble, bubbleIndex) => {
                const textElement = textBubble.querySelector('.text-content');
                if (!textElement) return;

                const bubbleClasses = Array.from(textBubble.classList)
                    .filter(cls => [/* various bubble type classes */].includes(cls));
                const tailPositionClass = Array.from(textBubble.classList)
                    .find(cls => cls.startsWith('speech-tail-') || cls.startsWith('thought-tail-'));

                const computedStyle = window.getComputedStyle(textBubble);
                const textComputedStyle = window.getComputedStyle(textElement);
                
                let finalWidth = textBubble.style.width || computedStyle.width;
                let finalHeight = textBubble.style.height || computedStyle.height;
                
                const currentStyleLeft = textBubble.style.left;
                const currentStyleTop = textBubble.style.top;
                
                let exactLeftForOriginalPos = currentStyleLeft;
                let exactTopForOriginalPos = currentStyleTop;
                // Logic to calculate exactLeftForOriginalPos and exactTopForOriginalPos if not directly available
                // ... (omitted for brevity, see full file)

                panelTexts.push({
                    id: textBubble.id || `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    bubbleType: textBubble.dataset.bubbleType || (bubbleClasses.length > 0 ? bubbleClasses[0] : 'speech-bubble'),
                    previousBubbleType: textBubble.dataset.previousBubbleType || '',
                    tailPosition: textBubble.dataset.tailPosition || (tailPositionClass ? tailPositionClass.replace(/(?:speech|thought)-tail-/, '') : ''),
                    tailSettings: textBubble.dataset.tailSettings || '', // JSON string of tail settings
                    positionGrid: textBubble.dataset.positionGrid || 'custom',
                    content: textElement.innerHTML, // The actual text content with HTML formatting
                    originalPosition: {
                        left: exactLeftForOriginalPos,
                        top: exactTopForOriginalPos,
                        width: finalWidth,
                        height: finalHeight
                    },
                    style: {
                        // Position and size
                        left: currentStyleLeft,
                        top: currentStyleTop,
                        width: finalWidth,
                        height: finalHeight,
                        transform: textBubble.style.transform || '',
                        
                        // Bubble visual properties
                        backgroundColor: computedStyle.backgroundColor, // This might be the bubble's BG if not overridden
                        bubbleBackgroundColor: textBubble.style.getPropertyValue('--bubble-background-color') || '',
                        bubbleOpacity: textBubble.style.getPropertyValue('--bubble-opacity') || '1',
                        padding: computedStyle.padding,
                        paddingVertical: textBubble.dataset.paddingVertical,
                        paddingHorizontal: textBubble.dataset.paddingHorizontal,
                        bubblePadding: textBubble.dataset.bubblePadding, // Consolidated padding
                        zIndex: computedStyle.zIndex,
                        
                        // Text content specific styles
                        color: textElement.style.color || textComputedStyle.color,
                        fontSize: textElement.style.fontSize || textComputedStyle.fontSize,
                        fontFamily: textElement.style.fontFamily || textComputedStyle.fontFamily,
                        fontWeight: textElement.style.fontWeight || textComputedStyle.fontWeight,
                        fontStyle: textElement.style.fontStyle || textComputedStyle.fontStyle,
                        textDecoration: textElement.style.textDecoration || textComputedStyle.textDecoration,
                        lineHeight: textElement.style.lineHeight || textComputedStyle.lineHeight,
                        textAlign: textElement.style.textAlign || textComputedStyle.textAlign,
                        textTransform: textElement.style.textTransform || textComputedStyle.textTransform,
                        textShadow: textElement.style.textShadow || textComputedStyle.textShadow, // Captures text shadow
                        hasOutline: textElement.getAttribute('data-has-outline') === 'true',
                        outlineColor: textElement.getAttribute('data-outline-color') || '#000000',
                        // outlineThickness: textElement.getAttribute('data-outline-thickness') || '1px' // Example if you save thickness
                    }
                });
            });
            panelTextStates.push(panelTexts);
        });

        // Similar logic for text bubbles directly on the canvas (#comic-canvas > .text-bubble)
        // ... (omitted for brevity, see full file for canvasTextElements logic)

        return { panelTextStates, canvasTextElements };
    }

    // ... other methods like loadTextStates and restoreTextBubble
}
```
**Explanation:**
- The function captures the `id`, `bubbleType` (e.g., 'speech-bubble', 'thought-bubble'), `tailPosition`, and `tailSettings`.
- `content`: Stores the `innerHTML` of the text element, preserving any rich text formatting (like bold, italics applied via HTML tags).
- `originalPosition`: Stores the calculated position and dimensions.
- `style`: A detailed object capturing numerous CSS properties:
    - Direct styles from `textBubble.style` (e.g., `left`, `top`, `width`, `height`, `transform`).
    - Computed styles via `window.getComputedStyle()` for things like `backgroundColor`, `padding`, `zIndex`.
    - Custom CSS variables like `--bubble-background-color` and `--bubble-opacity`.
    - Text-specific styles from the `.text-content` element (e.g., `color`, `fontSize`, `fontFamily`, `fontWeight`, `fontStyle`, `textAlign`, `textShadow`).
    - Data attributes for custom states like `data-has-outline` and `data-outline-color`.
- This state is collected for text bubbles within panels and those directly on the main canvas. The result is an object like `{ panelTextStates: [...], canvasTextElements: [...] }`, which becomes part of the overall `projectState`.

## 2. PDF Export Process using Puppeteer

The server-side script `src/server/puppeteer-export.js` orchestrates the PDF generation using Puppeteer.

### `src/server/puppeteer-export.js`

This script launches a headless Chrome browser to render each page of the comic and capture it as an image, which is then compiled into a PDF.

**Key Function: `createSinglePageProjectState(fullProjectState, pageIndexToExport)`**
This helper function prepares a minimal version of the project state that only contains data relevant to the single page being exported. This includes the text bubble states for that page.

```javascript
// Relevant snippet from src/server/puppeteer-export.js

function createSinglePageProjectState(fullProjectState, pageIndexToExport) {
    // ... (error handling and setup) ...
    const singlePageData = fullProjectState.pages[pageIndexToExport];
    // ... (logic to extract images, custom layouts relevant to this page) ...

    // The text bubble states (panelTextStates, canvasTextElements) are part of singlePageData
    // which is taken from fullProjectState.pages[pageIndexToExport]

    const stateForSinglePage = {
        images: imagesForThisPage, // Filtered images
        customLayouts: customLayoutsToInclude,
        pages: [singlePageData], // Contains the text states for THIS page
        settings: fullProjectState.settings,
        currentPageIndex: 0,
    };
    return stateForSinglePage;
}
```
**Explanation:**
- Ensures that when Puppeteer loads a page, it only receives the text bubble data (and other elements) pertinent to that specific page, optimizing the data transfer and rendering process.

**Key Function: `async function capturePageAsImage(comicCreatorUrl, outputDirectory, projectState, outputPdfPath)`**
This is the core function for rendering and capturing a single page.

```javascript
// Relevant snippet from src/server/puppeteer-export.js

async function capturePageAsImage(comicCreatorUrl, outputDirectory, projectState, outputPdfPath) {
  // ... (Puppeteer browser launch and page setup) ...
  
  // Set a global flag indicating Puppeteer environment
  await page.evaluateOnNewDocument(() => {
    window.IS_PUPPETEER_EXPORT = true;
  });

  // ... (navigation, viewport setup, request interception, console/error logging) ...
  
  // Wait for the comic canvas to be ready
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#comic-canvas');
    return canvas && window.getComputedStyle(canvas).display !== 'none';
  }, { timeout: 60000 });

  // Inject CSS to ensure consistent rendering for screenshots
  await page.addStyleTag({
    content: `
      #comic-canvas {
        transform: none !important;
        transition: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
      }
      .text-bubble { /* Ensures text bubbles are rendered statically */
        transform-origin: center center !important; /* Important for rotated text */
        transition: none !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      /* ... other styles for stickers, panel images, background ... */
    `
  });

  // Load the project state (containing text bubble data for this page) into the client
  console.log('[Puppeteer] Exposing window.getPuppeteerProjectState function...');
  await page.exposeFunction('getPuppeteerProjectState', () => {
      return JSON.stringify(projectState); // projectState here is the single-page state
  });

  console.log('[Puppeteer] Attempting to call _loadProjectFromState via page.evaluate...');
  const loadResult = await page.evaluate(async () => {
      console.log('[Page Eval - Load] Entered page.evaluate for _loadProjectFromState.');
      let stateFromNode;
      try {
          const projectStateJSON = await window.getPuppeteerProjectState();
          stateFromNode = JSON.parse(projectStateJSON);
      } catch (e) {
          console.error('[Page Eval - Load] Error getting/parsing state:', e);
          return { success: false, error: `Error getting/parsing state: ${e.message}` };
      }
    
      if (window.comicCreator && typeof window.comicCreator._loadProjectFromState === 'function') {
          try {
              await window.comicCreator._loadProjectFromState(stateFromNode);
              // This triggers TextManagerState.loadTextStates() on the client,
              // which in turn calls restoreTextBubble() for each text item.
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for rendering
              return { success: true };
          } catch (e) {
              console.error('[Page Eval - Load] Error executing _loadProjectFromState:', e);
              return { success: false, error: `Error in _loadProjectFromState: ${e.message}` };
          }
      } else {
          return { success: false, error: 'comicCreator or _loadProjectFromState not found/not a function' };
      }
  });

  if (!loadResult || !loadResult.success) {
      throw new Error(`Project loading failed in Puppeteer: ${loadResult.error}`);
  }

  // ... (wait for images to load, final rendering delay) ...

  // Logic to hide non-canvas elements and take a screenshot of #comic-canvas
  // ... (details omitted for brevity, see full file)
  const canvasElement = await page.$('#comic-canvas');
  const boundingBox = await canvasElement.boundingBox(); // Or use fixed dimensions
  
  // Ensure boundingBox is valid and adjust clip for screenshot
  const clip = {
      x: boundingBox.x,
      y: boundingBox.y,
      width: Math.min(boundingBox.width, /* max desired width */ 1920), // Example constraint
      height: Math.min(boundingBox.height, /* max desired height */ 1080) // Example constraint
      // Often fixed to specific dimensions like 700x700 based on other parts of the code
  };
  
  // Force specific dimensions for screenshot if needed (as seen in parts of the codebase)
  // For example, if canvas should always be captured at 700x700 for the PDF page
  // const screenshotOptions = { path: pngScreenshotPath, clip: { x: boundingBox.x, y: boundingBox.y, width: 700, height: 700 } };
  // const pngScreenshotBuffer = await page.screenshot(screenshotOptions);

  // More generic approach for screenshotting the canvas element:
  const pngScreenshotBuffer = await canvasElement.screenshot();


  // Create a PDF page with this screenshot
  const pdfDoc = await PDFDocument.create();
  const pageOfPdf = pdfDoc.addPage([boundingBox.width, boundingBox.height]); // Use actual dimensions
  const pngImage = await pdfDoc.embedPng(pngScreenshotBuffer);
  pageOfPdf.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: boundingBox.width,
    height: boundingBox.height,
  });

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPdfPath, pdfBytes); // Saves the single-page PDF

  // ... (restore hidden elements, browser close) ...
  return outputPdfPath;
}
```

**Explanation of Text Bubble Handling During Export:**
1.  **State Loading:** The `projectState` (which is the `stateForSinglePage`) is passed to the client-side `comicCreator._loadProjectFromState()` method. This method is expected to use `TextManagerState.loadTextStates(pageDataFromState)` to repopulate the page.
2.  **Restoration:** `TextManagerState.loadTextStates()` iterates through the text states (e.g., `pageDataFromState.panelTextStates[0]`, `pageDataFromState.canvasTextElements`) and calls a function like `restoreTextBubble(textState, parentElement)` for each. This function (part of `TextManagerState.js` or a related utility) is responsible for:
    - Creating the `.text-bubble` and `.text-content` divs.
    - Setting the `innerHTML` of `.text-content` with the saved `content`.
    - Applying all the saved `style` properties (position, dimensions, colors, fonts, padding, transform, text shadow, outline attributes, etc.) directly to the elements or via CSS variables.
    - Recreating the bubble tail based on `tailType`, `tailPosition`, and `tailSettings`.
3.  **CSS Injection for Screenshotting:**
    - Critical CSS rules are injected via `page.addStyleTag()`. For `.text-bubble`, this includes:
        - `transform-origin: center center !important;`: This is crucial if text bubbles can be rotated. It ensures rotations are calculated from the center.
        - `transition: none !important;`: Disables any CSS transitions that might be active.
        - `opacity: 1 !important; visibility: visible !important;`: Ensures the bubble is fully visible and not faded out.
    - These styles override any existing styles to ensure the text bubbles are rendered in a static, predictable way for the screenshot.
4.  **Screenshot:** Puppeteer takes a screenshot of the `#comic-canvas`. Since the text bubbles have been recreated with all their saved properties and styled for static display, they are captured accurately in the image.
5.  **PDF Assembly:** The screenshot (PNG) is then embedded into a PDF page. This process is repeated for each page of the comic, and the individual PDFs are merged.

## 3. Client-Side Restoration (Conceptual)

While not directly part of the export script, the client-side `TextManagerState.js` must have a corresponding `loadTextStates` and `restoreTextBubble` (or similar) mechanism.

### `src/js/modules/TextManagerState.js` (Conceptual `restoreTextBubble`)

```javascript
// Conceptual structure within TextManagerState.js or a utility it uses
// (The actual implementation might be spread across several methods)

// restoreTextBubble(textState, parentElement) {
//     const textBubble = document.createElement('div');
//     textBubble.id = textState.id;
//     textBubble.className = 'text-bubble'; // Base class
//     if (textState.bubbleType) {
//         textBubble.classList.add(textState.bubbleType); // e.g., 'speech-bubble'
//         textBubble.dataset.bubbleType = textState.bubbleType;
//     }
//     if (textState.previousBubbleType) {
//        textBubble.dataset.previousBubbleType = textState.previousBubbleType;
//     }
//     // Add tail position classes if applicable (e.g., 'speech-tail-top-left')
//     // ...

//     textBubble.style.position = 'absolute';
//     textBubble.style.left = textState.style.left || textState.originalPosition.left;
//     textBubble.style.top = textState.style.top || textState.originalPosition.top;
//     textBubble.style.width = textState.style.width || textState.originalPosition.width;
//     textBubble.style.height = textState.style.height || textState.originalPosition.height;
//     if (textState.style.transform) {
//         textBubble.style.transform = textState.style.transform;
//     }
//     if (textState.style.zIndex) {
//         textBubble.style.zIndex = textState.style.zIndex;
//     }
//     if (textState.style.bubbleBackgroundColor) {
//         textBubble.style.setProperty('--bubble-background-color', textState.style.bubbleBackgroundColor);
//     } else if (textState.style.backgroundColor) { // Fallback if specific var not set
//         textBubble.style.backgroundColor = textState.style.backgroundColor;
//     }
//     if (textState.style.bubbleOpacity) {
//         textBubble.style.setProperty('--bubble-opacity', textState.style.bubbleOpacity);
//     }
//     if (textState.style.padding) { // General padding
//         textBubble.style.padding = textState.style.padding;
//     }
//     // Specific paddings might need to be applied based on how they are stored and used
//     textBubble.dataset.paddingVertical = textState.style.paddingVertical || '';
//     textBubble.dataset.paddingHorizontal = textState.style.paddingHorizontal || '';
//     textBubble.dataset.bubblePadding = textState.style.bubblePadding || '';


//     const textContentElement = document.createElement('div');
//     textContentElement.className = 'text-content';
//     textContentElement.innerHTML = textState.content; // Restore rich text

//     // Apply text-specific styles
//     Object.keys(textState.style).forEach(key => {
//         if (['color', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'lineHeight', 'textAlign', 'textTransform', 'textShadow'].includes(key)) {
//             if (textState.style[key]) {
//                 textContentElement.style[key] = textState.style[key];
//             }
//         }
//     });

//     if (textState.style.hasOutline) {
//         textContentElement.setAttribute('data-has-outline', 'true');
//         textContentElement.setAttribute('data-outline-color', textState.style.outlineColor);
//         // comicCreator.textManagerStyling.applyTextOutline(textContentElement, textState.style.outlineColor, textState.style.outlineThickness); // Example call
//     }
    
//     // Logic to recreate tail SVG using textState.tailType, textState.tailPosition, textState.tailSettings
//     // This would involve calling methods from TextManagerStyling.js, e.g.,
//     // this.comicCreator.textManagerStyling.createSpeechBubbleSvgTail(textBubble, parsedTailSettings);
//     // Or directly manipulating SVG elements and attaching them.
//     // const tailSettings = textState.tailSettings ? JSON.parse(textState.tailSettings) : null;
//     // if (tailSettings) { ... create and append tail ... }


//     textBubble.appendChild(textContentElement);
//     parentElement.appendChild(textBubble);

//     // After appending, potentially call functions to finalize tail or other dynamic elements
//     // For example, if finalizeTextBubblePosition is needed:
//     // if (this.comicCreator.textManagerUtils && this.comicCreator.textManagerUtils.finalizeTextBubblePosition) {
//     //     this.comicCreator.textManagerUtils.finalizeTextBubblePosition(textBubble, textState);
//     // }
//     return textBubble;
// }
```

**Explanation:**
- This conceptual `restoreTextBubble` function shows how each property saved in `textState` would be applied back to newly created DOM elements.
- Styles are applied directly.
- `innerHTML` is used for text content to preserve formatting.
- Custom data attributes and CSS variables are set.
- Placeholder comments indicate where calls to other modules (like `TextManagerStyling` for tails or applying outlines) would occur.

This detailed saving and restoration process, combined with Puppeteer's rendering capabilities and CSS overrides, aims for a high-fidelity capture of text bubbles and other comic elements for PDF export.

## 4. CSS Overrides for Screenshotting Accuracy

Two main CSS mechanisms work together to ensure text bubbles are rendered correctly for screenshots by Puppeteer:

**A. Puppeteer Injected Styles (`page.addStyleTag`)**
   - As shown in `capturePageAsImage`, Puppeteer injects some general CSS overrides. For text bubbles, this typically ensures:
     - `transform-origin: center center !important;` (important for consistent rotation)
     - `transition: none !important;` (disables animations)
     - `opacity: 1 !important; visibility: visible !important;` (ensures bubbles are fully visible)
   - These are forceful, immediate overrides applied by Puppeteer.

**B. `.exporting` Class in `main.css`**
   - The application's main stylesheet (`src/styles/main.css`) contains a comprehensive set of rules under an `.exporting` class. This class is likely added to the `document.body` when `window.IS_PUPPETEER_EXPORT` is true.
   - These rules are more detailed and target specific aspects of text bubbles and their content for export:
    ```css
    /* Simplified examples from main.css */
    .exporting .text-bubble {
        border: 2px solid rgba(0, 0, 0, 0.7) !important;
        opacity: 1 !important;
        margin: 0 !important;
        padding-bottom: 0 !important;
        display: inline-block !important; /* Critical for layout */
        transform-origin: top left !important; /* For precise transform */
        /* ... other overrides ... */
    }

    .exporting .text-bubble .text-content {
        /* CRITICAL: Ensures exact text rendering as seen in preview */
        transform: none !important;
        zoom: normal !important;
        line-height: normal !important; /* Comments indicate use of computed value */
        white-space: pre-wrap !important;
        padding: inherit !important; /* Comments indicate use of computed value */
        display: inline-block !important;
        overflow: hidden !important; /* Prevents unexpected scrollbars */
        /* ... many other properties to lock down text appearance ... */
    }

    /* Rules for .exporting .speech-bubble::after, .thought-bubble tails, etc. to fix their appearance */
    /* Hiding editor-specific controls like .resize-handle */
    .exporting .resize-handle, .exporting .drag-handle { display: none !important; }
    ```
   - **Impact**: These CSS rules ensure that during export:
     - Text bubbles have a consistent, visible border.
     - Text content rendering (line height, spacing, wrapping, padding) closely matches the editor preview by overriding browser defaults or dynamic styles.
     - Animations and transitions are disabled.
     - Editor-specific UI handles are hidden.
     - Tails for speech and thought bubbles are styled correctly for static capture.

**Interplay**: The JavaScript restoration (`restoreTextBubble` and `finalizeTextBubblePosition`) applies the saved styles. Then, the `.exporting` CSS rules (from `main.css`) and Puppeteer's injected styles provide a final layer of overrides to ensure that what is rendered in the headless browser is static, predictable, and as close to the intended appearance as possible for the screenshot. The special block within `restoreTextBubble` for export mode further bridges this by applying critical styles directly based on saved state during element creation in the Puppeteer context.

This detailed saving, restoration, and styling process aims for a high-fidelity capture of text bubbles and other comic elements for PDF export.
