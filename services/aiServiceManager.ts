/**
 * AI Service Manager
 * Centralized management for all AI services.
 * Provides unified initialization, status checking, and cleanup.
 */

import {
  initializeFaceDetector,
  isFaceDetectorReady,
  getFaceDetectorError,
  destroyFaceDetector,
} from './faceDetectorService';
import {
  initializeSegmentation,
  isSegmentationReady,
  getSegmentationError,
  destroySegmentation,
} from './segmentationService';
import {
  initializeFaceMesh,
  isFaceMeshReady,
  getFaceMeshError,
  destroyFaceMesh,
} from './faceMeshService';

export interface AIServiceStatus {
  faceDetector: {
    ready: boolean;
    error: Error | null;
  };
  segmentation: {
    ready: boolean;
    error: Error | null;
  };
  faceMesh: {
    ready: boolean;
    error: Error | null;
  };
}

export interface AIInitializationResult {
  success: boolean;
  status: AIServiceStatus;
  errors: string[];
}

export type AIServiceName = 'faceDetector' | 'segmentation' | 'faceMesh';

export interface InitializationProgress {
  service: AIServiceName;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

/**
 * Initialize all AI services with progress callback.
 * Returns detailed status for each service.
 */
export const initializeAllServices = async (
  onProgress?: (progress: InitializationProgress) => void
): Promise<AIInitializationResult> => {
  const errors: string[] = [];

  // Initialize face detector
  onProgress?.({ service: 'faceDetector', status: 'loading' });
  try {
    await initializeFaceDetector();
    onProgress?.({ service: 'faceDetector', status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initialize face detector';
    errors.push(message);
    onProgress?.({ service: 'faceDetector', status: 'error', error: message });
  }

  // Initialize segmentation
  onProgress?.({ service: 'segmentation', status: 'loading' });
  try {
    await initializeSegmentation();
    onProgress?.({ service: 'segmentation', status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initialize segmentation';
    errors.push(message);
    onProgress?.({ service: 'segmentation', status: 'error', error: message });
  }

  // Initialize face mesh
  onProgress?.({ service: 'faceMesh', status: 'loading' });
  try {
    await initializeFaceMesh();
    onProgress?.({ service: 'faceMesh', status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initialize face mesh';
    errors.push(message);
    onProgress?.({ service: 'faceMesh', status: 'error', error: message });
  }

  const status = getServicesStatus();

  return {
    success: errors.length === 0,
    status,
    errors,
  };
};

/**
 * Get current status of all AI services.
 */
export const getServicesStatus = (): AIServiceStatus => ({
  faceDetector: {
    ready: isFaceDetectorReady(),
    error: getFaceDetectorError(),
  },
  segmentation: {
    ready: isSegmentationReady(),
    error: getSegmentationError(),
  },
  faceMesh: {
    ready: isFaceMeshReady(),
    error: getFaceMeshError(),
  },
});

/**
 * Check if all AI services are ready.
 */
export const areAllServicesReady = (): boolean => {
  return isFaceDetectorReady() && isSegmentationReady() && isFaceMeshReady();
};

/**
 * Check if any AI service is ready.
 */
export const isAnyServiceReady = (): boolean => {
  return isFaceDetectorReady() || isSegmentationReady() || isFaceMeshReady();
};

/**
 * Destroy all AI services and release resources.
 * Call this when the app is unmounting or services are no longer needed.
 */
export const destroyAllServices = (): void => {
  destroyFaceDetector();
  destroySegmentation();
  destroyFaceMesh();
};

/**
 * Reinitialize a specific service.
 * Useful for recovery after an error.
 */
export const reinitializeService = async (
  serviceName: AIServiceName
): Promise<boolean> => {
  try {
    switch (serviceName) {
      case 'faceDetector':
        destroyFaceDetector();
        await initializeFaceDetector();
        break;
      case 'segmentation':
        destroySegmentation();
        await initializeSegmentation();
        break;
      case 'faceMesh':
        destroyFaceMesh();
        await initializeFaceMesh();
        break;
    }
    return true;
  } catch (error) {
    console.error(`Failed to reinitialize ${serviceName}:`, error);
    return false;
  }
};
