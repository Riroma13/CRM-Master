import { Injectable, Optional } from '@nestjs/common';
import { IdentityAuthorizationService } from './identity-authorization.service';
import { AuthorizationOperation } from './identity-authorization.repository';

export interface IdentityAuthorizationJob {
  tenantId: string;
  operationId: string;
  workerId: string;
}

export type AuthorizationRecovery = (operation: AuthorizationOperation) => Promise<void>;

@Injectable()
export class IdentityAuthorizationProcessor {
  constructor(
    private readonly service: IdentityAuthorizationService,
    @Optional() private readonly recover: AuthorizationRecovery = async () => undefined,
  ) {}

  async process(job: IdentityAuthorizationJob) {
    const claimed = await this.service.claim(job.tenantId, job.operationId, job.workerId);
    if (!claimed) return null;

    try {
      await this.recover(claimed);
      return this.service.complete(job.tenantId, job.operationId, job.workerId);
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'IDENTITY_PROVIDER_FAILURE';
      return this.service.fail(job.tenantId, job.operationId, job.workerId, reason);
    }
  }
}
