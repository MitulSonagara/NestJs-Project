import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

/*
Workflow : 
  client -> request -> jwtAuthGuard -> Valiadate token & attach current user to request -> roleGuard check the user role
         -> If role match : Allow
         -> If role not match : Forbidden Exception
*/

@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector -> utility that will help to access the metadata

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // retrives the roles metadata set by the roles decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), //method level metadata
      context.getClass(), //class level metadata
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException('User not authenticated');

    const hasRequiredRole = requiredRoles.some((role) => user.role === role);

    if (!hasRequiredRole) throw new ForbiddenException('Permission Denied');

    return true;
  }
}
