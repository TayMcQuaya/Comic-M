/**
 * Configuration module for API endpoints and environment settings
 * This handles the difference between local development and production deployment
 */

// Force explicit development URL to avoid any caching issues
const DEV_API_BASE_URL = 'http://localhost:3001/api';
const PROD_API_BASE_URL = 'https://your-pdf-service.ondigitalocean.app/api';

// Get the API base URL from environment variables or use defaults
const getApiBaseUrl = () => {
    const isDev = import.meta.env.DEV;
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    
    console.log('[Config] Environment check:', {
        isDev,
        envUrl,
        metaEnv: import.meta.env
    });
    
    // In development, use the separate PDF service on port 3001
    if (isDev) {
        const devUrl = envUrl || DEV_API_BASE_URL;
        console.log('[Config] Using development URL:', devUrl);
        return devUrl;
    }
    
    // In production, use the DigitalOcean service URL
    const prodUrl = envUrl || PROD_API_BASE_URL;
    console.log('[Config] Using production URL:', prodUrl);
    return prodUrl;
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