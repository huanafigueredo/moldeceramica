import React, { useState, useEffect } from 'react';
import { Flame, Percent, Save, Trash2, Sparkles, Scale, Info } from 'lucide-react';

interface ClayRecord {
  id: string;
  clayName: string;
  originalWetSize: number;
  finalFiredSize: number;
  shrinkageRate: number;
  date: string;
}

interface ClayRateCalibrationProps {
  globalShrinkage: number;
  onApplyShrinkage: (rate: number) => void;
}

export default function ClayRateCalibration({
  globalShrinkage,
  onApplyShrinkage,
}: ClayRateCalibrationProps) {
  const [clayName, setClayName] = useState<string>('');
  const [originalWetSize, setOriginalWetSize] = useState<number>(10.0);
  const [finalFiredSize, setFinalFiredSize] = useState<number>(8.8);
  const [savedRecords, setSavedRecords] = useState<ClayRecord[]>([]);

  const [wetInput, setWetInput] = useState(originalWetSize.toString());
  const [firedInput, setFiredInput] = useState(finalFiredSize.toString());

  // Calculate: Taxa Real = (1 - (Medida Queimada / Medida Crua)) * 100
  const calculatedRate = originalWetSize > 0 
    ? Math.max(0, (1 - (finalFiredSize / originalWetSize)) * 100)
    : 0;

  // Sync inputs if props change (though they are internal state here, good practice)
  useEffect(() => {
    if (parseFloat(wetInput) !== originalWetSize) setWetInput(originalWetSize.toString());
  }, [originalWetSize]);

  useEffect(() => {
    if (parseFloat(firedInput) !== finalFiredSize) setFiredInput(finalFiredSize.toString());
  }, [finalFiredSize]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ceramold_clay_calibrations');
    if (saved) {
      try {
        setSavedRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing clay calibrations', e);
      }
    }
  }, []);

  const handleSaveRecord = () => {
    if (!clayName.trim()) return;
    const newRecord: ClayRecord = {
      id: crypto.randomUUID(),
      clayName: clayName.trim(),
      originalWetSize,
      finalFiredSize,
      shrinkageRate: parseFloat(calculatedRate.toFixed(2)),
      date: new Date().toLocaleDateString('pt-BR'),
    };
    const updated = [newRecord, ...savedRecords];
    setSavedRecords(updated);
    localStorage.setItem('ceramold_clay_calibrations', JSON.stringify(updated));
    setClayName('');
  };

  const handleDeleteRecord = (id: string) => {
    const updated = savedRecords.filter((r) => r.id !== id);
    setSavedRecords(updated);
    localStorage.setItem('ceramold_clay_calibrations', JSON.stringify(updated));
  };

  return (
    <div className="bg-white rounded-3xl border border-terracotta-100 p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* Title Section */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-terracotta-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-clay-900">Calibração</h3>
            <p className="text-[10px] text-clay-900/40 uppercase font-bold tracking-wider">Corpo de Prova</p>
          </div>
        </div>

        {/* Inputs section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div>
            <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Medida Crua (Wet)</label>
            <div className="relative">
              <input
                type="number"
                value={wetInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setWetInput(val);
                  const num = parseFloat(val);
                  if (!isNaN(num)) setOriginalWetSize(num);
                }}
                onBlur={() => {
                  if (wetInput === "" || isNaN(parseFloat(wetInput))) setWetInput(originalWetSize.toString());
                }}
                className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 font-mono text-sm focus:outline-none transition-colors"
                step="0.1"
              />
              <div className="absolute right-4 top-3.5 text-clay-900/30 text-xs font-bold">CM</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-clay-900 uppercase tracking-wider opacity-60 mb-2">Medida Queimada (Fired)</label>
            <div className="relative">
              <input
                type="number"
                value={firedInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setFiredInput(val);
                  const num = parseFloat(val);
                  if (!isNaN(num)) setFinalFiredSize(num);
                }}
                onBlur={() => {
                  if (firedInput === "" || isNaN(parseFloat(firedInput))) setFiredInput(finalFiredSize.toString());
                }}
                className="w-full bg-clay-50 border border-terracotta-100 focus:border-terracotta-500 rounded-2xl px-4 py-3 text-clay-900 font-mono text-sm focus:outline-none transition-colors"
                step="0.1"
              />
              <div className="absolute right-4 top-3.5 text-clay-900/30 text-xs font-bold">CM</div>
            </div>
          </div>
        </div>

        {/* Formula result */}
        <div className="bg-clay-50 rounded-2xl p-6 border border-clay-100 mb-8 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-clay-900/40">Taxa Calculada</span>
            <div className="text-3xl font-mono font-black text-terracotta-500 mt-1">
              {calculatedRate.toFixed(2)}%
            </div>
          </div>
          <button
            onClick={() => onApplyShrinkage(parseFloat(calculatedRate.toFixed(1)))}
            disabled={calculatedRate <= 0}
            className="p-3 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
          >
            <Percent className="w-5 h-5" />
          </button>
        </div>

        {/* Save Calibration form */}
        <div className="space-y-3 p-4 bg-terracotta-50 rounded-2xl border border-terracotta-100/30">
          <input
            type="text"
            placeholder="Nome da Argila..."
            value={clayName}
            onChange={(e) => setClayName(e.target.value)}
            className="w-full bg-white border border-terracotta-100 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-terracotta-500 text-clay-900"
          />
          <button
            onClick={handleSaveRecord}
            disabled={!clayName.trim()}
            className="w-full py-2 bg-white text-terracotta-500 border border-terracotta-100 hover:bg-terracotta-50 disabled:opacity-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Registro
          </button>
        </div>
      </div>

      {/* History Log */}
      <div className="mt-8 pt-8 border-t border-clay-100">
        <div className="text-[10px] font-bold text-clay-900 uppercase tracking-widest mb-4 flex items-center justify-between">
          <span>Histórico</span>
          <span className="text-terracotta-500">{savedRecords.length}</span>
        </div>

        <div className="max-h-[120px] overflow-y-auto space-y-2 pr-1">
          {savedRecords.map((record) => (
            <div key={record.id} className="flex items-center justify-between p-3 bg-clay-50 rounded-xl border border-clay-100 text-[10px]">
              <div className="truncate font-bold text-clay-900 mr-2">{record.clayName}</div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono font-bold text-terracotta-500">{record.shrinkageRate.toFixed(1)}%</span>
                <button onClick={() => handleDeleteRecord(record.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
