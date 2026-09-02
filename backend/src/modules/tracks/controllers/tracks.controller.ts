import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { TracksService } from '../services/tracks.service.js';
import { SyncTracksDto } from '../dto/sync-track.dto.js';
import { QueryTracksDto } from '../dto/query-tracks.dto.js';
import {
  TrackResponseDto,
  PaginatedTracksResponseDto,
  ActiveTracksResponseDto,
} from '../dto/track-response.dto.js';
import { AiServiceKeyGuard } from '../../../common/guards/ai-service-key.guard.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { RoleName } from '../../auth/entities/role.entity.js';

@ApiTags('Multi-Object Tracking (Tracks)')
@Controller()
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * Service-to-Service Track Synchronization Endpoint
   * Only trusted Python AI Engine calls with X-AI-Service-Key allowed.
   * Browser clients MUST NOT access this endpoint.
   */
  @Post('tracks/sync')
  @UseGuards(AiServiceKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchronize active track updates (Internal AI Engine Service)' })
  @ApiHeader({
    name: 'x-ai-service-key',
    description: 'Shared service-to-service secret key',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Tracks synchronized successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid service key' })
  async syncTracks(@Body() dto: SyncTracksDto): Promise<{ synchronized: number }> {
    return this.tracksService.syncTracks(dto);
  }

  /**
   * Query & Filter Historical Tracks (Authenticated Browser Clients)
   */
  @Get('tracks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List and filter object tracks' })
  @ApiResponse({ status: 200, description: 'Paginated tracks', type: PaginatedTracksResponseDto })
  async getTracks(@Query() query: QueryTracksDto): Promise<PaginatedTracksResponseDto> {
    return this.tracksService.findAll(query);
  }

  /**
   * Get single track by UUID (Authenticated Browser Clients)
   */
  @Get('tracks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single track details' })
  @ApiParam({ name: 'id', description: 'Track UUID' })
  async getTrackById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TrackResponseDto> {
    return this.tracksService.findById(id);
  }

  /**
   * Get active tracks for a specific camera (Authenticated Browser Clients)
   */
  @Get('cameras/:cameraId/tracks/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently active tracks for a camera' })
  @ApiParam({ name: 'cameraId', description: 'Camera UUID' })
  async getActiveCameraTracks(
    @Param('cameraId', new ParseUUIDPipe({ version: '4' })) cameraId: string,
  ): Promise<ActiveTracksResponseDto> {
    return this.tracksService.findActiveByCameraId(cameraId);
  }

  /**
   * Get historical tracks for a specific camera (Authenticated Browser Clients)
   */
  @Get('cameras/:cameraId/tracks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get historical tracks for a camera' })
  @ApiParam({ name: 'cameraId', description: 'Camera UUID' })
  async getCameraTracks(
    @Param('cameraId', new ParseUUIDPipe({ version: '4' })) cameraId: string,
    @Query('limit') limit?: number,
  ): Promise<TrackResponseDto[]> {
    return this.tracksService.findByCameraId(cameraId, limit);
  }
}
