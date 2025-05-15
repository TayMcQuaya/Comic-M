export class DragAndDropManager {
    constructor(comicCreator) {
        // Store a reference to the main ComicCreator instance
        // This allows the DragAndDropManager to access properties (like pages, uploadedImages)
        // and methods (like showNotification, selectPanel) from the main application.
        this.comicCreator = comicCreator;
        
        // Create references to methods that will be used as event handlers
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        
        // Initialize global drag message templates
        this.initDragMessages();
        
        // Add global dragend listener to ensure cleanup
        document.addEventListener('dragend', this.handleDragEnd);
        document.addEventListener('drop', this.handleDragEnd);
    }

    // Initialize the drag instruction messages
    initDragMessages() {
        this.dragMessages = {
            panels: "Drag onto a panel to add an image",
            backgrounds: "Drag onto the canvas to set as background",
            stickers: "Drag onto the canvas to add as a sticker",
            folder: "Drag onto a folder to move item",
            default: "Drag item to a valid drop target"
        };
    }
    
    // Update the global drag instruction message based on the current mode
    updateDragMessage(mode) {
        const overlay = document.querySelector('.drag-instruction-overlay');
        if (!overlay) return;
        
        overlay.textContent = this.dragMessages[mode] || this.dragMessages.default;
    }

    // Methods related to drag and drop will be moved here
    // from ComicCreator in main.js

    // --- Image Library -> Panel Drag --- 
    handleDragStart(e, image) {
        e.dataTransfer.setData('image/id', image.id.toString());
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
        
        // Add dragging class to body
        document.body.classList.add('dragging-active');
        
        // Update drag message based on current sidebar mode
        this.updateDragMessage(this.comicCreator.currentSidebarMode);
    }
    
    handleDragEnd() {
        // Remove dragging class from body
        document.body.classList.remove('dragging-active');
        
        // Clear all drop targets
        document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
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
            
            // Attach move and up listeners to document and window
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            window.addEventListener('mouseup', onMouseUp); // Added window listener
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
            
            // Remove listeners from both document and window
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mouseup', onMouseUp); // Removed window listener
            
            // Save state only AFTER listeners are removed
            this.comicCreator.saveCurrentPageState();
        };

        // Add mouse event listeners
        img.style.cursor = 'grab';
        img.style.pointerEvents = 'auto'; // Enable pointer events for dragging
        img.style.opacity = '1'; // Ensure initial opacity is 1
        img.draggable = false; // Disable native dragging
        
        img.addEventListener('mousedown', onMouseDown);
        
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
            
            // Add dragging class to body
            document.body.classList.add('dragging-active');
            
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
                
                // Update drag message
                this.updateDragMessage(this.comicCreator.currentSidebarMode);
            } else {
                // Single item drag
                console.log('Starting single item drag:', itemId);
                e.dataTransfer.setData('text/plain', itemId);
                e.dataTransfer.setData('type', 'image');
                container.classList.add('dragging'); // Add dragging class only to the source element for single drag
                
                // Update drag message
                this.updateDragMessage(this.comicCreator.currentSidebarMode);
            }
        });
        
        container.addEventListener('dragend', () => {
            // Remove dragging class from all items
            document.querySelectorAll('.dragging').forEach(el => {
                el.classList.remove('dragging');
            });
            
            // Remove dragging class from body
            document.body.classList.remove('dragging-active');
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
            
            // Add dragging class to body
            document.body.classList.add('dragging-active');
            
            // Update drag message
            this.updateDragMessage('folder');
        });

        container.addEventListener('dragend', () => {
            container.classList.remove('dragging');
            
            // Remove dragging class from body
            document.body.classList.remove('dragging-active');
        });
        
        // Make folder droppable
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drop-target');
        });
        
        container.addEventListener('dragleave', () => {
            container.classList.remove('drop-target');
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
                if (grid.contains(nextSibling)) {
                    grid.insertBefore(draggingElement, nextSibling);
                } else {
                    console.warn("Dragover: nextSibling is not a child of the target grid. Appending instead.");
                    grid.appendChild(draggingElement);
                }
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
        // Reuse the universal makeTextDraggable method
        return this.makeTextDraggable(element, handle);
    }

    // --- Text Bubble Dragging (Works for text in panels AND canvas) ---
    makeTextDraggable(element, handle) {
        let isDragging = false;
        let startX, startY;
        let originalLeft, originalTop; // Element initial left/top positions
        let parentContainer;  // The parent container (panel or canvas)
        let hasTransform;

        const onMouseDown = (e) => {
            // Get the parent container (either panel or canvas)
            parentContainer = element.parentElement;
            if (!parentContainer) return;
            
            // Check if drag should start
            if (e.button !== 0) return;
            const isHandle = e.target === handle || e.target.closest('.drag-handle');
            const isBubbleBorder = e.target === element && !e.target.closest('.text-content, .resize-handle, .format-text-btn, .delete-text-btn');
            if (!isHandle && !isBubbleBorder) return;

            e.preventDefault(); // Prevent text selection during drag
            e.stopPropagation(); // Stop click from propagating to parent elements
            
            // Start dragging state
            isDragging = true;
            element.style.cursor = 'grabbing';
            element.dataset.originalZIndex = element.style.zIndex || '100';
            element.style.zIndex = '1000';

            // Record initial positions
            startX = e.clientX;
            startY = e.clientY;
            
            // Check if this element has transforms applied
            hasTransform = element.style.transform && element.style.transform.includes('translate');
            
            // Get current visual rect and container rect
            const elementRect = element.getBoundingClientRect();
            const containerRect = parentContainer.getBoundingClientRect();
            
            if (hasTransform) {
                // Calculate the position relative to the container in pixels
                const relativeLeft = elementRect.left - containerRect.left;
                const relativeTop = elementRect.top - containerRect.top;
                
                // Store original transform and clear it
                element.dataset.originalTransform = element.style.transform;
                element.style.transform = '';
                
                // Apply pixel-based left/top that visually matches the previous transformed position
                element.style.left = `${relativeLeft}px`;
                element.style.top = `${relativeTop}px`;
                
                // Update original position values for drag calculation
                originalLeft = relativeLeft;
                originalTop = relativeTop;
            } else {
                // Use current style values (parsing as float handles both px and % values)
                originalLeft = parseFloat(element.style.left) || 0;
                originalTop = parseFloat(element.style.top) || 0;
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Calculate new position
            const newLeft = originalLeft + dx;
            const newTop = originalTop + dy;
            
            // Get containerRect for boundary checking
            const containerRect = parentContainer.getBoundingClientRect();
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;
            
            // Clamp to container boundaries
            const clampedLeft = Math.max(0, Math.min(newLeft, containerRect.width - elementWidth));
            const clampedTop = Math.max(0, Math.min(newTop, containerRect.height - elementHeight));

            // Apply the position in pixels
            element.style.left = `${clampedLeft}px`;
            element.style.top = `${clampedTop}px`;
            
            // Update values for continuous dragging
            startX = e.clientX;
            startY = e.clientY;
            originalLeft = clampedLeft;
            originalTop = clampedTop;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = element.dataset.originalZIndex || '100';
            document.removeEventListener('mousemove', onMouseMove);
            
            // If we had a rotation in the original transform, reapply it
            if (hasTransform && element.dataset.originalTransform) {
                const rotateMatch = element.dataset.originalTransform.match(/rotate\(([^)]+)\)/);
                if (rotateMatch) {
                    // Extract the rotation component
                    const rotation = rotateMatch[0];
                    // Apply rotation while keeping the new position
                    element.style.transform = rotation;
                }
                // Clean up the stored transform data
                delete element.dataset.originalTransform;
            }

            // Reset the grid position in TextManager
            try {
                if (this.comicCreator && this.comicCreator.textManager) {
                    this.comicCreator.textManager.resetTextPositionGrid(element);
                }
            } catch (e) {
                console.warn("Could not reset text position grid:", e);
            }
            
            this.comicCreator.saveCurrentPageState();
        };

        // Initialize cursor and add listeners
        handle.style.cursor = 'grab';
        handle.addEventListener('mousedown', onMouseDown);
        element.addEventListener('mousedown', onMouseDown);
        element.addEventListener('dragstart', (e) => e.preventDefault());
    }

    // --- Sticker Dragging --- 
    makeStickerDraggable(element, options = {}) {
        let isDragging = false;
        let startX, startY;
        let startElementX, startElementY; // Visual coordinates of the element
        let originalLeft, originalTop;
        let hasTransform;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only handle left mouse button
            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            element.style.cursor = 'grabbing';
            element.style.zIndex = '1000'; // Bring to front while dragging

            startX = e.clientX;
            startY = e.clientY;
            
            // Get the element's VISUAL position using getBoundingClientRect, which accounts for transforms
            const rect = element.getBoundingClientRect();
            startElementX = rect.left;
            startElementY = rect.top;
            
            // Store the original style values (these might be percentages or pixels)
            originalLeft = element.style.left;
            originalTop = element.style.top;
            
            // Check if this element has transforms applied
            hasTransform = element.style.transform && element.style.transform.includes('translate');
            
            // When there's a transform applied, we need to switch the element to absolute pixel positioning
            // for accurate dragging, and will restore the previous styling on drag end
            if (hasTransform) {
                // Get the canvas to calculate relative position
                const canvas = document.querySelector('#comic-canvas');
                if (canvas) {
                    const canvasRect = canvas.getBoundingClientRect();
                    
                    // Calculate the position relative to the container in pixels
                    const relativeLeft = rect.left - canvasRect.left;
                    const relativeTop = rect.top - canvasRect.top;
                    
                    // Store original transform and clear it
                    element.dataset.originalTransform = element.style.transform;
                    element.style.transform = '';
                    
                    // Apply pixel-based left/top that visually matches the previous transformed position
                    element.style.left = `${relativeLeft}px`;
                    element.style.top = `${relativeTop}px`;
                }
            }
            
            // Call the onDragStart callback if provided
            if (options.onDragStart && typeof options.onDragStart === 'function') {
                options.onDragStart(element);
            }

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
            
            // Calculate new position based on mouse movement
            const canvasRect = canvas.getBoundingClientRect();
            const stickerRect = element.getBoundingClientRect();
            
            // Move based on the current element position plus delta
            let newLeft = (parseFloat(element.style.left) || 0) + dx;
            let newTop = (parseFloat(element.style.top) || 0) + dy;
            
            // Boundary checks
            const canvasClientWidth = canvas.clientWidth;
            const canvasClientHeight = canvas.clientHeight;
            const elementWidth = stickerRect.width;
            const elementHeight = stickerRect.height;

            newLeft = Math.max(0, Math.min(newLeft, canvasClientWidth - elementWidth));
            newTop = Math.max(0, Math.min(newTop, canvasClientHeight - elementHeight));
            
            // Apply the new position
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
            
            // Update the start position for the next movement
            startX = e.clientX;
            startY = e.clientY;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.zIndex = '100'; // Reset z-index or use saved state

            document.removeEventListener('mousemove', onMouseMove);
            
            // If we modified a transform during drag, reset the positioning method
            // to percentage-based without transforms for clean state
            if (hasTransform) {
                // Convert current pixel position to percentage of parent
                const canvas = document.querySelector('#comic-canvas');
                if (canvas) {
                    const canvasRect = canvas.getBoundingClientRect();
                    const elementRect = element.getBoundingClientRect();
                    
                    // Calculate center position of the element
                    const centerX = elementRect.left + (elementRect.width / 2) - canvasRect.left;
                    const centerY = elementRect.top + (elementRect.height / 2) - canvasRect.top;
                    
                    // Convert to percentage
                    const percentX = (centerX / canvas.clientWidth) * 100;
                    const percentY = (centerY / canvas.clientHeight) * 100;
                    
                    // Apply the center position without transforms
                    element.style.transform = '';
                    element.style.left = `${percentX}%`;
                    element.style.top = `${percentY}%`;
                }
            }
            
            // Call the onDragEnd callback if provided
            if (options.onDragEnd && typeof options.onDragEnd === 'function') {
                options.onDragEnd(element);
            } else {
                // Update state (using comicCreator reference) if no callback provided
                this.comicCreator.saveCurrentPageState();
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