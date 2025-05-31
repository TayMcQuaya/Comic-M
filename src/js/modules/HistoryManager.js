class HistoryManager {
    /**
     * Creates an instance of HistoryManager.
     * @param {ComicCreator} comicCreator - The main ComicCreator instance.
     * @param {number} [maxHistorySize=50] - The maximum number of undo steps.
     */
    constructor(comicCreator, maxHistorySize = 50) {
        this.comicCreator = comicCreator;
        this.maxHistorySize = maxHistorySize;
        this.historyStack = []; // [{pageState, pageIndex, isNewPage, actionType}]
        this.redoStack = []; // For future redo functionality
        this.isUndoingOrRedoing = false;
        console.log("History Manager Initialized");
    }

    /**
     * Records the current state BEFORE an action modifies it.
     * Must be called before the action takes place.
     * Ensures deep copies are stored.
     * @param {boolean} [isNewPage=false] - Indicates if the action is adding a new page.
     * @param {string|null} [actionType=null] - The type of action being performed (e.g., 'panel', 'text', 'sticker').
     * @param {object|null} [options=null] - Additional options specific to the action type (e.g., { targetPanelIndex: number }).
     */
    recordSnapshotBeforeAction(isNewPage = false, actionType = null, options = null) {
        if (this.isUndoingOrRedoing) return;

        try {
            const currentPageIndex = this.comicCreator.currentPageIndex;
            const currentPage = this.comicCreator.pages[currentPageIndex];
            if (!currentPage) return;

            // Pass options (like targetPanelIndex) to createSelectiveStateCopy
            const stateCopy = this.createSelectiveStateCopy(currentPage, actionType, options); 

            const historyEntry = {
                pageState: stateCopy,
                pageIndex: currentPageIndex,
                isNewPage: isNewPage,
                actionType: actionType,
                timestamp: Date.now() // Add timestamp for debugging
            };
            
            // Clear redo stack when new action is performed
            this.redoStack = [];
            
            this.historyStack.push(historyEntry);

            // Maintain history size limit
            while (this.historyStack.length > this.maxHistorySize) {
                this.historyStack.shift();
            }

            // --- Improved Logging ---
            console.log("State recorded.", {
                historySize: this.historyStack.length,
                actionType: historyEntry.actionType, // Use value from historyEntry
                isNewPage: historyEntry.isNewPage,   // Use value from historyEntry
                layoutIdSaved: historyEntry.pageState?.layout, // Log the layout ID actually saved in the state object
                timestamp: historyEntry.timestamp
            });
            // --- End Improved Logging ---
        } catch (error) {
            console.error("Error recording state:", error);
        }
    }

    /**
     * Creates a state copy. For specific actions, it copies only relevant parts.
     * @param {object} currentPage - The current page object.
     * @param {string|null} actionType - The type of action.
     * @param {object|null} options - Additional options (e.g., { targetPanelIndex: number }).
     * @returns {object} - The state copy.
     */
    createSelectiveStateCopy(currentPage, actionType, options) {
        // Log the layout ID BEFORE copying
        console.log(`[HistoryManager] Creating copy. Layout on input page object: ${currentPage?.layout}`);

        // --- Handle selective copying based on actionType --- 
        if (actionType === 'panel' && options && options.targetPanelIndex !== undefined && options.targetPanelIndex !== -1) {
            const targetIndex = options.targetPanelIndex;
            
            // --- Add logging for the state being copied --- 
            const panelStateToCopy = (currentPage.panelStates && currentPage.panelStates[targetIndex]) 
                ? currentPage.panelStates[targetIndex] 
                : null; // Get the actual state object reference
            console.log(`[HistoryManager] State of panel ${targetIndex} BEFORE copy:`, JSON.stringify(panelStateToCopy));
            // --- End logging ---

            const previousPanelState = panelStateToCopy 
                ? JSON.parse(JSON.stringify(panelStateToCopy)) // Deep copy it
                : { imageId: null, transform: null, textElements: [] }; // Default empty state if somehow undefined
            
            console.log(`[HistoryManager] Selectively copying panel state for index: ${targetIndex}`);
            
            // Store layout, target index, and previous state of THAT panel
            return {
                layout: currentPage.layout, // Still need layout for restore
                targetPanelIndex: targetIndex,
                previousPanelState: previousPanelState
            };
        } else if (actionType === 'text_transform' && options && options.textId) {
            console.log(`[HistoryManager] Selectively copying text transform for ID: ${options.textId}`);
            const textBubble = document.getElementById(options.textId);
            if (textBubble) {
                const parentElement = textBubble.parentElement;
                let parentId = null;
                let parentType = 'canvas'; // Assume canvas initially

                if (parentElement) {
                    if (parentElement.classList.contains('comic-panel')) {
                        parentId = parentElement.id;
                        parentType = 'panel';
                    } else if (parentElement.id === 'comic-canvas') {
                        parentId = parentElement.id; // Explicitly 'comic-canvas'
                    }
                }
                
                return {
                    layout: currentPage.layout, // For context
                    actionType: 'text_transform', // Explicitly store for clarity in undo
                    textId: options.textId,
                    previousTransform: {
                        left: textBubble.style.left,
                        top: textBubble.style.top,
                        width: textBubble.style.width,
                        height: textBubble.style.height,
                        transform: textBubble.style.transform,
                    },
                    parentId: parentId,
                    parentType: parentType, // 'panel' or 'canvas'
                };
            } else {
                console.warn(`[HistoryManager] Text bubble ${options.textId} not found for transform copy.`);
                 return {
                     layout: currentPage.layout, 
                     panelStates: currentPage.panelStates.map(panel => ({
                         id: panel.id, 
                         textElements: panel.textElements || []
                     })),
                     canvasTextElements: JSON.parse(JSON.stringify(currentPage.canvasTextElements || []))
                 };
            }
        } else if (actionType === 'sticker') {
             // Make sticker logic more complete - save all sticker states with a deep copy
             console.log(`[HistoryManager] Creating selective sticker state copy`);
             // Only save what's needed for stickers to restore
             const stickerStateCopy = currentPage.stickerStates ? 
                 JSON.parse(JSON.stringify(currentPage.stickerStates)) : [];
             
             return {
                layout: currentPage.layout, 
                stickerStates: stickerStateCopy
             };
        } else if (actionType === 'text' || actionType === 'text_create') {
             // Keep text logic selective but preserve panel structure
             return {
                 layout: currentPage.layout, 
                 panelStates: currentPage.panelStates.map(panel => ({
                     ...panel, // Keep all panel properties
                     id: panel.id,
                     textElements: panel.textElements ? JSON.parse(JSON.stringify(panel.textElements)) : []
                 })),
                 canvasTextElements: JSON.parse(JSON.stringify(currentPage.canvasTextElements || []))
             };
        } else if (actionType === 'background') {
             // Keep background logic selective
             return {
                 layout: currentPage.layout, 
                 backgroundState: JSON.parse(JSON.stringify(currentPage.backgroundState)),
                 canvasBackgroundStyle: currentPage.canvasBackgroundStyle
             };
        }
        // --- End selective copying --- 

        // Default: For 'new page', other actions, or if selective logic fails, return full copy
        console.log(`[HistoryManager] Performing full state copy (actionType: ${actionType})`);
        return JSON.parse(JSON.stringify(currentPage));
    }

    /**
     * Reverts the application state to the previous state in the history stack.
     */
    undo() {
        // First check if we can undo
        if (this.historyStack.length === 0) {
            console.warn("Nothing to undo");
            this.comicCreator.uiManager?.showNotification("Nothing to undo", "info");
            return;
        }

        // Check if we're at the initial state (only one state left and it's the initial state)
        const lastEntry = this.historyStack[this.historyStack.length - 1];
        if (this.historyStack.length === 1 && lastEntry.isInitialState) {
            console.warn("Cannot undo: At initial state");
            this.comicCreator.uiManager?.showNotification("Nothing to undo - At initial state", "info");
            return;
        }

        // Check if next state would be initial state
        const previousEntry = this.historyStack[this.historyStack.length - 2];
        if (previousEntry && previousEntry.isInitialState) {
            console.warn("Cannot undo: Would reach initial state");
            this.comicCreator.uiManager?.showNotification("Nothing to undo - At initial state", "info");
            return;
        }

        this.isUndoingOrRedoing = true;
        try {
            const stateToUndo = this.historyStack.pop();
            const { pageState, pageIndex, isNewPage, actionType, timestamp } = stateToUndo;
            
            // Save current state for potential redo
            const currentState = this.createSelectiveStateCopy(
                this.comicCreator.pages[this.comicCreator.currentPageIndex],
                actionType
            );
            
            this.redoStack.push({
                pageState: currentState,
                pageIndex: this.comicCreator.currentPageIndex,
                isNewPage: false,
                actionType: actionType,
                timestamp: Date.now()
            });
            
            if (isNewPage) {
                if (this.comicCreator.pages.length > 1) {
                    this.comicCreator.pages.splice(this.comicCreator.currentPageIndex, 1);
                    this.comicCreator.currentPageIndex = pageIndex;
                    this.comicCreator.loadPageState(pageIndex);
                    
                    this.comicCreator.updatePageIndicator();
                    this.comicCreator.updateNavigationButtons();
                } else {
                    console.warn("Cannot delete the last page");
                    this.comicCreator.uiManager?.showNotification("Cannot delete the last page", "warning");
                    return;
                }
            } else {
                // Get current page
                const currentPage = this.comicCreator.pages[pageIndex];
                
                // --- Log the layout ID we are about to restore ---
                console.log(`[Undo] Restoring layout ID: ${pageState.layout} from history state for page ${pageIndex}`);
                // --- End logging ---
                
                // --- Always restore the layout from the snapshot --- 
                // Ensure layout exists on pageState, otherwise use current page's layout
                currentPage.layout = pageState.layout || currentPage.layout;
                // --- End layout restoration ---

                // Selectively update only the relevant parts based on action type
                switch (actionType) {
                    case 'panel':
                        // NEW LOGIC for specific panel restore
                        if (pageState.targetPanelIndex !== undefined && pageState.previousPanelState !== undefined) {
                            const targetIndex = pageState.targetPanelIndex;
                            console.log(`[Undo] Restoring state for single panel index: ${targetIndex}`);
                            if (currentPage.panelStates && currentPage.panelStates[targetIndex]) {
                                // Restore the specific panel state
                                currentPage.panelStates[targetIndex] = JSON.parse(JSON.stringify(pageState.previousPanelState));
                            } else {
                                console.warn(`[Undo] Cannot restore panel state - Panel index ${targetIndex} not found in current page state.`);
                            }
                        } else {
                            // Fallback to old behavior if specific panel info is missing (shouldn't happen with new save logic)
                            console.warn("[Undo] Panel action type, but missing specific panel info. Restoring full panelStates.");
                            currentPage.panelStates = JSON.parse(JSON.stringify(pageState.panelStates || [])); // Use pageState.panelStates if available
                        }
                        break;
                    case 'sticker':
                        // Improve sticker state restoration with better logging and error handling
                        console.log(`[Undo] Restoring sticker states from history.`);
                        
                        if (pageState.stickerStates !== undefined) {
                            // Deep copy the sticker states to avoid reference issues
                            currentPage.stickerStates = JSON.parse(JSON.stringify(pageState.stickerStates));
                            console.log(`[Undo] Restored ${currentPage.stickerStates.length} sticker states.`);
                        } else {
                            console.warn("[Undo] Sticker action type, but missing sticker state info. Restoring full page.");
                            Object.assign(currentPage, JSON.parse(JSON.stringify(pageState))); // Restore full state as fallback
                        }
                        break;
                    case 'text_create':
                    case 'text':
                        // Restore text using the selective state saved
                        if (pageState.panelStates && pageState.canvasTextElements !== undefined) {
                            // Update panel states while preserving panel structure
                            currentPage.panelStates.forEach((panel, index) => {
                                const previousPanelState = pageState.panelStates[index];
                                if (previousPanelState) {
                                    // Keep panel properties but update text elements
                                    Object.assign(panel, {
                                        ...previousPanelState,
                                        textElements: JSON.parse(JSON.stringify(previousPanelState.textElements || []))
                                    });
                                }
                            });
                            currentPage.canvasTextElements = JSON.parse(JSON.stringify(pageState.canvasTextElements));
                        } else {
                            console.warn("[Undo] Text action type, but missing selective text info. Restoring full page.");
                            Object.assign(currentPage, JSON.parse(JSON.stringify(pageState))); // Restore full state as fallback
                        }
                        break;
                    case 'background':
                         // Restore background using selective state
                         if (pageState.backgroundState !== undefined && pageState.canvasBackgroundStyle !== undefined) {
                            currentPage.backgroundState = JSON.parse(JSON.stringify(pageState.backgroundState));
                            currentPage.canvasBackgroundStyle = pageState.canvasBackgroundStyle;
                         } else {
                             console.warn("[Undo] Background action type, but missing selective background info. Restoring full page.");
                             Object.assign(currentPage, JSON.parse(JSON.stringify(pageState))); // Restore full state as fallback
                         }
                        break;
                    case 'text_transform':
                        if (pageState.textId && pageState.previousTransform) {
                            const textId = pageState.textId;
                            const transformToRestore = pageState.previousTransform;
                            const originalParentId = pageState.parentId;
                            const originalParentType = pageState.parentType;

                            console.log(`[Undo] Preparing to restore transform for text ID: ${textId}. Target parent: ${originalParentId} (${originalParentType})`);

                            let textData = null;
                            let foundInPanel = false;
                            let previousParentPanelIndex = -1;

                            // Find and remove text data from its current location in the model
                            // Check canvas text elements first
                            const canvasTextIndex = currentPage.canvasTextElements?.findIndex(t => t.id === textId);
                            if (canvasTextIndex !== undefined && canvasTextIndex > -1) {
                                textData = currentPage.canvasTextElements.splice(canvasTextIndex, 1)[0];
                                console.log(`[Undo] Found and removed text data for ${textId} from canvasTextElements.`);
                            } else {
                                // Check panel text elements
                                for (let i = 0; i < currentPage.panelStates?.length; i++) {
                                    const panelTextIndex = currentPage.panelStates[i].textElements?.findIndex(t => t.id === textId);
                                    if (panelTextIndex !== undefined && panelTextIndex > -1) {
                                        textData = currentPage.panelStates[i].textElements.splice(panelTextIndex, 1)[0];
                                        previousParentPanelIndex = i; // Remember where it was found
                                        foundInPanel = true;
                                        console.log(`[Undo] Found and removed text data for ${textId} from panelStates[${i}].`);
                                        break;
                                    }
                                }
                            }

                            if (textData) {
                                // Update textData with restored transform
                                textData.style = {
                                    ...textData.style, // Keep existing styles not related to transform
                                    left: transformToRestore.left,
                                    top: transformToRestore.top,
                                    width: transformToRestore.width,
                                    height: transformToRestore.height,
                                    transform: transformToRestore.transform,
                                };

                                // Place textData into its original parent in the model
                                if (originalParentType === 'canvas') {
                                    if (!currentPage.canvasTextElements) {
                                        currentPage.canvasTextElements = [];
                                    }
                                    currentPage.canvasTextElements.push(textData);
                                    console.log(`[Undo] Restored text data for ${textId} to canvasTextElements.`);
                                } else if (originalParentType === 'panel') {
                                    // Find the target panel in the current page's panelStates by ID
                                    // The originalParentId for a panel should be the panel's actual ID (e.g., 'panel-0', 'panel-1')
                                    const targetPanelIndex = currentPage.panelStates?.findIndex(p => p.id === originalParentId);
                                    
                                    if (targetPanelIndex !== undefined && targetPanelIndex > -1) {
                                        if (!currentPage.panelStates[targetPanelIndex].textElements) {
                                            currentPage.panelStates[targetPanelIndex].textElements = [];
                                        }
                                        currentPage.panelStates[targetPanelIndex].textElements.push(textData);
                                        console.log(`[Undo] Restored text data for ${textId} to panelStates[${targetPanelIndex}] (ID: ${originalParentId}).`);
                                    } else {
                                        console.warn(`[Undo] Target panel ID ${originalParentId} not found for text ${textId}. Attempting to place in original index if available, or canvas.`);
                                        // Fallback: if the panel ID is not found (e.g. layout changed drastically),
                                        // try to place it back in its original panel index if that index is still valid.
                                        // This is less robust than ID matching.
                                        if (previousParentPanelIndex !== -1 && currentPage.panelStates && currentPage.panelStates[previousParentPanelIndex]) {
                                             if (!currentPage.panelStates[previousParentPanelIndex].textElements) {
                                                currentPage.panelStates[previousParentPanelIndex].textElements = [];
                                            }
                                            currentPage.panelStates[previousParentPanelIndex].textElements.push(textData);
                                            console.log(`[Undo] Fallback: Restored text data for ${textId} to panelStates[${previousParentPanelIndex}] by original index.`);
                                        } else {
                                            if (!currentPage.canvasTextElements) { currentPage.canvasTextElements = []; }
                                            currentPage.canvasTextElements.push(textData);
                                            console.warn(`[Undo] Fallback: Restored text data for ${textId} to canvasTextElements as panel was not found by ID or index.`);
                                        }
                                    }
                                } else {
                                    console.warn(`[Undo] Unknown originalParentType: ${originalParentType} for text ${textId}. Placing in canvas as default.`);
                                    if (!currentPage.canvasTextElements) { currentPage.canvasTextElements = []; }
                                    currentPage.canvasTextElements.push(textData);
                                }
                            } else {
                                console.warn(`[Undo] Text data for ${textId} not found in the current page model. Cannot restore transform accurately in data model.`);
                                // If textData was not found, the direct DOM manipulation fallback might still be needed,
                                // or we rely on loadPageState to reconstruct from whatever `pageState` contains.
                                // For now, if textData isn't found in the model, we let loadPageState handle it from pageState,
                                // which might lead to the old behavior if pageState for text_transform is just the transform.
                                // This part of the 'else' means we revert to a less precise state restoration for this specific text item.
                                 Object.assign(currentPage, JSON.parse(JSON.stringify(pageState)));
                                 console.warn('[Undo] Applied full pageState due to missing textData in model for text_transform.');
                            }
                        } else {
                            // This else block means pageState.textId or pageState.previousTransform was missing from the history entry.
                            // This indicates an issue with how 'text_transform' was recorded.
                            console.warn("[Undo] Text transform action in history is missing critical 'textId' or 'previousTransform' data. Restoring full page state as a fallback.");
                            // Restore the entire page state for this pageIndex from the history.
                            this.comicCreator.pages[pageIndex] = JSON.parse(JSON.stringify(pageState));
                        }
                        break;
                    default:
                        // If no specific action type, restore the full state from pageState
                        console.log(`[Undo] Default action or unknown type (${actionType}). Restoring full page state.`);
                        // Replace the existing page object with the full state saved
                        this.comicCreator.pages[pageIndex] = JSON.parse(JSON.stringify(pageState));
                }
                
                // Ensure we're on the correct page
                if (this.comicCreator.currentPageIndex !== pageIndex) {
                    this.comicCreator.currentPageIndex = pageIndex;
                }
                
                // Reload the page to reflect changes
                this.comicCreator.loadPageState(pageIndex);
            }
            
            console.log("Undo successful", {
                historySize: this.historyStack.length,
                actionType: actionType,
                timestamp: timestamp
            });
            this.comicCreator.uiManager?.showNotification("Action undone", "success");
        } catch (error) {
            console.error("Error during undo:", error);
            this.comicCreator.uiManager?.showNotification("Error during undo", "error");
        } finally {
            this.isUndoingOrRedoing = false;
        }
    }

    /**
     * Re-applies a previously undone action. (Basic structure for future)
     */
    redo() {
        // Basic structure - Implementation would be similar to undo,
        // but using redoStack and pushing to historyStack.
        if (this.redoStack.length === 0) {
            console.warn("Cannot redo: No redo history available.");
             this.comicCreator.uiManager?.showNotification("Nothing to redo", "info");
            return;
        }
        
        this.isUndoingOrRedoing = true;
        console.log("Attempting redo...");
        try {
             // const stateToRestore = this.redoStack.pop();
             // const currentStateForUndo = this.comicCreator.saveCurrentPageState();
             // this.historyStack.push(JSON.parse(JSON.stringify(currentStateForUndo))); // Deep copy
             // this.comicCreator.loadPageState(stateToRestore);
             // console.log("Action redone. History size:", this.historyStack.length);
             // this.comicCreator.uiManager?.showNotification("Action redone", "success");
             console.warn("Redo not fully implemented yet.");

        } catch(error){
             console.error("Error during redo:", error);
             this.comicCreator.uiManager?.showNotification("Error during redo", "error");
        } finally {
            this.isUndoingOrRedoing = false;
        }
    }

    /**
     * Clears the entire history (e.g., when loading a new project).
     */
    clearHistory() {
        this.historyStack = [];
        console.log("History cleared");
    }

    /**
     * Sets the initial state when a page loads or project starts.
     * This serves as the baseline before any actions are taken.
     */
    initializeWithInitialState() {
        this.clearHistory();
        // Record initial state with special flag
        const currentPageIndex = this.comicCreator.currentPageIndex;
        const currentPage = this.comicCreator.pages[currentPageIndex];
        if (!currentPage) return;

        const initialState = {
            pageState: JSON.parse(JSON.stringify(currentPage)),
            pageIndex: currentPageIndex,
            isNewPage: false,
            actionType: 'initial_state',
            timestamp: Date.now(),
            isInitialState: true // Special flag to mark initial state
        };
        
        this.historyStack.push(initialState);
        console.log("[HistoryManager] History initialized with initial state");
    }

    /**
     * Initializes history with a loaded project state.
     * This should be called after loading a project from JSON or auto-save.
     */
    initializeWithLoadedState() {
        this.clearHistory();
        const currentPageIndex = this.comicCreator.currentPageIndex;
        const currentPage = this.comicCreator.pages[currentPageIndex];
        if (!currentPage) return;

        // First push the empty initial state
        const emptyInitialState = {
            pageState: {
                layout: 'empty',
                panelStates: [],
                canvasBackgroundStyle: 'classic-white',
                canvasTextElements: [],
                stickerStates: [],
                backgroundState: { imageId: null, style: 'classic-white' }
            },
            pageIndex: currentPageIndex,
            isNewPage: false,
            actionType: 'initial_state',
            timestamp: Date.now() - 1, // Slightly earlier timestamp
            isInitialState: true
        };
        
        // Then push the loaded state as a regular state
        const loadedState = {
            pageState: JSON.parse(JSON.stringify(currentPage)),
            pageIndex: currentPageIndex,
            isNewPage: false,
            actionType: 'project_load',
            timestamp: Date.now()
        };

        this.historyStack.push(emptyInitialState);
        this.historyStack.push(loadedState);
        console.log("[HistoryManager] History initialized with loaded project state");
    }
}

export { HistoryManager }; 