import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentCard } from './document-card';
import type { DocumentDto } from '@/lib/api-types';

const mockDocumento: DocumentDto = {
  id: '1',
  filename: 'contrato-2026.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 245760,
  category: 'contrato',
  createdAt: '2026-07-01T10:00:00Z',
};

const mockDocumentoWithShares: DocumentDto = {
  ...mockDocumento,
  shareLinks: [
    {
      id: 'link-1',
      token: 'shr_abc',
      url: 'https://example.com/shr_abc',
      downloadCount: 2,
      createdAt: '2026-07-01T10:00:00Z',
    },
  ],
};

const mockDocumentoWithDescription: DocumentDto = {
  ...mockDocumento,
  description: 'Contrato de servicios 2026',
  category: 'contrato',
};

const onShare = vi.fn();
const onDelete = vi.fn();

describe('DocumentCard', () => {
  it('renders filename and category badge', () => {
    render(
      <DocumentCard
        documento={mockDocumento}
        onShare={onShare}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('contrato-2026.pdf')).toBeInTheDocument();
    expect(screen.getByText('Contrato')).toBeInTheDocument();
  });

  it('renders formatted size and date', () => {
    render(
      <DocumentCard
        documento={mockDocumento}
        onShare={onShare}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText(/240\.0\s*KB/)).toBeInTheDocument();
    expect(screen.getByText('01/07/2026')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(
      <DocumentCard
        documento={mockDocumentoWithDescription}
        onShare={onShare}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Contrato de servicios 2026')).toBeInTheDocument();
  });

  it('shows share link count when shareLinks exist', () => {
    render(
      <DocumentCard
        documento={mockDocumentoWithShares}
        onShare={onShare}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('1 enlace')).toBeInTheDocument();
  });

  it('calls onShare when share button is clicked', () => {
    render(
      <DocumentCard
        documento={mockDocumento}
        onShare={onShare}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('document-share-1'));
    expect(onShare).toHaveBeenCalledWith(mockDocumento);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <DocumentCard
        documento={mockDocumento}
        onShare={onShare}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId('document-delete-1'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
