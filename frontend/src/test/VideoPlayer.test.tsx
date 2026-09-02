import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../components/video/VideoPlayer';

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

describe('VideoPlayer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('should render CCTV HUD badges with camera name and code', () => {
    render(
      <VideoPlayer
        src="/api/streams/hls/cam-1/index.m3u8"
        isStreaming={true}
        cameraName="Iskcon Cross Road PTZ"
        cameraCode="CAM-AHM-001"
      />,
    );

    expect(screen.getByText('GUJARAT POLICE CCTV')).toBeInTheDocument();
    expect(screen.getByText('CAM-AHM-001')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('should display inactive placeholder when stream is stopped', () => {
    render(
      <VideoPlayer
        src={null}
        isStreaming={false}
        cameraName="Iskcon Cross Road PTZ"
        cameraCode="CAM-AHM-001"
      />,
    );

    expect(screen.getByText('Camera Stream Inactive')).toBeInTheDocument();
    expect(
      screen.getByText(/Click "Start Stream" below to initialize live FFmpeg video ingestion/i),
    ).toBeInTheDocument();
  });

  it('should render playback controls when streaming', () => {
    render(
      <VideoPlayer
        src="/api/streams/hls/cam-1/index.m3u8"
        isStreaming={true}
        cameraName="Iskcon Cross Road PTZ"
        cameraCode="CAM-AHM-001"
      />,
    );

    expect(screen.getByTitle(/play/i)).toBeInTheDocument();
    expect(screen.getByTitle(/unmute/i)).toBeInTheDocument();
  });

  it('should toggle play/pause state when control button is clicked', () => {
    render(
      <VideoPlayer
        src="/api/streams/hls/cam-1/index.m3u8"
        isStreaming={true}
        cameraName="Iskcon Cross Road PTZ"
        cameraCode="CAM-AHM-001"
      />,
    );

    const playBtn = screen.getByTitle(/play/i);
    fireEvent.click(playBtn);

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
