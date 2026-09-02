import fs from 'fs';
import path from 'path';
import { IVideoSource } from '../interfaces/video-source.interface.js';
import { StreamSourceType } from '../enums/stream-status.enum.js';

export class FileVideoSource implements IVideoSource {
  private readonly filePath: string;
  private readonly shouldLoop: boolean;

  constructor(filePath: string, shouldLoop = true) {
    this.filePath = path.resolve(filePath);
    this.shouldLoop = shouldLoop;
  }

  getType(): StreamSourceType {
    return StreamSourceType.FILE;
  }

  getSanitizedSourceUrl(): string {
    return `file://${path.basename(this.filePath)}`;
  }

  getRawInput(): string {
    return this.filePath;
  }

  buildFfmpegInputArgs(): string[] {
    const args: string[] = [];
    if (this.shouldLoop) {
      // Loop continuously at real-time native frame rate
      args.push('-stream_loop', '-1', '-re');
    } else {
      args.push('-re');
    }
    args.push('-i', this.filePath);
    return args;
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {
          valid: false,
          error: `Sample video file not found at path: ${path.basename(this.filePath)}`,
        };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }
}
