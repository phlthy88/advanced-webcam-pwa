declare global {
  interface Window {
    ImageSegmenter: any;
    FilesetResolver: any;
  }
}

let ImageSegmenter: any;
let FilesetResolver: any;

let imageSegmenter: any;
let isInitialized = false;

export const initializeSegmentation = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error("Timeout waiting for MediaPipe objects"));
      }, 10000);

      const interval = setInterval(() => {
        if (window.ImageSegmenter && window.FilesetResolver) {
          ImageSegmenter = window.ImageSegmenter;
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

    imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float16/latest/selfie_multiclass_256x256.tflite',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true,
    });

    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize segmentation:", error);
    // Don't throw error, just mark as initialized so the app doesn't stall
    isInitialized = true;
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