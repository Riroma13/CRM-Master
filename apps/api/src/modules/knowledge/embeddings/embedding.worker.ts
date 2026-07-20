import { parentPort } from 'worker_threads';

let extractor: any = null;
const EMBEDDING_DIM = 384;

async function getExtractor() {
  if (!extractor) {
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    );
  }
  return extractor;
}

interface EmbedMessage {
  id: string;
  type: 'embed';
  texts: string[];
}

interface TerminateMessage {
  type: 'terminate';
}

const pp = parentPort;
if (pp) {
  pp.on('message', async (message: EmbedMessage | TerminateMessage) => {
    try {
      if (message.type === 'terminate') {
        process.exit(0);
      }

      if (message.type === 'embed') {
        const model = await getExtractor();
        const output = await model(message.texts, {
          pooling: 'mean',
          normalize: true,
        });

        const embeddings: number[][] = [];
        for (let i = 0; i < message.texts.length; i++) {
          const start = i * EMBEDDING_DIM;
          const end = start + EMBEDDING_DIM;
          const slice = Array.from(output.data.slice(start, end)) as number[];
          embeddings.push(slice);
        }

        pp.postMessage({
          id: message.id,
          type: 'result',
          embeddings,
        });
      }
    } catch (error: any) {
      pp.postMessage({
        id: (message as EmbedMessage).id,
        type: 'error',
        error: error?.message ?? 'Unknown error',
      });
    }
  });
}
