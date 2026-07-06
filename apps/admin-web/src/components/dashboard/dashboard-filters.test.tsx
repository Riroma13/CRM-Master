import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DashboardFilters } from './dashboard-filters';
import type { ClientFilters } from '@/lib/api-types';

describe('DashboardFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultFilters: ClientFilters = { page: 1, limit: 20 };

  it('renders search input', () => {
    render(
      <DashboardFilters filters={defaultFilters} onFiltersChange={vi.fn()} />,
    );

    expect(screen.getByPlaceholderText('Search clients...')).toBeInTheDocument();
  });

  it('renders health filter chips', () => {
    render(
      <DashboardFilters filters={defaultFilters} onFiltersChange={vi.fn()} />,
    );

    expect(screen.getByText('🟢 Buena')).toBeInTheDocument();
    expect(screen.getByText('🟡 Media')).toBeInTheDocument();
    expect(screen.getByText('🔴 Crítica')).toBeInTheDocument();
  });

  it('debounces search input by 300ms', () => {
    const onFiltersChange = vi.fn();
    render(
      <DashboardFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />,
    );

    const input = screen.getByPlaceholderText('Search clients...');
    fireEvent.change(input, { target: { value: 'test' } });

    // Immediately after change, should not have called yet
    expect(onFiltersChange).not.toHaveBeenCalled();

    // Advance 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'test', page: 1 }),
    );
  });

  it('toggles salud filter chip', () => {
    const onFiltersChange = vi.fn();
    render(
      <DashboardFilters filters={defaultFilters} onFiltersChange={onFiltersChange} />,
    );

    // Click "🔴 Crítica"
    fireEvent.click(screen.getByText('🔴 Crítica'));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ salud: '🔴', page: 1 }),
    );
  });

  it('deselects salud filter when clicking active chip', () => {
    const onFiltersChange = vi.fn();
    const filtersWithSalud: ClientFilters = { ...defaultFilters, salud: '🔴' };
    render(
      <DashboardFilters filters={filtersWithSalud} onFiltersChange={onFiltersChange} />,
    );

    // Click active "🔴 Crítica" to deselect
    fireEvent.click(screen.getByText('🔴 Crítica'));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.not.objectContaining({ salud: expect.anything() }),
    );
  });

  it('shows clear filters button when active filters exist', () => {
    const filtersWithSearch: ClientFilters = { ...defaultFilters, search: 'test' };
    render(
      <DashboardFilters filters={filtersWithSearch} onFiltersChange={vi.fn()} />,
    );

    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('hides clear filters button when no active filters', () => {
    render(
      <DashboardFilters filters={defaultFilters} onFiltersChange={vi.fn()} />,
    );

    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('clears all filters when clear button clicked', () => {
    const onFiltersChange = vi.fn();
    const filtersWithSearch: ClientFilters = { ...defaultFilters, search: 'test' };
    render(
      <DashboardFilters filters={filtersWithSearch} onFiltersChange={onFiltersChange} />,
    );

    fireEvent.click(screen.getByText('Clear filters'));

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.not.objectContaining({ search: expect.anything() }),
    );
  });

  it('marks active health chip as pressed', () => {
    const filtersWithSalud: ClientFilters = { ...defaultFilters, salud: '🟢' };
    render(
      <DashboardFilters filters={filtersWithSalud} onFiltersChange={vi.fn()} />,
    );

    const chip = screen.getByText('🟢 Buena');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});
