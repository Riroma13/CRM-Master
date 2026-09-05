import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountMenu } from './account-menu';

const { mockGetCurrentUser, mockLogout, mockRedirectToLogin } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockLogout: vi.fn(),
  mockRedirectToLogin: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  logout: mockLogout,
  redirectToLogin: mockRedirectToLogin,
}));

function renderMenu() {
  return render(<AccountMenu />);
}

describe('AccountMenu', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetCurrentUser.mockReset();
    mockLogout.mockReset();
    mockRedirectToLogin.mockReset();
    mockGetCurrentUser.mockResolvedValue({
      id: 'ba-user-a',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      role: 'admin',
    });
    mockLogout.mockResolvedValue(undefined);
    sessionStorage.clear();
    localStorage.clear();
  });

  it('provides an accessible circular trigger and keyboard-reachable popover actions', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Cuenta de usuario' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'account-menu-popover');
    expect(trigger).toHaveClass('rounded-full');

    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('id', 'account-menu-popover');
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/admin/perfil');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and outside interaction, restoring focus to the trigger', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Cuenta de usuario' });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('projects only returned identity fields and maps the admin role', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Cuenta de usuario' }));

    await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeInTheDocument());
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(mockGetCurrentUser).toHaveBeenCalledOnce();
    expect(localStorage.getItem('crm_user')).toBeNull();
    expect(sessionStorage.getItem('crm_user')).toBeNull();
  });

  it('uses a generic circular avatar and omits unavailable identity fields', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      id: 'ba-user-empty',
      name: null,
      email: '',
      role: '',
    });
    renderMenu();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cuenta de usuario' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Cuenta de usuario' }));
    expect(screen.queryByText('Administrador')).not.toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it.each([
    ['remote success', () => mockLogout.mockResolvedValueOnce(undefined)],
    ['remote failure', () => mockLogout.mockRejectedValueOnce(new Error('network failure'))],
  ])('cleans both storages and redirects in finally on %s', async (_case, configureLogout) => {
    configureLogout();
    sessionStorage.setItem('crm_session_token', 'session-token');
    sessionStorage.setItem('crm_user', 'session-user');
    sessionStorage.setItem('crm_client_name', 'session-client');
    localStorage.setItem('crm_session_token', 'local-token');
    localStorage.setItem('crm_user', 'local-user');
    localStorage.setItem('crm_client_name', 'local-client');

    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Cuenta de usuario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeDisabled();
    await waitFor(() => expect(mockRedirectToLogin).toHaveBeenCalledOnce());
    expect(mockLogout).toHaveBeenCalledOnce();
    for (const storage of [sessionStorage, localStorage]) {
      expect(storage.getItem('crm_session_token')).toBeNull();
      expect(storage.getItem('crm_user')).toBeNull();
      expect(storage.getItem('crm_client_name')).toBeNull();
    }
  });
});
