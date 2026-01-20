import { usePostHog } from 'posthog-react-native';

/**
 * Custom hook for managing PostHog session replay
 * Provides methods to control session recording
 */
export const usePosthogSessionReplay = () => {
    const posthog = usePostHog();
    
    if (!posthog){
        return {
            startRecording: () => {},
            stopRecording: () => {},
            pauseRecording: () => {},
            resumeRecording: () => {},
            isRecording: () => false,
            isInitialized: false,
        };
    }
    
    return {
        // Start session recording
        startRecording: () => {
            try {
                console.log('[POSTHOG] 🎥 Starting session recording');
                if ('startSessionRecording' in posthog && typeof (posthog as any).startSessionRecording === 'function') {
                    (posthog as any).startSessionRecording();
                    console.log('[POSTHOG] ✅ Session recording started');
                } else {
                    console.warn('[POSTHOG] ⚠️ Session recording not available. Make sure to install posthog-react-native-session-replay');
                }
            } catch (error) {
                console.error('[POSTHOG] ❌ Error starting session recording:', error);
            }
        },

        // Stop session recording
        stopRecording: () => {
            try {
                console.log('[POSTHOG] ⏹️ Stopping session recording');
                if ('stopSessionRecording' in posthog && typeof (posthog as any).stopSessionRecording === 'function') {
                    (posthog as any).stopSessionRecording();
                    console.log('[POSTHOG] ✅ Session recording stopped');
                } else {
                    console.warn('[POSTHOG] ⚠️ Session recording not available');
                }
            } catch (error) {
                console.error('[POSTHOG] ❌ Error stopping session recording:', error);
            }
        },

        // Pause session recording
        pauseRecording: () => {
            try {
                console.log('[POSTHOG] ⏸️ Pausing session recording');
                if ('pauseSessionRecording' in posthog && typeof (posthog as any).pauseSessionRecording === 'function') {
                    (posthog as any).pauseSessionRecording();
                    console.log('[POSTHOG] ✅ Session recording paused');
                } else {
                    console.warn('[POSTHOG] ⚠️ Session recording pause not available');
                }
            } catch (error) {
                console.error('[POSTHOG] ❌ Error pausing session recording:', error);
            }
        },

        // Resume session recording
        resumeRecording: () => {
            try {
                console.log('[POSTHOG] ▶️ Resuming session recording');
                if ('resumeSessionRecording' in posthog && typeof (posthog as any).resumeSessionRecording === 'function') {
                    (posthog as any).resumeSessionRecording();
                    console.log('[POSTHOG] ✅ Session recording resumed');
                } else {
                    console.warn('[POSTHOG] ⚠️ Session recording resume not available');
                }
            } catch (error) {
                console.error('[POSTHOG] ❌ Error resuming session recording:', error);
            }
        },

        // Check if currently recording
        isRecording: () => {
            try {
                if ('isSessionReplayActive' in posthog && typeof (posthog as any).isSessionReplayActive === 'function') {
                    return (posthog as any).isSessionReplayActive();
                }
                return false;
            } catch (error) {
                console.error('[POSTHOG] ❌ Error checking recording status:', error);
                return false;
            }
        },

        isInitialized: true,
    };
};

// Re-export for convenience
export { usePostHog } from 'posthog-react-native';
