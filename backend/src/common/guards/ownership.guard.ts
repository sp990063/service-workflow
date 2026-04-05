import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNERSHIP_KEY = 'ownership';
export const RequireOwnership = () => (target: any, key?: string, descriptor?: PropertyDescriptor) => {
  if (descriptor) {
    Reflect.defineMetadata(OWNERSHIP_KEY, true, descriptor.value);
  } else {
    Reflect.defineMetadata(OWNERSHIP_KEY, true, target);
  }
  return descriptor || target;
};

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireOwnership = this.reflector.getAllAndOverride<boolean>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireOwnership) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    if (!user || !resourceId) {
      return true; // Let other guards handle missing data
    }

    // For workflows - check if user owns the workflow or is ADMIN/MANAGER
    const workflowService = request.scope?.workflowsService;
    if (workflowService) {
      const workflow = await workflowService.findById(resourceId);
      if (workflow && workflow.userId !== user.id && !['ADMIN', 'MANAGER'].includes(user.role)) {
        throw new ForbiddenException('You do not have permission to access this resource');
      }
    }

    return true;
  }
}
