import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * CPS-013 & DMP-014: Internal Auditor has read-only access.
 */
@Injectable()
export class AuditorReadOnlyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Read methods are always permitted
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Role should now be attached by RequestContextGuard
    const userRole = request.user?.role?.toString().toUpperCase() || '';

    if (userRole === 'AUDITOR' || userRole === 'INTERNAL AUDITOR' || userRole === 'INTERNAL_AUDITOR') {
      throw new ForbiddenException(
        'Internal Auditors have read-only access and are not permitted to create, update, delete, apply, or post operations.',
      );
    }

    return true;
  }
}