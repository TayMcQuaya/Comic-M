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
        // Call the updated method on the imageLibrary instance
        this.comicCreator.imageLibrary.updateThumbnails(); 
        return folderId;
    }

    // Navigates into the specified folder. (Original Code)
    navigateToFolder(folderId) {
        if (this.comicCreator.folderStructure[folderId]) {
            // Update currentFolderId on comicCreator instance
            this.comicCreator.currentFolderId = folderId;
            // Call the updated method on the imageLibrary instance
            this.comicCreator.imageLibrary.updateThumbnails(); 
        }
    }

    // Navigates back to the parent folder. (Original Code)
    navigateBack() {
        const currentFolder = this.comicCreator.folderStructure[this.comicCreator.currentFolderId];
        if (currentFolder && currentFolder.parent) {
            // Update currentFolderId on comicCreator instance
            this.comicCreator.currentFolderId = currentFolder.parent;
            // Call the updated method on the imageLibrary instance
            this.comicCreator.imageLibrary.updateThumbnails();
        }
    }

    // Renames the specified folder. (Original Code)
    renameFolder(folderId, newName) {
        if (this.comicCreator.folderStructure[folderId]) {
            this.comicCreator.folderStructure[folderId].name = newName;
            // Call the updated method on the imageLibrary instance
            this.comicCreator.imageLibrary.updateThumbnails(); 
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
            
            // Update the UI 
            this.comicCreator.imageLibrary.updateThumbnails(); // Call updated method
        } else {
            console.error(`Target folder ${targetFolderIdStr} not found`);
            // Update UI even if target isn't found, because item might have been removed from source
            this.comicCreator.imageLibrary.updateThumbnails(); // Call updated method
        }
    }
    
    // Deletes the specified folder if it is empty.
    deleteFolder(folderId) {
        // 1. Safety Check: Cannot delete the root folder
        if (folderId === 'root') {
            console.error("Cannot delete the root folder.");
            return;
        }

        // 2. Find the folder to delete
        const folderToDelete = this.comicCreator.folderStructure[folderId];
        if (!folderToDelete) {
            console.error(`Folder with ID ${folderId} not found.`);
            return;
        }

        // 3. Check if the folder is empty
        if (folderToDelete.items && folderToDelete.items.length > 0) {
            console.warn(`Folder "${folderToDelete.name}" is not empty. Cannot delete.`);
            alert(`Folder "${folderToDelete.name}" must be empty before it can be deleted.`);
            return;
        }

        // 4. Find the parent folder
        const parentId = folderToDelete.parent;
        const parentFolder = this.comicCreator.folderStructure[parentId];
        if (!parentFolder || !parentFolder.items) {
            console.error(`Parent folder (ID: ${parentId}) not found or invalid for folder ${folderId}.`);
            // This case might indicate data corruption, but attempt cleanup anyway.
            delete this.comicCreator.folderStructure[folderId]; // Remove the orphaned folder
            this.comicCreator.imageLibrary.updateThumbnails();
            return;
        }

        // 5. Remove folderId from parent's items array
        const indexInParent = parentFolder.items.indexOf(folderId);
        if (indexInParent > -1) {
            parentFolder.items.splice(indexInParent, 1);
        } else {
            console.warn(`Folder ID ${folderId} not found in parent's (${parentId}) items list.`);
            // Proceed with deletion anyway
        }

        // 6. Delete the folder entry itself
        delete this.comicCreator.folderStructure[folderId];
        console.log(`Deleted empty folder "${folderToDelete.name}" (ID: ${folderId})`);

        // 7. Update UI
        // Important: If the user is currently viewing the deleted folder, navigate back first.
        if (this.comicCreator.currentFolderId === folderId) {
            this.navigateBack(); // Navigate out before updating thumbnails
        } else {
            this.comicCreator.imageLibrary.updateThumbnails(); // Otherwise, just update
        }
    }
} 