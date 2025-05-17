export class TextManagerCoreSetup {
    constructor(comicCreator) {
        // Store a reference to the main ComicCreator instance
        // This allows the TextManager to access properties (like pages, uploadedImages)
        // and methods (like showNotification, selectPanel) from the main application.
        this.comicCreator = comicCreator;

        // Track the currently selected text box element within the editor
        this.currentTextBox = null; // This property is part of the original TextManager's state.
                                    // It might be managed by a different refactored module later
                                    // or the integrating class, but for now, we initialize it
                                    // as it was in the original constructor's scope.

        // Default font settings
        this.defaultTextSettings = {
            fontFamily: 'Arial',
            fontSize: '16px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'center',
            color: '#000000',
            bubbleType: 'speech-bubble'
        };
        
        // Default SVG tail settings for speech bubbles
        this.defaultSpeechTailSettings = {
            useSvgTail: true,
            tailColor: '#ffffff', // Match bubble background by default
            tailPosition: 'bottom',
            speechTailLength: 20,
            speechTailWidth: 15,
            speechTailInset: 50, // percent
            speechTailShear: 0, // percent
            speechTailOutline: true
        };
        
        // Default SVG tail settings for thought bubbles
        this.defaultThoughtTailSettings = {
            useSvgTail: true,
            tailColor: '#ffffff', // Match bubble background by default
            tailPosition: 'bottom',
            thoughtTailInset: 50, // percent
            thoughtNumCircles: 3,
            thoughtCircleRadius: 5,
            thoughtCircleSpacing: 5,
            thoughtTailOffset: 0
        };
        
        // Array to store custom text styles
        this.customTextStyles = [];
        
        // Load saved settings
        this.loadTextSettings();

        console.log("TextManagerCoreSetup: Settings initialized and loaded."); // Modified console log for clarity
    }

    /**
     * Saves the current text settings to local storage
     */
    saveTextSettings() {
        try {
            localStorage.setItem('comicCreator_defaultTextSettings', JSON.stringify(this.defaultTextSettings));
            localStorage.setItem('comicCreator_customTextStyles', JSON.stringify(this.customTextStyles));
        } catch (e) {
            console.error('Failed to save text settings to localStorage:', e);
        }
    }

    /**
     * Loads saved text settings from local storage
     */
    loadTextSettings() {
        try {
            const savedDefaultSettings = localStorage.getItem('comicCreator_defaultTextSettings');
            const savedCustomStyles = localStorage.getItem('comicCreator_customTextStyles');
            
            if (savedDefaultSettings) {
                this.defaultTextSettings = JSON.parse(savedDefaultSettings);
            }
            
            if (savedCustomStyles) {
                this.customTextStyles = JSON.parse(savedCustomStyles);
            }
        } catch (e) {
            console.error('Failed to load text settings from localStorage:', e);
        }
    }
} 