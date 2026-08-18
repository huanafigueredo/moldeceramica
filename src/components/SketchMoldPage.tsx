import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Wand2, ArrowRight, Info, CircleDot, Shapes } from 'lucide-react';
import {
  simplifyPath,
  simplifyClosedPath,
  rawPointsToProfile,
  rawPointsToOutlineCm,
  sketchRadiusAt,
  RawPoint,
  ProfilePoint,
} from '../utils/sketchShape';

interface SketchMoldPageProps {
  onComplete: (profilePoints: ProfilePoint[]) => void;
  onCompleteOutline: (outlinePoints: { x: number; y: number }[]) => void;
}

type Mode = 'profile' | 'outline';

const AXIS_X_FRACTION = 0.18; // where the central axis guide sits, in profile mode
const OUTLINE_PX_PER_CM = 14; // fixed real-world scale for the top-down outline canvas

export default function SketchMoldPage({ onComplete, onCompleteOutline }: SketchMoldPageProps) {
  const [mode, setMode] = useState<Mode>('profile');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 480 });
  // Multiple pointer-down-to-up strokes accumulate here — lifting the
  // finger/mouse to continue drawing must NOT erase what came before.
  const [strokes, setStrokes] = useState<RawPoint[][]>([]);
  const [cleanedProfile, setCleanedProfile] = useState<ProfilePoint[] | null>(null);
  const [cleanedOutline, setCleanedOutline] = useState<RawPoint[] | null>(null); // pixel-space, for the preview draw
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
  const allPoints = strokes.flat();

  const handleModeChange = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setStrokes([]);
    setCleanedProfile(null);
    setCleanedOutline(null);
  };

  const getRelativePoint = (e: React.PointerEvent<HTMLCanvasElement>): RawPoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawing.current = true;
    setCleanedProfile(null);
    setCleanedOutline(null);
    // Start a new stroke without touching the ones already drawn.
    setStrokes((prev) => [...prev, [getRelativePoint(e)]]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const point = getRelativePoint(e);
    setStrokes((prev) => {
      const next = prev.slice();
      next[next.length - 1] = [...next[next.length - 1], point];
      return next;
    });
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
  };

  const handleClear = () => {
    setStrokes([]);
    setCleanedProfile(null);
    setCleanedOutline(null);
  };

  const handleImprove = () => {
    if (allPoints.length < 3) return;
    // Intensity 0-100 maps to an epsilon in pixels: higher intensity = more
    // aggressive simplification = straighter, simpler lines, fewer bands/vertices.
    const epsilon = 2 + (intensity / 100) * 22;
    if (mode === 'profile') {
      const simplified = simplifyPath(allPoints, epsilon);
      setCleanedProfile(rawPointsToProfile(simplified, axisX));
    } else {
      const simplified = simplifyClosedPath(allPoints, epsilon);
      setCleanedOutline(simplified);
    }
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

    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, w, h);

    if (mode === 'profile') {
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

      // Ghost example — an empty canvas gives no sense of what a valid
      // stroke looks like, so trace a faint sample mug profile until the
      // person draws their first stroke.
      if (strokes.length === 0) {
        const gBase = { x: axisX + 6, y: h - 24 };
        const gBody = { x: axisX + Math.min(90, w * 0.22), y: h * 0.62 };
        const gShoulder = { x: axisX + Math.min(70, w * 0.17), y: h * 0.32 };
        const gRim = { x: axisX + Math.min(48, w * 0.12), y: 24 };
        ctx.strokeStyle = '#9ca3af';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.setLineDash([1, 7]);
        ctx.beginPath();
        ctx.moveTo(gBase.x, gBase.y);
        ctx.quadraticCurveTo(gBody.x + 20, gBody.y + 40, gBody.x, gBody.y);
        ctx.quadraticCurveTo(gBody.x - 10, gShoulder.y + 20, gShoulder.x, gShoulder.y);
        ctx.lineTo(gRim.x, gRim.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'italic 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('exemplo: perfil de uma caneca', gBody.x + 14, gBody.y);
        ctx.globalAlpha = 1;
      }
    } else {
      // cm grid
      ctx.strokeStyle = 'rgba(44,76,219,0.08)';
      ctx.lineWidth = 1;
      const step = OUTLINE_PX_PER_CM * 5; // gridline every 5cm
      ctx.beginPath();
      for (let x = 0; x <= w; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('cada quadrado = 5cm', 8, h - 10);
    }

    // Raw strokes — each drawn as its own separate polyline, so lifting the
    // pointer between strokes never draws a spurious connecting line.
    const hasCleaned = mode === 'profile' ? !!cleanedProfile : !!cleanedOutline;
    strokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.strokeStyle = hasCleaned ? 'rgba(23,23,26,0.15)' : '#17171a';
      ctx.lineWidth = hasCleaned ? 2 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    if (mode === 'profile' && cleanedProfile && cleanedProfile.length > 1) {
      // Cleaned/straightened silhouette, mirrored across the axis for a full vessel preview
      const ys = allPoints.map((p) => p.y);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const toCanvasY = (t: number) => maxY - t * (maxY - minY);
      const rToPx = (r: number) => r * (Math.max(...allPoints.map((p) => p.x - axisX), 40));

      const rightPts = cleanedProfile.map((p) => ({ x: axisX + rToPx(p.r), y: toCanvasY(p.t) }));

      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(rightPts[0].x, rightPts[0].y);
      rightPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      const leftPts = rightPts.map((p) => ({ x: axisX - (p.x - axisX), y: p.y }));
      ctx.strokeStyle = 'rgba(44,76,219,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftPts[0].x, leftPts[0].y);
      leftPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      ctx.fillStyle = '#2c4cdb';
      rightPts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (mode === 'outline' && cleanedOutline && cleanedOutline.length > 2) {
      ctx.fillStyle = 'rgba(44,76,219,0.06)';
      ctx.strokeStyle = '#2c4cdb';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(cleanedOutline[0].x, cleanedOutline[0].y);
      cleanedOutline.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2c4cdb';
      cleanedOutline.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [dimensions, strokes, allPoints, cleanedProfile, cleanedOutline, mode, axisX]);

  useEffect(() => {
    draw();
  }, [draw]);

  const bandCount = cleanedProfile ? cleanedProfile.length - 1 : 0;
  const vertexCount = cleanedOutline ? cleanedOutline.length : 0;
  const hasResult = mode === 'profile' ? !!cleanedProfile : !!cleanedOutline;

  const handleContinue = () => {
    if (mode === 'profile' && cleanedProfile) {
      onComplete(cleanedProfile);
    } else if (mode === 'outline' && cleanedOutline) {
      onCompleteOutline(rawPointsToOutlineCm(cleanedOutline, OUTLINE_PX_PER_CM));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-terracotta-100 p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-terracotta-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-clay-900">Desenhar Meu Molde</h1>
            <p className="text-xs text-clay-900/50 mt-1 leading-relaxed">
              {mode === 'profile' ? (
                <>
                  Desenhe o <b>contorno lateral</b> da peça (metade do perfil, como se cortasse ela ao meio), encostando no eixo central à esquerda.
                  Pode desenhar em vários traços — tudo que você desenhar fica na tela até apertar "Limpar".
                  Funciona bem pra formas redondas: canecas, vasos, tigelas, porta-filtro de café.
                </>
              ) : (
                <>
                  Desenhe o <b>contorno visto de cima</b> da peça, o formato completo — feche a linha voltando perto de onde começou.
                  Pode desenhar em vários traços — tudo que você desenhar fica na tela até apertar "Limpar".
                  Funciona bem pra bandejas, pratos e formas livres/assimétricas.
                </>
              )}{' '}
              Depois de desenhar, aperte "Melhorar Molde" para endireitar as linhas automaticamente.
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div role="tablist" aria-label="Tipo de desenho" className="flex bg-clay-50 p-1 rounded-xl border border-terracotta-100/30 mb-5 w-fit">
          <button
            role="tab"
            aria-selected={mode === 'profile'}
            onClick={() => handleModeChange('profile')}
            className={`px-3.5 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
              mode === 'profile' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-clay-900/40 hover:text-clay-900/70'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            Perfil Lateral (redondo)
          </button>
          <button
            role="tab"
            aria-selected={mode === 'outline'}
            onClick={() => handleModeChange('outline')}
            className={`px-3.5 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition ${
              mode === 'outline' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-clay-900/40 hover:text-clay-900/70'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            Contorno de Cima (livre)
          </button>
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
            disabled={allPoints.length < 3}
            className="px-5 py-2.5 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm shadow-terracotta-500/10"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Melhorar Molde
          </button>
        </div>

        {hasResult && (
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-clay-900">
                  {mode === 'profile'
                    ? `Linhas endireitadas — ${bandCount} banda${bandCount !== 1 ? 's' : ''}`
                    : `Contorno endireitado — ${vertexCount} vértices`}
                </p>
                <p className="text-[11px] text-clay-900/50 mt-0.5">Não gostou do resultado? Ajuste a suavidade e aperte "Melhorar Molde" de novo, ou desenhe outra vez.</p>
              </div>
            </div>
            <button
              onClick={handleContinue}
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
