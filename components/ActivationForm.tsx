'use client';
import { useState, useEffect, useRef } from 'react';
import { Activation, ActivationType, DispatchSchedule, TYPE_LABELS } from '@/lib/types';
import { toast } from './Toaster';

interface Props {
  date: string;
  activation?: Activation | null;
  onSave: (a: Activation) => void;
  onClose: () => void;
}

const EMPTY_FORM = {
  type: 'whatsapp' as ActivationType,
  description: '',
  segment: '',
  segment_volume: '',
  intercom_tag: '',
  coupon: '',
  offer_condition: '',
  offer_trigger: '',
  focus_product: '',
  offer_category: '',
  copy: '',
  image_url: '',
  hubspot_flow_url: '',
  dispatch_category: 'regular',
  base_temperature: '',
};

export default function ActivationForm({ date, activation, onSave, onClose }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [schedules, setSchedules] = useState<DispatchSchedule[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [scheduleFup, setScheduleFup] = useState(false);
  const [fupDate, setFupDate] = useState('');
  const [fupTargetLeads, setFupTargetLeads] = useState('');
  const [fupCopy, setFupCopy] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activation) {
      setForm({
        type: activation.type,
        description: activation.description ?? '',
        segment: activation.segment ?? '',
        segment_volume: activation.segment_volume?.toString() ?? '',
        intercom_tag: activation.intercom_tag ?? '',
        coupon: activation.coupon ?? '',
        offer_condition: activation.offer_condition ?? '',
        offer_trigger: activation.offer_trigger ?? '',
        focus_product: activation.focus_product ?? '',
        offer_category: activation.offer_category ?? '',
        copy: activation.copy ?? '',
        image_url: activation.image_url ?? '',
        hubspot_flow_url: activation.hubspot_flow_url ?? '',
        dispatch_category: activation.dispatch_category ?? 'regular',
        base_temperature: activation.base_temperature ?? '',
      });
      setSchedules(activation.dispatch_schedules ?? []);
      setImagePreview(activation.image_url ?? '');
    }
  }, [activation]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function addSchedule() {
    setSchedules(s => [...s, { time: '09:00', volume: 0 }]);
  }

  function updateSchedule(i: number, field: keyof DispatchSchedule, value: string) {
    setSchedules(s => s.map((row, idx) =>
      idx === i ? { ...row, [field]: field === 'volume' ? Number(value) : value } : row
    ));
  }

  function removeSchedule(i: number) {
    setSchedules(s => s.filter((_, idx) => idx !== i));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let image_url = form.image_url;

    if (imageFile) {
      const fd = new FormData();
      fd.append('file', imageFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) image_url = json.url;
    }

    const payload = {
      date,
      type: form.type,
      description: form.description || null,
      segment: form.segment || null,
      segment_volume: form.segment_volume ? Number(form.segment_volume) : null,
      intercom_tag: form.intercom_tag || null,
      dispatch_schedules: schedules,
      coupon: form.coupon || null,
      offer_condition: form.offer_condition || null,
      offer_trigger: form.offer_trigger || null,
      focus_product: form.focus_product || null,
      offer_category: form.offer_category || null,
      image_url: image_url || null,
      copy: form.copy || null,
      hubspot_flow_url: form.hubspot_flow_url || null,
      dispatch_category: form.dispatch_category || 'regular',
      base_temperature: form.base_temperature || null,
      fup_date: scheduleFup && fupDate ? fupDate : null,
      fup_target_leads: scheduleFup && fupTargetLeads ? fupTargetLeads : null,
      fup_copy: scheduleFup && fupCopy ? fupCopy : null,
    };

    const url = activation ? `/api/activations/${activation.id}` : '/api/activations';
    const method = activation ? 'PUT' : 'POST';

    try {
      toast('Salvando ativação…', 'saving');
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      toast(activation ? 'Ativação atualizada ✓' : 'Ativação criada ✓', 'success');
      onSave(json.data);
    } catch (err) {
      toast(`Erro ao salvar: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#2E2F39] focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-transparent bg-white";
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="font-semibold text-[#2E2F39]">
            {activation ? 'Editar ativação' : 'Nova ativação'} — {formatDateLabel(date)}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Tipo de ativação *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
              {(Object.entries(TYPE_LABELS) as [ActivationType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Descrição</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={inputCls} placeholder="Descreva a ativação..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Segmento</label>
              <input type="text" value={form.segment} onChange={e => set('segment', e.target.value)} className={inputCls} placeholder="Base CRM, lista..." />
            </div>
            <div>
              <label className={labelCls}>Volume do segmento</label>
              <input type="number" value={form.segment_volume} onChange={e => set('segment_volume', e.target.value)} className={inputCls} placeholder="20000" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Tag Intercom</label>
            <input type="text" value={form.intercom_tag} onChange={e => set('intercom_tag', e.target.value)} className={inputCls} placeholder="campanha-junho-2026" />
          </div>

          <div>
            <label className={labelCls}>Horários de disparo</label>
            <div className="space-y-2">
              {schedules.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={s.time}
                    onChange={e => updateSchedule(i, 'time', e.target.value)}
                    className={`${inputCls} w-32`}
                  />
                  <input
                    type="number"
                    value={s.volume}
                    onChange={e => updateSchedule(i, 'volume', e.target.value)}
                    className={`${inputCls} flex-1`}
                    placeholder="volume"
                  />
                  <button type="button" onClick={() => removeSchedule(i)} className="text-gray-400 hover:text-red-500 text-lg leading-none px-1">×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSchedule}
                className="text-sm text-[#27AE60] hover:text-[#219653] font-medium"
              >
                ＋ Adicionar horário
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cupom</label>
              <input type="text" value={form.coupon} onChange={e => set('coupon', e.target.value)} className={inputCls} placeholder="ALLU10" />
            </div>
            <div>
              <label className={labelCls}>Condição da oferta</label>
              <input type="text" value={form.offer_condition} onChange={e => set('offer_condition', e.target.value)} className={inputCls} placeholder="10% de desconto" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Gatilho da oferta</label>
              <input type="text" value={form.offer_trigger} onChange={e => set('offer_trigger', e.target.value)} className={inputCls} placeholder="Urgência, escassez..." />
            </div>
            <div>
              <label className={labelCls}>Produto foco</label>
              <input type="text" value={form.focus_product} onChange={e => set('focus_product', e.target.value)} className={inputCls} placeholder="iPhone 16 Pro" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Categoria da oferta</label>
            <input type="text" value={form.offer_category} onChange={e => set('offer_category', e.target.value)} className={inputCls} placeholder="Smartphones, Notebooks..." />
          </div>

          <div>
            <label className={labelCls}>Criativo / Banner</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#27AE60] file:text-white hover:file:bg-[#219653] cursor-pointer"
            />
            {imagePreview && (
              <img src={imagePreview} alt="preview" className="mt-2 h-20 rounded-lg object-cover" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Categoria do disparo</label>
              <select value={form.dispatch_category} onChange={e => set('dispatch_category', e.target.value)} className={inputCls}>
                <option value="regular">Regular (novos leads)</option>
                <option value="cross_sell">Cross sell</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Temperatura da base</label>
              <select value={form.base_temperature} onChange={e => set('base_temperature', e.target.value)} className={inputCls}>
                <option value="">— não definida —</option>
                <option value="frio">🧊 Frio</option>
                <option value="morno">🌤 Morno</option>
                <option value="quente">🔥 Quente</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Link do fluxo HubSpot</label>
            <input type="url" value={form.hubspot_flow_url} onChange={e => set('hubspot_flow_url', e.target.value)} className={inputCls} placeholder="https://app.hubspot.com/workflows/..." />
          </div>

          <div>
            <label className={labelCls}>Copy</label>
            <textarea rows={5} value={form.copy} onChange={e => set('copy', e.target.value)} className={inputCls} placeholder="Texto do disparo..." />
          </div>

          {!activation && (
            <div className="border border-[#E5E7EB] rounded-lg p-3 space-y-3 bg-[#F7F8FA]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleFup}
                  onChange={e => setScheduleFup(e.target.checked)}
                  className="w-4 h-4 accent-[#27AE60]"
                />
                <span className="text-sm font-medium text-[#2E2F39]">🔁 Agendar follow up</span>
              </label>

              {scheduleFup && (
                <div className="pl-6 border-l-2 border-[#27AE60] space-y-3">
                  <div>
                    <label className={labelCls}>Data do FUP *</label>
                    <input type="date" value={fupDate} onChange={e => setFupDate(e.target.value)} className={inputCls} min={date} />
                  </div>
                  <div>
                    <label className={labelCls}>Leads para FUP</label>
                    <input type="text" value={fupTargetLeads} onChange={e => setFupTargetLeads(e.target.value)} className={inputCls} placeholder="Ex: todos que ainda não assinaram" />
                  </div>
                  <div>
                    <label className={labelCls}>Copy do FUP</label>
                    <textarea rows={4} value={fupCopy} onChange={e => setFupCopy(e.target.value)} className={inputCls} placeholder="Texto do follow up..." />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#27AE60] hover:bg-[#219653] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar ativação'}
            </button>
            <button type="button" onClick={onClose} className="px-4 border border-[#E5E7EB] rounded-lg text-sm text-gray-500 hover:bg-[#F7F8FA]">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}
