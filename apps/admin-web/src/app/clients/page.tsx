'use client';

import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const allClients = [
  { id: 'C-001', name: 'Aura Logistics', health: 100, color: 'bg-[#10B981]', systems: 3, tags: ['TECH', 'SAAS'] },
  { id: 'C-002', name: 'Stellar Capital', health: 100, color: 'bg-[#10B981]', systems: 5, tags: ['FINTECH', 'CRITICAL'] },
  { id: 'C-003', name: 'Horizon Health', health: 78, color: 'bg-[#F59E0B]', systems: 2, tags: ['MEDICAL', 'CLOUD'] },
  { id: 'C-004', name: 'Apex Media', health: 65, color: 'bg-[#F59E0B]', systems: 4, tags: ['TECH'] },
  { id: 'C-005', name: 'GreenLeaf Energy', health: 92, color: 'bg-[#10B981]', systems: 2, tags: ['GREEN TECH', 'STORAGE'] },
  { id: 'C-006', name: 'BlueWave Aquatech', health: 42, color: 'bg-[#EF4444]', systems: 1, tags: ['TECH', 'CRITICAL'] },
  { id: 'C-007', name: 'Aerospace Dynamic Systems', health: 100, color: 'bg-[#10B981]', systems: 3, tags: ['ENTERPRISE', 'TECH CORE'] },
];

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-[#1B1B1D]">Clients</h2>
        <Button size="sm" className="gap-1.5 bg-[#0F172A] text-xs text-white">
          <Plus className="h-3.5 w-3.5" />
          Add Client
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
        <Input placeholder="Search clients..." className="h-9 bg-white pl-9 text-sm" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {allClients.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card className="bg-white transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${client.color}`} />
                  <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{client.name}</h3>
                </div>
                <p className="mb-2 text-xs text-[#45464D]">ID: #{client.id}</p>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[#45464D]">Health Score</span>
                  <span className="font-semibold">{client.health}%</span>
                </div>
                <Progress value={client.health} indicatorClass={client.color} className="mb-3 h-1.5" />
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="default" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
