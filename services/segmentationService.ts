import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

let imageSegmenter: ImageSegmenter;
let isInitialized = false;

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
  } catch (error) {
    console.error("Failed to initialize segmentation:", error);
    // Re-throw the error to be caught by the calling component
    throw error;
  }
};

export const segment = async (videoElement: HTMLVideoElement, timestamp: number): Promise<any | null> => {
  if (!isInitialized || !imageSegmenter) {
    console.warn("Image segmenter is not initialized.");
    return null;
  }
  
  const result = await imageSegmenter.segmentForVideo(videoElement, timestamp);
  return result?.categoryMask ?? null;
};