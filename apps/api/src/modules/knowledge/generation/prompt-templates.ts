import type { SourceType, KbChunkResult, KbQuery } from '@shared/knowledge';

const SYSTEM_PROMPT =
  'Eres un asistente de IA para CRM-Master. Responde preguntas sobre los datos del tenant usando SOLO el contexto proporcionado. Si el contexto no contiene la respuesta, di que no tienes esa información. CITA LAS FUENTES usando [1], [2], etc.';

const SOURCE_LABELS: Record<SourceType, string> = {
  document: 'Documento',
  communication: 'Comunicación',
  workflow: 'Workflow',
  notification: 'Notificación',
  activity: 'Actividad',
  audit: 'Auditoría',
  integration: 'Integración',
  automation: 'Automatización',
};

export class PromptTemplates {
  buildSystemPrompt(sourceTypes?: SourceType[]): string {
    if (!sourceTypes || sourceTypes.length === 0) {
      return SYSTEM_PROMPT;
    }

    const typeLabels = sourceTypes
      .map((t) => SOURCE_LABELS[t] ?? t)
      .join(', ');
    return `${SYSTEM_PROMPT}\n\nEstás consultando específicamente: ${typeLabels}.`;
  }

  buildContext(chunks: KbChunkResult[]): string {
    return chunks
      .map((cr, i) => {
        const label = SOURCE_LABELS[cr.chunk.sourceType] ?? cr.chunk.sourceType;
        return `[${i}] (${label}: ${cr.chunk.sourceId})\n${cr.chunk.content}`;
      })
      .join('\n\n');
  }

  buildUserPrompt(query: KbQuery, context: string): string {
    return `Contexto:\n${context}\n\nPregunta: ${query.query}`;
  }

  buildMessages(
    query: KbQuery,
    chunks: KbChunkResult[],
  ): { system: string; user: string } {
    const system = this.buildSystemPrompt(query.sourceTypes);
    const context = this.buildContext(chunks);
    const user = this.buildUserPrompt(query, context);
    return { system, user };
  }
}
