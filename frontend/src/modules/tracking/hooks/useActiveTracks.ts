import { useState, useEffect, useCallback, useRef } from 'react';
import { trackingService } from '../services/tracking.service';
import type { TrackedObjectItem } from '../types/tracking';

interface UseActiveTracksOptions {
  cameraId: string | null;
  enabled?: boolean;
  pollIntervalMs?: number;
}

interface UseActiveTracksReturn {
  tracks: TrackedObjectItem[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useActiveTracks = ({
  cameraId,
  enabled = true,
  pollIntervalMs = 1500,
}: UseActiveTracksOptions): UseActiveTracksReturn => {
  const [tracks, setTracks] = useState<TrackedObjectItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  const fetchTracks = useCallback(async () => {
    if (!cameraId || !enabled) {
      setTracks([]);
      setSessionId(null);
      return;
    }

    try {
      // First try runtime tracks endpoint (direct from AI session telemetry)
      const res = await trackingService.getRuntimeTracks(cameraId);
      if (!isMountedRef.current) return;

      if (res && Array.isArray(res.activeTracks)) {
        setTracks(res.activeTracks);
        setSessionId(res.sessionId || null);
        setError(null);
      } else {
        // Fallback to active tracks from DB
        const dbRes = await trackingService.getActiveTracks(cameraId);
        if (!isMountedRef.current) return;
        setTracks(dbRes.activeTracks || []);
        setSessionId(dbRes.sessionId || null);
        setError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      // If runtime is not available yet, silently try DB
      try {
        const dbRes = await trackingService.getActiveTracks(cameraId);
        if (!isMountedRef.current) return;
        setTracks(dbRes.activeTracks || []);
        setSessionId(dbRes.sessionId || null);
        setError(null);
      } catch (dbErr: any) {
        if (!isMountedRef.current) return;
        setError(dbErr.message || 'Failed to fetch tracks');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cameraId, enabled]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!cameraId || !enabled) {
      setTracks([]);
      setSessionId(null);
      return () => {
        isMountedRef.current = false;
      };
    }

    setIsLoading(true);
    fetchTracks();

    const interval = setInterval(fetchTracks, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [cameraId, enabled, pollIntervalMs, fetchTracks]);

  return {
    tracks,
    sessionId,
    isLoading,
    error,
    refresh: fetchTracks,
  };
};
