/**
 * Manages the image library, including uploaded images, selection, and rendering.
 */
export class ImageLibrary {
    /**
     * Creates an instance of ImageLibrary.
     * @param {ComicCreator} comicCreator - A reference to the main ComicCreator instance.
     */
    constructor(comicCreator) {
        this.comicCreator = comicCreator; // Store reference for accessing other parts (FolderSystem, panels, etc.)

        // Core image library data
        this.uploadedImages = [];    // Array<Object> - Stores metadata for all uploaded images {id, name, src, width, height}
        this.selectedAssets = [];    // Array<String> - Stores IDs of selected images/folders
        this.lastSelectedAsset = null; // String | null - ID of the last clicked asset for shift-selection

        console.log("ImageLibrary initialized");

        // --- NEW: Web Worker Initialization ---
        this.#imageProcessingWorker = null;
        this.#pendingImageFiles = 0; // Counter for files sent to worker
    }

    // --- Property Accessors --- 

    getImages() {
        return this.uploadedImages;
    }

    getImageById(imageId) {
        return this.uploadedImages.find(img => String(img.id) === String(imageId));
    }

    addImages(newImages) {
        this.uploadedImages.push(...newImages);
        // Update back to editor button when images are added
        if (this.comicCreator && this.comicCreator.updateBackToEditorButton) {
            this.comicCreator.updateBackToEditorButton();
        }
    }

    removeImage(imageId) {
        this.uploadedImages = this.uploadedImages.filter(img => String(img.id) !== String(imageId));
        // Also remove from selection if it was selected
        this.removeSelectedAsset(imageId);
        // Update back to editor button when images are removed
        if (this.comicCreator && this.comicCreator.updateBackToEditorButton) {
            this.comicCreator.updateBackToEditorButton();
        }
    }
    
    clearImages() {
        this.uploadedImages = [];
        this.selectedAssets = [];
        this.lastSelectedAsset = null;
        // Update back to editor button when images are cleared
        if (this.comicCreator && this.comicCreator.updateBackToEditorButton) {
            this.comicCreator.updateBackToEditorButton();
        }
    }

    getSelectedAssets() {
        return this.selectedAssets;
    }

    setSelectedAssets(assetIds) {
        this.selectedAssets = [...assetIds];
        // Update last selected based on the new array (optional, might be better handled by selection logic)
        if (assetIds.length > 0) {
            this.lastSelectedAsset = assetIds[assetIds.length - 1];
        } else {
            this.lastSelectedAsset = null;
        }
    }

    addSelectedAsset(assetId) {
        if (!this.selectedAssets.includes(assetId)) {
            this.selectedAssets.push(assetId);
        }
    }

    removeSelectedAsset(assetId) {
        const index = this.selectedAssets.indexOf(assetId);
        if (index !== -1) {
            this.selectedAssets.splice(index, 1);
        }
        // If the removed asset was the last selected, clear lastSelectedAsset
        if (this.lastSelectedAsset === assetId) {
            this.lastSelectedAsset = this.selectedAssets.length > 0 ? this.selectedAssets[this.selectedAssets.length - 1] : null;
        }
    }

    clearSelectedAssets() {
        this.selectedAssets = [];
        // Do not clear lastSelectedAsset here, selection logic might need it briefly
    }

    getLastSelectedAsset() {
        return this.lastSelectedAsset;
    }

    setLastSelectedAsset(assetId) {
        this.lastSelectedAsset = assetId;
    }
    
