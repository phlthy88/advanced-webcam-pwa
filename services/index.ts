/**
 * AI Services barrel export.
 */

// Individual services
export {
  initializeFaceDetector,
  detectFaces,
  isFaceDetectorReady,
  getFaceDetectorError,
  destroyFaceDetector,
} from './faceDetectorService';

export {
  initializeSegmentation,
  segment,
  isSegmentationReady,
  getSegmentationError,
  destroySegmentation,
} from './segmentationService';

export {
  initializeFaceMesh,
  detectFaceLandmarks,
  isFaceMeshReady,
  getFaceMeshError,
  destroyFaceMesh,
} from './faceMeshService';

// Service manager
export {
  initializeAllServices,
  getServicesStatus,
  areAllServicesReady,
  isAnyServiceReady,
  destroyAllServices,
  reinitializeService,
} from './aiServiceManager';

export type {
  AIServiceStatus,
  AIInitializationResult,
  AIServiceName,
  InitializationProgress,
} from './aiServiceManager';
