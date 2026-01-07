
export const uploadImage = async (file: File): Promise<string> => {
    // We now point to our local proxy to avoid CORS
    const API_URL = '/api/upload';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.status_code !== 200) {
            throw new Error(data.error?.message || "Failed to upload image.");
        }

        // Return the direct link to the image
        return data.image.url;
    } catch (error) {
        console.error("FreeImage Upload Error", error);
        throw error;
    }
};
