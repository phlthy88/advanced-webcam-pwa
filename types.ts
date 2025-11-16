

export interface CameraSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  hue: number;
  gamma: number;
  exposureMode: 'continuous' | 'manual' | 'none';
  exposureCompensation: number;
  whiteBalanceMode: 'continuous' | 'manual' | 'none';
  whiteBalanceTemperature: number;
  focusMode: 'continuous' | 'manual' | 'single-shot';
  iso: number;
  zoom: number;
  pan: number;
  tilt: number;
  filter: string;
  rotation: number;
  mirrorH: boolean;
  mirrorV: boolean;
  blur: number;
  faceSmoothing: number;
  portraitLighting: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface PtzPreset {
  pan: number;
  tilt: number;
  zoom: number;
}

// FIX: Add MediaSettingsRange and ExtendedMediaTrackCapabilities to properly type non-standard capabilities
export interface MediaSettingsRange {
  max: number;
  min: number;
  step: number;
}

export interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  brightness?: MediaSettingsRange;
  contrast?: MediaSettingsRange;
  saturation?: MediaSettingsRange;
  sharpness?: MediaSettingsRange;
  exposureCompensation?: MediaSettingsRange;
  colorTemperature?: MediaSettingsRange;
  iso?: MediaSettingsRange;
  zoom?: MediaSettingsRange;
  pan?: MediaSettingsRange;
  tilt?: MediaSettingsRange;
  exposureMode?: ('continuous' | 'manual' | 'none')[];
  whiteBalanceMode?: ('continuous' | 'manual' | 'none')[];
  focusMode?: ('continuous' | 'manual' | 'single-shot')[];
}


export interface SettingsPreset {
  name: string;
  timestamp: string;
  settings: CameraSettings;
}

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

// MediaPipe Face Detection Types
export interface BoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
  angle: number;
}
export interface FaceDetection {
  boundingBox: BoundingBox;
  categories: {
    index: number;
    score: number;
    displayName: string;
    categoryName: string;
  }[];
  keypoints: {
    x: number;
    y: number;
    keypointName?: string;
  }[];
}