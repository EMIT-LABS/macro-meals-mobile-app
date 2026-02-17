import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import axiosInstance from "./axios";

/* global XMLHttpRequest */

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
     * Scan image via streaming endpoint. Server sends NDJSON lines over time
     * (e.g. {"progress": 65, "status": "...", "stage": "analysis"}).
     * Uses XMLHttpRequest so we can read responseText in onprogress and emit
     * progress as each line arrives (React Native fetch does not support streaming).
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

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let processedLength = 0;
            let lineBuffer = '';
            let settled = false;
            const doResolve = (value: any) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };
            const doReject = (err: any) => {
                if (settled) return;
                settled = true;
                reject(err);
            };

            const processLine = (trimmed: string): any => {
                if (!trimmed) return null;
                const jsonStr = trimmed.startsWith('data: ')
                    ? trimmed.slice(6).trim()
                    : trimmed.startsWith('{')
                      ? trimmed
                      : null;
                if (jsonStr == null) return null;
                const data = JSON.parse(jsonStr);
                onProgress(
                    data.progress ?? 0,
                    data.status ?? '',
                    data.stage ?? ''
                );
                if (data.progress === 100 && data.result != null) return data.result;
                if (data.progress === -1 && data.error) throw new Error(data.error);
                return null;
            };

            const processNewChunk = (): any => {
                const text = xhr.responseText || '';
                const newPart = text.slice(processedLength);
                processedLength = text.length;
                lineBuffer += newPart;
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() ?? '';
                for (const line of lines) {
                    try {
                        const result = processLine(line.trim());
                        if (result != null) return result;
                    } catch (e) {
                        if (e instanceof SyntaxError) continue;
                        throw e;
                    }
                }
                return null;
            };

            xhr.open('POST', url);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.onprogress = () => {
                try {
                    const result = processNewChunk();
                    if (result != null) {
                        xhr.abort();
                        doResolve(result);
                    }
                } catch (e) {
                    xhr.abort();
                    doReject(e);
                }
            };

            xhr.onload = () => {
                try {
                    const result = processNewChunk();
                    if (result != null) {
                        doResolve(result);
                        return;
                    }
                    if (lineBuffer.trim()) {
                        const result = processLine(lineBuffer.trim());
                        if (result != null) {
                            doResolve(result);
                            return;
                        }
                    }
                    if (xhr.status >= 200 && xhr.status < 300) {
                        doReject(new Error('Stream ended without result'));
                    } else {
                        doReject(new Error(xhr.responseText || `Scan failed: ${xhr.status}`));
                    }
                } catch (e) {
                    doReject(e);
                }
            };

            xhr.onerror = () => doReject(new Error('Network request failed'));
            xhr.ontimeout = () => doReject(new Error('Request timed out'));

            xhr.responseType = 'text';
            xhr.send(formData);
        });
    }
}

export const scanService = new ScanService();