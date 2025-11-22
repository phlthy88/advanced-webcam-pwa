/**
 * Camera Settings Hook
 * Manages camera-specific settings with per-device storage.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { CameraSettings, ExtendedMediaTrackCapabilities, MediaSettingsRange } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { getConstraintName } from './useWebcam';

interface UseCameraSettingsProps {
  currentCameraId: string | null;
  capabilities: ExtendedMediaTrackCapabilities | null;
  applyHardwareConstraint: <K extends keyof CameraSettings>(
    controlName: K,
    value: CameraSettings[K]
  ) => Promise<void>;
}

interface UseCameraSettingsReturn {
  /** Current settings for the active camera */
  settings: CameraSettings;
  /** Update one or more settings */
  updateSettings: (newSettings: Partial<CameraSettings>) => void;
  /** Reset all settings to defaults */
  resetAllSettings: () => void;
  /** Reset a specific section of settings */
  resetSection: (section: SettingsSection) => void;
  /** Map of all camera settings by device ID */
  settingsByCamera: Map<string, CameraSettings>;
}

export type SettingsSection = 'exposure' | 'color' | 'focus' | 'gain' | 'ptz' | 'effects' | 'all';

const SECTION_KEYS: Record<SettingsSection, (keyof CameraSettings)[]> = {
  exposure: ['brightness', 'contrast', 'gamma', 'exposureMode', 'exposureCompensation'],
  color: ['saturation', 'hue', 'whiteBalanceMode', 'whiteBalanceTemperature'],
  focus: ['focusMode', 'sharpness'],
  gain: ['iso'],
  ptz: ['zoom', 'pan', 'tilt'],
  effects: ['filter', 'rotation', 'blur', 'faceSmoothing', 'portraitLighting', 'mirrorH', 'mirrorV'],
  all: Object.keys(DEFAULT_SETTINGS) as (keyof CameraSettings)[],
};

/**
 * Clamp a numeric value to a capability range.
 */
const clampToRange = (value: number, range: MediaSettingsRange | undefined): number => {
  if (!range) return value;
  return Math.max(range.min, Math.min(range.max, value));
};

/**
 * Hook for managing camera settings with per-device storage and hardware sync.
 */
export const useCameraSettings = ({
  currentCameraId,
  capabilities,
  applyHardwareConstraint,
}: UseCameraSettingsProps): UseCameraSettingsReturn => {
  const [settingsByCamera, setSettingsByCamera] = useState<Map<string, CameraSettings>>(new Map());
  const applyingRef = useRef(false);

  // Get current settings with memoization
  const settings = useMemo(() => {
    return settingsByCamera.get(currentCameraId || '') || DEFAULT_SETTINGS;
  }, [settingsByCamera, currentCameraId]);

  // Initialize settings for new camera
  useEffect(() => {
    if (currentCameraId && !settingsByCamera.has(currentCameraId)) {
      const searchParams = new URLSearchParams(window.location.search);
      const initialSettings = { ...DEFAULT_SETTINGS };

      // Handle launch params
      if (searchParams.get('mirror') === 'true') {
        initialSettings.mirrorH = true;
      }

      setSettingsByCamera((prev) => {
        const next = new Map(prev);
        next.set(currentCameraId, initialSettings);
        return next;
      });
    }
  }, [currentCameraId, settingsByCamera]);

  // Apply hardware constraints when settings change
  useEffect(() => {
    if (!currentCameraId || !capabilities || applyingRef.current) return;

    const applySettings = async () => {
      applyingRef.current = true;

      const allControls = Object.keys(settings) as (keyof CameraSettings)[];
      const changedSettings: Partial<CameraSettings> = {};

      for (const control of allControls) {
        const constraintName = getConstraintName(control);
        if (!constraintName || !(constraintName in capabilities)) continue;

        let valueToApply: CameraSettings[keyof CameraSettings] = settings[control];
        const capability = capabilities[constraintName as keyof ExtendedMediaTrackCapabilities];

        // Handle numeric range controls
        if (
          typeof valueToApply === 'number' &&
          capability &&
          typeof capability === 'object' &&
          'min' in capability
        ) {
          const range = capability as MediaSettingsRange;
          let valueToClamp = valueToApply;

          // Zoom is a special case: UI is 100-400, hardware is different range
          if (control === 'zoom') {
            valueToClamp = valueToApply / 100.0;
          }

          const clampedValue = clampToRange(valueToClamp, range);

          // If clamping changed the value, update the state
          const finalUIValue = control === 'zoom' ? clampedValue * 100 : clampedValue;
          if (Math.abs(finalUIValue - (settings[control] as number)) > 0.01) {
            (changedSettings as Record<string, number>)[control] = finalUIValue;
          }

          valueToApply = clampedValue;
        }

        // Handle mode controls
        if (typeof valueToApply === 'string' && Array.isArray(capability)) {
          if (!(capability as string[]).includes(valueToApply)) {
            console.warn(
              `Mode '${valueToApply}' for '${control}' not supported. Supported: ${capability.join(', ')}`
            );
            continue;
          }
        }

        await applyHardwareConstraint(control, valueToApply);
      }

      // If any settings were clamped, update the UI state
      if (Object.keys(changedSettings).length > 0 && currentCameraId) {
        setSettingsByCamera((prev) => {
          const next = new Map(prev);
          const current = next.get(currentCameraId) || DEFAULT_SETTINGS;
          next.set(currentCameraId, { ...current, ...changedSettings });
          return next;
        });
      }

      applyingRef.current = false;
    };

    applySettings();
  }, [settings, capabilities, applyHardwareConstraint, currentCameraId]);

  const updateSettings = useCallback(
    (newSettings: Partial<CameraSettings>) => {
      if (!currentCameraId) return;

      setSettingsByCamera((prev) => {
        const next = new Map(prev);
        const current = next.get(currentCameraId) || DEFAULT_SETTINGS;
        next.set(currentCameraId, { ...current, ...newSettings });
        return next;
      });
    },
    [currentCameraId]
  );

  const resetAllSettings = useCallback(() => {
    if (!currentCameraId) return;

    setSettingsByCamera((prev) => {
      const next = new Map(prev);
      next.set(currentCameraId, { ...DEFAULT_SETTINGS });
      return next;
    });
  }, [currentCameraId]);

  const resetSection = useCallback(
    (section: SettingsSection) => {
      if (!currentCameraId) return;

      const keysToReset = SECTION_KEYS[section];
      const resetValues: Partial<CameraSettings> = {};

      for (const key of keysToReset) {
        (resetValues as Record<string, CameraSettings[keyof CameraSettings]>)[key] =
          DEFAULT_SETTINGS[key];
      }

      setSettingsByCamera((prev) => {
        const next = new Map(prev);
        const current = next.get(currentCameraId) || DEFAULT_SETTINGS;
        next.set(currentCameraId, { ...current, ...resetValues });
        return next;
      });
    },
    [currentCameraId]
  );

  return {
    settings,
    updateSettings,
    resetAllSettings,
    resetSection,
    settingsByCamera,
  };
};

export default useCameraSettings;
