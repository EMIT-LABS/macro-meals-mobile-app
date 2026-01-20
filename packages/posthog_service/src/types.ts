import React from 'react';

export interface AutocaptureNavigationConfig {
    // Modify the screen name before tracking
    routeToName?: (name: string, params?: any) => string;
    // Modify or filter params before tracking (return undefined to not track params)
    routeToProperties?: (name: string, params?: any) => any | undefined;
}

export interface AutocaptureConfig {
    // Enable/disable touch event capture. Default is true.
    captureTouches?: boolean;
    // LEGACY: Capture screen navigation events. Use 'navigation: false' instead.
    // Set to false for React Navigation v7 to avoid useNavigationState errors
    captureScreens?: boolean;
    // Enable/disable automatic navigation tracking. Set to false to prevent useNavigationState errors.
    // When false, you should manually track screens using posthog.screen()
    navigation?: boolean | AutocaptureNavigationConfig;
    // Enable/disable element interaction capture
    element?: boolean;
    // Labels to ignore from the component stack in touch events
    ignoreLabels?: string[];
    // Custom prop name for labeling elements. Default is "ph-label"
    customLabelProp?: string;
    // Maximum number of elements to capture in the hierarchy. Default is 20
    maxElementsCaptured?: number;
    // Prop name to mark elements that should not be captured. Default is "ph-no-capture"
    noCaptureProp?: string;
    // Which props to capture from components. Default captures identifiers and text content
    propsToCapture?: string[];
}

export interface SessionReplayConfig {
    // Whether text and text input fields are masked. Default is true.
    // Password inputs are always masked regardless
    maskAllTextInputs?: boolean;
    // Whether images are masked. Default is true.
    maskAllImages?: boolean;
    // Enable masking of all sandboxed system views like UIImagePickerController. Default is true.
    // iOS only
    maskAllSandboxedViews?: boolean;
    // Capture logs automatically. Default is true.
    // Android only (Native Logcat only)
    captureLog?: boolean;
    // Whether network requests are captured in recordings. Default is true
    // Only metric-like data like speed, size, and response code are captured.
    // iOS only
    captureNetworkTelemetry?: boolean;
    // Throttling delay used to reduce the number of snapshots captured
    // Default is 1000ms
    throttleDelayMs?: number;
}

export interface PosthogConfig {
    apiKey?: string;
    host?: string;
    debug?: boolean;
    // Autocapture configuration
    // Set to false to completely disable autocapture (recommended for React Navigation v7)
    // Set to an object to configure specific autocapture options
    autocapture?: boolean | AutocaptureConfig;
    // When true, disables automatic GeoIP resolution for events and feature flags.
    disableGeoip?: boolean;
    // Enable Recording of Session replay for Android and iOS.
    enableSessionReplay?: boolean;
    // Session replay configuration
    sessionReplayConfig?: SessionReplayConfig;
}

export interface PosthogProviderProps extends PosthogConfig {
    children: React.ReactNode;
}

export interface Posthog {
    // Event tracking
    track: (event: TrackEvent) => void;
    
    // User identification
    identify: (distinctId: string) => void;
    
    // User properties
    setUserProperties: (properties: Record<string, any>) => void;
    setUserPropertiesOnce: (properties: Record<string, any>) => void;
    
    // Super properties
    register: (properties?: Record<string, any>) => void;
    unregister: (property: string) => void;
    
    // Session management
    reset: () => void;
    flush: () => Promise<void>;
    
    // Opt in/out
    optIn: () => void;
    optOut: () => void;
    isOptedOut: () => boolean;
    
    // Feature flags
    isFeatureEnabled: (flagKey: string) => boolean | undefined;
    getFeatureFlag: (flagKey: string) => string | boolean | undefined;
    getFeatureFlagPayload: (flagKey: string) => any;
    reloadFeatureFlags: () => void;
    reloadFeatureFlagsAsync: () => Promise<string[]>;
    onFeatureFlags: (callback: (flags: Record<string, string | boolean>) => void) => void;
    
    // Feature flag overrides
    setPersonPropertiesForFlags: (properties: Record<string, any>, reloadFlags?: boolean) => void;
    resetPersonPropertiesForFlags: () => void;
    
    // Status
    isInitialized: boolean;
}

export interface TrackEvent {
    name: string;
    properties?: Record<string, any>;
    timestamp?: number;

}

export interface IdentifyEvent {
    distinctId: string;
}

export interface SetUserPropertiesEvent {
    properties: Record<string, any>;
}

export interface PosthogSessionReplay {
    // Start session recording
    startRecording: () => void;
    // Stop session recording
    stopRecording: () => void;
    // Pause session recording
    pauseRecording: () => void;
    // Resume session recording
    resumeRecording: () => void;
    // Check if currently recording
    isRecording: () => boolean;
    // Status
    isInitialized: boolean;
}