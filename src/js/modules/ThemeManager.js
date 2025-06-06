/**
 * ThemeManager.js
 * 
 * Manages theme switching for the Comic Creator application.
 * Provides functionality to switch between different color themes:
 * - Default (Red/Orange/Gold)
 * - Green
 * - Blue  
 * - Monochrome (Black/White)
 * 
 * Features:
 * - Theme persistence using localStorage
 * - Smooth theme transitions
 * - Theme selector UI management
 * - Integration with existing UI components
 */

export class ThemeManager {
    constructor(comicCreator) {
        this.comicCreator = comicCreator;
        this.currentTheme = 'default';
                this.themes = {
            default: {
                name: 'Default',
                id: 'default'
            },
            green: {
                name: 'Forest Theme',
                id: 'green'
            },
            blue: {
                name: 'Ocean Theme',
                id: 'blue'
            },
            cosmic: {
                name: 'Cosmic Purple',
                id: 'cosmic'
            },
            sunset: {
                name: 'Sunset Orange',
                id: 'sunset'
            },
            crimson: {
                name: 'Crimson Shadow',
                id: 'crimson'
            },
            monochrome: {
                name: 'Monochrome',
                id: 'monochrome'
            }
        };
        
        this.init();
    }

    init() {
        console.log('[ThemeManager] Initializing theme manager...');
        
        // Load saved theme from localStorage
        this.loadSavedTheme();
        
        // Create theme selector UI
        this.createThemeSelector();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('[ThemeManager] Theme manager initialized with theme:', this.currentTheme);
    }

