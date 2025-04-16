export class DragAndDropManager {
    constructor(comicCreator) {
        // Store a reference to the main ComicCreator instance
        // This allows the DragAndDropManager to access properties (like pages, uploadedImages)
        // and methods (like showNotification, selectPanel) from the main application.
        this.comicCreator = comicCreator;
    }

    // Methods related to drag and drop will be moved here
    // from ComicCreator in main.js

    // --- Image Library -> Panel Drag --- 
    handleDragStart(e, image) {
        e.dataTransfer.setData('image/id', image.id.toString());
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
    }
    
    // --- Image Dragging within a Panel --- 
    setupImageDragging(img) {
        if (!img) {
            console.error("setupImageDragging called with undefined image");
            return;
        }
        
        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;

        const onMouseDown = (e) => {
            // Initialize dragging state
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get the current position values (defaulting to 50% if not set)
            startLeft = parseFloat(img.style.left) || 50;
            startTop = parseFloat(img.style.top) || 50;
            
            // Set cursor and visual feedback
            img.style.cursor = 'grabbing';
            
            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            // Ensure opacity stays at 1 during drag
            img.style.opacity = '1';

            // Calculate the distance moved
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Convert pixel movement to percentage based on panel size
            const panel = img.parentElement;
            if (!panel) return;
            
            const percentX = (deltaX / panel.offsetWidth) * 100;
            const percentY = (deltaY / panel.offsetHeight) * 100;

            // Update image position
            img.style.left = `${startLeft + percentX}%`;
            img.style.top = `${startTop + percentY}%`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            img.style.cursor = 'grab';
            img.style.opacity = '1';
            
            // Save the current page state when we finish dragging
            this.comicCreator.saveCurrentPageState();
        };

        // Add mouse event listeners
        img.style.cursor = 'grab';
        img.style.pointerEvents = 'auto'; // Enable pointer events for dragging
        img.style.opacity = '1'; // Ensure initial opacity is 1
        img.draggable = false; // Disable native dragging
        
        img.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Prevent default drag behavior
        img.addEventListener('dragstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    // --- Image Library Item Drag & Drop (Single/Multi) ---
    setupImageDragAndDrop(container) {
        container.addEventListener('dragstart', (e) => {
            const itemId = container.dataset.imageId;
            
            // Use the imageLibrary instance to get selected assets
            const selectedAssets = this.comicCreator.imageLibrary.getSelectedAssets();
            
            // If this is a selected item and we have multiple items selected
            if (selectedAssets.includes(itemId) && selectedAssets.length > 1) {
                console.log('Starting multi-item drag with', selectedAssets.length, 'items');
                
                // Set data for multi-drag using the correct selected assets array
                e.dataTransfer.setData('text/plain', JSON.stringify(selectedAssets));
                e.dataTransfer.setData('type', 'multi-image');
                
                // Create a custom drag image
                const dragFeedback = document.createElement('div');
                dragFeedback.style.position = 'absolute';
                dragFeedback.style.top = '-1000px';
                dragFeedback.style.background = 'rgba(0, 0, 0, 0.7)';
                dragFeedback.style.color = 'white';
                dragFeedback.style.padding = '10px';
                dragFeedback.style.borderRadius = '5px';
                dragFeedback.style.pointerEvents = 'none';
                dragFeedback.textContent = `${selectedAssets.length} items`;
                
                document.body.appendChild(dragFeedback);
                e.dataTransfer.setDragImage(dragFeedback, 25, 25);
                
                // Remove the element after drag starts
                setTimeout(() => {
                    document.body.removeChild(dragFeedback);
                }, 0);
                
                // Add dragging class to all selected items
                selectedAssets.forEach(id => {
                    const element = document.querySelector(`.thumbnail-container[data-image-id="${id}"]`);
                    if (element) element.classList.add('dragging');
                });
            } else {
                // Single item drag
                console.log('Starting single item drag:', itemId);
                e.dataTransfer.setData('text/plain', itemId);
                e.dataTransfer.setData('type', 'image');
                container.classList.add('dragging'); // Add dragging class only to the source element for single drag
            }
        });
        
        container.addEventListener('dragend', () => {
            // Remove dragging class from all items
            document.querySelectorAll('.dragging').forEach(el => {
                el.classList.remove('dragging');
            });
        });
    }
    
    // --- Image Library Folder Drag & Drop ---
    setupFolderDragAndDrop(container) {
        // Make folder draggable
        container.addEventListener('dragstart', (e) => {
            const folderId = container.dataset.folderId;
            console.log('Starting folder drag:', folderId);
            e.dataTransfer.setData('text/plain', folderId);
            e.dataTransfer.setData('type', 'folder');
            container.classList.add('dragging');
        });

        container.addEventListener('dragend', () => {
            container.classList.remove('dragging');
        });
        
        // Make folder droppable
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');
        });
        
        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            const type = e.dataTransfer.getData('type');
            const targetFolderId = container.dataset.folderId;
            
            console.log('Drop on folder:', targetFolderId, 'Type:', type);
            
            let itemsMoved = false; // Flag to check if any move occurred
            // Handle multiple items
            if (type === 'multi-image') {
                try {
                    const rawData = e.dataTransfer.getData('text/plain');
                    const itemIds = JSON.parse(rawData);
                    
                    itemIds.forEach(itemId => {
                        if (typeof itemId === 'string') {
                            this.comicCreator.folderSystem.moveItemToFolder(itemId, targetFolderId);
                            itemsMoved = true; 
                        }
                    });
                } catch (error) {
                    console.error('Error processing multi-item drop:', error);
                }
            } else {
                // Handle single item
                const itemId = e.dataTransfer.getData('text/plain');
                const itemType = e.dataTransfer.getData('type');
                
                // Don't allow dropping a folder into itself or its descendants
                if (itemType === 'folder') {
                    if (itemId === targetFolderId) {
                        console.log('Prevented folder self-drop');
                        return;
                    }
                    let parent = this.comicCreator.folderStructure[targetFolderId].parent;
                    while (parent) {
                        if (parent === itemId) {
                            console.log('Prevented folder ancestor drop');
                            return;
                        }
                        parent = this.comicCreator.folderStructure[parent].parent;
                    }
                }
                
                this.comicCreator.folderSystem.moveItemToFolder(itemId, targetFolderId);
                itemsMoved = true;
            }
            
            // Update the UI if items were potentially moved
            if (itemsMoved) {
                this.comicCreator.imageLibrary.updateThumbnails();
            }
        });
    }

    // --- Image Library Reorder Drag --- 
    setupReorderDrag(container) {
        if (!container) return;

        container.addEventListener('dragstart', (e) => {
            container.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            // Note: dataTransfer is already set by setupImageDragAndDrop or setupFolderDragAndDrop
        });

        container.addEventListener('dragend', () => {
            container.classList.remove('dragging');
        });
    }

    // --- Image Library Reorder Drop Zone (Grid) ---
    setupGridDropZone(grid) {
        if (!grid) return;

        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement) return;

            // Calculate where to place the placeholder based on mouse position
            const siblings = [...grid.querySelectorAll('.thumbnail-container:not(.dragging), .folder-container:not(.dragging)')];
            const nextSibling = siblings.find(sibling => {
                const rect = sibling.getBoundingClientRect();
                // Adjust logic slightly: insert before if mouse is in the top half of the sibling
                return e.clientY < rect.top + rect.height / 2;
            });

            // Move the actual dragging element to provide visual feedback
            if (nextSibling) {
                grid.insertBefore(draggingElement, nextSibling);
            } else {
                grid.appendChild(draggingElement);
            }
        });

        grid.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            const data = e.dataTransfer.getData('text/plain');
            
            console.log('Drop on grid detected. Type:', type, 'Data:', data);
            
            // If the drop target is the grid itself, move item(s) to the current folder
            if (e.target === grid || e.target.closest('#image-library-grid') === grid) {
                if (type === 'multi-image') {
                    try {
                        // Parse and handle multiple images
                        const itemIds = JSON.parse(data);
                        console.log('Moving multiple items to current folder:', itemIds.length, 'items');
                        
                        itemIds.forEach(itemId => {
                            if (typeof itemId === 'string') {
                                // Use FolderSystem method
                                this.comicCreator.folderSystem.moveItemToFolder(itemId, this.comicCreator.currentFolderId);
                            }
                        });
                    } catch (error) {
                        console.error('Error processing multi-item drop on grid:', error);
                    }
                } else if (type === 'image' || type === 'folder') {
                    // Handle single item
                    console.log('Moving single item to current folder:', data);
                    // Use FolderSystem method
                    this.comicCreator.folderSystem.moveItemToFolder(data, this.comicCreator.currentFolderId);
                }
            }
            // Note: Actual reordering within the folder happens via the moveItemToFolder call
            // which triggers an updateImageLibrary call.

            // Update the UI to reflect the new order
            this.comicCreator.imageLibrary.updateThumbnails();
        });
    }

    // --- Canvas Text Dragging (Pixel-based, Canvas Relative) ---
    makeCanvasTextDraggable(element, handle) {
        let isDragging = false;
        let startX, startY;
        let originalX, originalY; // Store initial style.left/top in pixels
        const canvas = document.querySelector('#comic-canvas');
        let canvasPaddingBoxWidth, canvasPaddingBoxHeight; // Store canvas client dimensions

        const onMouseDown = (e) => {
            // Check if canvas exists
            if (!canvas) {
                console.error("Cannot drag: canvas not found");
                return;
            }
            
            // Check if drag should start
            if (e.button !== 0) return;
            const isHandle = e.target === handle || e.target.closest('.drag-handle');
            const isBubbleBorder = e.target === element && !e.target.closest('.text-content, .resize-handle, .format-text-btn, .delete-text-btn');
            if (!isHandle && !isBubbleBorder) return;

            // Start dragging state
            isDragging = true;
            element.style.cursor = 'grabbing';
            element.dataset.originalZIndex = element.style.zIndex || '100';
            element.style.zIndex = '1000';

            // Record initial positions and dimensions
            startX = e.clientX;
            startY = e.clientY;
            // Use currentStyle values for origin, fallback if not set
            originalX = parseFloat(element.style.left) || 0;
            originalY = parseFloat(element.style.top) || 0;
            // Get canvas client dimensions (includes padding, excludes border)
            canvasPaddingBoxWidth = canvas.clientWidth;
            canvasPaddingBoxHeight = canvas.clientHeight;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            // Calculate mouse movement delta
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Get current element dimensions (use offsetWidth/Height for reliable size)
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;

            // Calculate the element's desired new position relative to the canvas padding box
            let desiredCanvasX = originalX + dx;
            let desiredCanvasY = originalY + dy;

            // Clamp the desired position to stay within the canvas padding box boundaries
            const clampedCanvasX = Math.max(
                0, // Min X relative to padding box
                Math.min(desiredCanvasX, canvasPaddingBoxWidth - elementWidth) // Max X relative to padding box
            );
            const clampedCanvasY = Math.max(
                0, // Min Y relative to padding box
                Math.min(desiredCanvasY, canvasPaddingBoxHeight - elementHeight) // Max Y relative to padding box
            );

            // Apply the clamped, canvas-relative position
            element.style.left = `${clampedCanvasX}px`;
            element.style.top = `${clampedCanvasY}px`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = element.dataset.originalZIndex || '100';
            document.removeEventListener('mousemove', onMouseMove);
            this.comicCreator.saveCurrentPageState();
        };

        // Initialize cursor and add mousedown listeners
        handle.style.cursor = 'grab';
        handle.addEventListener('mousedown', onMouseDown);
        element.addEventListener('mousedown', onMouseDown);
        element.addEventListener('dragstart', (e) => e.preventDefault());
    }

    // --- Text Bubble Dragging (Pixel-based, Panel Relative) ---
    makeTextDraggable(element, handle) {
        let isDragging = false;
        let startX, startY;
        let originalElementX_panel, originalElementY_panel; // Element initial style.left/top relative to panel
        let panelOffsetX, panelOffsetY; // Panel offset relative to canvas padding box
        let canvasPaddingBoxWidth, canvasPaddingBoxHeight;
        const canvas = document.querySelector('#comic-canvas');

        const onMouseDown = (e) => {
            const panel = element.parentElement;
            if (!panel || !panel.classList.contains('comic-panel') || !canvas) return;

            // Check if drag should start
            if (e.button !== 0) return;
            const isHandle = e.target === handle || e.target.closest('.drag-handle');
            const isBubbleBorder = e.target === element && !e.target.closest('.text-content, .resize-handle, .format-text-btn, .delete-text-btn');
            if (!isHandle && !isBubbleBorder) return;

            // Start dragging state
            isDragging = true;
            element.style.cursor = 'grabbing';
            element.dataset.originalZIndex = element.style.zIndex || '10';
            element.style.zIndex = '1000';

            // Record initial positions and dimensions
            startX = e.clientX;
            startY = e.clientY;
            originalElementX_panel = parseFloat(element.style.left) || 0;
            originalElementY_panel = parseFloat(element.style.top) || 0;
            
            // Get panel offset relative to canvas padding box
            // Use getBoundingClientRect for robust calculation
            const panelRect = panel.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const canvasStyle = window.getComputedStyle(canvas);
            const canvasBorderLeft = parseFloat(canvasStyle.borderLeftWidth) || 0;
            const canvasBorderTop = parseFloat(canvasStyle.borderTopWidth) || 0;
            const canvasPaddingLeft = parseFloat(canvasStyle.paddingLeft) || 0;
            const canvasPaddingTop = parseFloat(canvasStyle.paddingTop) || 0;
            
            panelOffsetX = panelRect.left - (canvasRect.left + canvasBorderLeft + canvasPaddingLeft);
            panelOffsetY = panelRect.top - (canvasRect.top + canvasBorderTop + canvasPaddingTop);

            // Get canvas client dimensions (content area, excluding padding/border)
            canvasPaddingBoxWidth = canvas.clientWidth;
            canvasPaddingBoxHeight = canvas.clientHeight;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;

            // Calculate element's desired new position relative to the CANVAS padding box
            let desiredCanvasX = panelOffsetX + originalElementX_panel + dx;
            let desiredCanvasY = panelOffsetY + originalElementY_panel + dy;

            // Clamp the desired CANVAS position to stay within the CANVAS padding box boundaries
            const clampedCanvasX = Math.max(
                0, 
                Math.min(desiredCanvasX, canvasPaddingBoxWidth - elementWidth)
            );
            const clampedCanvasY = Math.max(
                0, 
                Math.min(desiredCanvasY, canvasPaddingBoxHeight - elementHeight)
            );

            // Convert the clamped CANVAS position back to a position relative to the PANEL padding box
            const finalPanelX = clampedCanvasX - panelOffsetX;
            const finalPanelY = clampedCanvasY - panelOffsetY;

            // Apply the clamped, PANEL-relative position
            element.style.left = `${finalPanelX}px`;
            element.style.top = `${finalPanelY}px`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = element.dataset.originalZIndex || '10';
            document.removeEventListener('mousemove', onMouseMove);
            this.comicCreator.saveCurrentPageState();
        };

        // Initialize cursor and add listeners
        handle.style.cursor = 'grab';
        handle.addEventListener('mousedown', onMouseDown);
        element.addEventListener('mousedown', onMouseDown);
        element.addEventListener('dragstart', (e) => e.preventDefault());
    }
    
    // --- Sticker Dragging --- 
    makeStickerDraggable(element) {
        let isDragging = false;
        let startX, startY;
        let originalX, originalY;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only handle left mouse button
            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            element.style.cursor = 'grabbing';
            element.style.zIndex = '1000'; // Bring to front while dragging

            startX = e.clientX;
            startY = e.clientY;
            originalX = parseFloat(element.style.left) || 0;
            originalY = parseFloat(element.style.top) || 0;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const canvas = document.querySelector('#comic-canvas');
            if (!canvas) {
                console.error("Cannot drag: canvas not found");
                return;
            }
            
            const canvasRect = canvas.getBoundingClientRect();
            const stickerRect = element.getBoundingClientRect(); // Use getBoundingClientRect for accurate size
            
            let newX = originalX + dx;
            let newY = originalY + dy;
            
            // Boundary checks against canvas padding box
            const canvasClientWidth = canvas.clientWidth;
            const canvasClientHeight = canvas.clientHeight;
            const elementWidth = stickerRect.width;
            const elementHeight = stickerRect.height;

            newX = Math.max(0, Math.min(newX, canvasClientWidth - elementWidth));
            newY = Math.max(0, Math.min(newY, canvasClientHeight - elementHeight));
            
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = '100'; // Reset z-index or use saved state

            document.removeEventListener('mousemove', onMouseMove);

            // Update state (using comicCreator reference)
            const pageState = this.comicCreator.pages[this.comicCreator.currentPageIndex];
            if (pageState?.stickerStates) {
                const stickerState = pageState.stickerStates.find(s => s.id === element.id);
                if (stickerState) {
                    Object.assign(stickerState, {
                        left: element.style.left,
                        top: element.style.top,
                        width: element.style.width,
                        height: element.style.height,
                        transform: element.style.transform,
                        rotation: element.dataset.rotation || '0',
                        zIndex: element.style.zIndex,
                        size: element.dataset.size
                    });
                    this.comicCreator.saveCurrentPageState();
                }
            }
        };

        element.addEventListener('mousedown', onMouseDown);
        element.addEventListener('dragstart', (e) => e.preventDefault());
    }

    // --- Text Bubble Resizing --- 
    makeTextResizable(element, handle) {
        let isResizing = false;
        let startX, startY;
        let startWidth, startHeight;
        
        handle.style.cursor = 'nwse-resize'; // Set appropriate resize cursor
        
        handle.addEventListener('mousedown', (e) => {
            // Only resize with left mouse button
            if (e.button !== 0) return;
            
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
            
            // Prevent default text selection during resize
            e.preventDefault();
            e.stopPropagation();
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });
        
        const onMouseMove = (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // Apply new dimensions (ensure minimum size if needed)
            const newWidth = Math.max(50, startWidth + deltaX); // Example minimum width
            const newHeight = Math.max(30, startHeight + deltaY); // Example minimum height
            
            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
        };
        
        const onMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            
            // Save state immediately after resizing finishes
            this.comicCreator.saveCurrentPageState(); 
        };
    }
} 