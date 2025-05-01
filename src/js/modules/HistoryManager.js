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
     */
    recordSnapshotBeforeAction(isNewPage = false, actionType = null) {
        if (this.isUndoingOrRedoing) return;

        try {
            const currentPageIndex = this.comicCreator.currentPageIndex;
            const currentPage = this.comicCreator.pages[currentPageIndex];
            if (!currentPage) return;

            // Create a selective copy based on action type
            let stateCopy;
            if (isNewPage) {
                // For new pages, store the previous page's full state
                stateCopy = JSON.parse(JSON.stringify(currentPage));
            } else {
                // For other actions, only store relevant state
                stateCopy = this.createSelectiveStateCopy(currentPage, actionType);
            }

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

            console.log("State recorded.", {
                historySize: this.historyStack.length,
                actionType: actionType,
                isNewPage: isNewPage,
                timestamp: historyEntry.timestamp
            });
        } catch (error) {
            console.error("Error recording state:", error);
        }
    }

    createSelectiveStateCopy(currentPage, actionType) {
        const baseCopy = {
            layout: currentPage.layout
        };

        switch (actionType) {
            case 'panel':
                baseCopy.panelStates = JSON.parse(JSON.stringify(currentPage.panelStates));
                break;
            case 'sticker':
                baseCopy.stickerStates = JSON.parse(JSON.stringify(currentPage.stickerStates || []));
                break;
            case 'text_create':
            case 'text':
                // Only copy text-related properties
                baseCopy.panelStates = currentPage.panelStates.map(panel => {
                    // Only include text elements and minimal panel info
                    return {
                        id: panel.id, // Keep panel ID for reference
                        textElements: panel.textElements || []
                    };
                });
                baseCopy.canvasTextElements = currentPage.canvasTextElements || [];
                break;
            case 'background':
                baseCopy.backgroundState = JSON.parse(JSON.stringify(currentPage.backgroundState));
                baseCopy.canvasBackgroundStyle = currentPage.canvasBackgroundStyle;
                break;
            default:
                // If no specific action type, copy everything
                return JSON.parse(JSON.stringify(currentPage));
        }

        return baseCopy;
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
                
                // Selectively update only the relevant parts based on action type
                switch (actionType) {
                    case 'panel':
                        currentPage.panelStates = JSON.parse(JSON.stringify(pageState.panelStates));
                        break;
                    case 'sticker':
                        currentPage.stickerStates = JSON.parse(JSON.stringify(pageState.stickerStates || []));
                        break;
                    case 'text_create':
                    case 'text':
                        // Update text elements while preserving other panel properties
                        currentPage.panelStates.forEach((panel, idx) => {
                            const previousPanelState = pageState.panelStates.find(p => p.id === panel.id);
                            if (previousPanelState) {
                                panel.textElements = JSON.parse(JSON.stringify(previousPanelState.textElements || []));
                            }
                        });
                        currentPage.canvasTextElements = JSON.parse(JSON.stringify(pageState.canvasTextElements || []));
                        break;
                    case 'background':
                        currentPage.backgroundState = JSON.parse(JSON.stringify(pageState.backgroundState));
                        currentPage.canvasBackgroundStyle = pageState.canvasBackgroundStyle;
                        break;
                    default:
                        // If no specific action type, restore everything
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