    // Placeholder for the method called by the automatic edit
    // We will replace this when we move the actual updateImageLibrary method
    updateThumbnails() {
        // Find all thumbnails-grid containers
        const grids = document.querySelectorAll('.thumbnails-grid');
        
        console.log('[ImageLibrary.updateThumbnails] called. Images count:', this.uploadedImages.length);
        console.log('[ImageLibrary.updateThumbnails] Current folder ID:', this.comicCreator.currentFolderId);
        
        // Get all currently used image IDs from panels across all pages
        let usedImageIds = [];
        if (this.comicCreator && this.comicCreator.pages) {
            this.comicCreator.pages.forEach(page => {
                if (page.panelStates) {
                    page.panelStates.forEach(panelState => {
                        if (panelState.imageId) {
                            usedImageIds.push(String(panelState.imageId));
                        }
                    });
                }
                // Check background images too
                if (page.backgroundState && page.backgroundState.imageId) {
                    usedImageIds.push(String(page.backgroundState.imageId));
                }
                // Check stickers
                if (page.stickerStates) {
                     page.stickerStates.forEach(stickerState => {
                         if (stickerState.imageId) {
                             usedImageIds.push(String(stickerState.imageId));
                         }
                     });
                 }
            });
        }
        // Ensure unique IDs
        usedImageIds = [...new Set(usedImageIds)]; 
        console.log('[ImageLibrary.updateThumbnails] Used image IDs:', usedImageIds);

        
        // Save current selection state before clearing the grids
        const selectedAssetIds = [...this.selectedAssets]; // Use internal property
        
        // Update each grid with the images/folders
        grids.forEach(grid => {
            // Clear existing content
            grid.innerHTML = '';

            const currentFolderId = this.comicCreator.currentFolderId;
            const folderStructure = this.comicCreator.folderStructure;
            
            // Add folder breadcrumb navigation
            const breadcrumbNav = document.createElement('div');
            breadcrumbNav.className = 'folder-breadcrumb';
            
            // Build the breadcrumb path by traversing up from current folder to root
            const breadcrumbPath = [];
            let folderInfo = folderStructure[currentFolderId];
            
            // Add current folder first
            if (folderInfo) {
                breadcrumbPath.unshift({
                    id: currentFolderId,
                    name: folderInfo.name || 'Current Folder'
                });
                
                // Then traverse up to get all ancestors
                let parentId = folderInfo.parent;
                while (parentId && folderStructure[parentId]) {
                    const parent = folderStructure[parentId];
                    breadcrumbPath.unshift({
                        id: parentId,
                        name: parent.name || (parentId === 'root' ? 'Root' : 'Folder')
                    });
                    parentId = parent.parent;
                }
            }
            
            // Create the breadcrumb HTML
            breadcrumbNav.innerHTML = `
                <div class="breadcrumb-path">
                    ${breadcrumbPath.map((folder, index) => `
                        <span class="breadcrumb-item" data-folder-id="${folder.id}">
                            ${index === 0 ? '' : ' > '}
                            ${folder.name}
                        </span>
                    `).join('')}
                </div>
            `;
            
            // Add click listeners to breadcrumb items
            breadcrumbNav.querySelectorAll('.breadcrumb-item').forEach(item => {
                item.addEventListener('click', () => {
                    const folderId = item.dataset.folderId;
                    this.comicCreator.folderSystem.navigateToFolder(folderId);
                });
            });
            
            grid.appendChild(breadcrumbNav);

            // Add back button if not in root folder
            if (currentFolderId !== 'root') {
                const backButton = document.createElement('div');
                backButton.className = 'back-to-parent-folder';
                backButton.innerHTML = `
                    <i class="fas fa-arrow-left"></i>
                    <span>Back</span>
                `;
                // Call FolderSystem method via comicCreator reference
                backButton.addEventListener('click', () => this.comicCreator.folderSystem.navigateBack());
                grid.appendChild(backButton);
            }

            // Add create folder button ONLY in editor sidebar
            if (grid.closest('.editor-sidebar')) {
                const createFolderBtn = document.createElement('div');
                createFolderBtn.className = 'create-folder-btn';
                createFolderBtn.innerHTML = `
                    <i class="fas fa-folder-plus"></i>
                    <span>Create Folder</span>
                `;
                // Call FolderSystem method via comicCreator reference
                createFolderBtn.addEventListener('click', () => this.comicCreator.folderSystem.createFolder());
                grid.appendChild(createFolderBtn);
            }

            // Display root folders quick access if not in root folder
            if (currentFolderId !== 'root') {
                const rootFoldersAccess = document.createElement('div');
                rootFoldersAccess.className = 'root-folders-access';
                
                // Get all root-level folders
                const rootFolder = folderStructure['root'];
                if (rootFolder && rootFolder.items) {
                    // Filter out only folder items
                    const rootFolders = rootFolder.items
                        .filter(id => String(id).startsWith('folder_'))
                        .map(id => ({
                            id: id,
                            folder: folderStructure[id]
                        }))
                        .filter(item => item.folder); // Ensure folder exists
                    
                    if (rootFolders.length > 0) {
                        rootFoldersAccess.innerHTML = `
                            <div class="root-folders-header">
                                <i class="fas fa-sitemap"></i>
                                <span>Root Folders (Drag here to move)</span>
                            </div>
                            <div class="root-folders-grid"></div>
                        `;
                        
                        const rootFoldersGrid = rootFoldersAccess.querySelector('.root-folders-grid');
                        
                        // Add folder containers for each root folder
                        rootFolders.forEach(item => {
                            const container = document.createElement('div');
                            container.className = 'folder-container root-quick-access';
                            container.dataset.folderId = item.id;
                            
                            container.innerHTML = `
                                <i class="fas fa-folder"></i>
                                <div class="folder-name">${item.folder.name}</div>
                            `;
                            
                            // Setup click to navigate to that folder
                            container.addEventListener('click', () => {
                                this.comicCreator.folderSystem.navigateToFolder(item.id);
                            });
                            
                            // Setup drag and drop functionality
                            this.comicCreator.dragAndDropManager.setupFolderDragAndDrop(container);
                            
                            rootFoldersGrid.appendChild(container);
                        });
                        
                        grid.appendChild(rootFoldersAccess);
                    }
                }
            }

            // Get current folder's items
            const currentFolder = folderStructure[currentFolderId];
            
            if (!currentFolder) {
                console.error('[ImageLibrary.updateThumbnails] ERROR: Current folder not found:', currentFolderId);
                console.log('[ImageLibrary.updateThumbnails] Available folders:', Object.keys(folderStructure));
                return; // Exit for this grid
            }
            
            // --- Render Folders --- 
            if (currentFolder.items && Array.isArray(currentFolder.items)) {
                currentFolder.items.forEach(itemId => {
                    const itemIdStr = String(itemId);
                    if (itemIdStr.startsWith('folder_')) {
                        const folder = folderStructure[itemIdStr];
                        if (!folder) {
                            console.error('[ImageLibrary.updateThumbnails] ERROR: Referenced folder not found:', itemIdStr);
                            return; // Skip this item
                        }
                        
                        const container = document.createElement('div');
                        container.className = 'folder-container';
                        // Restore selection if needed
                        if (selectedAssetIds.includes(itemIdStr)) {
                            container.classList.add('selected');
                        }
                        container.draggable = true;
                        container.dataset.folderId = itemIdStr;

                        container.innerHTML = `
                            <i class="fas fa-folder"></i>
                            <div class="folder-name" contenteditable="true">${folder.name}</div>
                            <button class="delete-btn" data-folder-id="${itemIdStr}">×</button>
                        `;

                        // Setup folder name editing
                        const nameElement = container.querySelector('.folder-name');
                        nameElement.addEventListener('blur', () => {
                            // Call FolderSystem method via comicCreator reference
                            this.comicCreator.folderSystem.renameFolder(itemIdStr, nameElement.textContent);
                        });
                        nameElement.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                nameElement.blur();
                            }
                        });

                        // Setup double click to open folder
                        container.addEventListener('dblclick', () => {
                            // Call FolderSystem method via comicCreator reference
                            this.comicCreator.folderSystem.navigateToFolder(itemIdStr);
                        });
                        
                        // Setup delete button if it exists
                        const deleteBtn = container.querySelector('.delete-btn');
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent selection when deleting
                                // Call deleteFolder method on the FolderSystem instance
                                this.comicCreator.folderSystem.deleteFolder(itemIdStr);
                            });
                        }
                        
                        // Add selection click handler (similar to image selection)
                        // TODO: Implement setupFolderSelection if needed, or integrate with setupAssetSelection
                        container.addEventListener('click', (e) => {
                             e.stopPropagation(); // Prevent global clear
                             this.handleAssetSelection(container, itemIdStr, e.ctrlKey || e.metaKey, e.shiftKey);
                        });

                        // Setup drag and drop for folders via DragAndDropManager
                        this.comicCreator.dragAndDropManager.setupFolderDragAndDrop(container);

                        grid.appendChild(container);
                    }
                });
            }

            // --- Render Images --- 
             if (currentFolder.items && Array.isArray(currentFolder.items)) {
                currentFolder.items.forEach(itemId => {
                    const itemIdStr = String(itemId);
                    if (!itemIdStr.startsWith('folder_')) {
                        const image = this.getImageById(itemIdStr); // Use internal getter
                        
                        if (image) {
                            const container = document.createElement('div');
                            container.className = 'thumbnail-container';
                            // Add 'in-use' class if imageId is found in usedImageIds
                            if (usedImageIds.includes(itemIdStr)) {
                                container.classList.add('in-use');
                            }
                            
                            // Restore selection state
                            if (selectedAssetIds.includes(itemIdStr)) {
                                container.classList.add('selected');
                            }
                            
                            container.draggable = true;
                            container.dataset.imageId = itemIdStr;

                            container.innerHTML = `
                                <img src="${image.src}" alt="${image.name}">
                                <div class="image-name">${image.name}</div>
                                ${grid.closest('.editor-sidebar') ? '' : `<button class="delete-btn" data-image-id="${itemIdStr}">×</button>`}
                            `;
                            
                            // Setup delete button if it exists (initial upload page only)
                            const deleteBtn = container.querySelector('.delete-btn');
                            if (deleteBtn) {
                                deleteBtn.addEventListener('click', (e) => {
                                    e.stopPropagation(); // Prevent selection when deleting
                                    // Call deleteImage method on the ComicCreator instance
                                    this.deleteImage(itemIdStr); 
                                });
                            }
                            
                            grid.appendChild(container);

                            // Add selection click handler using the common handler
                            container.addEventListener('click', (e) => {
                                e.stopPropagation(); // Prevent global clear
                                this.handleAssetSelection(container, itemIdStr, e.ctrlKey || e.metaKey, e.shiftKey);
                            });
                            
                            // Setup drag and drop via DragAndDropManager
                            this.comicCreator.dragAndDropManager.setupImageDragAndDrop(container);
                        } else {
                            console.warn('[ImageLibrary.updateThumbnails] Image not found for ID:', itemIdStr);
                            // Optionally render a placeholder or remove the ID from the folder
                            // this.comicCreator.folderSystem.removeItemFromCurrentFolder(itemIdStr); // Example cleanup
                        }
                    }
                });
            }

            // Setup grid drop zone via DragAndDropManager
            this.comicCreator.dragAndDropManager.setupGridDropZone(grid);
        });
    }
    
    /**
     * Handles click events on both image thumbnails and folder icons for selection.
     * @param {HTMLElement} container - The clicked container element.
     * @param {string} itemId - The ID of the clicked asset (image or folder).
     * @param {boolean} isCtrlOrMeta - Was Ctrl or Cmd key pressed?
     * @param {boolean} isShift - Was Shift key pressed?
     */
    handleAssetSelection(container, itemId, isCtrlOrMeta, isShift) {
        // Handle multi-selection with Ctrl/Cmd key
        if (isCtrlOrMeta) {
            const index = this.selectedAssets.indexOf(itemId);
            if (index !== -1) {
                // Deselect
                this.removeSelectedAsset(itemId); // Use internal method
                container.classList.remove('selected');
            } else {
                // Select
                this.addSelectedAsset(itemId); // Use internal method
                container.classList.add('selected');
            }
            this.setLastSelectedAsset(itemId); // Use internal method
        }
        // Handle range selection with Shift key
        else if (isShift && this.lastSelectedAsset) {
            const grid = container.closest('.thumbnails-grid');
            // Select both images and folders for range selection
            const visibleContainers = Array.from(grid.querySelectorAll('.thumbnail-container, .folder-container')); 
            
            const lastAssetContainer = grid.querySelector(`[data-image-id="${this.lastSelectedAsset}"], [data-folder-id="${this.lastSelectedAsset}"]`);
            const currentAssetContainer = container;
            
            if (lastAssetContainer && currentAssetContainer) {
                 const lastIndex = visibleContainers.indexOf(lastAssetContainer);
                 const currentIndex = visibleContainers.indexOf(currentAssetContainer);
            
                if (lastIndex !== -1 && currentIndex !== -1) {
                    // Clear current selection visually and internally
                    document.querySelectorAll('.thumbnail-container.selected, .folder-container.selected').forEach(el => {
                        el.classList.remove('selected');
                    });
                    this.selectedAssets = []; // Clear internal array directly for range select
                    
                    // Select range
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);
                    
                    for (let i = start; i <= end; i++) {
                        const currentContainer = visibleContainers[i];
                        if (currentContainer) {
                             // Get ID from appropriate dataset attribute
                             const id = currentContainer.dataset.imageId || currentContainer.dataset.folderId;
                             if (id) {
                                this.addSelectedAsset(id); // Use internal method
                                currentContainer.classList.add('selected');
                             }
                        }
                    }
                     // Set last selected to the item actually clicked
                     this.setLastSelectedAsset(itemId);
                }
            } else {
                 console.warn("Shift selection error: Could not find start or end container.");
                 // Fallback to single selection if containers aren't found
                 this.selectSingleAsset(container, itemId);
            }
        }
        // Normal click - clear selection and select only this item
        else {
            this.selectSingleAsset(container, itemId);
        }
    }

    /**
     * Helper for selecting a single asset and deselecting others.
     * @param {HTMLElement} container - The container element of the asset.
     * @param {string} itemId - The ID of the asset to select.
     */
    selectSingleAsset(container, itemId) {
        // Deselect all others first (visually and internally)
        document.querySelectorAll('.thumbnail-container.selected, .folder-container.selected').forEach(el => {
            if (el !== container) { // Don't remove from the one being selected
                 el.classList.remove('selected');
            }
        });
        this.selectedAssets = [itemId]; // Set internal array
        container.classList.add('selected');
        this.setLastSelectedAsset(itemId); // Use internal method
    }

    /**
     * Deletes an image from the library and the folder structure.
     * @param {string} imageId - The ID of the image to delete.
     */
    deleteImage(imageId) {
        console.log(`[ImageLibrary.deleteImage] Deleting image ID: ${imageId}`);
        // Remove from uploadedImages array (using internal method)
        this.removeImage(imageId); 
        
        // Remove from folder structure (accessed via comicCreator)
        const folderStructure = this.comicCreator.folderStructure;
        if (folderStructure) {
            Object.values(folderStructure).forEach(folder => {
                if (folder && folder.items && Array.isArray(folder.items)) {
                    const index = folder.items.indexOf(imageId); // Find the string ID
                    if (index !== -1) {
                        folder.items.splice(index, 1);
                        console.log(`[ImageLibrary.deleteImage] Removed image ID ${imageId} from folder ${folder.name || 'unknown'}`);
                    }
                }
            });
        } else {
             console.error('[ImageLibrary.deleteImage] Folder structure not found on comicCreator instance.');
        }
        
        // Update the library view
        this.updateThumbnails(); 
        // Update the next button state (relevant for initial upload page)
        this.enableNextButton(); 
    }

    /**
     * Enables/disables the initial "Next Step" button based on whether images exist.
     */
    enableNextButton() {
        const nextBtn = document.querySelector('#next-step-btn');
        if (nextBtn) { // Check if the button exists (it might not on the editor page)
            nextBtn.disabled = this.uploadedImages.length === 0;
        }
    }

    /**
     * Clears the current asset selection (images/folders) and updates the UI.
     */
    clearSelection() {
        this.selectedAssets = [];
        this.lastSelectedAsset = null; // Also clear the last selected for consistency
        // Update UI (remove .selected class from all thumbnails)
        document.querySelectorAll('.thumbnail-container.selected, .folder-container.selected').forEach(el => {
            el.classList.remove('selected');
        });
        console.log("Selection cleared");
    }

    /**
     * Processes uploaded image files using a Web Worker, adds them to the library and current folder.
     * @param {FileList} files - The files selected or dropped by the user.
     */
    async handleImageUpload(files) {
        console.log('[ImageLibrary.handleImageUpload] Starting WORKER upload process with files:', files.length);

        // --- Ensure worker is initialized ---
        this.#initializeWorker();

        if (!this.#imageProcessingWorker) {
            console.error("Worker not available. Cannot process images.");
            this.comicCreator.uiManager?.showNotification("Image processing unavailable. Upload failed.", "error");
            // You could potentially fall back to the old synchronous method here if desired,
            // but for performance, it's better to rely on the worker.
            // await this.#handleImageUploadSync(files); // Example fallback call
            return;
        }

        // --- Filter for actual image files ---
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            console.log("No image files found in selection.");
            return;
        }

        // --- Show processing notification ---
        this.comicCreator.uiManager?.showNotification(`Processing ${imageFiles.length} image(s)...`, "info", 3000);

        // --- Send each image file to the worker ---
        imageFiles.forEach(file => {
            try {
                // IMPORTANT: Pass the File object directly
                this.#imageProcessingWorker.postMessage(file);
                this.#pendingImageFiles++; // Increment pending counter
            } catch (error) {
                // This catches errors during postMessage itself (rare)
                console.error(`Error sending file to worker: ${file.name}`, error);
                this.comicCreator.uiManager?.showNotification(`Error uploading ${file.name}.`, "error");
                // Decrement counter if postMessage failed
                // this.#pendingImageFiles = Math.max(0, this.#pendingImageFiles - 1);
            }
        });

        console.log(`[handleImageUpload] Sent ${imageFiles.length} files to worker. Pending: ${this.#pendingImageFiles}`);

        // --- REMOVE OR COMMENT OUT THE OLD SYNCHRONOUS FileReader LOGIC --- 
        /* 
        console.log('[ImageLibrary.handleImageUpload] Starting upload process with files:', files);
        const imagePromises = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        console.log('[ImageLibrary.handleImageUpload] FileReader loaded for:', file.name);
                        const img = new Image();
                        img.onload = () => {
                            const imageData = {
                                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                name: file.name,
                                src: e.target.result,
                                width: img.width,
                                height: img.height
                            };
                            console.log('[ImageLibrary.handleImageUpload] Image processed:', imageData.name, 'with ID:', imageData.id);
                            resolve(imageData);
                        };
                        img.onerror = () => {
                            console.error('[ImageLibrary.handleImageUpload] Error loading image data for:', file.name);
                            resolve(null); // Resolve with null if there's an error loading the image
                        };
                        img.src = e.target.result;
                    };
                    reader.onerror = () => {
                        console.error('[ImageLibrary.handleImageUpload] FileReader error for:', file.name);
                        resolve(null); // Resolve with null on FileReader error
                    };
                    reader.readAsDataURL(file);
                });
            });

        const newImagesData = await Promise.all(imagePromises);
        const validNewImages = newImagesData.filter(imgData => imgData !== null);
        
        console.log('[ImageLibrary.handleImageUpload] All images processed:', validNewImages.length, 'valid images');
        
        if (validNewImages.length > 0) {
            this.addImages(validNewImages); // Use the existing method to add to this.uploadedImages
            
            // Add new images to the current folder in ComicCreator's folderStructure
            const currentFolderId = this.comicCreator.currentFolderId;
            const folderStructure = this.comicCreator.folderStructure;
            
            if (folderStructure && folderStructure[currentFolderId] && folderStructure[currentFolderId].items) {
                validNewImages.forEach(image => {
                    folderStructure[currentFolderId].items.push(image.id.toString());
                });
                console.log(`[ImageLibrary.handleImageUpload] Added ${validNewImages.length} image IDs to folder: ${currentFolderId}`);
            } else {
                console.error('[ImageLibrary.handleImageUpload] Could not add images to folder - Folder structure or current folder invalid:', currentFolderId, folderStructure);
            }
            
            console.log('[ImageLibrary.handleImageUpload] Current uploadedImages array:', this.uploadedImages.length, 'total images');
            
            // Trigger UI updates
            this.updateThumbnails(); // Call placeholder (will eventually call moved updateImageLibrary)
            this.enableNextButton(); // Call the moved method
        } else {
            console.log('[ImageLibrary.handleImageUpload] No valid images were processed.');
        }
        */
    }

    // --- NEW: Optional Synchronous Fallback (Example) ---
    /*
    async #handleImageUploadSync(files) {
        console.warn('[ImageLibrary.#handleImageUploadSync] Using synchronous fallback for image upload.');
        // ... [Paste the original FileReader logic here if you want a fallback] ...
        // Make sure to call this.addImages, add IDs to folder, this.updateThumbnails, this.enableNextButton
    }
    */

    // --- NEW: Web Worker Initialization ---
    #imageProcessingWorker = null;
    #pendingImageFiles = 0; // Counter for files sent to worker

    #initializeWorker() {
        if (!this.#imageProcessingWorker) {
            try {
                // Use Vite's worker import syntax for proper bundling
                this.#imageProcessingWorker = new Worker(
                    new URL('../workers/imageProcessor.worker.js', import.meta.url),
                    { type: 'module' }
                );
                console.log("Image processing worker initialized.");

                this.#imageProcessingWorker.onmessage = (event) => {
                    this.#pendingImageFiles--; // Decrement counter when a result is received
                    const data = event.data;

                    if (data.error) {
                        console.error('Error from image worker:', data.message, `File: ${data.fileName}`);
                        this.comicCreator.uiManager?.showNotification(`Error processing ${data.fileName || 'image'}: ${data.message}`, 'error');
                    } else if (data.success) {
                        console.log('[Worker Success] Received processed image data:', data.name);
                        // Add the successfully processed image
                        const imageData = {
                            id: data.id,
                            name: data.name,
                            src: data.objectURL, // Store the Object URL
                            width: data.width,
                            height: data.height,
                            isObjectURL: true // Flag to know we need to revoke later
                        };
                        this.addImages([imageData]); // Add to internal array

                        // Add to current folder in folder structure
                        try {
                           const currentFolder = this.comicCreator.folderStructure[this.comicCreator.currentFolderId];
                           if (currentFolder && currentFolder.items && !currentFolder.items.includes(imageData.id)) {
                               currentFolder.items.push(imageData.id.toString());
                           }
                        } catch (e) {
                           console.error("Error adding image ID to folder structure:", e);
                        }

                        // Call updateThumbnails() instead of incrementally adding.
                        this.updateThumbnails();

                        // Enable next button if it's the first image
                        if (this.uploadedImages.length === 1) {
                           this.enableNextButton();
                        }
                    }

                    // Optional: Terminate worker if no more files are pending?
                    // Or keep it alive for future uploads. For now, keep it alive.
                    // if (this.#pendingImageFiles === 0) {
                    //     console.log("All pending images processed. Worker idle.");
                    // }
                };

                this.#imageProcessingWorker.onerror = (error) => {
                    // Handle potential worker loading errors or unhandled exceptions within the worker
                    console.error('Error in image processing worker:', error.message, error);
                    this.comicCreator.uiManager?.showNotification('An error occurred in the image processing worker. Please check the console.', 'error');
                    // Attempt to gracefully terminate the worker?
                    this.#imageProcessingWorker?.terminate();
                    this.#imageProcessingWorker = null;
                    this.#pendingImageFiles = 0; // Reset counter on critical error
                };
            } catch (e) {
                console.error("Failed to initialize image processing worker:", e);
                this.comicCreator.uiManager?.showNotification('Could not initialize image processing worker. Uploads may be slow.', 'warning');
                // Fallback to synchronous processing? Or disable uploads? For now, log warning.
            }
        }
    }

    /**
     * NEW Helper method to add a single thumbnail element to all relevant grids.
     * Encapsulates DOM creation and listener attachment for one image.
     * @param {object} imageData - The image data object {id, name, src, width, height, isObjectURL}
     * @private
     */
     #addThumbnailToGrid(imageData) {
        const grids = document.querySelectorAll('.thumbnails-grid');
        if (!grids.length) return; // No grids found to update

        const isInUse = this.#isImageUsed(imageData.id); // Check if image is used

        grids.forEach(grid => {
            const container = document.createElement('div');
            container.className = 'thumbnail-container image'; // Add 'image' class
            container.dataset.imageId = imageData.id;
            container.dataset.assetId = imageData.id; // For selection logic

            const isSelected = this.selectedAssets.includes(String(imageData.id));
            if (isSelected) {
                container.classList.add('selected');
            }

            container.innerHTML = `
                <img src="${imageData.src}" alt="${imageData.name}" class="thumbnail-image">
                <span class="thumbnail-name">${imageData.name}</span>
                ${isInUse ? '<span class="in-use-indicator" title="Image is used in the comic">USED</span>' : ''}
                <button class="delete-asset-btn" title="Delete Image">&times;</button>
            `;

            // Append the new thumbnail to the grid
            // We need to find the right place, usually after folders/buttons
            // Let's find the first existing thumbnail/folder and insert before it,
            // or just append if the grid is empty (besides buttons/breadcrumbs)
             const firstAssetElement = grid.querySelector('.thumbnail-container, .folder-container');
             if (firstAssetElement) {
                 grid.insertBefore(container, firstAssetElement);
             } else {
                 grid.appendChild(container); // Append if no other assets exist
             }


            // --- Attach Listeners ---
            // Setup selection handling
            this.setupImageSelection(container);

            // Setup drag and drop
            if (this.comicCreator.dragAndDropManager) {
                 this.comicCreator.dragAndDropManager.setupImageDragAndDrop(container);
            } else {
                 console.warn("DragAndDropManager not available on comicCreator instance.");
            }

            // Setup delete button
            const deleteBtn = container.querySelector('.delete-asset-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering selection
                    if (confirm(`Are you sure you want to delete "${imageData.name}"?`)) {
                        this.deleteImage(imageData.id); // Call the existing delete method
                    }
                });
            }
        });

        console.log(`[#addThumbnailToGrid] Added thumbnail for: ${imageData.name}`);
     }


    /**
     * Helper method to check if an image ID is used in any page's panels, backgrounds, or stickers.
     * @param {string} imageId
     * @returns {boolean}
     * @private
     */
    #isImageUsed(imageId) {
        if (!this.comicCreator || !this.comicCreator.pages) return false;
        const idString = String(imageId);
        return this.comicCreator.pages.some(page =>
            (page.panelStates?.some(panel => String(panel.imageId) === idString)) ||
            (String(page.backgroundState?.imageId) === idString) ||
            (page.stickerStates?.some(sticker => String(sticker.imageId) === idString))
        );
    }

    /**
     * Sets up click event listeners for asset selection (single, multi, range).
     * @param {HTMLElement} container - The thumbnail or folder container element.
     */
    setupImageSelection(container) {
        container.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click listener from clearing selection

            const assetId = container.dataset.assetId || container.dataset.folderId || container.dataset.imageId;
            if (!assetId) return;

            const isCtrlOrMeta = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            this.handleAssetSelection(container, assetId, isCtrlOrMeta, isShift);
        });
    }
} 