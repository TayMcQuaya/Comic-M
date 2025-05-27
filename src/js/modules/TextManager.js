// TextManager.js - The new central coordinator for all text-related functionalities
import { TextManagerCoreSetup } from './TextManagerCoreSetup.js';
import { TextManagerBubbleManipulation } from './TextManagerBubbleManipulation.js';
import { TextManagerStyling } from './TextManagerStyling.js';
import { TextManagerCustomStyles } from './TextManagerCustomStyles.js';
import { TextManagerState } from './TextManagerState.js';
import { TextManagerUtils } from './TextManagerUtils.js';
// Ensure Utils.js is in the same directory or adjust path
// import { globalRgbToHex, getTextWithLineBreaks } from './Utils.js';


export class TextManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;

        // Instantiate modules and make them available as properties of this TextManager
        // Also, assign them to comicCreator directly if sub-modules expect to find them there
        // (e.g., this.comicCreator.textManagerStyling.method())

        // 1. Core Setup
        this.coreSetup = new TextManagerCoreSetup(this.comicCreator);
        // if (this.comicCreator) this.comicCreator.textManagerCoreSetup = this.coreSetup; // If needed by this name

        // 2. Utilities
        this.utils = new TextManagerUtils(this.comicCreator);
        if (this.comicCreator) this.comicCreator.textManagerUtils = this.utils;

        // 3. Bubble Manipulation
        this.bubbleManipulation = new TextManagerBubbleManipulation(
            this.comicCreator,
            this.coreSetup.defaultTextSettings
        );
        if (this.comicCreator) this.comicCreator.textManagerBubbleManipulation = this.bubbleManipulation;

        // 4. Styling
        this.styling = new TextManagerStyling(
            this.comicCreator,
            this.coreSetup.defaultSpeechTailSettings,
            this.coreSetup.defaultThoughtTailSettings,
            this.coreSetup.customTextStyles
        );
        if (this.comicCreator) this.comicCreator.textManagerStyling = this.styling;

        // 5. Custom Styles
        this.customStyles = new TextManagerCustomStyles(
            this.comicCreator,
            this.coreSetup.defaultTextSettings,
            this.coreSetup.customTextStyles
        );
        if (this.comicCreator) this.comicCreator.textManagerCustomStyles = this.customStyles;

        // 6. State Management
        this.state = new TextManagerState(this.comicCreator);
        // if (this.comicCreator) this.comicCreator.textManagerState = this.state; // If needed
        
        // Load initial settings after all modules are potentially set on comicCreator
        this.coreSetup.loadTextSettings();
    }

    // --- Public Properties (getters to maintain API from TextManagerOld.js) ---
    get currentTextBox() {
        return this.bubbleManipulation.currentTextBox;
    }

    get defaultTextSettings() {
        return this.coreSetup.defaultTextSettings;
    }
    set defaultTextSettings(value) { // If direct modification was possible/intended
        this.coreSetup.defaultTextSettings = value;
    }

    get defaultSpeechTailSettings() {
        return this.coreSetup.defaultSpeechTailSettings;
    }
    set defaultSpeechTailSettings(value) {
        this.coreSetup.defaultSpeechTailSettings = value;
    }

    get defaultThoughtTailSettings() {
        return this.coreSetup.defaultThoughtTailSettings;
    }
    set defaultThoughtTailSettings(value) {
        this.coreSetup.defaultThoughtTailSettings = value;
    }

    get customTextStyles() {
        return this.coreSetup.customTextStyles;
    }
    set customTextStyles(value) { // If direct modification was possible/intended
        this.coreSetup.customTextStyles = value;
    }

    // --- Facade Methods (mimicking TextManagerOld.js public API) ---

    // Category 1: Initialization and Core Setup
    loadTextSettings() {
        return this.coreSetup.loadTextSettings();
    }

    saveTextSettings() {
        return this.coreSetup.saveTextSettings();
    }

    // Category 2: Text Bubble Creation and Selection
    addTextToPanel(panel) {
        return this.bubbleManipulation.addTextToPanel(panel);
    }

    addTextToCanvas() {
        return this.bubbleManipulation.addTextToCanvas();
    }

    selectTextBox(textBox) {
        // The selectTextBox in BubbleManipulation handles setting its currentTextBox
        // and calling updateTextProperties via comicCreator.textManagerStyling
        return this.bubbleManipulation.selectTextBox(textBox);
    }

    deselectTextBox() {
        if (this.bubbleManipulation) {
            return this.bubbleManipulation.deselectCurrentTextBox();
        }
        console.warn("TextManager: bubbleManipulation module not found for deselectTextBox.");
    }

    deleteSelectedTextBox() {
        if (!this.bubbleManipulation.currentTextBox) return;

        if (this.comicCreator.historyManager) {
            this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text');
        } else {
            console.warn('TextManager: comicCreator.historyManager not found for deleteSelectedTextBox.');
        }

        this.bubbleManipulation.deleteSelectedTextBox(); // This uses and nullifies its internal currentTextBox

        if (this.comicCreator.deselectAll) {
             this.comicCreator.deselectAll();
        }
        if (this.comicCreator.saveCurrentPageState) {
            this.comicCreator.saveCurrentPageState();
        }
    }

    // Category 3: Text and Bubble Styling
    updateTextProperties(textBox) {
        return this.styling.updateTextProperties(textBox);
    }

    showTextFormatPopup(textBox, event) {
        return this.styling.showTextFormatPopup(textBox, event);
    }

    updatePopupControls(popup, textBox) { // Exposed if it was used by external modules
        return this.styling.updatePopupControls(popup, textBox);
    }

    applyTextOutline(textElement, color, thickness) {
        return this.styling.applyTextOutline(textElement, color, thickness);
    }

    removeTextOutline(textElement) {
        return this.styling.removeTextOutline(textElement);
    }

    applyTextShadow(textElement, color, offsetX, offsetY, blur) {
        return this.styling.applyTextShadow(textElement, color, offsetX, offsetY, blur);
    }

    removeTextShadow(textElement) {
        return this.styling.removeTextShadow(textElement);
    }

    updateBubbleTail(textBox, position) {
        return this.styling.updateBubbleTail(textBox, position);
    }

    createSpeechBubbleSvgTail(textBox, settings) {
        return this.styling.createSpeechBubbleSvgTail(textBox, settings);
    }

    createThoughtBubbleSvgTail(textBox, settings) {
        return this.styling.createThoughtBubbleSvgTail(textBox, settings);
    }

    updateSvgTailSettings(textBox, newSettings) {
        return this.styling.updateSvgTailSettings(textBox, newSettings);
    }

    positionTextBox(textBox, position) {
        return this.styling.positionTextBox(textBox, position);
    }

    // Category 4: Custom Text Styles Management
    setDefaultTextSettings(textBox) {
        // This method in customStyles also calls uiManager.showNotification
        // and its internal saveTextSettings (which delegates to coreSetup.saveTextSettings eventually if refactored fully)
        return this.customStyles.setDefaultTextSettings(textBox);
    }

    createCustomTextStyle(textBox, styleName) {
        return this.customStyles.createCustomTextStyle(textBox, styleName);
    }

    applyCustomTextStyle(textBox, styleId) {
        return this.customStyles.applyCustomTextStyle(textBox, styleId);
    }

    deleteCustomTextStyle(styleId) {
        return this.customStyles.deleteCustomTextStyle(styleId);
    }

    generateCustomStylesHTML() {
        return this.customStyles.generateCustomStylesHTML();
    }
    
    updateOutlineButtonsInPopup(popup, textElement) {
        return this.customStyles.updateOutlineButtonsInPopup(popup, textElement);
    }

    // Category 5: State Management
    saveTextStates() {
        return this.state.saveTextStates();
    }

    loadTextStates(pageState) {
        return this.state.loadTextStates(pageState);
    }

    // Category 6: Utility and Helper Methods
    // These are primarily for internal use by other TextManager modules (via comicCreator.textManagerUtils).
    // They are not typically part of the main TextManager's public API unless an external module needed them directly.
    // Example:
    // getRotationValue(textBox) {
    //     return this.utils.getRotationValue(textBox);
    // }
    resetTextPositionGrid(textBox) { // This one might be called by DragAndDropManager externally
        return this.utils.resetTextPositionGrid(textBox);
    }

    finalizeTextBubblePosition(textBubble, textState, K_avg_scale) { // Also potentially called during export process
        return this.utils.finalizeTextBubblePosition(textBubble, textState, K_avg_scale);
    }
} 