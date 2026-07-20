import { parentPort } from 'worker_threads';
import type { ExtensionAPIV1, EventEnvelope, PluginManifest } from '@shared/plugin';

interface InvokeMessage {
  pluginId: string;
  handler: 'onEvent' | 'onUpgrade';
  payload: EventEnvelope | { fromVersion: string; toVersion: string };
  manifest: PluginManifest;
  api: ExtensionAPIV1;
}

if (!parentPort) {
  throw new Error('plugin.worker.ts must be run as a Worker thread');
}

parentPort.on('message', async (msg: InvokeMessage) => {
  try {
    const { pluginId, handler, payload, manifest, api } = msg;

    const pluginFactory = new Function(`return ${manifest.name}`)();
    const module = pluginFactory();

    if (typeof module[handler] !== 'function') {
      throw new Error(`Handler '${handler}' not found in plugin '${pluginId}'`);
    }

    const result = await module[handler](payload, api);
    parentPort!.postMessage({ type: 'result', data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    parentPort!.postMessage({ type: 'error', message });
  }
});
