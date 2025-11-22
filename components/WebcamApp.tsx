/**
 * WebcamApp Component
 * Main application component managing webcam state and UI orchestration.
 * Uses modular hooks for theme, AI models, and settings management.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWebcam, getConstraintName } from '../hooks/useWebcam';
import { useTheme } from '../hooks/useTheme';
import { useAIModels } from '../hooks/useAIModels';
import { CameraSettings, SettingsPreset, PtzPreset, ExtendedMediaTrackCapabilities, MediaSettingsRange } from '../types';
import { DEFAULT_SETTINGS, PTZ_PRESET_COUNT } from '../constants';
import PermissionScreen from './PermissionScreen';
import Header from './Header';
import StatusBar from './StatusBar';
import VideoPanel from './VideoPanel';
import ControlsPanel from './ControlsPanel';
import ShortcutsModal from './ShortcutsModal';
import { FeatureErrorBoundary } from './ErrorBoundary';
import { useToast } from '../contexts/ToastContext';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BlurMode } from '../utils/filterUtils';

// Define this helper component here to avoid re-rendering issues
const LoadingSpinner: React.FC<{text?: string}> = ({text = 'Starting camera...'}) => (
    <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg text-gray-600 dark:text-gray-300">{text}</p>
    </div>
);


const WebcamApp: React.FC = () => {
    // Use modular hooks for theme and AI model management
    const { theme, toggleTheme } = useTheme();
    const { isInitializing: isDetectorInitializing } = useAIModels();

    // A map to store settings for each camera deviceId
    const [settingsByCamera, setSettingsByCamera] = useState<Map<string, CameraSettings>>(new Map());
    const [isShortcutsVisible, setIsShortcutsVisible] = useState(false);
    const [isFaceTrackingActive, setIsFaceTrackingActive] = useState(false);

    // AI & Effects State
    const [blurMode, setBlurMode] = useState<BlurMode>('none');
    const [aiBackgroundUrl, setAiBackgroundUrl] = useState<string | null>(null);
    const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('A modern corner office with a city view at sunset');

    // All presets are managed here
    const [settingsPresets, setSettingsPresets] = useState<SettingsPreset[]>([]);
    const [ptzPresets, setPtzPresets] = useState<(PtzPreset | null)[]>(Array(PTZ_PRESET_COUNT).fill(null));

    const { addToast } = useToast();
    const adjustmentFrameRef = useRef<number | null>(null);

    const {
        stream,
        cameras,
        currentCameraId,
        hasPermission,
        error,
        isStarting,
        requestCameraAccess,
        startCamera,
        isHardwareControl,
        capabilities,
        applyHardwareConstraint,
    } = useWebcam();
    
    // Refs to hold latest values for use inside animation frame loop
    const settingsRef = useRef(DEFAULT_SETTINGS);
    const videoSizeRef = useRef<{width: number, height: number} | null>(null);

    const currentSettings = useMemo(() => {
        return settingsByCamera.get(currentCameraId || '') || DEFAULT_SETTINGS;
    }, [settingsByCamera, currentCameraId]);

    // Keep refs updated
    useEffect(() => {
        settingsRef.current = currentSettings;
        if(stream) {
            const { width, height } = stream.getVideoTracks()[0].getSettings();
            videoSizeRef.current = { width: width ?? 0, height: height ?? 0 };
        }
    }, [currentSettings, stream]);

    // AI model initialization is now handled by useAIModels hook
    
    
    const updateCurrentSettings = useCallback((newSettings: Partial<CameraSettings>) => {
        if (!currentCameraId) return;
        setSettingsByCamera(prev => {
            const next = new Map(prev);
            const current = next.get(currentCameraId) || DEFAULT_SETTINGS;
            const updatedSettings = Object.assign({}, current, newSettings);
            next.set(currentCameraId, updatedSettings);
            return next;
        });
    }, [currentCameraId]);

    const handleGenerateBackground = async () => {
        if (!aiPrompt.trim()) {
            addToast("Please enter a prompt for the background.", "warning");
            return;
        }
        setIsGeneratingBackground(true);
        setBlurMode('none'); // AI background overrides blur
        addToast("Generating AI background... this may take a moment.", "info");
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("Gemini API key not found.");
            }
            addToast("Connecting to AI service...", "info");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(aiPrompt);
            const response = await result.response;
            const text = response.text();
            setAiBackgroundUrl(text);
            addToast("AI background generated successfully!", "success");
        } catch (err) {
            console.error("AI background generation failed:", err);
            addToast("Failed to generate background. Please try again.", "error");
            setAiBackgroundUrl(null);
        } finally {
            setIsGeneratingBackground(false);
        }
    };

    // FIX: This effect now safely applies settings by clamping them to the device's supported range.
    useEffect(() => {
        if (!stream || !capabilities || !currentCameraId) return;

        const applyAndClampSettings = async () => {
            const changedSettings: Partial<CameraSettings> = {};
            const allControls = Object.keys(currentSettings) as (keyof CameraSettings)[];

            for (const control of allControls) {
                const constraintName = getConstraintName(control);
                if (!constraintName || !(constraintName in capabilities)) continue;

                let valueToApply: any = currentSettings[control];
                const capability = capabilities[constraintName as keyof ExtendedMediaTrackCapabilities];

                // Handle numeric range controls (brightness, contrast, etc.)
                // FIX: Check if capability is an object before using 'in' operator to avoid runtime errors on primitive values.
                if (typeof valueToApply === 'number' && capability && typeof capability === 'object' && 'min' in capability) {
                    const range = capability as MediaSettingsRange;
                    let valueToClamp = valueToApply;

                    // Zoom is a special case: UI is 100-400, hardware is different range (e.g., 1-4)
                    if (control === 'zoom') {
                        valueToClamp = valueToApply / 100.0;
                    }

                    const clampedValue = Math.max(range.min, Math.min(range.max, valueToClamp));

                    // If clamping changed the value, update the state to reflect reality
                    const finalUIValue = control === 'zoom' ? clampedValue * 100 : clampedValue;
                    // FIX: Cast currentSettings[control] to number as TypeScript cannot infer it within this block.
                    if (Math.abs(finalUIValue - (currentSettings[control] as number)) > 0.01) {
                        // FIX: Use 'as any' to work around TypeScript's limitation in narrowing types for indexed access.
                        (changedSettings as any)[control] = finalUIValue;
                    }
                    
                    valueToApply = clampedValue;
                
                // Handle mode controls (e.g., exposureMode)
                } else if (typeof valueToApply === 'string' && Array.isArray(capability)) {
                    // FIX: Cast capability to string[] as we know from the logic it must be a string array here.
                    if (!(capability as string[]).includes(valueToApply)) {
                        console.warn(`Mode '${valueToApply}' for '${control}' not supported. Supported: ${capability.join(', ')}`);
                        continue; // Don't apply unsupported mode
                    }
                }
                
                await applyHardwareConstraint(control, valueToApply);
            }

            // If any settings were clamped, update the UI state to match the hardware state
            if (Object.keys(changedSettings).length > 0) {
                updateCurrentSettings(changedSettings);
            }
        };

        applyAndClampSettings();
    }, [currentSettings, stream, capabilities, applyHardwareConstraint, updateCurrentSettings, currentCameraId]);


    // Effect to initialize camera settings and handle launch params (from shortcuts, etc.)
    useEffect(() => {
        if (currentCameraId && !settingsByCamera.has(currentCameraId)) {
            const searchParams = new URLSearchParams(window.location.search);
            const initialSettings = {...DEFAULT_SETTINGS};
            
            if (searchParams.get('mirror') === 'true') {
                initialSettings.mirrorH = true;
            }

            setSettingsByCamera(prev => {
                const next = new Map(prev);
                next.set(currentCameraId, initialSettings);
                return next;
            });
        }
    }, [currentCameraId, settingsByCamera]);

    // Theme management is now handled by useTheme hook

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
             if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                return;
            }
            if (e.key === '?') {
                e.preventDefault();
                setIsShortcutsVisible(v => !v);
            } else if (e.key === 'Escape') {
                setIsShortcutsVisible(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (isDetectorInitializing) {
        return <div className="w-screen h-screen"><LoadingSpinner text="Initializing AI models..." /></div>
    }

    if (!hasPermission) {
        return <PermissionScreen onRequest={requestCameraAccess} error={error} isStarting={isStarting} />;
    }

    if (isStarting && !stream) {
        return <div className="w-screen h-screen"><LoadingSpinner /></div>
    }

    return (
        <div className="flex flex-col h-screen font-sans">
            <Header onToggleTheme={toggleTheme} theme={theme} onShowShortcuts={() => setIsShortcutsVisible(true)} />
            <StatusBar stream={stream} cameraLabel={cameras.find(c => c.deviceId === currentCameraId)?.label} />

            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-2 sm:p-4 lg:p-6">
                  <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
                      <div className="w-full max-w-md">
                          <label htmlFor="cameraSelect" className="block text-sm font-medium mb-1">Select Camera:</label>
                          <select
                              id="cameraSelect"
                              value={currentCameraId || ''}
                              onChange={(e) => startCamera(e.target.value)}
                              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                              {cameras.map(camera => (
                                  <option key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${camera.deviceId.substring(0, 8)}`}</option>
                              ))}
                          </select>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-[1fr_400px] gap-6 items-start">
                          <div className="lg:col-span-2 xl:col-span-1 lg:sticky lg:top-0">
                              <FeatureErrorBoundary featureName="Video Preview">
                                <VideoPanel
                                    stream={stream}
                                    settings={currentSettings}
                                    onSettingsChange={updateCurrentSettings}
                                    isHardwareZoom={isHardwareControl('zoom')}
                                    isFaceTrackingActive={isFaceTrackingActive}
                                    blurMode={blurMode}
                                    aiBackgroundUrl={aiBackgroundUrl}
                                    capabilities={capabilities}
                                />
                              </FeatureErrorBoundary>
                          </div>
                          <div className="lg:col-span-1 xl:col-span-1">
                              <FeatureErrorBoundary featureName="Controls Panel">
                                <ControlsPanel
                                    settings={currentSettings}
                                    onSettingsChange={updateCurrentSettings}
                                    capabilities={capabilities}
                                    isHardwareControl={isHardwareControl}
                                    stream={stream}
                                    settingsPresets={settingsPresets}
                                    setSettingsPresets={setSettingsPresets}
                                    ptzPresets={ptzPresets}
                                    setPtzPresets={setPtzPresets}
                                    addToast={addToast}
                                    isFaceTrackingActive={isFaceTrackingActive}
                                    onToggleFaceTracking={() => setIsFaceTrackingActive(prev => !prev)}
                                    blurMode={blurMode}
                                    setBlurMode={setBlurMode}
                                    aiBackgroundUrl={aiBackgroundUrl}
                                    setAiBackgroundUrl={setAiBackgroundUrl}
                                    isGeneratingBackground={isGeneratingBackground}
                                    onGenerateBackground={handleGenerateBackground}
                                    aiPrompt={aiPrompt}
                                    setAiPrompt={setAiPrompt}
                                />
                              </FeatureErrorBoundary>
                          </div>
                      </div>
                  </div>
              </div>
            </div>
            {isShortcutsVisible && <ShortcutsModal onClose={() => setIsShortcutsVisible(false)} />}
        </div>
    );
};

export default WebcamApp;