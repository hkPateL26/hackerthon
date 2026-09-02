export enum StreamStatus {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  ERROR = 'ERROR',
}

export enum StreamSourceType {
  FILE = 'FILE',
  RTSP = 'RTSP',
}

export enum StreamOutputType {
  HLS = 'HLS',
}
