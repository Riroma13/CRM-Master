'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { id: 'summary', label: 'SUMMARY' },
  { id: 'systems', label: 'SYSTEMS' },
  { id: 'inventory', label: 'INVENTORY' },
  { id: 'bitacora', label: 'BITÁCORA' },
  { id: 'tasks', label: 'TASKS' },
];

interface ClientTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ClientTabs({ activeTab, onTabChange }: ClientTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full justify-start rounded-none border-b border-[#E2E8F0] bg-transparent p-0">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-none border-b-2 border-transparent px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#45464D] data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent data-[state=active]:text-[#1B1B1D] data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
