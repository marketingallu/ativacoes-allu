'use client';
import { useState, useEffect, useRef } from 'react';
import { Campaign, ActivationType, TYPE_LABELS } from '@/lib/types';
import { toast } from './Toaster';

const CAMPAIGN_COLORS = [
  '#E91E63', '#9C27B0', '#3F51B5', '#2196F3',
  '#00BCD4', '#FF5722', '#FF9800', '#4CAF50',
  '#607D8B', '#795548',
];

interface TouchDraft {
  _key: string;
  id?: string;
  date: string;
  type: ActivationType;
  template_name: string;
  description: string;
  copy: string;
  image_url: string;
  results: Record<string, number>;
}

interface Props {
  startDate?: string;
  campaign?: Campaign | null;
  onSave: (c: Campaign) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: '', start_date: '', end_date: '', color: '#E91E63',
  segment: '', segment_volume: '', intercom_tag: '', hubspot_flow_url: '',
  coupon: '', offer_condition: '', offer_trigger: '',
  focus_product: '', offer_category: '', base_temperature: '',
};

function getDatesInRange(start: string, end: string): string[] {
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const cur = new Date(start + 'T12:00:00');
  const endD = new Date(end + 'T12:00:00');
  while (cur <= endD && dates.length < 90) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function fmtDay(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  return `${String(day).padStart(2,'0')}/${String(m).padStart(2,'0')} ${WEEKDAY_SHORT[dt.getDay()]}`;
}

function typeEmoji(type: string) {
  const map: Record<string, string> = { whatsapp: '💬', email: '📧', instagram_story: '📷', instagram_post: '🖼', app_push: '🔔' };
  return map[type] ?? '📣';
}

let _keyCounter = 0;
function nextKey() { return String(++_keyCounter); }

export default function CampaignForm({ startDate, campaign, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [touches, setTouches] = useState<TouchDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TouchDraft>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name,
        start_date: campaign.start_date.slice(0, 10),
        end_date: campaign.end_date.slice(0, 10),
        color: campaign.color ?? '#E91E63',
        segment: campaign.segment ?? '',
        segment_volume: campaign.segment_volume?.toString() ?? '',
        intercom_tag: campaign.intercom_tag ?? '',
        hubspot_flow_url: campaign.hubspot_flow_url ?? '',
        coupon: campaign.coupon ?? '',
        offer_condition: campaign.offer_condition ?? '',
        offer_trigger: campaign.offer_trigger ?? '',
        focus_product: campaign.focus_product ?? '',
        offer_category: campaign.offer_category ?? '',
        base_temperature: campaign.base_temperature ?? '',
      });
      setTouches((campaign.touches ?? []).map(t => ({
        _key: nextKey(),
        id: t.id,
        date: t.date.slice(0, 10),
        type: t.type,
        template_name: t.template_name ?? '',
        description: t.description ?? '',
        copy: t.copy ?? '',
        image_url: t.image_url ?? '',
        results: (t.results as Record<string, number>) ?? {},
      })));
    } else if (startDate) {
      setForm(f => ({ ...f, start_date: startDate, end_date: startDate }));
    }
  }, [campaign, startDate]);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function openAdd(dateStr: string) {
    setActiveDate(dateStr);
    setEditKey(null);
    setDraft({ date: dateStr, type: 'whatsapp', template_name: '', description: '', copy: '', image_url: '' });
    setImageFile(null);
  }

  function openEdit(t: TouchDraft) {
    setEditKey(t._key);
    setActiveDate(t.date);
    setDraft({ ...t });
    setImageFile(null);
  }

  function cancelDraft() {
    setActiveDate(null);
    setEditKey(null);
    setDraft({});
    setImageFile(null);
  }

  async function confirmDraft() {
    let image_url = draft.image_url ?? '';
    if (imageFile) {
      const fd = new FormData();
      fd.append('file', imageFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) image_url = json.url;
    }

    const touch: TouchDraft = {
      _key: editKey ?? nextKey(),
      id: editKey ? touches.find(t => t._key === editKey)?.id : undefined,
      date: draft.date ?? activeDate ?? '',
      type: (draft.type as ActivationType) ?? 'whatsapp',
      template_name: draft.template_name ?? '',
      description: draft.description ?? '',
      copy: draft.copy ?? '',
      image_url,
      results: editKey ? (touches.find(t => t._key === editKey)?.results ?? {}) : {},
    };

    if (editKey) {
      setTouches(ts => ts.map(t => t._key === editKey ? touch : t));
    } else {
      setTouches(ts => [...ts, touch]);
    }
    cancelDraft();
  }

  function removeTouch(key: string) {
    setTouches(ts => ts.filter(t => t._key !== key));
  }

  async function handleDelete() {
    if (!campaign) return;
    setSaving(true);
    try {
      toast('Excluindo campanha…', 'saving');
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Campanha excluída ✓', 'success');
      onDelete?.();
    } catch (err) {
      toast(`Erro: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      toast('Preencha nome, data início e data fim', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      color: form.color,
      segment: form.segment || null,
      segment_volume: form.segment_volume ? Number(form.segment_volume) : null,
      intercom_tag: form.intercom_tag || null,
      hubspot_flow_url: form.hubspot_flow_url || null,
      coupon: form.coupon || null,
      offer_condition: form.offer_condition || null,
      offer_trigger: form.offer_trigger || null,
      focus_product: form.focus_product || null,
      offer_category: form.offer_category || null,
      base_temperature: form.base_temperature || null,
      touches: touches.map(t => ({
        id: t.id,
        date: t.date,
        type: t.type,
        template_name: t.template_name || null,
        description: t.description || null,
        copy: t.copy || null,
        image_url: t.image_url || null,
        results: t.results,
      })),
    };

    const url = campaign ? `/api/campaigns/${campaign.id}` : '/api/campaigns';
    const method = campaign ? 'PUT' : 'POST';
    try {
      toast('Salvando campanha…', 'saving');
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast(campaign ? 'Campanha atualizada ✓' : 'Campanha criada ✓', 'success');
      onSave(json.data);
    } catch (err) {
      toast(`Erro: ${String(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const inp = "w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#2E2F39] focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-transparent bg-white";
  const lbl = "block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1";
  const datesInRange = getDatesInRange(form.start_date, form.end_date);
  const isEditing = (dateStr: string) => activeDate === dateStr || (editKey !== null && touches.find(t => t._key === editKey)?.date === dateStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-5 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h2 className="font-bold text-[#0F172A] text-sm">{campaign ? 'Editar campanha' : 'Nova campanha'}</h2>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">Defina o período, público e cadência de contatos</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0F2F5]">×</button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">

            {/* Name + color */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className={lbl}>Nome da campanha *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  className={inp} placeholder="Ex: Campanha Dia dos Namorados" required />
              </div>
              <div className="shrink-0">
                <label className={lbl}>Cor no calendário</label>
                <div className="flex gap-1.5 flex-wrap max-w-[140px]">
                  {CAMPAIGN_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => set('color', c)}
                      className="w-5 h-5 rounded-full transition-all"
                      style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Data início *</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inp} required />
              </div>
              <div>
                <label className={lbl}>Data fim *</label>
                <input type="date" value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} className={inp} required />
              </div>
            </div>

            {/* Audience */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Segmento / Público</label>
                <input type="text" value={form.segment} onChange={e => set('segment', e.target.value)} className={inp} placeholder="Base CRM, lista..." />
              </div>
              <div>
                <label className={lbl}>Volume total</label>
                <input type="number" value={form.segment_volume} onChange={e => set('segment_volume', e.target.value)} className={inp} placeholder="50000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Cupom</label>
                <input type="text" value={form.coupon} onChange={e => set('coupon', e.target.value)} className={inp} placeholder="NAMORADOS10" />
              </div>
              <div>
                <label className={lbl}>Tag Intercom</label>
                <input type="text" value={form.intercom_tag} onChange={e => set('intercom_tag', e.target.value)} className={inp} placeholder="camp-namorados" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Produto foco</label>
                <input type="text" value={form.focus_product} onChange={e => set('focus_product', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Temperatura da base</label>
                <select value={form.base_temperature} onChange={e => set('base_temperature', e.target.value)} className={inp}>
                  <option value="">— não definida —</option>
                  <option value="frio">🧊 Frio</option>
                  <option value="morno">🌤 Morno</option>
                  <option value="quente">🔥 Quente</option>
                </select>
              </div>
            </div>

            <div>
              <label className={lbl}>Link HubSpot</label>
              <input type="url" value={form.hubspot_flow_url} onChange={e => set('hubspot_flow_url', e.target.value)} className={inp} placeholder="https://app.hubspot.com/..." />
            </div>

            {/* ── Touch calendar ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">📅 Cadência de contatos</span>
                {touches.length > 0 && (
                  <span className="bg-[#27AE60] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{touches.length} contato{touches.length !== 1 ? 's' : ''}</span>
                )}
                {datesInRange.length === 0 && (
                  <span className="text-[10px] text-[#94A3B8] ml-auto">Defina as datas acima para montar a cadência</span>
                )}
              </div>

              {datesInRange.length > 0 && (
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                  {datesInRange.map((dateStr, di) => {
                    const dayTouches = touches.filter(t => t.date === dateStr);
                    const showForm = isEditing(dateStr) && (activeDate === dateStr || (editKey !== null && touches.find(t => t._key === editKey)?.date === dateStr));
                    return (
                      <div key={dateStr} className={`border-b border-[#F3F4F6] last:border-0 ${di % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                        {/* Day row */}
                        <div className="flex items-center gap-2 px-3 py-2 min-h-[40px]">
                          <div className="w-24 shrink-0">
                            <span className="text-xs font-semibold text-[#475569]">{fmtDay(dateStr)}</span>
                          </div>
                          <div className="flex-1 flex flex-wrap gap-1 min-h-[24px] items-center">
                            {dayTouches.map(t => (
                              <div key={t._key} className="flex items-center gap-0.5">
                                <button type="button" onClick={() => openEdit(t)}
                                  className="flex items-center gap-1 bg-[#F0F2F5] hover:bg-[#E2E8F0] rounded-lg px-2 py-0.5 text-xs font-medium text-[#475569] transition-colors max-w-[160px]">
                                  <span>{typeEmoji(t.type)}</span>
                                  <span className="truncate">{t.template_name || t.description || TYPE_LABELS[t.type]}</span>
                                </button>
                                <button type="button" onClick={() => removeTouch(t._key)}
                                  className="text-gray-300 hover:text-red-400 text-base leading-none px-0.5 transition-colors">×</button>
                              </div>
                            ))}
                          </div>
                          {!showForm && (
                            <button type="button" onClick={() => openAdd(dateStr)}
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[#27AE60] hover:bg-[#27AE60] hover:text-white border border-[#27AE60] text-sm font-bold transition-all">+</button>
                          )}
                        </div>

                        {/* Inline touch form */}
                        {showForm && (
                          <div className="bg-[#F8FAFC] border-t border-[#E5E7EB] px-3 py-3 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={lbl}>Tipo *</label>
                                <select value={draft.type ?? 'whatsapp'} onChange={e => setDraft(d => ({ ...d, type: e.target.value as ActivationType }))}
                                  className={inp + ' text-xs py-1.5'}>
                                  {(Object.entries(TYPE_LABELS) as [ActivationType, string][]).map(([v, l]) => (
                                    <option key={v} value={v}>{typeEmoji(v)} {l}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className={lbl}>Nome do template</label>
                                <input type="text" value={draft.template_name ?? ''} onChange={e => setDraft(d => ({ ...d, template_name: e.target.value }))}
                                  className={inp + ' text-xs py-1.5'} placeholder="nome_template" />
                              </div>
                            </div>
                            <div>
                              <label className={lbl}>Descrição do toque</label>
                              <input type="text" value={draft.description ?? ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                                className={inp + ' text-xs py-1.5'} placeholder="Ex: WPP 1 — Lançamento" />
                            </div>
                            <div>
                              <label className={lbl}>Copy</label>
                              <textarea rows={3} value={draft.copy ?? ''} onChange={e => setDraft(d => ({ ...d, copy: e.target.value }))}
                                className={inp + ' text-xs py-1.5 resize-none'} placeholder="Texto do disparo…" />
                            </div>
                            <div>
                              <label className={lbl}>Imagem / criativo</label>
                              <input ref={fileRef} type="file" accept="image/*"
                                onChange={e => { const f = e.target.files?.[0]; if (f) setImageFile(f); }}
                                className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[#27AE60] file:text-white cursor-pointer" />
                              {(imageFile || draft.image_url) && (
                                <img src={imageFile ? URL.createObjectURL(imageFile) : draft.image_url} alt="" className="mt-1.5 h-12 rounded-lg object-cover" />
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={confirmDraft}
                                className="bg-[#27AE60] hover:bg-[#219653] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                                {editKey ? 'Atualizar toque' : 'Adicionar toque'}
                              </button>
                              <button type="button" onClick={cancelDraft}
                                className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-[#27AE60] hover:bg-[#219653] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
                {saving ? 'Salvando…' : 'Salvar campanha'}
              </button>
              <button type="button" onClick={onClose}
                className="px-5 border border-[#E5E7EB] rounded-xl text-sm text-gray-500 hover:bg-[#F7F8FA] transition-colors">
                Cancelar
              </button>
              {campaign && !confirmDelete && (
                <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving}
                  className="px-4 border border-red-200 rounded-xl text-sm text-red-400 hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-colors">
                  🗑
                </button>
              )}
              {campaign && confirmDelete && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3">
                  <span className="text-xs text-red-600 font-medium whitespace-nowrap">Excluir campanha?</span>
                  <button type="button" onClick={handleDelete} disabled={saving}
                    className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors">Sim</button>
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Não</button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
