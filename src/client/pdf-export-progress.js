// PDF Export Progress UI Component
class PDFExportProgressUI {
    constructor(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`PDFExportProgressUI: Container with ID '${containerId}' not found.`);
            return;
        }
        // Corrected to match expected HTML structure from original context if possible
        this.progressContainer = container.querySelector('.progress-container-new') || container;
        this.progressBar = container.querySelector('.progress-bar-new');
        this.statusElement = container.querySelector('.status-message-new');
        this.downloadLink = container.querySelector('.download-link-new');
        this.errorMessageElement = container.querySelector('.error-message-new');
        this.compressionInfoElement = container.querySelector('.compression-info-new'); // Assuming this element exists for compression messages

        // Fallback to creating elements if not found, for robustness, though ideal is fixed HTML structure
        if (!this.progressBar) { this.progressBar = document.createElement('div'); this.progressContainer.appendChild(this.progressBar); }
        if (!this.statusElement) { this.statusElement = document.createElement('div'); this.progressContainer.appendChild(this.statusElement); }
        if (!this.downloadLink) { this.downloadLink = document.createElement('a'); this.progressContainer.appendChild(this.downloadLink); }
        if (!this.errorMessageElement) { this.errorMessageElement = document.createElement('div'); this.progressContainer.appendChild(this.errorMessageElement); }
        if (!this.compressionInfoElement) { 
            this.compressionInfoElement = document.createElement('div'); 
            this.progressContainer.appendChild(this.compressionInfoElement); 
        }
        
        this.reset();
    }

    /**
     * Set up the initial UI elements
     */
    setupUI() {
        this.container.innerHTML = `
            <div class="pdf-export-progress" style="display: none;">
                <div class="progress-header">
                    <h3 class="phase-title">Initializing Export...</h3>
                    <p class="phase-details">Please wait...</p>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 0%"></div>
                </div>
                
                <div class="compression-info" style="display: none;">
                    <h4>Compression Results</h4>
                    <ul>
                        <li>Original Size: <span class="original-size">-</span></li>
                        <li>Compressed Size: <span class="compressed-size">-</span></li>
                        <li>Reduction: <span class="compression-ratio">-</span></li>
                    </ul>
                </div>

                <div class="compression-warning" style="display: none; color: orange; margin: 10px 0;">
                </div>
                
                <div class="error-message" style="display: none; color: red;">
                </div>
                
                <div class="action-buttons" style="display: none;">
                    <button class="download-btn" style="display: none;">Download PDF</button>
                    <button class="close-btn" style="display: none;">Close</button>
                </div>
            </div>
        `;

        // Add basic styles
        const style = document.createElement('style');
        style.textContent = `
            .pdf-export-progress {
                padding: 20px;
                border: 1px solid #ccc;
                border-radius: 8px;
                margin: 10px 0;
                background: #fff;
            }
            
            .progress-bar-container {
                width: 100%;
                height: 20px;
                background: #f0f0f0;
                border-radius: 10px;
                overflow: hidden;
                margin: 15px 0;
            }
            
            .progress-bar {
                height: 100%;
                background: #4CAF50;
                transition: width 0.3s ease;
            }
            
            .compression-info {
                margin: 15px 0;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 4px;
            }
            
            .compression-info ul {
                list-style: none;
                padding: 0;
            }
            
            .compression-info li {
                margin: 5px 0;
            }

            .compression-warning {
                padding: 10px;
                margin: 10px 0;
                background: #fff3cd;
                border-left: 4px solid #ffc107;
            }
            
            .action-buttons {
                margin-top: 15px;
            }
            
            .action-buttons button {
                padding: 8px 16px;
                margin-right: 10px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
            }
            
            .download-btn {
                background: #4CAF50;
                color: white;
            }
            
            .close-btn {
                background: #6c757d;
                color: white;
            }
            
            .error-message {
                padding: 10px;
                margin: 10px 0;
                background: #fff3f3;
                border-left: 4px solid #dc3545;
            }
        `;
        document.head.appendChild(style);

        // Get references to UI elements
        this.progressElement = this.container.querySelector('.pdf-export-progress');
        this.phaseTitle = this.container.querySelector('.phase-title');
        this.phaseDetails = this.container.querySelector('.phase-details');
        this.progressBar = this.container.querySelector('.progress-bar');
        this.compressionInfo = this.container.querySelector('.compression-info');
        this.compressionWarning = this.container.querySelector('.compression-warning');
        this.originalSize = this.container.querySelector('.original-size');
        this.compressedSize = this.container.querySelector('.compressed-size');
        this.compressionRatio = this.container.querySelector('.compression-ratio');
        this.errorMessage = this.container.querySelector('.error-message');
        this.actionButtons = this.container.querySelector('.action-buttons');
        this.downloadButton = this.container.querySelector('.download-btn');
        this.closeButton = this.container.querySelector('.close-btn');

        // Add event listeners
        this.closeButton.addEventListener('click', () => this.hide());
    }

    /**
     * Show the progress UI
     */
    show() {
        this.progressContainer.style.display = 'block';
        this.reset(); // Ensure clean state on show
    }

    /**
     * Hide the progress UI
     */
    hide() {
        this.progressContainer.style.display = 'none';
    }

    /**
     * Reset the UI to its initial state
     */
    reset() {
        this.progressBar.style.width = '0%';
        this.statusElement.textContent = 'Initializing...';
        this.downloadLink.style.display = 'none';
        this.downloadLink.href = '#';
        this.errorMessageElement.textContent = '';
        this.errorMessageElement.style.display = 'none';
        this.compressionInfoElement.textContent = ''; // Clear compression info
        this.compressionInfoElement.style.display = 'none'; // Hide compression info
        this.compressionInfoElement.className = 'compression-info-new'; // Reset class
    }

    /**
     * Format file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Update the progress display
     * @param {object} progressData - Progress information
     */
    updateProgress(progressData) {
        this.phaseTitle.textContent = progressData.phase;
        this.phaseDetails.textContent = progressData.details;
        this.progressBar.style.width = `${progressData.progress}%`;
    }

    /**
     * Display compression warning message
     * @param {string} message - Warning message to display
     */
    showCompressionWarning(message) {
        this.clearMessages(); // Clear other messages
        this.compressionInfoElement.textContent = message;
        this.compressionInfoElement.className = 'compression-info-new warning'; 
        this.compressionInfoElement.style.display = 'block';
    }

    /**
     * Display compression results
     * @param {object} compressionInfo - Compression statistics
     */
    showCompressionResults(compressionInfo) {
        if (!compressionInfo || typeof compressionInfo.success === 'undefined') return;
        this.clearMessages(); // Clear other messages
        if (compressionInfo.success) {
            const { originalSize, compressedSize, compressionRatio } = compressionInfo;
            const message = `Compression successful! Original: ${(originalSize / 1024).toFixed(1)}KB, Compressed: ${(compressedSize / 1024).toFixed(1)}KB (Reduced by ${compressionRatio}%).`;
            this.compressionInfoElement.textContent = message;
            this.compressionInfoElement.className = 'compression-info-new success'; 
            this.compressionInfoElement.style.display = 'block';
        } else {
            // This case should ideally be handled by showCompressionWarning or showError based on details
            // For now, if success is false, let's treat it as a warning/info that it wasn't successful.
            const message = `Compression was not performed or not successful. Error: ${compressionInfo.error || 'N/A'}`;
            this.showCompressionWarning(message);
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.clearMessages(); // Clear other messages when showing an error
        this.errorMessageElement.textContent = message;
        this.errorMessageElement.style.display = 'block';
        this.errorMessageElement.className = 'error-message-new error'; // General error class + specific
        // this.compressionInfoElement.style.display = 'none'; // Handled by clearMessages
    }

    /**
     * Enable download button with URL
     * @param {string} downloadUrl - URL for downloading the PDF
     */
    enableDownload(downloadUrl) {
        this.downloadLink.href = downloadUrl;
        this.downloadLink.style.display = 'block';
        this.downloadLink.textContent = 'Download PDF'; // Or some other appropriate text
    }

    disableDownload() {
        this.downloadLink.style.display = 'none';
        this.downloadLink.href = '#';
    }

    // New method to display compression success details
    showCompressionResults(compressionInfo) {
        if (!compressionInfo || !compressionInfo.success) return;
        const { originalSize, compressedSize, compressionRatio } = compressionInfo;
        const message = `Compression successful! Original: ${(originalSize / 1024).toFixed(1)} KB, Compressed: ${(compressedSize / 1024).toFixed(1)} KB (Reduced by ${compressionRatio}%).`;
        this.compressionInfoElement.textContent = message;
        this.compressionInfoElement.className = 'compression-info-new success'; // For styling success
        this.compressionInfoElement.style.display = 'block';
        this.errorMessageElement.style.display = 'none'; // Hide error messages
    }

    // New method to display compression warnings (e.g., fallback)
    showCompressionWarning(message) {
        this.compressionWarning.textContent = message;
        this.compressionWarning.style.display = 'block';
    }

    enableDownload(url) {
        this.downloadButton.style.display = 'inline-block';
        this.closeButton.style.display = 'inline-block';
        this.actionButtons.style.display = 'block';
        this.downloadButton.onclick = () => window.location.href = url;
    }

    clearMessages() {
        this.errorMessageElement.textContent = '';
        this.errorMessageElement.style.display = 'none';
        this.compressionInfoElement.textContent = '';
        this.compressionInfoElement.style.display = 'none';
        this.compressionInfoElement.className = 'compression-info-new'; // Reset class
    }
}

export default PDFExportProgressUI; 