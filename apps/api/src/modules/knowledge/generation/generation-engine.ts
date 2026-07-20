import { Injectable, Logger } from '@nestjs/common';
import type {
  KbQuery,
  KbChunkResult,
  KbAnswer,
} from '@shared/knowledge';
import { ProviderRegistry } from '../../automation/ai/provider-registry';
import { PromptTemplates } from './prompt-templates';
import { CitationExtractor } from './citation-extractor';

interface GenerationOptions {
  providerId?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_PROVIDER_ID = 'openai';

@Injectable()
export class GenerationEngine {
  private readonly logger = new Logger(GenerationEngine.name);
  private readonly promptTemplates: PromptTemplates;
  private readonly citationExtractor: CitationExtractor;

  constructor(private readonly providerRegistry: ProviderRegistry) {
    this.promptTemplates = new PromptTemplates();
    this.citationExtractor = new CitationExtractor();
  }

  async answer(
    query: KbQuery,
    chunks: KbChunkResult[],
    _tenantId: string,
    options?: GenerationOptions,
  ): Promise<KbAnswer> {
    const providerId = options?.providerId ?? DEFAULT_PROVIDER_ID;
    const provider = this.providerRegistry.getProvider(providerId);

    if (!provider) {
      throw new Error(`AI provider not found: ${providerId}`);
    }

    if (chunks.length === 0) {
      return this.buildEmptyAnswer(query, providerId);
    }

    const { system, user } = this.promptTemplates.buildMessages(query, chunks);

    const response = await provider.generate(
      {
        system,
        messages: [{ role: 'user', content: user }],
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 1024,
      },
      { model: providerId as any },
    );

    const citations = this.citationExtractor.extractCitations(
      response.content,
      chunks,
    );

    return {
      query: query.query,
      answer: response.content,
      citations,
      chunks: query.includeChunks ? chunks : undefined,
      generatedAt: new Date().toISOString(),
      model: response.model ?? providerId,
    };
  }

  private buildEmptyAnswer(query: KbQuery, model: string): KbAnswer {
    return {
      query: query.query,
      answer:
        'No tengo información disponible para responder tu pregunta. El contexto proporcionado está vacío.',
      citations: [],
      generatedAt: new Date().toISOString(),
      model,
    };
  }
}
