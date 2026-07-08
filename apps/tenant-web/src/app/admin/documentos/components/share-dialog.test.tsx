import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareDialog } from './share-dialog';

const onCreateLink = vi.fn();

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <ShareDialog
        open={false}
        onClose={vi.fn()}
        filename="test.pdf"
        onCreateLink={onCreateLink}
      />,
    );

    expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
  });

  it('renders when open with title and filename', () => {
    render(
      <ShareDialog
        open={true}
        onClose={vi.fn()}
        filename="contrato-2026.pdf"
        onCreateLink={onCreateLink}
      />,
    );

    expect(screen.getByText('Compartir documento')).toBeInTheDocument();
    expect(screen.getByText('contrato-2026.pdf')).toBeInTheDocument();
  });

  it('renders expiration options', () => {
    render(
      <ShareDialog
        open={true}
        onClose={vi.fn()}
        filename="test.pdf"
        onCreateLink={onCreateLink}
      />,
    );

    expect(screen.getByText('1 hora')).toBeInTheDocument();
    expect(screen.getByText('24 horas')).toBeInTheDocument();
    expect(screen.getByText('7 días')).toBeInTheDocument();
    expect(screen.getByText('30 días')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ShareDialog
        open={true}
        onClose={onClose}
        filename="test.pdf"
        onCreateLink={onCreateLink}
      />,
    );

    fireEvent.click(screen.getByTestId('share-dialog-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows URL input and copy button on successful creation', async () => {
    onCreateLink.mockResolvedValue({
      url: 'https://example.com/shared/shr_test123',
    });

    render(
      <ShareDialog
        open={true}
        onClose={vi.fn()}
        filename="test.pdf"
        onCreateLink={onCreateLink}
      />,
    );

    fireEvent.click(screen.getByTestId('share-create'));

    await waitFor(() => {
      expect(screen.getByTestId('share-url-input')).toBeInTheDocument();
    });

    const urlInput = screen.getByTestId('share-url-input') as HTMLInputElement;
    expect(urlInput.value).toBe('https://example.com/shared/shr_test123');

    expect(screen.getByTestId('share-copy-url')).toBeInTheDocument();
  });

  it('shows error state when creation fails', async () => {
    onCreateLink.mockRejectedValue(new Error('Error al generar enlace'));

    render(
      <ShareDialog
        open={true}
        onClose={vi.fn()}
        filename="test.pdf"
        onCreateLink={onCreateLink}
      />,
    );

    fireEvent.click(screen.getByTestId('share-create'));

    await waitFor(() => {
      expect(screen.getByText('Error al generar enlace')).toBeInTheDocument();
    });
  });
});
