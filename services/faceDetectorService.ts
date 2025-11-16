// This is a simplified version of the MediaPipe types needed for the service
// In a real project, you might use a community-provided types package
declare global {
  interface Window {
    FaceDetector: any;
    FilesetResolver: any;
  }
}

// Re-declaring for module scope
let FaceDetector: any;
let FilesetResolver: any;

let faceDetector: any;
let isInitialized = false;

export const initializeFaceDetector = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // Wait for the MediaPipe objects to be available on the window
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error("Timeout waiting for MediaPipe objects"));
      }, 10000); // 10 second timeout

      const interval = setInterval(() => {
        if (window.FaceDetector && window.FilesetResolver) {
          FaceDetector = window.FaceDetector;
          FilesetResolver = window.FilesetResolver;
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
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
    // Don't throw error, just mark as initialized so the app doesn't stall
    isInitialized = true;
  }
};

export const detectFaces = (videoElement: HTMLVideoElement, timestamp: number) => {
  if (!isInitialized || !faceDetector) {
    console.warn("Face detector is not initialized.");
    return null;
  }
  return faceDetector.detectForVideo(videoElement, timestamp);
};
