/**
 * Filter utility functions for CSS filter generation.
 * Handles color filters, blur effects, and composite filters.
 */

import { CameraSettings } from '../types';

export type FilterType = 'none' | 'grayscale' | 'sepia' | 'invert' | 'posterize' | 'aqua' | 'blackboard' | 'whiteboard';

export type BlurMode = 'none' | 'portrait' | 'full';

/**
 * CSS filter definitions for each filter type.
 */
const FILTER_DEFINITIONS: Record<FilterType, string> = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
  invert: 'invert(100%)',
  posterize: 'contrast(250%) saturate(200%)',
  aqua: 'sepia(50%) hue-rotate(180deg) saturate(200%)',
  blackboard: 'contrast(150%) brightness(120%) grayscale(100%) invert(100%)',
  whiteboard: 'contrast(200%) brightness(110%) grayscale(100%)',
};

/**
 * Build CSS filter string from camera settings.
 */
export const buildFilter = (
  settings: Pick<CameraSettings, 'hue' | 'filter' | 'blur'>,
  blurMode: BlurMode = 'none'
): string => {
  const filters: string[] = [];

  // Hue rotation
  if (settings.hue !== 0) {
    filters.push(`hue-rotate(${settings.hue}deg)`);
  }

  // Color filter
  const filterType = settings.filter as FilterType;
  const filterDef = FILTER_DEFINITIONS[filterType];
  if (filterDef) {
    filters.push(filterDef);
  }

  // Blur effect
  if (blurMode === 'full') {
    filters.push('blur(12px)');
  } else if (settings.blur > 0) {
    filters.push(`blur(${settings.blur}px)`);
  }

  return filters.join(' ').trim() || 'none';
};

/**
 * Build filter string with face smoothing.
 */
export const buildFilterWithSmoothing = (
  settings: Pick<CameraSettings, 'hue' | 'filter' | 'blur' | 'faceSmoothing'>,
  blurMode: BlurMode = 'none'
): string => {
  const baseFilter = buildFilter(settings, blurMode);

  if (settings.faceSmoothing > 0) {
    const smoothBlur = settings.faceSmoothing / 15;
    return baseFilter === 'none'
      ? `blur(${smoothBlur}px)`
      : `${baseFilter} blur(${smoothBlur}px)`;
  }

  return baseFilter;
};

/**
 * Calculate portrait lighting gradient parameters.
 */
export const calculatePortraitLighting = (
  intensity: number,
  noseX: number,
  noseY: number,
  faceWidth: number
): {
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
  opacity: number;
} => {
  return {
    centerX: noseX,
    centerY: noseY,
    innerRadius: 0,
    outerRadius: faceWidth * 1.2,
    opacity: intensity / 250,
  };
};

/**
 * Apply portrait lighting gradient to canvas.
 */
export const applyPortraitLighting = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  params: ReturnType<typeof calculatePortraitLighting>
): void => {
  const gradient = ctx.createRadialGradient(
    params.centerX,
    params.centerY,
    params.innerRadius,
    params.centerX,
    params.centerY,
    params.outerRadius
  );

  gradient.addColorStop(0, `rgba(255, 255, 255, ${params.opacity})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.globalCompositeOperation = 'source-over';
};
