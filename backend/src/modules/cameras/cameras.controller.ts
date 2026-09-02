import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RoleName } from '../auth/entities/role.entity.js';
import { CamerasService } from './cameras.service.js';
import { CreateCameraDto } from './dto/create-camera.dto.js';
import { UpdateCameraDto } from './dto/update-camera.dto.js';
import { CameraQueryDto } from './dto/camera-query.dto.js';
import { UpdateCameraStatusDto } from './dto/update-camera-status.dto.js';
import {
  SafeCameraResponseDto,
  PaginatedCameraResponseDto,
} from './dto/camera-response.dto.js';
import { GeoJSONFeatureCollectionDto } from './dto/geojson-response.dto.js';
import { CreateCameraGroupDto } from './dto/create-camera-group.dto.js';

@ApiTags('Cameras')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cameras')
export class CamerasController {
  constructor(private readonly camerasService: CamerasService) {}

  @Post()
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Register a new CCTV camera (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Camera created successfully', type: SafeCameraResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role)' })
  @ApiResponse({ status: 409, description: 'Camera code already exists' })
  async create(@Body() createDto: CreateCameraDto): Promise<SafeCameraResponseDto> {
    return this.camerasService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List cameras with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of cameras', type: PaginatedCameraResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async findAll(@Query() queryDto: CameraQueryDto): Promise<PaginatedCameraResponseDto> {
    return this.camerasService.findAll(queryDto);
  }

  @Get('geojson')
  @ApiOperation({ summary: 'Get all active cameras as RFC 7946 GeoJSON FeatureCollection (GIS-ready)' })
  @ApiResponse({ status: 200, description: 'GeoJSON FeatureCollection', type: GeoJSONFeatureCollectionDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getGeoJSON(): Promise<GeoJSONFeatureCollectionDto> {
    return this.camerasService.getGeoJSON();
  }

  @Get('districts')
  @ApiOperation({ summary: 'Get list of administrative police districts' })
  @ApiResponse({ status: 200, description: 'List of districts' })
  async getDistricts() {
    return this.camerasService.getDistricts();
  }

  @Get('police-stations')
  @ApiOperation({ summary: 'Get list of police stations (optionally filtered by districtId)' })
  @ApiQuery({ name: 'districtId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of police stations' })
  async getPoliceStations(@Query('districtId') districtId?: string) {
    return this.camerasService.getPoliceStations(districtId);
  }

  @Get('groups')
  @ApiOperation({ summary: 'List camera groups' })
  @ApiResponse({ status: 200, description: 'List of camera groups' })
  async getGroups() {
    return this.camerasService.getGroups();
  }

  @Post('groups')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Create camera group (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Camera group created' })
  async createGroup(
    @Body() dto: CreateCameraGroupDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.camerasService.createGroup(dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get camera details by ID' })
  @ApiResponse({ status: 200, description: 'Camera details', type: SafeCameraResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SafeCameraResponseDto> {
    return this.camerasService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Update camera details (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Camera updated successfully', type: SafeCameraResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  @ApiResponse({ status: 409, description: 'Camera code conflict' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCameraDto,
  ): Promise<SafeCameraResponseDto> {
    return this.camerasService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a camera (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Camera soft-deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.camerasService.softDelete(id);
  }

  @Patch(':id/status')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Update camera registry status (ADMIN / SUPERVISOR)' })
  @ApiResponse({ status: 200, description: 'Status updated', type: SafeCameraResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN or SUPERVISOR role)' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCameraStatusDto,
  ): Promise<SafeCameraResponseDto> {
    return this.camerasService.updateStatus(id, dto.status);
  }

  @Patch(':id/activate')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Activate camera (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Camera activated', type: SafeCameraResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SafeCameraResponseDto> {
    return this.camerasService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Deactivate camera (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Camera deactivated', type: SafeCameraResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'Camera not found' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SafeCameraResponseDto> {
    return this.camerasService.deactivate(id);
  }
}
