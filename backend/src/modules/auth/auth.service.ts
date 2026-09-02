import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity } from './entities/user.entity.js';
import { RoleEntity, RoleName } from './entities/role.entity.js';
import { UserSessionEntity } from './entities/user-session.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfileDto;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepository: Repository<UserSessionEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Hashes a raw refresh token using SHA-256 for secure database storage.
   * Raw refresh tokens are never persisted in PostgreSQL.
   */
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Validates user credentials using bcrypt.
   * Throws generic UnauthorizedException on any failure to prevent user enumeration.
   */
  async validateUser(email: string, pass: string): Promise<UserEntity> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      relations: { role: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid email address or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email address or password');
    }

    return user;
  }

  /**
   * Generates JWT access token (15m) and signed refresh token (7d).
   */
  async generateTokens(user: UserEntity): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'cctv_jwt_access_secret_super_secure_key_2026_gujarat_police_hackathon',
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'cctv_jwt_refresh_secret_super_secure_key_2026_gujarat_police_hackathon',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 900 seconds
    };
  }

  /**
   * Authenticates user, creates refresh session, and returns token pair.
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const { accessToken, refreshToken, expiresIn } = await this.generateTokens(user);

    // Store SHA-256 fingerprint of refresh token in user_sessions
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = this.sessionRepository.create({
      userId: user.id,
      tokenHash,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
      isRevoked: false,
    });

    await this.sessionRepository.save(session);

    // Update last login timestamp
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    this.logger.log(`User '${user.email}' (${user.role.name}) logged in successfully`);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: this.mapToProfile(user),
    };
  }

  /**
   * Refreshes access token with refresh token rotation and replay protection.
   */
  async refresh(rawRefreshToken: string, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // 1. Verify token signature and expiry
    let payload: any;
    try {
      const refreshSecret = this.configService.get<string>(
        'JWT_REFRESH_SECRET',
        'cctv_jwt_refresh_secret_super_secure_key_2026_gujarat_police_hackathon',
      );
      payload = await this.jwtService.verifyAsync(rawRefreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid token type');
    }

    // 2. Check session in database by token hash
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await this.sessionRepository.findOne({
      where: {
        tokenHash,
        userId: payload.sub,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!session) {
      // Possible token reuse / replay attack -> revoke all active sessions for this user
      await this.sessionRepository.update(
        { userId: payload.sub, isRevoked: false },
        { isRevoked: true },
      );
      this.logger.warn(`Security alert: Revoked all sessions for user ${payload.sub} due to replay detection`);
      throw new UnauthorizedException('Session has expired or was revoked. Please log in again.');
    }

    // 3. Look up active user
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: { role: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is invalid or deactivated');
    }

    // 4. Invalidate old session (Token Rotation)
    await this.sessionRepository.update(session.id, { isRevoked: true });

    // 5. Issue new token pair
    const { accessToken, refreshToken: newRefreshToken, expiresIn } = await this.generateTokens(user);

    // 6. Save new session
    const newTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newSession = this.sessionRepository.create({
      userId: user.id,
      tokenHash: newTokenHash,
      ipAddress: ipAddress || session.ipAddress,
      userAgent: userAgent || session.userAgent,
      expiresAt,
      isRevoked: false,
    });

    await this.sessionRepository.save(newSession);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      user: this.mapToProfile(user),
    };
  }

  /**
   * Revokes the refresh token session on logout.
   */
  async logout(userId: string, rawRefreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.sessionRepository.update(
        { tokenHash, userId },
        { isRevoked: true },
      );
    } else {
      // Invalidate all active sessions for the user
      await this.sessionRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }

    this.logger.log(`User '${userId}' logged out`);
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Retrieves safe profile for the authenticated user.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new NotFoundException('User profile not found or account is deactivated');
    }

    return this.mapToProfile(user);
  }

  /**
   * Maps UserEntity to UserProfileDto (strips passwordHash).
   */
  mapToProfile(user: UserEntity): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role?.name || RoleName.OPERATOR,
      permissions: user.role?.permissions || [],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
