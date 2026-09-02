import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsService } from '../services/analytics.service';
import type { AISessionStatus } from '../types/analytics';

interface UseAISessionProps {
  cameraId: string | null;
  onCapacityError?: (message: string) => void;
}

export function useAISession({ cameraId, onCapacityError }: UseAISessionProps) {
  const [status, setStatus] = useState<AISessionStatus>('STOPPED');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionsCount, setDetectionsCount] = useState<number>(0);
  const [approxFps, setApproxFps] = useState<number>(0);

  const isMounted = useRef<boolean>(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Poll status when session is active
  useEffect(() => {
    if (!cameraId || (status !== 'RUNNING' && status !== 'STARTING')) return;

    const interval = setInterval(async () => {
      try {
        const session = await analyticsService.getAISession(cameraId);
        if (isMounted.current) {
          setStatus(session.status);
          setDetectionsCount(session.detectionsCount || 0);
          setApproxFps(session.approxFps || 0);
          if (session.error) setError(session.error);
        }
      } catch {
        // Ignore transient network errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [cameraId, status]);

  const startAI = useCallback(async () => {
    if (!cameraId) return;
    setIsLoading(true);
    setError(null);
    setStatus('STARTING');

    try {
      const session = await analyticsService.startAISession(cameraId);
      if (isMounted.current) {
        setStatus(session.status);
        setDetectionsCount(session.detectionsCount || 0);
        setApproxFps(session.approxFps || 0);
      }
    } catch (err: any) {
      if (isMounted.current) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to start AI session';

        setStatus('ERROR');
        setError(errorMsg);

        if (
          err?.response?.status === 429 ||
          errorMsg.toLowerCase().includes('capacity')
        ) {
          onCapacityError?.(
            errorMsg ||
              'AI capacity reached. Stop an existing AI session before starting another.',
          );
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cameraId, onCapacityError]);

  const stopAI = useCallback(async () => {
    if (!cameraId) return;
    setIsLoading(true);
    setStatus('STOPPING');

    try {
      const session = await analyticsService.stopAISession(cameraId);
      if (isMounted.current) {
        setStatus(session.status);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setStatus('STOPPED');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cameraId]);

  return {
    status,
    isLoading,
    error,
    detectionsCount,
    approxFps,
    startAI,
    stopAI,
  };
}
