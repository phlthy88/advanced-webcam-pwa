/**
 * Image Segmentation Service
 * Provides person segmentation using MediaPipe ImageSegmenter.
 * Used for background blur and virtual background features.
 */

import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

let imageSegmenter: ImageSegmenter | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

/**
 * Initialize the image segmentation model.
 * Safe to call multiple times - will only initialize once.
 */
export const initializeSegmentation = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-assets/deeplabv3.tflite",
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true,
    });

    isInitialized = true;
    initializationError = null;
  } catch (error) {
    console.error("Failed to initialize segmentation:", error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

/**
 * Segment a video frame to separate foreground from background.
 * Returns the category mask or null if segmentation fails.
 */
export const segment = async (
  videoElement: HTMLVideoElement,
  timestamp: number
): Promise<ImageData | null> => {
  if (!isInitialized || !imageSegmenter) {
    if (!initializationError) {
      console.warn("Image segmenter is not initialized.");
    }
    return null;
  }

  try {
    const result = await imageSegmenter.segmentForVideo(videoElement, timestamp);
    return result?.categoryMask ?? null;
  } catch (error) {
    console.error("Segmentation failed:", error);
    return null;
  }
};

/**
 * Check if segmentation is ready for use.
 */
export const isSegmentationReady = (): boolean => {
  return isInitialized && imageSegmenter !== null;
};

/**
 * Get the initialization error if any.
 */
export const getSegmentationError = (): Error | null => {
  return initializationError;
};

/**
 * Release resources and reset the segmentation model.
 * Call this when the service is no longer needed.
 */
export const destroySegmentation = (): void => {
  if (imageSegmenter) {
    imageSegmenter.close();
    imageSegmenter = null;
  }
  isInitialized = false;
  initializationError = null;
};
