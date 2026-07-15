import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDocumentosPage from './page';
import type { DocumentDto } from '@/lib/api-types';

const mockDocumentos: DocumentDto[] = [
  {
    id: '1',
    filename: 'contrato-2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245760,
    category: 'contrato',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: '2',
    filename: 'factura-julio.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 102400,
    category: 'factura',
    description: 'Factura del mes de julio',
    createdAt: '2026-07-02T10:00:00Z',
  },
];

vi.mock('@/hooks/use-documentos', () => ({
  useDocumentos: vi.fn(),
}));

const { useDocumentos } = await import('@/hooks/use-documentos');

describe('AdminDocumentosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton', () => {
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.getByTestId('documentos-loading')).toBeInTheDocument();
  });

  it('renders title and upload button', () => {
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.getByText('Documentos')).toBeInTheDocument();
    // Header has the upload button; empty state also has one — use getAllByText
    const uploadButtons = screen.getAllByText('Subir documento');
    expect(uploadButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Refrescar')).toBeInTheDocument();
  });

  it('renders empty state when no documentos', () => {
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.getByTestId('documentos-empty')).toBeInTheDocument();
    expect(screen.getByText('No hay documentos')).toBeInTheDocument();
  });

  it('renders document grid with cards', () => {
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: mockDocumentos,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.getByTestId('documentos-grid')).toBeInTheDocument();
    expect(screen.getByTestId('document-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('document-card-2')).toBeInTheDocument();
    expect(screen.getByText('contrato-2026.pdf')).toBeInTheDocument();
    expect(screen.getByText('factura-julio.pdf')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const refetch = vi.fn();
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
      refetch,
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.getByText('Error al cargar documentos')).toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reintentar'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('opens upload dialog when clicking upload button', () => {
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('documentos-upload-btn'));

    expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
  });

  it('opens share dialog when clicking share on a card', () => {
    vi.mocked(useDocumentos).mockReturnValue({
      documentos: mockDocumentos,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
      createShareLink: vi.fn(),
    });

    render(<AdminDocumentosPage />);

    expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('document-share-1'));

    expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
  });
});
