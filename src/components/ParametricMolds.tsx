import React from 'react';
import { Link } from 'react-router-dom';
import { ShapeType, CylinderParams, ConeParams, TrayParams, NapkinHolderParams, BoxParams, OrganicPlateParams, BowlParams, VaseParams } from '../types';
import { Compass, Coffee, Disc, Star, HelpCircle, CheckCircle, Package, ChevronRight, Leaf, Shuffle, Wand2, RotateCcw, Droplet, PlusCircle, Soup, Amphora } from 'lucide-react';
import { computeOrganicOutline, generateOrganicControlPoints } from '../utils/organicShape';
import OrganicPointEditor from './OrganicPointEditor';
import { computeCylinderCapacity, computeConeCapacity, computeBowlCapacity, computeVaseCapacity, mlToOz } from '../utils/capacity';
import SavedMoldsPanel from './SavedMoldsPanel';
import { useAdminSession } from '../lib/adminAuth';

interface ParametricMoldsProps {
  shapeType: ShapeType;
  setShapeType: (type: ShapeType) => void;
  globalShrinkage: number;
  params: CylinderParams | ConeParams | TrayParams | NapkinHolderParams | BoxParams | OrganicPlateParams | BowlParams | VaseParams;
  onChangeParams: (newParams: any) => void;
}

