import { IVideoSource } from '../interfaces/video-source.interface.js';
import { StreamSourceType } from '../enums/stream-status.enum.js';

export class RtspVideoSource implements IVideoSource {
  private readonly rtspUrl: string;

  constructor(rtspUrl: string) {
    this.rtspUrl = rtspUrl.trim();
  }

  getType(): StreamSourceType {
    return StreamSourceType.RTSP;
  }

  getSanitizedSourceUrl(): string {
    return this.rtspUrl.replace(/rtsp:\/\/([^:]+):([^@]+)@/i, 'rtsp://***:***@');
  }

  getRawInput(): string {
    return this.rtspUrl;
  }

  buildFfmpegInputArgs(): string[] {
    return [
      '-rtsp_transport',
      'tcp',
      '-stimeout',
      '5000000', // 5s timeout in microseconds
      '-i',
      this.rtspUrl,
    ];
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    if (!this.rtspUrl.toLowerCase().startsWith('rtsp://')) {
      return {
        valid: false,
        error: 'Invalid RTSP stream format: URL must start with rtsp://',
      };
    }
    return { valid: true };
  }
}
