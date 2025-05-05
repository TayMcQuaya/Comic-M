// import { ComicCreator } from '../main.js'; // Removed: main.js doesn't export the class

// Constants for storage keys
const AUTOSAVE_FLAG_KEY = 'comicCreator_autoSaveExists';
const AUTOSAVE_METADATA_KEY = 'comicCreator_autoSaveData';
const AUTOSAVE_DB_NAME = 'comicCreatorAutoSaveDB';
const AUTOSAVE_IMAGE_STORE = 'autoSaveImages';
const AUTOSAVE_INTERVAL = 30000; // Auto-save every 30 seconds

export class AutoSaveManager {
    /**
     * @param {ComicCreator} comicCreatorInstance
     */
    constructor(comicCreatorInstance) {
        this.comicCreator = comicCreatorInstance;
        this.db = null; // To hold the IndexedDB instance
        this.saveIntervalId = null; // To hold the interval timer ID
        this.isSaving = false; // Flag to prevent concurrent saves
        this.saveQueued = false; // Flag to queue a save if one is in progress

        // Bind methods to ensure 'this' context is correct
        this.performAutoSave = this.performAutoSave.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.promptLoadAutoSave = this.promptLoadAutoSave.bind(this);
        this.loadAutoSave = this.loadAutoSave.bind(this);
        this.clearAutoSave = this.clearAutoSave.bind(this);
    }

    /**
     * Initializes the AutoSaveManager, checks for existing auto-save,
     * and starts the auto-save timer.
     */
    async init() {
        console.log("[AutoSave] Initializing AutoSaveManager...");
        try {
            await this.openDatabase();
            const autoSaveFlagValue = localStorage.getItem(AUTOSAVE_FLAG_KEY);
            console.log(`[AutoSave] Read flag '${AUTOSAVE_FLAG_KEY}' from localStorage:`, autoSaveFlagValue);
            const autoSaveExists = autoSaveFlagValue === 'true';

            if (autoSaveExists) {
                console.log("[AutoSave] Existing auto-save found. Preparing to prompt user...");
                await this.promptLoadAutoSave(); // Ask user if they want to load it
            } else {
                console.log("[AutoSave] No existing auto-save found or flag not set to 'true'.");
            }

            // Start the periodic auto-save timer
            this.saveIntervalId = setInterval(this.performAutoSave, AUTOSAVE_INTERVAL);
            console.log(`Auto-save interval started (${AUTOSAVE_INTERVAL / 1000} seconds).`);

            // Add listener for final save before leaving
            window.addEventListener('beforeunload', this.handleBeforeUnload);

        } catch (error) {
            console.error("[AutoSave] Failed to initialize AutoSaveManager:", error);
            this.comicCreator.uiManager.showNotification("Auto-save system failed to initialize.", "error");
        }
    }

    /**
     * Opens the IndexedDB database.
     * @returns {Promise<void>}
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(AUTOSAVE_DB_NAME, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(AUTOSAVE_IMAGE_STORE)) {
                    db.createObjectStore(AUTOSAVE_IMAGE_STORE, { keyPath: 'id' });
                    console.log(`IndexedDB object store '${AUTOSAVE_IMAGE_STORE}' created.`);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB opened successfully.");
                resolve();
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Handles the window beforeunload event to perform a final save.
     * Note: Modern browsers might restrict complex operations here.
     * We primarily rely on the interval timer.
     */
    handleBeforeUnload(event) {
        console.log("beforeunload event triggered. Attempting final auto-save.");
        // No confirmation message needed as we save automatically
        // event.preventDefault(); // Not needed and can be problematic
        // event.returnValue = ''; // Not needed

        // Attempt a synchronous save if possible, or rely on the last interval save.
        // Complex async operations (like IndexedDB) are unreliable here.
        // The periodic save is the main safety net.
        if (!this.isSaving) {
             // Maybe try a synchronous save to localStorage only?
             // But IndexedDB is the core part, so we mostly rely on the interval.
             console.log("Skipping final save during unload due to potential unreliability.");
        }
    }

