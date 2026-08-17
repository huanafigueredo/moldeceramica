import React, { useEffect, useState } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import {
  Lock, LogOut, Trash2, Loader2, BookMarked, Lightbulb, PlusCircle,
  CheckCircle2, Circle, AlertTriangle, Flame,
} from 'lucide-react';
import { useAdminSession, signOutAdmin } from '../lib/adminAuth';
import { supabase } from '../lib/supabaseClient';
import { ShapeType } from '../types';

type AdminTab = 'moldes' | 'sugestoes' | 'nova-referencia';

interface SavedMoldRow {
  id: string;
  name: string;
  shape_type: ShapeType;
  created_at: string;
}

interface SuggestionRow {
  id: string;
  message: string;
  name: string | null;
  contact: string | null;
  is_read: boolean;
  created_at: string;
}

// Which dimension fields the reference-library form asks for, per shape —
// mirrors the fields AITemplateFinder already expects in mold_library.dimensions.
const DIMENSION_FIELDS: Record<ShapeType, { key: string; label: string }[]> = {
  cylinder: [
    { key: 'desiredHeight', label: 'Altura (cm)' },
    { key: 'desiredDiameter', label: 'Diâmetro (cm)' },
  ],
  cone: [
    { key: 'topDiameter', label: 'Ø Topo (cm)' },
    { key: 'bottomDiameter', label: 'Ø Base (cm)' },
    { key: 'height', label: 'Altura (cm)' },
  ],
  tray: [
    { key: 'length', label: 'Comprimento (cm)' },
    { key: 'width', label: 'Largura (cm)' },
    { key: 'lipHeight', label: 'Altura da Aba (cm)' },
    { key: 'lipAngle', label: 'Ângulo da Aba (°)' },
  ],
  napkin_holder: [
    { key: 'width_napkin', label: 'Largura (cm)' },
    { key: 'height_napkin', label: 'Altura (cm)' },
    { key: 'depth_napkin', label: 'Profundidade (cm)' },
    { key: 'thickness_napkin', label: 'Espessura (cm)' },
  ],
  box: [
    { key: 'width', label: 'Largura (cm)' },
    { key: 'height', label: 'Altura (cm)' },
    { key: 'depth', label: 'Profundidade (cm)' },
    { key: 'thickness', label: 'Espessura (cm)' },
  ],
  organic_plate: [
    { key: 'baseRadius', label: 'Raio Base (cm)' },
  ],
  bowl: [
    { key: 'topDiameter', label: 'Ø Borda (cm)' },
    { key: 'bottomDiameter', label: 'Ø Base (cm)' },
    { key: 'height', label: 'Altura (cm)' },
    { key: 'curvature', label: 'Curvatura (0-100)' },
  ],
};

const SHAPE_LABELS: Record<ShapeType, string> = {
  cylinder: 'Cilindro',
  cone: 'Cone',
  tray: 'Prato/Travessa',
  napkin_holder: 'Porta-Guardanapo',
  box: 'Caixa',
  organic_plate: 'Prato Orgânico',
  bowl: 'Tigela/Bowl',
};

const VALID_TABS: AdminTab[] = ['moldes', 'sugestoes', 'nova-referencia'];

