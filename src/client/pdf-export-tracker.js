// Client-side PDF export progress tracker
class PDFExportTracker {
    constructor() {
        this.currentJobId = null;
        this.pollingInterval = null;
        this.onProgressCallback = null;
        this.onCompleteCallback = null;
        this.onErrorCallback = null;
    }

    /**
     * Start tracking a new PDF export job
     * @param {string} jobId - The ID of the export job to track
     * @param {object} callbacks - Callback functions for different events
     */
    startTracking(jobId, callbacks = {}) {
        this.currentJobId = jobId;
        this.onProgressCallback = callbacks.onProgress || (() => {});
        this.onCompleteCallback = callbacks.onComplete || (() => {});
        this.onErrorCallback = callbacks.onError || (() => {});

        // Clear any existing polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        // Start polling for progress
        this.pollingInterval = setInterval(() => this.checkProgress(), 1000);
    }

    /**
     * Check the current progress of the PDF export job
     */
    async checkProgress() {
        if (!this.currentJobId) return;

        try {
            const response = await fetch(`/api/export-progress/${this.currentJobId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const progressData = await response.json();

            // Handle different job statuses
            switch (progressData.status) {
                case 'starting':
                    this.onProgressCallback({
                        phase: 'Initializing export',
                        progress: 0,
                        details: 'Setting up export job...'
                    });
                    break;

                case 'processing':
                    const percentComplete = (progressData.currentPage / progressData.totalPages) * 100;
                    this.onProgressCallback({
                        phase: 'Generating PDF',
                        progress: percentComplete,
                        details: `Processing page ${progressData.currentPage} of ${progressData.totalPages}`
                    });
                    break;

                case 'compressing':
                    this.onProgressCallback({
                        phase: 'Compressing PDF',
                        progress: 95,
                        details: 'Optimizing file size using iLovePDF service...'
                    });
                    break;

                case 'complete':
                    clearInterval(this.pollingInterval);
                    this.onCompleteCallback({
                        downloadUrl: `/api/download-pdf/${this.currentJobId}`,
                        compressionInfo: progressData.compressionInfo ? {
                            success: progressData.compressionInfo.success,
                            originalSize: progressData.compressionInfo.originalSize,
                            compressedSize: progressData.compressionInfo.compressedSize,
                            compressionRatio: progressData.compressionInfo.compressionRatio,
                            error: progressData.compressionInfo.error,
                            fallback_used: progressData.compressionInfo.fallback_used,
                            fallback_failed: progressData.compressionInfo.fallback_failed,
                            fallback_impossible: progressData.compressionInfo.fallback_impossible
                        } : null
                    });
                    break;

                case 'error':
                    clearInterval(this.pollingInterval);
                    this.onErrorCallback(new Error(progressData.error || 'Unknown error during export'));
                    break;
            }
        } catch (error) {
            console.error('Error checking export progress:', error);
            this.onErrorCallback(error);
            clearInterval(this.pollingInterval);
        }
    }

    /**
     * Stop tracking the current export job
     */
    stopTracking() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.currentJobId = null;
    }
}

// Example usage:
/*
const tracker = new PDFExportTracker();

// Start tracking a job
tracker.startTracking('some-job-id', {
    onProgress: (progressData) => {
        console.log(`${progressData.phase}: ${progressData.progress}% - ${progressData.details}`);
        // Update UI with progress
    },
    onComplete: (result) => {
        console.log('Export complete! Download URL:', result.downloadUrl);
        console.log('Compression results:', result.compressionInfo);
        // Enable download button, show compression stats, etc.
    },
    onError: (error) => {
        console.error('Export failed:', error);
        // Show error message to user
    }
});
*/

export default PDFExportTracker; 