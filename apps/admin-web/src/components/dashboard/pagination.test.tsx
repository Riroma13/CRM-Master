import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pagination } from './pagination';
import type { PaginationMeta } from '@/lib/api-types';

describe('Pagination', () => {
  const onPageChange = vi.fn();

  it('renders nothing when totalPages <= 1', () => {
    const singlePage: PaginationMeta = { page: 1, limit: 20, total: 5, totalPages: 1 };

    const { container } = render(
      <Pagination pagination={singlePage} onPageChange={onPageChange} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders page info and navigation', () => {
    const pagination: PaginationMeta = { page: 2, limit: 10, total: 25, totalPages: 3 };

    render(<Pagination pagination={pagination} onPageChange={onPageChange} />);

    expect(screen.getByText('11–20 of 25')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('disables prev button on first page', () => {
    const pagination: PaginationMeta = { page: 1, limit: 10, total: 25, totalPages: 3 };

    render(<Pagination pagination={pagination} onPageChange={onPageChange} />);

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('disables next button on last page', () => {
    const pagination: PaginationMeta = { page: 3, limit: 10, total: 25, totalPages: 3 };

    render(<Pagination pagination={pagination} onPageChange={onPageChange} />);

    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
  });

  it('calls onPageChange with next page', () => {
    const onPageChange = vi.fn();
    const pagination: PaginationMeta = { page: 1, limit: 10, total: 25, totalPages: 3 };

    render(<Pagination pagination={pagination} onPageChange={onPageChange} />);

    screen.getByLabelText('Next page').click();
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with prev page', () => {
    const onPageChange = vi.fn();
    const pagination: PaginationMeta = { page: 2, limit: 10, total: 25, totalPages: 3 };

    render(<Pagination pagination={pagination} onPageChange={onPageChange} />);

    screen.getByLabelText('Previous page').click();
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
