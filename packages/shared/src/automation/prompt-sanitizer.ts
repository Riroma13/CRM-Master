export interface AiPrompt {
  system?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface SanitizationResult {
  prompt: AiPrompt;
  valid: boolean;
  errors: string[];
}

export interface PromptSanitizer {
  sanitize(prompt: AiPrompt): AiPrompt;
  validate(prompt: AiPrompt): SanitizationResult;
}
