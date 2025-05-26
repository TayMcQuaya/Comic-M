/* eslint-disable no-unused-vars */
import PdfExportTracker from './pdf-export-tracker';
// Assuming PdfExportUI is the class in pdf-export-progress.js
import PdfExportUI from './pdf-export-progress';

/**
 * Manages the PDF export process, including UI updates and tracking.
 */
export default class PdfExportManager {
    constructor(ui) { // ui is an instance of PdfExportUI
        this.ui = ui;
        this.tracker = null;
        this.isExporting = false;
        this.progress = 0;
        this.statusMessage = 'Idle';
        this.downloadUrl = null;
        this.currentJobId = null;
        this.currentJobStatus = null;
    }

    async startExport(settings) {
        if (this.isExporting) {
            console.warn('Export already in progress.');
            // this.ui.showError may not exist or may need specific arguments
            // For now, we assume a generic way to show an error or rely on console
            if (this.ui && typeof this.ui.showError === 'function') {
                 this.ui.showError('An export is already in progress.');
            }
            return Promise.reject(new Error('Export already in progress.'));
        }

        this.isExporting = true;
        this.progress = 0;
        this.statusMessage = 'Initializing export...';
        this.downloadUrl = null;
        this.currentJobId = null;
        
        if (this.ui) {
            this.ui.show();
            this.ui.updateProgress(0);
            this.ui.updateStatus('Starting export...');
            this.ui.disableDownload();
            if (typeof this.ui.clearMessages === 'function') {
                this.ui.clearMessages();
            }
        }

        try {
            const response = await fetch('/api/export-comic', { // Ensure this endpoint is correct
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings }), // Pass settings
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            this.currentJobId = data.jobId;
            this.statusMessage = `Export started (Job ID: ${this.currentJobId})`;
            if (this.ui) this.ui.updateStatus(this.statusMessage);
            
            console.log('PDF Export Job Started:', this.currentJobId);

            return new Promise((resolve, reject) => {
                this.tracker = new PdfExportTracker(
                    this.currentJobId,
                    (progress, jobStatus, data) => { // onProgress: Correctly accept 3 arguments
                        // Directly call the main handleProgress method
                        this.handleProgress(progress, jobStatus, data);
                    },
                    (result) => { // onComplete
                        this.handleExportComplete(result);
                        resolve(result);
                    },
                    (error) => { // onError
                        this.handleExportError(error);
                        reject(error);
                    }
                );
                this.tracker.startPolling();
            });
        } catch (error) {
            console.error('Error starting export:', error);
            this.handleExportError({ message: error.message || 'Unknown error starting export process' });
            return Promise.reject(error); // Propagate rejection
        }
    }

    handleProgress(progress, jobStatus, data = {}) {
        console.log('[PdfExportManager.handleProgress] Received:', { progress, jobStatus, data }); // Log 1: What's coming in

        this.currentJobStatus = jobStatus;
        let statusMessage = '';
        let displayProgress = progress;

        if (jobStatus === 'generating') {
            statusMessage = data.message || `Generating page ${data.currentPage || '?'} of ${data.totalPages || '?'}`;
            console.log('[PdfExportManager.handleProgress] Condition: generating', { statusMessage, displayProgress, serverMessage: data.message });
        } else if (jobStatus === 'merging') {
            statusMessage = data.message || 'Finalizing PDF creation...';
            console.log('[PdfExportManager.handleProgress] Condition: merging', { statusMessage, displayProgress, serverMessage: data.message });
        } else if (jobStatus === 'compressing') {
            statusMessage = 'Compressing PDF... This may take a few minutes. <br>Please wait.';
            displayProgress = 100; // Local PDF generation is done, show 100% for that part.
            console.log('[PdfExportManager.handleProgress] Condition: compressing', { statusMessage, displayProgress, serverMessage: data.message }); // Key log
        } else if (jobStatus === 'starting' || jobStatus === 'processing') {
            statusMessage = data.message || `Processing export... (${jobStatus})`;
            console.log('[PdfExportManager.handleProgress] Condition: starting/processing', { statusMessage, displayProgress, serverMessage: data.message });
        } else if (data.message) { // Fallback if server sends a message for an unhandled status
            statusMessage = data.message;
            console.log('[PdfExportManager.handleProgress] Condition: data.message fallback', { statusMessage, displayProgress, serverMessage: data.message });
        } else { // Ultimate fallback
            statusMessage = `Current status: ${jobStatus} (${progress.toFixed(0)}%)`;
            console.log('[PdfExportManager.handleProgress] Condition: final else fallback', { statusMessage, displayProgress });
        }

        if (this.ui) {
            this.ui.updateProgress(displayProgress, statusMessage);
            console.log('[PdfExportManager.handleProgress] UI updated with:', { displayProgress, statusMessage });
        }
        // The original, more concise log:
        // console.log(`[PdfExportManager] Progress Update: ${displayProgress.toFixed(0)}%, Status: ${jobStatus}, UI Message: "${statusMessage}", ServerData:`, data);
    }

