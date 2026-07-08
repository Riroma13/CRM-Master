import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadDialog } from './upload-dialog';

const onUpload = vi.fn();

describe('UploadDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(<UploadDialog open={false} onClose={vi.fn()} onUpload={onUpload} />);

    expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
  });

  it('renders when open with title and category options', () => {
    render(<UploadDialog open={true} onClose={vi.fn()} onUpload={onUpload} />);

    expect(screen.getByText('Subir documento')).toBeInTheDocument();
    expect(screen.getByText('Contrato')).toBeInTheDocument();
    expect(screen.getByText('Factura')).toBeInTheDocument();
    expect(screen.getByText('Informe')).toBeInTheDocument();
    expect(screen.getByText('Modelo')).toBeInTheDocument();
    expect(screen.getByText('Otro')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<UploadDialog open={true} onClose={onClose} onUpload={onUpload} />);

    fireEvent.click(screen.getByTestId('upload-dialog-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has submit button disabled when no file selected', () => {
    render(<UploadDialog open={true} onClose={vi.fn()} onUpload={onUpload} />);

    const submitBtn = screen.getByTestId('upload-submit');
    expect(submitBtn).toBeDisabled();
  });

  it('selects category when clicked', () => {
    render(<UploadDialog open={true} onClose={vi.fn()} onUpload={onUpload} />);

    const facturaBtn = screen.getByTestId('upload-category-factura');
    fireEvent.click(facturaBtn);

    // Category button should have the active style
    expect(facturaBtn.className).toContain('bg-[#0F172A]');
  });

  it('has description textarea', () => {
    render(<UploadDialog open={true} onClose={vi.fn()} onUpload={onUpload} />);

    expect(screen.getByTestId('upload-description')).toBeInTheDocument();
  });

  it('shows error for oversized files', () => {
    render(<UploadDialog open={true} onClose={vi.fn()} onUpload={onUpload} />);

    const fileInput = screen.getByTestId('upload-file-input');
    const oversizedFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf',
    });

    Object.defineProperty(fileInput, 'files', {
      value: [oversizedFile],
    });

    fireEvent.change(fileInput);

    expect(screen.getByText(/excede el tamaño máximo/)).toBeInTheDocument();
  });
});