export default function ParametricMolds({
  shapeType,
  setShapeType,
  globalShrinkage,
  params,
  onChangeParams,
}: ParametricMoldsProps) {
  const [showScale, setShowScale] = React.useState(false);
  const { isAdmin } = useAdminSession();

  const handleUpdate = (key: string, value: any) => {
    onChangeParams({
      ...params,
      [key]: value,
    });
  };

  // Helper for rendering form labels with help guides
  const labelWithTip = (label: string, tip: string) => (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-xs font-semibold text-clay-900">{label}</span>
      <span className="group relative cursor-help text-clay-900/30 hover:text-terracotta-500">
        <HelpCircle className="w-3.5 h-3.5" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-clay-900 text-white text-[10px] rounded-lg shadow-lg z-50 text-center leading-normal">
          {tip}
        </span>
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* SHAPE SELECTOR */}
      {/* SHAPE SELECTOR */}
      <div>
        <h4 className="text-xs font-bold text-clay-900/40 uppercase tracking-widest mb-3">Escolha o Molde Base</h4>
        <div className="grid grid-cols-2 gap-3">
          {/* Add New Shape — admin only, shortcut into the library registration form */}
          {isAdmin && (
            <Link
              to="/admin?tab=nova-referencia"
              className="p-3.5 rounded-xl border border-dashed border-terracotta-300 text-left transition flex flex-col gap-1.5 bg-terracotta-50/40 hover:bg-terracotta-50 text-terracotta-700"
            >
              <PlusCircle className="w-5 h-5 text-terracotta-500" />
              <div>
                <div className="text-xs font-bold font-sans">Adicionar Novo</div>
                <div className="text-[10px] text-terracotta-600/70">
                  Cadastrar molde na biblioteca
                </div>
              </div>
            </Link>
          )}

          {/* Cylinder */}
          <button
            onClick={() => setShapeType('cylinder')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'cylinder'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Compass className={`w-5 h-5 ${shapeType === 'cylinder' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Luminária Cilíndrica</div>
              <div className={`text-[10px] ${shapeType === 'cylinder' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Cilindro com furos decorativos
              </div>
            </div>
          </button>

          {/* Cone */}
          <button
            onClick={() => setShapeType('cone')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'cone'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Coffee className={`w-5 h-5 ${shapeType === 'cone' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Caneca / Vaso Cônico</div>
              <div className={`text-[10px] ${shapeType === 'cone' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Formas cônicas truncadas
              </div>
            </div>
          </button>

          {/* Tray */}
          <button
            onClick={() => setShapeType('tray')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'tray'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Disc className={`w-5 h-5 ${shapeType === 'tray' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Prato / Travessa</div>
              <div className={`text-[10px] ${shapeType === 'tray' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Moldes com abas dobráveis
              </div>
            </div>
          </button>

          {/* Napkin Holder */}
          <button
            onClick={() => setShapeType('napkin_holder')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'napkin_holder'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Star className={`w-5 h-5 ${shapeType === 'napkin_holder' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Porta-Guardanapo</div>
              <div className={`text-[10px] ${shapeType === 'napkin_holder' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Placas com chanfro de 45°
              </div>
            </div>
          </button>

          {/* Box / Caixa */}
          <button
            onClick={() => setShapeType('box')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'box'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Package className={`w-5 h-5 ${shapeType === 'box' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Caixa / Prismas</div>
              <div className={`text-[10px] ${shapeType === 'box' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Moldes planificados (caixa)
              </div>
            </div>
          </button>

          {/* Organic Plate */}
          <button
            onClick={() => setShapeType('organic_plate')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'organic_plate'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Leaf className={`w-5 h-5 ${shapeType === 'organic_plate' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Prato Orgânico</div>
              <div className={`text-[10px] ${shapeType === 'organic_plate' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Contorno livre, nem redondo nem reto
              </div>
            </div>
          </button>

          {/* Bowl */}
          <button
            onClick={() => setShapeType('bowl')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'bowl'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Soup className={`w-5 h-5 ${shapeType === 'bowl' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Tigela / Bowl</div>
              <div className={`text-[10px] ${shapeType === 'bowl' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Parede curva — de tigela funda a prato fundo
              </div>
            </div>
          </button>

          {/* Vase */}
          <button
            onClick={() => setShapeType('vase')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1.5 ${
              shapeType === 'vase'
                ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-md shadow-terracotta-500/10'
                : 'bg-white/60 hover:bg-white border-terracotta-100 hover:border-terracotta-300 text-clay-900'
            }`}
          >
            <Amphora className={`w-5 h-5 ${shapeType === 'vase' ? 'text-white' : 'text-terracotta-500'}`} />
            <div>
              <div className="text-xs font-bold font-sans">Jarra / Vaso</div>
              <div className={`text-[10px] ${shapeType === 'vase' ? 'text-terracotta-100' : 'text-clay-900/50'}`}>
                Corpo largo com gargalo estreito
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* SAVED MOLDS LIBRARY (Supabase, shared, no login) */}
      <SavedMoldsPanel
        shapeType={shapeType}
        params={params}
        onLoad={(loadedShape, loadedParams) => {
          setShapeType(loadedShape);
          onChangeParams(loadedParams);
        }}
      />

      {/* COIN COMPARISON SCALE WIDGET */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-terracotta-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowScale(!showScale)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-terracotta-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-terracotta-500" />
            <h5 className="text-[11px] font-bold text-clay-900/70 uppercase tracking-wider font-sans">
              Escala de Proporção Real
            </h5>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-clay-900/40 font-sans">
               {showScale ? 'Ocultar' : 'Comparar com moeda'}
             </span>
             <ChevronRight className={`w-4 h-4 text-clay-900/30 transition-transform ${showScale ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {showScale && (
          <div className="p-4 pt-0 space-y-3 animate-fadeIn">
            {(() => {
              const getComparisonDimensions = () => {
          let h = 10;
          let w = 10;
          let label = '';
          
          if (shapeType === 'cylinder') {
            const p = params as CylinderParams;
            h = p.desiredHeight || 15;
            w = p.desiredDiameter || 8;
            label = `Luminária Cilíndrica (${w.toFixed(1)} x ${h.toFixed(1)} cm)`;
          } else if (shapeType === 'cone') {
            const p = params as ConeParams;
            h = p.height || 16;
            w = Math.max(p.topDiameter || 12, p.bottomDiameter || 7);
            label = `Caneca/Vaso Cônico (${w.toFixed(1)} x ${h.toFixed(1)} cm)`;
          } else if (shapeType === 'tray') {
            const p = params as TrayParams;
            const angleRad = (((p.lipAngle || 45)) * Math.PI) / 180;
            h = (p.lipHeight || 3.5) * Math.sin(angleRad);
            w = p.length || 22;
            label = `Prato/Travessa (${w.toFixed(1)} x ${h.toFixed(1)} cm)`;
          } else if (shapeType === 'napkin_holder') {
            const p = params as NapkinHolderParams;
            h = p.height || 8;
            w = p.width || 12;
            label = `Porta-Guardanapo (${w.toFixed(1)} x ${h.toFixed(1)} cm)`;
          } else if (shapeType === 'box') {
            const p = params as BoxParams;
            h = p.height || 10;
            w = p.width || 14;
            label = `Caixa Retangular (${w.toFixed(1)} x ${p.depth.toFixed(1)} x ${h.toFixed(1)} cm)`;
          } else if (shapeType === 'organic_plate') {
            const p = params as OrganicPlateParams;
            const effLip = p.hasLip !== false ? (p.lipHeight || 3) : 0;
            const angleRad = (((p.lipAngle || 40)) * Math.PI) / 180;
            const outline = computeOrganicOutline(p.baseRadius || 11, p.irregularity ?? 40, p.seed || 1, effLip, p.lipAngle || 40, 9, 20, p.customPoints);
            h = Math.max(0.4, effLip * Math.sin(angleRad));
            w = outline.bboxW;
            label = `Prato Orgânico (${outline.bboxW.toFixed(1)} x ${outline.bboxH.toFixed(1)} cm)`;
          } else if (shapeType === 'bowl') {
            const p = params as BowlParams;
            h = p.height || 9;
            w = Math.max(p.topDiameter || 18, p.bottomDiameter || 8);
            label = `Tigela/Bowl (${w.toFixed(1)} x ${h.toFixed(1)} cm)`;
          } else if (shapeType === 'vase') {
            const p = params as VaseParams;
            h = p.height || 22;
            w = Math.max(p.shoulderDiameter || 16, p.baseDiameter || 9, p.neckDiameter || 6);
            label = `Jarra/Vaso (${w.toFixed(1)} x ${h.toFixed(1)} cm)`;
          }

          return { h: Math.max(0.5, h), w: Math.max(0.5, w), label };
        };

        const comp = getComparisonDimensions();
        const maxH = Math.max(comp.h, 2.7);
        const maxW = Math.max(comp.w, 2.7);
        const scaleH = 80 / maxH;
        const scaleW = 140 / maxW;
        const k = Math.min(scaleH, scaleW, 12);
        const r = 1.35 * k;
        const cy = 105 - r;

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h5 className="text-xs font-bold text-clay-900/70 uppercase tracking-wider font-sans">
                  Objeto Pronto vs. Moeda de Referência
                </h5>
              </div>
              <span className="text-[9px] text-clay-900/40 font-mono">Comparação 2D</span>
            </div>

            {/* SVG Canvas for Scale comparison */}
            <div className="relative h-32 w-full bg-clay-50/70 rounded-xl border border-terracotta-100/30 overflow-hidden flex items-center justify-center">
              <svg viewBox="0 0 320 120" width="100%" height="100%" className="font-sans">
                <defs>
                  {/* Real gold gradient for coin ring */}
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dfb76c" />
                    <stop offset="50%" stopColor="#f5e3a0" />
                    <stop offset="100%" stopColor="#b2873d" />
                  </linearGradient>
                  {/* Silver gradient for coin core */}
                  <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d8d8d8" />
                    <stop offset="50%" stopColor="#fcfcfc" />
                    <stop offset="100%" stopColor="#a8a8a8" />
                  </linearGradient>
                  {/* Clay terracotta gradient */}
                  <linearGradient id="clayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#cf7c53" />
                    <stop offset="100%" stopColor="#8e4a23" />
                  </linearGradient>
                </defs>

                {/* Grid Background */}
                <g opacity="0.05">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line key={`grid-h-${i}`} x1="0" y1={i * 10} x2="320" y2={i * 10} stroke="#17171a" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 32 }).map((_, i) => (
                    <line key={`grid-v-${i}`} x1={i * 10} y1="0" x2={i * 10} y2="120" stroke="#17171a" strokeWidth="0.5" />
                  ))}
                </g>

                {/* Workbench bench shelf line */}
                <rect x="10" y="105" width="300" height="4" fill="#a17a5e" rx="2" />
                <rect x="10" y="109" width="300" height="6" fill="#846046" rx="1" />

                {/* COIN DRAWING (R$ 1) */}
                <g>
                  {/* Outer gold ring */}
                  <circle cx="55" cy={cy} r={r} fill="url(#goldGrad)" stroke="#aa8234" strokeWidth="0.5" />
                  {/* Inner silver core */}
                  <circle cx="55" cy={cy} r={r * 0.72} fill="url(#silverGrad)" stroke="#929292" strokeWidth="0.5" />
                  {/* Coin details */}
                  <text
                    x="55"
                    y={cy - r * 0.12}
                    fill="#4a4a4a"
                    fontSize={r * 0.85}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontFamily: 'monospace' }}
                  >
                    1
                  </text>
                  <text
                    x="55"
                    y={cy + r * 0.45}
                    fill="#2c4cdb"
                    fontSize={r * 0.32}
                    fontWeight="extrabold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ letterSpacing: '0.02px' }}
                  >
                    REAL
                  </text>
                </g>

                {/* Coin label dimensions */}
                <line x1="30" y1="105" x2="30" y2={105 - 2.7 * k} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="27" y1={105} x2="33" y2={105} stroke="#9ca3af" strokeWidth="1" />
                <line x1="27" y1={105 - 2.7 * k} x2="33" y2={105 - 2.7 * k} stroke="#9ca3af" strokeWidth="1" />
                <text x="23" y={cy + 3} fill="#6b7280" fontSize="8px" fontWeight="bold" textAnchor="end">Moeda (2,7 cm)</text>

                {/* FINISHED SHAPE DRAWING */}
                <g>
                  {shapeType === 'cylinder' && (
                    (() => {
                      const finish = (params as CylinderParams).edgeFinish || 'straight';
                      const cw = comp.w * k;
                      const ch = comp.h * k;
                      const x1 = 190 - cw / 2;
                      const x2 = 190 + cw / 2;
                      const yBottom = 105;
                      const yTopBase = 105 - ch;

                      if (finish === 'straight') {
                        return (
                          <rect
                            x={x1}
                            y={yTopBase}
                            width={cw}
                            height={ch}
                            fill="url(#clayGrad)"
                            stroke="#7d3f1c"
                            strokeWidth="1.5"
                            rx={Math.min(6, cw * 0.1)}
                          />
                        );
                      } else if (finish === 'scalloped') {
                        const scW = cw / 3;
                        let dStr = `M ${x1} ${yBottom} L ${x1} ${yTopBase + 3}`;
                        for (let i = 0; i < 3; i++) {
                          const sx1 = x1 + i * scW;
                          const sx2 = x1 + (i + 1) * scW;
                          const sMid = sx1 + scW / 2;
                          dStr += ` Q ${sMid} ${yTopBase} ${sx2} ${yTopBase + 3}`;
                        }
                        dStr += ` L ${x2} ${yBottom} Z`;
                        return (
                          <path d={dStr} fill="url(#clayGrad)" stroke="#7d3f1c" strokeWidth="1.5" />
                        );
                      } else {
                        let dStr = `M ${x1} ${yBottom} L ${x1} ${yTopBase + 2}`;
                        const steps = 15;
                        const stepW = cw / steps;
                        for (let i = 0; i <= steps; i++) {
                          const sx = x1 + i * stepW;
                          const sy = (yTopBase + 2) - 2 * Math.sin((i / steps) * 2 * 2 * Math.PI);
                          dStr += ` L ${sx} ${sy}`;
                        }
                        dStr += ` L ${x2} ${yBottom} Z`;
                        return (
                          <path d={dStr} fill="url(#clayGrad)" stroke="#7d3f1c" strokeWidth="1.5" />
                        );
                      }
                    })()
                  )}

                  {shapeType === 'cone' && (
                    <path
                      d={`
                        M ${190 - (((params as ConeParams).topDiameter || 12) * k) / 2} ${105 - comp.h * k}
                        L ${190 + (((params as ConeParams).topDiameter || 12) * k) / 2} ${105 - comp.h * k}
                        L ${190 + (((params as ConeParams).bottomDiameter || 7) * k) / 2} ${105}
                        L ${190 - (((params as ConeParams).bottomDiameter || 7) * k) / 2} ${105}
                        Z
                      `}
                      fill="url(#clayGrad)"
                      stroke="#7d3f1c"
                      strokeWidth="1.5"
                    />
                  )}

                  {shapeType === 'tray' && (
                    <path
                      d={`
                        M ${190 - (comp.w * k) / 2} ${105 - comp.h * k}
                        L ${190 - (comp.w * k) / 2 + Math.max(3, k * 0.6)} ${105}
                        L ${190 + (comp.w * k) / 2 - Math.max(3, k * 0.6)} ${105}
                        L ${190 + (comp.w * k) / 2} ${105 - comp.h * k}
                      `}
                      fill="none"
                      stroke="url(#clayGrad)"
                      strokeWidth={Math.max(3, k * 0.4)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {shapeType === 'napkin_holder' && (
                    (() => {
                      const finish = (params as NapkinHolderParams).edgeFinish || 'straight';
                      const cw = comp.w * k;
                      const ch = comp.h * k;
                      const x1 = 190 - cw / 2;
                      const x2 = 190 + cw / 2;
                      const yBottom = 105;
                      const yTopBase = 105 - ch;

                      const getPlateD = (offsetX: number, offsetY: number) => {
                        const px1 = x1 + offsetX;
                        const px2 = x2 + offsetX;
                        const pyBottom = yBottom + offsetY;
                        const pyTopBase = yTopBase + offsetY;

                        if (finish === 'straight') {
                          return `M ${px1} ${pyBottom} L ${px1} ${pyTopBase} L ${px2} ${pyTopBase} L ${px2} ${pyBottom} Z`;
                        } else if (finish === 'rounded') {
                          const rArch = Math.min(cw / 2, ch);
                          return `M ${px1} ${pyBottom} L ${px1} ${pyBottom - rArch} A ${rArch} ${rArch} 0 0 1 ${px2} ${pyBottom - rArch} L ${px2} ${pyBottom} Z`;
                        } else {
                          const n = 3;
                          const scW = cw / n;
                          let dStr = `M ${px1} ${pyBottom} L ${px1} ${pyTopBase + 3}`;
                          for (let i = 0; i < n; i++) {
                            const sx1 = px1 + i * scW;
                            const sx2 = px1 + (i + 1) * scW;
                            const sMid = sx1 + scW / 2;
                            dStr += ` Q ${sMid} ${pyTopBase} ${sx2} ${pyTopBase + 3}`;
                          }
                          dStr += ` L ${px2} ${pyBottom} Z`;
                          return dStr;
                        }
                      };

                      return (
                        <g>
                          {/* Back plate of napkin holder */}
                          <path
                            d={getPlateD(5, -5)}
                            fill="#7d3f1c"
                            opacity="0.8"
                            stroke="#683216"
                            strokeWidth="1"
                          />
                          {/* Connecting bottom piece */}
                          <polygon
                            points={`
                              ${x1},105
                              ${x1 + 5},100
                              ${x2 + 5},100
                              ${x2},105
                            `}
                            fill="#683216"
                          />
                          {/* Front plate */}
                          <path
                            d={getPlateD(0, 0)}
                            fill="url(#clayGrad)"
                            stroke="#7d3f1c"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })()
                  )}

                  {shapeType === 'box' && (
                    (() => {
                      const cw = comp.w * k;
                      const ch = comp.h * k;
                      const x1 = 190 - cw / 2;
                      const x2 = 190 + cw / 2;
                      const yBottom = 105;
                      const yTop = 105 - ch;
                      const depthOffset = Math.min(14, cw * 0.18, ch * 0.3);

                      return (
                        <g>
                          {/* Top face (suggests depth) */}
                          <polygon
                            points={`${x1},${yTop} ${x2},${yTop} ${x2 + depthOffset},${yTop - depthOffset} ${x1 + depthOffset},${yTop - depthOffset}`}
                            fill="#7d3f1c"
                            opacity="0.75"
                            stroke="#683216"
                            strokeWidth="1"
                          />
                          {/* Side face (suggests depth) */}
                          <polygon
                            points={`${x2},${yTop} ${x2},${yBottom} ${x2 + depthOffset},${yBottom - depthOffset} ${x2 + depthOffset},${yTop - depthOffset}`}
                            fill="#683216"
                            opacity="0.85"
                          />
                          {/* Front face */}
                          <rect
                            x={x1}
                            y={yTop}
                            width={cw}
                            height={ch}
                            fill="url(#clayGrad)"
                            stroke="#7d3f1c"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })()
                  )}

                  {shapeType === 'organic_plate' && (
                    <path
                      d={`
                        M ${190 - (comp.w * k) / 2} ${105 - comp.h * k}
                        L ${190 - (comp.w * k) / 2 + Math.max(3, k * 0.6)} ${105}
                        L ${190 + (comp.w * k) / 2 - Math.max(3, k * 0.6)} ${105}
                        L ${190 + (comp.w * k) / 2} ${105 - comp.h * k}
                      `}
                      fill="none"
                      stroke="url(#clayGrad)"
                      strokeWidth={Math.max(3, k * 0.4)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>

                {/* Shape label and height dimensions */}
                <line x1="280" y1="105" x2="280" y2={105 - comp.h * k} stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="277" y1={105} x2="283" y2={105} stroke="#9ca3af" strokeWidth="1" />
                <line x1="277" y1={105 - comp.h * k} x2="283" y2={105 - comp.h * k} stroke="#9ca3af" strokeWidth="1" />
                <text x="286" y={105 - (comp.h * k) / 2 + 3} fill="#6b7280" fontSize="8px" fontWeight="bold" textAnchor="start">
                  {comp.h.toFixed(1)} cm
                </text>
              </svg>
            </div>
            
            {/* Visual description */}
            <div className="text-[10px] text-clay-900/60 leading-normal text-center font-sans">
              Peça pronta estimada: <b className="text-terracotta-600">{comp.label}</b>
            </div>
          </div>
        );
      })()}
    </div>
  )}
</div>

      {/* PARAMETERS CONFIGURATION PANEL */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-terracotta-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xs font-bold text-clay-900/40 uppercase tracking-widest">Configuração do Molde</h4>
          <div className="flex items-center gap-2 text-[10px] text-clay-900/40 font-mono">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Retração: {globalShrinkage}%
          </div>
        </div>

        {shapeType === 'cylinder' && (
          <div className="space-y-6">
            {/* Basic Dimensions Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Dimensões Básicas</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Altura Desejada"
                  tip="Altura final da peça após a queima"
                  value={(params as CylinderParams).desiredHeight}
                  min={5}
                  max={50}
                  step={0.5}
                  onChange={(val) => handleUpdate('desiredHeight', val)}
                />
                <SliderInput
                  label="Diâmetro Desejado"
                  tip="Diâmetro externo final após a queima"
                  value={(params as CylinderParams).desiredDiameter}
                  min={4}
                  max={30}
                  step={0.5}
                  onChange={(val) => handleUpdate('desiredDiameter', val)}
                />
              </div>
              <SliderInput
                label="Espessura da Parede"
                tip="Espessura da placa de argila; usada para estimar a capacidade interna"
                value={(params as CylinderParams).wallThickness ?? 0.6}
                min={0.3}
                max={2.0}
                step={0.1}
                onChange={(val) => handleUpdate('wallThickness', val)}
              />
              <CapacityCard
                {...computeCylinderCapacity(
                  (params as CylinderParams).desiredDiameter,
                  (params as CylinderParams).desiredHeight,
                  (params as CylinderParams).wallThickness ?? 0.6
                )}
              />
            </div>

            {/* Details and Finish Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Acabamento e Montagem</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Margem de Costura"
                  tip="Sobreposição para colagem"
                  value={(params as CylinderParams).seamAllowance}
                  min={0.2}
                  max={4.0}
                  step={0.1}
                  onChange={(val) => handleUpdate('seamAllowance', val)}
                />
                <div className="p-3.5 bg-white/60 border border-terracotta-100/40 rounded-xl shadow-xs">
                  {labelWithTip("Borda Superior", "Estilo de corte decorativo")}
                  <select
                    value={(params as CylinderParams).edgeFinish || 'straight'}
                    onChange={(e) => handleUpdate('edgeFinish', e.target.value)}
                    className="w-full bg-white border border-terracotta-100 rounded-xl px-3 py-2 text-clay-900 text-xs font-medium focus:outline-none focus:border-terracotta-500 shadow-2xs mt-1"
                  >
                    <option value="straight">▬ Reto padrão</option>
                    <option value="scalloped">◠ Recortado (Vieiras)</option>
                    <option value="wave">〰 Ondulado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Decoration Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-400 rounded-full" />
                  <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Furos Decorativos</h5>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    checked={(params as CylinderParams).hasHoles}
                    onChange={(e) => handleUpdate('hasHoles', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-terracotta-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terracotta-500"></div>
                </label>
              </div>

              {(params as CylinderParams).hasHoles && (
                <div className="space-y-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderInput
                      label="Diâmetro Furo"
                      tip="Tamanho final de cada furo"
                      value={(params as CylinderParams).holeDiameter}
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      onChange={(val) => handleUpdate('holeDiameter', val)}
                    />
                    <SliderInput
                      label="Espaçamento"
                      tip="Distância entre furos"
                      value={(params as CylinderParams).holeSpacing}
                      min={0.5}
                      max={10.0}
                      step={0.1}
                      onChange={(val) => handleUpdate('holeSpacing', val)}
                    />
                  </div>
                  <div className="p-3.5 bg-white/80 border border-indigo-100/40 rounded-xl shadow-xs">
                    {labelWithTip("Formato do Vazado", "Design geométrico dos furos")}
                    <select
                      value={(params as CylinderParams).holeShape || 'circle'}
                      onChange={(e) => handleUpdate('holeShape', e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-clay-900 text-xs font-medium focus:outline-none focus:border-indigo-500 shadow-2xs mt-1"
                    >
                      <option value="circle">● Círculo</option>
                      <option value="square">■ Quadrado</option>
                      <option value="flower">✿ Flor</option>
                      <option value="star">★ Estrela</option>
                      <option value="rectangle">▬ Fenda</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Handle Section — turns the cylinder into a mug/cup */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-400 rounded-full" />
                  <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Alça (Xícara)</h5>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    checked={(params as CylinderParams).hasHandle ?? false}
                    onChange={(e) => handleUpdate('hasHandle', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-terracotta-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terracotta-500"></div>
                </label>
              </div>

              {(params as CylinderParams).hasHandle && (
                <div className="space-y-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderInput
                      label="Largura da Alça"
                      tip="Espessura da tira de argila que forma a alça"
                      value={(params as CylinderParams).handleWidth ?? 2.2}
                      min={1}
                      max={5}
                      step={0.1}
                      onChange={(val) => handleUpdate('handleWidth', val)}
                    />
                    <SliderInput
                      label="Projeção da Alça"
                      tip="Quanto a alça se afasta da parede da peça"
                      value={(params as CylinderParams).handleProjection ?? 5}
                      min={2}
                      max={10}
                      step={0.5}
                      onChange={(val) => handleUpdate('handleProjection', val)}
                    />
                  </div>
                  <SliderInput
                    label="Vão de Fixação"
                    tip="Distância vertical entre os dois pontos onde a alça encosta na peça, como % da altura"
                    value={(params as CylinderParams).handleSpanPercent ?? 55}
                    min={20}
                    max={80}
                    step={5}
                    unit="%"
                    onChange={(val) => handleUpdate('handleSpanPercent', val)}
                  />
                  <p className="text-[10px] text-clay-900/40 font-sans leading-relaxed">
                    A alça sai como uma tira solta pra enrolar à mão — o molde do corpo mostra marcações de onde colar as duas pontas.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {shapeType === 'cone' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Dimensões do Tronco Cônico</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Ø Superior"
                  tip="Diâmetro da boca do vaso"
                  value={(params as ConeParams).topDiameter}
                  min={4}
                  max={35}
                  step={0.5}
                  onChange={(val) => handleUpdate('topDiameter', val)}
                />
                <SliderInput
                  label="Ø Inferior"
                  tip="Diâmetro da base do vaso"
                  value={(params as ConeParams).bottomDiameter}
                  min={3}
                  max={30}
                  step={0.5}
                  onChange={(val) => handleUpdate('bottomDiameter', val)}
                />
              </div>
              <SliderInput
                label="Altura Vertical"
                tip="Altura final desejada"
                value={(params as ConeParams).height}
                min={5}
                max={45}
                step={0.5}
                onChange={(val) => handleUpdate('height', val)}
              />
              <SliderInput
                label="Espessura da Parede"
                tip="Espessura da placa de argila; usada para estimar a capacidade interna"
                value={(params as ConeParams).wallThickness ?? 0.6}
                min={0.3}
                max={2.0}
                step={0.1}
                onChange={(val) => handleUpdate('wallThickness', val)}
              />
              <CapacityCard
                {...computeConeCapacity(
                  (params as ConeParams).topDiameter,
                  (params as ConeParams).bottomDiameter,
                  (params as ConeParams).height,
                  (params as ConeParams).wallThickness ?? 0.6
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Montagem</h5>
              </div>
              <SliderInput
                label="Margem de Costura"
                tip="Largura extra para colagem lateral"
                value={(params as ConeParams).seamAllowance}
                min={0.2}
                max={4.0}
                step={0.1}
                onChange={(val) => handleUpdate('seamAllowance', val)}
              />
            </div>

            {/* Handle Section — turns the cone into a mug/cup */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-400 rounded-full" />
                  <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Alça (Xícara)</h5>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    checked={(params as ConeParams).hasHandle ?? false}
                    onChange={(e) => handleUpdate('hasHandle', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-terracotta-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terracotta-500"></div>
                </label>
              </div>

              {(params as ConeParams).hasHandle && (
                <div className="space-y-4 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderInput
                      label="Largura da Alça"
                      tip="Espessura da tira de argila que forma a alça"
                      value={(params as ConeParams).handleWidth ?? 2.2}
                      min={1}
                      max={5}
                      step={0.1}
                      onChange={(val) => handleUpdate('handleWidth', val)}
                    />
                    <SliderInput
                      label="Projeção da Alça"
                      tip="Quanto a alça se afasta da parede da peça"
                      value={(params as ConeParams).handleProjection ?? 5}
                      min={2}
                      max={10}
                      step={0.5}
                      onChange={(val) => handleUpdate('handleProjection', val)}
                    />
                  </div>
                  <SliderInput
                    label="Vão de Fixação"
                    tip="Distância vertical entre os dois pontos onde a alça encosta na peça, como % da altura"
                    value={(params as ConeParams).handleSpanPercent ?? 55}
                    min={20}
                    max={80}
                    step={5}
                    unit="%"
                    onChange={(val) => handleUpdate('handleSpanPercent', val)}
                  />
                  <p className="text-[10px] text-clay-900/40 font-sans leading-relaxed">
                    A alça sai como uma tira solta pra enrolar à mão. Como o molde cônico é planificado em leque, meça a altura direto na peça montada pra marcar onde colar as pontas.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {shapeType === 'tray' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Base do Prato</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Comprimento"
                  tip="Comprimento final da base"
                  value={(params as TrayParams).length}
                  min={5}
                  max={50}
                  step={1}
                  onChange={(val) => handleUpdate('length', val)}
                />
                <SliderInput
                  label="Largura"
                  tip="Largura final da base"
                  value={(params as TrayParams).width}
                  min={5}
                  max={40}
                  step={1}
                  onChange={(val) => handleUpdate('width', val)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Configuração da Aba</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Altura da Aba"
                  tip="Altura da borda inclinada"
                  value={(params as TrayParams).lipHeight}
                  min={0.5}
                  max={15.0}
                  step={0.5}
                  onChange={(val) => handleUpdate('lipHeight', val)}
                />
                <SliderInput
                  label="Inclinação"
                  tip="Ângulo de abertura (15° a 85°)"
                  value={(params as TrayParams).lipAngle}
                  min={15}
                  max={85}
                  step={5}
                  unit="°"
                  onChange={(val) => handleUpdate('lipAngle', val)}
                />
              </div>
            </div>
          </div>
        )}

        {shapeType === 'napkin_holder' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Geometria Externa</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Largura"
                  tip="Comprimento final"
                  value={(params as NapkinHolderParams).width}
                  min={4}
                  max={30}
                  step={1}
                  onChange={(val) => handleUpdate('width', val)}
                />
                <SliderInput
                  label="Altura"
                  tip="Altura final das placas"
                  value={(params as NapkinHolderParams).height}
                  min={3}
                  max={25}
                  step={1}
                  onChange={(val) => handleUpdate('height', val)}
                />
              </div>
              <SliderInput
                label="Profundidade"
                tip="Espaço entre placas"
                value={(params as NapkinHolderParams).depth}
                min={1}
                max={15}
                step={0.5}
                onChange={(val) => handleUpdate('depth', val)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Detalhes Técnicos</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Espessura"
                  tip="Espessura da argila para chanfro"
                  value={(params as NapkinHolderParams).thickness}
                  min={0.2}
                  max={3.0}
                  step={0.1}
                  onChange={(val) => handleUpdate('thickness', val)}
                />
                <div className="p-3.5 bg-white/60 border border-terracotta-100/40 rounded-xl shadow-xs">
                  {labelWithTip("Design", "Formato das placas")}
                  <select
                    value={(params as NapkinHolderParams).edgeFinish || 'straight'}
                    onChange={(e) => handleUpdate('edgeFinish', e.target.value)}
                    className="w-full bg-white border border-terracotta-100 rounded-xl px-3 py-2 text-clay-900 text-xs font-medium focus:outline-none focus:border-terracotta-500 shadow-2xs mt-1"
                  >
                    <option value="straight">▬ Retangular</option>
                    <option value="rounded">◠ Arredondado</option>
                    <option value="scalloped">✿ Recortado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {shapeType === 'box' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Volume da Caixa</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Largura"
                  tip="Largura frontal"
                  value={(params as BoxParams).width}
                  min={4}
                  max={40}
                  step={1}
                  onChange={(val) => handleUpdate('width', val)}
                />
                <SliderInput
                  label="Profundidade"
                  tip="Comprimento lateral"
                  value={(params as BoxParams).depth}
                  min={4}
                  max={40}
                  step={1}
                  onChange={(val) => handleUpdate('depth', val)}
                />
              </div>
              <SliderInput
                label="Altura"
                tip="Altura total"
                value={(params as BoxParams).height}
                min={3}
                max={30}
                step={1}
                onChange={(val) => handleUpdate('height', val)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Encaixe e Tampa</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Espessura"
                  tip="Espessura da argila"
                  value={(params as BoxParams).thickness}
                  min={0.2}
                  max={3.0}
                  step={0.1}
                  onChange={(val) => handleUpdate('thickness', val)}
                />
                <SliderInput
                  label="Folga"
                  tip="Folga de segurança"
                  value={(params as BoxParams).seamAllowance}
                  min={0.0}
                  max={3.0}
                  step={0.1}
                  onChange={(val) => handleUpdate('seamAllowance', val)}
                />
              </div>
              <div className="p-3.5 bg-white/60 border border-terracotta-100/40 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-clay-900">Incluir Tampa</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(params as BoxParams).hasLid || false}
                    onChange={(e) => handleUpdate('hasLid', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-terracotta-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terracotta-500"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {shapeType === 'organic_plate' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                  <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Contorno Orgânico</h5>
                </div>
                <div className="flex bg-clay-50 p-1 rounded-lg border border-terracotta-100/30">
                  <button
                    onClick={() => handleUpdate('customPoints', undefined)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      !(params as OrganicPlateParams).customPoints
                        ? 'bg-white text-terracotta-600 shadow-sm'
                        : 'text-clay-900/40 hover:text-clay-900/70'
                    }`}
                  >
                    Automático
                  </button>
                  <button
                    onClick={() => {
                      if (!(params as OrganicPlateParams).customPoints) {
                        const p = params as OrganicPlateParams;
                        const initial = generateOrganicControlPoints(p.seed, p.irregularity, p.baseRadius, 8);
                        handleUpdate('customPoints', initial);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                      (params as OrganicPlateParams).customPoints
                        ? 'bg-white text-terracotta-600 shadow-sm'
                        : 'text-clay-900/40 hover:text-clay-900/70'
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              {(params as OrganicPlateParams).customPoints ? (
                <div className="space-y-2">
                  <OrganicPointEditor
                    points={(params as OrganicPlateParams).customPoints!}
                    onChange={(pts) => handleUpdate('customPoints', pts)}
                  />
                  <button
                    onClick={() => handleUpdate('customPoints', undefined)}
                    className="w-full py-2.5 bg-white hover:bg-terracotta-50 border border-terracotta-100 text-terracotta-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Voltar para Geração Automática
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SliderInput
                      label="Raio Base"
                      tip="Tamanho médio do prato antes de aplicar a irregularidade"
                      value={(params as OrganicPlateParams).baseRadius}
                      min={4}
                      max={25}
                      step={0.5}
                      onChange={(val) => handleUpdate('baseRadius', val)}
                    />
                    <SliderInput
                      label="Irregularidade"
                      tip="0 = quase redondo, 100 = bem assimétrico"
                      value={(params as OrganicPlateParams).irregularity}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                      onChange={(val) => handleUpdate('irregularity', val)}
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate('seed', Math.floor(Math.random() * 1e9))}
                    className="w-full py-3 bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-100 text-terracotta-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Gerar Nova Forma
                  </button>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Configuração da Aba</h5>
              </div>
              <div className="p-3.5 bg-white/60 border border-terracotta-100/40 rounded-xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-clay-900">Incluir Aba</span>
                  <p className="text-[10px] text-clay-900/40">Desligue para um prato totalmente plano, sem borda levantada</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={(params as OrganicPlateParams).hasLip !== false}
                    onChange={(e) => handleUpdate('hasLip', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-terracotta-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terracotta-500"></div>
                </label>
              </div>
              {(params as OrganicPlateParams).hasLip !== false && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SliderInput
                    label="Altura da Aba"
                    tip="Altura da borda inclinada"
                    value={(params as OrganicPlateParams).lipHeight}
                    min={0.5}
                    max={10.0}
                    step={0.5}
                    onChange={(val) => handleUpdate('lipHeight', val)}
                  />
                  <SliderInput
                    label="Inclinação"
                    tip="Ângulo de abertura (15° a 85°)"
                    value={(params as OrganicPlateParams).lipAngle}
                    min={15}
                    max={85}
                    step={5}
                    unit="°"
                    onChange={(val) => handleUpdate('lipAngle', val)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {shapeType === 'bowl' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeParams({ ...params, topDiameter: 18, bottomDiameter: 8, height: 9, curvature: 60 })}
                className="py-2.5 px-3 bg-white/60 hover:bg-white border border-terracotta-100 hover:border-terracotta-300 rounded-xl text-[11px] font-bold text-clay-900/70 transition text-left"
              >
                🥣 Tigela Funda
                <div className="text-[9px] font-normal text-clay-900/40">Alta, corpo redondo</div>
              </button>
              <button
                onClick={() => onChangeParams({ ...params, topDiameter: 26, bottomDiameter: 14, height: 4.5, curvature: 70 })}
                className="py-2.5 px-3 bg-white/60 hover:bg-white border border-terracotta-100 hover:border-terracotta-300 rounded-xl text-[11px] font-bold text-clay-900/70 transition text-left"
              >
                🍜 Prato Fundo
                <div className="text-[9px] font-normal text-clay-900/40">Larga e rasa, tipo prato de sopa</div>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Dimensões da Tigela</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Ø Borda"
                  tip="Diâmetro da abertura da tigela"
                  value={(params as BowlParams).topDiameter}
                  min={6}
                  max={40}
                  step={0.5}
                  onChange={(val) => handleUpdate('topDiameter', val)}
                />
                <SliderInput
                  label="Ø Base"
                  tip="Diâmetro do pé/base da tigela"
                  value={(params as BowlParams).bottomDiameter}
                  min={3}
                  max={30}
                  step={0.5}
                  onChange={(val) => handleUpdate('bottomDiameter', val)}
                />
              </div>
              <SliderInput
                label="Altura"
                tip="Altura final desejada"
                value={(params as BowlParams).height}
                min={4}
                max={25}
                step={0.5}
                onChange={(val) => handleUpdate('height', val)}
              />
              <SliderInput
                label="Curvatura da Parede"
                tip="0 = parede reta (igual ao cone), 100 = perfil bem arredondado de tigela"
                value={(params as BowlParams).curvature}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(val) => handleUpdate('curvature', val)}
              />
              <SliderInput
                label="Espessura da Parede"
                tip="Espessura da placa de argila; usada para estimar a capacidade interna"
                value={(params as BowlParams).wallThickness ?? 0.6}
                min={0.3}
                max={2.0}
                step={0.1}
                onChange={(val) => handleUpdate('wallThickness', val)}
              />
              <CapacityCard
                {...computeBowlCapacity(
                  (params as BowlParams).topDiameter,
                  (params as BowlParams).bottomDiameter,
                  (params as BowlParams).height,
                  (params as BowlParams).curvature,
                  (params as BowlParams).wallThickness ?? 0.6
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Montagem</h5>
              </div>
              <SliderInput
                label="Margem de Costura"
                tip="Largura extra para colagem entre as bandas empilhadas"
                value={(params as BowlParams).seamAllowance}
                min={0.2}
                max={4.0}
                step={0.1}
                onChange={(val) => handleUpdate('seamAllowance', val)}
              />
              <p className="text-[10px] text-clay-900/40 font-sans leading-relaxed">
                O molde é impresso em 6 bandas empilhadas que se aproximam da curva da tigela — corte e cole cada banda em sequência, da base até a borda.
              </p>
            </div>
          </div>
        )}

        {shapeType === 'vase' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-terracotta-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Dimensões da Jarra</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Ø Base"
                  tip="Diâmetro do pé da jarra"
                  value={(params as VaseParams).baseDiameter}
                  min={3}
                  max={25}
                  step={0.5}
                  onChange={(val) => handleUpdate('baseDiameter', val)}
                />
                <SliderInput
                  label="Ø Ombro"
                  tip="Diâmetro do ponto mais largo (barriga da jarra)"
                  value={(params as VaseParams).shoulderDiameter}
                  min={5}
                  max={40}
                  step={0.5}
                  onChange={(val) => handleUpdate('shoulderDiameter', val)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SliderInput
                  label="Ø Gargalo"
                  tip="Diâmetro da abertura no topo"
                  value={(params as VaseParams).neckDiameter}
                  min={2}
                  max={20}
                  step={0.5}
                  onChange={(val) => handleUpdate('neckDiameter', val)}
                />
                <SliderInput
                  label="Altura"
                  tip="Altura final desejada"
                  value={(params as VaseParams).height}
                  min={6}
                  max={45}
                  step={0.5}
                  onChange={(val) => handleUpdate('height', val)}
                />
              </div>
              <SliderInput
                label="Posição do Ombro"
                tip="Quão perto da base fica o ponto mais largo — valores baixos = barriga perto do chão, altos = perto do gargalo"
                value={(params as VaseParams).shoulderPosition}
                min={20}
                max={80}
                step={5}
                unit="%"
                onChange={(val) => handleUpdate('shoulderPosition', val)}
              />
              <SliderInput
                label="Curvatura"
                tip="0 = segmentos retos (como dois cones unidos), 100 = barriga bem arredondada"
                value={(params as VaseParams).curvature}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(val) => handleUpdate('curvature', val)}
              />
              <SliderInput
                label="Espessura da Parede"
                tip="Espessura da placa de argila; usada para estimar a capacidade interna"
                value={(params as VaseParams).wallThickness ?? 0.6}
                min={0.3}
                max={2.0}
                step={0.1}
                onChange={(val) => handleUpdate('wallThickness', val)}
              />
              <CapacityCard
                {...computeVaseCapacity(
                  (params as VaseParams).baseDiameter,
                  (params as VaseParams).shoulderDiameter,
                  (params as VaseParams).neckDiameter,
                  (params as VaseParams).height,
                  (params as VaseParams).shoulderPosition,
                  (params as VaseParams).curvature,
                  (params as VaseParams).wallThickness ?? 0.6
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h5 className="text-[11px] font-bold text-clay-900/60 uppercase">Montagem</h5>
              </div>
              <SliderInput
                label="Margem de Costura"
                tip="Largura extra para colagem entre as bandas empilhadas"
                value={(params as VaseParams).seamAllowance}
                min={0.2}
                max={4.0}
                step={0.1}
                onChange={(val) => handleUpdate('seamAllowance', val)}
              />
              <p className="text-[10px] text-clay-900/40 font-sans leading-relaxed">
                O molde é impresso em 7 bandas empilhadas, da base até o gargalo — a banda do ombro é a mais larga e merece atenção extra na colagem.
              </p>
            </div>
          </div>
        )}

        {/* CLAY shrinkage linkage indicator */}
        <div className="mt-5 pt-4 border-t border-dashed border-terracotta-100/60 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2 text-clay-900/60">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Fator de Retração Vinculado:</span>
            <span className="font-mono font-bold text-terracotta-500 bg-terracotta-50 px-2 py-0.5 rounded-md border border-terracotta-100/60">
              {globalShrinkage}%
            </span>
          </div>
          <span className="text-clay-900/40 font-serif italic">1cm = 37.8px</span>
        </div>
      </div>

      {/* CLAYMASTER ADVICE - UX DELIGHT */}
      <div className="bg-terracotta-50/50 border border-terracotta-100/50 rounded-2xl p-4 text-xs space-y-2">
        <h5 className="font-bold text-terracotta-600 font-sans">Dica do Mestre Ceramista:</h5>
        {shapeType === 'cylinder' && (
          <p className="text-clay-900/70 leading-relaxed">
            Ao unir a costura do cilindro, chanfre as duas extremidades com cortes em 45 graus opostos. Escarifique abundantemente com um garfo e aplique barbantina espessa para garantir que a retração não abra a fresta na queima do biscoito!
          </p>
        )}
        {shapeType === 'cone' && (
          <p className="text-clay-900/70 leading-relaxed">
            Formas cônicas retraem de forma desigual se a espessura da parede não for 100% homogênea. Tente esticar sua placa de argila girando o rolo sempre na mesma direção para evitar a orientação de fibras!
          </p>
        )}
        {shapeType === 'tray' && (
          <p className="text-clay-900/70 leading-relaxed">
            Ao dobrar as abas da sua travessa para cima, use sacos de areia fina envoltos em tecido ou pedaços de espuma densa para apoiar as bordas inclinadas enquanto ela seca lentamente à sombra!
          </p>
        )}
        {shapeType === 'napkin_holder' && (
          <p className="text-clay-900/70 leading-relaxed">
            O segredo de um encaixe em 45° perfeito é usar um cortador de ângulo (angle cutter) de arame rígido. Deixe as placas secarem ao ponto de couro duro antes de juntar as partes para que elas não empenem!
          </p>
        )}
        {shapeType === 'box' && (
          <p className="text-clay-900/70 leading-relaxed">
            Para montar uma caixa com placas de argila, chanfre as bordas em 45 graus. Certifique-se de escarificar os encaixes e unir com barbantina. Use uma régua de esquadro para manter os cantos perfeitamente retos (90°) durante a colagem inicial!
          </p>
        )}
        {shapeType === 'organic_plate' && (
          <p className="text-clay-900/70 leading-relaxed">
            Como o contorno é livre, corte a base primeiro e depois erga a aba aos poucos com os dedos molhados, acompanhando a curva natural do recorte — não force igual em todos os pontos, o charme do prato orgânico é a variação sutil de altura ao redor da borda!
          </p>
        )}
        {shapeType === 'bowl' && (
          <p className="text-clay-900/70 leading-relaxed">
            O molde da tigela sai em bandas empilhadas — junte-as em sequência, da base até a borda, alisando cada emenda por dentro e por fora com os dedos molhados antes de seguir para a próxima banda, assim a curva fica contínua e sem degraus visíveis.
          </p>
        )}
        {shapeType === 'vase' && (
          <p className="text-clay-900/70 leading-relaxed">
            No ombro (o ponto mais largo), a argila tende a rachar se puxada rápido demais — trabalhe essa banda com calma, batendo levemente com a colher de borracha para compactar antes de seguir para o gargalo, que já é mais fino e fecha mais rápido.
          </p>
        )}
      </div>
    </div>
  );
}

{/* SUB-COMPONENT FOR SLIDER INPUTS TO HANDLE TEXT STATE */}
const SliderInput = ({ 
  label, tip, value, min, max, step, unit = 'cm', onChange 
}: { 
  label: string, tip: string, value: number, min: number, max: number, step: number, unit?: string, onChange: (val: number) => void 
}) => {
  const [inputText, setInputText] = React.useState(value.toString());

  React.useEffect(() => {
    if (parseFloat(inputText) !== value) {
      setInputText(value.toString());
    }
  }, [value]);

  return (
    <div className="space-y-1.5 p-3.5 bg-white/60 border border-terracotta-100/40 rounded-xl shadow-xs transition-all hover:bg-white/85 hover:border-terracotta-200">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-clay-900">{label}</span>
          <span className="group relative cursor-help text-clay-900/30 hover:text-terracotta-500">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-clay-900 text-white text-[10px] rounded-lg shadow-lg z-50 text-center leading-normal">
              {tip}
            </span>
          </span>
        </div>
        <span className="font-mono font-bold text-[11px] text-terracotta-600 bg-terracotta-50 border border-terracotta-100/50 px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xs">
          {value.toFixed(step >= 1 ? 0 : (step === 0.5 ? 1 : 2))} {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || min)}
          className="flex-1 accent-terracotta-500 h-1 bg-terracotta-100 rounded-lg cursor-pointer transition-all focus:ring-1 focus:ring-terracotta-200"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={inputText}
          onChange={(e) => {
            const val = e.target.value;
            setInputText(val);
            const num = parseFloat(val);
            if (!isNaN(num)) {
              onChange(Math.max(min, Math.min(max, num)));
            }
          }}
          onBlur={() => {
            if (inputText === "" || isNaN(parseFloat(inputText))) {
              setInputText(value.toString());
            }
          }}
          className="w-14 bg-clay-50/40 border border-terracotta-100/50 rounded-lg py-0.5 px-1 text-center text-[10px] font-mono font-semibold text-clay-800 focus:outline-none focus:border-terracotta-400 focus:bg-white"
        />
      </div>
      <div className="flex justify-between text-[8px] text-clay-900/30 font-mono select-none">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};

// Estimated liquid capacity for hollow revolution pieces (mugs, cups, vases).
const CapacityCard = ({ brimFullMl, practicalMl }: { brimFullMl: number; practicalMl: number }) => {
  const practicalOz = mlToOz(practicalMl);
  const brimOz = mlToOz(brimFullMl);

  return (
    <div className="bg-teal-600 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3.5">
      <div className="w-9 h-9 shrink-0 bg-white/15 rounded-xl flex items-center justify-center">
        <Droplet className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-80">Capacidade Estimada (uso prático)</span>
        <div className="text-xl font-mono font-black leading-tight">
          ≈ {practicalMl.toFixed(0)} mL <span className="opacity-70 text-sm font-bold">({practicalOz.toFixed(1)} oz)</span>
        </div>
        <span className="text-[9px] opacity-70 font-sans">
          Cheio até ~1,25cm abaixo da borda • Até a borda: {brimFullMl.toFixed(0)} mL ({brimOz.toFixed(1)} oz)
        </span>
      </div>
    </div>
  );
};