    /**
     * Prompts the user to load the existing auto-saved data.
     * @returns {Promise<void>}
     */
    async promptLoadAutoSave() {
        try {
            const choice = await this.comicCreator.uiManager.showConfirmationModal(
                "Restore Session?",
                "An auto-saved session was found. Do you want to restore it?",
                ["Restore", "Discard"] // Keep options simple
            );

            if (choice === "Restore") {
                console.log("[AutoSave] User chose to restore auto-save.");
                // --- Clear the flag *before* loading to prevent loop --- 
                localStorage.removeItem(AUTOSAVE_FLAG_KEY);
                console.log("[AutoSave] Cleared auto-save flag before attempting load.");
                // --- End flag clearing ---

                await this.loadAutoSave();
                // Clear the rest of the auto-save data (metadata + IndexedDB) after successful load
                await this.clearAutoSave(false); // Pass false to skip clearing the flag again
                this.comicCreator.uiManager.showNotification("Session restored from auto-save.", "success");
            } else {
                console.log("[AutoSave] User chose to discard auto-save.");
                // Clear all auto-save data if discarded
                await this.clearAutoSave(true); // Pass true to clear everything including the flag
                this.comicCreator.uiManager.showNotification("Auto-saved session discarded.", "info");
            }
        } catch (error) {
            console.error("[AutoSave] Error during auto-save prompt/load:", error);
            this.comicCreator.uiManager.showNotification("Failed to handle auto-saved session.", "error");
            // Clear potentially corrupted auto-save data
            await this.clearAutoSave(true);
        }
    }

    /**
     * Retrieves project metadata (excluding image data) from ComicCreator.
     * @returns {object | null} Project metadata or null if error.
     */
    getProjectMetadata() {
        try {
             // Ensure current page state is captured before getting metadata
            this.comicCreator.saveCurrentPageState();

            // Prepare metadata structure (similar to saveProject but without images array)
             const metadata = {
                version: '1.3-autosave', // Indicate format
                useGlobalBackgroundStyle: this.comicCreator.useGlobalBackgroundStyle,
                globalBackgroundStyle: this.comicCreator.globalBackgroundStyle,
                pages: this.comicCreator.pages, // Keep full page data (panel/text/sticker state)
                currentPageIndex: this.comicCreator.currentPageIndex,
                folderStructure: this.comicCreator.folderStructure,
                currentFolderId: this.comicCreator.currentFolderId,
                // Do NOT include the main 'images' array here
            };
            return metadata;
        } catch (error) {
            console.error("Error getting project metadata for auto-save:", error);
            return null;
        }
    }