    /**
     * Loads the saved theme from localStorage
     */
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('comicCreator_theme');
        if (savedTheme && this.themes[savedTheme]) {
            this.currentTheme = savedTheme;
            this.applyTheme(savedTheme, false); // Don't save to localStorage since we're loading from it
        } else {
            this.applyTheme('default', true); // Apply default and save it
        }
    }

    /**
     * Creates the theme selector UI and inserts it into the appropriate locations
     */
    createThemeSelector() {
        // Create for editor sidebar
        this.createEditorThemeSelector();
        
        // Create for upload page
        this.createUploadPageThemeSelector();
        
        // Create for layout page
        this.createLayoutPageThemeSelector();
    }

    /**
     * Creates theme selector for the editor sidebar
     */
    createEditorThemeSelector() {
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent) {
            return; // Not on editor page
        }

        const themeContainer = this.createThemeContainer('editor');
        
        // Insert the theme selector after the sidebar tabs but before the content
        const firstContentDiv = sidebarContent.querySelector('div[data-tab-content]');
        if (firstContentDiv) {
            sidebarContent.insertBefore(themeContainer, firstContentDiv);
        } else {
            sidebarContent.appendChild(themeContainer);
        }

        console.log('[ThemeManager] Editor theme selector created');
    }

    /**
     * Creates theme selector for the upload page
     */
    createUploadPageThemeSelector() {
        const uploadSection = document.querySelector('#upload-page .upload-section');
        if (!uploadSection) {
            return; // Not on upload page
        }

        const themeContainer = this.createThemeContainer('upload');
        
        // Insert before the button group at the bottom
        const buttonGroup = uploadSection.querySelector('.button-group');
        if (buttonGroup) {
            uploadSection.insertBefore(themeContainer, buttonGroup);
        } else {
            uploadSection.appendChild(themeContainer);
        }

        console.log('[ThemeManager] Upload page theme selector created');
    }

    /**
     * Creates theme selector for the layout page
     */
    createLayoutPageThemeSelector() {
        const layoutPage = document.querySelector('#layout-page');
        if (!layoutPage) {
            return; // Not on layout page
        }

        const themeContainer = this.createThemeContainer('layout');
        
        // Insert after the page header but before the filters
        const pageHeader = layoutPage.querySelector('.page-header');
        const layoutFilters = layoutPage.querySelector('.layout-filters');
        
        if (pageHeader && layoutFilters) {
            layoutPage.insertBefore(themeContainer, layoutFilters);
        } else if (layoutFilters) {
            layoutPage.insertBefore(themeContainer, layoutFilters);
        } else {
            layoutPage.appendChild(themeContainer);
        }

        console.log('[ThemeManager] Layout page theme selector created');
    }

    /**
     * Creates a theme selector container with unique IDs for different pages
     * @param {string} pageType - The type of page (editor, upload, layout)
     */
    createThemeContainer(pageType) {
        const themeContainer = document.createElement('div');
        themeContainer.className = 'theme-selector-container';
        const uniqueId = pageType === 'editor' ? '' : `-${pageType}`;
        
        themeContainer.innerHTML = `
            <label class="theme-selector-label">UI Theme</label>
            <div class="theme-selector">
                <button class="theme-dropdown-btn" id="theme-dropdown-btn${uniqueId}">
                    <span id="current-theme-text${uniqueId}">${this.themes[this.currentTheme].name}</span>
                    <i class="fas fa-chevron-down theme-dropdown-icon"></i>
                </button>
                <div class="theme-dropdown-menu" id="theme-dropdown-menu${uniqueId}">
                    ${Object.entries(this.themes).map(([key, theme]) => `
                        <div class="theme-option ${key === this.currentTheme ? 'selected' : ''}" data-theme="${key}">
                            <div class="theme-preview-dot ${key}"></div>
                            <span>${theme.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        return themeContainer;
    }

    /**
     * Sets up event listeners for all theme selectors
     */
    setupEventListeners() {
        const pageTypes = ['', '-upload', '-layout']; // editor has no suffix
        
        pageTypes.forEach(suffix => {
            const dropdownBtn = document.getElementById(`theme-dropdown-btn${suffix}`);
            const dropdownMenu = document.getElementById(`theme-dropdown-menu${suffix}`);

            if (dropdownBtn && dropdownMenu) {
                // Toggle dropdown on button click
                dropdownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(suffix);
                });

                // Handle theme selection
                dropdownMenu.addEventListener('click', (e) => {
                    const themeOption = e.target.closest('.theme-option');
                    if (themeOption) {
                        const themeId = themeOption.dataset.theme;
                        this.selectTheme(themeId);
                        this.closeAllDropdowns();
                    }
                });
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.theme-selector')) {
                this.closeAllDropdowns();
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllDropdowns();
            }
        });

        console.log('[ThemeManager] Event listeners set up for all pages');
    }

    /**
     * Toggles the dropdown menu for a specific page
     * @param {string} suffix - The page suffix (empty for editor, '-upload', '-layout')
     */
    toggleDropdown(suffix = '') {
        const dropdownBtn = document.getElementById(`theme-dropdown-btn${suffix}`);
        const dropdownMenu = document.getElementById(`theme-dropdown-menu${suffix}`);
        
        if (dropdownBtn && dropdownMenu) {
            const isActive = dropdownMenu.classList.contains('active');
            
            // Close all other dropdowns first
            this.closeAllDropdowns();
            
            if (!isActive) {
                // Open this specific dropdown
                dropdownBtn.classList.add('active');
                dropdownMenu.classList.add('active');
            }
        }
    }

    /**
     * Opens a specific dropdown menu
     * @param {string} suffix - The page suffix
     */
    openDropdown(suffix = '') {
        const dropdownBtn = document.getElementById(`theme-dropdown-btn${suffix}`);
        const dropdownMenu = document.getElementById(`theme-dropdown-menu${suffix}`);
        
        if (dropdownBtn && dropdownMenu) {
            dropdownBtn.classList.add('active');
            dropdownMenu.classList.add('active');
        }
    }

    /**
     * Closes all dropdown menus
     */
    closeAllDropdowns() {
        const pageTypes = ['', '-upload', '-layout'];
        
        pageTypes.forEach(suffix => {
            const dropdownBtn = document.getElementById(`theme-dropdown-btn${suffix}`);
            const dropdownMenu = document.getElementById(`theme-dropdown-menu${suffix}`);
            
            if (dropdownBtn && dropdownMenu) {
                dropdownBtn.classList.remove('active');
                dropdownMenu.classList.remove('active');
            }
        });
    }

    /**
     * Selects and applies a theme
     * @param {string} themeId - The ID of the theme to select
     */
    selectTheme(themeId) {
        if (!this.themes[themeId]) {
            console.error('[ThemeManager] Invalid theme ID:', themeId);
            return;
        }

        console.log('[ThemeManager] Selecting theme:', themeId);
        
        this.currentTheme = themeId;
        this.applyTheme(themeId, true);
        this.updateThemeSelector();
    }

    /**
     * Applies the theme to the document
     * @param {string} themeId - The ID of the theme to apply
     * @param {boolean} saveToStorage - Whether to save the theme to localStorage
     */
    applyTheme(themeId, saveToStorage = true) {
        console.log('[ThemeManager] Applying theme:', themeId);

        // Remove existing theme data attributes
        Object.keys(this.themes).forEach(theme => {
            document.documentElement.removeAttribute(`data-theme`);
        });

        // Apply new theme (don't set data-theme for default theme)
        if (themeId !== 'default') {
            document.documentElement.setAttribute('data-theme', themeId);
        }

        // Save to localStorage if requested
        if (saveToStorage) {
            localStorage.setItem('comicCreator_theme', themeId);
            console.log('[ThemeManager] Theme saved to localStorage:', themeId);
        }

        // Trigger any theme change callbacks if needed
        this.onThemeChange(themeId);
    }

    /**
     * Updates all theme selector UIs to reflect the current selection
     */
    updateThemeSelector() {
        const pageTypes = ['', '-upload', '-layout'];
        
        // Update current theme text for all selectors
        pageTypes.forEach(suffix => {
            const currentThemeText = document.getElementById(`current-theme-text${suffix}`);
            if (currentThemeText) {
                currentThemeText.textContent = this.themes[this.currentTheme].name;
            }
        });

        // Update all theme options
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            const themeId = option.dataset.theme;
            if (themeId === this.currentTheme) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        console.log('[ThemeManager] All theme selectors updated for:', this.currentTheme);
    }

    /**
     * Called when theme changes - can be extended for additional functionality
     * @param {string} themeId - The ID of the newly applied theme
     */
    onThemeChange(themeId) {
        console.log('[ThemeManager] Theme changed to:', themeId);
        
        // You can add additional theme change logic here
        // For example, updating specific components that need to react to theme changes
        
        // Dispatch a custom event for other components to listen to
        const themeChangeEvent = new CustomEvent('themeChanged', {
            detail: { themeId: themeId, themeName: this.themes[themeId].name }
        });
        document.dispatchEvent(themeChangeEvent);
    }

    /**
     * Gets the current theme ID
     * @returns {string} The current theme ID
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Gets information about all available themes
     * @returns {Object} Object containing all theme information
     */
    getAvailableThemes() {
        return { ...this.themes };
    }

    /**
     * Programmatically sets a theme (useful for API calls or testing)
     * @param {string} themeId - The ID of the theme to set
     * @returns {boolean} Whether the theme was successfully set
     */
    setTheme(themeId) {
        if (!this.themes[themeId]) {
            console.error('[ThemeManager] Cannot set invalid theme:', themeId);
            return false;
        }

        this.selectTheme(themeId);
        return true;
    }

    /**
     * Resets to the default theme
     */
    resetToDefault() {
        this.selectTheme('default');
    }

    /**
     * Cleanup method for removing event listeners
     */
    destroy() {
        // Remove event listeners and cleanup
        const dropdownBtn = document.getElementById('theme-dropdown-btn');
        const dropdownMenu = document.getElementById('theme-dropdown-menu');
        
        if (dropdownBtn) {
            dropdownBtn.removeEventListener('click', this.toggleDropdown);
        }
        
        if (dropdownMenu) {
            dropdownMenu.removeEventListener('click', this.selectTheme);
        }
        
        console.log('[ThemeManager] Destroyed');
    }
} 