    handleExportComplete(data) {
        this.isExporting = false;
        this.progress = 100;
        this.downloadUrl = data.downloadUrl; 
        if (this.ui) this.ui.updateProgress(100);

        let finalStatusMessage = 'PDF Export Complete!';
        
        // Ensure UI messages are cleared or handled appropriately
        if (this.ui && typeof this.ui.clearMessages === 'function') {
             // this.ui.clearMessages(); // Decide if clearing here is best UX
        }

        if (data.compressionInfo) {
            const ci = data.compressionInfo;
            if (ci.success) {
                const successMsg = `Successfully compressed: Original ${(ci.originalSize / 1024).toFixed(1)}KB, Compressed ${(ci.compressedSize / 1024).toFixed(1)}KB (Reduced by ${ci.compressionRatio}%).`;
                finalStatusMessage = 'Export Complete & Compressed.';
                if (this.ui && typeof this.ui.showCompressionResults === 'function') {
                    this.ui.showCompressionResults(ci);
                } else if (this.ui) {
                     this.ui.updateStatus(finalStatusMessage + " " + successMsg); // Fallback
                }
            } else if (ci.fallback_used) {
                const warningMsg = `Compression failed: ${ci.error || 'Unknown reason'}. Using original uncompressed file. Size: ${(ci.originalSize / 1024).toFixed(1)}KB.`;
                finalStatusMessage = 'Export Complete (Compression Failed, Original Used).';
                if (this.ui && typeof this.ui.showCompressionWarning === 'function') {
                    this.ui.showCompressionWarning(warningMsg);
                } else if (this.ui && typeof this.ui.showError === 'function') { // Fallback to showError
                    this.ui.showError(warningMsg); // Or a general status update
                }
            } else if (ci.fallback_failed || ci.fallback_impossible) {
                const errorType = ci.fallback_failed ? "fallback copy also failed" : "fallback was impossible (e.g., original file missing)";
                const errorMsg = `CRITICAL: Compression API failed (${ci.error || 'Unknown reason'}) AND ${errorType}. Download may be unavailable or corrupted.`;
                finalStatusMessage = 'Export Complete (Compression CRITICALLY Failed).';
                if (this.ui && typeof this.ui.showError === 'function') {
                    this.ui.showError(errorMsg);
                }
            } else { // Generic failure
                const genericErrorMsg = `Compression failed: ${ci.error || 'Unknown compression error'}. Original file may be used if available.`;
                finalStatusMessage = 'Export Complete (Compression Issue).';
                if (this.ui && typeof this.ui.showCompressionWarning === 'function') {
                    this.ui.showCompressionWarning(genericErrorMsg);
                } else if (this.ui && typeof this.ui.showError === 'function') { // Fallback
                     this.ui.showError(genericErrorMsg);
                }
            }
        } else {
            const noInfoMsg = 'Compression information not available.';
            finalStatusMessage = 'Export Complete (Compression status unknown).';
            if (this.ui && typeof this.ui.showCompressionWarning === 'function') {
                this.ui.showCompressionWarning(noInfoMsg);
            }
        }
        
        this.statusMessage = finalStatusMessage;
        if (this.ui) this.ui.updateStatus(finalStatusMessage);

        if (this.downloadUrl && this.ui) {
            this.ui.enableDownload(this.downloadUrl);
        } else if (this.ui) {
            this.ui.disableDownload();
            if (this.ui && typeof this.ui.showError === 'function' && (!data.compressionInfo || (!data.compressionInfo.fallback_failed && !data.compressionInfo.fallback_impossible))) {
                // Only show this specific error if not already covered by a more critical compression error message
               // this.ui.showError(finalStatusMessage + " Download is unavailable.");
            }
        }
        console.log('Export complete. Final Status:', finalStatusMessage, 'Data:', data);
    }

    handleExportError(error) {
        this.isExporting = false;
        // Preserve progress if it was a mid-process error, otherwise set to 0 or current
        this.progress = this.progress > 0 ? this.progress : 0; 
        this.statusMessage = `Error: ${error.message || 'Unknown export error'}`;
        
        if (this.ui) {
            this.ui.updateStatus(this.statusMessage);
            if (typeof this.ui.showError === 'function') {
                this.ui.showError(this.statusMessage);
            }
            this.ui.updateProgress(this.progress); 
            this.ui.disableDownload();
        }
        console.error('Export error managed:', error);
    }

    cancelExport() {
        if (this.tracker) {
            this.tracker.stopPolling();
            this.tracker = null;
        }
        if (this.currentJobId) {
            // Optional: Send a request to the server to attempt to cancel the job
            fetch(`/api/cancel-export/${this.currentJobId}`, { method: 'POST' })
                .then(response => response.json())
                .then(data => console.log('Server cancel request response:', data))
                .catch(err => console.error('Error sending cancel request to server:', err));
        }
        this.isExporting = false;
        this.statusMessage = 'Export Cancelled.';
        if (this.ui) {
            this.ui.updateStatus(this.statusMessage);
            this.ui.hide(); // Or some other UI indication of cancellation
        }
        console.log('Export cancelled by user.');
    }
}
