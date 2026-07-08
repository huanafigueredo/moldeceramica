import React, { useState } from 'react';
import { Ruler, Percent, HelpCircle, Sliders, Info, Sparkles } from 'lucide-react';

interface ShrinkageCalculatorProps {
  globalShrinkage?: number;
  onApplyShrinkage?: (rate: number) => void;
  finishedSize?: number;
  setFinishedSize?: (size: number) => void;
  shrinkageRate?: number;
  setShrinkageRate?: (rate: number) => void;
}

export default function ShrinkageCalculator({
  globalShrinkage = 12.0,
  onApplyShrinkage,
  finishedSize: propFinishedSize,
  setFinishedSize: propSetFinishedSize,
  shrinkageRate: propShrinkageRate,
  setShrinkageRate: propSetShrinkageRate,
}: ShrinkageCalculatorProps) {
  const [localFinishedSize, setLocalFinishedSize] = useState<number>(15.0);
  const [localShrinkageRate, setLocalShrinkageRate] = useState<number>(globalShrinkage);

  const finishedSize = propFinishedSize !== undefined ? propFinishedSize : localFinishedSize;
  const setFinishedSize = propSetFinishedSize !== undefined ? propSetFinishedSize : setLocalFinishedSize;

  const shrinkageRate = propShrinkageRate !== undefined ? propShrinkageRate : localShrinkageRate;
  const setShrinkageRate = propSetShrinkageRate !== undefined ? propSetShrinkageRate : setLocalShrinkageRate;

  const [finishedSizeInput, setFinishedSizeInput] = useState(finishedSize.toString());

  // Update input text when finishedSize changes externally
  React.useEffect(() => {
    if (parseFloat(finishedSizeInput) !== finishedSize) {
      setFinishedSizeInput(finishedSize.toString());
    }
  }, [finishedSize]);

  // Precision calculation: M = D / (1 - (C / 100))
  const wetSize = finishedSize / (1 - shrinkageRate / 100);

  // Naive calculation for educational comparison: M_naive = D * (1 + C / 100)
  const naiveSize = finishedSize * (1 + shrinkageRate / 100);
  const errorMargin = wetSize - naiveSize;

  return (
    <div className="bg-white rounded-3xl border border-terracotta-100 p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* Title Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-terracotta-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-clay-900">Calculadora</h3>
            <p className="text-[10px] text-clay-900/40 uppercase font-bold tracking-wider">Expansão Inversa</p>
          </div>
        </div>

        {/* Inputs Section */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60">Tamanho Final Desejado</label>
              <span className="text-xs font-mono font-bold text-terracotta-600">{finishedSize.toFixed(1)} cm</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={finishedSizeInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setFinishedSizeInput(val);
                  const num = parseFloat(val);
                  if (!isNaN(num)) {
                    setFinishedSize(num);
                  }
                }}
                onBlur={() => {
                  if (finishedSizeInput === "" || isNaN(parseFloat(finishedSizeInput))) {
                    setFinishedSizeInput(finishedSize.toString());
                  }
                }}
                className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 font-mono text-sm focus:outline-none transition-colors"
                step="0.5"
              />
              <div className="absolute right-4 top-3.5 text-clay-900/30 text-xs font-bold">CM</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60">Taxa de Retração (%)</label>
              <span className="text-xs font-mono font-bold text-terracotta-600">{shrinkageRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="25.0"
              step="0.5"
              value={shrinkageRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setShrinkageRate(val);
                if (onApplyShrinkage) onApplyShrinkage(val);
              }}
              className="w-full accent-terracotta-500 h-2 bg-terracotta-100 rounded-lg cursor-pointer mb-4"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-clay-100">
        <div className="bg-terracotta-500 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden group">
          <div className="relative">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Medida do Molde (Úmido)</span>
            <div className="text-4xl font-mono font-black mt-1 flex items-baseline gap-1">
              {wetSize.toFixed(2)}
              <span className="text-lg opacity-60">cm</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-clay-50 rounded-xl border border-clay-100 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-clay-900/40">FÓRMULA TÉCNICA</span>
          <span className="text-[10px] font-mono font-bold text-terracotta-500">M = D / (1 - C/100)</span>
        </div>
      </div>
    </div>
  );
}
