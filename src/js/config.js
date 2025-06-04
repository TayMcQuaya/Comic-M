/**
 * Configuration module for API endpoints and environment settings
 * This handles the difference between local development and production deployment
 */

// Development URL for local testing
const DEV_API_BASE_URL = 'http://localhost:3001/api';

// Get the API base URL from environment variables
const getApiBaseUrl = () => {
    const isDev = import.meta.env.DEV;
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    
    console.log('[Config] Environment check:', {
        isDev,
        hasEnvUrl: !!envUrl,
        mode: import.meta.env.MODE
    });
    
    // In development, use the local development server
    if (isDev) {
        const devUrl = envUrl || DEV_API_BASE_URL;
        console.log('[Config] Using development URL:', devUrl);
        return devUrl;
    }
    
    // In production, REQUIRE the environment variable
    if (!envUrl) {
        console.error('[Config] VITE_API_BASE_URL environment variable is required for production');
        throw new Error('VITE_API_BASE_URL environment variable must be set for production deployment');
    }
    
    console.log('[Config] Using production URL from environment variable');
    return envUrl;
};

// Configuration object
export const config = {
    // API endpoints
    apiBaseUrl: getApiBaseUrl(),
    
    // Specific endpoints
    endpoints: {
        exportPdf: `${getApiBaseUrl()}/export-pdf`,
        exportProgress: (jobId) => `${getApiBaseUrl()}/export-progress/${jobId}`,
        downloadPdf: (jobId) => `${getApiBaseUrl()}/download-pdf/${jobId}`
    },
    
    // Environment info
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    
    // Export settings
    export: {
        maxRetries: 3,
        retryDelay: 2000, // 2 seconds
        progressPollInterval: 2000 // 2 seconds
    },
    
    // Debug settings
    debug: import.meta.env.DEV
};

// Helper function to log configuration in development
if (config.debug) {
    console.log('[Config] Final API Configuration:', {
        apiBaseUrl: config.apiBaseUrl,
        exportPdf: config.endpoints.exportPdf,
        isDevelopment: config.isDevelopment,
        isProduction: config.isProduction,
        timestamp: Date.now()
    });
}

export default config; 