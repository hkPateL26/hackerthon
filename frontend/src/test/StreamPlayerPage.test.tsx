import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StreamPlayerPage } from '../pages/StreamPlayerPage';
import { cameraService } from '../services/camera.service';
import { streamService } from '../services/stream.service';
import { useAuthStore } from '../store/authStore';
import type { Camera } from '../types/camera';
import type { Stream } from '../types/stream';

vi.mock('../services/camera.service', () => ({
  cameraService: {
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

const mockCamera: Camera = {
  id: 'c1111111-0001-4001-a001-000000000001',
  cameraCode: 'CAM-AHM-001',
  name: 'Iskcon Cross Road Pan-Tilt-Zoom North',
  description: 'Major traffic junction PTZ camera',
  cameraType: 'PTZ',
  vendor: 'Hikvision',
  model: 'DS-2DF8442IXS-AELW',
  serialNumber: 'HK-2026-AHM-001',
  ipAddress: '192.168.10.11',
  port: 554,
  streamUrl: 'rtsp://***:***@192.168.10.11:554/live',
  locationName: 'Iskcon Junction, SG Highway',
  district: { id: 'd1', name: 'Ahmedabad City', code: 'AHM' },
  policeStation: { id: 'ps1', districtId: 'd1', name: 'Satellite Police Station', code: 'PS-SAT' },
  latitude: 23.0305,
  longitude: 72.5074,
  status: 'ONLINE',
  isActive: true,
  installedAt: '2026-01-01T00:00:00Z',
  lastSeenAt: '2026-09-02T12:00:00Z',
  metadata: {},
  createdAt: '2026-09-02T10:00:00Z',
  updatedAt: '2026-09-02T10:00:00Z',
};

const mockStoppedStream: Stream = {
  id: 's1',
  cameraId: mockCamera.id,
  sourceType: 'FILE',
  outputType: 'HLS',
  status: 'STOPPED',
  playbackUrl: `/api/streams/hls/${mockCamera.id}/index.m3u8`,
  startedAt: null,
  stoppedAt: null,
  lastError: null,
};

const mockRunningStream: Stream = {
  id: 's1',
  cameraId: mockCamera.id,
  sourceType: 'FILE',
  outputType: 'HLS',
  status: 'RUNNING',
  playbackUrl: `/api/streams/hls/${mockCamera.id}/index.m3u8`,
  startedAt: '2026-09-02T14:00:00Z',
  stoppedAt: null,
  lastError: null,
};

describe('StreamPlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (cameraService.getCameraById as any).mockResolvedValue(mockCamera);
    (streamService.getStream as any).mockResolvedValue(mockStoppedStream);
    (streamService.startStream as any).mockResolvedValue(mockRunningStream);
    (streamService.stopStream as any).mockResolvedValue(mockStoppedStream);
    (streamService.restartStream as any).mockResolvedValue(mockRunningStream);

    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();

    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'admin@police.gujarat.gov.in',
        fullName: 'Admin Officer',
        role: 'ADMIN',
        permissions: [],
        isActive: true,
      },
      accessToken: 'token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  const renderStreamPage = () => {
    return render(
      <MemoryRouter initialEntries={[`/cameras/${mockCamera.id}/stream`]}>
        <Routes>
          <Route path="/cameras/:id/stream" element={<StreamPlayerPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('should render camera title and jurisdiction specs', async () => {
    renderStreamPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
        'Iskcon Cross Road Pan-Tilt-Zoom North',
      );
      expect(screen.getAllByText('CAM-AHM-001').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Ahmedabad City')).toBeInTheDocument();
      expect(screen.getByText('Satellite Police Station')).toBeInTheDocument();
    });
  });

  it('should display stream status badge and start button for stopped stream', async () => {
    renderStreamPage();

    await waitFor(() => {
      expect(screen.getByText('Stream Inactive')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start stream/i })).toBeInTheDocument();
    });
  });

  it('should call startStream when Start Stream button is clicked', async () => {
    renderStreamPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start stream/i })).toBeInTheDocument();
    });

    const startBtn = screen.getByRole('button', { name: /start stream/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(streamService.startStream).toHaveBeenCalledWith(mockCamera.id);
    });
  });

  it('should allow Admin to see and click Restart button', async () => {
    (streamService.getStream as any).mockResolvedValue(mockRunningStream);

    renderStreamPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
    });

    const restartBtn = screen.getByRole('button', { name: /restart/i });
    fireEvent.click(restartBtn);

    await waitFor(() => {
      expect(streamService.restartStream).toHaveBeenCalledWith(mockCamera.id);
    });
  });
});
