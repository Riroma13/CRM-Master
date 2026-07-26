import { PrismaClient } from '@prisma/client';
import { createAuth } from '../src/common/auth';

const prisma = new PrismaClient();

export const auth = createAuth(prisma);
