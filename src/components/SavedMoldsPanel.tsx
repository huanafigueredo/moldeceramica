import React, { useEffect, useState } from 'react';
import { BookMarked, ChevronRight, Save, FolderOpen, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAdminSession } from '../lib/adminAuth';
import { ShapeType } from '../types';

interface SavedMoldRow {
  id: string;
  name: string;
  shape_type: ShapeType;
  params: any;
  created_at: string;
}

interface SavedMoldsPanelProps {
  shapeType: ShapeType;
  params: any;
  onLoad: (shapeType: ShapeType, params: any) => void;
}

const SHAPE_LABELS: Record<ShapeType, string> = {
  cylinder: 'Cilindro',
  cone: 'Cone',
  tray: 'Prato/Travessa',
  napkin_holder: 'Porta-Guardanapo',
  box: 'Caixa',
  organic_plate: 'Prato Orgânico',
  bowl: 'Tigela/Bowl',
  vase: 'Jarra/Vaso',
  sketch: 'Molde Desenhado',
};

export default function SavedMoldsPanel({ shapeType, params, onLoad }: SavedMoldsPanelProps) {
  const { isAdmin } = useAdminSession();
  const [expanded, setExpanded] = useState(false);
  const [molds, setMolds] = useState<SavedMoldRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchMolds = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('saved_molds')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError('Não foi possível carregar os moldes salvos.');
    } else {
      setMolds(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (expanded && molds.length === 0) {
      fetchMolds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('saved_molds').insert({
      name: name.trim(),
      shape_type: shapeType,
      params,
    });
    setSaving(false);
    if (insertError) {
      setError('Não foi possível salvar o molde.');
      return;
    }
    setName('');
    fetchMolds();
  };

  const handleDelete = async (id: string) => {
    const prevMolds = molds;
    setMolds((prev) => prev.filter((m) => m.id !== id));
    const { error: deleteError } = await supabase.from('saved_molds').delete().eq('id', id);
    if (deleteError) {
      setMolds(prevMolds);
      setError('Não foi possível apagar esse molde.');
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-terracotta-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-terracotta-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-terracotta-500" />
          <h5 className="text-[11px] font-bold text-clay-900/70 uppercase tracking-wider font-sans">
            Moldes Salvos
          </h5>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-clay-900/40 font-sans">
            {expanded ? 'Ocultar' : 'Ver biblioteca'}
          </span>
          <ChevronRight className={`w-4 h-4 text-clay-900/30 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 animate-fadeIn">
          {/* Save current mold — admin only, everyone else can browse/load */}
          {isAdmin && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                placeholder="Nome para este molde..."
                className="flex-1 h-9 px-3 bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 focus:outline-none rounded-xl text-xs transition"
              />
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="shrink-0 h-9 px-3 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-6 text-clay-900/30">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : molds.length === 0 ? (
            <p className="text-[10px] text-clay-900/40 text-center py-3 font-sans">
              {isAdmin
                ? 'Nenhum molde salvo ainda. Ajuste os parâmetros acima e salve o primeiro!'
                : 'Nenhum molde salvo ainda.'}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {molds.map((mold) => (
                <div
                  key={mold.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-clay-50/70 border border-terracotta-100/30 rounded-xl"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-clay-900 truncate">{mold.name}</div>
                    <div className="text-[9.5px] text-clay-900/50 font-mono">
                      {SHAPE_LABELS[mold.shape_type] || mold.shape_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onLoad(mold.shape_type, mold.params)}
                      className="p-1.5 rounded-lg bg-white hover:bg-terracotta-100 border border-terracotta-100 text-terracotta-600 transition"
                      title="Carregar este molde"
                      aria-label={`Carregar molde ${mold.name}`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(mold.id)}
                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 border border-red-100/60 text-red-400 hover:text-red-600 transition"
                        title="Excluir"
                        aria-label={`Excluir molde ${mold.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
