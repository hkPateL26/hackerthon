import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiServiceKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const serviceKeyHeader =
      request.headers['x-ai-service-key'] ||
      request.headers['x-service-key'];

    const authHeader = request.headers['authorization'];
    let bearerKey: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerKey = authHeader.substring(7);
    }

    const providedKey = serviceKeyHeader || bearerKey;
    if (!providedKey) {
      throw new UnauthorizedException('Missing AI service authentication key');
    }

    const expectedKey =
      this.configService.get<string>('AI_SERVICE_KEY') ||
      this.configService.get<string>('AI_ENGINE_API_KEY') ||
      'gujarat_police_internal_ai_key_2026';

    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid AI service authentication key');
    }

    return true;
  }
}
