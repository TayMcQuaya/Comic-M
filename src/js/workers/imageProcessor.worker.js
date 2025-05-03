self.onmessage = async (event) => {
    const file = event.data;

    // Check if the received data is a File object
    if (!(file instanceof File)) {
        self.postMessage({ 
            error: true, 
            message: 'Invalid data received. Expected a File object.',
            fileName: file?.name || 'Unknown' 
        });
        return;
    }

    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let objectURL = null;

    try {
        // Create an Object URL (more memory efficient than Data URL)
        objectURL = URL.createObjectURL(file);

        // Use Image object to get dimensions
        const image = await createImageBitmap(file); // createImageBitmap is preferred in workers
        
        const width = image.width;
        const height = image.height;
        
        // Send the processed data back to the main thread
        self.postMessage({
            success: true,
            id: imageId,
            name: file.name,
            objectURL: objectURL, // Send the Object URL for preview/display
            width: width,
            height: height
        });

        // IMPORTANT: The main thread is now responsible for calling 
        // URL.revokeObjectURL(objectURL) when the URL is no longer needed.
        // We cannot revoke it here, as the main thread needs it.

    } catch (error) {
        console.error(`Error processing image in worker: ${file.name}`, error);
        // Clean up Object URL if it was created before the error
        if (objectURL) {
            URL.revokeObjectURL(objectURL);
        }
        // Send error details back to the main thread
        self.postMessage({ 
            error: true, 
            message: `Failed to process image: ${error.message}`,
            fileName: file.name 
        });
    }
}; 