export default function AdminPage() {
  const { session, loading: sessionLoading } = useAdminSession();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as AdminTab | null;
  const [tab, setTab] = useState<AdminTab>(
    requestedTab && VALID_TABS.includes(requestedTab) ? requestedTab : 'moldes'
  );

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-clay-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-terracotta-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-clay-50 text-clay-900">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-terracotta-100/30 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <span className="font-serif text-lg font-bold text-clay-900">Painel Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-clay-900/50 hover:text-clay-900/80">← Ver o site</Link>
            <button
              onClick={() => signOutAdmin()}
              className="flex items-center gap-1.5 text-xs font-bold text-clay-900/60 hover:text-red-600 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex bg-white/50 p-1 rounded-2xl border border-terracotta-100/50 mb-8 gap-1 overflow-x-auto w-fit">
          <TabButton active={tab === 'moldes'} onClick={() => setTab('moldes')} icon={BookMarked} label="Moldes Salvos" />
          <TabButton active={tab === 'sugestoes'} onClick={() => setTab('sugestoes')} icon={Lightbulb} label="Sugestões" />
          <TabButton active={tab === 'nova-referencia'} onClick={() => setTab('nova-referencia')} icon={PlusCircle} label="Nova Referência" />
        </div>

        {tab === 'moldes' && <SavedMoldsModeration />}
        {tab === 'sugestoes' && <SuggestionsInbox />}
        {tab === 'nova-referencia' && <NewLibraryEntryForm />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl transition-all whitespace-nowrap ${
        active ? 'bg-white text-terracotta-600 shadow-sm border border-terracotta-100' : 'text-clay-900/40 hover:text-clay-900/70'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function SavedMoldsModeration() {
  const [rows, setRows] = useState<SavedMoldRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('saved_molds')
      .select('id, name, shape_type, created_at')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await supabase.from('saved_molds').delete().eq('id', id);
  };

  return (
    <div className="bg-white rounded-3xl border border-terracotta-100 p-6 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-clay-900 mb-1">Moldes Salvos pelo Público</h2>
      <p className="text-xs text-clay-900/50 mb-6">Qualquer pessoa pode ver e carregar esses moldes; só você pode apagar.</p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-clay-900/30" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-clay-900/40 text-center py-10">Nenhum molde salvo ainda.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 p-3.5 bg-clay-50/70 border border-terracotta-100/30 rounded-xl">
              <div className="min-w-0">
                <div className="text-sm font-bold text-clay-900 truncate">{row.name}</div>
                <div className="text-[11px] text-clay-900/50 font-mono">
                  {SHAPE_LABELS[row.shape_type]} • {new Date(row.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button
                onClick={() => handleDelete(row.id)}
                className="shrink-0 p-2 rounded-lg bg-white hover:bg-red-50 border border-red-100/60 text-red-400 hover:text-red-600 transition"
                title="Apagar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionsInbox() {
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const toggleRead = async (row: SuggestionRow) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_read: !r.is_read } : r)));
    await supabase.from('suggestions').update({ is_read: !row.is_read }).eq('id', row.id);
  };

  const handleDelete = async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await supabase.from('suggestions').delete().eq('id', id);
  };

  return (
    <div className="bg-white rounded-3xl border border-terracotta-100 p-6 shadow-sm">
      <h2 className="font-serif text-lg font-bold text-clay-900 mb-1">Sugestões Recebidas</h2>
      <p className="text-xs text-clay-900/50 mb-6">Enviadas pela página pública /sugestoes.</p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-clay-900/30" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-clay-900/40 text-center py-10">Nenhuma sugestão ainda.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`p-4 rounded-xl border ${row.is_read ? 'bg-clay-50/50 border-clay-100' : 'bg-terracotta-50/40 border-terracotta-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-clay-900 leading-relaxed flex-1">{row.message}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleRead(row)}
                    className="p-1.5 rounded-lg hover:bg-white text-clay-900/40 hover:text-emerald-600 transition"
                    title={row.is_read ? 'Marcar como não lida' : 'Marcar como lida'}
                  >
                    {row.is_read ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="p-1.5 rounded-lg hover:bg-white text-clay-900/40 hover:text-red-600 transition"
                    title="Apagar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-clay-900/40 font-mono mt-2">
                {row.name || 'Anônimo'}{row.contact ? ` • ${row.contact}` : ''} • {new Date(row.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewLibraryEntryForm() {
  const [shapeType, setShapeType] = useState<ShapeType>('cylinder');
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [dimensions, setDimensions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fields = DIMENSION_FIELDS[shapeType];

  const handleShapeChange = (next: ShapeType) => {
    setShapeType(next);
    setDimensions({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const parsedDimensions: Record<string, number> = {};
    for (const field of fields) {
      const val = parseFloat(dimensions[field.key]);
      if (!isNaN(val)) parsedDimensions[field.key] = val;
    }

    const { error: insertError } = await supabase.from('mold_library').insert({
      name: name.trim(),
      source: source.trim(),
      description: description.trim(),
      shape_type: shapeType,
      dimensions: parsedDimensions,
    });

    setSaving(false);
    if (insertError) {
      setError('Não foi possível salvar essa referência.');
      return;
    }
    setSuccess(true);
    setName('');
    setSource('');
    setDescription('');
    setDimensions({});
  };

  return (
    <div className="bg-white rounded-3xl border border-terracotta-100 p-6 shadow-sm max-w-xl">
      <h2 className="font-serif text-lg font-bold text-clay-900 mb-1">Cadastrar Molde na Biblioteca</h2>
      <p className="text-xs text-clay-900/50 mb-6">Aparece pra todo mundo na busca da aba Biblioteca.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Forma</label>
          <select
            value={shapeType}
            onChange={(e) => handleShapeChange(e.target.value as ShapeType)}
            className="w-full bg-clay-50 border border-terracotta-100 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none focus:border-terracotta-500"
          >
            {(Object.keys(SHAPE_LABELS) as ShapeType[]).map((s) => (
              <option key={s} value={s}>{SHAPE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Nome</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Caneca Cônica de Chá"
            className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Fonte/Referência</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Ex: Ateliê Barro & Arte"
            className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm focus:outline-none transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">{field.label}</label>
              <input
                type="number"
                step="0.1"
                required
                value={dimensions[field.key] || ''}
                onChange={(e) => setDimensions((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 text-sm font-mono focus:outline-none transition-colors"
              />
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Molde cadastrado na biblioteca!
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
          Cadastrar
        </button>
      </form>
    </div>
  );
}
