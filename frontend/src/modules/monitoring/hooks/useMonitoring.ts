import { useState, useEffect, useCallback, useRef } from 'react';
import type { Camera } from '../../../types/camera';
import type { LayoutMode, MonitoringSlot, MonitoringStats } from '../types/monitoring';
import { streamService } from '../../../services/stream.service';

export const MAX_CONCURRENT_STREAMS = 4;

export const LAYOUT_CONFIGS: Record<LayoutMode, { slotsCount: number; rows: number; cols: number; label: string }> = {
  '1x1': { slotsCount: 1, rows: 1, cols: 1, label: 'Single (1x1)' },
  '2x2': { slotsCount: 4, rows: 2, cols: 2, label: 'Quad (2x2)' },
  '2x3': { slotsCount: 6, rows: 2, cols: 3, label: 'Hex (2x3)' },
  '3x3': { slotsCount: 9, rows: 3, cols: 3, label: 'Nine (3x3)' },
};

function createInitialSlots(count: number): MonitoringSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    slotId: `slot-${index}`,
    camera: null,
    streamStatus: 'STOPPED',
    playbackUrl: null,
    isLoading: false,
    error: null,
    lastStartedAt: null,
  }));
}

export function useMonitoring(initialLayout: LayoutMode = '2x2') {
  const [layout, setLayoutState] = useState<LayoutMode>(initialLayout);
  const [slots, setSlots] = useState<MonitoringSlot[]>(() =>
    createInitialSlots(LAYOUT_CONFIGS[initialLayout].slotsCount),
  );
  const [concurrencyWarning, setConcurrencyWarning] = useState<string | null>(null);

  // Keep ref of slots for unmount cleanup
  const slotsRef = useRef<MonitoringSlot[]>(slots);
  slotsRef.current = slots;

  // Active running streams count
  const runningCount = slots.filter(
    (s) => s.streamStatus === 'RUNNING' || s.streamStatus === 'STARTING',
  ).length;

  const stats: MonitoringStats = {
    totalSlots: slots.length,
    assignedCount: slots.filter((s) => s.camera !== null).length,
    runningStreams: slots.filter((s) => s.streamStatus === 'RUNNING').length,
    stoppedStreams: slots.filter((s) => s.camera !== null && s.streamStatus === 'STOPPED').length,
    errorStreams: slots.filter((s) => s.streamStatus === 'ERROR').length,
    maxConcurrentStreams: MAX_CONCURRENT_STREAMS,
  };

  // Switch layout while preserving existing camera slots
  const changeLayout = useCallback((newLayout: LayoutMode) => {
    setLayoutState(newLayout);
    const newCount = LAYOUT_CONFIGS[newLayout].slotsCount;

    setSlots((prevSlots) => {
      if (prevSlots.length === newCount) return prevSlots;

      if (prevSlots.length < newCount) {
        // Expand: preserve existing and add empty slots
        const additionalSlots = Array.from(
          { length: newCount - prevSlots.length },
          (_, index) => ({
            slotId: `slot-${prevSlots.length + index}`,
            camera: null,
            streamStatus: 'STOPPED' as const,
            playbackUrl: null,
            isLoading: false,
            error: null,
            lastStartedAt: null,
          }),
        );
        return [...prevSlots, ...additionalSlots];
      } else {
        // Shrink: keep the first newCount slots; stop overflowing active streams
        const retainedSlots = prevSlots.slice(0, newCount);
        const overflowing = prevSlots.slice(newCount);
        overflowing.forEach((slot) => {
          if (slot.camera && (slot.streamStatus === 'RUNNING' || slot.streamStatus === 'STARTING')) {
            streamService.stopStream(slot.camera.id).catch(() => {});
          }
        });
        return retainedSlots;
      }
    });
  }, []);

  // Assign camera to a slot (with duplicate prevention)
  const assignCamera = useCallback((slotId: string, camera: Camera): boolean => {
    // Check if camera is already assigned to any slot
    const alreadyAssigned = slotsRef.current.some(
      (s) => s.camera?.id === camera.id,
    );
    if (alreadyAssigned) {
      setConcurrencyWarning(`Camera '${camera.cameraCode}' is already present in another monitoring slot.`);
      return false;
    }

    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== slotId) return slot;

        // If replacing an active stream, stop old stream
        if (slot.camera && (slot.streamStatus === 'RUNNING' || slot.streamStatus === 'STARTING')) {
          streamService.stopStream(slot.camera.id).catch(() => {});
        }

        return {
          ...slot,
          camera,
          streamStatus: 'STOPPED',
          playbackUrl: null,
          isLoading: false,
          error: null,
          lastStartedAt: null,
        };
      }),
    );
    setConcurrencyWarning(null);
    return true;
  }, []);

  // Remove camera from slot
  const removeCamera = useCallback((slotId: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.slotId !== slotId) return slot;

        // Stop stream if running
        if (slot.camera && (slot.streamStatus === 'RUNNING' || slot.streamStatus === 'STARTING')) {
          streamService.stopStream(slot.camera.id).catch(() => {});
        }

        return {
          ...slot,
          camera: null,
          streamStatus: 'STOPPED',
          playbackUrl: null,
          isLoading: false,
          error: null,
          lastStartedAt: null,
        };
      }),
    );
  }, []);

  // Clear all slots
  const clearAll = useCallback(() => {
    slotsRef.current.forEach((slot) => {
      if (slot.camera && (slot.streamStatus === 'RUNNING' || slot.streamStatus === 'STARTING')) {
        streamService.stopStream(slot.camera.id).catch(() => {});
      }
    });
    setSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        camera: null,
        streamStatus: 'STOPPED',
        playbackUrl: null,
        isLoading: false,
        error: null,
        lastStartedAt: null,
      })),
    );
    setConcurrencyWarning(null);
  }, []);

  // Start stream on specific slot
  const startStream = useCallback(async (slotId: string) => {
    const targetSlot = slotsRef.current.find((s) => s.slotId === slotId);
    if (!targetSlot || !targetSlot.camera) return;

    if (targetSlot.streamStatus === 'RUNNING' || targetSlot.streamStatus === 'STARTING') {
      return; // Already active
    }

    // Check concurrency limit
    const currentActive = slotsRef.current.filter(
      (s) => s.slotId !== slotId && (s.streamStatus === 'RUNNING' || s.streamStatus === 'STARTING'),
    ).length;

    if (currentActive >= MAX_CONCURRENT_STREAMS) {
      setConcurrencyWarning(
        `Maximum concurrent stream limit (${MAX_CONCURRENT_STREAMS}) reached. Stop an active stream before starting another.`,
      );
      return;
    }

    setConcurrencyWarning(null);

    // Set loading/starting
    setSlots((prev) =>
      prev.map((s) =>
        s.slotId === slotId ? { ...s, isLoading: true, streamStatus: 'STARTING', error: null } : s,
      ),
    );

    try {
      const streamData = await streamService.startStream(targetSlot.camera.id);

      // Await initial HLS playlist generation so VideoPlayer gets 200 OK
      if (streamData.playbackUrl) {
        for (let attempt = 0; attempt < 12; attempt++) {
          try {
            const check = await fetch(streamData.playbackUrl, { method: 'HEAD' });
            if (check.ok) break;
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                isLoading: false,
                streamStatus: streamData.status,
                playbackUrl: streamData.playbackUrl,
                lastStartedAt: streamData.startedAt || new Date().toISOString(),
                error: null,
              }
            : s,
        ),
      );
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Failed to start video stream';
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                isLoading: false,
                streamStatus: 'ERROR',
                error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
              }
            : s,
        ),
      );
    }
  }, []);

  // Stop stream on specific slot
  const stopStream = useCallback(async (slotId: string) => {
    const targetSlot = slotsRef.current.find((s) => s.slotId === slotId);
    if (!targetSlot || !targetSlot.camera) return;

    setSlots((prev) =>
      prev.map((s) =>
        s.slotId === slotId ? { ...s, isLoading: true, streamStatus: 'STOPPING' } : s,
      ),
    );

    try {
      await streamService.stopStream(targetSlot.camera.id);
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                isLoading: false,
                streamStatus: 'STOPPED',
                playbackUrl: null,
                error: null,
              }
            : s,
        ),
      );
    } catch (err: any) {
      // Even on error, mark stopped on client side
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? { ...s, isLoading: false, streamStatus: 'STOPPED', playbackUrl: null }
            : s,
        ),
      );
    }
  }, []);

  // Restart stream (Admin / Supervisor)
  const restartStream = useCallback(async (slotId: string) => {
    const targetSlot = slotsRef.current.find((s) => s.slotId === slotId);
    if (!targetSlot || !targetSlot.camera) return;

    setSlots((prev) =>
      prev.map((s) =>
        s.slotId === slotId ? { ...s, isLoading: true, streamStatus: 'STARTING', error: null } : s,
      ),
    );

    try {
      const streamData = await streamService.restartStream(targetSlot.camera.id);
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                isLoading: false,
                streamStatus: streamData.status,
                playbackUrl: streamData.playbackUrl,
                error: null,
              }
            : s,
        ),
      );
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Failed to restart stream';
      setSlots((prev) =>
        prev.map((s) =>
          s.slotId === slotId
            ? {
                ...s,
                isLoading: false,
                streamStatus: 'ERROR',
                error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
              }
            : s,
        ),
      );
    }
  }, []);

  // Retry failed stream
  const retryStream = useCallback(async (slotId: string) => {
    const targetSlot = slotsRef.current.find((s) => s.slotId === slotId);
    if (!targetSlot || !targetSlot.camera) return;

    try {
      await streamService.stopStream(targetSlot.camera.id).catch(() => {});
    } catch {}

    await startStream(slotId);
  }, [startStream]);

  // Start all assigned cameras up to MAX_CONCURRENT_STREAMS
  const startAllVisible = useCallback(async () => {
    const availableSlots = slotsRef.current.filter(
      (s) => s.camera !== null && s.streamStatus !== 'RUNNING' && s.streamStatus !== 'STARTING',
    );

    const activeCount = slotsRef.current.filter(
      (s) => s.streamStatus === 'RUNNING' || s.streamStatus === 'STARTING',
    ).length;

    const slotsToStart = availableSlots.slice(0, MAX_CONCURRENT_STREAMS - activeCount);

    if (slotsToStart.length === 0 && availableSlots.length > 0) {
      setConcurrencyWarning(
        `Cannot start all cameras. Maximum limit of ${MAX_CONCURRENT_STREAMS} active streams reached.`,
      );
      return;
    }

    if (availableSlots.length > slotsToStart.length) {
      setConcurrencyWarning(
        `Started ${slotsToStart.length} camera(s). Concurrency limit capped at ${MAX_CONCURRENT_STREAMS}.`,
      );
    } else {
      setConcurrencyWarning(null);
    }

    await Promise.all(slotsToStart.map((slot) => startStream(slot.slotId)));
  }, [startStream]);

  // Stop all active streams
  const stopAll = useCallback(async () => {
    const activeSlots = slotsRef.current.filter(
      (s) => s.camera !== null && (s.streamStatus === 'RUNNING' || s.streamStatus === 'STARTING'),
    );
    for (const slot of activeSlots) {
      await stopStream(slot.slotId);
    }
    setConcurrencyWarning(null);
  }, [stopStream]);

  // Centralized stream status polling (every 3 seconds for active streams)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const activeSlots = slotsRef.current.filter(
        (s) => s.camera !== null && (s.streamStatus === 'RUNNING' || s.streamStatus === 'STARTING'),
      );

      if (activeSlots.length === 0) return;

      for (const slot of activeSlots) {
        if (!slot.camera) continue;
        try {
          const status = await streamService.getStreamStatus(slot.camera.id);
          setSlots((prev) =>
            prev.map((s) => {
              if (s.slotId !== slot.slotId) return s;
              return {
                ...s,
                streamStatus: status.status,
                error: status.status === 'ERROR' ? 'Stream error detected during playback' : s.error,
              };
            }),
          );
        } catch {
          // Ignore transient polling network errors
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  // Cleanup on unmount: stop all active streams to prevent orphan FFmpeg processes
  useEffect(() => {
    return () => {
      const active = slotsRef.current.filter(
        (s) => s.camera !== null && (s.streamStatus === 'RUNNING' || s.streamStatus === 'STARTING'),
      );
      Promise.all(
        active.map((slot) => (slot.camera ? streamService.stopStream(slot.camera.id) : Promise.resolve())),
      ).catch(() => {});
    };
  }, []);

  return {
    layout,
    slots,
    stats,
    runningCount,
    concurrencyWarning,
    clearWarning: () => setConcurrencyWarning(null),
    changeLayout,
    assignCamera,
    removeCamera,
    clearAll,
    startStream,
    stopStream,
    restartStream,
    retryStream,
    startAllVisible,
    stopAll,
  };
}
