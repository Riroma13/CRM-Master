'use client';

import { Bell, HelpCircle, Search, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
        <Input
          placeholder="Search clients, tasks, or systems..."
          className="h-9 bg-[#F8FAFC] pl-9 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]">
          <Bell className="h-4 w-4" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]">
          <Settings className="h-4 w-4" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF] hover:text-[#1B1B1D]">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
