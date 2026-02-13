import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import axiosInstance from "./axios";

export type ScanStreamProgressCallback = (
  progress: number,
  status: string,
  stage: string
) => void;

class ScanService {
    async scanBarcode(barcode: string) {
        try {
            // Send barcode in the request body
            const response = await axiosInstance.post('/scan/barcode', { barcode });

            return {
                success: true,
                data: response.data,
                barcode
            };
        } catch (error: any) {
            console.error('Barcode scan error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || error.message || 'Unknown error occurred',
                barcode
            };
        }
    }

    async scanImage(imageUri: string) {
        // Create FormData for image upload
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'food_image.jpg'
        } as any);

        const response = await axiosInstance.post('/scan/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    }

    /**
     * Scan image via streaming endpoint with progress updates (SSE).
     * POST multipart/form-data to /scan/image/stream; reads SSE stream and calls onProgress.
     */
    async scanImageStream(
        imageUri: string,
        onProgress: ScanStreamProgressCallback
    ): Promise<any> {
        const token = await AsyncStorage.getItem('my_token');
        const baseURL = Config.API_BASE_URL?.replace(/\/$/, '') || '';
        const url = `${baseURL}/scan/image/stream`;

        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'photo.jpg',
        } as any);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Scan failed: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    try {
                        const data = JSON.parse(jsonStr);

                        onProgress(
                            data.progress ?? 0,
                            data.status ?? '',
                            data.stage ?? ''
                        );

                        if (data.progress === 100 && data.result != null) {
                            return data.result;
                        }
                        if (data.progress === -1 && data.error) {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) continue;
                        throw e;
                    }
                }
            }
        }

        throw new Error('Stream ended without result');
    }
}

export const scanService = new ScanService();