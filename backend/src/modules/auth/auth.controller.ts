import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RoleName } from './entities/role.entity.js';
import { UserEntity } from './entities/user.entity.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Officer login — issues access token and sets HttpOnly refresh cookie' })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error (malformed email or password)' })
  @ApiResponse({ status: 401, description: 'Invalid email address or password' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(loginDto, ip, userAgent);

    // Set refresh token in HttpOnly secure cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new short-lived access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ): Promise<AuthResponseDto> {
    // Read from HttpOnly cookie first, with fallback to body for API clients
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || bodyToken;

    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refresh(token, ip, userAgent);

    // Set rotated refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke active refresh session and clear HttpOnly cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    const result = await this.authService.logout(userId, rawRefreshToken);

    // Clear refresh cookie
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated officer profile (safe representation)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfileDto> {
    return this.authService.getProfile(userId);
  }

  /**
   * DEV / TEST ONLY ENDPOINTS:
   * Used for explicit verification of 401 Unauthenticated vs 403 Forbidden.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('dev/test-auth')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEV/TEST ONLY] Verify authenticated access' })
  testAuth(@CurrentUser() user: UserEntity) {
    return {
      message: 'Authenticated successfully',
      officer: {
        id: user.id,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('dev/test-admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEV/TEST ONLY] Verify ADMIN-only role authorization (403 for other roles)' })
  testAdminOnly(@CurrentUser() user: UserEntity) {
    return {
      message: 'Admin authorization confirmed',
      adminId: user.id,
    };
  }
}
