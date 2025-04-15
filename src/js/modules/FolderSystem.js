// Manages the folder structure and operations within the image library.
export class FolderSystem {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
    }

    // Creates a new folder within the current folder. (Original Code)
    createFolder(name = 'New Folder') {
        const folderId = `folder_${Date.now()}`;
        // Access folderStructure and currentFolderId via comicCreator instance
        this.comicCreator.folderStructure[folderId] = {
            type: 'folder',
            name: name,
            items: [],
            parent: this.comicCreator.currentFolderId
        };
        this.comicCreator.folderStructure[this.comicCreator.currentFolderId].items.push(folderId);
        this.comicCreator.updateImageLibrary(); // Call method on comicCreator instance
        return folderId;
    }

    // Navigates into the specified folder. (Original Code)
    navigateToFolder(folderId) {
        if (this.comicCreator.folderStructure[folderId]) {
            // Update currentFolderId on comicCreator instance
            this.comicCreator.currentFolderId = folderId;
            this.comicCreator.updateImageLibrary(); // Call method on comicCreator instance
        }
    }

    // Navigates back to the parent folder. (Original Code)
    navigateBack() {
        const currentFolder = this.comicCreator.folderStructure[this.comicCreator.currentFolderId];
        if (currentFolder && currentFolder.parent) {
            // Update currentFolderId on comicCreator instance
            this.comicCreator.currentFolderId = currentFolder.parent;
            this.comicCreator.updateImageLibrary(); // Call method on comicCreator instance
        }
    }

    // Renames the specified folder. (Original Code)
    renameFolder(folderId, newName) {
        if (this.comicCreator.folderStructure[folderId]) {
            this.comicCreator.folderStructure[folderId].name = newName;
            this.comicCreator.updateImageLibrary(); // Call method on comicCreator instance
        }
    }

    // Moves an item (image or folder) into a target folder. (Original Code)
    moveItemToFolder(itemId, targetFolderId) {
        // Ensure we're working with string IDs
        const itemIdStr = itemId.toString();
        const targetFolderIdStr = targetFolderId.toString();
        
        // Don't proceed if trying to move to the same folder (Original Logic Check)
        // NOTE: The original logic checked if the CURRENT folder ID matched the target.
        // This might prevent moving items INTO the current folder if dragged from elsewhere.
        // Consider if this logic needs refinement, but using original for now.
        if (this.comicCreator.currentFolderId === targetFolderIdStr) { 
            console.log('Original logic: Item cannot be moved into the currently viewed folder.');
            // Maybe update UI here if needed?
            return;
        }
        
        console.log(`Moving item ${itemIdStr} to folder ${targetFolderIdStr}`);
        
        // First find which folder currently contains the item
        let sourceFolder = null;
        let sourceIndex = -1;
        
        // Search through all folders to find where this item currently exists
        Object.entries(this.comicCreator.folderStructure).forEach(([folderId, folder]) => {
            if (!folder.items) {
                console.error(`Folder ${folderId} has no items array`);
                return;
            }
            
            // Convert all folder item IDs to strings for consistent comparison
            const folderItems = folder.items.map(id => id.toString());
            const itemIndex = folderItems.indexOf(itemIdStr);
            
            if (itemIndex !== -1) {
                sourceFolder = folder;
                sourceIndex = itemIndex;
                // Original logic didn't break here, continued searching
            }
        });
        
        // If found in a folder, remove it
        if (sourceFolder && sourceIndex !== -1) {
            sourceFolder.items.splice(sourceIndex, 1);
            console.log(`Removed item from source folder`);
        } else {
            console.warn(`Item ${itemIdStr} not found in any folder`);
        }

        // Add to target folder
        const targetFolder = this.comicCreator.folderStructure[targetFolderIdStr]; // Get target folder reference
        if (targetFolder) { // Check if target folder exists
            // Ensure target folder has an items array (Original Logic)
            if (!targetFolder.items) {
                targetFolder.items = [];
            }
            
            // Only add if not already present (avoid duplicates)
            if (!targetFolder.items.includes(itemIdStr)) { // Use includes for simplicity
                targetFolder.items.push(itemIdStr);
                console.log(`Added item to target folder ${targetFolderIdStr}`);
            } else {
                console.warn(`Item already exists in target folder ${targetFolderIdStr}`);
            }
            
            // Update the UI (Original logic updated inside the if block)
            this.comicCreator.updateImageLibrary(); 
        } else {
            console.error(`Target folder ${targetFolderIdStr} not found`);
            // Original logic didn't update UI here, but might be needed if removal occurred.
            // Adding it for safety, consistent with successful move.
            this.comicCreator.updateImageLibrary(); 
        }
    }
} 