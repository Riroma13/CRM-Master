import { toV1 as workflowToV1 } from '../v1/mappers/workflow-response.mapper';
import { toV1 as documentToV1 } from '../v1/mappers/document-response.mapper';
import type { InternalWorkflow } from '../v1/mappers/workflow-response.mapper';
import type { InternalDocument } from '../v1/mappers/document-response.mapper';

describe('WorkflowResponseMapper', () => {
  describe('toV1', () => {
    it('should map all fields correctly', () => {
      const internal: InternalWorkflow = {
        id: 'wf-001',
        name: 'Onboarding Flow',
        status: 'completed',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        updatedAt: new Date('2026-01-15T12:00:00Z'),
      };

      const result = workflowToV1(internal);
      expect(result.id).toBe('wf-001');
      expect(result.name).toBe('Onboarding Flow');
      expect(result.status).toBe('completed');
      expect(result.createdAt).toBe('2026-01-15T10:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-15T12:00:00.000Z');
    });

    it('should use startedAt as fallback for createdAt', () => {
      const internal: InternalWorkflow = {
        id: 'wf-002',
        status: 'running',
        startedAt: new Date('2026-02-01T08:00:00Z'),
        updatedAt: new Date('2026-02-01T08:30:00Z'),
      };

      const result = workflowToV1(internal);
      expect(result.createdAt).toBe('2026-02-01T08:00:00.000Z');
    });

    it('should provide default name when missing', () => {
      const internal: InternalWorkflow = {
        id: 'wf-003',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = workflowToV1(internal);
      expect(result.name).toBe('Unnamed Workflow');
    });

    it('should handle string dates', () => {
      const internal: InternalWorkflow = {
        id: 'wf-004',
        name: 'String Date',
        status: 'failed',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T01:00:00.000Z',
      };

      const result = workflowToV1(internal);
      expect(result.createdAt).toBe('2026-03-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2026-03-01T01:00:00.000Z');
    });
  });
});

describe('DocumentResponseMapper', () => {
  describe('toV1', () => {
    it('should map all fields correctly', () => {
      const internal: InternalDocument = {
        id: 'doc-001',
        title: 'Contract Agreement',
        status: 'active',
        createdAt: new Date('2026-01-10T09:00:00Z'),
        updatedAt: new Date('2026-01-12T15:00:00Z'),
      };

      const result = documentToV1(internal);
      expect(result.id).toBe('doc-001');
      expect(result.title).toBe('Contract Agreement');
      expect(result.status).toBe('active');
      expect(result.createdAt).toBe('2026-01-10T09:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-12T15:00:00.000Z');
    });

    it('should use documentId as fallback for id', () => {
      const internal: InternalDocument = {
        documentId: 'doc-002',
        title: 'Invoice',
        status: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = documentToV1(internal);
      expect(result.id).toBe('doc-002');
    });

    it('should use name as fallback for title', () => {
      const internal: InternalDocument = {
        id: 'doc-003',
        name: 'Report Q1',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = documentToV1(internal);
      expect(result.title).toBe('Report Q1');
    });

    it('should provide defaults for missing optional fields', () => {
      const internal: InternalDocument = {
        status: 'unknown',
      };

      const result = documentToV1(internal);
      expect(result.id).toBe('unknown');
      expect(result.title).toBe('Untitled');
      expect(result.status).toBe('unknown');
    });

    it('should handle string dates', () => {
      const internal: InternalDocument = {
        id: 'doc-004',
        title: 'String Date Doc',
        status: 'active',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
      };

      const result = documentToV1(internal);
      expect(result.createdAt).toBe('2026-04-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2026-04-02T00:00:00.000Z');
    });
  });
});