    /**
     * Performs the auto-save operation: saves metadata to localStorage
     * and image blobs to IndexedDB.
     * @returns {Promise<void>}
     */
    async performAutoSave() {
        if (this.isSaving) {
            console.log("[AutoSave] Auto-save already in progress, queuing next save.");
            this.saveQueued = true; // Queue a save to run after the current one finishes
            return;
        }

        this.isSaving = true;
        console.log("[AutoSave] Performing auto-save...");

        let transaction;
        try {
            const metadata = this.getProjectMetadata();
            if (!metadata) {
                throw new Error("Failed to retrieve project metadata.");
            }

            // 1. Save metadata to localStorage (do this first, it's quick)
            localStorage.setItem(AUTOSAVE_METADATA_KEY, JSON.stringify(metadata));
            localStorage.setItem(AUTOSAVE_FLAG_KEY, 'true');
            console.log("[AutoSave] Metadata saved to localStorage.");

            // 2. Prepare image data for IndexedDB
            const imagesFromLibrary = this.comicCreator.imageLibrary.getImages();
            if (!this.db) {
                 console.warn("[AutoSave] IndexedDB not available, skipping image auto-save.");
                 // Set flag only after metadata save, but notify if images skipped
                 this.comicCreator.uiManager.showNotification("Progress saved (metadata only).", "warning");
                 return; // Exit if DB not available
            }

            console.log(`[AutoSave] Preparing ${imagesFromLibrary.length} images for IndexedDB...`);

            // --- Fetch all blobs first --- 
            const fetchPromises = imagesFromLibrary.map(async (img) => {
                if (!img.id || !img.src) return { id: img.id, status: 'skipped', reason: 'Missing id or src' };

                try {
                    let blob;
                    if (img.src.startsWith('blob:')) {
                        const response = await fetch(img.src);
                        if (!response.ok) throw new Error(`Failed to fetch blob URL (status: ${response.status})`);
                        blob = await response.blob();
                    } else if (img.src.startsWith('data:')) {
                        const response = await fetch(img.src);
                        if (!response.ok) throw new Error(`Failed to fetch data URL (status: ${response.status})`);
                        blob = await response.blob();
                    } else {
                        throw new Error('Unsupported src type');
                    }
                    return { id: img.id, name: img.name, blob: blob, status: 'fetched' };
                } catch (error) {
                    console.error(`[AutoSave] Failed to fetch blob for image ${img.id} (${img.name}):`, error);
                    return { id: img.id, name: img.name, status: 'error', reason: error.message };
                }
            });

            // Wait for all fetches to complete (or fail)
            const fetchedImageResults = await Promise.allSettled(fetchPromises);

            const imagesToStore = fetchedImageResults
                .filter(result => result.status === 'fulfilled' && result.value.status === 'fetched')
                .map(result => result.value);

            const fetchErrors = fetchedImageResults
                 .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.status === 'error')).length;

             console.log(`[AutoSave] Fetched ${imagesToStore.length} image blobs successfully. ${fetchErrors} errors occurred.`);
            // --- End blob fetching --- 

            // 3. Save fetched images to IndexedDB in a single transaction
            transaction = this.db.transaction(AUTOSAVE_IMAGE_STORE, 'readwrite');
            const store = transaction.objectStore(AUTOSAVE_IMAGE_STORE);

            // Use Promise.all for DB operations within the transaction scope
            await new Promise((resolve, reject) => {
                // Handle transaction completion/error globally
                transaction.oncomplete = () => {
                     console.log("[AutoSave] IndexedDB transaction completed successfully.");
                     resolve();
                 };
                 transaction.onerror = (event) => {
                     console.error("[AutoSave] IndexedDB transaction error:", event.target.error);
                     reject(event.target.error); // Reject the main promise on transaction error
                 };

                // Start operations: Clear first
                const clearRequest = store.clear();
                clearRequest.onerror = (event) => {
                    // Don't reject immediately, let transaction handler catch it
                    console.error("[AutoSave] Error clearing store:", event.target.error);
                };
                clearRequest.onsuccess = () => {
                    console.log("[AutoSave] Cleared existing images from IndexedDB store.");
                    // After clear succeeds, put all images
                    if (imagesToStore.length === 0) {
                        console.log("[AutoSave] No images to store in IndexedDB.");
                        // If nothing to put, the transaction might complete here
                        return;
                    }
                    let putCount = 0;
                    imagesToStore.forEach(imgData => {
                        const putRequest = store.put({ id: imgData.id, blob: imgData.blob, name: imgData.name });
                        putRequest.onsuccess = () => {
                            putCount++;
                            // Check if this is the last put, though transaction.oncomplete is more reliable
                             if (putCount === imagesToStore.length) {
                                console.log(`[AutoSave] Finished putting ${putCount} images.`);
                            }
                        };
                         putRequest.onerror = (event) => {
                             // Don't reject immediately, let transaction handler catch it
                             console.error(`[AutoSave] Error putting image ${imgData.id}:`, event.target.error);
                         };
                    });
                };
            }); // End of DB operation Promise

