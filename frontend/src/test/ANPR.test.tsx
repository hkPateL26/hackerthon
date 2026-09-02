import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ANPRBadge } from '../modules/anpr/components/ANPRBadge';
import { PlateResultCard } from '../modules/anpr/components/PlateResultCard';
import { RecentANPRPanel } from '../modules/anpr/components/RecentANPRPanel';
import { ANPRDetailsDrawer } from '../modules/anpr/components/ANPRDetailsDrawer';
import type { AnprResult } from '../modules/anpr/types/anpr';

// Mock useRecentANPR hook
vi.mock('../modules/anpr/hooks/useRecentANPR', () => ({
  useRecentANPR: vi.fn().mockReturnValue({
    results: [
      {
        id: 'anpr-1',
        cameraId: 'cam-1',
        cameraCode: 'CAM-AHM-001',
        sessionId: 'sess-1',
        trackId: 10,
        vehicleClass: 'car',
        plateTextRaw: 'GJ 01 AB 1234',
        plateTextNormalized: 'GJ01AB1234',
        validationStatus: 'VALID',
        plateDetectionConfidence: 0.95,
        ocrConfidence: 0.92,
        finalConfidence: 0.93,
        plateBbox: { x: 100, y: 150, width: 80, height: 30 },
        plateSnapshotUrl: 'http://localhost:3000/api/anpr/snapshots/plates/plate_1.jpg',
        vehicleSnapshotUrl: 'http://localhost:3000/api/anpr/snapshots/vehicles/veh_1.jpg',
        occurredAt: new Date().toISOString(),
        metadata: {},
        createdAt: new Date().toISOString(),
      },
    ],
    total: 1,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const mockResult: AnprResult = {
  id: 'anpr-1',
  cameraId: 'cam-1',
  cameraCode: 'CAM-AHM-001',
  cameraName: 'Ahmedabad Junction',
  sessionId: 'sess-1',
  trackId: 10,
  vehicleClass: 'car',
  plateTextRaw: 'GJ 01 AB 1234',
  plateTextNormalized: 'GJ01AB1234',
  validationStatus: 'VALID',
  plateDetectionConfidence: 0.95,
  ocrConfidence: 0.92,
  finalConfidence: 0.93,
  plateBbox: { x: 100, y: 150, width: 80, height: 30 },
  plateSnapshotUrl: 'http://localhost:3000/api/anpr/snapshots/plates/plate_1.jpg',
  vehicleSnapshotUrl: 'http://localhost:3000/api/anpr/snapshots/vehicles/veh_1.jpg',
  occurredAt: new Date().toISOString(),
  metadata: {},
  createdAt: new Date().toISOString(),
};

describe('ANPRBadge Component', () => {
  it('renders ANPR: OFF when active is false', () => {
    render(<ANPRBadge active={false} />);
    expect(screen.getByText(/ANPR: OFF/i)).toBeDefined();
  });

  it('renders ANPR: ON when active is true', () => {
    render(<ANPRBadge active={true} />);
    expect(screen.getByText(/ANPR: ON/i)).toBeDefined();
  });

  it('renders latest plate text and confidence when provided', () => {
    render(<ANPRBadge active={true} latestResult={mockResult} />);
    expect(screen.getByText('GJ01AB1234')).toBeDefined();
    expect(screen.getByText('93%')).toBeDefined();
  });
});

describe('PlateResultCard Component', () => {
  it('renders normalized plate, validation status, and vehicle info', () => {
    const handleClick = vi.fn();
    render(<PlateResultCard result={mockResult} onClick={handleClick} />);

    expect(screen.getByText('GJ01AB1234')).toBeDefined();
    expect(screen.getByText('VALID')).toBeDefined();
    expect(screen.getByText('Track #10')).toBeDefined();
    expect(screen.getByText('CAM-AHM-001')).toBeDefined();
    expect(screen.getByText(/Conf: 93.0%/i)).toBeDefined();

    fireEvent.click(screen.getByText('GJ01AB1234'));
    expect(handleClick).toHaveBeenCalledWith(mockResult);
  });
});

describe('RecentANPRPanel Component', () => {
  it('renders search input and plate cards when open', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();

    render(
      <RecentANPRPanel
        isOpen={true}
        onClose={handleClose}
        onSelectResult={handleSelect}
      />,
    );

    expect(screen.getByText(/ANPR Recognition Feed/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Search plate or camera.../i)).toBeDefined();
    fireEvent.click(screen.getByText('×'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RecentANPRPanel
        isOpen={false}
        onClose={vi.fn()}
        onSelectResult={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('ANPRDetailsDrawer Component', () => {
  it('renders full plate details, raw OCR, and metadata', () => {
    const handleClose = vi.fn();
    render(<ANPRDetailsDrawer result={mockResult} onClose={handleClose} />);

    expect(screen.getByText(/License Plate Observation/i)).toBeDefined();
    expect(screen.getByText('GJ01AB1234')).toBeDefined();
    expect(screen.getByText('GJ 01 AB 1234')).toBeDefined();
    expect(screen.getByText('Track #10')).toBeDefined();
    expect(screen.getByText('93.0%')).toBeDefined();
  });

  it('does not render when result is null', () => {
    const { container } = render(
      <ANPRDetailsDrawer result={null} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
