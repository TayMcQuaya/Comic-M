// Remove the unused import
// import { deepCopy } from './Utils.js'; // Assuming a deepCopy utility exists or will be added

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
        } else if (actionType === 'sticker') {
             // Keep sticker logic selective if desired (or revert to full copy later)
             return {
                layout: currentPage.layout, 
                stickerStates: JSON.parse(JSON.stringify(currentPage.stickerStates || []))
             };
        } else if (actionType === 'text' || actionType === 'text_create') {
             // Keep text logic selective
             return {
                 layout: currentPage.layout, 
                 panelStates: currentPage.panelStates.map(panel => ({ // Only need text from panels
                     id: panel.id, 
                     textElements: panel.textElements || []
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
        if (this.historyStack.length === 0) {
            console.warn("Nothing to undo");
            this.comicCreator.uiManager?.showNotification("Nothing to undo", "info");
            return;
        }

        this.isUndoingOrRedoing = true;
        try {
            const previousEntry = this.historyStack.pop();
            const { pageState, pageIndex, isNewPage, actionType, timestamp } = previousEntry;
            
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
                        // Restore using the potentially selective sticker state
                        currentPage.stickerStates = JSON.parse(JSON.stringify(pageState.stickerStates || []));
                        break;
                    case 'text_create':
                    case 'text':
                        // Restore text using the selective state saved
                        if (pageState.panelStates && pageState.canvasTextElements !== undefined) {
                            currentPage.panelStates.forEach((panel) => {
                                const previousPanelState = pageState.panelStates.find(p => p.id === panel.id);
                                if (previousPanelState) {
                                    panel.textElements = JSON.parse(JSON.stringify(previousPanelState.textElements || []));
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
        this.recordSnapshotBeforeAction();
    }
}

// We might need to export this if Utils.js doesn't exist or deepCopy isn't there.
// Simple deep copy for plain objects/arrays. Fails on Dates, Functions, Regexps, etc.
// function deepCopy(obj) {
//     if (typeof obj !== 'object' || obj === null) {
//         return obj; // Primitive value or null
//     }
//     try {
//       return JSON.parse(JSON.stringify(obj));
//     } catch (e) {
//       console.error("Deep copy failed, returning original object.", e);
//       return obj; // Fallback to original reference if stringify fails
//     }
// }


export { HistoryManager }; 