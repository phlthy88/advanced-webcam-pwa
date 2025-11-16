import React, { useRef, useEffect } from 'react';
import { CameraSettings, FaceDetection, ExtendedMediaTrackCapabilities } from '../types';
import { detectFaces } from '../services/faceDetectorService';
import { segment } from '../services/segmentationService';
import { detectFaceLandmarks } from '../services/faceMeshService';
import { drawConnectors } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';


interface VideoPanelProps {
  stream: MediaStream | null;
  settings: CameraSettings;
  onSettingsChange: (newSettings: Partial<CameraSettings>) => void;
  isHardwareZoom: boolean;
  isFaceTrackingActive: boolean;
  blurMode: 'none' | 'portrait' | 'full';
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

  // AI Segmentation Loop
  useEffect(() => {
    if (!stream || (blurMode === 'none' && !aiBackgroundUrl)) {
        segmentationMaskRef.current = null; // Clear mask if not in use
        return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) return;

    let segmentationFrameId: number;
    const segmentationLoop = async () => {
        if (videoElement.paused || videoElement.ended) {
            segmentationFrameId = setTimeout(segmentationLoop, 100);
            return;
        }

        const mask = await segment(videoElement, videoElement.currentTime * 1000);
        if (mask) {
            segmentationMaskRef.current = mask;
        }
        
        segmentationFrameId = setTimeout(segmentationLoop, 100);
    };

    segmentationLoop();

    return () => {
        clearTimeout(segmentationFrameId);
    };
  }, [stream, blurMode, aiBackgroundUrl]);

