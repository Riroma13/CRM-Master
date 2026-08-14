import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), patch: vi.fn() } }));

describe('SettingsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads and saves the identity fields', async () => {
    vi.mocked(api.get).mockResolvedValue({ id: 'a', slug: 'acme', name: 'Acme', logo: null, isActive: true });
    vi.mocked(api.patch).mockResolvedValue({ id: 'a', slug: 'acme', name: 'New Acme', logo: null, isActive: true });
    render(<SettingsPage />);
    expect(await screen.findByDisplayValue('Acme')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre del negocio'), { target: { value: 'New Acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/v1/tenant/settings', { name: 'New Acme', logo: null }, { auth: true }));
  });

  it('shows validation and failed-save messages', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('load failed'));
    render(<SettingsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la configuración');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('validates an empty name and reports a failed save', async () => {
    vi.mocked(api.get).mockResolvedValue({ id: 'a', slug: 'acme', name: 'Acme', logo: null, isActive: true });
    vi.mocked(api.patch).mockRejectedValue(new Error('save failed'));
    render(<SettingsPage />);
    const name = await screen.findByDisplayValue('Acme');
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El nombre del negocio es obligatorio');
    fireEvent.change(name, { target: { value: 'New Acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar la configuración');
  });
});
