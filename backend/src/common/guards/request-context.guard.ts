import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequestContextGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // We expect the frontend to send x-user-id
    const userId = request.headers['x-user-id'];
    
    if (!userId) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        throw new UnauthorizedException('x-user-id header is required for write operations');
      }
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user ID');
    }

    // Attach user to request (role comes directly from DB)
    request.user = {
      id: user.id,
      name: user.name,
      role: user.role,
    };

    return true;
  }
}
