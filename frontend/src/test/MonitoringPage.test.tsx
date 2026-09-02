import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MonitoringPage } from '../pages/MonitoringPage';
import { cameraService } from '../services/camera.service';
import { streamService } from '../services/stream.service';
import { useAuthStore } from '../store/authStore';
import type { Camera } from '../types/camera';

vi.mock('../services/camera.service', () => ({
  cameraService: {
    getCameras: vi.fn(),
    getDistricts: vi.fn(),
    getPoliceStations: vi.fn(),
    getCameraById: vi.fn(),
  },
}));

vi.mock('../services/stream.service', () => ({
  streamService: {
    getStream: vi.fn(),
    getStreamStatus: vi.fn(),
    startStream: vi.fn(),
    stopStream: vi.fn(),
    restartStream: vi.fn(),
  },
}));

vi.mock('hls.js', () => {
  class MockHls {
    loadSource = vi.fn();
    attachMedia = vi.fn();
    on = vi.fn((event: string, callback: () => void) => {
      if (event === 'hlsManifestParsed') {
        callback();
      }
    });
    destroy = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();

    static isSupported = vi.fn(() => true);
    static Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    };
    static ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
    };
  }

  return {
    default: MockHls,
  };
});

const mockCameras: Camera[] = [
  {
    id: 'c1111111-0001-4001-a001-000000000001',
    cameraCode: 'CAM-AHM-001',
    name: 'Iskcon Cross Road Pan-Tilt-Zoom North',
    description: 'Major traffic junction PTZ camera',
    cameraType: 'PTZ' as any,
    vendor: 'Hikvision',
    model: 'DS-2DE7A432IW-AEB',
    serialNumber: 'SN-AHM-001',
    ipAddress: '192.168.10.101',
    port: 554,
    locationName: 'Iskcon Junction',
    latitude: 23.0298,
    longitude: 72.5074,
    status: 'ONLINE' as any,
    isActive: true,
    streamUrl: null,
    lastSeenAt: null,
    metadata: {},
    district: { id: 'd1111111-0001-0001-0001-000000000001', name: 'Ahmedabad City', code: 'AHM' },
    policeStation: { id: 'p1111111-0001-0001-0001-000000000001', name: 'Satellite PS', code: 'SAT', districtId: 'd1111111-0001-0001-0001-000000000001' },
    installedAt: '2025-01-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1111111-0001-4001-a001-000000000002',
    cameraCode: 'CAM-AHM-002',
    name: 'Shivranjani Cross Road Bullet East',
    description: 'Traffic surveillance camera',
    cameraType: 'BULLET' as any,
    vendor: 'Dahua',
    model: 'DH-IPC-HFW5442E',
    serialNumber: 'SN-AHM-002',
    ipAddress: '192.168.10.102',
    port: 554,
    locationName: 'Shivranjani Junction',
    latitude: 23.0255,
    longitude: 72.5298,
    status: 'ONLINE' as any,
    isActive: true,
    streamUrl: null,
    lastSeenAt: null,
    metadata: {},
    district: { id: 'd1111111-0001-0001-0001-000000000001', name: 'Ahmedabad City', code: 'AHM' },
    policeStation: { id: 'p1111111-0001-0001-0001-000000000001', name: 'Satellite PS', code: 'SAT', districtId: 'd1111111-0001-0001-0001-000000000001' },
    installedAt: '2025-01-15T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('Phase 6 — MonitoringPage & Multi-Camera Grid', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'operator@police.gujarat.gov.in',
        fullName: 'Police Operator',
        role: 'OPERATOR' as any,
        permissions: ['stream:view', 'stream:operate'],
        isActive: true,
      },
      accessToken: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    vi.mocked(cameraService.getCameras).mockResolvedValue({
      items: mockCameras,
      total: mockCameras.length,
      page: 1,
      limit: 8,
      totalPages: 1,
    });
    vi.mocked(cameraService.getDistricts).mockResolvedValue([
      { id: 'd1111111-0001-0001-0001-000000000001', name: 'Ahmedabad City', code: 'AHM' },
    ]);
    vi.mocked(cameraService.getPoliceStations).mockResolvedValue([
      { id: 'p1111111-0001-0001-0001-000000000001', name: 'Satellite PS', code: 'SAT', districtId: 'd1111111-0001-0001-0001-000000000001' },
    ]);
    vi.mocked(streamService.startStream).mockResolvedValue({
      id: 's1',
      cameraId: mockCameras[0].id,
      sourceType: 'FILE' as any,
      outputType: 'HLS' as any,
      status: 'RUNNING' as any,
      playbackUrl: `/api/streams/hls/${mockCameras[0].id}/index.m3u8`,
      startedAt: '2026-09-02T12:00:00Z',
      stoppedAt: null,
      lastError: null,
    });
    vi.mocked(streamService.stopStream).mockResolvedValue({
      id: 's1',
      cameraId: mockCameras[0].id,
      sourceType: 'FILE' as any,
      outputType: 'HLS' as any,
      status: 'STOPPED' as any,
      playbackUrl: null,
      startedAt: null,
      stoppedAt: '2026-09-02T12:05:00Z',
      lastError: null,
    });
    vi.mocked(streamService.getStreamStatus).mockResolvedValue({
      cameraId: mockCameras[0].id,
      status: 'RUNNING' as any,
      sourceType: 'FILE' as any,
      playbackUrl: `/api/streams/hls/${mockCameras[0].id}/index.m3u8`,
      startedAt: '2026-09-02T12:00:00Z',
      stoppedAt: null,
      lastError: null,
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);
  });

  it('1. renders monitoring page with default 2x2 layout (4 slots)', () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('CCTV Unified Monitoring')).toBeInTheDocument();
    expect(screen.getByText('0 / 4')).toBeInTheDocument(); // 0 of 4 monitored

    // Check that 4 slots exist
    expect(screen.getByText('SLOT-0')).toBeInTheDocument();
    expect(screen.getByText('SLOT-1')).toBeInTheDocument();
    expect(screen.getByText('SLOT-2')).toBeInTheDocument();
    expect(screen.getByText('SLOT-3')).toBeInTheDocument();
  });

  it('2. switches between 1x1, 2x2, 2x3, and 3x3 layouts', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Switch to 1x1
    fireEvent.click(screen.getByRole('button', { name: /1x1/i }));
    expect(screen.getByText('SLOT-0')).toBeInTheDocument();
    expect(screen.queryByText('SLOT-1')).not.toBeInTheDocument();

    // Switch to 2x3 (6 slots)
    fireEvent.click(screen.getByRole('button', { name: /2x3/i }));
    expect(screen.getByText('SLOT-0')).toBeInTheDocument();
    expect(screen.getByText('SLOT-5')).toBeInTheDocument();

    // Switch to 3x3 (9 slots)
    fireEvent.click(screen.getByRole('button', { name: /3x3/i }));
    expect(screen.getByText('SLOT-8')).toBeInTheDocument();
  });

  it('3. opens camera picker and selects a camera into an empty slot', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Click assign on slot 0
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);

    // Camera picker modal should be open
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Camera Picker/i })).toBeInTheDocument();
      expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
    });

    // Click assign for CAM-AHM-001
    const assignBtn = screen.getAllByRole('button', { name: /Assign to Slot/i })[0];
    fireEvent.click(assignBtn);

    // Modal closes and slot 0 displays camera info
    await waitFor(() => {
      expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
      expect(screen.getByText('Iskcon Cross Road Pan-Tilt-Zoom North')).toBeInTheDocument();
      expect(screen.getByText('Reg: Online')).toBeInTheDocument();
      expect(screen.getByText('Stopped')).toBeInTheDocument(); // Dual status
    });
  });

  it('4. prevents duplicate camera assignment in multiple slots', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign CAM-AHM-001 to slot 0
    const addBtns = screen.getAllByRole('button', { name: /Assign Camera/i });
    fireEvent.click(addBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
    });

    // Try to assign to slot 1
    const addBtn1 = screen.getAllByRole('button', { name: /Assign Camera/i })[0];
    fireEvent.click(addBtn1);

    await waitFor(() => {
      // CAM-AHM-001 should now be disabled with "Already in Grid"
      expect(screen.getByText('Already in Grid')).toBeInTheDocument();
    });
  });

  it('5. starts live HLS stream on camera tile', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera to slot 0
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    // Click Start Feed on tile
    await waitFor(() => expect(screen.getByRole('button', { name: /▶ Start Feed/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /▶ Start Feed/i }));

    expect(streamService.startStream).toHaveBeenCalledWith(mockCameras[0].id);

    // Verify stream status switches to Live HLS
    await waitFor(() => {
      expect(screen.getByText('Live HLS')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^⏹ Stop$/i })).toBeInTheDocument();
    });
  });

  it('6. stops running live stream on camera tile', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    // Start
    await waitFor(() => expect(screen.getByRole('button', { name: /▶ Start Feed/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /▶ Start Feed/i }));
    await waitFor(() => expect(screen.getByText('Live HLS')).toBeInTheDocument());

    // Stop
    fireEvent.click(screen.getByRole('button', { name: /^⏹ Stop$/i }));
    expect(streamService.stopStream).toHaveBeenCalledWith(mockCameras[0].id);

    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument();
    });
  });

  it('7. removes camera from slot and cleans up stream', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    // Start stream
    await waitFor(() => expect(screen.getByRole('button', { name: /▶ Start Feed/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /▶ Start Feed/i }));
    await waitFor(() => expect(screen.getByText('Live HLS')).toBeInTheDocument());

    // Click remove (✕ button)
    fireEvent.click(screen.getByTitle('Clear camera from slot'));

    // Should stop stream and revert slot to empty
    expect(streamService.stopStream).toHaveBeenCalledWith(mockCameras[0].id);
    await waitFor(() => {
      expect(screen.getByText('SLOT-0')).toBeInTheDocument();
      expect(screen.queryByText('CAM-AHM-001')).not.toBeInTheDocument();
    });
  });

  it('8. opens quick camera details modal and navigates', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    await waitFor(() => expect(screen.getByTitle('View technical metadata')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('View technical metadata'));

    // QuickDetailsModal should be open
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Camera Details/i })).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('192.168.10.101')).toBeInTheDocument();
    });
  });

  it('9. filters and searches cameras in CameraPicker', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search camera code/i)).toBeInTheDocument();
    });

    // Type search
    fireEvent.change(screen.getByPlaceholderText(/Search camera code/i), {
      target: { value: 'Shivranjani' },
    });

    await waitFor(() => {
      expect(cameraService.getCameras).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Shivranjani' }),
      );
    });
  });

  it('10. clears all cameras from grid with Clear All', async () => {
    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());

    // Click Clear All
    fireEvent.click(screen.getByRole('button', { name: /Clear All/i }));

    await waitFor(() => {
      expect(screen.queryByText('CAM-AHM-001')).not.toBeInTheDocument();
      expect(screen.getByText('0 / 4')).toBeInTheDocument();
    });
  });

  it('11. stops running streams on component unmount', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    // Start stream
    await waitFor(() => expect(screen.getByRole('button', { name: /▶ Start Feed/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /▶ Start Feed/i }));
    await waitFor(() => expect(screen.getByText('Live HLS')).toBeInTheDocument());

    // Unmount page
    unmount();

    expect(streamService.stopStream).toHaveBeenCalledWith(mockCameras[0].id);
  });

  it('12. displays error notice and allows stream retry', async () => {
    vi.mocked(streamService.startStream).mockRejectedValueOnce(
      new Error('Stream decode pipeline failure'),
    );

    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    // Start feed (will fail)
    await waitFor(() => expect(screen.getByRole('button', { name: /▶ Start Feed/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /▶ Start Feed/i }));

    // Should enter ERROR state
    await waitFor(() => {
      expect(screen.getByText('Stream Error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Feed/i })).toBeInTheDocument();
    });

    // Reset mock to success and retry
    vi.mocked(streamService.startStream).mockResolvedValueOnce({
      id: 's1',
      cameraId: mockCameras[0].id,
      sourceType: 'FILE' as any,
      outputType: 'HLS' as any,
      status: 'RUNNING' as any,
      playbackUrl: `/api/streams/hls/${mockCameras[0].id}/index.m3u8`,
      startedAt: '2026-09-02T12:00:00Z',
      stoppedAt: null,
      lastError: null,
    });

    fireEvent.click(screen.getByRole('button', { name: /Retry Feed/i }));

    await waitFor(() => {
      expect(screen.getByText('Live HLS')).toBeInTheDocument();
    });
  });

  it('13. allows ADMIN to see restart button', async () => {
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        email: 'admin@police.gujarat.gov.in',
        fullName: 'Police Administrator',
        role: 'ADMIN' as any,
        permissions: ['stream:view', 'stream:operate', 'stream:restart'],
        isActive: true,
      },
      isAuthenticated: true,
      accessToken: 'mock-admin-token',
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <MonitoringPage />
      </MemoryRouter>,
    );

    // Assign camera
    fireEvent.click(screen.getAllByRole('button', { name: /Assign Camera/i })[0]);
    await waitFor(() => expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /Assign to Slot/i })[0]);

    // Restart button should be present for ADMIN
    await waitFor(() => {
      expect(screen.getByTitle('Restart stream pipeline')).toBeInTheDocument();
    });
  });
});

