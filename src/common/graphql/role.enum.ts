// src/common/graphql/role.enum.ts

import { registerEnumType } from '@nestjs/graphql';
import { Role } from '@/common/enums/role.enum';

registerEnumType(Role, { name: 'Role' });
