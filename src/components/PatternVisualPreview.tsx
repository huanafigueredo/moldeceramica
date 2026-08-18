import React, { useState, useRef } from 'react';
import { Printer, Download, Ruler, Circle, Square, Layers, Eye, EyeOff, Sparkles, Scissors, Info, TrendingDown, ArrowRight, Sliders, Flame } from 'lucide-react';
import { Slab3DCanvas } from './Slab3DPreview';

interface PatternVisualPreviewProps {
  finishedSize: number;
  shrinkageRate: number;
  wetSize: number;
  onPrintRequest?: (svgString: string, boundingBox: { width: number; height: number }) => void;
}

type QuickShape = 'circle' | 'square' | 'cylinder_band';

export default function PatternVisualPreview({
  finishedSize,
  shrinkageRate,
  wetSize,
  onPrintRequest,
}: PatternVisualPreviewProps) {
  const [shape, setShape] = useState<QuickShape>('circle');
  const [showFiredOutline, setShowFiredOutline] = useState<boolean>(true);
  const [showNaiveOutline, setShowNaiveOutline] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [seamAllowance, setSeamAllowance] = useState<number>(1.5); // only for cylinder band
  const [cornerRadius, setCornerRadius] = useState<number>(0); // in cm (0 to 5.0)
  const [holeShape, setHoleShape] = useState<'none' | 'circle' | 'square' | 'triangle' | 'flower'>('none');
  const [holeSize, setHoleSize] = useState<number>(0.8); // cm
  const [holeSpacing, setHoleSpacing] = useState<number>(2.5); // cm
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [thickness, setThickness] = useState<number>(0.6); // cm
  const [state3DMode, setState3DMode] = useState<'wet' | 'fired'>('wet');

  const svgRef = useRef<SVGSVGElement>(null);

  // Math helper: pixels per cm
  const pxPerCm = 20; // scale down slightly to fit the card preview well

  // Calculates naive size: finishedSize * (1 + shrinkageRate / 100)
  const naiveSize = finishedSize * (1 + shrinkageRate / 100);

  // Total boundary of SVG canvas based on active shape
  const getBBox = () => {
    if (shape === 'circle') {
      const size = wetSize;
      return { w: size, h: size };
    } else if (shape === 'square') {
      const size = wetSize;
      return { w: size, h: size };
    } else {
      // Cylinder band
      // Width = Circumference of wet diameter + seam allowance
      const circ = Math.PI * wetSize;
      const w = circ + seamAllowance;
      const h = wetSize; // square ratio aspect or height = wetSize
      return { w, h };
    }
  };

  const bbox = getBBox();
  const pad = 30; // px padding
  const scale = pxPerCm;

  const w_px = bbox.w * scale;
  const h_px = bbox.h * scale;
  const vbW = w_px + pad * 2;
  const vbH = h_px + pad * 2;

  // Calculation of Surface Area and Perimeter before and after shrinkage
  let areaWet = 0;
  let areaFired = 0;
  let perimeterWet = 0;
  let perimeterFired = 0;

  if (shape === 'circle') {
    // Wet state
    const rWet = wetSize / 2;
    areaWet = Math.PI * (rWet ** 2);
    perimeterWet = Math.PI * wetSize;

    // Fired state
    const rFired = finishedSize / 2;
    areaFired = Math.PI * (rFired ** 2);
    perimeterFired = Math.PI * finishedSize;
  } else if (shape === 'square') {
    // Wet state
    areaWet = wetSize ** 2;
    perimeterWet = 4 * wetSize;

    // Fired state
    areaFired = finishedSize ** 2;
    perimeterFired = 4 * finishedSize;
  } else if (shape === 'cylinder_band') {
    // Cylinder wall flat pattern
    // Wet width = circ_wet + seamAllowance, height = wetSize
    const circWet = Math.PI * wetSize;
    const wWet = circWet + seamAllowance;
    areaWet = wWet * wetSize;
    perimeterWet = 2 * (wWet + wetSize);

    // Fired width = circ_fired, height = finishedSize (without seam allowance since we want to know final product size area)
    const circFired = Math.PI * finishedSize;
    areaFired = circFired * finishedSize;
    perimeterFired = 2 * (circFired + finishedSize);
  }

  // Percentage area reduction
  const areaReduction = areaWet > 0 ? ((areaWet - areaFired) / areaWet) * 100 : 0;

  // Handle Export SVG File
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ceramold-calculadora-${shape}-${new Date().getTime()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Trigger Print layout
  const handlePrint = () => {
    if (!svgRef.current || !onPrintRequest) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    onPrintRequest(svgString, { width: bbox.w, height: bbox.h });
  };

  const renderSVGElements = () => {
    const center_x = vbW / 2;
    const center_y = vbH / 2;

    const wetColor = '#2c4cdb'; // Accent, solid — wet/mold size
    const firedColor = '#94a6f0'; // Accent, light tint — fired/finished size
    const naiveColor = '#9ca3af'; // Gray naive

    const lineStyle = `stroke-[1.5] fill-none`;
    const dashStyle = `stroke-[1.2] stroke-dasharray-[3,3] fill-none`;

    // Limit corner radius to wetSize / 2 to prevent distortion
    const maxCornerRadius = Math.min(5.0, wetSize / 2);
    const activeCornerRadius = Math.min(cornerRadius, maxCornerRadius);

    const renderHoleComponent = (type: 'circle' | 'square' | 'triangle' | 'flower', cx: number, cy: number, r: number, stroke: string, isDash = false) => {
      const cls = isDash ? "stroke-dasharray-[2,2]" : "";
      if (type === 'circle') {
        return (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={stroke}
            strokeWidth="1.2"
            fill={isDash ? "none" : "#fafaf9"}
            className={cls}
          />
        );
      } else if (type === 'square') {
        return (
          <rect
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            rx="1.5"
            stroke={stroke}
            strokeWidth="1.2"
            fill={isDash ? "none" : "#fafaf9"}
            className={cls}
          />
        );
      } else if (type === 'triangle') {
        const x1 = cx;
        const y1 = cy - r;
        const x2 = cx - r * 0.866;
        const y2 = cy + r * 0.5;
        const x3 = cx + r * 0.866;
        const y3 = cy + r * 0.5;
        return (
          <polygon
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            stroke={stroke}
            strokeWidth="1.2"
            fill={isDash ? "none" : "#fafaf9"}
            className={cls}
          />
        );
      } else if (type === 'flower') {
        const petals = [];
        const numPetals = 5;
        const petalDistance = r * 0.6;
        const petalRad = r * 0.4;
        
        petals.push(
          <circle
            key="center"
            cx={cx}
            cy={cy}
            r={r * 0.35}
            stroke={stroke}
            strokeWidth="0.8"
            fill={isDash ? "none" : "#fafaf9"}
          />
        );
        
        for (let p_idx = 0; p_idx < numPetals; p_idx++) {
          const angle = (p_idx * 2 * Math.PI) / numPetals - Math.PI / 2;
          const px = cx + petalDistance * Math.cos(angle);
          const py = cy + petalDistance * Math.sin(angle);
          petals.push(
            <circle
              key={p_idx}
              cx={px}
              cy={py}
              r={petalRad}
              stroke={stroke}
              strokeWidth="0.6"
              fill={isDash ? "none" : "#fafaf9"}
            />
          );
        }
        return (
          <g key={`${cx}-${cy}`} className={cls}>
            {petals}
          </g>
        );
      }
      return null;
    };

    const holeElements: React.ReactNode[] = [];
    if (holeShape !== 'none') {
      const spacing_px = holeSpacing * scale;
      const rad_px = (holeSize / 2) * scale;

      if (shape === 'circle') {
        const limit = Math.ceil(wetSize / holeSpacing);
        const max_dist_px = ((wetSize / 2) - (holeSize / 2) - 0.4) * scale;
        
        for (let dx = -limit; dx <= limit; dx++) {
          for (let dy = -limit; dy <= limit; dy++) {
            const hx = dx * spacing_px;
            const hy = dy * spacing_px;
            const dist = Math.sqrt(hx * hx + hy * hy);
            if (dist <= max_dist_px) {
              const cx_wet = center_x + hx;
              const cy_wet = center_y + hy;
              
              holeElements.push(
                <g key={`hole-wet-${dx}-${dy}`}>
                  {renderHoleComponent(holeShape, cx_wet, cy_wet, rad_px, wetColor)}
                </g>
              );

              if (showFiredOutline) {
                const cx_fired = center_x + hx * (1 - shrinkageRate / 100);
                const cy_fired = center_y + hy * (1 - shrinkageRate / 100);
                const r_fired = rad_px * (1 - shrinkageRate / 100);
                holeElements.push(
                  <g key={`hole-fired-${dx}-${dy}`}>
                    {renderHoleComponent(holeShape, cx_fired, cy_fired, r_fired, firedColor, true)}
                  </g>
                );
              }
            }
          }
        }
      } else if (shape === 'square') {
        const limit = Math.ceil(wetSize / holeSpacing);
        const max_offset_px = ((wetSize / 2) - (holeSize / 2) - 0.4) * scale;

        for (let dx = -limit; dx <= limit; dx++) {
          for (let dy = -limit; dy <= limit; dy++) {
            const hx = dx * spacing_px;
            const hy = dy * spacing_px;
            if (Math.abs(hx) <= max_offset_px && Math.abs(hy) <= max_offset_px) {
              const cx_wet = center_x + hx;
              const cy_wet = center_y + hy;

              holeElements.push(
                <g key={`hole-wet-${dx}-${dy}`}>
                  {renderHoleComponent(holeShape, cx_wet, cy_wet, rad_px, wetColor)}
                </g>
              );

              if (showFiredOutline) {
                const cx_fired = center_x + hx * (1 - shrinkageRate / 100);
                const cy_fired = center_y + hy * (1 - shrinkageRate / 100);
                const r_fired = rad_px * (1 - shrinkageRate / 100);
                holeElements.push(
                  <g key={`hole-fired-${dx}-${dy}`}>
                    {renderHoleComponent(holeShape, cx_fired, cy_fired, r_fired, firedColor, true)}
                  </g>
                );
              }
            }
          }
        }
      } else if (shape === 'cylinder_band') {
        const w_active_px = (Math.PI * wetSize) * scale;
        const h_active_px = wetSize * scale;
        const margin_px = 0.8 * scale;
        
        const cols = Math.floor((w_active_px - margin_px * 2) / spacing_px) + 1;
        const rows = Math.floor((h_active_px - margin_px * 2) / spacing_px) + 1;
        
        if (cols > 0 && rows > 0) {
          const xStart = (w_active_px - (cols - 1) * spacing_px) / 2;
          const yStart = (h_active_px - (rows - 1) * spacing_px) / 2;
          
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const hx = xStart + c * spacing_px;
              const hy = yStart + r * spacing_px;

              holeElements.push(
                <g key={`hole-wet-${r}-${c}`}>
                  {renderHoleComponent(holeShape, hx, hy, rad_px, wetColor)}
                </g>
              );

              if (showFiredOutline) {
                const hx_fired = hx * (1 - shrinkageRate / 100);
                const hy_fired = hy * (1 - shrinkageRate / 100);
                const r_fired = rad_px * (1 - shrinkageRate / 100);
                holeElements.push(
                  <g key={`hole-fired-${r}-${c}`}>
                    {renderHoleComponent(holeShape, hx_fired, hy_fired, r_fired, firedColor, true)}
                  </g>
                );
              }
            }
          }
        }
      }
    }

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        width="100%"
        height="100%"
        className="w-full h-full bg-[#fafaf9]/50 rounded-xl transition-all"
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="previewGrid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#2c4cdb" strokeWidth="0.5" strokeOpacity="0.08" />
            <path d={`M ${scale/2} 0 L ${scale/2} ${scale} M 0 ${scale/2} L ${scale} ${scale/2}`} fill="none" stroke="#2c4cdb" strokeWidth="0.25" strokeOpacity="0.03" />
          </pattern>
        </defs>

        {showGrid && <rect width="100%" height="100%" fill="url(#previewGrid)" />}

        {/* Real scale helper: 5 cm line */}
        <g transform={`translate(${pad}, ${vbH - 25})`} className="no-print">
          <line x1="0" y1="0" x2={5 * scale} y2="0" stroke="#17171a" strokeWidth="2" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#17171a" strokeWidth="2" />
          <line x1={5 * scale} y1="-3" x2={5 * scale} y2="3" stroke="#17171a" strokeWidth="2" />
          <text x={2.5 * scale} y="-6" className="fill-[#17171a] font-sans text-[9px] font-mono select-none" textAnchor="middle">
            Escala Real: 5 cm
          </text>
        </g>

        {shape === 'circle' && (
          <g>
            {/* 1. Wet Size - actual cutting template */}
            <circle
              cx={center_x}
              cy={center_y}
              r={(wetSize / 2) * scale}
              stroke={wetColor}
              className={lineStyle}
            />
            
            {/* 2. Naive Outline (where simple multiplication lands, undersized!) */}
            {showNaiveOutline && (
              <circle
                cx={center_x}
                cy={center_y}
                r={(naiveSize / 2) * scale}
                stroke={naiveColor}
                className={dashStyle}
              />
            )}

            {/* 3. Fired/Finished Size (desired final piece after shrink) */}
            {showFiredOutline && (
              <circle
                cx={center_x}
                cy={center_y}
                r={(finishedSize / 2) * scale}
                stroke={firedColor}
                className={dashStyle}
              />
            )}

            {/* Render Holes inside the circle */}
            {holeElements}

            {/* Centering crosshairs */}
            <line x1={center_x - 6} y1={center_y} x2={center_x + 6} y2={center_y} stroke={wetColor} strokeWidth="1" opacity="0.4" />
            <line x1={center_x} y1={center_y - 6} x2={center_x} y2={center_y + 6} stroke={wetColor} strokeWidth="1" opacity="0.4" />

            {/* Dimension Lines */}
            <g transform={`translate(${center_x}, ${center_y - (wetSize / 2) * scale - 10})`}>
              <text y="-4" className="fill-[#2c4cdb] font-mono text-[9px] font-bold" textAnchor="middle">
                Molde Úmido: Ø {wetSize.toFixed(2)} cm
              </text>
            </g>
          </g>
        )}

        {shape === 'square' && (
          <g>
            {/* 1. Wet Size - actual cutting template */}
            <rect
              x={center_x - (wetSize / 2) * scale}
              y={center_y - (wetSize / 2) * scale}
              width={wetSize * scale}
              height={wetSize * scale}
              rx={activeCornerRadius * scale}
              ry={activeCornerRadius * scale}
              stroke={wetColor}
              className={lineStyle}
            />

            {/* 2. Naive Outline */}
            {showNaiveOutline && (
              <rect
                x={center_x - (naiveSize / 2) * scale}
                y={center_y - (naiveSize / 2) * scale}
                width={naiveSize * scale}
                height={naiveSize * scale}
                rx={activeCornerRadius * (1 + shrinkageRate / 100) * scale}
                ry={activeCornerRadius * (1 + shrinkageRate / 100) * scale}
                stroke={naiveColor}
                className={dashStyle}
              />
            )}

            {/* 3. Fired/Finished Size */}
            {showFiredOutline && (
              <rect
                x={center_x - (finishedSize / 2) * scale}
                y={center_y - (finishedSize / 2) * scale}
                width={finishedSize * scale}
                height={finishedSize * scale}
                rx={activeCornerRadius * (1 - shrinkageRate / 100) * scale}
                ry={activeCornerRadius * (1 - shrinkageRate / 100) * scale}
                stroke={firedColor}
                className={dashStyle}
              />
            )}

            {/* Render Holes inside the square */}
            {holeElements}

            {/* Dimension Labels */}
            <g transform={`translate(${center_x}, ${center_y - (wetSize / 2) * scale - 10})`}>
              <text y="-4" className="fill-[#2c4cdb] font-mono text-[9px] font-bold" textAnchor="middle">
                Lado do Molde Úmido: {wetSize.toFixed(2)} cm
              </text>
            </g>
          </g>
        )}

        {shape === 'cylinder_band' && (
          <g transform={`translate(${pad}, ${pad})`}>
            {/* 1. Wet cylinder wall pattern (Circumference + seam allowance x height) */}
            <rect
              x="0"
              y="0"
              width={bbox.w * scale}
              height={bbox.h * scale}
              rx={activeCornerRadius * scale}
              ry={activeCornerRadius * scale}
              stroke={wetColor}
              className={lineStyle}
            />

            {/* Seam allowance overlay block */}
            {seamAllowance > 0 && (
              <g>
                <rect
                  x={(bbox.w - seamAllowance) * scale}
                  y="0"
                  width={seamAllowance * scale}
                  height={bbox.h * scale}
                  rx={activeCornerRadius * scale}
                  ry={activeCornerRadius * scale}
                  fill="#2c4cdb"
                  fillOpacity="0.07"
                  stroke="#2c4cdb"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
                <text
                  x={(bbox.w - seamAllowance / 2) * scale}
                  y={(bbox.h / 2) * scale}
                  className="fill-[#2c4cdb]/60 font-mono text-[8px] font-semibold select-none"
                  textAnchor="middle"
                  writingMode="vertical-rl"
                >
                  Costura (+{seamAllowance}cm)
                </text>
              </g>
            )}

            {/* Finished/Fired wall representation overlay */}
            {showFiredOutline && (
              <rect
                x="0"
                y="0"
                width={(Math.PI * finishedSize) * scale}
                height={finishedSize * scale}
                rx={activeCornerRadius * (1 - shrinkageRate / 100) * scale}
                ry={activeCornerRadius * (1 - shrinkageRate / 100) * scale}
                stroke={firedColor}
                className={dashStyle}
              />
            )}

            {/* Naive wall representation overlay */}
            {showNaiveOutline && (
              <rect
                x="0"
                y="0"
                width={(Math.PI * naiveSize) * scale}
                height={naiveSize * scale}
                rx={activeCornerRadius * (1 + shrinkageRate / 100) * scale}
                ry={activeCornerRadius * (1 + shrinkageRate / 100) * scale}
                stroke={naiveColor}
                className={dashStyle}
              />
            )}

            {/* Render Holes inside the cylinder band */}
            {holeElements}

            {/* Text details */}
            <text x={4} y={12} className="fill-[#2c4cdb] font-mono text-[9px] font-bold">
              Largura Total: {bbox.w.toFixed(2)} cm
            </text>
            <text x={4} y={24} className="fill-[#2c4cdb]/70 font-mono text-[8px]">
              Circunferência Úmida: {(Math.PI * wetSize).toFixed(2)} cm
            </text>
            <text x={4} y={bbox.h * scale - 6} className="fill-[#2c4cdb] font-mono text-[9px] font-bold">
              Altura Úmida: {bbox.h.toFixed(2)} cm
            </text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-terracotta-100/80 p-6 shadow-md transition-all hover:shadow-lg flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-terracotta-100 rounded-xl text-terracotta-500 shadow-sm shadow-terracotta-500/5">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-clay-900">
                {viewMode === '2d' ? 'Visualizador de Molde Real 2D' : 'Visualizador Tridimensional 3D'}
              </h3>
              <p className="text-[11px] text-clay-900/60 font-sans">
                {viewMode === '2d' 
                  ? 'Renderização SVG dinâmica do corpo de prova calibrado' 
                  : 'Maquete interativa de alta fidelidade (React Three Fiber)'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-terracotta-50 border border-terracotta-150/40 text-[9.5px] font-bold rounded-lg text-terracotta-700 font-sans uppercase tracking-wider">
            <Sparkles className="w-3 h-3 animate-pulse" /> {viewMode === '2d' ? 'Live SVG' : 'Live 3D'}
          </span>
        </div>

        {/* 2D / 3D Segmented View Mode Controller */}
        <div className="flex bg-clay-50 p-1 rounded-xl border border-terracotta-100/25">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center justify-center gap-1.5 ${
              viewMode === '2d'
                ? 'bg-terracotta-500 text-white shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80 hover:bg-white/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Molde Plano (2D)
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center justify-center gap-1.5 ${
              viewMode === '3d'
                ? 'bg-terracotta-500 text-white shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Maquete 3D (R3F)
          </button>
        </div>

        {/* Quick Shape Selector Buttons */}
        <div className="grid grid-cols-3 gap-2 bg-clay-50/50 p-1.5 rounded-xl border border-terracotta-100/30">
          <button
            onClick={() => setShape('circle')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all ${
              shape === 'circle'
                ? 'bg-white text-terracotta-600 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Circle className="w-3.5 h-3.5" /> Placa Redonda
          </button>
          <button
            onClick={() => setShape('square')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all ${
              shape === 'square'
                ? 'bg-white text-terracotta-600 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Square className="w-3.5 h-3.5" /> Placa Quadrada
          </button>
          <button
            onClick={() => setShape('cylinder_band')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all ${
              shape === 'cylinder_band'
                ? 'bg-white text-terracotta-600 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" /> Cilindro Raso
          </button>
        </div>

        {/* Main responsive grid: Left: Live SVG/3D Canvas, Right: Summary Dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Live SVG/3D Render Frame & extra controls */}
          <div className="xl:col-span-6 flex flex-col justify-between space-y-4">
            {viewMode === '2d' ? (
              <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-[#fafaf9] border border-terracotta-100/60 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner group">
                {renderSVGElements()}

                {/* Interactive Toggle options in floating panel */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-stone-100 shadow-sm no-print">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-1.5 rounded-lg text-[9px] font-sans font-bold flex items-center gap-1 transition ${
                      showGrid ? 'bg-terracotta-50 text-terracotta-600' : 'text-stone-400 hover:bg-stone-50'
                    }`}
                    title="Mostrar Grade"
                    aria-label="Alternar exibição da grade"
                    aria-pressed={showGrid}
                  >
                    Grid
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative aspect-square w-full max-w-[320px] mx-auto bg-gradient-to-b from-[#fdfdfc] to-[#fafaf9] border border-terracotta-100/60 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                <Slab3DCanvas
                  shape={shape}
                  wetSize={wetSize}
                  finishedSize={finishedSize}
                  shrinkageRate={shrinkageRate}
                  seamAllowance={seamAllowance}
                  cornerRadius={cornerRadius}
                  holeShape={holeShape}
                  holeSize={holeSize}
                  holeSpacing={holeSpacing}
                  thickness={thickness}
                  stateMode={state3DMode}
                />
              </div>
            )}

            {/* 3D Exclusive Controls: Thickness and State (Wet/Fired) */}
            {viewMode === '3d' && (
              <div className="p-3 bg-[#fafaf9] border border-terracotta-100/40 rounded-xl space-y-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-clay-900/80 font-sans flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-terracotta-500" />
                    Estado de Contração 3D
                  </span>
                  <div className="flex bg-clay-50/50 border border-terracotta-100/30 p-0.5 rounded-lg text-[9px]">
                    <button
                      onClick={() => setState3DMode('wet')}
                      className={`px-2 py-1 rounded font-bold transition flex items-center gap-1 ${
                        state3DMode === 'wet' ? 'bg-amber-100 text-amber-800 shadow-xs' : 'text-stone-400 hover:text-stone-700'
                      }`}
                    >
                      <Sliders className="w-3 h-3" />
                      Úmido (100%)
                    </button>
                    <button
                      onClick={() => setState3DMode('fired')}
                      className={`px-2 py-1 rounded font-bold transition flex items-center gap-1 ${
                        state3DMode === 'fired' ? 'bg-terracotta-500 text-white shadow-xs' : 'text-stone-400 hover:text-stone-700'
                      }`}
                    >
                      <Flame className="w-3 h-3" />
                      Queimado (-{shrinkageRate.toFixed(1)}%)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-clay-900">
                    <span>Espessura da Placa (Slab Thickness)</span>
                    <span className="font-mono font-bold text-terracotta-600 bg-white border border-terracotta-100/40 px-1.5 py-0.5 rounded">
                      {(thickness * 10).toFixed(0)} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={thickness}
                    onChange={(e) => setThickness(parseFloat(e.target.value))}
                    className="w-full accent-terracotta-500 h-1 bg-terracotta-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-clay-900/40 font-mono">
                    <span>2 mm (Mín)</span>
                    <span>6 mm (Padrão)</span>
                    <span>25 mm (Máx)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cylinder extra inputs */}
            {shape === 'cylinder_band' && (
              <div className="p-3 bg-terracotta-50/20 border border-terracotta-100/30 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-clay-900">
                  <label className="flex items-center gap-1">
                    <span>Margem de Sobreposição (Costura)</span>
                  </label>
                  <span className="font-mono font-bold text-terracotta-500">{seamAllowance.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={seamAllowance}
                  onChange={(e) => setSeamAllowance(parseFloat(e.target.value))}
                  className="w-full accent-terracotta-500 h-1.5 bg-terracotta-100 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Corner Radius Input */}
            {shape !== 'circle' ? (
              <div className="p-3 bg-[#fafaf9] border border-terracotta-100/30 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-clay-900">
                  <span className="flex items-center gap-1">
                    Arredondamento dos Cantos (Corner Radius)
                  </span>
                  <span className="font-mono font-bold text-terracotta-500">{(cornerRadius * 10).toFixed(0)} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={cornerRadius * 10}
                  onChange={(e) => setCornerRadius(parseFloat(e.target.value) / 10)}
                  className="w-full accent-terracotta-500 h-1.5 bg-terracotta-100 rounded-lg cursor-pointer"
                />
              </div>
            ) : (
              <div className="p-3 bg-stone-50/50 border border-stone-200/40 rounded-xl text-[10.5px] text-stone-400 italic">
                Arredondamento de cantos não aplicável a círculos.
              </div>
            )}

            {/* Hole Punch Design Section */}
            <div className="p-3 bg-clay-50/50 border border-terracotta-100/30 rounded-xl space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-clay-900">
                  Formato dos Furos Decorativos (Vazados)
                </label>
                <select
                  value={holeShape}
                  onChange={(e) => setHoleShape(e.target.value as any)}
                  className="w-full bg-white border border-terracotta-100 rounded-xl px-3 py-1.5 text-clay-900 text-xs focus:outline-none focus:border-terracotta-500"
                >
                  <option value="none">∅ Sem Vazados Decorativos</option>
                  <option value="circle">● Círculo (Vazado Redondo Clássico)</option>
                  <option value="square">■ Quadrado (Moderno / Cubista)</option>
                  <option value="triangle">▲ Triângulo (Geométrico)</option>
                  <option value="flower">✿ Flor (Estilo Delicado)</option>
                </select>
              </div>

              {holeShape !== 'none' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-medium text-stone-500">Diâmetro do Furo</span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={holeSize}
                        onChange={(e) => setHoleSize(Math.max(0.2, parseFloat(e.target.value) || 0.2))}
                        className="w-full bg-white border border-terracotta-100 rounded-xl px-2.5 py-1 text-clay-900 font-mono text-xs focus:outline-none"
                        step="0.1"
                      />
                      <div className="absolute right-2 top-1 text-stone-400 text-[10px]">cm</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-stone-500">Espaçamento</span>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={holeSpacing}
                        onChange={(e) => setHoleSpacing(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                        className="w-full bg-white border border-terracotta-100 rounded-xl px-2.5 py-1 text-clay-900 font-mono text-xs focus:outline-none"
                        step="0.1"
                      />
                      <div className="absolute right-2 top-1 text-stone-400 text-[10px]">cm</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summary Dashboard of Area & Perimeter with explanation */}
          <div className="xl:col-span-6 flex flex-col justify-between space-y-4">
            <div className="bg-terracotta-50/10 border border-terracotta-100/40 rounded-xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-clay-900 flex items-center gap-1.5 border-b border-terracotta-100/40 pb-2">
                <Ruler className="w-3.5 h-3.5 text-terracotta-500" />
                Métricas e Contração Final
              </h4>

              <div className="space-y-4">
                {/* Surface Area Row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10.5px] font-medium text-stone-500">
                    <span>Área da Superfície</span>
                    <span className="text-[9.5px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" />
                      -{areaReduction.toFixed(1)}% de Área
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-stone-150/60 shadow-sm">
                      <div className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">Úmido (Molde)</div>
                      <div className="text-[13px] font-mono font-black text-clay-900">{areaWet.toFixed(1)} <span className="text-[9px] font-normal text-stone-500">cm²</span></div>
                    </div>
                    <div className="bg-terracotta-50/40 p-2 rounded-lg border border-terracotta-100/30">
                      <div className="text-[8px] text-terracotta-500 font-bold uppercase tracking-wider">Final (Peça)</div>
                      <div className="text-[13px] font-mono font-black text-terracotta-700">{areaFired.toFixed(1)} <span className="text-[9px] font-normal text-terracotta-500">cm²</span></div>
                    </div>
                  </div>
                </div>

                {/* Perimeter Row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10.5px] font-medium text-stone-500">
                    <span>Perímetro de Corte</span>
                    <span className="text-[9.5px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-bold">
                      Contração: -{shrinkageRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-stone-150/60 shadow-sm">
                      <div className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">Úmido (Linha)</div>
                      <div className="text-[13px] font-mono font-black text-clay-900">{perimeterWet.toFixed(1)} <span className="text-[9px] font-normal text-stone-500">cm</span></div>
                    </div>
                    <div className="bg-terracotta-50/40 p-2 rounded-lg border border-terracotta-100/30">
                      <div className="text-[8px] text-terracotta-500 font-bold uppercase tracking-wider">Final (Peça)</div>
                      <div className="text-[13px] font-mono font-black text-terracotta-700">{perimeterFired.toFixed(1)} <span className="text-[9px] font-normal text-stone-500">cm</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quadratic shrinkage insight card */}
              <div className="p-2.5 bg-[#fafaf9] border border-terracotta-100/40 rounded-lg text-[9.5px] text-stone-600 leading-relaxed flex gap-1.5 items-start">
                <Info className="w-3.5 h-3.5 text-terracotta-500 flex-shrink-0 mt-0.5" />
                <p>
                  A contração volumétrica é maior que a linear. Encolher <strong>{shrinkageRate.toFixed(1)}%</strong> linearmente reduz <strong>{areaReduction.toFixed(1)}%</strong> da superfície da placa de argila!
                </p>
              </div>
            </div>

            {/* Toggles and Legend */}
            <div className="space-y-2 p-3 bg-clay-50/60 rounded-xl border border-terracotta-100/30 text-[10.5px]">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFiredOutline(!showFiredOutline)}
                  className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition font-medium"
                >
                  {showFiredOutline ? <Eye className="w-3.5 h-3.5 text-terracotta-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Contração Esperada (Peça Queimada)</span>
                </button>
                <div className="w-6 h-0.5 border-t-2 border-dashed border-[#94a6f0]" />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowNaiveOutline(!showNaiveOutline)}
                  className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition font-medium"
                >
                  {showNaiveOutline ? <Eye className="w-3.5 h-3.5 text-stone-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Cálculo Incorreto (Multiplicação Direta)</span>
                </button>
                <div className="w-6 h-0.5 border-t-2 border-dashed border-gray-400" />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-200/50">
                <span className="font-bold text-[#2c4cdb]">Molde Cru Recomendado</span>
                <div className="w-6 h-0.5 bg-[#2c4cdb]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printing & export action buttons */}
      <div className="mt-5 pt-4 border-t border-dashed border-terracotta-100 grid grid-cols-2 gap-3">
        <button
          onClick={handleExportSVG}
          className="px-4 py-2.5 bg-clay-50 hover:bg-clay-100 border border-terracotta-200 text-clay-900 rounded-xl text-xs font-sans font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Download className="w-4 h-4 text-clay-900/60" />
          Exportar SVG
        </button>

        <button
          onClick={handlePrint}
          disabled={!onPrintRequest}
          className="px-4 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-xl text-xs font-sans font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-terracotta-600/15"
        >
          <Printer className="w-4 h-4" />
          Imprimir Ladrilhado
        </button>
      </div>
    </div>
  );
}