            // Subtle notification maybe?
            // console.log("[AutoSave] Progress auto-saved.");

        } catch (error) {
            console.error("[AutoSave] Auto-save failed:", error);
             localStorage.setItem(AUTOSAVE_FLAG_KEY, 'false'); // Ensure flag is false on error
             this.comicCreator.uiManager.showNotification("Auto-save failed.", "error");
             // Abort transaction if it's still active and an error occurred outside of it
             if (transaction && transaction.readyState !== 'done') {
                 try {
                     transaction.abort();
                     console.log("[AutoSave] Aborted potentially active transaction due to error.")
                 } catch (abortError) {
                     console.error("[AutoSave] Error aborting transaction:", abortError)
                 }
             }
        } finally {
            this.isSaving = false;
            console.log("[AutoSave] Auto-save process finished.");
            // If a save was queued while this one was running, run it now
            if (this.saveQueued) {
                 this.saveQueued = false;
                 console.log("[AutoSave] Running queued auto-save.");
                 setTimeout(this.performAutoSave, 100);
             }
        }
    }

    /**
     * Loads the auto-saved state from localStorage and IndexedDB.
     * @returns {Promise<void>}
     */
    async loadAutoSave() {
        console.log("[AutoSave] Attempting to load auto-save data...");
        if (!this.db) {
             console.error("[AutoSave] IndexedDB not available during load attempt.");
             throw new Error("IndexedDB not available. Cannot load images.");
        }

        try {
            // 1. Load metadata
            const metadataString = localStorage.getItem(AUTOSAVE_METADATA_KEY);
            console.log(`[AutoSave] Retrieved metadata string (length ${metadataString?.length}) from localStorage.`);
            if (!metadataString) {
                throw new Error("Auto-save metadata not found in localStorage.");
            }
            const projectState = JSON.parse(metadataString);
            console.log("[AutoSave] Parsed metadata successfully.", projectState);

            // 2. Load images from IndexedDB
            console.log("[AutoSave] Starting transaction to load images from IndexedDB...");
            const transaction = this.db.transaction(AUTOSAVE_IMAGE_STORE, 'readonly');
            const store = transaction.objectStore(AUTOSAVE_IMAGE_STORE);
            const imageRecords = await new Promise((resolve, reject) => {
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = () => resolve(getAllRequest.result);
                getAllRequest.onerror = () => reject(getAllRequest.error);
            });
            console.log(`[AutoSave] Retrieved ${imageRecords.length} image records from IndexedDB.`);

            // --- Moved Steps: Reset Project FIRST --- 
            // 3. Reset existing state before loading anything visually or into the library
            await this.comicCreator.resetProject(false); // Pass false to skip layout nav
            console.log("[AutoSave] Called resetProject to clear current state.");
            // --- End Moved Steps ---

            // 4. Reconstruct the 'images' array from blobs AFTER resetting
            const loadedImages = imageRecords.map(record => {
                if (!record.blob) {
                     console.warn(`[AutoSave] Missing blob data for image ID ${record.id} in auto-save.`);
                     return null;
                }
                const objectURL = URL.createObjectURL(record.blob);
                return {
                    id: record.id,
                    name: record.name || `Image ${record.id}`,
                    src: objectURL,
                    isObjectURL: true,
                };
            }).filter(img => img !== null);
            console.log(`[AutoSave] Created ${loadedImages.length} Object URLs from blobs.`);

            // 5. Add loaded images to the *now empty* image library
            this.comicCreator.imageLibrary.addImages(loadedImages);
            console.log(`[AutoSave] Added ${loadedImages.length} images to ImageLibrary.`);

            // 6. Restore ComicCreator state (pages, folders, index, etc.) using the loaded metadata
            this.comicCreator.useGlobalBackgroundStyle = projectState.useGlobalBackgroundStyle;
            this.comicCreator.globalBackgroundStyle = projectState.globalBackgroundStyle;
            this.comicCreator.backgroundManager.useGlobalBackgroundStyle = projectState.useGlobalBackgroundStyle;
            this.comicCreator.backgroundManager.globalBackgroundStyle = projectState.globalBackgroundStyle;

            this.comicCreator.pages = projectState.pages;
            this.comicCreator.currentPageIndex = projectState.currentPageIndex;
            this.comicCreator.folderStructure = projectState.folderStructure;
            this.comicCreator.currentFolderId = projectState.currentFolderId;

            // Ensure currentFolderId exists
            if (!this.comicCreator.folderStructure[this.comicCreator.currentFolderId]) {
                console.warn(`[AutoSave] Auto-saved current folder ID ${this.comicCreator.currentFolderId} not found, resetting to root`);
                this.comicCreator.currentFolderId = 'root';
            }
            console.log("[AutoSave] Restored ComicCreator metadata state (pages, folders, index)...");

            // 7. Update UI (Library Thumbnails - AFTER library is populated)
            this.comicCreator.imageLibrary.updateThumbnails();
            console.log("[AutoSave] Updated image library thumbnails.");

            // 8. Load the page visually (AFTER state is restored and library populated)
            await this.comicCreator.loadPageState(this.comicCreator.currentPageIndex);
            console.log(`[AutoSave] Called loadPageState for index ${this.comicCreator.currentPageIndex}.`);

            // Update page navigation indicators
            this.comicCreator.updatePageIndicator();
            this.comicCreator.updateNavigationButtons();

            // Navigate to the editor page since we loaded a project state
            document.querySelector('#upload-page')?.classList.remove('active');
            document.querySelector('#layout-page')?.classList.remove('active');
            document.querySelector('#editor-page')?.classList.add('active');
            console.log("[AutoSave] Switched view to editor page.");

            console.log("[AutoSave] Auto-save loaded successfully.");

        } catch (error) {
            console.error("[AutoSave] Failed during loadAutoSave process:", error);
            this.comicCreator.uiManager.showNotification("Failed to restore auto-saved session.", "error");
            // Clear potentially corrupted data if loading failed
            await this.clearAutoSave();
             throw error; // Re-throw for the calling function (promptLoadAutoSave)
        }
    }

    /**
     * Clears all auto-save data from localStorage and IndexedDB.
     * @param {boolean} [clearFlag=true] - Whether to also clear the localStorage flag.
     * @returns {Promise<void>}
     */
    async clearAutoSave(clearFlag = true) {
        console.log("[AutoSave] Clearing auto-save data...");
        try {
            // Clear localStorage flags/data
            if (clearFlag) {
                localStorage.removeItem(AUTOSAVE_FLAG_KEY);
                console.log("[AutoSave] Cleared auto-save flag from localStorage.");
            }
            localStorage.removeItem(AUTOSAVE_METADATA_KEY);
            console.log("[AutoSave] Cleared auto-save metadata from localStorage.");

            // Clear IndexedDB store
            if (this.db) {
                const transaction = this.db.transaction(AUTOSAVE_IMAGE_STORE, 'readwrite');
                const store = transaction.objectStore(AUTOSAVE_IMAGE_STORE);
                const clearRequest = store.clear();

                await new Promise((resolve, reject) => {
                    clearRequest.onsuccess = resolve;
                    clearRequest.onerror = () => reject(clearRequest.error);
                    transaction.oncomplete = resolve; // Also resolve on transaction complete
                    transaction.onerror = () => reject(transaction.error); // Reject on transaction error
                });
                 console.log("Cleared auto-save data from IndexedDB.");
            } else {
                 console.warn("IndexedDB not available, skipping IndexedDB clear.");
             }
        } catch (error) {
            console.error("Failed to clear auto-save data:", error);
            // Show error, but don't block other operations
             this.comicCreator.uiManager.showNotification("Could not clear auto-save data.", "warning");
        }
    }

    /**
     * Stops the auto-save timer. Call this when the application is destroyed or reset.
     */
    stopAutoSaveTimer() {
        if (this.saveIntervalId) {
            clearInterval(this.saveIntervalId);
            this.saveIntervalId = null;
            console.log("Auto-save interval stopped.");
        }
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
} 