import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PreferenciasPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({ api: { patch: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('lucide-react', () => ({ Mail: () => null, MessageCircle: () => null, Bell: () => null }));

const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('Tenant preferences security contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('crm_user', JSON.stringify({ email: 'forged@example.test' }));
    vi.mocked(api.patch).mockResolvedValue({});
  });

  it('submits notification flags only, never caller identity or credentials', async () => {
    render(<PreferenciasPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Guardar preferencias/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch).toHaveBeenCalledWith('/api/v1/tenant/preferencias', {
      notifEmail: true,
      notifWhatsApp: false,
    }, { auth: true });
  });

  it('has no password PATCH/page/navigation caller remaining', () => {
    expect(source('./page.tsx')).not.toContain('tenant/profile');
     expect(existsSync(resolve(__dirname, '../cambiar-password/page.tsx'))).toBe(false);
    expect(readFileSync(resolve(__dirname, '../../../../config/navigation/admin.ts'), 'utf8')).not.toContain('cambiarPassword');
  });
});
