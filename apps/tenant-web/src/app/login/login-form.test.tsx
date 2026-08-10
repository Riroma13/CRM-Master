import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginForm from './login-form';

const { push, beginGoogleLogin } = vi.hoisted(() => ({
  push: vi.fn(),
  beginGoogleLogin: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth', () => ({
  login: vi.fn(),
  beginGoogleLogin,
}));

describe('LoginForm social login entry point', () => {
  beforeEach(() => {
    push.mockReset();
    beginGoogleLogin.mockReset();
  });

  it('shows Google initiation only on the admin login tab', async () => {
    render(<LoginForm />);

    const googleButton = screen.getByRole('button', { name: /continuar con google/i });
    expect(googleButton).toBeInTheDocument();
    fireEvent.click(googleButton);
    expect(beginGoogleLogin).toHaveBeenCalledOnce();

    const clientTab = screen.getByRole('tab', { name: /cliente/i });
    fireEvent.pointerDown(clientTab);
    fireEvent.mouseDown(clientTab);
    fireEvent.click(clientTab);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /continuar con google/i })).not.toBeInTheDocument();
    });
  });
});
