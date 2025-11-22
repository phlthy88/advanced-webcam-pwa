/**
 * Face Detector Service
 * Provides face detection using MediaPipe FaceDetector.
 * Includes initialization, detection, status checking, and cleanup.
 */

import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceDetector: FaceDetector | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

/**
 * Initialize the face detector model.
 * Safe to call multiple times - will only initialize once.
 */
export const initializeFaceDetector = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
        delegate: "GPU"
      },
      runningMode: "VIDEO"
    });

    isInitialized = true;
    initializationError = null;
  } catch (error) {
    console.error("Failed to initialize face detector:", error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

/**
 * Detect faces in a video frame.
 * Returns null if detector is not initialized or detection fails.
 */
export const detectFaces = (videoElement: HTMLVideoElement, timestamp: number) => {
  if (!isInitialized || !faceDetector) {
    if (!initializationError) {
      console.warn("Face detector is not initialized.");
    }
    return null;
  }

  try {
    return faceDetector.detectForVideo(videoElement, timestamp);
  } catch (error) {
    console.error("Face detection failed:", error);
    return null;
  }
};

/**
 * Check if face detector is ready for use.
 */
export const isFaceDetectorReady = (): boolean => {
  return isInitialized && faceDetector !== null;
};

/**
 * Get the initialization error if any.
 */
export const getFaceDetectorError = (): Error | null => {
  return initializationError;
};

/**
 * Release resources and reset the face detector.
 * Call this when the service is no longer needed.
 */
export const destroyFaceDetector = (): void => {
  if (faceDetector) {
    faceDetector.close();
    faceDetector = null;
  }
  isInitialized = false;
  initializationError = null;
};
