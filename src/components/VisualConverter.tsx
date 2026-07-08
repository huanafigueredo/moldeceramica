import React, { useRef, useState, useEffect } from 'react';
import { Upload, Sliders, Image as ImageIcon, Sparkles, RefreshCw, Wand2, Download, FileCode, Scissors, Eye } from 'lucide-react';

interface VisualConverterProps {
  globalShrinkage: number;
  onDimensionsExtracted: (topDia: number, botDia: number, vertH: number) => void;
}

export default function VisualConverter({
  globalShrinkage,
  onDimensionsExtracted,
}: VisualConverterProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'normal' | 'edges' | 'threshold'>('normal');
  const [realTopDiameter, setRealTopDiameter] = useState<number>(8); // User specifies 1 real-world reference
  const [thresholdVal, setThresholdVal] = useState<number>(128);
  const [activeTab, setActiveTab] = useState<'mapping' | 'vector'>('mapping');

  const [realTopDiameterInput, setRealTopDiameterInput] = useState(realTopDiameter.toString());

  // Sync internal text state when external realTopDiameter changes
  useEffect(() => {
    if (parseFloat(realTopDiameterInput) !== realTopDiameter) {
      setRealTopDiameterInput(realTopDiameter.toString());
    }
  }, [realTopDiameter]);

  // Overlay control coordinates (relative % on image)
  const [topLine, setTopLine] = useState({ x1: 25, x2: 75, y: 25 });
  const [bottomLine, setBottomLine] = useState({ x1: 35, x2: 65, y: 75 });
  const [heightLine, setHeightLine] = useState({ x: 50, y1: 25, y2: 75 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drag states
  const [dragging, setDragging] = useState<{ type: string; pt: string } | null>(null);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Run image processing filters client-side on canvas
  useEffect(() => {
    if (!imageSrc || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      if (filterMode === 'edges') {
        // Simple Sobel edge detection filter
        const width = canvas.width;
        const height = canvas.height;
        const grayscale = new Uint8Array(width * height);

        // First, convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          grayscale[i/4] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        // Apply Sobel kernels
        const edgeData = ctx.createImageData(width, height);
        const ed = edgeData.data;

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            const val00 = grayscale[idx - width - 1];
            const val01 = grayscale[idx - width];
            const val02 = grayscale[idx - width + 1];
            const val10 = grayscale[idx - 1];
            const val12 = grayscale[idx + 1];
            const val20 = grayscale[idx + width - 1];
            const val21 = grayscale[idx + width];
            const val22 = grayscale[idx + width + 1];

            // Sobel kernels
            const gx = (val02 + 2 * val12 + val22) - (val00 + 2 * val10 + val20);
            const gy = (val20 + 2 * val21 + val22) - (val00 + 2 * val01 + val02);
            const gMagnitude = Math.sqrt(gx * gx + gy * gy);

            // Set output
            const pxIdx = idx * 4;
            const cVal = gMagnitude > thresholdVal ? 255 : 0;
            ed[pxIdx] = 142;     // Terracotta R
            ed[pxIdx+1] = 74;   // Terracotta G
            ed[pxIdx+2] = 35;   // Terracotta B
            ed[pxIdx+3] = gMagnitude > thresholdVal ? 230 : 20; // alpha
          }
        }
        ctx.putImageData(edgeData, 0, 0);
      } else if (filterMode === 'threshold') {
        // High contrast Threshold filter
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const v = gray >= thresholdVal ? 250 : 50;
          data[i] = v;
          data[i+1] = v;
          data[i+2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
      }
    };

    // Trigger reload if image is already cached
    if (img.complete) {
      img.onload(null as any);
    }
  }, [imageSrc, filterMode, thresholdVal]);

  // Convert pixel dimensions to real world centimeters using the user's reference top-line diameter
  const extractMeasurements = () => {
    // Top line width in percentage units
    const topPercentW = Math.abs(topLine.x2 - topLine.x1);
    const bottomPercentW = Math.abs(bottomLine.x2 - bottomLine.x1);
    const heightPercentH = Math.abs(heightLine.y2 - heightLine.y1);

    // The overlay container isn't square (aspect-video), so 1% of width and
    // 1% of height cover different real pixel distances. Normalize the
    // vertical percentage into width-equivalent percentage units before
    // applying the same cm-per-% scale, otherwise the extracted height comes
    // out distorted whenever the photo container isn't 1:1.
    const rect = containerRef.current?.getBoundingClientRect();
    const containerAspect = rect && rect.height > 0 ? rect.width / rect.height : 16 / 9;
    const heightPercentInWidthUnits = heightPercentH / containerAspect;

    // Calculate scale: real cm per % unit (of width)
    const cmPerPercent = realTopDiameter / topPercentW;

    const realBotDiameter = bottomPercentW * cmPerPercent;
    const realHeight = heightPercentInWidthUnits * cmPerPercent;

    // Apply shrinkage (to show what the mold dimensions should be)
    const factor = 1 - globalShrinkage / 100;
    const moldTop = realTopDiameter / factor;
    const moldBot = realBotDiameter / factor;
    const moldHeight = realHeight / factor;

    return {
      rawTop: realTopDiameter,
      rawBot: realBotDiameter,
      rawHeight: realHeight,
      moldTop,
      moldBot,
      moldHeight,
    };
  };

  const results = extractMeasurements();

  // Vectorized mold generator matching the parameterized geometry pattern
  const getVectorizedData = () => {
    const { moldTop, moldBot, moldHeight } = results;
    const seam = 1.0; // standard seam allowance
    const rt = moldTop / 2;
    const rb = moldBot / 2;
    const h_mold = moldHeight;

    if (Math.abs(rt - rb) < 0.001) {
      const circ = Math.PI * moldTop;
      const total_w = circ + seam;
      return {
        type: 'cylinder' as const,
        h_mold,
        moldTop,
        circ,
        seam,
        total_w,
        bboxW: total_w,
        bboxH: h_mold,
      };
    }

    const s = Math.sqrt(h_mold * h_mold + (rt - rb) * (rt - rb));
    const rMax = Math.max(rt, rb);
    const rMin = Math.min(rt, rb);
    const isTopLarger = rt > rb;

    const L_outer = (s * rMax) / (rMax - rMin);
    const L_inner = L_outer - s;

    const theta = (2 * Math.PI * rMax) / L_outer;
    const theta_seam = seam / L_outer;
    const total_theta = theta + theta_seam;

    const bboxW = L_outer * 2 * Math.sin(total_theta / 2);
    const bboxH = L_outer - L_inner * Math.cos(total_theta / 2);

    return {
      type: 'cone' as const,
      moldTop,
      moldBot,
      h_mold,
      s,
      L_outer,
      L_inner,
      theta,
      theta_seam,
      total_theta,
      isTopLarger,
      seam,
      bboxW: Math.max(bboxW, 10),
      bboxH: Math.max(bboxH, 10),
    };
  };

  const handleDownloadSVG = () => {
    const vData = getVectorizedData();
    const scale = 37.795; // pixels per cm (96 DPI)
    const pad = 40;
    
    const w_px = vData.bboxW * scale;
    const h_px = vData.bboxH * scale;
    const vbW = w_px + pad * 2;
    const vbH = h_px + pad * 2;

    let svgInnerContent = '';

    if (vData.type === 'cylinder') {
      const w = vData.total_w * scale;
      const h = vData.h_mold * scale;
      const circ_w = vData.circ * scale;
      
      svgInnerContent = `
        <!-- Mold outline (Red for Laser Cut) -->
        <rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="2" fill="none" stroke="#FF0000" stroke-width="2" />
        
        <!-- Seam guideline (Blue for Engraving) -->
        <line x1="${pad + circ_w}" y1="${pad}" x2="${pad + circ_w}" y2="${pad + h}" stroke="#0000FF" stroke-width="1.5" stroke-dasharray="5,5" />
        
        <!-- Text annotations -->
        <text x="${pad + 20}" y="${pad + 30}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333333">CeraMold • Molde Cilindro Vetorizado (1:1)</text>
        <text x="${pad + 20}" y="${pad + 55}" font-family="sans-serif" font-size="10" fill="#666666">Diâmetro Nominal: ${realTopDiameter.toFixed(1)} cm | Retração: ${globalShrinkage}%</text>
        <text x="${pad + 20}" y="${pad + 75}" font-family="sans-serif" font-size="10" fill="#888888">Largura do Molde: ${vData.total_w.toFixed(1)} cm (inclui +${vData.seam}cm de costura)</text>
        <text x="${pad + 20}" y="${pad + 95}" font-family="sans-serif" font-size="10" fill="#888888">Altura do Molde: ${vData.h_mold.toFixed(1)} cm</text>
      `;
    } else {
      const d = vData as any;
      const L_outer_px = d.L_outer * scale;
      const L_inner_px = d.L_inner * scale;
      const total_theta = d.total_theta;
      const theta = d.theta;
      const seam = d.seam;

      const apexX = vbW / 2;
      const apexY = pad - L_inner_px * Math.cos(total_theta / 2) + (L_outer_px - L_inner_px) / 2;

      const getPoint = (r: number, angleRad: number) => {
        const a = Math.PI / 2 + angleRad;
        return {
          x: apexX + r * Math.cos(a),
          y: apexY + r * Math.sin(a),
        };
      };

      const pt1_out = getPoint(L_outer_px, -total_theta / 2);
      const pt2_out = getPoint(L_outer_px, total_theta / 2);
      const pt3_in = getPoint(L_inner_px, total_theta / 2);
      const pt4_in = getPoint(L_inner_px, -total_theta / 2);

      const pt_circ_end = getPoint(L_outer_px, -total_theta/2 + theta);
      const pt_circ_end_in = getPoint(L_inner_px, -total_theta/2 + theta);

      const mainPath = `M ${pt1_out.x.toFixed(2)} ${pt1_out.y.toFixed(2)} A ${L_outer_px.toFixed(2)} ${L_outer_px.toFixed(2)} 0 ${total_theta > Math.PI ? 1 : 0} 1 ${pt2_out.x.toFixed(2)} ${pt2_out.y.toFixed(2)} L ${pt3_in.x.toFixed(2)} ${pt3_in.y.toFixed(2)} A ${L_inner_px.toFixed(2)} ${L_inner_px.toFixed(2)} 0 ${total_theta > Math.PI ? 1 : 0} 0 ${pt4_in.x.toFixed(2)} ${pt4_in.y.toFixed(2)} Z`;
      const seamPath = `M ${pt_circ_end.x.toFixed(2)} ${pt_circ_end.y.toFixed(2)} A ${L_outer_px.toFixed(2)} ${L_outer_px.toFixed(2)} 0 0 1 ${pt2_out.x.toFixed(2)} ${pt2_out.y.toFixed(2)} L ${pt3_in.x.toFixed(2)} ${pt3_in.y.toFixed(2)} A ${L_inner_px.toFixed(2)} ${L_inner_px.toFixed(2)} 0 0 0 ${pt_circ_end_in.x.toFixed(2)} ${pt_circ_end_in.y.toFixed(2)} Z`;

      svgInnerContent = `
        <!-- Radial guides -->
        <line x1="${apexX.toFixed(2)}" y1="${apexY.toFixed(2)}" x2="${pt1_out.x.toFixed(2)}" y2="${pt1_out.y.toFixed(2)}" stroke="#CCCCCC" stroke-width="1" stroke-dasharray="2,2" />
        <line x1="${apexX.toFixed(2)}" y1="${apexY.toFixed(2)}" x2="${pt2_out.x.toFixed(2)}" y2="${pt2_out.y.toFixed(2)}" stroke="#CCCCCC" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Mold outline (Red for Laser Cut) -->
        <path d="${mainPath}" fill="none" stroke="#FF0000" stroke-width="2" />
        
        <!-- Seam guideline (Blue for Engraving) -->
        <path d="${seamPath}" fill="#FF0000" fill-opacity="0.05" stroke="#0000FF" stroke-width="1.5" stroke-dasharray="4,4" />

        <!-- Text annotations -->
        <text x="${pad}" y="${pad + 15}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333333">CeraMold • Molde Cônico Vetorizado de Foto (1:1)</text>
        <text x="${pad}" y="${pad + 35}" font-family="sans-serif" font-size="10" fill="#666666">Ø Boca: ${realTopDiameter.toFixed(1)} cm | Ø Base: ${results.rawBot.toFixed(1)} cm | Altura: ${results.rawHeight.toFixed(1)} cm</text>
        <text x="${pad}" y="${pad + 55}" font-family="sans-serif" font-size="10" fill="#8e4a23" font-weight="bold">Fator de Retração Aplicado: ${globalShrinkage}%</text>
        <text x="${pad}" y="${pad + 75}" font-family="sans-serif" font-size="10" fill="#888888">Medidas Molde Cru: Ø Boca: ${results.moldTop.toFixed(1)}cm | Ø Base: ${results.moldBot.toFixed(1)}cm | Altura: ${results.moldHeight.toFixed(1)}cm</text>
        <text x="${pad}" y="${pad + 95}" font-family="sans-serif" font-size="10" fill="#888888">Margem de costura: +${seam} cm incluído no contorno.</text>
      `;
    }

    const fullSvg = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${(vbW / scale).toFixed(2)}cm" height="${(vbH / scale).toFixed(2)}cm" style="background:#FFFFFF;">
  ${svgInnerContent}
</svg>`;

    const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CeraMold_Vetorizado_${realTopDiameter}cm_${globalShrinkage}pct.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Dragging controls using pointer events for maximum compatibility (touch and mouse)
  const handlePointerDown = (e: React.PointerEvent, type: string, pt: string) => {
    e.preventDefault();
    setDragging({ type, pt });
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      if (dragging.type === 'top') {
        if (dragging.pt === 'x1') setTopLine((prev) => ({ ...prev, x1: x }));
        if (dragging.pt === 'x2') setTopLine((prev) => ({ ...prev, x2: x }));
        if (dragging.pt === 'y') {
          setTopLine((prev) => ({ ...prev, y: y }));
          // Align height line with top line
          setHeightLine((prev) => ({ ...prev, y1: y }));
        }
      } else if (dragging.type === 'bottom') {
        if (dragging.pt === 'x1') setBottomLine((prev) => ({ ...prev, x1: x }));
        if (dragging.pt === 'x2') setBottomLine((prev) => ({ ...prev, x2: x }));
        if (dragging.pt === 'y') {
          setBottomLine((prev) => ({ ...prev, y: y }));
          // Align height line with bottom line
          setHeightLine((prev) => ({ ...prev, y2: y }));
        }
      } else if (dragging.type === 'height') {
        if (dragging.pt === 'x') setHeightLine((prev) => ({ ...prev, x: x }));
      }
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging]);

  const handleApplyToGenerator = () => {
    // Send extracted values up to prefill the parametric cone generator
    onDimensionsExtracted(
      parseFloat(results.rawTop.toFixed(1)),
      parseFloat(results.rawBot.toFixed(1)),
      parseFloat(results.rawHeight.toFixed(1))
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* COLUMN 1 & 2: IMAGE VISUAL OVERLAY CONTAINER */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-terracotta-100 p-6 md:p-8 shadow-sm flex flex-col">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-terracotta-500 rounded-2xl flex items-center justify-center text-white shadow-sm">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-extrabold text-clay-900">Conversor Visual</h3>
              <p className="text-xs text-clay-900/40 font-sans">Transforme fotos em gabaritos técnicos</p>
            </div>
          </div>

          {imageSrc && activeTab === 'mapping' && (
            <div className="flex gap-1 p-1 bg-clay-50 rounded-xl border border-terracotta-100/50">
              {['normal', 'edges', 'threshold'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode as any)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition ${
                    filterMode === mode ? 'bg-white text-terracotta-600 shadow-sm' : 'text-clay-900/30'
                  }`}
                >
                  {mode === 'normal' ? 'Original' : mode === 'edges' ? 'Bordas' : 'Contraste'}
                </button>
              ))}
            </div>
          )}
        </div>

        {imageSrc && (
          <div className="flex gap-1 mb-8 p-1 bg-clay-50 rounded-2xl border border-terracotta-100/30 w-fit">
            <button
              onClick={() => setActiveTab('mapping')}
              className={`px-6 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'mapping' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-clay-900/30'
              }`}
            >
              1. Mapeamento
            </button>
            <button
              onClick={() => setActiveTab('vector')}
              className={`px-6 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'vector' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-clay-900/30'
              }`}
            >
              2. Molde Final
            </button>
          </div>
        )}

          {!imageSrc ? (
            /* Upload box */
            <div className="border-2 border-dashed border-terracotta-200/60 rounded-2xl p-10 bg-[#fdfaf6]/30 hover:bg-terracotta-50/10 transition text-center flex flex-col items-center justify-center min-h-[340px]">
              <div className="p-4 bg-terracotta-100 rounded-full text-terracotta-500 mb-4 animate-pulse">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-clay-900 mb-1">Escolha uma foto do seu objeto</p>
              <p className="text-xs text-clay-900/50 mb-6 max-w-sm">
                Tire foto de perfil (plana) do objeto desejado. O sistema ajudará a tirar as medidas exatas, detectar as bordas e vetorizar o molde com retração.
              </p>
              <label className="px-5 py-2.5 bg-terracotta-500 hover:bg-terracotta-600 text-white font-sans text-xs font-semibold rounded-xl cursor-pointer shadow-md transition">
                <span>Selecionar Imagem</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : activeTab === 'mapping' ? (
            /* Interactive workspace (Mapping Tab) */
            <div className="space-y-4">
              <div
                ref={containerRef}
                className="relative aspect-video max-h-[380px] w-full rounded-2xl overflow-hidden border border-terracotta-100 bg-black/5 flex items-center justify-center select-none touch-none"
              >
                {/* Processed Edge Canvas */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full object-contain z-10 ${
                    filterMode === 'normal' ? 'hidden' : 'block'
                  }`}
                />

                {/* Uploaded Base Image */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Vessel upload"
                  crossOrigin="anonymous"
                  className={`w-full h-full object-contain ${
                    filterMode === 'normal' ? 'block' : 'opacity-20'
                  }`}
                />

                {/* VISUAL LAYERING OF ADJUSTABLE LINES */}
                <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none">
                  {/* Height Vertical Line */}
                  <line
                    x1={`${heightLine.x}%`}
                    y1={`${heightLine.y1}%`}
                    x2={`${heightLine.x}%`}
                    y2={`${heightLine.y2}%`}
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="4,4"
                  />
                  {/* Top Line */}
                  <line
                    x1={`${topLine.x1}%`}
                    y1={`${topLine.y}%`}
                    x2={`${topLine.x2}%`}
                    y2={`${topLine.y}%`}
                    stroke="#8e4a23"
                    strokeWidth="3"
                  />
                  {/* Bottom Line */}
                  <line
                    x1={`${bottomLine.x1}%`}
                    y1={`${bottomLine.y}%`}
                    x2={`${bottomLine.x2}%`}
                    y2={`${bottomLine.y}%`}
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />
                </svg>

                {/* DRAGGABLE HANDLES */}
                {/* Top line handle x1 */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'top', 'x1')}
                  className="absolute w-7 h-7 bg-white border-2 border-terracotta-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform z-30 flex items-center justify-center text-[10px] font-bold text-terracotta-500 shadow touch-none select-none"
                  style={{ left: `calc(${topLine.x1}% - 14px)`, top: `calc(${topLine.y}% - 14px)` }}
                >
                  T
                </div>
                {/* Top line handle x2 */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'top', 'x2')}
                  className="absolute w-7 h-7 bg-white border-2 border-terracotta-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform z-30 flex items-center justify-center text-[10px] font-bold text-terracotta-500 shadow touch-none select-none"
                  style={{ left: `calc(${topLine.x2}% - 14px)`, top: `calc(${topLine.y}% - 14px)` }}
                >
                  T
                </div>
                {/* Top line handle height shift (y) */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'top', 'y')}
                  className="absolute w-6 h-6 bg-terracotta-100 border border-terracotta-500 rounded cursor-ns-resize hover:scale-110 transition z-30 touch-none select-none"
                  style={{ left: `calc(${(topLine.x1 + topLine.x2) / 2}% - 12px)`, top: `calc(${topLine.y}% - 12px)` }}
                />

                {/* Bottom line handle x1 */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'bottom', 'x1')}
                  className="absolute w-7 h-7 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform z-30 flex items-center justify-center text-[10px] font-bold text-blue-500 shadow touch-none select-none"
                  style={{ left: `calc(${bottomLine.x1}% - 14px)`, top: `calc(${bottomLine.y}% - 14px)` }}
                >
                  B
                </div>
                {/* Bottom line handle x2 */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'bottom', 'x2')}
                  className="absolute w-7 h-7 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize hover:scale-125 transition-transform z-30 flex items-center justify-center text-[10px] font-bold text-blue-500 shadow touch-none select-none"
                  style={{ left: `calc(${bottomLine.x2}% - 14px)`, top: `calc(${bottomLine.y}% - 14px)` }}
                >
                  B
                </div>
                {/* Bottom line handle height shift (y) */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'bottom', 'y')}
                  className="absolute w-6 h-6 bg-blue-100 border border-blue-500 rounded cursor-ns-resize hover:scale-110 transition z-30 touch-none select-none"
                  style={{ left: `calc(${(bottomLine.x1 + bottomLine.x2) / 2}% - 12px)`, top: `calc(${bottomLine.y}% - 12px)` }}
                />

                {/* Height line horizontal shift (x) */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'height', 'x')}
                  className="absolute w-6 h-6 bg-emerald-100 border border-emerald-500 rounded-full cursor-ew-resize hover:scale-110 transition z-30 touch-none select-none"
                  style={{ left: `calc(${heightLine.x}% - 12px)`, top: `calc(${(heightLine.y1 + heightLine.y2) / 2}% - 12px)` }}
                />
              </div>

              {/* Threshold slider for Edge detection */}
              {filterMode !== 'normal' && (
                <div className="flex gap-4 items-center bg-clay-50/50 p-3 rounded-xl border border-terracotta-100/30">
                  <span className="text-[10px] font-bold text-clay-900/60 uppercase">Controle de Borda:</span>
                  <input
                    type="range"
                    min="10"
                    max="240"
                    value={thresholdVal}
                    onChange={(e) => setThresholdVal(parseInt(e.target.value))}
                    className="flex-1 accent-terracotta-500"
                  />
                  <span className="font-mono text-xs text-clay-900/50">{thresholdVal}</span>
                </div>
              )}
            </div>
          ) : (
            /* Vectorized Mold Render Preview (Vector Tab) */
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-mono uppercase bg-terracotta-100 text-terracotta-700 px-2 py-1 rounded font-bold">
                    Visualizador Vetorial 1:1
                  </span>
                  <span className="text-[10px] font-mono text-clay-900/40">
                    Curvas de alta fidelidade geométricas
                  </span>
                </div>

                {(() => {
                  const vData = getVectorizedData();
                  const scale = 14; 
                  const pad = 35;
                  const w_px = vData.bboxW * scale;
                  const h_px = vData.bboxH * scale;
                  const vbW = w_px + pad * 2;
                  const vbH = h_px + pad * 2;

                  if (vData.type === 'cylinder') {
                    const w = vData.total_w * scale;
                    const h = vData.h_mold * scale;
                    const circ_w = vData.circ * scale;
                    
                    return (
                      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full max-w-[420px] max-h-[300px] select-none">
                        <g transform={`translate(${pad}, ${pad})`}>
                          <rect
                            width={w}
                            height={h}
                            fill="none"
                            stroke="#FF0000"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <line
                            x1={circ_w}
                            y1={0}
                            x2={circ_w}
                            y2={h}
                            stroke="#0000FF"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                          />
                          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" className="fill-clay-900 font-sans text-[10px] font-bold">
                            {vData.total_w.toFixed(1)} cm
                          </text>
                        </g>
                      </svg>
                    );
                  } else {
                    const d = vData as any;
                    const L_outer_px = d.L_outer * scale;
                    const L_inner_px = d.L_inner * scale;
                    const total_theta = d.total_theta;
                    const theta = d.theta;

                    const apexX = vbW / 2;
                    const apexY = pad - L_inner_px * Math.cos(total_theta / 2) + (L_outer_px - L_inner_px) / 2;

                    const getPoint = (r: number, angleRad: number) => {
                      const a = Math.PI / 2 + angleRad;
                      return {
                        x: apexX + r * Math.cos(a),
                        y: apexY + r * Math.sin(a),
                      };
                    };

                    const pt1_out = getPoint(L_outer_px, -total_theta / 2);
                    const pt2_out = getPoint(L_outer_px, total_theta / 2);
                    const pt3_in = getPoint(L_inner_px, total_theta / 2);
                    const pt4_in = getPoint(L_inner_px, -total_theta / 2);

                    const pt_circ_end = getPoint(L_outer_px, -total_theta/2 + theta);
                    const pt_circ_end_in = getPoint(L_inner_px, -total_theta/2 + theta);

                    const mainPath = `M ${pt1_out.x} ${pt1_out.y} A ${L_outer_px} ${L_outer_px} 0 ${total_theta > Math.PI ? 1 : 0} 1 ${pt2_out.x} ${pt2_out.y} L ${pt3_in.x} ${pt3_in.y} A ${L_inner_px} ${L_inner_px} 0 ${total_theta > Math.PI ? 1 : 0} 0 ${pt4_in.x} ${pt4_in.y} Z`;
                    const seamPath = `M ${pt_circ_end.x} ${pt_circ_end.y} A ${L_outer_px} ${L_outer_px} 0 0 1 ${pt2_out.x} ${pt2_out.y} L ${pt3_in.x} ${pt3_in.y} A ${L_inner_px} ${L_inner_px} 0 0 0 ${pt_circ_end_in.x} ${pt_circ_end_in.y} Z`;

                    return (
                      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full max-w-[420px] max-h-[300px] select-none">
                        <g>
                          <path
                            d={mainPath}
                            fill="none"
                            stroke="#FF0000"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d={seamPath}
                            fill="#0000FF"
                            fillOpacity="0.08"
                            stroke="#0000FF"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                          />
                          <line x1={apexX} y1={apexY} x2={pt1_out.x} y2={pt1_out.y} className="stroke-stone-300 stroke-[1] stroke-dasharray-[2,2]" />
                          <line x1={apexX} y1={apexY} x2={pt2_out.x} y2={pt2_out.y} className="stroke-stone-300 stroke-[1] stroke-dasharray-[2,2]" />

                          <text x={apexX} y={pt1_out.y + 15} textAnchor="middle" className="fill-stone-800 font-serif text-[10px] font-bold">
                            Planificação Cônica Vetorizada
                          </text>
                          <text x={apexX} y={pt1_out.y + 28} textAnchor="middle" className="fill-stone-500 font-sans text-[8px] font-semibold">
                            Molde Cru: Ø Boca {results.moldTop.toFixed(1)}cm | Ø Base {results.moldBot.toFixed(1)}cm | Altura {results.moldHeight.toFixed(1)}cm
                          </text>
                        </g>
                      </svg>
                    );
                  }
                })()}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-terracotta-50/20 rounded-2xl border border-terracotta-100/50 justify-between items-center">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-clay-900 flex items-center gap-1.5 mb-1">
                    <Scissors className="w-4 h-4 text-terracotta-500" />
                    Lógica de Corte e Retração (CeraMold)
                  </h4>
                  <p className="text-[10.5px] text-clay-900/60 font-sans leading-normal">
                    O molde foi redimensionado aplicando a retração de <span className="font-bold text-terracotta-600">{globalShrinkage}%</span>. As linhas externas vermelhas do SVG baixado são programadas para <b>Corte a Laser</b> ou manual, e a área tracejada representa a costura de colagem de 1,0 cm.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSVG}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-sans font-bold transition shadow-sm flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-4" />
                  Baixar SVG 1:1
                </button>
              </div>
            </div>
          )}
          
          {imageSrc && activeTab === 'mapping' && (
            <div className="mt-4 flex justify-between">
              <button
                onClick={() => {
                  setImageSrc(null);
                  setActiveTab('mapping');
                }}
                className="px-3.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition font-sans font-semibold"
              >
                Remover Foto
              </button>
              <span className="text-[10px] text-clay-900/40 font-mono flex items-center gap-1.5">
                <span>Alinhe as rédeas coloridas aos limites do objeto</span>
              </span>
            </div>
          )}
        </div>

      {/* COLUMN 3: REFERENCE SETTINGS & EXTRACTED DATA */}
      <div className="bg-white rounded-3xl border border-terracotta-100 p-8 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-terracotta-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-clay-900">Escala Real</h3>
              <p className="text-[10px] text-clay-900/40 uppercase font-bold tracking-wider">Calibração</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Diâmetro do Topo (Referência)</label>
              <div className="relative">
                <input
                  type="number"
                  value={realTopDiameterInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRealTopDiameterInput(val);
                    const num = parseFloat(val);
                    if (!isNaN(num)) setRealTopDiameter(num);
                  }}
                  onBlur={() => {
                    if (realTopDiameterInput === "" || isNaN(parseFloat(realTopDiameterInput))) {
                      setRealTopDiameterInput(realTopDiameter.toString());
                    }
                  }}
                  className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 font-mono text-sm focus:outline-none transition-colors"
                  step="0.5"
                />
                <div className="absolute right-4 top-3.5 text-clay-900/30 text-xs font-bold">CM</div>
              </div>
            </div>

            {/* EXTRACTED MEASUREMENTS CARD */}
            {imageSrc && (
              <div className="bg-clay-50 rounded-2xl p-6 border border-clay-100 space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-clay-900/40">Resultados da Planificação</span>
                
                <div className="grid grid-cols-1 gap-3 font-mono">
                  <div className="flex justify-between items-end border-b border-clay-200 pb-2">
                    <span className="text-[10px] text-clay-900/50">Ø BASE</span>
                    <span className="text-sm font-bold text-clay-900">{results.moldBot.toFixed(1)} cm</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-clay-200 pb-2">
                    <span className="text-[10px] text-clay-900/50">ALTURA</span>
                    <span className="text-sm font-bold text-clay-900">{results.moldHeight.toFixed(1)} cm</span>
                  </div>
                </div>

                <p className="text-[10px] text-clay-900/40 leading-relaxed italic">
                  *Medidas já expandidas com {globalShrinkage}% de retração.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleApplyToGenerator}
            disabled={!imageSrc}
            className="w-full py-4 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Aplicar no Gerador
          </button>
        </div>
      </div>
    </div>
  );
}
