import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSearch } from './use-search';

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

describe('useSearch', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not search for queries shorter than minQueryLength', async () => {
    const { result } = renderHook(() => useSearch());
    act(() => result.current.setQuery('a'));
    await new Promise((r) => setTimeout(r, 400));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches results after debounce', async () => {
    mockGet.mockResolvedValue({ groups: [], total: 0, query: 'test' });
    const { result } = renderHook(() => useSearch());
    await act(async () => { result.current.setQuery('test'); });
    await new Promise((r) => setTimeout(r, 500));
    expect(mockGet).toHaveBeenCalled();
  });

  it('sets isError on failed fetch', async () => {
    mockGet.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useSearch());
    await act(async () => { result.current.setQuery('test'); });
    await new Promise((r) => setTimeout(r, 500));
    expect(result.current.isError).toBe(true);
    expect(result.current.results).toEqual([]);
  });

  it('clears results when query goes below min length', async () => {
    mockGet.mockResolvedValueOnce({ groups: [], total: 0, query: '' });
    const { result } = renderHook(() => useSearch());
    act(() => result.current.setQuery('te'));
    await new Promise((r) => setTimeout(r, 400));
    expect(result.current.results).toEqual([]);
  });
});
