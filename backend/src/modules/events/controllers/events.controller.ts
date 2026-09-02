import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { EventsService } from '../services/events.service.js';
import { IngestEventDto } from '../dto/ingest-event.dto.js';
import { QueryEventsDto } from '../dto/query-events.dto.js';
import {
  EventResponseDto,
  PaginatedEventsResponseDto,
} from '../dto/event-response.dto.js';
import { AiServiceKeyGuard } from '../../../common/guards/ai-service-key.guard.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { RoleName } from '../../auth/entities/role.entity.js';

@ApiTags('AI Detection Events')
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Service-to-Service AI Event Ingestion Endpoint
   * Only trusted Python AI Engine calls with X-AI-Service-Key allowed
   */
  @Post('events/ingest')
  @UseGuards(AiServiceKeyGuard)
  @ApiOperation({ summary: 'Ingest AI detection event (Internal Service)' })
  @ApiHeader({
    name: 'x-ai-service-key',
    description: 'Shared service-to-service secret key',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Event ingested successfully', type: EventResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid service key' })
  async ingestEvent(@Body() dto: IngestEventDto): Promise<EventResponseDto> {
    return this.eventsService.ingestEvent(dto);
  }

  /**
   * Query & Filter Detection Events (Authenticated)
   */
  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List and filter AI detection events' })
  @ApiResponse({ status: 200, description: 'Paginated detection events', type: PaginatedEventsResponseDto })
  async getEvents(@Query() query: QueryEventsDto): Promise<PaginatedEventsResponseDto> {
    return this.eventsService.findAll(query);
  }

  /**
   * Get single event by UUID (Authenticated)
   */
  @Get('events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single AI event details' })
  @ApiParam({ name: 'id', description: 'Event UUID' })
  async getEventById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.findById(id);
  }

  /**
   * Get recent events for a specific camera (Authenticated)
   */
  @Get('cameras/:cameraId/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent detection events for a camera' })
  @ApiParam({ name: 'cameraId', description: 'Camera UUID' })
  async getCameraEvents(
    @Param('cameraId', new ParseUUIDPipe({ version: '4' })) cameraId: string,
    @Query('limit') limit?: number,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.findByCameraId(cameraId, limit);
  }

  /**
   * Deliver Snapshot Image
   * Serves snapshot JPEG with strict path traversal checks and CORS headers
   */
  @Get('events/snapshots/:filename')
  @ApiOperation({ summary: 'Deliver detection snapshot image' })
  @ApiParam({ name: 'filename', description: 'Snapshot filename' })
  async deliverSnapshot(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = this.eventsService.getSnapshotFilePath(filename);

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(HttpStatus.OK).sendFile(filePath);
  }
}
