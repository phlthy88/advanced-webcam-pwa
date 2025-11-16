
import { CameraSettings } from './types';

export const DEFAULT_SETTINGS: CameraSettings = {
  brightness: 128,
  contrast: 128,
  saturation: 128,
  sharpness: 128,
  hue: 0,
  gamma: 100,
  exposureMode: 'continuous',
  exposureCompensation: 0,
  whiteBalanceMode: 'continuous',
  whiteBalanceTemperature: 4600,
  focusMode: 'continuous',
  iso: 400,
  zoom: 100,
  pan: 0,
  tilt: 0,
  filter: 'none',
  rotation: 0,
  mirrorH: false,
  mirrorV: false,
  blur: 0,
  faceSmoothing: 0,
  portraitLighting: 0,
};

export const PTZ_PRESET_COUNT = 8;

export const FILTERS = [
  { value: 'none', label: 'None' },
  { value: 'grayscale', label: 'Mono' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'invert', label: 'Negative' },
  { value: 'posterize', label: 'Posterize' },
  { value: 'aqua', label: 'Aqua' },
  { value: 'blackboard', label: 'Blackboard' },
  { value: 'whiteboard', label: 'Whiteboard' },
];

export const RESOLUTIONS = [
  { width: 3840, height: 2160, label: '4K UHD (3840×2160)' },
  { width: 1920, height: 1080, label: 'Full HD (1920×1080)' },
  { width: 1280, height: 720, label: 'HD (1280×720)' },
  { width: 640, height: 480, label: 'SD (640×480)' },
  { width: 320, height: 240, label: 'QVGA (320×240)' },
];

export const FRAME_RATES = [15, 24, 30, 60];