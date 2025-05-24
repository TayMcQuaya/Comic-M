# Image Storage Migration: Base64 to File Paths

## 1. Overall Goal

Transition the comic creator application from storing images as base64 encoded strings within the project JSON to storing them as actual files on the server and referencing them via file paths (URLs) in the project JSON. This will improve performance, reduce JSON file sizes, and make image management more straightforward.

## 2. Affected Modules & Files

This migration will primarily affect the following:

*   **Server-Side (Node.js/Express within Vite):**
    *   `vite.config.js`: To potentially add middleware for handling file uploads (e.g., `multer`) and to ensure the new API endpoint is correctly configured.
    *   A new or modified module for handling image uploads (e.g., integrated into `src/server/puppeteer-export.js` or a new `src/server/image-upload-handler.js`).
*   **Client-Side (JavaScript in `src/js/`):**
    *   `src/js/main.js` (`ComicCreator` class):
        *   `handleImageUpload()`: To send image files to the server instead of reading them as data URLs.
        *   `saveProject()` and `getCurrentProjectState()`: To store image file paths/URLs in the project state.
        *   `_loadProjectFromState()`: To correctly load images using their file paths/URLs.
        *   `ImageLibrary` (if image data is cached or manipulated there beyond just src).
    *   `src/js/modules/ProjectStorageManager.js`: While this mainly calls `comicCreator.saveProject()`, it's good to be aware of its role in the save/load flow.
*   **PDF Export:**
    *   `src/server/puppeteer-export.js`: To ensure it correctly handles project states with image file paths, ensuring Puppeteer can access and render these images from their URLs.

## 3. Step-by-Step Implementation Guide

### Phase 1: Server-Side Implementation (Image Upload Endpoint) - COMPLETE

**Goal:** Create an API endpoint that accepts image file uploads, saves them to the server, and returns a web-accessible path.

**Step 3.1.1: Choose an Upload Directory - COMPLETE**
    *   Chosen directory: `public/uploads/project_images/`.
    *   Added to `.gitignore`.

**Step 3.1.2: Install Middleware for File Uploads (Optional but Recommended) - COMPLETE**
    *   `multer` installed via `npm install multer`.

**Step 3.1.3: Create the Image Upload API Endpoint - COMPLETE**
    *   Implemented in `vite.config.js` using the Express `app` instance.
    *   The endpoint is `POST /api/upload-image` (since the Express `app` is mounted at `/api`, and the route within the app is `/upload-image`).
    *   **Additional Details Implemented:**
        *   Uses `multer.diskStorage` to save files to `public/uploads/project_images/`.
        *   Generates unique filenames using `file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)`.
        *   Includes a file size limit (10MB) and a file filter for common image types (jpg, jpeg, png, gif, webp).
        *   Returns ` { "imageUrl": "/uploads/project_images/filename.ext", "filename": "filename.ext" }` on success.
        *   Includes error handling for file validation (via `req.fileValidationError`), Multer errors (e.g., `LIMIT_FILE_SIZE`), and other general upload errors.

### Phase 2: Client-Side Implementation - COMPLETE

**Goal:** Modify the client-side JavaScript to upload images to the server and use file paths.

**Step 3.2.1: Update Image Upload Logic (`src/js/modules/ImageLibrary.js` - `handleImageUpload`) - COMPLETE**
    *   Modified `ImageLibrary.handleImageUpload(files)`:
        *   Iterates through files, creates `FormData`, and `POST`s to `/api/upload-image`.
        *   Receives `imageUrl` and `filename` from the server.
        *   Gets image dimensions client-side by creating an `Image` object and loading the `imageUrl`.
        *   Stores the server-provided `imageUrl` as `src` in the `imageData` object.
        *   `isObjectURL` is set to `false`.
        *   Calls `this.addImages()` and `this.#addThumbnailToGrid()`.
        *   The Web Worker (`#imageProcessingWorker`) is bypassed for this specific upload flow.

**Step 3.2.2: Update Project Saving (`src/js/main.js` - `saveProject` & `getCurrentProjectState`) - COMPLETE**
    *   In `ComicCreator.saveProject()` and `ComicCreator.getCurrentProjectState()`:
        *   Removed the logic that converted blob/object URLs to data URLs.
        *   The `imagesToSave` array is now a direct map of `this.imageLibrary.getImages()`, using the `img.src` (which is the server path) directly.

