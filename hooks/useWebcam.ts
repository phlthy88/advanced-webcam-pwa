
import { useState, useCallback, useRef, useEffect } from 'react';
// FIX: Import ExtendedMediaTrackCapabilities for proper typing
import { CameraDevice, CameraSettings, ExtendedMediaTrackCapabilities } from '../types';
import { useToast } from '../contexts/ToastContext';
import { DEFAULT_SETTINGS } from '../constants';

// FIX: Export getConstraintName for use in WebcamApp.tsx
export const getConstraintName = (controlName: keyof CameraSettings) => {
    const mapping: Partial<Record<keyof CameraSettings, string>> = {
      'brightness': 'brightness',
      'contrast': 'contrast',
      'saturation': 'saturation',
      'sharpness': 'sharpness',
      'whiteBalanceTemperature': 'colorTemperature',
      'exposureCompensation': 'exposureCompensation',
      'iso': 'iso',
      'zoom': 'zoom',
      'pan': 'pan',
      'tilt': 'tilt',
      'exposureMode': 'exposureMode',
      'whiteBalanceMode': 'whiteBalanceMode',
      'focusMode': 'focusMode',
    };
    return mapping[controlName];
};


// FIX: Removed `settings` from arguments to break dependency cycle
export const useWebcam = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
    const [hasPermission, setHasPermission] = useState(false);
    // FIX: Use ExtendedMediaTrackCapabilities for the state type
    const [capabilities, setCapabilities] = useState<ExtendedMediaTrackCapabilities | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const { addToast } = useToast();

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    const enumerateCameras = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices
                .filter(device => device.kind === 'videoinput')
                .map(d => ({ deviceId: d.deviceId, label: d.label, groupId: d.groupId }));
            setCameras(videoDevices);
            return videoDevices;
        } catch (e) {
            console.error("Error enumerating devices:", e);
            addToast('Could not list cameras.', 'error');
            return [];
        }
    }, [addToast]);
    
    const startCamera = useCallback(async (deviceId: string) => {
        setIsStarting(true);
        setError(null);
        stopStream();
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: { exact: deviceId },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                }
            });
            streamRef.current = newStream;
            setStream(newStream);
            setCurrentCameraId(deviceId);
            setHasPermission(true);
            
            const track = newStream.getVideoTracks()[0];
            const caps = track.getCapabilities();
            // FIX: Cast capabilities to ExtendedMediaTrackCapabilities
            setCapabilities(caps as ExtendedMediaTrackCapabilities);
            
            addToast(`Switched to ${cameras.find(c => c.deviceId === deviceId)?.label || 'camera'}`, 'success');
        } catch (err: any) {
            console.error("Failed to start camera:", err);
            let errorMessage = err.message;
             if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Camera access denied. Please allow access in browser settings.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found. Please check connection.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = 'Camera is in use by another application.';
            }
            setError(errorMessage);
            addToast(`Error: ${errorMessage}`, 'error');
            setHasPermission(false);
        } finally {
            setIsStarting(false);
        }
    }, [stopStream, addToast, cameras]);

    const requestCameraAccess = useCallback(async () => {
        setIsStarting(true);
        setError(null);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not available. This app requires a secure context (HTTPS or localhost).');
            }
            
            const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
            permissionStream.getTracks().forEach(track => track.stop());
            
            const videoDevices = await enumerateCameras();

            if (videoDevices.length > 0) {
                await startCamera(videoDevices[0].deviceId);
            } else {
                throw new Error('No cameras found.');
            }
        } catch (err: any) {
            console.error('Camera access error:', err);
            let errorMessage = err.message;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Camera access denied. Please allow camera access in browser settings and reload.';
            }
            setError(errorMessage);
            setHasPermission(false);
        } finally {
            setIsStarting(false);
        }
    }, [enumerateCameras, startCamera]);


    const applyHardwareConstraint = useCallback(async <K extends keyof CameraSettings,>(
        controlName: K,
        value: CameraSettings[K]
    ) => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        const constraintName = getConstraintName(controlName);
        if (!constraintName || !capabilities || !(constraintName in capabilities)) return;

        try {
            await track.applyConstraints({ advanced: [{ [constraintName]: value }] });
        } catch (error) {
            console.warn(`Failed to apply hardware constraint ${constraintName}: ${value}`, error);
        }
    }, [capabilities]);
    
    // FIX: Removed useEffect that applied hardware settings. This logic is moved to WebcamApp.tsx.

    useEffect(() => {
        navigator.mediaDevices.addEventListener('devicechange', enumerateCameras);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', enumerateCameras);
        };
    }, [enumerateCameras]);

    const isHardwareControl = useCallback((controlName: keyof CameraSettings): boolean => {
        const constraintName = getConstraintName(controlName);
        return !!(constraintName && capabilities && constraintName in capabilities);
    }, [capabilities]);
    
    return {
        stream,
        cameras,
        currentCameraId,
        hasPermission,
        capabilities,
        error,
        isStarting,
        requestCameraAccess,
        startCamera,
        isHardwareControl,
        // FIX: Return applyHardwareConstraint to be used in WebcamApp.tsx
        applyHardwareConstraint,
    };
};