/**
 * Canvas utility functions for video rendering operations.
 * Provides aspect-ratio calculations and canvas setup helpers.
 */

export interface DrawDimensions {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Calculate aspect ratio-corrected dimensions for drawing video to canvas.
 * Maintains aspect ratio while fitting within canvas bounds (letterboxing).
 */
export const getDrawDimensions = (
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): DrawDimensions => {
  const videoAspectRatio = videoWidth / videoHeight;
  const canvasAspectRatio = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (canvasAspectRatio > videoAspectRatio) {
    // Canvas is wider than video - letterbox on sides
    drawWidth = canvasHeight * videoAspectRatio;
    offsetX = (canvasWidth - drawWidth) / 2;
  } else {
    // Canvas is taller than video - letterbox on top/bottom
    drawHeight = canvasWidth / videoAspectRatio;
    offsetY = (canvasHeight - drawHeight) / 2;
  }

  return { drawWidth, drawHeight, offsetX, offsetY };
};

/**
 * Resize canvas to match its CSS display size.
 * Returns true if resize occurred.
 */
export const syncCanvasSize = (canvas: HTMLCanvasElement): boolean => {
  const { clientWidth, clientHeight } = canvas;

  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    canvas.width = clientWidth;
    canvas.height = clientHeight;
    return true;
  }

  return false;
};

/**
 * Setup multiple canvases with consistent dimensions.
 */
export const setupCanvasDimensions = (
  displayCanvas: HTMLCanvasElement,
  overlayCanvas: HTMLCanvasElement,
  offscreenCanvas: HTMLCanvasElement,
  tempCanvas: HTMLCanvasElement,
  videoWidth: number,
  videoHeight: number
): void => {
  const { clientWidth, clientHeight } = displayCanvas;

  displayCanvas.width = clientWidth;
  displayCanvas.height = clientHeight;
  overlayCanvas.width = clientWidth;
  overlayCanvas.height = clientHeight;
  offscreenCanvas.width = videoWidth;
  offscreenCanvas.height = videoHeight;
  tempCanvas.width = clientWidth;
  tempCanvas.height = clientHeight;
};

/**
 * Safely get 2D context from canvas with fallback handling.
 */
export const getContext2D = (
  canvas: HTMLCanvasElement | null,
  options?: CanvasRenderingContext2DSettings
): CanvasRenderingContext2D | null => {
  if (!canvas) return null;
  return canvas.getContext('2d', options);
};

/**
 * Convert video coordinates to canvas coordinates.
 */
export const videoToCanvasCoords = (
  videoX: number,
  videoY: number,
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  const { drawWidth, drawHeight, offsetX, offsetY } = getDrawDimensions(
    videoWidth,
    videoHeight,
    canvasWidth,
    canvasHeight
  );

  const scaleX = drawWidth / videoWidth;
  const scaleY = drawHeight / videoHeight;

  return {
    x: offsetX + videoX * scaleX,
    y: offsetY + videoY * scaleY,
  };
};
