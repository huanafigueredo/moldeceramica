import React, { useState } from 'react';
import { Search, Sparkles, Compass, AlertTriangle, ArrowRight, RotateCw, ExternalLink, Globe } from 'lucide-react';
import { ShapeType } from '../types';

interface AITemplateFinderProps {
  onSelectModel: (
    shapeType: ShapeType,
    params: any
  ) => void;
  globalShrinkage: number;
}

interface SearchResult {
  id: string;
  name: string;
  source: string;
  description: string;
  shapeType: ShapeType;
  dimensions: {
    desiredHeight?: number;
    desiredDiameter?: number;
    topDiameter?: number;
    bottomDiameter?: number;
    height?: number;
    length?: number;
    width?: number;
    lipHeight?: number;
    lipAngle?: number;
    width_napkin?: number;
    height_napkin?: number;
    depth_napkin?: number;
    thickness_napkin?: number;
    depth?: number;
    thickness?: number;
  };
}

const SUGGESTIONS = [
  "Caneca Cônica de Chá",
  "Vaso Cilíndrico de Plantas",
  "Travessa para Sushi Oval",
  "Porta-Guardanapo Rústico de Mesa",
  "Copo Cilíndrico de Café 250ml"
];

export default function AITemplateFinder({ onSelectModel, globalShrinkage }: AITemplateFinderProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setIsFallback(false);
    setWarning(null);

    try {
      const response = await fetch("/api/search-molds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Houve um erro desconhecido.");
      }

      setResults(data.results);
      if (data.isFallback) {
        setIsFallback(true);
        setWarning(data.warning);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const selectItem = (item: SearchResult) => {
    // Robust float parsing helper to clean any text suffixes or strings
    const parseDim = (val: any, defaultVal: number): number => {
      if (val === undefined || val === null) return defaultVal;
      if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
      const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? defaultVal : parsed;
    };

    // Normalize shape type to handle variations, case differences, or translations
    let normalizedShape: ShapeType = 'cylinder';
    const sType = String(item.shapeType || '').toLowerCase();
    if (sType.includes('cylinder') || sType.includes('cilindro') || sType.includes('copo') || sType.includes('caneca_ret')) {
      normalizedShape = 'cylinder';
    } else if (sType.includes('cone') || sType.includes('conico') || sType.includes('cônico') || sType.includes('vaso')) {
      if (sType.includes('tray') || sType.includes('prato') || sType.includes('travessa')) {
        normalizedShape = 'tray';
      } else {
        normalizedShape = 'cone';
      }
    } else if (sType.includes('tray') || sType.includes('prato') || sType.includes('travessa') || sType.includes('plate') || sType.includes('cinzeiro')) {
      normalizedShape = 'tray';
    } else if (sType.includes('napkin') || sType.includes('holder') || sType.includes('guardanapo') || sType.includes('suporte') || sType.includes('placa')) {
      normalizedShape = 'napkin_holder';
    } else if (sType.includes('box') || sType.includes('caixa') || sType.includes('prisma') || sType.includes('retangular') || sType.includes('bloco')) {
      normalizedShape = 'box';
    } else {
      // Default fallback based on fields present in the response
      if (item.dimensions?.topDiameter || item.dimensions?.bottomDiameter) {
        normalizedShape = 'cone';
      } else if (item.dimensions?.length || item.dimensions?.width) {
        normalizedShape = 'tray';
      } else if (item.dimensions?.width_napkin || item.dimensions?.height_napkin) {
        normalizedShape = 'napkin_holder';
      } else if (sType.includes('caixa') || sType.includes('box')) {
        normalizedShape = 'box';
      } else {
        normalizedShape = 'cylinder';
      }
    }

    // Map the incoming dimensions safely
    let mappedParams: any = { shrinkage: globalShrinkage };

    if (normalizedShape === 'cylinder') {
      mappedParams = {
        desiredHeight: parseDim(item.dimensions?.desiredHeight || item.dimensions?.height, 15),
        desiredDiameter: parseDim(item.dimensions?.desiredDiameter || item.dimensions?.width || item.dimensions?.topDiameter, 8),
        shrinkage: globalShrinkage,
        seamAllowance: 1.5,
        hasHoles: false,
        holeDiameter: 0.8,
        holeSpacing: 2.5,
      };
    } else if (normalizedShape === 'cone') {
      mappedParams = {
        topDiameter: parseDim(item.dimensions?.topDiameter || item.dimensions?.desiredDiameter, 12),
        bottomDiameter: parseDim(item.dimensions?.bottomDiameter, 7),
        height: parseDim(item.dimensions?.height || item.dimensions?.desiredHeight, 16),
        shrinkage: globalShrinkage,
        seamAllowance: 1.5,
      };
    } else if (normalizedShape === 'tray') {
      mappedParams = {
        length: parseDim(item.dimensions?.length || item.dimensions?.width, 22),
        width: parseDim(item.dimensions?.width || item.dimensions?.length, 14),
        lipHeight: parseDim(item.dimensions?.lipHeight, 3.5),
        lipAngle: parseDim(item.dimensions?.lipAngle, 45),
        shrinkage: globalShrinkage,
      };
    } else if (normalizedShape === 'napkin_holder') {
      mappedParams = {
        width: parseDim(item.dimensions?.width_napkin || item.dimensions?.width || item.dimensions?.length, 12),
        height: parseDim(item.dimensions?.height_napkin || item.dimensions?.height || item.dimensions?.desiredHeight, 8),
        depth: parseDim(item.dimensions?.depth_napkin || item.dimensions?.depth, 5),
        shrinkage: globalShrinkage,
        thickness: parseDim(item.dimensions?.thickness_napkin || item.dimensions?.thickness, 0.8),
      };
    } else if (normalizedShape === 'box') {
      mappedParams = {
        width: parseDim(item.dimensions?.width || item.dimensions?.length, 14),
        height: parseDim(item.dimensions?.height || item.dimensions?.desiredHeight, 10),
        depth: parseDim(item.dimensions?.depth, 8),
        shrinkage: globalShrinkage,
        thickness: parseDim(item.dimensions?.thickness, 0.8),
        seamAllowance: 1.0,
        hasLid: false,
      };
    }

    onSelectModel(normalizedShape, mappedParams);
  };

  const getShapeLabel = (type: ShapeType) => {
    switch (type) {
      case 'cylinder': return 'Luminária/Copo Cilíndrico';
      case 'cone': return 'Caneca/Vaso Cônico';
      case 'tray': return 'Prato/Travessa';
      case 'napkin_holder': return 'Porta-Guardanapo';
      case 'box': return 'Caixa / Prismas';
    }
  };

  const renderDimensionsSummary = (item: SearchResult) => {
    const d = item.dimensions;
    if (item.shapeType === 'cylinder') {
      return `Altura: ${d.desiredHeight?.toFixed(1) || '15'} cm | Diâmetro: ${d.desiredDiameter?.toFixed(1) || '8'} cm`;
    } else if (item.shapeType === 'cone') {
      return `Altura: ${d.height?.toFixed(1) || '16'} cm | Diâmetro Topo: ${d.topDiameter?.toFixed(1) || '12'} cm | Diâmetro Base: ${d.bottomDiameter?.toFixed(1) || '7'} cm`;
    } else if (item.shapeType === 'tray') {
      return `Comprimento: ${d.length?.toFixed(1) || '22'} cm | Largura: ${d.width?.toFixed(1) || '14'} cm | Altura da Borda: ${d.lipHeight?.toFixed(1) || '3.5'} cm (${d.lipAngle || '45'}° de inclinação)`;
    } else if (item.shapeType === 'napkin_holder') {
      return `Largura: ${(d.width_napkin || d.width)?.toFixed(1) || '12'} cm | Altura: ${(d.height_napkin || d.height)?.toFixed(1) || '8'} cm | Profundidade: ${(d.depth_napkin || d.depth)?.toFixed(1) || '5'} cm (Espessura recomendada: ${(d.thickness_napkin || d.thickness || 0.8).toFixed(1)} cm)`;
    } else if (item.shapeType === 'box') {
      return `Largura: ${d.width?.toFixed(1) || '14'} cm | Altura: ${d.height?.toFixed(1) || '10'} cm | Profundidade: ${d.depth?.toFixed(1) || '8'} cm (Espessura: ${(d.thickness || 0.8).toFixed(1)} cm)`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Search Bar container */}
      <div className="bg-white rounded-3xl border border-terracotta-100 p-8 md:p-12 shadow-sm">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-clay-900 tracking-tight">Biblioteca Inteligente</h2>
            <p className="text-sm text-clay-900/50 max-w-sm mx-auto leading-relaxed">
              Pesquise qualquer peça e nós calculamos as medidas técnicas baseadas em referências mundiais.
            </p>
          </div>

          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: caneca cônica 300ml..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch(query);
                }}
                className="w-full h-12 pl-4 pr-10 bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 focus:outline-none rounded-2xl text-sm transition"
              />
              <Search className="w-5 h-5 absolute right-4 top-3.5 text-clay-900/20" />
            </div>
            <button
              onClick={() => handleSearch(query)}
              disabled={loading || !query.trim()}
              className="bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white h-12 px-6 rounded-2xl font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-sm"
            >
              {loading ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Gerar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-center">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="text-[10px] bg-white hover:bg-terracotta-50 text-clay-900/40 hover:text-terracotta-600 border border-terracotta-100 px-3 py-1.5 rounded-full cursor-pointer transition font-bold uppercase tracking-wider"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 max-w-2xl mx-auto flex gap-3.5 items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-red-950">Não foi possível buscar na internet</h4>
            <p className="text-xs text-red-900/70 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* FALLBACK WARNING DISPLAY */}
      {isFallback && warning && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 max-w-2xl mx-auto flex gap-3.5 items-start shadow-sm">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Modo de Consulta Offline Ativo</h4>
            <p className="text-xs text-amber-900/70 leading-relaxed font-sans">{warning}</p>
          </div>
        </div>
      )}

      {/* LOADING WAITING SCREEN */}
      {loading && (
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-terracotta-100 p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            {/* Ceramic turning wheel animation */}
            <div className="absolute inset-0 border-4 border-terracotta-200 border-t-terracotta-600 rounded-full animate-spin" />
            <Compass className="w-7 h-7 text-terracotta-600 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-clay-900">Buscando na Web & Calculando Moldes...</h4>
            <p className="text-xs text-clay-900/50 max-w-md mx-auto leading-relaxed">
              Consultando sites especializados e catálogos para extrair as medidas perfeitas recomendadas de <b>"{query}"</b>.
            </p>
          </div>
        </div>
      )}

      {/* SEARCH RESULTS LIST */}
      {results && results.length > 0 && (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-clay-900/40 uppercase tracking-widest">
              Encontramos 5 Modelos de Referência:
            </span>
            <span className="text-[10px] text-clay-900/50 font-mono flex items-center gap-1">
              <Globe className={`w-3.5 h-3.5 ${isFallback ? 'text-amber-500' : 'text-emerald-500'}`} />
              {isFallback ? 'Biblioteca Offline' : 'BuscaGrounding Online'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {results.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white border border-terracotta-100 hover:border-terracotta-300 rounded-2xl p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden group"
              >
                <div className="space-y-2 flex-1">
                  {/* Badge & source */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-clay-50 border border-terracotta-100 text-[10px] text-clay-900/70 rounded-full font-bold">
                      {getShapeLabel(item.shapeType)}
                    </span>
                    <span className="text-[10px] text-terracotta-600 font-medium flex items-center gap-0.5 bg-terracotta-50 px-2 py-0.5 rounded-full">
                      Ref: {item.source}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-serif font-extrabold text-clay-900">
                    {item.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-clay-900/60 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Dimensions Box */}
                  <div className="inline-block bg-clay-50/70 border border-terracotta-100/30 rounded-xl px-3 py-1.5 text-xs text-clay-900/70 font-mono font-medium">
                    <span className="text-terracotta-600 font-sans font-bold block text-[9px] uppercase tracking-wider">Medidas Estimadas da Peça:</span>
                    {renderDimensionsSummary(item)}
                  </div>
                </div>

                {/* Generate Button container */}
                <div className="shrink-0">
                  <button
                    onClick={() => selectItem(item)}
                    className="w-full md:w-auto bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-terracotta-600/10 group-hover:scale-[1.02]"
                  >
                    Gerar Molde 1:1
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[9px] text-clay-900/40 text-center mt-1.5 font-sans">Pronto para imprimir</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
