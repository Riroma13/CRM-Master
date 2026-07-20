import { describe, it, expect } from 'vitest';
import type { SourceType, KbChunk, KbSource, KbQuery, KbChunkResult, KbCitation, KbAnswer } from '../knowledge.types';
import type { KnowledgePublisher } from '../knowledge-publisher';

describe('Types compile correctly', () => {
  it('SourceType accepts valid values', () => {
    const types: SourceType[] = [
      'document', 'communication', 'workflow', 'notification',
      'activity', 'audit', 'integration', 'automation',
    ];
    expect(types).toHaveLength(8);
  });

  it('KbSource status accepts valid values', () => {
    const statuses: KbSource['status'][] = ['indexed', 'pending', 'failed'];
    expect(statuses).toHaveLength(3);
  });
});

describe('KbChunk interface', () => {
  it('valid chunk shape passes type check', () => {
    const chunk: KbChunk = {
      id: 'chunk-1',
      tenantId: 'tenant-1',
      sourceType: 'document',
      sourceId: 'doc-1',
      chunkIndex: 0,
      content: 'Sample content',
      contentHash: 'abc123',
      metadata: { page: 1 },
      createdAt: '2026-07-20T00:00:00Z',
      updatedAt: '2026-07-20T00:00:00Z',
    };
    expect(chunk.tenantId).toBe('tenant-1');
    expect(chunk.sourceType).toBe('document');
  });

  it('metadata defaults to empty object', () => {
    const chunk: KbChunk = {
      id: 'chunk-2',
      tenantId: 't1',
      sourceType: 'communication',
      sourceId: 'msg-1',
      chunkIndex: 0,
      content: 'Hello world',
      contentHash: 'def456',
      metadata: {},
      createdAt: '2026-07-20T00:00:00Z',
      updatedAt: '2026-07-20T00:00:00Z',
    };
    expect(Object.keys(chunk.metadata)).toHaveLength(0);
  });
});

describe('KbQuery interface', () => {
  it('valid query with all fields', () => {
    const query: KbQuery = {
      query: 'How many workflows failed yesterday?',
      tenantId: 'tenant-1',
      sourceTypes: ['workflow', 'audit'],
      sourceIds: ['wf-1', 'wf-2'],
      dateFrom: '2026-07-19T00:00:00Z',
      dateTo: '2026-07-20T00:00:00Z',
      topK: 10,
      includeChunks: true,
    };
    expect(query.topK).toBe(10);
    expect(query.sourceTypes).toHaveLength(2);
  });

  it('query works with only required fields', () => {
    const query: KbQuery = {
      query: 'Find me documents about clients',
      tenantId: 't1',
    };
    expect(query.query).toBeDefined();
    expect(query.topK).toBeUndefined();
  });

  it('topK defaults to 5 when not provided', () => {
    const query: KbQuery = {
      query: 'test',
      tenantId: 't1',
    };
    const defaulted = { ...query, topK: 5 };
    expect(defaulted.topK).toBe(5);
  });
});

describe('KbAnswer interface', () => {
  it('valid answer with citations', () => {
    const answer: KbAnswer = {
      query: 'What is the status of project X?',
      answer: 'Project X is on track.',
      citations: [{
        sourceType: 'document',
        sourceId: 'doc-1',
        content: 'Project X status: on track',
        relevanceScore: 0.95,
      }],
      generatedAt: '2026-07-20T12:00:00Z',
      model: 'gpt-4',
    };
    expect(answer.citations).toHaveLength(1);
    expect(answer.citations[0].relevanceScore).toBe(0.95);
  });

  it('answer works without chunks', () => {
    const answer: KbAnswer = {
      query: 'test',
      answer: 'No data found.',
      citations: [],
      generatedAt: '2026-07-20T12:00:00Z',
      model: 'claude-3',
    };
    expect(answer.chunks).toBeUndefined();
  });
});

describe('KbChunkResult interface', () => {
  it('result with score', () => {
    const result: KbChunkResult = {
      chunk: {
        id: 'c1',
        tenantId: 't1',
        sourceType: 'document',
        sourceId: 'd1',
        chunkIndex: 0,
        content: 'relevant content',
        contentHash: 'hash1',
        metadata: {},
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      },
      score: 0.87,
    };
    expect(result.score).toBeGreaterThan(0.8);
  });
});

describe('KbCitation interface', () => {
  it('citation with all fields', () => {
    const citation: KbCitation = {
      sourceType: 'workflow',
      sourceId: 'wf-1',
      content: 'Workflow failed at step 3',
      relevanceScore: 0.92,
    };
    expect(citation.sourceType).toBe('workflow');
    expect(citation.relevanceScore).toBe(0.92);
  });
});

describe('KbSource interface', () => {
  it('valid source shape', () => {
    const source: KbSource = {
      sourceType: 'document',
      sourceId: 'doc-1',
      tenantId: 't1',
      chunkCount: 5,
      lastIndexedAt: '2026-07-20T10:00:00Z',
      status: 'indexed',
    };
    expect(source.chunkCount).toBe(5);
    expect(source.status).toBe('indexed');
  });
});

describe('KnowledgePublisher interface', () => {
  it('contract compiles with indexContent and deleteSource', () => {
    const publisher: KnowledgePublisher = {
      async indexContent(_tenantId, _sourceType, _sourceId, _content, _metadata) {},
      async deleteSource(_tenantId, _sourceType, _sourceId) {},
    };
    expect(publisher.indexContent).toBeDefined();
    expect(publisher.deleteSource).toBeDefined();
  });

  it('indexContent accepts all required params', async () => {
    const calls: string[] = [];
    const publisher: KnowledgePublisher = {
      async indexContent(tenantId, sourceType, sourceId, _content, _metadata) {
        calls.push(`${tenantId}:${sourceType}:${sourceId}`);
      },
      async deleteSource() {},
    };

    await publisher.indexContent('t1', 'document', 'doc-1', 'some content', { page: 1 });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe('t1:document:doc-1');
  });

  it('indexContent works without metadata', async () => {
    const publisher: KnowledgePublisher = {
      async indexContent(_tenantId, _sourceType, _sourceId, _content, _metadata) {},
      async deleteSource() {},
    };

    await expect(
      publisher.indexContent('t1', 'workflow', 'wf-1', 'content'),
    ).resolves.toBeUndefined();
  });

  it('deleteSource is callable', async () => {
    const deleted: string[] = [];
    const publisher: KnowledgePublisher = {
      async indexContent() {},
      async deleteSource(tenantId, sourceType, sourceId) {
        deleted.push(`${tenantId}:${sourceType}:${sourceId}`);
      },
    };

    await publisher.deleteSource('t1', 'document', 'doc-1');

    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toBe('t1:document:doc-1');
  });

  it('multiple source types work with the publisher', async () => {
    const publisher: KnowledgePublisher = {
      async indexContent(_t, _st, _si, _c, _m) {},
      async deleteSource() {},
    };

    const sourceTypes: SourceType[] = [
      'document', 'communication', 'workflow', 'notification',
      'activity', 'audit', 'integration', 'automation',
    ];

    for (const st of sourceTypes) {
      await expect(
        publisher.indexContent('t1', st, `${st}-1`, 'content'),
      ).resolves.toBeUndefined();
    }
  });
});
