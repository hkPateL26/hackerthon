import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackBadge } from '../modules/tracking/components/TrackBadge';
import { TrackOverlay } from '../modules/tracking/components/TrackOverlay';
import { ActiveTracksPanel } from '../modules/tracking/components/ActiveTracksPanel';
import { TrackDetailsDrawer } from '../modules/tracking/components/TrackDetailsDrawer';
import type { TrackedObjectItem } from '../modules/tracking/types/tracking';

describe('TrackBadge Component', () => {
  it('renders TRACKS: OFF when isTracking is false', () => {
    render(<TrackBadge isTracking={false} activeCount={0} />);
    expect(screen.getByText(/TRACKS: OFF/i)).toBeDefined();
  });

  it('renders TRACKS: ON with active track count when isTracking is true', () => {
    render(<TrackBadge isTracking={true} activeCount={3} />);
    expect(screen.getByText(/TRACKS: ON/i)).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });
});

describe('TrackOverlay Component', () => {
  const sampleTracks: TrackedObjectItem[] = [
    {
      cameraId: 'cam-1',
      sessionId: 'sess-1',
      trackId: 17,
      category: 'PERSON',
      detectedClass: 'person',
      status: 'ACTIVE',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      detectionCount: 5,
      confidence: 0.92,
      bbox: { x: 100, y: 80, width: 50, height: 100 },
      metadata: {
        history: [
          [120, 130],
          [125, 130],
        ],
      },
    },
    {
      cameraId: 'cam-1',
      sessionId: 'sess-1',
      trackId: 42,
      category: 'VEHICLE',
      detectedClass: 'car',
      status: 'ACTIVE',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      detectionCount: 2,
      confidence: 0.88,
      bbox: { x: 300, y: 150, width: 120, height: 80 },
    },
  ];

  it('renders SVG bounding boxes and text labels for active tracks', () => {
    render(<TrackOverlay tracks={sampleTracks} frameWidth={640} frameHeight={360} />);

    expect(screen.getByText('#17 PERSON 92%')).toBeDefined();
    expect(screen.getByText('#42 CAR 88%')).toBeDefined();
  });

  it('renders null when tracks list is empty', () => {
    const { container } = render(<TrackOverlay tracks={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ActiveTracksPanel Component', () => {
  const sampleTracks: TrackedObjectItem[] = [
    {
      cameraId: 'cam-1',
      sessionId: 'sess-1',
      trackId: 17,
      category: 'PERSON',
      detectedClass: 'person',
      status: 'ACTIVE',
      firstSeenAt: '2026-09-02T16:00:00Z',
      lastSeenAt: '2026-09-02T16:00:05Z',
      detectionCount: 4,
      confidence: 0.93,
      bbox: { x: 100, y: 100, width: 50, height: 80 },
    },
    {
      cameraId: 'cam-1',
      sessionId: 'sess-1',
      trackId: 42,
      category: 'VEHICLE',
      detectedClass: 'bus',
      status: 'ACTIVE',
      firstSeenAt: '2026-09-02T16:00:01Z',
      lastSeenAt: '2026-09-02T16:00:06Z',
      detectionCount: 3,
      confidence: 0.89,
      bbox: { x: 200, y: 150, width: 140, height: 90 },
    },
  ];

  it('renders active tracks in table with count pill', () => {
    render(<ActiveTracksPanel tracks={sampleTracks} selectedCameraCode="CAM-AHM-001" />);

    expect(screen.getByText(/Active Tracks/i)).toBeDefined();
    expect(screen.getByText('#17')).toBeDefined();
    expect(screen.getByText('#42')).toBeDefined();
    expect(screen.getByText('person')).toBeDefined();
    expect(screen.getByText('bus')).toBeDefined();
  });

  it('filters tracks by category when selector changes', () => {
    render(<ActiveTracksPanel tracks={sampleTracks} />);

    const select = screen.getByLabelText(/Filter active tracks by category/i);
    fireEvent.change(select, { target: { value: 'PERSON' } });

    expect(screen.getByText('#17')).toBeDefined();
    expect(screen.queryByText('#42')).toBeNull();
  });

  it('calls onSelectTrack when row is clicked', () => {
    const onSelect = vi.fn();
    render(<ActiveTracksPanel tracks={sampleTracks} onSelectTrack={onSelect} />);

    fireEvent.click(screen.getByText('#17'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(sampleTracks[0]);
  });
});

describe('TrackDetailsDrawer Component', () => {
  const sampleTrack: TrackedObjectItem = {
    cameraId: 'cam-1',
    sessionId: 'sess-uuid-test',
    trackId: 17,
    category: 'PERSON',
    detectedClass: 'person',
    status: 'ACTIVE',
    firstSeenAt: '2026-09-02T16:00:00Z',
    lastSeenAt: '2026-09-02T16:00:05Z',
    detectionCount: 4,
    confidence: 0.93,
    bbox: { x: 100, y: 100, width: 50, height: 80 },
    metadata: {
      history: [
        [100, 120],
        [102, 122],
      ],
    },
  };

  it('renders track details modal with trajectory points', () => {
    const onClose = vi.fn();
    render(<TrackDetailsDrawer track={sampleTrack} onClose={onClose} />);

    expect(screen.getByText(/Track #17/i)).toBeDefined();
    expect(screen.getByText('sess-uuid-test')).toBeDefined();
    expect(screen.getByText(/4 frames/i)).toBeDefined();
    expect(screen.getByText('pt #1: (100, 120)')).toBeDefined();

    const closeBtn = screen.getByLabelText(/Close track details/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
