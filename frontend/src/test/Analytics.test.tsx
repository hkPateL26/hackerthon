import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIControlBadge } from '../modules/analytics/components/AIControlBadge';
import { RecentDetectionsDrawer } from '../modules/analytics/components/RecentDetectionsDrawer';
import { DetectionOverlay } from '../modules/analytics/components/DetectionOverlay';
import type { DetectionEvent } from '../modules/analytics/types/analytics';

describe('AIControlBadge Component', () => {
  it('renders AI Off badge and Start button when status is STOPPED', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();

    render(
      <AIControlBadge
        status="STOPPED"
        onStart={onStart}
        onStop={onStop}
      />
    );

    expect(screen.getByText('AI Off')).toBeDefined();
    const startBtn = screen.getByRole('button', { name: /Start AI/i });
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('renders AI Active badge, count, and Stop button when status is RUNNING', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();

    render(
      <AIControlBadge
        status="RUNNING"
        detectionsCount={7}
        onStart={onStart}
        onStop={onStop}
      />
    );

    expect(screen.getByText('AI Active')).toBeDefined();
    expect(screen.getByText(/7/)).toBeDefined();

    const stopBtn = screen.getByRole('button', { name: /Stop AI/i });
    expect(stopBtn).toBeDefined();

    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('renders AI Starting... when status is STARTING and disables button', () => {
    render(
      <AIControlBadge
        status="STARTING"
        onStart={vi.fn()}
        onStop={vi.fn()}
      />
    );

    expect(screen.getByText('AI Starting...')).toBeDefined();
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });
});

describe('RecentDetectionsDrawer Component', () => {
  const mockEvents: DetectionEvent[] = [
    {
      id: 'event-1',
      cameraId: 'cam-1',
      cameraCode: 'CAM-AHM-001',
      eventTypeCode: 'PERSON_DETECTED',
      eventTypeName: 'Person Detected',
      detectedCategory: 'PERSON',
      detectedClass: 'person',
      confidence: 0.892,
      occurredAt: '2026-09-02T16:00:00Z',
      frameWidth: 640,
      frameHeight: 360,
      bboxX: 100,
      bboxY: 50,
      bboxWidth: 40,
      bboxHeight: 120,
      snapshotPath: 'runtime/snapshots/snap_1.jpg',
      snapshotUrl: '/api/events/snapshots/snap_1.jpg',
      source: 'YOLOv8n',
      metadata: {},
      createdAt: '2026-09-02T16:00:00Z',
    },
    {
      id: 'event-2',
      cameraId: 'cam-1',
      cameraCode: 'CAM-AHM-001',
      eventTypeCode: 'VEHICLE_DETECTED',
      eventTypeName: 'Vehicle Detected',
      detectedCategory: 'VEHICLE',
      detectedClass: 'bus',
      confidence: 0.941,
      occurredAt: '2026-09-02T16:00:02Z',
      frameWidth: 640,
      frameHeight: 360,
      bboxX: 200,
      bboxY: 80,
      bboxWidth: 220,
      bboxHeight: 150,
      snapshotPath: 'runtime/snapshots/snap_2.jpg',
      snapshotUrl: '/api/events/snapshots/snap_2.jpg',
      source: 'YOLOv8n',
      metadata: {},
      createdAt: '2026-09-02T16:00:02Z',
    },
  ];

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: mockEvents, total: 2 }),
    } as any);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RecentDetectionsDrawer isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header and filter buttons when isOpen is true', () => {
    render(<RecentDetectionsDrawer isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Live Detection Feed/i)).toBeDefined();
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText(/Person/i)).toBeDefined();
    expect(screen.getByText(/Vehicle/i)).toBeDefined();
  });
});

describe('DetectionOverlay Component', () => {
  const mockDetections: DetectionEvent[] = [
    {
      id: 'det-1',
      cameraId: 'cam-1',
      eventTypeCode: 'PERSON_DETECTED',
      eventTypeName: 'Person Detected',
      detectedCategory: 'PERSON',
      detectedClass: 'person',
      confidence: 0.88,
      occurredAt: '2026-09-02T16:00:00Z',
      frameWidth: 640,
      frameHeight: 360,
      bboxX: 120,
      bboxY: 40,
      bboxWidth: 50,
      bboxHeight: 130,
      snapshotPath: null,
      snapshotUrl: null,
      source: 'YOLOv8n',
      metadata: {},
      createdAt: '2026-09-02T16:00:00Z',
    },
  ];

  it('renders SVG bounding box and text label', () => {
    const { container } = render(
      <DetectionOverlay detections={mockDetections} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();

    const text = container.querySelector('text');
    expect(text?.textContent).toContain('person 88%');
  });

  it('returns null when detections array is empty', () => {
    const { container } = render(<DetectionOverlay detections={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
