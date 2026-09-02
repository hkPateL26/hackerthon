import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IVideoSource } from '../interfaces/video-source.interface.js';

interface ActiveStreamProcess {
  cameraId: string;
  process: ChildProcess;
  pid: number;
  outputDir: string;
  playlistPath: string;
  lastStderrLines: string[];
}

@Injectable()
export class FfmpegProcessManagerService implements OnApplicationShutdown {
  private readonly logger = new Logger(FfmpegProcessManagerService.name);
  private readonly activeProcesses = new Map<string, ActiveStreamProcess>();
  private readonly ffmpegPath: string;
  private readonly hlsBaseDir: string;

  constructor(private readonly configService: ConfigService) {
    // 1. Resolve FFmpeg executable path
    const configuredPath = this.configService.get<string>('FFMPEG_PATH');
    const defaultWinPath = 'D:\\DevTools\\ffmpeg\\bin\\ffmpeg.exe';

    if (configuredPath && fs.existsSync(configuredPath)) {
      this.ffmpegPath = configuredPath;
    } else if (fs.existsSync(defaultWinPath)) {
      this.ffmpegPath = defaultWinPath;
    } else {
      this.ffmpegPath = 'ffmpeg';
    }

    // 2. Resolve HLS runtime directory on D: drive
    const rootDir = fs.existsSync(path.resolve(process.cwd(), 'sample-data'))
      ? process.cwd()
      : path.resolve(process.cwd(), '..');

    const defaultHlsDir = path.resolve(rootDir, 'runtime', 'hls');

    const configuredHlsDir = this.configService.get<string>(
      'HLS_RUNTIME_DIR',
      defaultHlsDir,
    );
    this.hlsBaseDir = path.resolve(configuredHlsDir);

    if (!fs.existsSync(this.hlsBaseDir)) {
      fs.mkdirSync(this.hlsBaseDir, { recursive: true });
    }

    this.logger.log(`FFmpeg Process Manager initialized (Binary: ${this.ffmpegPath}, HLS Root: ${this.hlsBaseDir})`);
  }

  /**
   * Get safe HLS output directory for a specific camera
   */
  getHlsOutputDir(cameraId: string): string {
    // Strict UUID validation / alphanumeric sanitization to prevent path traversal
    const safeCameraId = cameraId.replace(/[^a-zA-Z0-9-]/g, '');
    return path.join(this.hlsBaseDir, safeCameraId);
  }

  /**
   * Get safe HLS playlist file path
   */
  getHlsPlaylistPath(cameraId: string): string {
    return path.join(this.getHlsOutputDir(cameraId), 'index.m3u8');
  }

  /**
   * Check if FFmpeg process is running for a camera
   */
  isProcessRunning(cameraId: string): boolean {
    const entry = this.activeProcesses.get(cameraId);
    return Boolean(entry && !entry.process.killed);
  }

  /**
   * Get active process PID
   */
  getProcessPid(cameraId: string): number | null {
    return this.activeProcesses.get(cameraId)?.pid ?? null;
  }

  /**
   * Start FFmpeg ingestion & HLS transcoding process
   */
  async startProcess(
    cameraId: string,
    source: IVideoSource,
    onExit: (code: number | null, error?: string) => void,
  ): Promise<{ pid: number; outputDir: string; playlistPath: string }> {
    // 1. Check if process is already running (idempotent)
    if (this.isProcessRunning(cameraId)) {
      const active = this.activeProcesses.get(cameraId)!;
      return {
        pid: active.pid,
        outputDir: active.outputDir,
        playlistPath: active.playlistPath,
      };
    }

    // 2. Prepare output directory
    const outputDir = this.getHlsOutputDir(cameraId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    } else {
      // Clean up previous stale HLS segments
      this.cleanHlsDirectory(outputDir);
    }

    const playlistPath = path.join(outputDir, 'index.m3u8');
    const segmentPattern = path.join(outputDir, 'segment-%03d.ts');

    // 3. Build safe FFmpeg arguments array (No shell interpolation)
    const inputArgs = source.buildFfmpegInputArgs();
    const hlsArgs = [
      '-y',
      ...inputArgs,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-c:a',
      'aac',
      '-b:a',
      '64k',
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '5',
      '-hls_flags',
      'delete_segments+split_by_time',
      '-hls_segment_filename',
      segmentPattern,
      playlistPath,
    ];

    this.logger.log(
      `Spawning FFmpeg for camera '${cameraId}' (Source: ${source.getSanitizedSourceUrl()})`,
    );

    // 4. Spawn child process
    const child = spawn(this.ffmpegPath, hlsArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const pid = child.pid || 0;
    const stderrLines: string[] = [];

    // Capture stderr safely (redacting any potential raw secrets)
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      const sanitized = text.replace(/rtsp:\/\/([^:]+):([^@]+)@/i, 'rtsp://***:***@');
      const lines = sanitized.split('\n').filter(Boolean);
      stderrLines.push(...lines);
      if (stderrLines.length > 50) {
        stderrLines.splice(0, stderrLines.length - 50);
      }
    });

