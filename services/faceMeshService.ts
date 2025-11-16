// This is a simplified version of the MediaPipe types needed for the service
declare global {
  interface Window {
    FaceLandmarker: any;
    FilesetResolver: any;
  }
}

// Re-declaring for module scope
let FaceLandmarker: any;
let FilesetResolver: any;

let faceLandmarker: any;
let isInitialized = false;

export const initializeFaceMesh = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // Wait for the MediaPipe objects to be available on the window
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error("Timeout waiting for MediaPipe objects"));
      }, 10000); // 10 second timeout

      const interval = setInterval(() => {
        if (window.FaceLandmarker && window.FilesetResolver) {
          FaceLandmarker = window.FaceLandmarker;
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

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.tflite`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });

    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize face mesh:", error);
    // Don't throw error, just mark as initialized so the app doesn't stall
    isInitialized = true;
  }
};

export const detectFaceLandmarks = async (videoElement: HTMLVideoElement, timestamp: number) => {
  if (!isInitialized || !faceLandmarker) {
    console.warn("Face Landmarker is not initialized.");
    return null;
  }
  return await faceLandmarker.detectForVideo(videoElement, timestamp);
};
