import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { RoleName } from '../../auth/entities/role.entity.js';
import { StreamsService } from '../services/streams.service.js';
import { FfmpegProcessManagerService } from '../services/ffmpeg-process-manager.service.js';
import {
  StreamResponseDto,
  StreamStatusResponseDto,
} from '../dto/stream-response.dto.js';

@ApiTags('streams')
@Controller()
export class StreamsController {
  constructor(
    private readonly streamsService: StreamsService,
    private readonly ffmpegManager: FfmpegProcessManagerService,
  ) {}

  /**
   * Start live video stream ingestion (ADMIN / SUPERVISOR / OPERATOR)
   */
  @Post('cameras/:id/stream/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start live video stream ingestion for a camera' })
  @ApiParam({ name: 'id', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'Stream started or already running',
    type: StreamResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Camera inactive or stream startup failure' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async startStream(@Param('id') cameraId: string): Promise<StreamResponseDto> {
    return this.streamsService.startStream(cameraId);
  }

  /**
   * Stop live video stream (ADMIN / SUPERVISOR / OPERATOR)
   */
  @Post('cameras/:id/stream/stop')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop live video stream for a camera' })
  @ApiParam({ name: 'id', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'Stream stopped successfully',
    type: StreamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Camera or stream not found' })
  async stopStream(@Param('id') cameraId: string): Promise<StreamResponseDto> {
    return this.streamsService.stopStream(cameraId);
  }

  /**
   * Restart live video stream (ADMIN / SUPERVISOR only)
   */
  @Post('cameras/:id/stream/restart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart live video stream (ADMIN / SUPERVISOR)' })
  @ApiParam({ name: 'id', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'Stream restarted successfully',
    type: StreamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Operators cannot restart)' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async restartStream(@Param('id') cameraId: string): Promise<StreamResponseDto> {
    return this.streamsService.restartStream(cameraId);
  }

  /**
   * Get stream session details (Authenticated)
   */
  @Get('cameras/:id/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current stream session details for a camera' })
  @ApiParam({ name: 'id', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'Stream session metadata',
    type: StreamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async getStream(@Param('id') cameraId: string): Promise<StreamResponseDto> {
    return this.streamsService.getStream(cameraId);
  }

  /**
   * Get lightweight stream status (Authenticated)
   */
  @Get('cameras/:id/stream/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current stream status (lightweight polling)' })
  @ApiParam({ name: 'id', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'Stream status details',
    type: StreamStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async getStreamStatus(
    @Param('id') cameraId: string,
  ): Promise<StreamStatusResponseDto> {
    return this.streamsService.getStreamStatus(cameraId);
  }

  /**
   * Safe HLS Segment Delivery Endpoint
   * Delivers .m3u8 playlists and .ts media chunks with strict path traversal prevention
   */
  @Get('streams/hls/:cameraId/:file')
  @ApiOperation({ summary: 'Deliver HLS playlist or video segment' })
  @ApiParam({ name: 'cameraId', description: 'Camera UUID' })
  @ApiParam({ name: 'file', description: 'HLS filename (index.m3u8 or segment-XXX.ts)' })
  async deliverHlsSegment(
    @Param('cameraId') cameraId: string,
    @Param('file') fileName: string,
    @Res() res: Response,
  ): Promise<void> {
    // 1. Strict filename and UUID sanitization against directory traversal
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(fileName) || fileName.includes('..')) {
      throw new BadRequestException('Invalid HLS filename format');
    }

    const outputDir = this.ffmpegManager.getHlsOutputDir(cameraId);
    const targetFile = path.resolve(outputDir, fileName);

    // Verify resolved path is strictly inside outputDir
    if (!targetFile.startsWith(outputDir)) {
      throw new BadRequestException('Access denied: path traversal attempt detected');
    }

    if (!fs.existsSync(targetFile)) {
      throw new NotFoundException(`HLS file '${fileName}' not available for stream '${cameraId}'`);
    }

    // Set CORS headers for browser player access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (fileName.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (fileName.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/MP2T');
      res.setHeader('Cache-Control', 'public, max-age=60');
    }

    const stream = fs.createReadStream(targetFile);
    stream.pipe(res);
  }
}
