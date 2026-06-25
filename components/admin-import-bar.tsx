'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

export function AdminImportBar() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const saved = (window.localStorage.getItem('dofree_admin_token') || '').trim();
    if (!saved) {
      setNotice('กรุณาใส่ Admin Token แล้วกดค้นหาก่อน จากนั้นค่อย Import');
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/import-missing-links', {
        method: 'POST',
        headers: { 'x-admin-token': saved },
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Import ไม่สำเร็จ');
      setNotice(`Import สำเร็จ ${data.imported || 0} รายการ`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Import ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] rounded-2xl border border-white/10 bg-black/85 p-3 text-white shadow-2xl backdrop-blur-xl md:left-auto md:right-6 md:max-w-md">
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="h-11 rounded-xl bg-emerald-500 px-5 text-sm font-black text-black disabled:opacity-50">
          {busy ? 'Import...' : 'Import Excel'}
        </button>
        <p className="text-[11px] font-bold leading-4 text-white/55">เติม Watch URL แล้ว Save เป็น CSV ก่อนนำเข้า</p>
      </div>
      {notice ? <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80">{notice}</p> : null}
    </div>
  );
}