  // AI Face Mesh Loop
  useEffect(() => {
    if (!stream || settings.faceSmoothing === 0) {
        faceMeshRef.current = null;
        return;
    }
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let faceMeshFrameId: number;
    const faceMeshLoop = async () => {
        if (videoElement.paused || videoElement.ended) {
            faceMeshFrameId = setTimeout(faceMeshLoop, 100);
            return;
        }
        const results = await detectFaceLandmarks(videoElement, videoElement.currentTime * 1000);
        if (results && results.faceLandmarks.length > 0) {
            faceMeshRef.current = results.faceLandmarks[0];
        } else {
            faceMeshRef.current = null;
        }
        faceMeshFrameId = setTimeout(faceMeshLoop, 100);
    };
    faceMeshLoop();
    return () => {
        clearTimeout(faceMeshFrameId);
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
    const faceDetectionInterval = 100; // ms

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
        tempCanvas.width = videoWidth;
        tempCanvas.height = videoHeight;
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
          offscreenCtx.filter = 'blur(8px)';
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

        // Calculate aspect ratio to preserve it when drawing to display canvas
        const displayAspectRatio = clientWidth / clientHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        let drawWidth = clientWidth;
        let drawHeight = clientHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (displayAspectRatio > videoAspectRatio) {
          drawWidth = clientHeight * videoAspectRatio;
          offsetX = (clientWidth - drawWidth) / 2;
        } else {
          drawHeight = clientWidth / videoAspectRatio;
          offsetY = (clientHeight - drawHeight) / 2;
        }

        displayCtx.drawImage(offscreenCanvas, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        // Calculate aspect ratio to preserve it when drawing to display canvas
        const displayAspectRatio = clientWidth / clientHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        let drawWidth = clientWidth;
        let drawHeight = clientHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (displayAspectRatio > videoAspectRatio) {
          drawWidth = clientHeight * videoAspectRatio;
          offsetX = (clientWidth - drawWidth) / 2;
        } else {
          drawHeight = clientWidth / videoAspectRatio;
          offsetY = (clientHeight - drawHeight) / 2;
        }

        displayCtx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);
      }

      // --- 2. APPLY AI & CREATIVE FILTERS ---
      const baseFilter = getFilter();
      let filterToApply = baseFilter;

      if (settings.faceSmoothing > 0) {
          filterToApply += ` blur(${settings.faceSmoothing / 15}px)`;
      }
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

          // Calculate aspect ratio to properly scale face mesh features
          const displayAspectRatio = clientWidth / clientHeight;
          const videoAspectRatio = videoWidth / videoHeight;

          let drawWidth = clientWidth;
          let drawHeight = clientHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (displayAspectRatio > videoAspectRatio) {
            drawWidth = clientHeight * videoAspectRatio;
            offsetX = (clientWidth - drawWidth) / 2;
          } else {
            drawHeight = clientWidth / videoAspectRatio;
            offsetY = (clientHeight - drawHeight) / 2;
          }

          const scaleX = drawWidth / videoWidth;
          const scaleY = drawHeight / videoHeight;

          // Eyes and mouth clipping path
          displayCtx.beginPath();
          // Left eye
          const leftEye = [130, 133, 160, 159, 158, 144, 145, 153];
          leftEye.forEach((p, i) => {
              const point = landmarks[p];
              if(i === 0) displayCtx.moveTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
              else displayCtx.lineTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
          });
          displayCtx.closePath();
          // Right eye
          const rightEye = [359, 362, 387, 386, 385, 373, 374, 380];
           rightEye.forEach((p, i) => {
              const point = landmarks[p];
              if(i === 0) displayCtx.moveTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
              else displayCtx.lineTo(offsetX + (point.x * drawWidth), offsetY + (point.y * drawHeight));
          });
          displayCtx.closePath();
          // Mouth
          const mouth = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
           mouth.forEach((p, i) => {
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

      // Portrait Lighting
      if (settings.portraitLighting > 0 && faceMeshRef.current) {
          const landmarks = faceMeshRef.current;

          // Calculate aspect ratio to properly scale portrait lighting
          const displayAspectRatio = clientWidth / clientHeight;
          const videoAspectRatio = videoWidth / videoHeight;

          let drawWidth = clientWidth;
          let drawHeight = clientHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (displayAspectRatio > videoAspectRatio) {
            drawWidth = clientHeight * videoAspectRatio;
            offsetX = (clientWidth - drawWidth) / 2;
          } else {
            drawHeight = clientWidth / videoAspectRatio;
            offsetY = (clientHeight - drawHeight) / 2;
          }

          const scaleX = drawWidth / videoWidth;
          const scaleY = drawHeight / videoHeight;

          const nose = landmarks[1];
          const noseX = offsetX + (nose.x * drawWidth);
          const noseY = offsetY + (nose.y * drawHeight);
          const faceWidth = (landmarks[234].x - landmarks[454].x) * drawWidth;

          const gradient = displayCtx.createRadialGradient(
              noseX, noseY, 0,
              noseX, noseY, faceWidth * 1.2
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${settings.portraitLighting / 250})`);
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

        // Calculate aspect ratio to properly apply geometric transforms
        const displayAspectRatio = clientWidth / clientHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        let drawWidth = clientWidth;
        let drawHeight = clientHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (displayAspectRatio > videoAspectRatio) {
          drawWidth = clientHeight * videoAspectRatio;
          offsetX = (clientWidth - drawWidth) / 2;
        } else {
          drawHeight = clientWidth / videoAspectRatio;
          offsetY = (clientHeight - drawHeight) / 2;
        }

        // Draw the current content to temp canvas with proper aspect ratio
        tempCtx.drawImage(displayCanvas, offsetX, offsetY, drawWidth, drawHeight);

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
      

      // --- 4. FACE DETECTION AND OVERLAY ---
      if (isFaceTrackingActive && timestamp > lastFaceDetectionTime + faceDetectionInterval) {
        lastFaceDetectionTime = timestamp;
        const results = detectFaces(videoElement, timestamp * 1000);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (results && results.detections.length > 0) {
            const largestFace = results.detections.sort((a,b) => (b.boundingBox?.width ?? 0) - (a.boundingBox?.width ?? 0))[0];
            const { boundingBox } = largestFace;
            if (boundingBox) {
                overlayCtx.strokeStyle = 'rgba(7, 190, 248, 0.8)';
                overlayCtx.lineWidth = 4;

                // Calculate aspect ratio to properly scale face detection overlay
                const displayAspectRatio = overlayCanvas.width / overlayCanvas.height;
                const videoAspectRatio = videoWidth / videoHeight;

                let drawWidth = overlayCanvas.width;
                let drawHeight = overlayCanvas.height;
                let offsetX = 0;
                let offsetY = 0;

                if (displayAspectRatio > videoAspectRatio) {
                  drawWidth = overlayCanvas.height * videoAspectRatio;
                  offsetX = (overlayCanvas.width - drawWidth) / 2;
                } else {
                  drawHeight = overlayCanvas.width / videoAspectRatio;
                  offsetY = (overlayCanvas.height - drawHeight) / 2;
                }

                const scaleX = drawWidth / videoWidth;
                const scaleY = drawHeight / videoHeight;

                overlayCtx.strokeRect(
                    offsetX + (boundingBox.originX * scaleX),
                    offsetY + (boundingBox.originY * scaleY),
                    boundingBox.width * scaleX,
                    boundingBox.height * scaleY
                );
                
                const SMOOTHING_FACTOR = 0.08;
                const TARGET_FACE_HEIGHT_RATIO = 0.4;
                const PAN_TILT_SENSITIVITY = 0.4;
                
                const targetHeight = videoHeight * TARGET_FACE_HEIGHT_RATIO;
                const heightError = targetHeight - boundingBox.height;
                let targetZoom = settings.zoom + (heightError * 0.1);

                if (isHardwareZoom && capabilities?.zoom) {
                    targetZoom = (settings.zoom / 100) + (heightError * 0.005);
                    targetZoom = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, targetZoom)) * 100;
                } else {
                    targetZoom = Math.max(100, Math.min(400, targetZoom));
                }

                const faceCenterX = boundingBox.originX + boundingBox.width / 2;
                const errorX = faceCenterX - videoWidth / 2;
                let targetPan = settings.pan - (errorX / videoWidth) * 180 * PAN_TILT_SENSITIVITY;
                targetPan = Math.max(-180, Math.min(180, targetPan));

                const faceCenterY = boundingBox.originY + boundingBox.height / 2;
                const errorY = faceCenterY - videoHeight / 2;
                let targetTilt = settings.tilt + (errorY / videoHeight) * 90 * PAN_TILT_SENSITIVITY;
                targetTilt = Math.max(-90, Math.min(90, targetTilt));
                
                onSettingsChange({
                    pan: settings.pan + (targetPan - settings.pan) * SMOOTHING_FACTOR,
                    tilt: settings.tilt + (targetTilt - settings.tilt) * SMOOTHING_FACTOR,
                    zoom: settings.zoom + (targetZoom - settings.zoom) * SMOOTHING_FACTOR,
                });
            }
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
  
  const getFilter = () => {
     let filter = `hue-rotate(${settings.hue}deg) `;
     switch (settings.filter) {
        case 'grayscale': filter += 'grayscale(100%) '; break;
        case 'sepia': filter += 'sepia(100%) '; break;
        case 'invert': filter += 'invert(100%) '; break;
        case 'posterize': filter += 'contrast(250%) saturate(200%) '; break;
        case 'aqua': filter += 'sepia(50%) hue-rotate(180deg) saturate(200%) '; break;
        case 'blackboard': filter += 'contrast(150%) brightness(120%) grayscale(100%) invert(100%) '; break;
        case 'whiteboard': filter += 'contrast(200%) brightness(110%) grayscale(100%) '; break;
    }
    if (blurMode === 'full') {
      filter += `blur(12px) `;
    } else if (settings.blur > 0) {
      filter += `blur(${settings.blur}px) `;
    }
    return filter.trim();
  }

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