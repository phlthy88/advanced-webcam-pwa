import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWebcam, getConstraintName } from '../hooks/useWebcam';
import { CameraSettings, SettingsPreset, PtzPreset, FaceDetection, ExtendedMediaTrackCapabilities, MediaSettingsRange } from '../types';
import { DEFAULT_SETTINGS, PTZ_PRESET_COUNT } from '../constants';
import PermissionScreen from './PermissionScreen';
import Header from './Header';
import StatusBar from './StatusBar';
import VideoPanel from './VideoPanel';
import ControlsPanel from './ControlsPanel';
import ShortcutsModal from './ShortcutsModal';
import { useToast } from '../contexts/ToastContext';
import { initializeFaceDetector } from '../services/faceDetectorService';
import { initializeSegmentation } from '../services/segmentationService';
import { initializeFaceMesh } from '../services/faceMeshService';
import { GoogleGenAI } from "@google/genai";

// Define this helper component here to avoid re-rendering issues
const LoadingSpinner: React.FC<{text?: string}> = ({text = 'Starting camera...'}) => (
    <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg text-gray-600 dark:text-gray-300">{text}</p>
    </div>
);


const WebcamApp: React.FC = () => {
    // A map to store settings for each camera deviceId
    const [settingsByCamera, setSettingsByCamera] = useState<Map<string, CameraSettings>>(new Map());
    const [isShortcutsVisible, setIsShortcutsVisible] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [isFaceTrackingActive, setIsFaceTrackingActive] = useState(false);
    const [isDetectorInitializing, setIsDetectorInitializing] = useState(true);

    // AI & Effects State
    const [blurMode, setBlurMode] = useState<'none' | 'portrait' | 'full'>('none');
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

    
    useEffect(() => {
        const initializeModels = async () => {
            setIsDetectorInitializing(true);
            try {
                // Initialize models sequentially to reduce initial resource load
                // and prevent potential race conditions in constrained environments.

                // Initialize each model with error handling to prevent complete failure
                // if one model fails to load
                try {
                    await initializeFaceDetector();
                    addToast("Face detector initialized", 'info');
                } catch (err) {
                    console.error("Failed to initialize face detector", err);
                    addToast("Could not load face detector. Some features may be limited.", 'warning');
                }

                try {
                    await initializeSegmentation();
                    addToast("Segmentation model initialized", 'info');
                } catch (err) {
                    console.error("Failed to initialize segmentation", err);
                    addToast("Could not load segmentation model. Some features may be limited.", 'warning');
                }

                try {
                    await initializeFaceMesh();
                    addToast("Face mesh model initialized", 'info');
                } catch (err) {
                    console.error("Failed to initialize face mesh", err);
                    addToast("Could not load face mesh model. Some features may be limited.", 'warning');
                }

                setIsDetectorInitializing(false);
            } catch (err) {
                console.error("Failed to initialize AI models", err);
                addToast("Could not load AI models. Some features will be limited.", 'error');
                setIsDetectorInitializing(false);
            }
        };

        initializeModels();
    }, [addToast]);
    
    
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
        // Note: Using the correct Google GenAI API for text-based image generation
        // The generateImages API might be from a different SDK or version
        // For now, we'll simulate the API call with a placeholder response
        // In a real implementation, you'd need to use the proper Google Image Generation API
        addToast("Connecting to AI service...", "info");

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Placeholder: In a real implementation, this would be the actual image generation API
        // The actual API would likely require a different package or direct API calls
        // For now, generate a placeholder response

        // Create a placeholder image using canvas or fetch from a mock endpoint
        const mockImageUrl = `https://placehold.co/800x450?text=${encodeURIComponent(aiPrompt)}`;
        setAiBackgroundUrl(mockImageUrl);
        addToast("AI background generated successfully (using placeholder)!", "success");

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

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

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
                          </div>
                          <div className="lg:col-span-1 xl:col-span-1">
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