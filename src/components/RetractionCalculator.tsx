import React, { useState, useEffect } from 'react';
import ShrinkageCalculator from './ShrinkageCalculator';
import ClayRateCalibration from './ClayRateCalibration';
import PatternVisualPreview from './PatternVisualPreview';

interface RetractionCalculatorProps {
  globalShrinkage: number;
  setGlobalShrinkage: (val: number) => void;
  onPrintRequest?: (svgString: string, boundingBox: { width: number; height: number }) => void;
}

export default function RetractionCalculator({
  globalShrinkage,
  setGlobalShrinkage,
  onPrintRequest,
}: RetractionCalculatorProps) {
  const [finishedSize, setFinishedSize] = useState<number>(15.0);
  const [shrinkageRate, setShrinkageRate] = useState<number>(globalShrinkage);

  // Keep shrinkageRate in sync with parent globalShrinkage
  useEffect(() => {
    setShrinkageRate(globalShrinkage);
  }, [globalShrinkage]);

  // Precision calculation: M = D / (1 - (C / 100))
  const wetSize = finishedSize / (1 - shrinkageRate / 100);

  const handleApplyShrinkage = (rate: number) => {
    setShrinkageRate(rate);
    setGlobalShrinkage(rate);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
      {/* Left Column: The Calculators (Shrinkage & Calibration) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="space-y-6">
          <ShrinkageCalculator
            globalShrinkage={globalShrinkage}
            finishedSize={finishedSize}
            setFinishedSize={setFinishedSize}
            shrinkageRate={shrinkageRate}
            setShrinkageRate={handleApplyShrinkage}
          />

          <ClayRateCalibration 
            globalShrinkage={globalShrinkage}
            onApplyShrinkage={setGlobalShrinkage}
          />
        </div>
      </div>

      {/* Right Column: Real-time 2D SVG Pattern Preview */}
      <div className="lg:col-span-8">
        <PatternVisualPreview
          finishedSize={finishedSize}
          shrinkageRate={shrinkageRate}
          wetSize={wetSize}
          onPrintRequest={onPrintRequest}
        />
      </div>
    </div>
  );
}
