export type AiModel = 'gpt-4' | 'claude-3' | 'llama-3' | string;

export interface AiPrompt {
  system?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface AiOptions {
  model?: AiModel;
  timeout?: number;
  idempotencyKey?: string;
}

export interface AiResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  durationMs: number;
}

export interface AiClassification {
  category: string;
  confidence: number;
}

export interface AiProvider {
  readonly id: string;
  generate(prompt: AiPrompt, opts?: AiOptions): Promise<AiResponse>;
  summarize(text: string, opts?: AiOptions): Promise<AiResponse>;
  classify(input: string, categories: string[], opts?: AiOptions): Promise<AiClassification>;
}
