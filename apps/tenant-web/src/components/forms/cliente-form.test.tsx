import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClienteForm } from './cliente-form';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), patch: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Save: () => null,
}));

describe('ClienteForm contact clearing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.patch).mockResolvedValue({});
  });

  it('sends null for cleared optional contacts during edit', async () => {
    render(
      <ClienteForm
        initial={{
          id: 'client-a',
          nombre: 'Client A',
          email: 'contact@example.test',
          telefono: '+34123456789',
          tipoNegocio: '',
          estadoRelacion: 'Activo',
          saludGeneral: '🟢',
          tags: '',
          notasGenerales: '',
        }}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('contacto@empresa.com'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('+34 600 000 000'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      '/api/v1/tenant/clientes/client-a',
      expect.objectContaining({ email: null, telefono: null }),
      { auth: true },
    ));
  });
});
