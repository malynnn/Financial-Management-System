import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * CPS-013: The system shall allow the Internal Auditor to retrieve collection
 * records and audit history but shall reject create, update, delete, apply,
 * and post operations performed by the Internal Auditor.
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

    // Check role from header or body
    const userRole = (
      request.headers['x-user-role'] ||
      request.body?.actorRole ||
      request.user?.role ||
      ''
    ).toString().toUpperCase();

    if (userRole === 'AUDITOR' || userRole === 'INTERNAL AUDITOR' || userRole === 'INTERNAL_AUDITOR') {
      throw new ForbiddenException(
        'CPS-013: Internal Auditors have read-only access and are not permitted to create, update, delete, apply, or post collection operations.',
      );
    }

    return true;
  }
}