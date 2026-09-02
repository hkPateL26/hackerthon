export type StreamStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'ERROR';

export type StreamSourceType = 'FILE' | 'RTSP';

export type StreamOutputType = 'HLS';

export interface Stream {
  id: string;
  cameraId: string;
  sourceType: StreamSourceType;
  outputType: StreamOutputType;
  status: StreamStatus;
  playbackUrl: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
}

export interface StreamStatusResponse {
  cameraId: string;
  status: StreamStatus;
  sourceType: StreamSourceType;
  playbackUrl: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
}
