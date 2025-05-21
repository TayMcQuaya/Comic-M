import { globalRgbToHex, getTextWithLineBreaks } from './Utils.js'; // Import Utils

export class TextManagerStyling {
    constructor(comicCreator, defaultSpeechTailSettings, defaultThoughtTailSettings, customTextStyles) {
        this.comicCreator = comicCreator;
        this.defaultSpeechTailSettings = defaultSpeechTailSettings; // From CoreSetup
        this.defaultThoughtTailSettings = defaultThoughtTailSettings; // From CoreSetup
        this.customTextStyles = customTextStyles; // From CoreSetup
    }

    updateTextProperties(textBox) {
        const textProperties = document.getElementById('text-properties');
        if (!textProperties) { 
            console.error('Error: Text properties panel (#text-properties) not found in updateTextProperties.');
            return;
        }

        if (!textBox) return;
        
        // Record state before updating text properties
        this.comicCreator.historyManager.recordSnapshotBeforeAction(false, 'text');

        const textElement = textBox.querySelector('.text-content');
        if (!textElement) {
            console.error("Could not find '.text-content' inside the provided textBox element.", textBox);
            textProperties.innerHTML = '<p>Error loading text properties.</p>'; 
            return;
        }
        
        const computedStyle = window.getComputedStyle(textElement);
        
        textProperties.innerHTML = `
            <h4>Text Settings</h4>
            <div class="text-controls">
                <div class="control-group">
                    <label>Bubble Style</label>
                    <select class="bubble-type">
                        <option value="speech-bubble">Speech Bubble</option>
                        <option value="thought-bubble">Thought Bubble</option>
                        <option value="caption-box">Caption/Narration</option>
                        <option value="shout-bubble">Shout Bubble</option>
                        <option value="whisper-bubble">Whisper Bubble</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Font</label>
                    <div class="custom-select">
                    <select class="font-family">
                            <option disabled class="font-category">Common Fonts</option>
                            <option value="Arial" class="font-option">
                                <span class="font-preview font-arial">Arial - Comic Text</span>
                            </option>
                            <option value="Comic Sans MS" class="font-option">
                                <span class="font-preview font-comic-sans">Comic Sans MS - Comic Text</span>
                            </option>
                            <option value="Times New Roman" class="font-option">
                                <span class="font-preview font-times">Times New Roman - Comic Text</span>
                            </option>
                            
                            <option disabled class="font-category">Sound Effects</option>
                            <option value="Impact" class="font-option">
                                <span class="font-preview font-impact">Impact - BOOM!</span>
                            </option>
                            <option value="Bangers" class="font-option">
                                <span class="font-preview font-bangers">Bangers - POW!</span>
                            </option>
                            <option value="Anton" class="font-option">
                                <span class="font-preview font-anton">Anton - CRASH!</span>
                            </option>
                            </option>
                            </option>
                            
                            <option disabled class="font-category">Handwriting Styles</option>
                            <option value="Comic Neue" class="font-option">
                                <span class="font-preview font-comic-neue">Comic Neue - Casual</span>
                            </option>
                            <option value="Permanent Marker" class="font-option">
                                <span class="font-preview font-permanent-marker">Permanent Marker</span>
                            </option>
                            <option value="Gloria Hallelujah" class="font-option" ${textElement.style.fontFamily === 'Gloria Hallelujah' ? 'selected' : ''}>
                                <span class="font-preview font-gloria-hallelujah">Gloria Hallelujah</span>
                            </option>
                            
                            <option disabled class="font-category">Title/Header Fonts</option>
                            <option value="Luckiest Guy" class="font-option" ${textElement.style.fontFamily === 'Luckiest Guy' ? 'selected' : ''}>
                                <span class="font-preview font-luckiest-guy">Luckiest Guy</span>
                            </option>
                            <option value="Boogaloo" class="font-option">
                                <span class="font-preview font-boogaloo">Boogaloo</span>
                            </option>
                            <option value="Acme" class="font-option">
                                <span class="font-preview font-acme">Acme</span>
                            </option>
                            <option value="Bowlby One SC" class="font-option">
                                <span class="font-preview font-bowlby-one-sc">Bowlby One SC</span>
                            </option>
                            <option value="Bungee" class="font-option">
                                <span class="font-preview font-bungee">Bungee</span>
                            </option>
                            <option value="Ceviche One" class="font-option">
                                <span class="font-preview font-ceviche-one">Ceviche One</span>
                            </option>
                            
                            <option disabled class="font-category">Horror/Special Effects</option>
                            <option value="Creepster" class="font-option">
                                <span class="font-preview font-creepster">Creepster - SPOOKY!</span>
                            </option>
                            <option value="Freckle Face" class="font-option">
                                <span class="font-preview font-freckle-face">Freckle Face</span>
                            </option>
                            <option value="Kablammo" class="font-option">
                                <span class="font-preview font-kablammo">Kablammo!</span>
                            </option>
                            <option value="Rubik Puddles" class="font-option">
                                <span class="font-preview font-rubik-puddles">Rubik Puddles</span>
                            </option>
                            
                            <option disabled class="font-category">Sketch/Handdrawn</option>
                            <option value="Finger Paint" class="font-option">
                                <span class="font-preview font-finger-paint">Finger Paint</span>
                            </option>
                            <option value="Londrina Sketch" class="font-option">
                                <span class="font-preview font-londrina-sketch">Londrina Sketch</span>
                            </option>
                            <option value="Rock Salt" class="font-option">
                                <span class="font-preview font-rock-salt">Rock Salt</span>
                            </option>
                    </select>
                    </div>
                </div>
                <div class="control-group">
                    <label>Size</label>
                    <input type="range" class="font-size" min="8" max="36" value="16">
                    <span class="font-size-value">16px</span>
                </div>
                <div class="control-group">
                    <label>Text Color</label>
                    <div class="color-picker-container">
                        <input type="color" class="font-color" value="#000000">
                        <div class="hex-display font-color-hex">#000000</div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Bubble Color</label>
                    <div class="color-picker-container">
                        <input type="color" class="bubble-color" value="#ffffff">
                        <div class="hex-display bubble-color-hex">#ffffff</div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Text Style</label>
                    <div class="text-style-buttons">
                        <button class="style-btn bold-btn ${textElement.style.fontWeight === 'bold' ? 'active' : ''}" title="Bold">
                            <i class="fas fa-bold"></i>
                        </button>
                        <button class="style-btn italic-btn ${textElement.style.fontStyle === 'italic' ? 'active' : ''}" title="Italic">
                            <i class="fas fa-italic"></i>
                        </button>
                        <button class="style-btn underline-btn ${textElement.style.textDecoration === 'underline' ? 'active' : ''}" title="Underline">
                            <i class="fas fa-underline"></i>
                        </button>
                        <button class="style-btn all-caps-btn ${textElement.style.textTransform === 'uppercase' ? 'active' : ''}" title="All Caps">
                            <i class="fas fa-font"></i>
                        </button>
                    </div>
                </div>
                <div class="control-group">
                    <label>Rotation</label>
                    <input type="range" class="rotation" min="-180" max="180" value="0">
                    <span class="rotation-value">0°</span>
                </div>
            </div>
        `;
        
        const bubbleType = textProperties.querySelector('.bubble-type');
        bubbleType.value = textBox.dataset.bubbleType || 'speech-bubble';
        
        const fontFamily = textProperties.querySelector('.font-family');
        fontFamily.value = computedStyle.fontFamily.split(',')[0].replace(/['"]/g, '') || 'Arial';
        
        const fontSize = textProperties.querySelector('.font-size');
        const fontSizeValue = parseInt(computedStyle.fontSize) || 16;
        fontSize.value = fontSizeValue;
        textProperties.querySelector('.font-size-value').textContent = `${fontSizeValue}px`;
        
        const fontColor = textProperties.querySelector('.font-color');
        const fontColorHex = textProperties.querySelector('.font-color-hex');
        const fontColorValue = globalRgbToHex(computedStyle.color) || '#000000'; 
        fontColor.value = fontColorValue;
        fontColorHex.textContent = fontColorValue;
        
        const bubbleColor = textProperties.querySelector('.bubble-color');
        const bubbleColorHex = textProperties.querySelector('.bubble-color-hex');
        const bubbleColorValue = globalRgbToHex(window.getComputedStyle(textBox).backgroundColor) || '#ffffff'; 
        bubbleColor.value = bubbleColorValue;
        bubbleColorHex.textContent = bubbleColorValue;
        
        const rotation = textProperties.querySelector('.rotation');
        const transform = textBox.style.transform;
        const rotationValue = this.comicCreator.textManagerUtils.getRotationValue(textBox);
        rotation.value = rotationValue;
        textProperties.querySelector('.rotation-value').textContent = `${rotationValue}°`;
        
        bubbleType.addEventListener('change', () => {
            textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble');
            textBox.classList.add(bubbleType.value);
            textBox.dataset.bubbleType = bubbleType.value;
            this.comicCreator.saveCurrentPageState();
        });
        
        fontFamily.addEventListener('change', () => {
            textElement.style.fontFamily = fontFamily.value;
            this.comicCreator.saveCurrentPageState();
        });
        
        fontSize.addEventListener('input', () => {
            textElement.style.fontSize = `${fontSize.value}px`;
            textProperties.querySelector('.font-size-value').textContent = `${fontSize.value}px`;
            this.comicCreator.saveCurrentPageState();
        });
        
        fontColor.addEventListener('input', () => {
            textElement.style.color = fontColor.value;
            fontColorHex.textContent = fontColor.value.toUpperCase();
            this.comicCreator.saveCurrentPageState();
        });
        
        fontColorHex.contentEditable = true;
        fontColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = fontColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    fontColor.value = hexValue;
                    textElement.style.color = hexValue;
                    this.comicCreator.saveCurrentPageState(); 
                } else {
                    fontColorHex.textContent = fontColor.value.toUpperCase();
                }
                fontColorHex.blur();
            }
        });
        fontColorHex.addEventListener('blur', () => {
            const hexValue = fontColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                fontColor.value = hexValue;
                textElement.style.color = hexValue;
                this.comicCreator.saveCurrentPageState(); 
            } else {
                fontColorHex.textContent = fontColor.value.toUpperCase();
            }
        });
        
        bubbleColor.addEventListener('input', () => {
            textBox.style.backgroundColor = bubbleColor.value;
            textBox.style.setProperty('--bubble-background-color', bubbleColor.value);
            bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
            this.comicCreator.saveCurrentPageState();
        });
        
        bubbleColorHex.contentEditable = true;
        bubbleColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = bubbleColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    bubbleColor.value = hexValue;
                    textBox.style.backgroundColor = hexValue;
                    textBox.style.setProperty('--bubble-background-color', hexValue);
                    this.comicCreator.saveCurrentPageState(); 
                } else {
                    bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
                }
                bubbleColorHex.blur();
            }
        });
        bubbleColorHex.addEventListener('blur', () => {
            const hexValue = bubbleColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                bubbleColor.value = hexValue;
                textBox.style.backgroundColor = hexValue;
                textBox.style.setProperty('--bubble-background-color', hexValue);
                this.comicCreator.saveCurrentPageState(); 
            } else {
                bubbleColorHex.textContent = bubbleColor.value.toUpperCase();
            }
        });
        
        const boldBtn = textProperties.querySelector('.bold-btn');
        boldBtn.addEventListener('click', () => {
            const isBold = textElement.style.fontWeight === 'bold';
            textElement.style.fontWeight = isBold ? 'normal' : 'bold';
            boldBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        
        const italicBtn = textProperties.querySelector('.italic-btn');
        italicBtn.addEventListener('click', () => {
            const isItalic = textElement.style.fontStyle === 'italic';
            textElement.style.fontStyle = isItalic ? 'normal' : 'italic';
            italicBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        
        const underlineBtn = textProperties.querySelector('.underline-btn');
        underlineBtn.addEventListener('click', () => {
            const isUnderline = textElement.style.textDecoration === 'underline';
            textElement.style.textDecoration = isUnderline ? 'none' : 'underline';
            underlineBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        
        const allCapsBtn = textProperties.querySelector('.all-caps-btn');
        allCapsBtn.addEventListener('click', () => {
            const isAllCaps = textElement.style.textTransform === 'uppercase';
            textElement.style.textTransform = isAllCaps ? 'none' : 'uppercase';
            allCapsBtn.classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        
        const rotationSlider = textProperties.querySelector('.rotation');
        const rotationValueDisplay = textProperties.querySelector('.rotation-value');

         if (rotationSlider) {
            rotationSlider.addEventListener('input', () => {
                const value = rotationSlider.value;
                rotationValueDisplay.textContent = `${Math.round(value)}°`;
                textBox.style.transform = `rotate(${value}deg)`;
                this.comicCreator.saveCurrentPageState();
            });
        }
        
        if (rotationSlider && rotationValueDisplay) { 
            this.comicCreator.uiManager.makeSliderValueEditable(rotationSlider, rotationValueDisplay, '°', 0); // Corrected: rotationValueDisplay instead of rotationValue
        } else {
            console.error("Could not find rotation slider or value display element in text properties panel.");
        }
        
        if (textElement.style.fontWeight === 'bold') boldBtn.classList.add('active');
        if (textElement.style.fontStyle === 'italic') italicBtn.classList.add('active');
        if (textElement.style.textDecoration === 'underline') underlineBtn.classList.add('active');
        if (textElement.style.textTransform === 'uppercase') allCapsBtn.classList.add('active');
    }
    
    showTextFormatPopup(textBox, event) {
        let popup = document.getElementById('text-format-popup');
        if (popup) popup.remove();
        
        // Select this text box (calls selectTextBox from TextManagerBubbleManipulation)
        if (this.comicCreator && this.comicCreator.textManagerBubbleManipulation) {
            this.comicCreator.textManagerBubbleManipulation.selectTextBox(textBox);
        } else {
            console.warn('TextManagerStyling: comicCreator.textManagerBubbleManipulation.selectTextBox not found.');
            // Fallback or error handling if structure is not ready
            // this.selectTextBox(textBox); // Original call - remove if selectTextBox is not locally defined
        }
        
        popup = document.createElement('div');
        popup.id = 'text-format-popup';
        popup.className = 'text-format-popup';
        
        const propertiesPanel = document.querySelector('.properties-panel');
        const propRect = propertiesPanel.getBoundingClientRect();
        const top = propRect.top;
        const left = propRect.left - 310; 
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        
        const textElement = textBox.querySelector('.text-content');
        
         popup.innerHTML = `
            <div class="popup-header">
                <h3>Text Formatting</h3>
                <button class="close-popup"><i class="fas fa-times"></i></button>
            </div>
            <div class="popup-content">
                <!-- Custom Text Styles Section -->
                <div class="popup-section">
                    <h4>Custom Styles</h4>
                    <div class="custom-styles-container">
                        <div class="custom-styles-grid">
                            ${this.comicCreator.textManagerCustomStyles ? this.comicCreator.textManagerCustomStyles.generateCustomStylesHTML() : '<p>Error: CustomStyles module not loaded.</p>'}
                        </div>
                        <div class="custom-styles-actions">
                            <button class="save-as-style-btn primary-btn">
                                <i class="fas fa-save"></i> Save Current Style
                            </button>
                            <button class="set-as-default-btn primary-btn">
                                <i class="fas fa-thumbtack"></i> Set as Default
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Bubble Style</h4>
                    <div class="bubble-toggle">
                        <label>
                            <input type="checkbox" id="show-bubble" ${textBox.dataset.bubbleType !== 'no-bubble' ? 'checked' : ''}>
                            Show Bubble
                        </label>
                    </div>
                    <div class="bubble-options">
                        <div class="bubble-grid">
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'speech-bubble' ? 'selected' : ''}" data-type="speech-bubble">
                                <div class="bubble-preview speech-bubble-preview"></div>
                                <span>Speech</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'thought-bubble' ? 'selected' : ''}" data-type="thought-bubble">
                                <div class="bubble-preview thought-bubble-preview"></div>
                                <span>Thought</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'caption-box' ? 'selected' : ''}" data-type="caption-box">
                                <div class="bubble-preview caption-box-preview"></div>
                                <span>Caption</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'shout-bubble' ? 'selected' : ''}" data-type="shout-bubble">
                                <div class="bubble-preview shout-bubble-preview"></div>
                                <span>Shout</span>
                            </div>
                            <div class="bubble-option ${textBox.dataset.bubbleType === 'whisper-bubble' ? 'selected' : ''}" data-type="whisper-bubble">
                                <div class="bubble-preview whisper-bubble-preview"></div>
                                <span>Whisper</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Bubble Tail</h4>
                    <div class="effect-control">
                        <label for="bubble-tail-position">Tail Position</label>
                        <select id="bubble-tail-position" ${textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box' ? 'disabled' : ''}>
                            <option value="none" ${textBox.dataset.tailPosition === 'none' ? 'selected' : ''}>None</option>
                            <option value="bottom" ${textBox.dataset.tailPosition === 'bottom' ? 'selected' : ''}>Bottom</option>
                            <option value="top" ${textBox.dataset.tailPosition === 'top' ? 'selected' : ''}>Top</option>
                            <option value="left" ${textBox.dataset.tailPosition === 'left' ? 'selected' : ''}>Left</option>
                            <option value="right" ${textBox.dataset.tailPosition === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                        
                        <div class="tail-settings-container" ${textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box' || textBox.dataset.tailPosition === 'none' ? 'style="display: none;"' : ''}>
                            <div class="tail-control">
                                <label for="tail-color">Tail Color</label>
                                <div class="color-picker-container">
                                    <input type="color" id="tail-color" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"tailColor":"#ffffff"}').tailColor : (this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox) : '#ffffff')}">
                                    <div class="hex-display tail-color-hex">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"tailColor":"#ffffff"}').tailColor.toUpperCase() : (this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox).toUpperCase() : '#FFFFFF')}</div>
                                </div>
                            </div>
                            
                            <div class="speech-tail-settings" ${textBox.dataset.bubbleType !== 'speech-bubble' ? 'style="display: none;"' : ''} style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <div class="slider-group">
                                    <label for="speech-tail-length">Length</label>
                                    <input type="range" id="speech-tail-length" min="10" max="60" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailLength":20}').speechTailLength : 20}" step="1">
                                    <span class="speech-tail-length-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailLength":20}').speechTailLength : 20}px</span>
                                </div>
                                <div class="slider-group">
                                    <label for="speech-tail-width">Width</label>
                                    <input type="range" id="speech-tail-width" min="5" max="40" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailWidth":15}').speechTailWidth : 15}" step="1">
                                    <span class="speech-tail-width-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailWidth":15}').speechTailWidth : 15}px</span>
                                </div>
                                <div class="slider-group">
                                    <label for="speech-tail-inset">Position</label>
                                    <input type="range" id="speech-tail-inset" min="10" max="90" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailInset":50}').speechTailInset : 50}" step="1">
                                    <span class="speech-tail-inset-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailInset":50}').speechTailInset : 50}%</span>
                                </div>
                                <div class="slider-group">
                                    <label for="speech-tail-shear">Shear</label>
                                    <input type="range" id="speech-tail-shear" min="-50" max="50" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailShear":0}').speechTailShear || 0 : 0}" step="1">
                                    <span class="speech-tail-shear-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"speechTailShear":0}').speechTailShear || 0 : 0}</span>
                                </div>
                                <div class="tail-control" style="grid-column: span 2;">
                                    <input type="checkbox" id="speech-tail-outline" ${!textBox.dataset.tailSettings || JSON.parse(textBox.dataset.tailSettings || '{"speechTailOutline":true}').speechTailOutline ? 'checked' : ''}>
                                    <label for="speech-tail-outline">Tail Outline</label>
                                </div>
                            </div>
                            
                            <div class="thought-tail-settings" ${textBox.dataset.bubbleType !== 'thought-bubble' ? 'style="display: none;"' : ''} style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <div class="slider-group">
                                    <label for="thought-tail-inset">Position</label>
                                    <input type="range" id="thought-tail-inset" min="10" max="90" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailInset":50}').thoughtTailInset || 50 : 50}" step="1">
                                    <span class="thought-tail-inset-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailInset":50}').thoughtTailInset || 50 : 50}%</span>
                                </div>
                                <div class="slider-group">
                                    <label for="thought-num-circles">Circles</label>
                                    <input type="range" id="thought-num-circles" min="1" max="5" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtNumCircles":3}').thoughtNumCircles : 3}" step="1">
                                    <span class="thought-num-circles-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtNumCircles":3}').thoughtNumCircles : 3}</span>
                                </div>
                                <div class="slider-group">
                                    <label for="thought-circle-radius">Radius</label>
                                    <input type="range" id="thought-circle-radius" min="2" max="10" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleRadius":5}').thoughtCircleRadius : 5}" step="1">
                                    <span class="thought-circle-radius-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleRadius":5}').thoughtCircleRadius : 5}px</span>
                                </div>
                                <div class="slider-group">
                                    <label for="thought-circle-spacing">Spacing</label>
                                    <input type="range" id="thought-circle-spacing" min="2" max="15" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleSpacing":5}').thoughtCircleSpacing : 5}" step="1">
                                    <span class="thought-circle-spacing-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtCircleSpacing":5}').thoughtCircleSpacing : 5}px</span>
                                </div>
                                <div class="slider-group" style="grid-column: span 2;">
                                    <label for="thought-tail-offset">Offset</label>
                                    <input type="range" id="thought-tail-offset" min="-50" max="50" value="${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailOffset":0}').thoughtTailOffset : 0}" step="1">
                                    <span class="thought-tail-offset-value">${textBox.dataset.tailSettings ? JSON.parse(textBox.dataset.tailSettings || '{"thoughtTailOffset":0}').thoughtTailOffset : 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Text Style</h4>
                    <div class="text-font-section">
                        <label for="font-family">Font</label>
                        <select id="font-family" class="font-family">
                            <option disabled class="font-category">Common Fonts</option>
                            <option value="Arial" class="font-option">
                                <span class="font-preview font-arial">Arial - Comic Text</span>
                            </option>
                            <option value="Comic Sans MS" class="font-option">
                                <span class="font-preview font-comic-sans">Comic Sans MS - Comic Text</span>
                            </option>
                            <option value="Times New Roman" class="font-option">
                                <span class="font-preview font-times">Times New Roman - Comic Text</span>
                            </option>
                            
                            <option disabled class="font-category">Sound Effects</option>
                            <option value="Impact" class="font-option">
                                <span class="font-preview font-impact">Impact - BOOM!</span>
                            </option>
                            <option value="Bangers" class="font-option">
                                <span class="font-preview font-bangers">Bangers - POW!</span>
                            </option>
                            <option value="Anton" class="font-option">
                                <span class="font-preview font-anton">Anton - CRASH!</span>
                            </option>
                            </option>
                            </option>
                            
                            <option disabled class="font-category">Handwriting Styles</option>
                            <option value="Comic Neue" class="font-option">
                                <span class="font-preview font-comic-neue">Comic Neue - Casual</span>
                            </option>
                            <option value="Permanent Marker" class="font-option">
                                <span class="font-preview font-permanent-marker">Permanent Marker</span>
                            </option>
                            <option value="Gloria Hallelujah" class="font-option" ${textElement.style.fontFamily === 'Gloria Hallelujah' ? 'selected' : ''}>
                                <span class="font-preview font-gloria-hallelujah">Gloria Hallelujah</span>
                            </option>
                            
                            <option disabled class="font-category">Title/Header Fonts</option>
                            <option value="Luckiest Guy" class="font-option" ${textElement.style.fontFamily === 'Luckiest Guy' ? 'selected' : ''}>
                                <span class="font-preview font-luckiest-guy">Luckiest Guy</span>
                            </option>
                            <option value="Boogaloo" class="font-option">
                                <span class="font-preview font-boogaloo">Boogaloo</span>
                            </option>
                            <option value="Acme" class="font-option">
                                <span class="font-preview font-acme">Acme</span>
                            </option>
                            <option value="Bowlby One SC" class="font-option">
                                <span class="font-preview font-bowlby-one-sc">Bowlby One SC</span>
                            </option>
                            <option value="Bungee" class="font-option">
                                <span class="font-preview font-bungee">Bungee</span>
                            </option>
                            <option value="Ceviche One" class="font-option">
                                <span class="font-preview font-ceviche-one">Ceviche One</span>
                            </option>
                            
                            <option disabled class="font-category">Horror/Special Effects</option>
                            <option value="Creepster" class="font-option">
                                <span class="font-preview font-creepster">Creepster - SPOOKY!</span>
                            </option>
                            <option value="Freckle Face" class="font-option">
                                <span class="font-preview font-freckle-face">Freckle Face</span>
                            </option>
                            <option value="Kablammo" class="font-option">
                                <span class="font-preview font-kablammo">Kablammo!</span>
                            </option>
                            <option value="Rubik Puddles" class="font-option">
                                <span class="font-preview font-rubik-puddles">Rubik Puddles</span>
                            </option>
                            
                            <option disabled class="font-category">Sketch/Handdrawn</option>
                            <option value="Finger Paint" class="font-option">
                                <span class="font-preview font-finger-paint">Finger Paint</span>
                            </option>
                            <option value="Londrina Sketch" class="font-option">
                                <span class="font-preview font-londrina-sketch">Londrina Sketch</span>
                            </option>
                            <option value="Rock Salt" class="font-option">
                                <span class="font-preview font-rock-salt">Rock Salt</span>
                            </option>
                            <option value="Holtwood One SC" class="font-option">
                                <span class="font-preview font-sherlock">Sherlock's Poodle</span>
                            </option>
                        </select>
                    </div>
                    
                    <div class="text-style-grid">
                        <div class="style-control">
                            <label for="font-size">Size</label>
                            <div class="size-control">
                                <input type="range" id="font-size" class="font-size red-slider" min="8" max="72" value="${parseInt(textElement.style.fontSize) || 16}">
                                <span class="font-size-value">${parseInt(textElement.style.fontSize) || 16}px</span>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label for="line-height">Line Spacing</label>
                            <div class="line-height-control" style="display: flex; align-items: center; gap: 10px;">
                                <input type="range" id="line-height" class="line-height red-slider" min="0.8" max="5" step="0.1" value="1.2" style="flex-grow: 1;">
                                <span class="line-height-value" style="min-width: 30px; text-align: right;">1.2</span>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label>Style</label>
                            <div class="text-style-buttons">
                                <button class="style-btn bold-btn ${textElement.style.fontWeight === 'bold' ? 'active' : ''}" title="Bold">
                                    <i class="fas fa-bold"></i>
                                </button>
                                <button class="style-btn italic-btn ${textElement.style.fontStyle === 'italic' ? 'active' : ''}" title="Italic">
                                    <i class="fas fa-italic"></i>
                                </button>
                                <button class="style-btn underline-btn ${textElement.style.textDecoration === 'underline' ? 'active' : ''}" title="Underline">
                                    <i class="fas fa-underline"></i>
                                </button>
                                <button class="style-btn all-caps-btn ${textElement.style.textTransform === 'uppercase' ? 'active' : ''}" title="All Caps">
                                    <i class="fas fa-font"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="style-control">
                            <label>Alignment</label>
                            <div class="text-align-buttons">
                                <button class="align-btn align-left ${textElement.style.textAlign === 'left' ? 'active' : ''}" title="Align Left">
                                    <i class="fas fa-align-left"></i>
                                </button>
                                <button class="align-btn align-center ${!textElement.style.textAlign || textElement.style.textAlign === 'center' ? 'active' : ''}" title="Align Center">
                                    <i class="fas fa-align-center"></i>
                                </button>
                                <button class="align-btn align-right ${textElement.style.textAlign === 'right' ? 'active' : ''}" title="Align Right">
                                    <i class="fas fa-align-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="color-section">
                        <div class="color-control">
                            <label for="text-color">Text Color</label>
                            <div class="color-picker-container">
                                <input type="color" id="text-color" class="text-color" value="${globalRgbToHex(window.getComputedStyle(textElement).color)}">
                                <div class="hex-display text-color-hex">${globalRgbToHex(window.getComputedStyle(textElement).color).toUpperCase()}</div>
                            </div>
                        </div>
                        <div class="color-control">
                            <label for="bubble-color">Bubble Color</label>
                            <div class="color-picker-container">
                                <input type="color" id="bubble-color" class="bubble-color" value="${globalRgbToHex(this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox) : 'rgb(255,255,255)')}">
                                <div class="hex-display bubble-color-hex">${globalRgbToHex(this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox) : 'rgb(255,255,255)').toUpperCase()}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-section">
                    <h4>Effects</h4>
                    <div class="effects-grid">
                        <div class="effect-control">
                            <label>Text Effects</label>
                            <div class="outline-control">
                                <div class="outline-buttons">
                                    <input type="checkbox" id="text-outline" ${textElement.getAttribute('data-has-outline') === 'true' ? 'checked' : ''}>
                                    <label for="text-outline">Text Outline</label>
                                </div>
                                <div class="color-picker-container ${textElement.getAttribute('data-has-outline') !== 'true' ? 'hidden' : ''}">
                                    <label>Outline Color</label>
                                    <input type="color" id="outline-color" value="${globalRgbToHex(this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getOutlineColor(textElement) : 'rgb(0,0,0)')}" ${textElement.getAttribute('data-has-outline') !== 'true' ? 'disabled' : ''}>
                                    <div class="hex-display outline-color-hex" ${textElement.getAttribute('data-has-outline') !== 'true' ? 'disabled' : ''}>${globalRgbToHex(this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getOutlineColor(textElement) : 'rgb(0,0,0)').toUpperCase()}</div>
                                </div>
                            </div>
                            <div class="shadow-control">
                                <input type="checkbox" id="text-shadow" ${textElement.style.textShadow ? 'checked' : ''}>
                                <label for="text-shadow">Text Shadow</label> <!-- Added label -->
                                <div class="color-picker-container">
                                    <input type="color" id="shadow-color" value="${globalRgbToHex(this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowColor(textElement) : 'rgb(102,102,102)')}" ${!textElement.style.textShadow ? 'disabled' : ''}>
                                    <div class="hex-display shadow-color-hex" ${!textElement.style.textShadow ? 'disabled' : ''}>${globalRgbToHex(this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowColor(textElement) : 'rgb(102,102,102)').toUpperCase()}</div>
                                </div>
                                <div class="shadow-sliders" ${!textElement.style.textShadow ? 'style="display: none;"' : ''}>
                                    <div class="slider-group">
                                        <label for="shadow-offset-x">X Offset</label>
                                        <input type="range" id="shadow-offset-x" class="shadow-offset-x" min="-10" max="10" value="${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowOffset(textElement).x : 2}" step="1">
                                        <span class="shadow-offset-x-value">${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowOffset(textElement).x : 2}px</span>
                                    </div>
                                    <div class="slider-group">
                                        <label for="shadow-offset-y">Y Offset</label>
                                        <input type="range" id="shadow-offset-y" class="shadow-offset-y" min="-10" max="10" value="${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowOffset(textElement).y : 2}" step="1">
                                        <span class="shadow-offset-y-value">${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowOffset(textElement).y : 2}px</span>
                                    </div>
                                    <div class="slider-group">
                                        <label for="shadow-blur">Blur</label>
                                        <input type="range" id="shadow-blur" class="shadow-blur" min="0" max="10" value="${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowOffset(textElement).blur : 2}" step="1">
                                        <span class="shadow-blur-value">${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getShadowOffset(textElement).blur : 2}px</span>                                    </div>                                </div>                            </div>                        </div>                    </div>                </div>
                
                <div class="popup-section">
                    <h4>Position</h4>
                    <div class="position-controls">
                        <div class="position-grid">
                            <button class="position-grid-btn" data-position="top-left">↖</button>
                            <button class="position-grid-btn" data-position="top-center">↑</button>
                            <button class="position-grid-btn" data-position="top-right">↗</button>
                            <button class="position-grid-btn" data-position="middle-left">←</button>
                            <button class="position-grid-btn" data-position="middle-center">•</button>
                            <button class="position-grid-btn" data-position="middle-right">→</button>
                            <button class="position-grid-btn" data-position="bottom-left">↙</button>
                            <button class="position-grid-btn" data-position="bottom-center">↓</button>
                            <button class="position-grid-btn" data-position="bottom-right">↘</button>
                        </div>
                        
                        <div class="rotation-control">
                            <label for="rotation">Rotation</label>
                            <div class="rotation-slider">
                                <input type="range" id="rotation" class="rotation" min="-180" max="180" value="${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getRotationValue(textBox) : 0}">
                                <span class="rotation-value">${this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getRotationValue(textBox) : 0}°</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        
        this.setupPopupEventListeners(popup, textBox); 
        // this.setupCustomStylesListeners(popup, textBox); // Moved to TextManagerCustomStyles, called from there potentially
        if (this.comicCreator.textManagerCustomStyles && this.comicCreator.textManagerCustomStyles.setupCustomStylesListeners) {
            this.comicCreator.textManagerCustomStyles.setupCustomStylesListeners(popup, textBox);
        } else {
            console.warn('TextManagerStyling: comicCreator.textManagerCustomStyles.setupCustomStylesListeners not found.');
        }
    }
    
    setupPopupEventListeners(popup, textBox) {
        const textElement = textBox.querySelector('.text-content');
        
        popup.querySelector('.close-popup').addEventListener('click', () => {
            popup.remove();
            this.comicCreator.saveCurrentPageState();
        });
        
        document.addEventListener('mousedown', (e) => {
            const currentPopup = document.getElementById('text-format-popup'); 
            if (currentPopup && !currentPopup.contains(e.target) && !textBox.contains(e.target)) {
                currentPopup.remove();
                this.comicCreator.saveCurrentPageState();
            }
        });
        
        const bubbleToggle = popup.querySelector('#show-bubble');
        bubbleToggle.addEventListener('change', () => {
            if (bubbleToggle.checked) {
                const previousType = textBox.dataset.previousBubbleType || 'speech-bubble';
                textBox.classList.remove('no-bubble');
                textBox.classList.add(previousType);
                textBox.dataset.bubbleType = previousType;
                popup.querySelector('#bubble-tail-position').disabled = (previousType === 'caption-box');
                
                const storedBackgroundColor = textBox.dataset.previousBackgroundColor;
                if (storedBackgroundColor) {
                    textBox.style.backgroundColor = storedBackgroundColor;
                    textBox.style.setProperty('--bubble-background-color', storedBackgroundColor);
                    delete textBox.dataset.previousBackgroundColor;
            } else {
                    textBox.style.backgroundColor = 'white';
                    textBox.style.setProperty('--bubble-background-color', 'white');
                }
            } else {
                if (textBox.style.backgroundColor && textBox.style.backgroundColor !== 'transparent') {
                    textBox.dataset.previousBackgroundColor = textBox.style.backgroundColor;
                }
                
                textBox.dataset.previousBubbleType = textBox.dataset.bubbleType;
                textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'jagged-bubble');
                textBox.classList.add('no-bubble');
                textBox.dataset.bubbleType = 'no-bubble';
                popup.querySelector('#bubble-tail-position').disabled = true;
                
                textBox.style.backgroundColor = 'transparent';
                textBox.style.setProperty('--bubble-background-color', 'transparent');
            }
            
            const paddingSection = popup.querySelector('.bubble-padding-section');
            if (paddingSection) {
                if (bubbleToggle.checked) {
                    paddingSection.classList.remove('hidden');
                } else {
                    paddingSection.classList.add('hidden');
                }
            }
            
            this.comicCreator.saveCurrentPageState();
        });
        
        popup.querySelectorAll('.bubble-option').forEach(option => {
            option.addEventListener('click', () => {
                popup.querySelectorAll('.bubble-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                const bubbleType = option.dataset.type;
                textBox.classList.remove('speech-bubble', 'thought-bubble', 'caption-box', 'shout-bubble', 'whisper-bubble', 'no-bubble');
                textBox.classList.add(bubbleType);
                textBox.dataset.bubbleType = bubbleType;
                bubbleToggle.checked = true;
                popup.querySelector('#bubble-tail-position').disabled = (bubbleType === 'caption-box');
                if (bubbleType === 'shout-bubble') {
                    textElement.style.fontWeight = 'bold';
                    textElement.style.textTransform = 'uppercase';
                    popup.querySelector('.bold-btn').classList.add('active');
                } else if (bubbleType === 'whisper-bubble') {
                    textElement.style.fontStyle = 'italic';
                    textElement.style.opacity = '0.8';
                    popup.querySelector('.italic-btn').classList.add('active');
                } else if (bubbleType === 'caption-box') {
                    textElement.style.fontStyle = 'italic';
                    popup.querySelector('.italic-btn').classList.add('active');
                }
                this.comicCreator.saveCurrentPageState();
            });
        });
        
        popup.querySelector('#font-family').addEventListener('change', (e) => {
            textElement.style.fontFamily = e.target.value;
        });
        
        const fontSizeSlider = popup.querySelector('#font-size');
        const fontSizeValue = popup.querySelector('.font-size-value');
        fontSizeSlider.addEventListener('input', () => {
            textElement.style.fontSize = `${fontSizeSlider.value}px`;
            fontSizeValue.textContent = `${fontSizeSlider.value}px`;
        });
        
        this.comicCreator.uiManager.makeSliderValueEditable(fontSizeSlider, fontSizeValue, 'px', 0);

        popup.querySelector('.bold-btn').addEventListener('click', () => {
            const isBold = textElement.style.fontWeight === 'bold';
            textElement.style.fontWeight = isBold ? 'normal' : 'bold';
            popup.querySelector('.bold-btn').classList.toggle('active');
        });
         popup.querySelector('.italic-btn').addEventListener('click', () => {
            const isItalic = textElement.style.fontStyle === 'italic';
            textElement.style.fontStyle = isItalic ? 'normal' : 'italic';
            popup.querySelector('.italic-btn').classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        popup.querySelector('.underline-btn').addEventListener('click', () => {
            const isUnderline = textElement.style.textDecoration === 'underline';
            textElement.style.textDecoration = isUnderline ? 'none' : 'underline';
            popup.querySelector('.underline-btn').classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        
        popup.querySelector('.all-caps-btn').addEventListener('click', () => {
            const isAllCaps = textElement.style.textTransform === 'uppercase';
            textElement.style.textTransform = isAllCaps ? 'none' : 'uppercase';
            popup.querySelector('.all-caps-btn').classList.toggle('active');
            this.comicCreator.saveCurrentPageState();
        });
        
        popup.querySelector('.align-left').addEventListener('click', () => {
            textElement.style.textAlign = 'left';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-left').classList.add('active');
        });
        popup.querySelector('.align-center').addEventListener('click', () => {
            textElement.style.textAlign = 'center';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-center').classList.add('active');
        });
        popup.querySelector('.align-right').addEventListener('click', () => {
            textElement.style.textAlign = 'right';
            popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
            popup.querySelector('.align-right').classList.add('active');
        });

        const textColorPicker = popup.querySelector('#text-color');
        const textColorHex = popup.querySelector('.text-color-hex');
        textColorPicker.addEventListener('input', (e) => {
            textElement.style.color = e.target.value;
            textColorHex.textContent = e.target.value.toUpperCase();
        });
        textColorHex.contentEditable = true;
        textColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = textColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    textColorPicker.value = hexValue;
                    textElement.style.color = hexValue;
                } else {
                    textColorHex.textContent = textColorPicker.value.toUpperCase();
                }
                textColorHex.blur();
            }
        });
        textColorHex.addEventListener('blur', () => {
            const hexValue = textColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                textColorPicker.value = hexValue;
                textElement.style.color = hexValue;
            } else {
                textColorHex.textContent = textColorPicker.value.toUpperCase();
            }
        });

        const bubbleColorPicker = popup.querySelector('#bubble-color');
        const bubbleColorHex = popup.querySelector('.bubble-color-hex');
        bubbleColorPicker.addEventListener('input', (e) => {
            textBox.style.backgroundColor = e.target.value;
            textBox.style.setProperty('--bubble-background-color', e.target.value);
            bubbleColorHex.textContent = e.target.value.toUpperCase();
            // Update tail color if it's set to match bubble, and tail exists
            const tailColorInput = popup.querySelector('#tail-color');
            if (tailColorInput && tailColorInput.dataset.matchBubble === 'true') {
                tailColorInput.value = e.target.value;
                const tailColorHexDisplay = popup.querySelector('.tail-color-hex');
                if (tailColorHexDisplay) tailColorHexDisplay.textContent = e.target.value.toUpperCase();
                this.updateSvgTailSettings(textBox, { tailColor: e.target.value });
            }
        });
        bubbleColorHex.contentEditable = true;
        bubbleColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const hexValue = bubbleColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    bubbleColorPicker.value = hexValue;
                    textBox.style.backgroundColor = hexValue;
                    textBox.style.setProperty('--bubble-background-color', hexValue);
                } else {
                    bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
                }
                bubbleColorHex.blur();
            }
        });
         bubbleColorHex.addEventListener('blur', () => {
            const hexValue = bubbleColorHex.textContent.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                bubbleColorPicker.value = hexValue;
                textBox.style.backgroundColor = hexValue;
                textBox.style.setProperty('--bubble-background-color', hexValue);
            } else {
                bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
            }
        });

        const textOutlineCheckbox = popup.querySelector('#text-outline');
        const outlineColorPicker = popup.querySelector('#outline-color');
        const outlineColorHex = popup.querySelector('.outline-color-hex');
        const colorPickerContainer = outlineColorPicker.closest('.color-picker-container');
        
        textOutlineCheckbox.addEventListener('change', () => {
            if (textOutlineCheckbox.checked) {
                colorPickerContainer.classList.remove('hidden');
                outlineColorPicker.disabled = false;
                outlineColorHex.removeAttribute('disabled');
                this.applyTextOutline(textElement, outlineColorPicker.value);
            } else {
                colorPickerContainer.classList.add('hidden');
                outlineColorPicker.disabled = true;
                outlineColorHex.setAttribute('disabled', true);
                this.removeTextOutline(textElement);
            }
                this.comicCreator.saveCurrentPageState();
        });

        outlineColorPicker.addEventListener('input', () => {
            if (textOutlineCheckbox.checked) {
                this.applyTextOutline(textElement, outlineColorPicker.value);
                outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                this.comicCreator.saveCurrentPageState();
            }
        });

        outlineColorHex.contentEditable = true;
        outlineColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !outlineColorHex.hasAttribute('disabled')) {
                e.preventDefault();
                const hexValue = outlineColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    outlineColorPicker.value = hexValue;
                    this.applyTextOutline(textElement, hexValue);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                }
                outlineColorHex.blur();
            }
        });

         outlineColorHex.addEventListener('blur', () => {
            if (!outlineColorHex.hasAttribute('disabled')) {
                const hexValue = outlineColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    outlineColorPicker.value = hexValue;
                    this.applyTextOutline(textElement, hexValue);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    outlineColorHex.textContent = outlineColorPicker.value.toUpperCase();
                }
            }
        });

        const textShadowCheckbox = popup.querySelector('#text-shadow');
        const shadowColorPicker = popup.querySelector('#shadow-color');
        const shadowColorHex = popup.querySelector('.shadow-color-hex');
        const shadowSlidersContainer = popup.querySelector('.shadow-sliders');
        const shadowOffsetXSlider = popup.querySelector('#shadow-offset-x');
        const shadowOffsetXValue = popup.querySelector('.shadow-offset-x-value');
        const shadowOffsetYSlider = popup.querySelector('#shadow-offset-y');
        const shadowOffsetYValue = popup.querySelector('.shadow-offset-y-value');
        const shadowBlurSlider = popup.querySelector('#shadow-blur');
        const shadowBlurValue = popup.querySelector('.shadow-blur-value');
        
        textShadowCheckbox.addEventListener('change', () => {
            const isChecked = textShadowCheckbox.checked;
            shadowColorPicker.disabled = !isChecked;
            shadowColorHex.toggleAttribute('disabled', !isChecked);
            shadowSlidersContainer.style.display = isChecked ? '' : 'none'; 
            shadowOffsetXSlider.disabled = !isChecked;
            shadowOffsetYSlider.disabled = !isChecked;
            shadowBlurSlider.disabled = !isChecked;

            if (isChecked) {
                this.applyTextShadow(textElement, 
                                     shadowColorPicker.value, 
                                     shadowOffsetXSlider.value, 
                                     shadowOffsetYSlider.value, 
                                     shadowBlurSlider.value);
            } else {
                this.removeTextShadow(textElement);
            }
            this.comicCreator.saveCurrentPageState();
        });
         shadowColorPicker.addEventListener('input', () => {
            if (textShadowCheckbox.checked) {
                this.applyTextShadow(textElement, 
                                     shadowColorPicker.value,
                                     shadowOffsetXSlider.value, 
                                     shadowOffsetYSlider.value, 
                                     shadowBlurSlider.value);
                shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                this.comicCreator.saveCurrentPageState();
            }
        });
        shadowColorHex.contentEditable = true;
        shadowColorHex.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !shadowColorHex.hasAttribute('disabled')) {
                e.preventDefault();
                const hexValue = shadowColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    shadowColorPicker.value = hexValue;
                    this.applyTextShadow(textElement, 
                                         hexValue, 
                                         shadowOffsetXSlider.value, 
                                         shadowOffsetYSlider.value, 
                                         shadowBlurSlider.value);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                }
                shadowColorHex.blur();
            }
        });
        shadowColorHex.addEventListener('blur', () => {
            if (!shadowColorHex.hasAttribute('disabled')) {
                const hexValue = shadowColorHex.textContent.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                    shadowColorPicker.value = hexValue;
                    this.applyTextShadow(textElement, 
                                         hexValue, 
                                         shadowOffsetXSlider.value, 
                                         shadowOffsetYSlider.value, 
                                         shadowBlurSlider.value);
                    this.comicCreator.saveCurrentPageState();
                } else {
                    shadowColorHex.textContent = shadowColorPicker.value.toUpperCase();
                }
            }
        });

        const shadowSliderHandler = () => {
            if (textShadowCheckbox.checked) {
                shadowOffsetXValue.textContent = `${shadowOffsetXSlider.value}px`;
                shadowOffsetYValue.textContent = `${shadowOffsetYSlider.value}px`;
                shadowBlurValue.textContent = `${shadowBlurSlider.value}px`;
                this.applyTextShadow(textElement, 
                                     shadowColorPicker.value, 
                                     shadowOffsetXSlider.value, 
                                     shadowOffsetYSlider.value, 
                                     shadowBlurSlider.value);
                this.comicCreator.saveCurrentPageState();
            }
        };
        shadowOffsetXSlider.addEventListener('input', shadowSliderHandler);
        shadowOffsetYSlider.addEventListener('input', shadowSliderHandler);
        shadowBlurSlider.addEventListener('input', shadowSliderHandler);

        popup.querySelector('#bubble-tail-position').addEventListener('change', (e) => {
            const newPosition = e.target.value;
            console.log(`Changing tail position to: ${newPosition}`);
            
            this.updateBubbleTail(textBox, newPosition);
            
            const tailSettingsContainer = popup.querySelector('.tail-settings-container');
            if (newPosition === 'none' || textBox.dataset.bubbleType === 'no-bubble' || textBox.dataset.bubbleType === 'caption-box') {
                tailSettingsContainer.style.display = 'none';
            } else {
                tailSettingsContainer.style.display = '';
                
                const speechTailSettings = popup.querySelector('.speech-tail-settings');
                const thoughtTailSettings = popup.querySelector('.thought-tail-settings');
                
                if (textBox.dataset.bubbleType === 'speech-bubble') {
                    speechTailSettings.style.display = '';
                    thoughtTailSettings.style.display = 'none';
                } else if (textBox.dataset.bubbleType === 'thought-bubble') {
                    speechTailSettings.style.display = 'none';
                    thoughtTailSettings.style.display = '';
                }
            }
            
            this.comicCreator.saveCurrentPageState();
        });
        
        const useSvgTailCheckbox = popup.querySelector('#use-svg-tail');
        if (useSvgTailCheckbox) {
            useSvgTailCheckbox.addEventListener('change', () => {
                const settings = {
                    useSvgTail: useSvgTailCheckbox.checked
                };
                this.updateSvgTailSettings(textBox, settings);
                this.comicCreator.saveCurrentPageState();
            });
        }
        
        const tailColorPicker = popup.querySelector('#tail-color');
        const tailColorHex = popup.querySelector('.tail-color-hex');
        if (tailColorPicker && tailColorHex) {
            tailColorPicker.addEventListener('input', () => {
                const settings = {
                    tailColor: tailColorPicker.value
                };
                tailColorHex.textContent = tailColorPicker.value.toUpperCase();
                this.updateSvgTailSettings(textBox, settings);
                this.comicCreator.saveCurrentPageState();
            });
            
            tailColorHex.contentEditable = true;
            tailColorHex.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const hexValue = tailColorHex.textContent.trim();
                    if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
                        tailColorPicker.value = hexValue;
                        const settings = {
                            tailColor: hexValue
                        };
                        this.updateSvgTailSettings(textBox, settings);
                        this.comicCreator.saveCurrentPageState();
                    } else {
                        tailColorHex.textContent = tailColorPicker.value.toUpperCase();
                    }
                }
            });
        }
        
        const speechTailLengthSlider = popup.querySelector('#speech-tail-length');
        const speechTailLengthValue = popup.querySelector('.speech-tail-length-value');
        if (speechTailLengthSlider && speechTailLengthValue) {
            speechTailLengthSlider.addEventListener('input', () => {
                const value = speechTailLengthSlider.value;
                speechTailLengthValue.textContent = `${value}px`;
                const settings = {
                    speechTailLength: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailLengthSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailLengthSlider, speechTailLengthValue, 'px', 0);
        }
        
        const speechTailWidthSlider = popup.querySelector('#speech-tail-width');
        const speechTailWidthValue = popup.querySelector('.speech-tail-width-value');
        if (speechTailWidthSlider && speechTailWidthValue) {
            speechTailWidthSlider.addEventListener('input', () => {
                const value = speechTailWidthSlider.value;
                speechTailWidthValue.textContent = `${value}px`;
                const settings = {
                    speechTailWidth: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailWidthSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailWidthSlider, speechTailWidthValue, 'px', 0);
        }
        
        const speechTailInsetSlider = popup.querySelector('#speech-tail-inset');
        const speechTailInsetValue = popup.querySelector('.speech-tail-inset-value');
        if (speechTailInsetSlider && speechTailInsetValue) {
            speechTailInsetSlider.addEventListener('input', () => {
                const value = speechTailInsetSlider.value;
                speechTailInsetValue.textContent = `${value}%`;
                const settings = {
                    speechTailInset: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailInsetSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailInsetSlider, speechTailInsetValue, '%', 0);
        }
        
        const speechTailShearSlider = popup.querySelector('#speech-tail-shear');
        const speechTailShearValue = popup.querySelector('.speech-tail-shear-value');
        if (speechTailShearSlider && speechTailShearValue) {
            speechTailShearSlider.addEventListener('input', () => {
                const value = speechTailShearSlider.value;
                speechTailShearValue.textContent = `${value}%`; // Shear is also a percentage in the original, but value was missing % in span
                const settings = {
                    speechTailShear: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            speechTailShearSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(speechTailShearSlider, speechTailShearValue, '%', 0); // Changed unit to %
        }
        
        const speechTailOutlineCheckbox = popup.querySelector('#speech-tail-outline');
        if (speechTailOutlineCheckbox) {
            speechTailOutlineCheckbox.addEventListener('change', () => {
                const settings = {
                    speechTailOutline: speechTailOutlineCheckbox.checked
                };
                this.updateSvgTailSettings(textBox, settings);
                this.comicCreator.saveCurrentPageState();
            });
        }
        
        const thoughtNumCirclesSlider = popup.querySelector('#thought-num-circles');
        const thoughtNumCirclesValue = popup.querySelector('.thought-num-circles-value');
        if (thoughtNumCirclesSlider && thoughtNumCirclesValue) {
            thoughtNumCirclesSlider.addEventListener('input', () => {
                const value = thoughtNumCirclesSlider.value;
                thoughtNumCirclesValue.textContent = value;
                const settings = {
                    thoughtNumCircles: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtNumCirclesSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtNumCirclesSlider, thoughtNumCirclesValue, '', 0);
        }
        
        const thoughtCircleRadiusSlider = popup.querySelector('#thought-circle-radius');
        const thoughtCircleRadiusValue = popup.querySelector('.thought-circle-radius-value');
        if (thoughtCircleRadiusSlider && thoughtCircleRadiusValue) {
            thoughtCircleRadiusSlider.addEventListener('input', () => {
                const value = thoughtCircleRadiusSlider.value;
                thoughtCircleRadiusValue.textContent = `${value}px`;
                const settings = {
                    thoughtCircleRadius: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtCircleRadiusSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtCircleRadiusSlider, thoughtCircleRadiusValue, 'px', 0);
        }
        
        const thoughtCircleSpacingSlider = popup.querySelector('#thought-circle-spacing');
        const thoughtCircleSpacingValue = popup.querySelector('.thought-circle-spacing-value');
        if (thoughtCircleSpacingSlider && thoughtCircleSpacingValue) {
            thoughtCircleSpacingSlider.addEventListener('input', () => {
                const value = thoughtCircleSpacingSlider.value;
                thoughtCircleSpacingValue.textContent = `${value}px`;
                const settings = {
                    thoughtCircleSpacing: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtCircleSpacingSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtCircleSpacingSlider, thoughtCircleSpacingValue, 'px', 0);
        }
        
        const thoughtTailOffsetSlider = popup.querySelector('#thought-tail-offset');
        const thoughtTailOffsetValue = popup.querySelector('.thought-tail-offset-value');
        if (thoughtTailOffsetSlider && thoughtTailOffsetValue) {
            thoughtTailOffsetSlider.addEventListener('input', () => {
                const value = thoughtTailOffsetSlider.value;
                thoughtTailOffsetValue.textContent = value;
                const settings = {
                    thoughtTailOffset: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtTailOffsetSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtTailOffsetSlider, thoughtTailOffsetValue, '', 0);
        }
        
        popup.querySelectorAll('.bubble-option').forEach(option => {
            option.addEventListener('click', () => {
                const bubbleType = option.dataset.type;
                const tailSettingsContainer = popup.querySelector('.tail-settings-container');
                const speechTailSettings = popup.querySelector('.speech-tail-settings');
                const thoughtTailSettings = popup.querySelector('.thought-tail-settings');
                
                if (bubbleType === 'no-bubble' || bubbleType === 'caption-box' || textBox.dataset.tailPosition === 'none') {
                    tailSettingsContainer.style.display = 'none';
                } else {
                    tailSettingsContainer.style.display = '';
                    
                    if (bubbleType === 'speech-bubble') {
                        speechTailSettings.style.display = '';
                        thoughtTailSettings.style.display = 'none';
                    } else if (bubbleType === 'thought-bubble') {
                        speechTailSettings.style.display = 'none';
                        thoughtTailSettings.style.display = '';
                    }
                }
            });
        });
        
        popup.querySelectorAll('.position-grid-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const position = btn.dataset.position;
                this.positionTextBox(textBox, position);
            });
        });
        
        const rotationSlider = popup.querySelector('#rotation');
        const rotationValue = popup.querySelector('.rotation-value');
        
        const initialRotationValue = this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getRotationValue(textBox) : 0; // Use TextManagerUtils
        rotationSlider.value = initialRotationValue;
        rotationValue.textContent = `${Math.round(initialRotationValue)}°`;

        rotationSlider.addEventListener('input', () => {
            const value = rotationSlider.value;
            rotationValue.textContent = `${Math.round(value)}°`;
            textBox.style.transform = `rotate(${value}deg)`;
            this.comicCreator.saveCurrentPageState();
        });
        
        this.comicCreator.uiManager.makeSliderValueEditable(rotationSlider, rotationValue, '°', 0);

        const observer = new MutationObserver(() => {
            // this.updateOutlineText(textElement); // Internal call - this method is deprecated in TextManagerUtils
            if (this.comicCreator.textManagerUtils && this.comicCreator.textManagerUtils.updateOutlineText) {
                 this.comicCreator.textManagerUtils.updateOutlineText(textElement);
            } else {
                // console.warn('TextManagerStyling: comicCreator.textManagerUtils.updateOutlineText not found or deprecated.');
            }
        });
        observer.observe(textElement, {
            characterData: true,
            childList: true,
            subtree: true
        });

        

        const lineHeightSlider = popup.querySelector('#line-height');
        const lineHeightValue = popup.querySelector('.line-height-value');

        const currentLineHeight = textElement.style.lineHeight;
        let initialLineHeightValue = 1.2; 
        if (currentLineHeight && currentLineHeight !== 'normal') {
            initialLineHeightValue = parseFloat(currentLineHeight) || 1.2;
        }
        lineHeightSlider.value = initialLineHeightValue;
        lineHeightValue.textContent = initialLineHeightValue.toFixed(1);

        lineHeightSlider.addEventListener('input', () => {
            const value = lineHeightSlider.value;
            lineHeightValue.textContent = parseFloat(value).toFixed(1);
            textElement.style.lineHeight = value;
            this.comicCreator.saveCurrentPageState();
        });
        
        this.comicCreator.uiManager.makeSliderValueEditable(lineHeightSlider, lineHeightValue, '', 1);
        this.comicCreator.uiManager.makeSliderValueEditable(shadowOffsetXSlider, shadowOffsetXValue, 'px', 0);
        this.comicCreator.uiManager.makeSliderValueEditable(shadowOffsetYSlider, shadowOffsetYValue, 'px', 0);
        this.comicCreator.uiManager.makeSliderValueEditable(shadowBlurSlider, shadowBlurValue, 'px', 0);

        const thoughtTailInsetSlider = popup.querySelector('#thought-tail-inset');
        const thoughtTailInsetValue = popup.querySelector('.thought-tail-inset-value');
        if (thoughtTailInsetSlider && thoughtTailInsetValue) {
            thoughtTailInsetSlider.addEventListener('input', () => {
                const value = thoughtTailInsetSlider.value;
                thoughtTailInsetValue.textContent = `${value}%`;
                const settings = {
                    thoughtTailInset: parseInt(value)
                };
                this.updateSvgTailSettings(textBox, settings);
            });
            
            thoughtTailInsetSlider.addEventListener('change', () => {
                this.comicCreator.saveCurrentPageState();
            });
            
            this.comicCreator.uiManager.makeSliderValueEditable(thoughtTailInsetSlider, thoughtTailInsetValue, '%', 0);
        }
    }

    updatePopupControls(popup, textBox) {
        const textElement = textBox.querySelector('.text-content');
        if (!textElement) return;
        
        const fontSelect = popup.querySelector('#font-family');
        if (fontSelect && textElement.style.fontFamily) {
            fontSelect.value = textElement.style.fontFamily;
        }
        
        const fontSizeSlider = popup.querySelector('#font-size');
        const fontSizeValue = popup.querySelector('.font-size-value');
        if (fontSizeSlider && textElement.style.fontSize) {
            const fontSize = parseInt(textElement.style.fontSize);
            fontSizeSlider.value = fontSize;
            if (fontSizeValue) fontSizeValue.textContent = `${fontSize}px`;
        }
        
        const textColorPicker = popup.querySelector('#text-color');
        const textColorHex = popup.querySelector('.text-color-hex');
        if (textColorPicker && textElement.style.color) {
            textColorPicker.value = globalRgbToHex(textElement.style.color); // Used globalRgbToHex directly
            if (textColorHex) textColorHex.textContent = textColorPicker.value.toUpperCase();
        }
        
        const bubbleColorPicker = popup.querySelector('#bubble-color');
        const bubbleColorHex = popup.querySelector('.bubble-color-hex');
        if (bubbleColorPicker) {
            const bubbleColor = this.comicCreator.textManagerUtils ? this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox) : 'rgb(255,255,255)';
            bubbleColorPicker.value = globalRgbToHex(bubbleColor); // Used globalRgbToHex directly
            if (bubbleColorHex) bubbleColorHex.textContent = bubbleColorPicker.value.toUpperCase();
        }
        
        if (textElement.style.fontWeight === 'bold') {
            popup.querySelector('.bold-btn')?.classList.add('active');
        } else {
            popup.querySelector('.bold-btn')?.classList.remove('active');
        }
        
        if (textElement.style.fontStyle === 'italic') {
            popup.querySelector('.italic-btn')?.classList.add('active');
        } else {
            popup.querySelector('.italic-btn')?.classList.remove('active');
        }
        
        if (textElement.style.textDecoration === 'underline') {
            popup.querySelector('.underline-btn')?.classList.add('active');
        } else {
            popup.querySelector('.underline-btn')?.classList.remove('active');
        }
        
        if (textElement.style.textTransform === 'uppercase') {
            popup.querySelector('.all-caps-btn')?.classList.add('active');
        } else {
            popup.querySelector('.all-caps-btn')?.classList.remove('active');
        }
        
        popup.querySelectorAll('.align-btn').forEach(btn => btn.classList.remove('active'));
        switch (textElement.style.textAlign) {
            case 'left':
                popup.querySelector('.align-left')?.classList.add('active');
                break;
            case 'center':
                popup.querySelector('.align-center')?.classList.add('active');
                break;
            case 'right':
                popup.querySelector('.align-right')?.classList.add('active');
                break;
            default:
                popup.querySelector('.align-center')?.classList.add('active');
        }
        
        popup.querySelectorAll('.bubble-option').forEach(option => option.classList.remove('selected'));
        const bubbleType = textBox.dataset.bubbleType;
        popup.querySelector(`.bubble-option[data-type="${bubbleType}"]`)?.classList.add('selected');
        
        const bubbleToggle = popup.querySelector('#show-bubble');
        if (bubbleToggle) {
            bubbleToggle.checked = bubbleType !== 'no-bubble';
        }
    }

    applyTextOutline(textElement, color, thickness = 1) {
        const text = getTextWithLineBreaks(textElement); 
        const computedStyle = window.getComputedStyle(textElement);
        
        const shadowValue = `
           -2px -2px 0 ${color},  
            2px -2px 0 ${color},
           -2px  2px 0 ${color},
            2px  2px 0 ${color},
           -2px  0   0 ${color},
            2px  0   0 ${color},
            0   -2px 0 ${color},
            0    2px 0 ${color}
        `.trim().replace(/\s+/g, ' ');
        
        textElement.style.textShadow = shadowValue;
        
        textElement.setAttribute('data-outline-color', color);
        textElement.setAttribute('data-has-outline', 'true');
        
        const textColor = textElement.style.color || computedStyle.color || '#000000';
        textElement.style.setProperty('--text-color', textColor);
        
        const stylesToCopy = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 
            'wordSpacing', 'lineHeight', 'textTransform', 'textAlign', 
            'textDecoration', 'whiteSpace'
        ];
        stylesToCopy.forEach(prop => {
            const value = computedStyle[prop];
            if (value) textElement.style[prop] = value;
        });
        
        textElement.style.webkitFontSmoothing = 'antialiased';
        textElement.style.mozOsxFontSmoothing = 'grayscale';
        textElement.style.textRendering = 'optimizeLegibility';
    }
    
    removeTextOutline(textElement) {
        textElement.style.textShadow = 'none';
        
        textElement.removeAttribute('data-has-outline');
        textElement.removeAttribute('data-outline-color');
        textElement.style.removeProperty('--text-color');
    }
    
    applyTextShadow(textElement, color, offsetX, offsetY, blur) {
        const x = offsetX !== undefined ? offsetX : 2;
        const y = offsetY !== undefined ? offsetY : 2;
        const b = blur !== undefined ? blur : 2;
        textElement.style.textShadow = `${x}px ${y}px ${b}px ${color}`;
    }
    
    removeTextShadow(textElement) {
        textElement.style.textShadow = 'none';
    }
    
    updateBubbleTail(textBox, position) {
        console.log(`Updating bubble tail to position: ${position}`);
        
        textBox.className = textBox.className.replace(/(?:speech|thought)-tail-\S+/g, '').trim();
        
        const existingSvgTail = textBox.querySelector('.bubble-tail-svg');
        if (existingSvgTail) {
            existingSvgTail.remove();
        }
        
        textBox.dataset.tailPosition = position;
        
        if (position === 'none') {
            return;
        }
        
        const bubbleType = textBox.dataset.bubbleType;
        
        let tailSettings;
        if (textBox.dataset.tailSettings) {
            try {
                tailSettings = JSON.parse(textBox.dataset.tailSettings);
            } catch (e) {
                console.error("Error parsing tail settings", e);
                tailSettings = bubbleType === 'speech-bubble' ? 
                    { ...this.defaultSpeechTailSettings } : 
                    { ...this.defaultThoughtTailSettings };
            }
        } else {
            tailSettings = bubbleType === 'speech-bubble' ? 
                { ...this.defaultSpeechTailSettings } : 
                { ...this.defaultThoughtTailSettings };
        }
        
        tailSettings.tailPosition = position;
        
        textBox.dataset.tailSettings = JSON.stringify(tailSettings);
        
            if (bubbleType === 'speech-bubble') {
            this.createSpeechBubbleSvgTail(textBox, tailSettings);
            } else if (bubbleType === 'thought-bubble') {
            this.createThoughtBubbleSvgTail(textBox, tailSettings);
        }
    }
    
    createSpeechBubbleSvgTail(textBox, settings) {
        console.log(`Creating speech bubble SVG tail for position: ${settings.tailPosition}`);
        
        const position = settings.tailPosition || 'bottom';
        const bubbleColor = settings.tailColor || this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox);
        const tailLength = settings.speechTailLength || 20;
        const tailWidth = settings.speechTailWidth || 15;
        const tailInset = settings.speechTailInset || 50;
        const shear = settings.speechTailShear || 0;
        const useOutline = settings.speechTailOutline !== false;
        
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('bubble-tail-svg');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '-1';
        
        const bubbleRect = textBox.getBoundingClientRect();
        const bubbleWidth = bubbleRect.width;
        const bubbleHeight = bubbleRect.height;
        
        let outlineColor = '#000000';
        let outlineThickness = 2;
        
        if (useOutline) {
            const computedStyle = window.getComputedStyle(textBox);
            outlineColor = computedStyle.borderColor || '#000000';
            outlineThickness = parseInt(computedStyle.borderWidth) || 2;
            outlineThickness = Math.min(Math.max(outlineThickness, 1), 3);
        }
        
        const maxShearPixels = tailWidth;
        const shearOffset = (shear / 50) * (maxShearPixels / 2);
        
        let pathPoints = [];
        let svgWidth, svgHeight;
        let svgTop, svgLeft;
        
        switch(position) {
            case 'bottom':
                svgWidth = tailWidth;
                svgHeight = tailLength;
                svgLeft = `calc(${tailInset}% - ${tailWidth/2}px)`;
                svgTop = '100%';
                pathPoints = [[0, 0], [tailWidth, 0], [tailWidth/2 + shearOffset, tailLength]];
                break;
            case 'top':
                svgWidth = tailWidth;
                svgHeight = tailLength;
                svgLeft = `calc(${tailInset}% - ${tailWidth/2}px)`;
                svgTop = `calc(0% - ${tailLength}px)`;
                pathPoints = [[0, tailLength], [tailWidth, tailLength], [tailWidth/2 + shearOffset, 0]];
                break;
            case 'left':
                svgWidth = tailLength;
                svgHeight = tailWidth;
                svgLeft = `calc(0% - ${tailLength}px)`;
                svgTop = `calc(${tailInset}% - ${tailWidth/2}px)`;
                pathPoints = [[tailLength, 0], [tailLength, tailWidth], [0, tailWidth/2 + shearOffset]];
                break;
            case 'right':
                svgWidth = tailLength;
                svgHeight = tailWidth;
                svgLeft = '100%';
                svgTop = `calc(${tailInset}% - ${tailWidth/2}px)`;
                pathPoints = [[0, 0], [0, tailWidth], [tailLength, tailWidth/2 + shearOffset]];
                break;
            default:
                console.warn(`Invalid tail position: ${position}, defaulting to bottom`);
                svgWidth = tailWidth;
                svgHeight = tailLength;
                svgLeft = `calc(${tailInset}% - ${tailWidth/2}px)`;
                svgTop = '100%';
                pathPoints = [[0, 0], [tailWidth, 0], [tailWidth/2 + shearOffset, tailLength]];
                break;
        }
        
        console.log(`SVG dimensions: ${svgWidth}x${svgHeight}, position: ${svgLeft}, ${svgTop}`);
        
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.style.top = svgTop;
        svg.style.left = svgLeft;
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('fill', bubbleColor);
        
        let d = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
            d += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }
        d += ' Z';
        path.setAttribute('d', d);
        
        svg.appendChild(path);
        
        if (useOutline) {
            const outlinePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            outlinePath.setAttribute('fill', 'none');
            outlinePath.setAttribute('stroke', outlineColor);
            outlinePath.setAttribute('stroke-width', outlineThickness);
            const outlineD = `M ${pathPoints[0][0]} ${pathPoints[0][1]} L ${pathPoints[2][0]} ${pathPoints[2][1]} L ${pathPoints[1][0]} ${pathPoints[1][1]}`;
            outlinePath.setAttribute('d', outlineD);
            svg.appendChild(outlinePath);
        }
        
        textBox.appendChild(svg);
    }
    
    createThoughtBubbleSvgTail(textBox, settings) {
        console.log(`Creating thought bubble SVG tail for position: ${settings.tailPosition}`);
        
        const position = settings.tailPosition || 'bottom';
        const bubbleColor = settings.tailColor || this.comicCreator.textManagerUtils.getBubbleBackgroundColor(textBox);
        const numCircles = settings.thoughtNumCircles || 3;
        const maxRadius = settings.thoughtCircleRadius || 5;
        const spacing = settings.thoughtCircleSpacing || 5;
        const offset = settings.thoughtTailOffset || 0;
        const tailInset = settings.thoughtTailInset || 50;
        
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.classList.add('bubble-tail-svg');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '-1';
        
        const bubbleRect = textBox.getBoundingClientRect();
        const bubbleWidth = bubbleRect.width;
        const bubbleHeight = bubbleRect.height;
        
        const isHorizontal = position === 'left' || position === 'right';
        const padding = 10;

        const svgWidth = isHorizontal ? 
            spacing * numCircles + maxRadius * 2 + padding * 2 : 
            maxRadius * 2 + Math.abs(offset) + padding * 2;
        const svgHeight = isHorizontal ? 
            maxRadius * 2 + Math.abs(offset) + padding * 2 : 
            spacing * numCircles + maxRadius * 2 + padding * 2;
        
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        
        let svgTop, svgLeft;
        
        switch(position) {
            case 'bottom':
                svgLeft = `calc(${tailInset}% - ${svgWidth/2}px)`;
                svgTop = '100%';
                break;
            case 'top':
                svgLeft = `calc(${tailInset}% - ${svgWidth/2}px)`;
                svgTop = `calc(0% - ${svgHeight}px)`;
                break;
            case 'left':
                svgLeft = `calc(0% - ${svgWidth}px)`;
                svgTop = `calc(${tailInset}% - ${svgHeight/2}px)`;
                break;
            case 'right':
                svgLeft = '100%';
                svgTop = `calc(${tailInset}% - ${svgHeight/2}px)`;
                break;
            default:
                console.warn(`Invalid tail position: ${position}, defaulting to bottom`);
                svgLeft = `calc(${tailInset}% - ${svgWidth/2}px)`;
                svgTop = '100%';
                break;
        }
        
        console.log(`Thought tail SVG dimensions: ${svgWidth}x${svgHeight}, position: ${svgLeft}, ${svgTop}`);
        
        svg.style.top = svgTop;
        svg.style.left = svgLeft;
        
        const startX = isHorizontal ? padding : svgWidth / 2;
        const startY = isHorizontal ? svgHeight / 2 : padding;

        for (let i = 0; i < numCircles; i++) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const radius = maxRadius * (1 - (i / numCircles) * 0.5);
            let cx, cy;
            
            if (position === 'bottom') {
                cx = startX + (offset * (i / numCircles));
                cy = startY + i * spacing;
            } else if (position === 'top') {
                cx = startX + (offset * (i / numCircles));
                cy = svgHeight - (padding + i * spacing);
            } else if (position === 'left') {
                cx = svgWidth - (padding + i * spacing);
                cy = startY + (offset * (i / numCircles));
            } else if (position === 'right') {
                cx = padding + i * spacing;
                cy = startY + (offset * (i / numCircles));
            }
            
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', radius);
            circle.setAttribute('fill', bubbleColor);
            circle.setAttribute('stroke', '#000000');
            circle.setAttribute('stroke-width', '2');
            svg.appendChild(circle);
        }
        
        textBox.appendChild(svg);
    }
    
    updateSvgTailSettings(textBox, newSettings) {
        let currentSettings;
        const bubbleType = textBox.dataset.bubbleType;
        
        if (textBox.dataset.tailSettings) {
            try {
                currentSettings = JSON.parse(textBox.dataset.tailSettings);
            } catch (e) {
                console.error("Error parsing tail settings", e);
                currentSettings = bubbleType === 'speech-bubble' ? 
                    { ...this.defaultSpeechTailSettings } : 
                    { ...this.defaultThoughtTailSettings };
            }
        } else {
            currentSettings = bubbleType === 'speech-bubble' ? 
                { ...this.defaultSpeechTailSettings } : 
                { ...this.defaultThoughtTailSettings };
        }
        
        const mergedSettings = { ...currentSettings, ...newSettings };
        textBox.dataset.tailSettings = JSON.stringify(mergedSettings);
        this.updateBubbleTail(textBox, mergedSettings.tailPosition);
    }
    
    positionTextBox(textBox, position) {
        const panelOrCanvas = textBox.parentElement;
        if (!panelOrCanvas) {
            console.error("Cannot position text box: parent element not found");
            return;
        }
        
        const currentWidth = textBox.style.width || 'auto';
        const currentHeight = textBox.style.height || 'auto';
        
        textBox.style.transform = '';
        
        let left, top;
        switch (position) {
            case 'top-left': left = 10; top = 10; break;
            case 'top-center': left = 50; top = 10; break;
            case 'top-right': left = 90; top = 10; break;
            case 'middle-left': left = 10; top = 50; break;
            case 'middle-center': left = 50; top = 50; break;
            case 'middle-right': left = 90; top = 50; break;
            case 'bottom-left': left = 10; top = 90; break;
            case 'bottom-center': left = 50; top = 90; break;
            case 'bottom-right': left = 90; top = 90; break;
            default: left = 50; top = 50;
        }
        
        textBox.style.left = `${left}%`;
        textBox.style.top = `${top}%`;
        
        const translateX = position.includes('left') ? '0%' : 
                         position.includes('right') ? '-100%' : '-50%';
        const translateY = position.includes('top') ? '0%' : 
                         position.includes('bottom') ? '-100%' : '-50%';
        
        const rotation = this.comicCreator.textManagerUtils.getRotationValue(textBox);
        const rotateStyle = rotation !== 0 ? ` rotate(${rotation}deg)` : '';
        
        textBox.style.transform = `translate(${translateX}, ${translateY})${rotateStyle}`;
        
        textBox.style.width = currentWidth;
        textBox.style.height = currentHeight;
        
        textBox.dataset.positionGrid = position;
        
        const positionClasses = textBox.className.match(/positioned-[a-z]+-[a-z]+/g);
        if (positionClasses && positionClasses.length) {
            positionClasses.forEach(cls => {
                textBox.classList.remove(cls);
            });
        }
        
        textBox.classList.add(`positioned-${position}`);
    }
}

// Ensure the class is exported if it's not already (it should be based on previous steps)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextManagerStyling;
} else {
    window.TextManagerStyling = TextManagerStyling;
}