import { StreamSourceType } from '../enums/stream-status.enum.js';

export interface IVideoSource {
  /**
   * Return the type of video source (FILE or RTSP)
   */
  getType(): StreamSourceType;

  /**
   * Return safe sanitized representation of the source (credentials redacted)
   */
  getSanitizedSourceUrl(): string;

  /**
   * Return the raw source input to pass directly to FFmpeg
   */
  getRawInput(): string;

  /**
   * Build array of input-specific FFmpeg CLI flags
   */
  buildFfmpegInputArgs(): string[];

  /**
   * Verify source availability (file exists or RTSP URL well-formed)
   */
  validate(): Promise<{ valid: boolean; error?: string }>;
}