**Step 3.2.3: Update Project Loading (`src/js/main.js` - `_loadProjectFromState`) - COMPLETE (No code change needed here due to previous steps)**
    *   `ComicCreator._loadProjectFromState(projectState)` already correctly processes `projectState.images`.
    *   It passes the loaded image objects (which will now contain server file paths in `src`) to `this.imageLibrary.addImages()`.
    *   The `isObjectURL: false` assignment in this method remains correct for persistent server URLs.

### Phase 3: Puppeteer Export Adjustments - COMPLETE (Verification Pending Thorough Testing)

**Goal:** Ensure the PDF export functionality correctly renders images using their new file paths.

**Step 3.3.1: Verify Image URLs in Puppeteer Context (`src/server/puppeteer-export.js`) - VERIFIED**
    *   The `createSinglePageProjectState` function correctly passes through image objects from the main project state.
    *   Since the main project state will now contain server file paths in `image.src`, these paths will be correctly included in the state sent to Puppeteer.
    *   The `comicCreatorUrl` combined with these relative image paths (e.g., `/uploads/project_images/...`) should form valid URLs for Puppeteer's browser instance to fetch, assuming the server is serving the `public/uploads` directory.

**Step 3.3.2: No Major Code Change Expected in `capturePageAsImage` for Image Rendering - VERIFIED**
    *   No direct code changes to image handling within `capturePageAsImage` are required for this migration.
    *   The existing logic that waits for images to load on the page before capture should ensure server-loaded images are rendered.
    *   Successful rendering depends on the client-side code (running in Puppeteer) correctly setting `<img>` tags with these server paths and the server correctly serving the images.

### Phase 4: Testing and Refinement - IN PROGRESS

**Step 3.4.1: Server-Side Testing - IN PROGRESS**
    *   Use a tool like Postman or `curl` to test the `/api/upload-image` endpoint directly. Verify that files are saved to the correct directory and that the JSON response contains the correct `imageUrl`.
    *   Alternatively, use the application UI to upload an image and monitor the network request/response via browser developer tools, then check the `public/uploads/project_images/` directory.

**Step 3.4.2: Client-Side Testing**
    *   **Image Upload:** Test uploading various image types and sizes. Verify they appear in the image library and on the canvas. Check browser console for errors. Check the server's `public/uploads/project_images/` directory.
    *   **Project Saving:** Save a project with images. Inspect the downloaded JSON file to confirm image `src` values are file paths, not base64.
    *   **Project Loading:** Load the saved project. Verify all images load correctly from their server paths. Test with projects saved before and after the change (if backward compatibility for old base64 projects is NOT a goal, otherwise this needs more planning).
    *   **Broken Links:** Manually rename or delete an image from the server's upload directory and then try to load a project that uses it. Observe how the application handles the missing image (it should ideally show a placeholder or error).

**Step 3.4.3: PDF Export Testing**
    *   Export comics with images to PDF. Verify all images are rendered correctly in the PDF.
    *   Test with various layouts and image combinations.

**Step 3.4.4: Ensure No Regressions**
    *   Test other functionalities (layouts, text, stickers, panel manipulation, etc.) to ensure they haven't been inadvertently affected.

## 4. Key Considerations for Non-Disruption

*   **Relative vs. Absolute URLs:** Using root-relative URLs for images (e.g., `/uploads/project_images/img.png`) is generally robust as it works irrespective of the specific domain, as long as the server serves from the root.
*   **Error Handling:** Implement robust error handling for image uploads (network errors, server errors, file type restrictions if any) and for image loading on the client (e.g., what happens if an image path is broken).
*   **Security (If applicable beyond local development):** If this application were to be deployed publicly, consider security implications for file uploads (file type validation, size limits, sanitizing filenames, etc.). `multer` provides some of these.
*   **Backward Compatibility (Optional):** If you need to load old projects that still use base64 images, the `_loadProjectFromState` method would need logic to detect if `image.src` is a data URL or a file path and handle it accordingly. For this plan, we are assuming a clean switch.
*   **Image Optimization (Future Scope):** Consider adding server-side image optimization (e.g., compressing images on upload) to save storage and bandwidth.

This plan provides a structured approach. Each step should be implemented and tested carefully. 