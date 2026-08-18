import { ConflictException, Injectable } from '@nestjs/common';
import { PLUGIN_EXECUTION_DISABLED } from '@shared/plugin/plugin.types';

@Injectable()
export class WorkerPoolService {
  async execute(pluginId: string, handler: string, payload: unknown): Promise<unknown> {
    void pluginId;
    void handler;
    void payload;
    throw new ConflictException({ code: PLUGIN_EXECUTION_DISABLED });
  }

  get poolSize(): number { return 0; }
  get activeCount(): number { return 0; }
  async shutdown(): Promise<void> { return Promise.resolve(); }
}
