import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShapeType, CylinderParams, ConeParams, TrayParams, NapkinHolderParams, BoxParams, OrganicPlateParams, BowlParams, VaseParams, SketchParams } from '../types';
import RetractionCalculator from './RetractionCalculator';
import ParametricMolds from './ParametricMolds';
import MoldVisualizer from './MoldVisualizer';
import PrintTiledLayout from './PrintTiledLayout';
import AITemplateFinder from './AITemplateFinder';
import SketchMoldPage from './SketchMoldPage';
import AppHeader from './AppHeader';
import { Flame, Layers, Calculator, Info, Compass, ArrowRight } from 'lucide-react';

const PATH_TO_TAB: Record<string, 'overview' | 'generator' | 'search' | 'calculator' | 'sketch'> = {
  '/': 'overview',
  '/moldes': 'generator',
  '/biblioteca': 'search',
  '/calculadoras': 'calculator',
  '/desenhar': 'sketch',
};
const TAB_TO_PATH: Record<string, string> = {
  overview: '/',
  generator: '/moldes',
  search: '/biblioteca',
  calculator: '/calculadoras',
  sketch: '/desenhar',
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = PATH_TO_TAB[location.pathname] || 'overview';
  const goToTab = (tab: keyof typeof TAB_TO_PATH) => navigate(TAB_TO_PATH[tab]);

  // Tabs are kept mounted (hidden via CSS) once visited instead of being torn
  // down, so switching away and back doesn't wipe out in-progress work (photo
  // alignment, search results, calculator inputs) or churn 3D canvas contexts.
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ overview: true });
  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  // Shared clay shrinkage state (C%)
  const [globalShrinkage, setGlobalShrinkage] = useState<number>(12.0);

  // Active shape selection
  const [shapeType, setShapeType] = useState<ShapeType>('cylinder');

  // Parametric shapes parameters states
  const [cylinderParams, setCylinderParams] = useState<CylinderParams>({
    desiredHeight: 15,
    desiredDiameter: 8,
    shrinkage: 12.0,
    seamAllowance: 1.5,
    hasHoles: true,
    holeDiameter: 0.8,
    holeSpacing: 2.5,
    holeShape: 'circle',
    edgeFinish: 'straight',
    wallThickness: 0.6,
  });

  const [coneParams, setConeParams] = useState<ConeParams>({
    topDiameter: 12,
    bottomDiameter: 7,
    height: 16,
    shrinkage: 12.0,
    seamAllowance: 1.5,
    wallThickness: 0.6,
  });

  const [trayParams, setTrayParams] = useState<TrayParams>({
    length: 22,
    width: 14,
    lipHeight: 3.5,
    lipAngle: 45,
    shrinkage: 12.0,
  });

  const [napkinHolderParams, setNapkinHolderParams] = useState<NapkinHolderParams>({
    width: 12,
    height: 8,
    depth: 5,
    shrinkage: 12.0,
    thickness: 0.8,
    edgeFinish: 'straight',
  });

  const [boxParams, setBoxParams] = useState<BoxParams>({
    width: 14,
    height: 10,
    depth: 8,
    shrinkage: 12.0,
    thickness: 0.8,
    seamAllowance: 1.0,
    hasLid: false,
  });

  const [organicPlateParams, setOrganicPlateParams] = useState<OrganicPlateParams>({
    baseRadius: 11,
    irregularity: 40,
    seed: Math.floor(Math.random() * 1e9),
    hasLip: true,
    lipHeight: 3,
    lipAngle: 40,
    shrinkage: 12.0,
  });

  const [bowlParams, setBowlParams] = useState<BowlParams>({
    topDiameter: 18,
    bottomDiameter: 8,
    height: 9,
    curvature: 60,
    shrinkage: 12.0,
    seamAllowance: 1.0,
    wallThickness: 0.6,
  });

  const [vaseParams, setVaseParams] = useState<VaseParams>({
    baseDiameter: 9,
    shoulderDiameter: 16,
    neckDiameter: 6,
    height: 22,
    shoulderPosition: 60,
    curvature: 60,
    shrinkage: 12.0,
    seamAllowance: 1.0,
    wallThickness: 0.6,
  });

  const [sketchParams, setSketchParams] = useState<SketchParams>({
    profilePoints: [],
    height: 12,
    maxDiameter: 10,
    shrinkage: 12.0,
    seamAllowance: 1.0,
    wallThickness: 0.6,
  });

  // Printing mosaic modal states
  const [printRequest, setPrintRequest] = useState<{
    svgString: string;
    boundingBox: { width: number; height: number };
  } | null>(null);

  // Synchronize global shrinkage with all active shape params
  const handleSetGlobalShrinkage = (newShrinkage: number) => {
    setGlobalShrinkage(newShrinkage);
    setCylinderParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setConeParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setTrayParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setNapkinHolderParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setBoxParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setOrganicPlateParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setBowlParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setVaseParams((p) => ({ ...p, shrinkage: newShrinkage }));
    setSketchParams((p) => ({ ...p, shrinkage: newShrinkage }));
  };

  const getActiveParams = () => {
    switch (shapeType) {
      case 'cylinder':
        return cylinderParams;
      case 'cone':
        return coneParams;
      case 'tray':
        return trayParams;
      case 'napkin_holder':
        return napkinHolderParams;
      case 'box':
        return boxParams;
      case 'organic_plate':
        return organicPlateParams;
      case 'bowl':
        return bowlParams;
      case 'vase':
        return vaseParams;
      case 'sketch':
        return sketchParams;
    }
  };

  const handleUpdateParams = (newParams: any) => {
    // If the shrinkage is changed within the parameters panel, sync back to global state
    if (newParams.shrinkage !== globalShrinkage) {
      handleSetGlobalShrinkage(newParams.shrinkage);
    }

    switch (shapeType) {
      case 'cylinder':
        setCylinderParams(newParams);
        break;
      case 'cone':
        setConeParams(newParams);
        break;
      case 'tray':
        setTrayParams(newParams);
        break;
      case 'napkin_holder':
        setNapkinHolderParams(newParams);
        break;
      case 'box':
        setBoxParams(newParams);
        break;
      case 'organic_plate':
        setOrganicPlateParams(newParams);
        break;
      case 'bowl':
        setBowlParams(newParams);
        break;
      case 'vase':
        setVaseParams(newParams);
        break;
      case 'sketch':
        setSketchParams(newParams);
        break;
    }
  };

  // Called when a hand-drawn profile from /desenhar is ready for configuration
  const handleSketchComplete = (profilePoints: { t: number; r: number }[]) => {
    setShapeType('sketch');
    setSketchParams((p) => ({ ...p, profilePoints, shrinkage: globalShrinkage }));
    goToTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Called when a hand-drawn top-down outline (asymmetric shapes) from
  // /desenhar is ready — feeds straight into Prato Orgânico's existing
  // customPoints pipeline, which already handles arbitrary closed outlines.
  const handleSketchOutlineComplete = (outlinePoints: { x: number; y: number }[]) => {
    setShapeType('organic_plate');
    setOrganicPlateParams((p) => ({
      ...p,
      customPoints: outlinePoints,
      hasLip: true,
      shrinkage: globalShrinkage,
    }));
    goToTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Called when an AI searched template is selected
  const handleSelectModel = (selectedShape: ShapeType, selectedParams: any) => {
    // Normalize shape type to avoid casing or spacing issues
    const normalized = String(selectedShape || 'cylinder').toLowerCase() as ShapeType;
    setShapeType(normalized);
    if (normalized === 'cylinder') {
      setCylinderParams(selectedParams);
    } else if (normalized === 'cone') {
      setConeParams(selectedParams);
    } else if (normalized === 'tray') {
      setTrayParams(selectedParams);
    } else if (normalized === 'napkin_holder') {
      setNapkinHolderParams(selectedParams);
    } else if (normalized === 'box') {
      setBoxParams(selectedParams);
    } else if (normalized === 'organic_plate') {
      setOrganicPlateParams(selectedParams);
    } else if (normalized === 'bowl') {
      setBowlParams(selectedParams);
    } else if (normalized === 'vase') {
      setVaseParams(selectedParams);
    }
    // Switch to mold generator view and scroll smoothly to the workspace
    goToTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-clay-50 text-clay-900 selection:bg-terracotta-100 flex flex-col justify-between print-parent-clean">
      
      <AppHeader globalShrinkage={globalShrinkage} />

      {/* CORE WORKSPACE CONTENT */}
      <main className="no-print flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
        {/* TAB WORKSPACES */}
        <div className="transition-all duration-300">
                 {/* TAB 0: OVERVIEW BENTO GRID */}
          {visitedTabs.overview && (
            <div className={activeTab === 'overview' ? 'space-y-8 animate-fadeIn' : 'hidden'}>
              
              {/* TOP HERO SUMMARY SECTION */}
              <div className="bg-white rounded-3xl border border-terracotta-100 p-6 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                
                <div className="space-y-4 max-w-xl relative">
                  <h1 className="text-3xl md:text-4xl font-serif font-extrabold text-clay-900 tracking-tight leading-tight">
                    Engenharia de precisão para <span className="text-terracotta-500">artesãos cerâmicos</span>.
                  </h1>
                  <p className="text-sm text-clay-900/50 leading-relaxed font-sans">
                    Crie moldes planificados perfeitamente calibrados para a retração da sua argila. De peças cilíndricas a formas complexas, tudo em um só lugar.
                  </p>
                </div>

                {/* Shrinkage Quick-Tweak Panel */}
                <div className="bg-clay-50 border border-terracotta-100/50 rounded-2xl p-6 shadow-sm min-w-[300px] w-full lg:w-auto relative overflow-hidden shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-clay-900/40">Retração Global (C%)</span>
                    <Flame className="w-4 h-4 text-terracotta-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-5xl font-mono font-black text-terracotta-500 tracking-tighter">
                      {globalShrinkage.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="25.0"
                    step="0.5"
                    value={globalShrinkage}
                    onChange={(e) => handleSetGlobalShrinkage(parseFloat(e.target.value))}
                    className="w-full accent-terracotta-500 h-1.5 bg-terracotta-100 rounded-lg cursor-pointer mb-2"
                  />
                  <div className="flex justify-between text-[9px] text-clay-900/30 font-mono">
                    <span>1%</span>
                    <span>Padrão 12%</span>
                    <span>25%</span>
                  </div>
                </div>
              </div>

              {/* GRID SECTIONS - BENTO STYLE */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* CARD 1: PARAMETRIC MOLDS */}
                <button 
                  onClick={() => goToTab('generator')}
                  className="lg:col-span-2 group bg-white border border-terracotta-100 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-terracotta-300 transition-all text-left flex flex-col justify-between h-64"
                >
                  <div>
                    <div className="p-3 bg-terracotta-50 rounded-xl text-terracotta-500 w-fit mb-6">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-clay-900 mb-2">Gerador de Moldes</h3>
                    <p className="text-xs text-clay-900/50 leading-relaxed max-w-xs">
                      Gere gabaritos 2D técnicos para formas cilíndricas, cônicas e prismáticas com compensação de queima.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-terracotta-500">
                    Acessar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* CARD 3: TEMPLATE FINDER */}
                <button 
                  onClick={() => goToTab('search')}
                  className="group bg-white border border-terracotta-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-terracotta-300 transition-all text-left flex flex-col justify-between h-64"
                >
                  <div>
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500 w-fit mb-6">
                      <Compass className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-clay-900 mb-2">Biblioteca AI</h3>
                    <p className="text-[11px] text-clay-900/50 leading-relaxed">
                      Padrões e medidas de referência para peças clássicas.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* CARD 4: CALCULATOR */}
                <button 
                  onClick={() => goToTab('calculator')}
                  className="group bg-white border border-terracotta-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-terracotta-300 transition-all text-left flex flex-col justify-between h-64"
                >
                  <div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 w-fit mb-6">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-clay-900 mb-2">Calculadoras</h3>
                    <p className="text-[11px] text-clay-900/50 leading-relaxed">
                      Calibre a retração da sua argila e gere moldes de placas e discos.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* CARD 5: ADVICE */}
                <div className="lg:col-span-2 bg-[#fafaf9] border border-stone-100 rounded-2xl p-6 shadow-sm flex items-start gap-4">
                  <div className="p-2 bg-stone-100 rounded-lg text-stone-500 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-clay-900 mb-1">Dica Cerâmica</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Lembre-se de calibrar seu forno com corpos de prova em posições diferentes, pois variações de calor alteram a retração final.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-2 group bg-terracotta-500 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-auto min-h-[120px] text-white">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Status do Motor</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold font-mono">Geometria OK</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PARAMETRIC MOLDS AND VISUAL PREVIEW */}
          {visitedTabs.generator && (
            <div className={activeTab === 'generator' ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start' : 'hidden'}>
              {/* Parameter Editor inputs - 5 cols. Shown first (order-1) on narrow
                  screens, where the grid stacks to a single column, so the shape
                  picker and controls come before the print/export buttons that
                  live at the bottom of the preview panel — configure, then see
                  the result, then export, in that order. Back to the left on
                  desktop (lg:order-1), where both panels are visible side by side
                  anyway so the ordering only matters for the stacked mobile view. */}
              <div className="order-1 lg:order-1 lg:col-span-5 h-full">
                <ParametricMolds
                  shapeType={shapeType}
                  setShapeType={setShapeType}
                  globalShrinkage={globalShrinkage}
                  params={getActiveParams()}
                  onChangeParams={handleUpdateParams}
                />
              </div>

              {/* Scaled preview rendering canvas - 7 cols. */}
              <div className="order-2 lg:order-2 lg:col-span-7 h-full">
                <MoldVisualizer
                  shapeType={shapeType}
                  params={getActiveParams()}
                  onChangeParams={handleUpdateParams}
                  onPrintRequest={(svg, bbox) => setPrintRequest({ svgString: svg, boundingBox: bbox })}
                />
              </div>
            </div>
          )}

          {/* TAB 3: AI TEMPLATE FINDER */}
          {visitedTabs.search && (
            <div className={activeTab === 'search' ? '' : 'hidden'}>
              <AITemplateFinder
                onSelectModel={handleSelectModel}
                globalShrinkage={globalShrinkage}
              />
            </div>
          )}

          {/* TAB 5: SKETCH-TO-MOLD */}
          {visitedTabs.sketch && (
            <div className={activeTab === 'sketch' ? '' : 'hidden'}>
              <SketchMoldPage onComplete={handleSketchComplete} onCompleteOutline={handleSketchOutlineComplete} />
            </div>
          )}

          {/* TAB 4: RETRACTION ASSISTANT */}
          {visitedTabs.calculator && (
            <div className={activeTab === 'calculator' ? '' : 'hidden'}>
              <RetractionCalculator
                globalShrinkage={globalShrinkage}
                setGlobalShrinkage={handleSetGlobalShrinkage}
                onPrintRequest={(svg, bbox) => setPrintRequest({ svgString: svg, boundingBox: bbox })}
              />
            </div>
          )}

        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="no-print border-t border-terracotta-100/50 py-6 bg-white/40 text-center text-xs text-clay-900/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CeraMold Engine. Projetado artesanalmente para ceramistas de alto nível.</p>
          <div className="flex gap-4 font-serif italic text-clay-900/70">
            <span>"O barro tem memória, mas o CeraMold calcula."</span>
          </div>
        </div>
      </footer>

      {/* PRINT MOSAIC MODAL DIALOG */}
      {printRequest && (
        <PrintTiledLayout
          svgMarkup={printRequest.svgString}
          boundingBox={printRequest.boundingBox}
          onClose={() => setPrintRequest(null)}
        />
      )}

    </div>
  );
}