    child.on('error', (err: Error) => {
      this.logger.error(`FFmpeg spawn error for camera '${cameraId}': ${err.message}`);
      this.activeProcesses.delete(cameraId);
      onExit(null, err.message);
    });

    child.on('exit', (code: number | null, signal: string | null) => {
      this.logger.log(
        `FFmpeg process for camera '${cameraId}' exited with code ${code}, signal ${signal}`,
      );
      this.activeProcesses.delete(cameraId);
      const lastError =
        code !== 0 && code !== null
          ? stderrLines.slice(-5).join('; ') || `FFmpeg exited with error code ${code}`
          : undefined;
      onExit(code, lastError);
    });

    const activeEntry: ActiveStreamProcess = {
      cameraId,
      process: child,
      pid,
      outputDir,
      playlistPath,
      lastStderrLines: stderrLines,
    };

    this.activeProcesses.set(cameraId, activeEntry);

    return { pid, outputDir, playlistPath };
  }

  /**
   * Gracefully stop and clean up FFmpeg process for a camera
   */
  async stopProcess(cameraId: string): Promise<void> {
    const entry = this.activeProcesses.get(cameraId);
    if (!entry) {
      // Still ensure HLS directory is cleaned up
      const outputDir = this.getHlsOutputDir(cameraId);
      this.cleanHlsDirectory(outputDir);
      return;
    }

    this.logger.log(`Stopping FFmpeg process for camera '${cameraId}' (PID: ${entry.pid})`);

    try {
      if (process.platform === 'win32' && entry.pid) {
        // Windows forceful tree kill to prevent orphan ffmpeg processes
        try {
          const { execSync } = await import('child_process');
          execSync(`taskkill /PID ${entry.pid} /T /F`, { stdio: 'ignore' });
        } catch {}
      } else {
        entry.process.kill('SIGTERM');
      }
    } catch (err: any) {
      this.logger.warn(`Error stopping process PID ${entry.pid}: ${err.message}`);
    }

    this.activeProcesses.delete(cameraId);

    // Clean up HLS directory
    this.cleanHlsDirectory(entry.outputDir);
  }

  /**
   * Helper to clean up .ts and .m3u8 files from output directory
   */
  private cleanHlsDirectory(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith('.ts') || file.endsWith('.m3u8') || file.endsWith('.tmp')) {
            try {
              fs.unlinkSync(path.join(dirPath, file));
            } catch {}
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to clean HLS directory '${dirPath}': ${err.message}`);
    }
  }

  /**
   * Clean up all active FFmpeg child processes on NestJS shutdown
   */
  onApplicationShutdown(signal?: string): void {
    this.logger.log(`NestJS application shutting down (${signal}). Terminating all FFmpeg processes...`);
    for (const [cameraId, entry] of this.activeProcesses.entries()) {
      try {
        if (process.platform === 'win32' && entry.pid) {
          try {
            const { execSync } = require('child_process');
            execSync(`taskkill /PID ${entry.pid} /T /F`, { stdio: 'ignore' });
          } catch {}
        } else {
          entry.process.kill('SIGKILL');
        }
      } catch {}
      this.cleanHlsDirectory(entry.outputDir);
    }
    this.activeProcesses.clear();
  }
}
