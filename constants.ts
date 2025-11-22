import { CameraSettings } from './types';

// =============================================================================
// Default Camera Settings
// =============================================================================

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

// =============================================================================
// UI Constants
// =============================================================================

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

// =============================================================================
// Face Landmarks Constants (MediaPipe FaceMesh Indices)
// =============================================================================

/**
 * MediaPipe FaceMesh landmark indices for specific facial features.
 * Used for face smoothing effect to preserve sharpness of eyes and mouth.
 * Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
 */
export const FACE_LANDMARKS = {
  /** Left eye contour landmark indices */
  LEFT_EYE: [130, 133, 160, 159, 158, 144, 145, 153] as const,
  /** Right eye contour landmark indices */
  RIGHT_EYE: [359, 362, 387, 386, 385, 373, 374, 380] as const,
  /** Mouth contour landmark indices */
  MOUTH: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291] as const,
  /** Nose tip index for portrait lighting */
  NOSE_TIP: 1 as const,
  /** Left face edge for face width calculation */
  LEFT_FACE_EDGE: 234 as const,
  /** Right face edge for face width calculation */
  RIGHT_FACE_EDGE: 454 as const,
} as const;

// =============================================================================
// Timing Constants (in milliseconds)
// =============================================================================

export const TIMING = {
  /** Interval for AI segmentation processing */
  SEGMENTATION_INTERVAL_MS: 100,
  /** Interval for face mesh detection */
  FACE_MESH_INTERVAL_MS: 100,
  /** Interval for face detection in tracking mode */
  FACE_DETECTION_INTERVAL_MS: 100,
  /** Debounce delay for settings changes */
  SETTINGS_DEBOUNCE_MS: 16,
} as const;

// =============================================================================
// Effect Constants
// =============================================================================

export const EFFECTS = {
  /** Blur amount for full blur mode (pixels) */
  FULL_BLUR_AMOUNT: 12,
  /** Blur amount for portrait mode background (pixels) */
  PORTRAIT_BLUR_AMOUNT: 8,
  /** Maximum face smoothing divisor for blur calculation */
  FACE_SMOOTHING_DIVISOR: 15,
  /** Maximum portrait lighting intensity divisor */
  PORTRAIT_LIGHTING_DIVISOR: 250,
  /** Portrait lighting gradient radius multiplier */
  PORTRAIT_LIGHTING_RADIUS_MULTIPLIER: 1.2,
} as const;

// =============================================================================
// Face Tracking Constants
// =============================================================================

export const FACE_TRACKING = {
  /** Smoothing factor for face tracking movements (0-1, lower = smoother) */
  SMOOTHING_FACTOR: 0.08,
  /** Target ratio of face height to video height */
  TARGET_FACE_HEIGHT_RATIO: 0.4,
  /** Sensitivity for pan/tilt adjustments */
  PAN_TILT_SENSITIVITY: 0.4,
  /** Zoom adjustment factor based on face size */
  ZOOM_ADJUSTMENT_FACTOR: 0.1,
  /** Hardware zoom adjustment factor */
  HARDWARE_ZOOM_ADJUSTMENT_FACTOR: 0.005,
  /** Minimum software zoom level */
  MIN_ZOOM: 100,
  /** Maximum software zoom level */
  MAX_ZOOM: 400,
  /** Pan range limits */
  PAN_MIN: -180,
  PAN_MAX: 180,
  /** Tilt range limits */
  TILT_MIN: -90,
  TILT_MAX: 90,
} as const;