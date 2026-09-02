import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { AnprService } from '../services/anpr.service.js';
import { SyncAnprDto } from '../dto/sync-anpr.dto.js';
import { QueryAnprDto } from '../dto/query-anpr.dto.js';
import {
  AnprResponseDto,
  PaginatedAnprResponseDto,
} from '../dto/anpr-response.dto.js';
import { AiServiceKeyGuard } from '../../../common/guards/ai-service-key.guard.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { RoleName } from '../../auth/entities/role.entity.js';

@Controller('anpr')
export class AnprController {
  constructor(private readonly anprService: AnprService) {}

  /**
   * AI Engine Sync Endpoint
   * Restricted strictly to AI microservice via X-AI-Service-Key
   */
  @Post('sync')
  @UseGuards(AiServiceKeyGuard)
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncAnprDto): Promise<{ synchronized: number }> {
    return this.anprService.syncObservations(dto);
  }

  /**
   * Search plates across all cameras
   */
  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: number,
  ): Promise<AnprResponseDto[]> {
    return this.anprService.searchPlates(q, limit ? Number(limit) : 20);
  }

  /**
   * Safe delivery of ANPR snapshots (plate crops / vehicle snapshots)
   */
  @Get('snapshots/*')
  async serveSnapshot(@Param() params: any, @Res() res: Response): Promise<void> {
    const rawSubpath = params[0] || '';
    // Prevent path traversal
    const safePath = path.normalize(rawSubpath).replace(/^(\.\.[\/\\])+/, '');
    const baseDir = path.resolve(process.cwd(), 'runtime', 'anpr');
    const fullPath = path.resolve(baseDir, safePath);

    if (!fullPath.startsWith(baseDir)) {
      throw new BadRequestException('Access denied: directory traversal detected');
    }

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      throw new NotFoundException('Snapshot image not found');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fullPath).pipe(res);
  }

  /**
   * List ANPR records with filtering and pagination
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  async findAll(@Query() query: QueryAnprDto): Promise<PaginatedAnprResponseDto> {
    return this.anprService.findAll(query);
  }

  /**
   * Get single ANPR record by UUID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AnprResponseDto> {
    return this.anprService.findById(id);
  }
}

/**
 * Nested camera ANPR controller to support GET /api/cameras/:cameraId/anpr
 */
@Controller('cameras/:cameraId/anpr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
export class CameraAnprController {
  constructor(private readonly anprService: AnprService) {}

  @Get()
  async getByCamera(
    @Param('cameraId', ParseUUIDPipe) cameraId: string,
    @Query('limit') limit?: number,
  ): Promise<AnprResponseDto[]> {
    return this.anprService.findByCameraId(cameraId, limit ? Number(limit) : 20);
  }
}
