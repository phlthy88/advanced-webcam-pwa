/**
 * VideoPanel Component
 * Renders the video stream with AI effects, filters, and transformations.
 * Uses modular utilities for better maintainability and fallback protection.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { CameraSettings, ExtendedMediaTrackCapabilities } from '../types';
import { detectFaces, isFaceDetectorReady } from '../services/faceDetectorService';
import { segment, isSegmentationReady } from '../services/segmentationService';
import { detectFaceLandmarks, isFaceMeshReady } from '../services/faceMeshService';
import { getDrawDimensions, setupCanvasDimensions } from '../utils/canvasUtils';
import { buildFilter, BlurMode } from '../utils/filterUtils';
import { FACE_LANDMARKS, TIMING, EFFECTS, FACE_TRACKING } from '../constants';

// Note: These imports are available for future mesh visualization features
// import { drawConnectors } from '@mediapipe/drawing_utils';
// import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';

interface VideoPanelProps {
  stream: MediaStream | null;
  settings: CameraSettings;
  onSettingsChange: (newSettings: Partial<CameraSettings>) => void;
  isHardwareZoom: boolean;
  isFaceTrackingActive: boolean;
  blurMode: BlurMode;
  aiBackgroundUrl: string | null;
  capabilities: ExtendedMediaTrackCapabilities | null;
}

const VideoPanel: React.FC<VideoPanelProps> = ({ stream, settings, onSettingsChange, isHardwareZoom, isFaceTrackingActive, blurMode, aiBackgroundUrl, capabilities }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const segmentationMaskRef = useRef<any>(null);
  const faceMeshRef = useRef<any>(null);

  const renderFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (aiBackgroundUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        backgroundImageRef.current = img;
      };
      img.src = aiBackgroundUrl;
    } else {
      backgroundImageRef.current = null;
    }
  }, [aiBackgroundUrl]);

  // AI Segmentation Loop with fallback protection
  useEffect(() => {
    if (!stream || (blurMode === 'none' && !aiBackgroundUrl)) {
      segmentationMaskRef.current = null;
      return;
    }

    // Fallback: Skip if service not ready
    if (!isSegmentationReady()) {
      console.warn('Segmentation service not ready, skipping segmentation');
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    let segmentationTimeoutId: ReturnType<typeof setTimeout>;
    let isActive = true;

    const segmentationLoop = async () => {
      if (!isActive) return;

      if (videoElement.paused || videoElement.ended) {
        segmentationTimeoutId = setTimeout(segmentationLoop, TIMING.SEGMENTATION_INTERVAL_MS);
        return;
      }

      try {
        const mask = await segment(videoElement, videoElement.currentTime * 1000);
        if (mask && isActive) {
          segmentationMaskRef.current = mask;
        }
      } catch (error) {
        console.error('Segmentation error:', error);
      }

      if (isActive) {
        segmentationTimeoutId = setTimeout(segmentationLoop, TIMING.SEGMENTATION_INTERVAL_MS);
      }
    };

    segmentationLoop();

    return () => {
      isActive = false;
      clearTimeout(segmentationTimeoutId);
    };
  }, [stream, blurMode, aiBackgroundUrl]);

  // AI Face Mesh Loop with fallback protection
  useEffect(() => {
    if (!stream || settings.faceSmoothing === 0) {
      faceMeshRef.current = null;
      return;
    }

    // Fallback: Skip if service not ready
    if (!isFaceMeshReady()) {
      console.warn('Face mesh service not ready, skipping face smoothing');
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    let faceMeshTimeoutId: ReturnType<typeof setTimeout>;
    let isActive = true;

    const faceMeshLoop = async () => {
      if (!isActive) return;

      if (videoElement.paused || videoElement.ended) {
        faceMeshTimeoutId = setTimeout(faceMeshLoop, TIMING.FACE_MESH_INTERVAL_MS);
        return;
      }

      try {
        const results = await detectFaceLandmarks(videoElement, videoElement.currentTime * 1000);
        if (isActive) {
          if (results && results.faceLandmarks.length > 0) {
            faceMeshRef.current = results.faceLandmarks[0];
          } else {
            faceMeshRef.current = null;
          }
        }
      } catch (error) {
        console.error('Face mesh error:', error);
      }

      if (isActive) {
        faceMeshTimeoutId = setTimeout(faceMeshLoop, TIMING.FACE_MESH_INTERVAL_MS);
      }
    };

    faceMeshLoop();

    return () => {
      isActive = false;
      clearTimeout(faceMeshTimeoutId);
    };
  }, [stream, settings.faceSmoothing]);


  // Main Render Loop
  useEffect(() => {
    const videoElement = videoRef.current;
    const displayCanvas = displayCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;
    const tempCanvas = tempCanvasRef.current;

    if (!videoElement || !displayCanvas || !overlayCanvas || !offscreenCanvas || !tempCanvas || !stream) return;
    
    const displayCtx = displayCanvas.getContext('2d');
    const offscreenCtx = offscreenCanvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!displayCtx || !offscreenCtx || !overlayCtx) return;

    let lastFaceDetectionTime = 0;

    const renderFrame = async () => {
      if (videoElement.paused || videoElement.ended || videoElement.videoWidth === 0) {
        renderFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      
      const { clientWidth, clientHeight } = displayCanvas;

      if (displayCanvas.width !== clientWidth || displayCanvas.height !== clientHeight) {
        displayCanvas.width = clientWidth;
        displayCanvas.height = clientHeight;
        overlayCanvas.width = clientWidth;
        overlayCanvas.height = clientHeight;
        offscreenCanvas.width = videoWidth;
        offscreenCanvas.height = videoHeight;
        tempCanvas.width = clientWidth;
        tempCanvas.height = clientHeight;
      }
      
      const timestamp = videoElement.currentTime;
      const needsSegmentation = blurMode === 'portrait' || !!aiBackgroundUrl;

      displayCtx.save();
      displayCtx.clearRect(0, 0, clientWidth, clientHeight);
      
      // --- 1. DRAW BASE IMAGE (VIDEO OR SEGMENTED) ---
      if (needsSegmentation && segmentationMaskRef.current) {
        const segmentationMask = segmentationMaskRef.current;
        offscreenCtx.clearRect(0, 0, videoWidth, videoHeight);

        if (backgroundImageRef.current) {
          offscreenCtx.drawImage(backgroundImageRef.current, 0, 0, videoWidth, videoHeight);
        } else if (blurMode === 'portrait') {
          offscreenCtx.save();
          offscreenCtx.filter = `blur(${EFFECTS.PORTRAIT_BLUR_AMOUNT}px)`;
          offscreenCtx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
          offscreenCtx.restore();
        }

        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.clearRect(0, 0, videoWidth, videoHeight);
            tempCtx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
            tempCtx.globalCompositeOperation = 'destination-in';
            tempCtx.drawImage(segmentationMask, 0, 0, videoWidth, videoHeight);
            tempCtx.globalCompositeOperation = 'source-over';
            offscreenCtx.drawImage(tempCanvas, 0, 0, videoWidth, videoHeight);
        }

        const { drawWidth, drawHeight, offsetX, offsetY } = getDrawDimensions(videoWidth, videoHeight, clientWidth, clientHeight);

        displayCtx.drawImage(offscreenCanvas, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        const { drawWidth, drawHeight, offsetX, offsetY } = getDrawDimensions(videoWidth, videoHeight, clientWidth, clientHeight);
        displayCtx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);
      }

      // --- 2. APPLY AI & CREATIVE FILTERS ---
      const filterToApply = settings.faceSmoothing > 0
        ? getFilterWithSmoothing()
        : getFilter();
      displayCtx.filter = filterToApply;
      
      // Redraw the blurred image on top of the original
      if (settings.faceSmoothing > 0) {
          displayCtx.drawImage(displayCanvas, 0, 0, clientWidth, clientHeight);
      }

      // Un-blur the eyes and mouth
      if (settings.faceSmoothing > 0 && faceMeshRef.current) {
          displayCtx.save();
          displayCtx.filter = 'none'; // Remove blur for drawing sharp features

          const landmarks = faceMeshRef.current;

          const { drawWidth, drawHeight, offsetX, offsetY } = getDrawDimensions(videoWidth, videoHeight, clientWidth, clientHeight);

          const scaleX = drawWidth / videoWidth;
          const scaleY = drawHeight / videoHeight;

          // Eyes and mouth clipping path using constants
          displayCtx.beginPath();
          // Left eye
          FACE_LANDMARKS.LEFT_EYE.forEach((p, i) => {
              const point = landmarks[p];
              if(i === 0) displayCtx.moveTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
              else displayCtx.lineTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
          });
          displayCtx.closePath();
          // Right eye
          FACE_LANDMARKS.RIGHT_EYE.forEach((p, i) => {
              const point = landmarks[p];
              if(i === 0) displayCtx.moveTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
              else displayCtx.lineTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
          });
          displayCtx.closePath();
          // Mouth
          FACE_LANDMARKS.MOUTH.forEach((p, i) => {
              const point = landmarks[p];
              if(i === 0) displayCtx.moveTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
              else displayCtx.lineTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
          });
          displayCtx.closePath();

          displayCtx.clip();

          // Draw the original, sharp video inside the clipped area with proper aspect ratio
          displayCtx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);
          displayCtx.restore();
      }

      // Portrait Lighting using face landmark constants
      if (settings.portraitLighting > 0 && faceMeshRef.current) {
          const landmarks = faceMeshRef.current;

          const { drawWidth, drawHeight, offsetX, offsetY } = getDrawDimensions(videoWidth, videoHeight, clientWidth, clientHeight);

          const nose = landmarks[FACE_LANDMARKS.NOSE_TIP];
          const noseX = offsetX + (nose.x * drawWidth);
          const noseY = offsetY + (nose.y * drawHeight);
          const leftEdge = landmarks[FACE_LANDMARKS.LEFT_FACE_EDGE];
          const rightEdge = landmarks[FACE_LANDMARKS.RIGHT_FACE_EDGE];
          const faceWidth = (leftEdge.x - rightEdge.x) * drawWidth;

          const gradient = displayCtx.createRadialGradient(
              noseX, noseY, 0,
              noseX, noseY, faceWidth * EFFECTS.PORTRAIT_LIGHTING_RADIUS_MULTIPLIER
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${settings.portraitLighting / EFFECTS.PORTRAIT_LIGHTING_DIVISOR})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          displayCtx.fillStyle = gradient;
          displayCtx.globalCompositeOperation = 'soft-light';
          displayCtx.fillRect(0, 0, clientWidth, clientHeight);
          displayCtx.globalCompositeOperation = 'source-over';
      }


      // --- 3. APPLY GEOMETRIC TRANSFORMS ---
      displayCtx.filter = 'none'; // Reset filter before transforms
      const tempCtx = tempCanvas.getContext('2d');
      if(tempCtx) {
        tempCtx.clearRect(0,0,clientWidth, clientHeight);

        // FIX: Draw the *entire* current canvas to the temp canvas, not just the aspect-ratio-corrected part.
        // This prevents a "shrinking" effect during transformations.
        tempCtx.drawImage(displayCanvas, 0, 0, clientWidth, clientHeight);

        displayCtx.clearRect(0, 0, clientWidth, clientHeight);
        displayCtx.translate(clientWidth / 2, clientHeight / 2);
        displayCtx.scale(settings.mirrorH ? -1 : 1, settings.mirrorV ? -1 : 1);
        displayCtx.rotate(settings.rotation * Math.PI / 180);
        if (!isHardwareZoom && settings.zoom > 100) {
          const zoomScale = settings.zoom / 100;
          // Adjust pan/tilt based on the actual drawn area dimensions
          const panX = (settings.pan / 180) * (drawWidth / zoomScale);
          const tiltY = (settings.tilt / 90) * (drawHeight / zoomScale);
          displayCtx.scale(zoomScale, zoomScale);
          displayCtx.translate(-panX, tiltY);
        }
        displayCtx.translate(-clientWidth / 2, -clientHeight / 2);
        displayCtx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
      }
      displayCtx.restore();
      

      // --- 4. FACE DETECTION AND OVERLAY with fallback protection ---
      const faceDetectionIntervalSec = TIMING.FACE_DETECTION_INTERVAL_MS / 1000;
      if (isFaceTrackingActive && isFaceDetectorReady() && timestamp > lastFaceDetectionTime + faceDetectionIntervalSec) {
        lastFaceDetectionTime = timestamp;

        try {
          const results = detectFaces(videoElement, timestamp * 1000);
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

          if (results && results.detections.length > 0) {
              const largestFace = results.detections.sort((a: any, b: any) => (b.boundingBox?.width ?? 0) - (a.boundingBox?.width ?? 0))[0];
              const { boundingBox } = largestFace;
              if (boundingBox) {
                  overlayCtx.strokeStyle = 'rgba(7, 190, 248, 0.8)';
                  overlayCtx.lineWidth = 4;

                  const overlayDims = getDrawDimensions(videoWidth, videoHeight, overlayCanvas.width, overlayCanvas.height);
                  const scaleX = overlayDims.drawWidth / videoWidth;
                  const scaleY = overlayDims.drawHeight / videoHeight;

                  overlayCtx.strokeRect(
                      overlayDims.offsetX + (boundingBox.originX * scaleX),
                      overlayDims.offsetY + (boundingBox.originY * scaleY),
                      boundingBox.width * scaleX,
                      boundingBox.height * scaleY
                  );

                  // Use face tracking constants for calculations
                  const targetHeight = videoHeight * FACE_TRACKING.TARGET_FACE_HEIGHT_RATIO;
                  const heightError = targetHeight - boundingBox.height;
                  let targetZoom = settings.zoom + (heightError * FACE_TRACKING.ZOOM_ADJUSTMENT_FACTOR);

                  if (isHardwareZoom && capabilities?.zoom) {
                      targetZoom = (settings.zoom / 100) + (heightError * FACE_TRACKING.HARDWARE_ZOOM_ADJUSTMENT_FACTOR);
                      targetZoom = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, targetZoom)) * 100;
                  } else {
                      targetZoom = Math.max(FACE_TRACKING.MIN_ZOOM, Math.min(FACE_TRACKING.MAX_ZOOM, targetZoom));
                  }

                  const faceCenterX = boundingBox.originX + boundingBox.width / 2;
                  const errorX = faceCenterX - videoWidth / 2;
                  let targetPan = settings.pan - (errorX / videoWidth) * 180 * FACE_TRACKING.PAN_TILT_SENSITIVITY;
                  targetPan = Math.max(FACE_TRACKING.PAN_MIN, Math.min(FACE_TRACKING.PAN_MAX, targetPan));

                  const faceCenterY = boundingBox.originY + boundingBox.height / 2;
                  const errorY = faceCenterY - videoHeight / 2;
                  let targetTilt = settings.tilt + (errorY / videoHeight) * 90 * FACE_TRACKING.PAN_TILT_SENSITIVITY;
                  targetTilt = Math.max(FACE_TRACKING.TILT_MIN, Math.min(FACE_TRACKING.TILT_MAX, targetTilt));

                  onSettingsChange({
                      pan: settings.pan + (targetPan - settings.pan) * FACE_TRACKING.SMOOTHING_FACTOR,
                      tilt: settings.tilt + (targetTilt - settings.tilt) * FACE_TRACKING.SMOOTHING_FACTOR,
                      zoom: settings.zoom + (targetZoom - settings.zoom) * FACE_TRACKING.SMOOTHING_FACTOR,
                  });
              }
          }
        } catch (error) {
          console.error('Face detection error:', error);
        }
      } else if (!isFaceTrackingActive) {
          overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }

      renderFrameRef.current = requestAnimationFrame(renderFrame);
    };
    
    renderFrame();

    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
    };
  }, [stream, settings, isHardwareZoom, isFaceTrackingActive, onSettingsChange, blurMode, aiBackgroundUrl, capabilities]);


  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };
  
  // Use modular filter utility for filter generation
  const getFilter = useCallback(() => {
    return buildFilter(settings, blurMode);
  }, [settings, blurMode]);

  // Build filter with face smoothing
  const getFilterWithSmoothing = useCallback(() => {
    const baseFilter = buildFilter(settings, blurMode);
    if (settings.faceSmoothing > 0) {
      const smoothBlur = settings.faceSmoothing / EFFECTS.FACE_SMOOTHING_DIVISOR;
      return baseFilter === 'none' ? `blur(${smoothBlur}px)` : `${baseFilter} blur(${smoothBlur}px)`;
    }
    return baseFilter;
  }, [settings, blurMode]);

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="relative group bg-black rounded-lg shadow-lg overflow-hidden aspect-video border border-gray-200 dark:border-gray-700">
        <video ref={videoRef} autoPlay playsInline muted className="hidden"></video>
        <canvas ref={offscreenCanvasRef} className="hidden"></canvas>
        <canvas ref={tempCanvasRef} className="hidden"></canvas>
        <canvas ref={displayCanvasRef} className="w-full h-full object-contain" />
        <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={toggleFullscreen} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/75" title="Fullscreen (F)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onSettingsChange({ mirrorH: !settings.mirrorH })} className={`p-2 rounded-md flex items-center justify-center gap-2 text-sm ${settings.mirrorH ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`} title="Mirror (M)">
          Mirror
        </button>
        <button onClick={() => onSettingsChange({ mirrorV: !settings.mirrorV })} className={`p-2 rounded-md flex items-center justify-center gap-2 text-sm ${settings.mirrorV ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`} title="Flip Vertical">
          Flip V
        </button>
        <button onClick={() => onSettingsChange({ rotation: (settings.rotation + 90) % 360 })} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center gap-2 text-sm" title="Rotate 90°">
          Rotate 90°
        </button>
      </div>
    </div>
  );
};

export default VideoPanel;