import React from 'react';
import { Scissors, CornerDownRight, Grid, Printer, X } from 'lucide-react';

interface PrintTiledLayoutProps {
  svgMarkup: string;
  boundingBox: { width: number; height: number }; // In centimeters
  onClose: () => void;
}

export default function PrintTiledLayout({
  svgMarkup,
  boundingBox,
  onClose,
}: PrintTiledLayoutProps) {
  // A4 Page limits in cm
  const a4Width = 21.0;
  const a4Height = 29.7;
  const margin = 1.0; // cm margins around page

  const usableWidth = a4Width - 2 * margin; // 19.0cm
  const usableHeight = a4Height - 2 * margin; // 27.7cm

  // Calculate grid requirements
  const cols = Math.max(1, Math.ceil(boundingBox.width / usableWidth));
  const rows = Math.max(1, Math.ceil(boundingBox.height / usableHeight));
  const totalPages = cols * rows;

  // Render registration crosshair marks
  const renderCrosshair = (style: string) => (
    <svg className={`absolute w-6 h-6 text-gray-400 ${style}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="12" cy="12" r="6" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );

  // Render a 1cm calibration square so the user can verify with a ruler that
  // the printer didn't rescale the page (e.g. "fit to page" silently shrinking it).
  const renderCalibrationSquare = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="border-2 border-black bg-white" style={{ width: '1cm', height: '1cm' }} />
      <span className="text-[6.5px] font-mono text-gray-500 leading-tight max-w-[62px] uppercase tracking-tight">
        Meça: deve medir exatamente 1cm
      </span>
    </div>
  );

  const handlePrintTrigger = () => {
    window.print();
  };

  // Convert raw SVG string to have absolute width/height in cm for 1:1 printing
  const cleanSVGFor1to1 = (rawSvg: string) => {
    // We want the SVG inside the printed pages to have a fixed physical size corresponding to the bounding box
    let cleaned = rawSvg;
    
    // Remove fixed width/height attributes if they exist
    cleaned = cleaned.replace(/width="[^"]*"/, `width="${boundingBox.width}cm"`);
    cleaned = cleaned.replace(/height="[^"]*"/, `height="${boundingBox.height}cm"`);

    // Ensure it doesn't have class attributes that shrink it
    return cleaned;
  };

  const processedSvg = cleanSVGFor1to1(svgMarkup);

  return (
    <div className="fixed inset-0 bg-clay-900/90 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-8 flex flex-col items-center print-parent-clean">
      
      {/* Control panel floating */}
      <div className="no-print w-full max-w-4xl bg-white rounded-2xl border border-terracotta-100 p-6 shadow-xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-terracotta-100 text-terracotta-500 rounded-lg">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-clay-900">Configuração de Mosaico A4 (1:1)</h2>
              <p className="text-xs text-clay-900/60 font-sans">
                O molde foi dividido em folhas A4 para impressão em tamanho real. Recorte e cole as margens indicadas.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-3 text-xs font-mono text-clay-900/60">
            <span>Dimensões do Molde: <b className="text-terracotta-500">{boundingBox.width.toFixed(1)} x {boundingBox.height.toFixed(1)} cm</b></span>
            <span>•</span>
            <span>Mosaico: <b className="text-terracotta-500">{cols} colunas x {rows} linhas ({totalPages} folhas A4)</b></span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-clay-900 rounded-xl text-xs font-sans font-semibold transition"
          >
            Voltar
          </button>
          <button
            onClick={handlePrintTrigger}
            className="px-5 py-2.5 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-xl text-xs font-sans font-bold shadow-md shadow-terracotta-500/10 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir Agora
          </button>
        </div>
      </div>

      {/* Guia de Montagem Visual */}
      <div className="no-print w-full max-w-4xl bg-white border border-stone-200 rounded-2xl p-6 mb-8 shadow-sm">
        <h3 className="font-serif text-base font-bold text-clay-900 mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-terracotta-500 animate-pulse" />
          Guia de Montagem para Impressão em Mosaico (Tiling) A4
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100/80 hover:bg-stone-50 transition">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta-100 text-terracotta-700 text-xs font-bold mb-2">1</span>
            <h4 className="text-xs font-bold text-clay-900 mb-1">Salvar PDF / Imprimir</h4>
            <p className="text-[11px] text-clay-900/60 font-sans leading-relaxed">
              Clique no botão <b>Imprimir Agora</b> acima. No painel de impressão, escolha a sua impressora ou mude o destino para <b>Salvar como PDF</b>.
              <span className="block mt-1.5 text-terracotta-600 font-semibold text-[10px]">⚠️ DEFINA A ESCALA EM 100% (SEM AJUSTES).</span>
              <span className="block mt-1.5 text-clay-900/60 font-semibold text-[10px]">📏 Depois de imprimir, meça o quadrado de calibração no topo da folha com uma régua — ele deve ter exatamente 1cm de lado.</span>
            </p>
          </div>

          <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100/80 hover:bg-stone-50 transition">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta-100 text-terracotta-700 text-xs font-bold mb-2">2</span>
            <h4 className="text-xs font-bold text-clay-900 mb-1">Recortar as Abas</h4>
            <p className="text-[11px] text-clay-900/60 font-sans leading-relaxed">
              As folhas subsequentes possuem abas de sobreposição vermelhas de 1,0 cm. Use uma régua de metal e estilete ou tesoura para 
              cortar exatamente sobre a linha pontilhada ✂️.
            </p>
          </div>

          <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100/80 hover:bg-stone-50 transition">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta-100 text-terracotta-700 text-xs font-bold mb-2">3</span>
            <h4 className="text-xs font-bold text-clay-900 mb-1">Alinhar Registro</h4>
            <p className="text-[11px] text-clay-900/60 font-sans leading-relaxed">
              Sobreponha a folha cortada sobre a aba de colagem da folha vizinha anterior, fazendo coincidir perfeitamente os símbolos de mira de registro (+) nos cantos.
            </p>
          </div>

          <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100/80 hover:bg-stone-50 transition">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-terracotta-100 text-terracotta-700 text-xs font-bold mb-2">4</span>
            <h4 className="text-xs font-bold text-clay-900 mb-1">Montar e Modelar</h4>
            <p className="text-[11px] text-clay-900/60 font-sans leading-relaxed">
              Fixe as junções com fita adesiva transparente de boa aderência. Com o mosaico firme e montado, recorte o contorno do molde pronto para uso no barro!
            </p>
          </div>
        </div>
      </div>

      {/* PRINT MOSAIC PAGE PREVIEW */}
      <div className="no-print w-full max-w-4xl flex flex-col items-center gap-10 pb-20">
        
        {/* Iterate over rows & columns */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="flex flex-col md:flex-row gap-6 justify-center items-center">
            {Array.from({ length: cols }).map((_, c) => {
              const pageIndex = r * cols + c + 1;
              return (
                <div
                  key={`page-${r}-${c}`}
                  className="relative bg-white text-black shadow-xl border border-gray-300 rounded-sm flex flex-col justify-between"
                  style={{
                    width: `${a4Width}cm`,
                    height: `${a4Height}cm`,
                    padding: `${margin}cm`,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Outer Cutting Guides in Corners */}
                  {renderCrosshair('top-2 left-2')}
                  {renderCrosshair('top-2 right-2')}
                  {renderCrosshair('bottom-2 left-2')}
                  {renderCrosshair('bottom-2 right-2')}
 
                   {/* Top Header Label */}
                   <div className="flex justify-between items-center gap-2 text-[9px] font-mono border-b border-gray-200 pb-1 text-gray-500 select-none">
                     <span>CeraMold • Molde de Precisão 1:1</span>
                     {renderCalibrationSquare()}
                     <span>PÁGINA {pageIndex} de {totalPages} (C:{c+1}, L:{r+1})</span>
                   </div>
 
                   {/* Usable content viewport with SVG offset */}
                   <div
                     className="relative overflow-hidden border border-dashed border-gray-300"
                     style={{
                       width: `${usableWidth}cm`,
                       height: `${usableHeight}cm`,
                       background: '#fcfcfc',
                     }}
                   >
                     {/* SVG Container shifted based on row/column offsets */}
                     <div
                       className="absolute"
                       style={{
                         transform: `translate(-${c * usableWidth}cm, -${r * usableHeight}cm)`,
                         width: `${boundingBox.width}cm`,
                         height: `${boundingBox.height}cm`,
                       }}
                       dangerouslySetInnerHTML={{ __html: processedSvg }}
                     />
 
                     {/* Overlay Grid lines for cutting / margin overlap indications */}
                     {c > 0 && (
                       <div className="absolute left-0 top-0 bottom-0 w-[1cm] border-l-2 border-dashed border-red-400 bg-red-400/5 flex flex-col items-center justify-center p-1 pointer-events-none">
                         <Scissors className="w-4.5 h-4.5 text-red-500 rotate-90 mb-1" />
                         <span className="text-[7px] text-red-500 font-bold font-mono uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Cortar Margem</span>
                       </div>
                     )}
                     {r > 0 && (
                       <div className="absolute top-0 left-0 right-0 h-[1cm] border-b-2 border-dashed border-red-400 bg-red-400/5 flex items-center justify-center gap-1.5 p-1 pointer-events-none">
                         <Scissors className="w-4 h-4 text-red-500" />
                         <span className="text-[7px] text-red-500 font-bold font-mono uppercase tracking-wider">Cortar Aba Superior</span>
                       </div>
                     )}
                   </div>
 
                   {/* Footer Labels */}
                   <div className="flex justify-between items-center text-[8px] font-mono border-t border-gray-200 pt-1 text-gray-400 select-none">
                     <span className="flex items-center gap-1">
                       <Scissors className="w-2.5 h-2.5 text-gray-400" />
                       Margem de sobreposição: 1.0cm
                     </span>
                     <span>Alinhe as marcas com fita adesiva</span>
                   </div>
                 </div>
               );
             })}
           </div>
         ))}
       </div>

      {/* RENDER DUAL PAGES STYLING TO THE PRINTER ONLY */}
      {/* This renders inside a hidden div that only becomes visible during @media print */}
      <div className="hidden print-container">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const pageIndex = r * cols + c + 1;
            return (
              <div
                key={`print-page-${r}-${c}`}
                className="print-page flex flex-col justify-between"
                style={{
                  width: `${a4Width}cm`,
                  height: `${a4Height}cm`,
                  padding: `${margin}cm`,
                  boxSizing: 'border-box',
                }}
              >
                {/* Crosshairs */}
                {renderCrosshair('top-2 left-2')}
                {renderCrosshair('top-2 right-2')}
                {renderCrosshair('bottom-2 left-2')}
                {renderCrosshair('bottom-2 right-2')}

                {/* Top Label */}
                <div className="flex justify-between items-center gap-2 text-[9px] font-mono border-b border-gray-300 pb-1 text-gray-500">
                  <span>CeraMold • Molde de Precisão 1:1</span>
                  {renderCalibrationSquare()}
                  <span>FOLHA {pageIndex} de {totalPages} (C:{c+1}, L:{r+1})</span>
                </div>

                {/* Usable Port */}
                <div
                  className="relative overflow-hidden border border-dashed border-gray-200"
                  style={{
                    width: `${usableWidth}cm`,
                    height: `${usableHeight}cm`,
                  }}
                >
                  <div
                    className="absolute"
                    style={{
                      transform: `translate(-${c * usableWidth}cm, -${r * usableHeight}cm)`,
                      width: `${boundingBox.width}cm`,
                      height: `${boundingBox.height}cm`,
                    }}
                    dangerouslySetInnerHTML={{ __html: processedSvg }}
                  />
                  {c > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-[1cm] border-l-2 border-dashed border-red-500 bg-red-500/5 flex flex-col items-center justify-center p-1">
                      <Scissors className="w-3 h-3 text-red-500 rotate-90 mb-1" />
                      <span className="text-[6px] text-red-600 font-mono uppercase tracking-widest" style={{ writingMode: 'vertical-rl' }}>Cortar e Colar</span>
                    </div>
                  )}
                  {r > 0 && (
                    <div className="absolute top-0 left-0 right-0 h-[1cm] border-b-2 border-dashed border-red-500 bg-red-500/5 flex items-center justify-center gap-1 p-1">
                      <Scissors className="w-3 h-3 text-red-500 mr-1" />
                      <span className="text-[6px] text-red-600 font-mono uppercase tracking-widest">Cortar e colar sobre folha superior</span>
                    </div>
                  )}
                </div>

                {/* Footer Label */}
                <div className="flex justify-between items-center text-[8px] font-mono border-t border-gray-200 pt-1 text-gray-400">
                  <span>Alinhe as marcas com fita adesiva. Escala Real 100% (Não marque 'Ajustar à página').</span>
                  <span>CeraMold</span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
