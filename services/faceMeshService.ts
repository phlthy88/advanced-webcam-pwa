/**
 * Face Mesh Service
 * Provides face landmark detection using MediaPipe FaceLandmarker.
 * Used for face smoothing and portrait lighting effects.
 */

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

/**
 * Initialize the face mesh model.
 * Safe to call multiple times - will only initialize once.
 */
export const initializeFaceMesh = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });

    isInitialized = true;
    initializationError = null;
  } catch (error) {
    console.error("Failed to initialize face mesh:", error);
    initializationError = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

/**
 * Detect face landmarks in a video frame.
 * Returns null if detector is not initialized or detection fails.
 */
export const detectFaceLandmarks = async (
  videoElement: HTMLVideoElement,
  timestamp: number
) => {
  if (!isInitialized || !faceLandmarker) {
    if (!initializationError) {
      console.warn("Face Landmarker is not initialized.");
    }
    return null;
  }

  try {
    return await faceLandmarker.detectForVideo(videoElement, timestamp);
  } catch (error) {
    console.error("Face landmark detection failed:", error);
    return null;
  }
};

/**
 * Check if face mesh is ready for use.
 */
export const isFaceMeshReady = (): boolean => {
  return isInitialized && faceLandmarker !== null;
};

/**
 * Get the initialization error if any.
 */
export const getFaceMeshError = (): Error | null => {
  return initializationError;
};

/**
 * Release resources and reset the face mesh model.
 * Call this when the service is no longer needed.
 */
export const destroyFaceMesh = (): void => {
  if (faceLandmarker) {
    faceLandmarker.close();
    faceLandmarker = null;
  }
  isInitialized = false;
  initializationError = null;
};
