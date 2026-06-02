import { SetMetadata } from '@nestjs/common';

export const SKIP_RBAC = 'skipRbac';

export const SkipRbac = () => SetMetadata(SKIP_RBAC, true);