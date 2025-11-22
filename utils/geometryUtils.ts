/**
 * Geometry utility functions for video transformations.
 * Handles rotation, zoom, pan/tilt, and mirroring operations.
 */

import { CameraSettings } from '../types';

export interface TransformParams {
  rotation: number;
  zoom: number;
  pan: number;
  tilt: number;
  mirrorH: boolean;
  mirrorV: boolean;
}

/**
 * Apply geometric transformations to a canvas context.
 * Transforms are applied around the center of the canvas.
 */
export const applyTransforms = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  drawWidth: number,
  drawHeight: number,
  params: TransformParams,
  isHardwareZoom: boolean
): void => {
  // Move origin to center
  ctx.translate(canvasWidth / 2, canvasHeight / 2);

  // Apply mirroring
  ctx.scale(params.mirrorH ? -1 : 1, params.mirrorV ? -1 : 1);

  // Apply rotation
  ctx.rotate(params.rotation * Math.PI / 180);

  // Apply software zoom with pan/tilt
  if (!isHardwareZoom && params.zoom > 100) {
    const zoomScale = params.zoom / 100;
    const panX = (params.pan / 180) * (drawWidth / zoomScale);
    const tiltY = (params.tilt / 90) * (drawHeight / zoomScale);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-panX, tiltY);
  }

  // Move origin back
  ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
};

/**
 * Extract transform parameters from camera settings.
 */
export const getTransformParams = (
  settings: Pick<CameraSettings, 'rotation' | 'zoom' | 'pan' | 'tilt' | 'mirrorH' | 'mirrorV'>
): TransformParams => ({
  rotation: settings.rotation,
  zoom: settings.zoom,
  pan: settings.pan,
  tilt: settings.tilt,
  mirrorH: settings.mirrorH,
  mirrorV: settings.mirrorV,
});

/**
 * Calculate smooth interpolation for face tracking.
 */
export const smoothValue = (
  current: number,
  target: number,
  smoothingFactor: number
): number => {
  return current + (target - current) * smoothingFactor;
};

/**
 * Clamp a value within a range.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Calculate face tracking adjustments.
 */
export interface FaceTrackingAdjustment {
  pan: number;
  tilt: number;
  zoom: number;
}

export interface FaceTrackingConfig {
  smoothingFactor: number;
  targetFaceHeightRatio: number;
  panTiltSensitivity: number;
  minZoom: number;
  maxZoom: number;
}

export const DEFAULT_FACE_TRACKING_CONFIG: FaceTrackingConfig = {
  smoothingFactor: 0.08,
  targetFaceHeightRatio: 0.4,
  panTiltSensitivity: 0.4,
  minZoom: 100,
  maxZoom: 400,
};

/**
 * Calculate face tracking adjustments based on detected face position.
 */
export const calculateFaceTrackingAdjustment = (
  faceBoundingBox: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  },
  videoWidth: number,
  videoHeight: number,
  currentSettings: Pick<CameraSettings, 'pan' | 'tilt' | 'zoom'>,
  config: FaceTrackingConfig = DEFAULT_FACE_TRACKING_CONFIG,
  hardwareZoomRange?: { min: number; max: number }
): FaceTrackingAdjustment => {
  const { smoothingFactor, targetFaceHeightRatio, panTiltSensitivity, minZoom, maxZoom } = config;

  // Calculate zoom adjustment
  const targetHeight = videoHeight * targetFaceHeightRatio;
  const heightError = targetHeight - faceBoundingBox.height;
  let targetZoom = currentSettings.zoom + (heightError * 0.1);

  if (hardwareZoomRange) {
    targetZoom = (currentSettings.zoom / 100) + (heightError * 0.005);
    targetZoom = clamp(targetZoom, hardwareZoomRange.min, hardwareZoomRange.max) * 100;
  } else {
    targetZoom = clamp(targetZoom, minZoom, maxZoom);
  }

  // Calculate pan adjustment (horizontal centering)
  const faceCenterX = faceBoundingBox.originX + faceBoundingBox.width / 2;
  const errorX = faceCenterX - videoWidth / 2;
  let targetPan = currentSettings.pan - (errorX / videoWidth) * 180 * panTiltSensitivity;
  targetPan = clamp(targetPan, -180, 180);

  // Calculate tilt adjustment (vertical centering)
  const faceCenterY = faceBoundingBox.originY + faceBoundingBox.height / 2;
  const errorY = faceCenterY - videoHeight / 2;
  let targetTilt = currentSettings.tilt + (errorY / videoHeight) * 90 * panTiltSensitivity;
  targetTilt = clamp(targetTilt, -90, 90);

  return {
    pan: smoothValue(currentSettings.pan, targetPan, smoothingFactor),
    tilt: smoothValue(currentSettings.tilt, targetTilt, smoothingFactor),
    zoom: smoothValue(currentSettings.zoom, targetZoom, smoothingFactor),
  };
};
