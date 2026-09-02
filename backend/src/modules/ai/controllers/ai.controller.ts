import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AiManagerService } from '../services/ai-manager.service.js';
import { StartAiSessionDto } from '../dto/start-ai-session.dto.js';
import { AiSessionResponseDto } from '../dto/ai-session-response.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { RoleName } from '../../auth/entities/role.entity.js';

@ApiTags('AI Video Analytics Sessions')
@Controller('ai/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiManagerService: AiManagerService) {}

  /**
   * Start AI Video Analytics Session on Camera
   * ADMIN & SUPERVISOR only
   */
  @Post('start')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Start AI analytics session on camera' })
  @ApiResponse({
    status: 200,
    description: 'AI session started successfully',
    type: AiSessionResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'AI capacity limit reached (max concurrent streams)',
  })
  async startSession(
    @Body() dto: StartAiSessionDto,
  ): Promise<AiSessionResponseDto> {
    return this.aiManagerService.startSession(dto);
  }

  /**
   * Stop AI Video Analytics Session
   * ADMIN & SUPERVISOR only
   */
  @Post(':cameraId/stop')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Stop AI analytics session on camera' })
  @ApiParam({ name: 'cameraId', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'AI session stopped successfully',
    type: AiSessionResponseDto,
  })
  async stopSession(
    @Param('cameraId', new ParseUUIDPipe({ version: '4' })) cameraId: string,
  ): Promise<AiSessionResponseDto> {
    return this.aiManagerService.stopSession(cameraId);
  }

  /**
   * List all AI analytics sessions
   */
  @Get()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiOperation({ summary: 'List all active and recent AI sessions' })
  @ApiResponse({
    status: 200,
    description: 'List of AI sessions',
    type: [AiSessionResponseDto],
  })
  async listSessions(): Promise<AiSessionResponseDto[]> {
    return this.aiManagerService.listSessions();
  }

  /**
   * Get single AI session telemetry
   */
  @Get(':cameraId')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.OPERATOR)
  @ApiOperation({ summary: 'Get AI analytics session status and telemetry' })
  @ApiParam({ name: 'cameraId', description: 'Camera UUID' })
  @ApiResponse({
    status: 200,
    description: 'AI session details',
    type: AiSessionResponseDto,
  })
  async getSession(
    @Param('cameraId', new ParseUUIDPipe({ version: '4' })) cameraId: string,
  ): Promise<AiSessionResponseDto> {
    return this.aiManagerService.getSession(cameraId);
  }
}
