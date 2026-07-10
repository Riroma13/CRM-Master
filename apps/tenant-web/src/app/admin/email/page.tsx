'use client'; import { useState, useEffect } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { useToast } from '@/components/ui/toast'; import { Mail, Send } from 'lucide-react';

export default function EmailPage() {
  const { toast } = useToast(); const [clientes, setClientes] = useState<any[]>([]);
  const [to, setTo] = useState(''); const [subject, setSubject] = useState(''); const [text, setText] = useState(''); const [clienteId, setClienteId] = useState(''); const [sending, setSending] = useState(false);
  useEffect(() => { api.get<any[]>('/api/v1/tenant/clientes', undefined, { auth: true }).then(setClientes).catch(() => {}); }, []);

  const handleSend = async () => { if (!to.trim() || !subject.trim()) return; setSending(true);
    try { await api.post('/api/v1/tenant/email/send', { to: to.trim(), subject: subject.trim(), text: text.trim(), clienteId: clienteId || undefined }, { auth: true }); toast('success', 'Email enviado'); setTo(''); setSubject(''); setText(''); } catch { toast('error', 'Error al enviar'); } finally { setSending(false); } };

  const selectCliente = (c: any) => { setTo(c.contactoPrincipal || ''); setClienteId(c.id); };

  return (<div className="space-y-6">
    <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Email</h1>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="bg-white"><CardContent className="p-6 space-y-4">
          <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Para</label><Input value={to} onChange={e => setTo(e.target.value)} placeholder="email@cliente.com" className="mt-1" /></div>
          <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Asunto</label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto del email" className="mt-1" /></div>
          <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Mensaje</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={8} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none" /></div>
          <div className="flex justify-end"><Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={handleSend} disabled={sending || !to.trim() || !subject.trim()}>
            <Send className="h-3.5 w-3.5" /> {sending ? 'Enviando...' : 'Enviar'}</Button></div>
        </CardContent></Card>
      </div>
      <div>
        <Card className="bg-white"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3"><Mail className="h-4 w-4 text-[#45464D]" /><h2 className="text-[13px] font-semibold text-[#1B1B1D]">Clientes</h2></div>
          {clientes.length === 0 ? <p className="text-[13px] text-[#45464D]">Sin clientes</p> :
            <div className="space-y-1">{clientes.map(c => (
              <button key={c.id} onClick={() => selectCliente(c)} className="block w-full text-left px-2 py-1.5 rounded text-[13px] text-[#1B1B1D] hover:bg-[#F0EDEF]">{c.nombre}{c.contactoPrincipal ? ` (${c.contactoPrincipal})` : ''}</button>
            ))}</div>}
        </CardContent></Card>
      </div>
    </div>
  </div>);
}
