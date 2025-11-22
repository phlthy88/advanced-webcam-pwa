/**
 * AI Models Hook
 * Manages AI model initialization state and provides status information.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeAllServices,
  getServicesStatus,
  destroyAllServices,
  reinitializeService,
  AIServiceStatus,
  AIServiceName,
  InitializationProgress,
} from '../services';
import { useToast } from '../contexts/ToastContext';

interface UseAIModelsReturn {
  /** Whether models are currently initializing */
  isInitializing: boolean;
  /** Whether all models have been initialized (may have failures) */
  isInitialized: boolean;
  /** Current status of all AI services */
  status: AIServiceStatus;
  /** List of initialization errors */
  errors: string[];
  /** Reinitialize a specific service */
  reinitialize: (serviceName: AIServiceName) => Promise<boolean>;
  /** Get human-readable status message */
  getStatusMessage: () => string;
}

const SERVICE_NAMES: Record<AIServiceName, string> = {
  faceDetector: 'Face detector',
  segmentation: 'Segmentation model',
  faceMesh: 'Face mesh model',
};

/**
 * Hook for managing AI model initialization and state.
 */
export const useAIModels = (): UseAIModelsReturn => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<AIServiceStatus>(() => getServicesStatus());
  const [errors, setErrors] = useState<string[]>([]);
  const { addToast } = useToast();
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    const initialize = async () => {
      setIsInitializing(true);

      const handleProgress = (progress: InitializationProgress) => {
        if (progress.status === 'success') {
          addToast(`${SERVICE_NAMES[progress.service]} initialized`, 'info');
        } else if (progress.status === 'error') {
          addToast(
            `Could not load ${SERVICE_NAMES[progress.service]}. Some features may be limited.`,
            'warning'
          );
        }
      };

      try {
        const result = await initializeAllServices(handleProgress);
        setStatus(result.status);
        setErrors(result.errors);
        setIsInitialized(true);

        if (result.errors.length === 0) {
          addToast('All AI models ready', 'success');
        } else if (result.errors.length < 3) {
          addToast('Some AI features may be limited', 'warning');
        } else {
          addToast('AI features unavailable', 'error');
        }
      } catch (err) {
        console.error('Failed to initialize AI models:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrors([message]);
        addToast('Failed to initialize AI models', 'error');
      } finally {
        setIsInitializing(false);
        setIsInitialized(true);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      destroyAllServices();
    };
  }, [addToast]);

  const reinitialize = useCallback(async (serviceName: AIServiceName): Promise<boolean> => {
    addToast(`Reinitializing ${SERVICE_NAMES[serviceName]}...`, 'info');

    const success = await reinitializeService(serviceName);

    if (success) {
      addToast(`${SERVICE_NAMES[serviceName]} reinitialized successfully`, 'success');
      setStatus(getServicesStatus());
      // Remove error for this service
      setErrors((prev) =>
        prev.filter((e) => !e.toLowerCase().includes(serviceName.toLowerCase()))
      );
    } else {
      addToast(`Failed to reinitialize ${SERVICE_NAMES[serviceName]}`, 'error');
    }

    return success;
  }, [addToast]);

  const getStatusMessage = useCallback((): string => {
    const readyCount = [status.faceDetector.ready, status.segmentation.ready, status.faceMesh.ready]
      .filter(Boolean).length;

    if (isInitializing) {
      return 'Initializing AI models...';
    }

    if (readyCount === 3) {
      return 'All AI features ready';
    } else if (readyCount > 0) {
      return `${readyCount}/3 AI models available`;
    } else {
      return 'AI features unavailable';
    }
  }, [isInitializing, status]);

  return {
    isInitializing,
    isInitialized,
    status,
    errors,
    reinitialize,
    getStatusMessage,
  };
};

export default useAIModels;
