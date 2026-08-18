import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Wand2, ArrowRight, RotateCcw, Info } from 'lucide-react';
import { simplifyPath, rawPointsToProfile, sketchRadiusAt, RawPoint, ProfilePoint } from '../utils/sketchShape';

interface SketchMoldPageProps {
  onComplete: (profilePoints: ProfilePoint[]) => void;
}

const AXIS_X_FRACTION = 0.18; // where the central axis guide sits, as a fraction of canvas width

export default function SketchMoldPage({ onComplete }: SketchMoldPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 480 });
  const [rawPoints, setRawPoints] = useState<RawPoint[]>([]);
  const [cleanedProfile, setCleanedProfile] = useState<ProfilePoint[] | null>(null);
  const [intensity, setIntensity] = useState(50); // 0-100, maps to Douglas-Peucker epsilon
  const isDrawing = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width: width || 400, height: Math.min(560, Math.max(360, width * 1.1)) });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const axisX = dimensions.width * AXIS_X_FRACTION;

  const getRelativePoint = (e: React.PointerEvent<HTMLCanvasElement>): RawPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;
    setCleanedProfile(null);
    setRawPoints([getRelativePoint(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    setRawPoints((prev) => [...prev, getRelativePoint(e)]);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
  };

  const handleClear = () => {
    setRawPoints([]);
    setCleanedProfile(null);
  };

  const handleImprove = () => {
    if (rawPoints.length < 3) return;
    // Intensity 0-100 maps to an epsilon in pixels: higher intensity = more
    // aggressive simplification = straighter, simpler lines, fewer bands.
    const epsilon = 2 + (intensity / 100) * 22;
    const simplified = simplifyPath(rawPoints, epsilon);
    const profile = rawPointsToProfile(simplified, axisX);
    setCleanedProfile(profile);
  };

  // Main draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dimensions.width;
    const h = dimensions.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, w, h);

    // Central axis guide
    ctx.strokeStyle = '#2c4cdb';
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(axisX, 10);
    ctx.lineTo(axisX, h - 10);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#2c4cdb';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(axisX - 14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('EIXO CENTRAL', 0, 0);
    ctx.restore();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('↑ borda', axisX + 6, 20);
    ctx.fillText('↓ base', axisX + 6, h - 12);

    // Raw stroke (only shown when no cleaned profile yet, or as a faint ghost)
    if (rawPoints.length > 1) {
      ctx.strokeStyle = cleanedProfile ? 'rgba(23,23,26,0.15)' : '#17171a';
      ctx.lineWidth = cleanedProfile ? 2 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(rawPoints[0].x, rawPoints[0].y);
      rawPoints.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // Cleaned/straightened silhouette, mirrored across the axis for a full vessel preview
    if (cleanedProfile && cleanedProfile.length > 1) {
      const ys = rawPoints.map((p) => p.y);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const toCanvasY = (t: number) => maxY - t * (maxY - minY);
      const maxRPx = Math.max(...cleanedProfile.map((p) => p.r)) || 1;
      const rToPx = (r: number) => r * (Math.max(...rawPoints.map((p) => p.x - axisX), 40));

      const rightPts = cleanedProfile.map((p) => ({ x: axisX + rToPx(p.r), y: toCanvasY(p.t) }));

      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(rightPts[0].x, rightPts[0].y);
      rightPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Mirrored left half for a full-silhouette preview
      const leftPts = rightPts.map((p) => ({ x: axisX - (p.x - axisX), y: p.y }));
      ctx.strokeStyle = 'rgba(44,76,219,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftPts[0].x, leftPts[0].y);
      leftPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Vertex dots — one per straightened segment endpoint (= one band each)
      ctx.fillStyle = '#2c4cdb';
      rightPts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [dimensions, rawPoints, cleanedProfile, axisX]);

  useEffect(() => {
    draw();
  }, [draw]);

  const bandCount = cleanedProfile ? cleanedProfile.length - 1 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-terracotta-100 p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-11 h-11 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-clay-900">Desenhar Meu Molde</h1>
            <p className="text-xs text-clay-900/50 mt-1 leading-relaxed">
              Desenhe o <b>contorno lateral</b> da peça (metade do perfil, como se cortasse ela ao meio), encostando no eixo central à esquerda.
              Funciona bem pra formas redondas: canecas, vasos, tigelas, porta-filtro de café. Depois de desenhar, aperte "Melhorar Molde"
              para endireitar as linhas automaticamente.
            </p>
          </div>
        </div>

        <div ref={containerRef} className="relative w-full rounded-2xl border-2 border-dashed border-terracotta-200 overflow-hidden bg-clay-50/50">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full touch-none cursor-crosshair block"
            style={{ height: dimensions.height }}
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleClear}
            className="px-4 py-2.5 bg-white hover:bg-clay-50 border border-terracotta-100 text-clay-900/70 rounded-xl text-xs font-bold flex items-center gap-2 transition"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpar
          </button>

          <div className="flex-1 flex items-center gap-2 px-3">
            <span className="text-[10px] font-bold text-clay-900/40 uppercase whitespace-nowrap">Suavidade</span>
            <input
              type="range"
              min={0}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-terracotta-500"
            />
            <span className="text-[10px] font-mono text-clay-900/40 whitespace-nowrap">
              {intensity < 33 ? 'fiel ao desenho' : intensity < 66 ? 'equilibrado' : 'bem reto'}
            </span>
          </div>

          <button
            onClick={handleImprove}
            disabled={rawPoints.length < 3}
            className="px-5 py-2.5 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-terracotta-500/10"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Melhorar Molde
          </button>
        </div>

        {cleanedProfile && (
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-clay-900">Linhas endireitadas — {bandCount} banda{bandCount !== 1 ? 's' : ''}</p>
                <p className="text-[11px] text-clay-900/50 mt-0.5">Não gostou do resultado? Ajuste a suavidade e aperte "Melhorar Molde" de novo, ou desenhe outra vez.</p>
              </div>
            </div>
            <button
              onClick={() => onComplete(cleanedProfile)}
              className="shrink-0 px-5 py-3 bg-clay-900 hover:bg-clay-900/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm w-full sm:w-auto justify-center"
            >
              Continuar para Configuração
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
