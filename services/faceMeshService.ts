import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker;
let isInitialized = false;

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
  } catch (error) {
    console.error("Failed to initialize face mesh:", error);
    // Re-throw the error to be caught by the calling component
    throw error;
  }
};

export const detectFaceLandmarks = async (videoElement: HTMLVideoElement, timestamp: number) => {
  if (!isInitialized || !faceLandmarker) {
    console.warn("Face Landmarker is not initialized.");
    return null;
  }
  return await faceLandmarker.detectForVideo(videoElement, timestamp);
};
