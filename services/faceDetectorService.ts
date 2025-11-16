import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceDetector: FaceDetector;
let isInitialized = false;

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
  } catch (error) {
    console.error("Failed to initialize face detector:", error);
    // Re-throw the error to be caught by the calling component
    throw error;
  }
};

export const detectFaces = (videoElement: HTMLVideoElement, timestamp: number) => {
  if (!isInitialized || !faceDetector) {
    console.warn("Face detector is not initialized.");
    return null;
  }
  return faceDetector.detectForVideo(videoElement, timestamp);
};
