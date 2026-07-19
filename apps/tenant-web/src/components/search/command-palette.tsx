'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, ArrowRight } from 'lucide-react';
import { Command } from 'cmdk';
import { useSearch } from '@/hooks/use-search';
import type { SearchGroup, SearchResultItem } from '@/lib/api-types';

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const { query, results, total, isLoading, setQuery, clear } = useSearch();

  // Ctrl+K / Cmd+K toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) clear();
          return !prev;
        });
      }
      if (e.key === 'Escape') {
        setOpen(false);
        clear();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [clear]);

  const handleSelect = (url: string) => {
    setOpen(false);
    clear();
    router.push(url);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => { setOpen(false); clear(); }}
    >
      <div
        className="w-full max-w-lg rounded-[0.5rem] bg-white shadow-2xl border border-[#E2E8F0]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Universal Search" shouldFilter={false}>
          <div className="flex items-center border-b border-[#E2E8F0] px-3">
            <SearchIcon className="h-4 w-4 text-[#45464D] shrink-0" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar clientes, documentos, incidencias..."
              className="flex-1 bg-transparent px-3 py-3 text-sm text-[#1B1B1D] outline-none placeholder:text-[#C6C6CD]"
              autoFocus
            />
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#0F172A]" />
            )}
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            {!query && (
              <div className="px-3 py-8 text-center text-sm text-[#C6C6CD]">
                Escribe para buscar en todo el CRM
              </div>
            )}

            {query && !isLoading && total === 0 && (
              <div className="px-3 py-8 text-center text-sm text-[#45464D]">
                Sin resultados para &quot;{query}&quot;
              </div>
            )}

            {results.map((group) => (
              <Command.Group
                key={group.entityType}
                heading={
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                    {group.label} ({group.results.length})
                  </span>
                }
              >
                {group.results.slice(0, 5).map((item: SearchResultItem) => (
                  <Command.Item
                    key={`${item.entityType}-${item.entityId}`}
                    value={`${item.entityType}-${item.entityId}`}
                    onSelect={() => handleSelect(item.url)}
                    className="flex items-center gap-3 rounded-[0.25rem] px-3 py-2 text-sm text-[#1B1B1D] cursor-pointer aria-selected:bg-[#DAE2FD] aria-selected:text-[#0F172A]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      {item.description && (
                        <p className="truncate text-xs text-[#45464D]">{item.description}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#C6C6CD]" />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {total > 0 && (
              <Command.Item
                value="__view_all__"
                onSelect={() => handleSelect(`/admin/search?q=${encodeURIComponent(query)}`)}
                className="flex items-center justify-center gap-2 rounded-[0.25rem] px-3 py-2 text-xs font-medium text-[#45464D] cursor-pointer aria-selected:bg-[#DAE2FD]"
              >
                Ver todos los {total} resultados
              </Command.Item>
            )}
          </Command.List>

          <div className="flex items-center gap-4 border-t border-[#E2E8F0] px-3 py-2 text-[11px] text-[#C6C6CD]">
            <span>↑↓ Navegar</span>
            <span>Enter Seleccionar</span>
            <span>Esc Cerrar</span>
          </div>
        </Command>
      </div>
    </div>
  );
}


