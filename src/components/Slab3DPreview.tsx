import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCw, Sparkles, Sliders, Flame, HelpCircle, Eye, RefreshCw } from 'lucide-react';

interface Slab3DPreviewProps {
  shape: 'circle' | 'square' | 'cylinder_band';
  finishedSize: number;
  shrinkageRate: number;
  wetSize: number;
  seamAllowance: number;
  cornerRadius: number;
  holeShape: 'none' | 'circle' | 'square' | 'triangle' | 'flower';
  holeSize: number;
  holeSpacing: number;
}

// Subcomponent that manages the Three.js scene elements
function SlabMesh({
  shape: shapeType,
  finishedSize,
  shrinkageRate,
  wetSize,
  seamAllowance,
  cornerRadius,
  holeShape,
  holeSize,
  holeSpacing,
  thickness,
  stateMode,
}: Slab3DPreviewProps & { thickness: number; stateMode: 'wet' | 'fired' }) {
  
  // 1. Compute physical sizes
  // We build the geometry at the WET size (the actual physical size of the raw clay slab)
  const size = wetSize;
  const circ = Math.PI * wetSize;
  const bandW = circ + seamAllowance;
  const bandH = wetSize;

  // 2. Generate the extruded geometry using THREE.Shape
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Draw the main outer boundary
    if (shapeType === 'circle') {
      shape.absarc(0, 0, size / 2, 0, Math.PI * 2, false);
    } else if (shapeType === 'square') {
      const half = size / 2;
      const r = Math.min(cornerRadius, half - 0.1);
      
      if (r > 0) {
        shape.moveTo(-half + r, -half);
        shape.lineTo(half - r, -half);
        shape.quadraticCurveTo(half, -half, half, -half + r);
        shape.lineTo(half, half - r);
        shape.quadraticCurveTo(half, half, half - r, half);
        shape.lineTo(-half + r, half);
        shape.quadraticCurveTo(-half, half, -half, half - r);
        shape.lineTo(-half, -half + r);
        shape.quadraticCurveTo(-half, -half, -half + r, -half);
      } else {
        shape.moveTo(-half, -half);
        shape.lineTo(half, -half);
        shape.lineTo(half, half);
        shape.lineTo(-half, half);
      }
      shape.closePath();
    } else if (shapeType === 'cylinder_band') {
      const halfW = bandW / 2;
      const halfH = bandH / 2;
      const r = Math.min(cornerRadius, Math.min(halfW, halfH) - 0.1);

      if (r > 0) {
        shape.moveTo(-halfW + r, -halfH);
        shape.lineTo(halfW - r, -halfH);
        shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
        shape.lineTo(halfW, halfH - r);
        shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
        shape.lineTo(-halfW + r, halfH);
        shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
        shape.lineTo(-halfW, -halfH + r);
        shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      } else {
        shape.moveTo(-halfW, -halfH);
        shape.lineTo(halfW, -halfH);
        shape.lineTo(halfW, halfH);
        shape.lineTo(-halfW, halfH);
      }
      shape.closePath();
    }

    // Draw punched holes
    if (holeShape !== 'none') {
      const spacing = holeSpacing;
      const rad = holeSize / 2;

      const addHole = (hx: number, hy: number) => {
        const holePath = new THREE.Path();
        if (holeShape === 'circle') {
          holePath.absarc(hx, hy, rad, 0, Math.PI * 2, true);
        } else if (holeShape === 'square') {
          holePath.moveTo(hx - rad, hy - rad);
          holePath.lineTo(hx - rad, hy + rad);
          holePath.lineTo(hx + rad, hy + rad);
          holePath.lineTo(hx + rad, hy - rad);
          holePath.closePath();
        } else if (holeShape === 'triangle') {
          const x1 = hx;
          const y1 = hy - rad;
          const x2 = hx - rad * 0.866;
          const y2 = hy + rad * 0.5;
          const x3 = hx + rad * 0.866;
          const y3 = hy + rad * 0.5;
          holePath.moveTo(x1, y1);
          holePath.lineTo(x2, y2);
          holePath.lineTo(x3, y3);
          holePath.closePath();
        } else if (holeShape === 'flower') {
          const numPetals = 5;
          for (let i = 0; i <= numPetals * 2; i++) {
            const theta = (i * Math.PI) / numPetals;
            const rVal = i % 2 === 0 ? rad : rad * 0.4;
            const px = hx + rVal * Math.cos(theta);
            const py = hy + rVal * Math.sin(theta);
            if (i === 0) {
              holePath.moveTo(px, py);
            } else {
              holePath.lineTo(px, py);
            }
          }
          holePath.closePath();
        }
        shape.holes.push(holePath);
      };

      if (shapeType === 'circle') {
        const limit = Math.ceil(size / spacing);
        const maxDist = size / 2 - rad - 0.2;
        for (let dx = -limit; dx <= limit; dx++) {
          for (let dy = -limit; dy <= limit; dy++) {
            const hx = dx * spacing;
            const hy = dy * spacing;
            const dist = Math.sqrt(hx * hx + hy * hy);
            if (dist <= maxDist) {
              addHole(hx, hy);
            }
          }
        }
      } else if (shapeType === 'square') {
        const limit = Math.ceil(size / spacing);
        const maxOffset = size / 2 - rad - 0.2;
        for (let dx = -limit; dx <= limit; dx++) {
          for (let dy = -limit; dy <= limit; dy++) {
            const hx = dx * spacing;
            const hy = dy * spacing;
            if (Math.abs(hx) <= maxOffset && Math.abs(hy) <= maxOffset) {
              addHole(hx, hy);
            }
          }
        }
      } else if (shapeType === 'cylinder_band') {
        const margin = 0.6;
        const cols = Math.floor((bandW - margin * 2) / spacing) + 1;
        const rows = Math.floor((bandH - margin * 2) / spacing) + 1;
        if (cols > 0 && rows > 0) {
          const xStart = -bandW / 2 + (bandW - (cols - 1) * spacing) / 2;
          const yStart = -bandH / 2 + (bandH - (rows - 1) * spacing) / 2;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const hx = xStart + c * spacing;
              const hy = yStart + r * spacing;
              addHole(hx, hy);
            }
          }
        }
      }
    }

    // Extrude settings for 3D slab thickness
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: Math.min(0.04, thickness * 0.15),
      bevelSize: Math.min(0.03, thickness * 0.1),
      bevelSegments: 3,
      curveSegments: 32,
      steps: 1
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [shapeType, size, bandW, bandH, cornerRadius, holeShape, holeSize, holeSpacing, thickness]);

  // 3. Setup terracotta warm clay textures and colors
  // Wet clay is softer, grey-brownish; Fired is rich warm terracotta
  const clayColor = stateMode === 'wet' ? '#bca398' : '#ca5934';
  const clayRoughness = stateMode === 'wet' ? 0.95 : 0.85;

  // 4. Animate Shrinkage transition
  // We can apply a scale factor to represent actual clay shrinkage
  const shrinkFactor = 1 - shrinkageRate / 100;
  const targetScale = stateMode === 'fired' ? shrinkFactor : 1.0;
  const [currentScale, setCurrentScale] = useState(targetScale);

  useEffect(() => {
    // Smoothed transition animation
    let active = true;
    const animate = () => {
      if (!active) return;
      setCurrentScale((prev) => {
        const diff = targetScale - prev;
        if (Math.abs(diff) < 0.005) {
          return targetScale;
        }
        return prev + diff * 0.15; // interpolation step
      });
      requestAnimationFrame(animate);
    };
    animate();
    return () => {
      active = false;
    };
  }, [targetScale]);

  return (
    <group 
      scale={[currentScale, currentScale, currentScale]} 
      position={[0, thickness / 2 * currentScale, 0]} 
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial 
          color={clayColor} 
          roughness={clayRoughness} 
          metalness={0.05} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Compact and lightweight 3D Canvas wrapper for inline placement
export function Slab3DCanvas({
  shape,
  finishedSize,
  shrinkageRate,
  wetSize,
  seamAllowance,
  cornerRadius,
  holeShape,
  holeSize,
  holeSpacing,
  thickness,
  stateMode,
}: Slab3DPreviewProps & { thickness: number; stateMode: 'wet' | 'fired' }) {
  const [isRotating, setIsRotating] = useState(true);
  const orbitRef = useRef<any>(null);

  return (
    <div className="relative w-full h-full">
      <Canvas shadows camera={{ position: [0, 15, 20], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={0.9}
          castShadow
          shadow-mapSize={[1024, 1024]}
        >
          <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 50]} />
        </directionalLight>
        <pointLight position={[-10, 10, -10]} intensity={0.4} />

        <Center>
          <SlabMesh
            shape={shape}
            finishedSize={finishedSize}
            shrinkageRate={shrinkageRate}
            wetSize={wetSize}
            seamAllowance={seamAllowance}
            cornerRadius={cornerRadius}
            holeShape={holeShape}
            holeSize={holeSize}
            holeSpacing={holeSpacing}
            thickness={thickness}
            stateMode={stateMode}
          />
        </Center>

        <gridHelper args={[60, 60, '#2c4cdb', '#e7e7e2']} position={[0, -0.01, 0]} />
        <axesHelper args={[5]} />

        <OrbitControls
          ref={orbitRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={40}
          autoRotate={isRotating}
          autoRotateSpeed={1.0}
        />
      </Canvas>

      {/* Floating Toolbar Controls */}
      <div className="absolute top-2 right-2 flex gap-1.5 no-print pointer-events-auto z-10">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`p-1.5 rounded-lg border text-xs transition bg-white/90 backdrop-blur-sm shadow-sm ${
            isRotating ? 'border-terracotta-200 text-terracotta-600 bg-terracotta-50' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
          }`}
          title={isRotating ? "Pausar Rotação" : "Ativar Rotação"}
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin [animation-duration:10s]' : ''}`} />
        </button>
        <button
          onClick={() => orbitRef.current?.reset()}
          className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-stone-200 text-stone-500 hover:bg-stone-50 transition text-xs shadow-sm"
          title="Resetar Câmera"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Slab3DPreview(props: Slab3DPreviewProps) {
  const [thickness, setThickness] = useState<number>(0.6); // thickness in cm
  const [stateMode, setStateMode] = useState<'wet' | 'fired'>('wet');
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const orbitRef = useRef<any>(null);

  const resetCamera = () => {
    if (orbitRef.current) {
      orbitRef.current.reset();
    }
  };

  // Compute Volume in cubic centimeters (cm³) / mL
  const slabVolume = useMemo(() => {
    let area = 0;
    const mult = stateMode === 'fired' ? (1 - props.shrinkageRate / 100) : 1.0;
    const actualThickness = thickness * mult;

    if (props.shape === 'circle') {
      const r = (props.wetSize / 2) * mult;
      area = Math.PI * r * r;
    } else if (props.shape === 'square') {
      const s = props.wetSize * mult;
      area = s * s;
    } else {
      const circ = Math.PI * props.wetSize;
      const w = (circ + props.seamAllowance) * mult;
      const h = props.wetSize * mult;
      area = w * h;
    }

    // Subtract holes volume if active
    if (props.holeShape !== 'none') {
      let numHoles = 0;
      const spacing = props.holeSpacing;
      const rad = props.holeSize / 2;

      if (props.shape === 'circle') {
        const limit = Math.ceil(props.wetSize / spacing);
        const maxDist = props.wetSize / 2 - rad - 0.2;
        for (let dx = -limit; dx <= limit; dx++) {
          for (let dy = -limit; dy <= limit; dy++) {
            if (Math.sqrt(dx*dx + dy*dy) * spacing <= maxDist) numHoles++;
          }
        }
      } else if (props.shape === 'square') {
        const limit = Math.ceil(props.wetSize / spacing);
        const maxOffset = props.wetSize / 2 - rad - 0.2;
        for (let dx = -limit; dx <= limit; dx++) {
          for (let dy = -limit; dy <= limit; dy++) {
            if (Math.abs(dx * spacing) <= maxOffset && Math.abs(dy * spacing) <= maxOffset) numHoles++;
          }
        }
      } else {
        const bandW = Math.PI * props.wetSize + props.seamAllowance;
        const bandH = props.wetSize;
        const margin = 0.6;
        const cols = Math.floor((bandW - margin * 2) / spacing) + 1;
        const rows = Math.floor((bandH - margin * 2) / spacing) + 1;
        if (cols > 0 && rows > 0) numHoles = cols * rows;
      }

      const holeArea = Math.PI * (rad * mult) * (rad * mult);
      area -= numHoles * holeArea;
    }

    return Math.max(0, area * actualThickness);
  }, [props.shape, props.wetSize, props.seamAllowance, props.holeShape, props.holeSize, props.holeSpacing, props.shrinkageRate, thickness, stateMode]);

  return (
    <div className="flex flex-col h-full bg-white/75 backdrop-blur-md rounded-2xl border border-terracotta-100 p-5 shadow-sm">
      {/* 3D Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-terracotta-100 text-terracotta-600 rounded-lg">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-clay-900">Maquete 3D da Placa</h3>
            <p className="text-xs text-clay-900/60 font-sans">Simulação interativa tridimensional realística</p>
          </div>
        </div>

        {/* State Toggle Selector */}
        <div className="flex bg-clay-100/80 p-1 rounded-xl self-start sm:self-auto border border-terracotta-100/30">
          <button
            onClick={() => setStateMode('wet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 ${
              stateMode === 'wet'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Placa Úmida (100%)
          </button>
          <button
            onClick={() => setStateMode('fired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition flex items-center gap-1.5 ${
              stateMode === 'fired'
                ? 'bg-white text-terracotta-600 shadow-sm'
                : 'text-clay-900/50 hover:text-clay-900/80'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Peça Pronta (-{props.shrinkageRate.toFixed(1)}%)
          </button>
        </div>
      </div>

      {/* R3F 3D Canvas Box Container */}
      <div className="relative flex-1 min-h-[280px] md:min-h-[340px] w-full rounded-xl bg-gradient-to-b from-[#fdfdfc] to-[#fafaf9] border border-terracotta-100/40 shadow-inner overflow-hidden">
        <Canvas shadows camera={{ position: [0, 15, 20], fov: 45 }}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={0.9}
            castShadow
            shadow-mapSize={[1024, 1024]}
          >
            <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 50]} />
          </directionalLight>
          <pointLight position={[-10, 10, -10]} intensity={0.4} />

          {/* Centered extruded slab mesh */}
          <Center>
            <SlabMesh 
              {...props} 
              thickness={thickness} 
              stateMode={stateMode} 
            />
          </Center>

          {/* Workspace cutting/rolling table grid */}
          <gridHelper args={[60, 60, '#2c4cdb', '#e7e7e2']} position={[0, -0.01, 0]} />
          <axesHelper args={[5]} />

          {/* Interactive controls */}
          <OrbitControls
            ref={orbitRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={4}
            maxDistance={40}
            autoRotate={isRotating}
            autoRotateSpeed={1.0}
          />
        </Canvas>

        {/* 3D Interaction Helpers */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 no-print pointer-events-none">
          <span className="text-[10px] text-clay-900/40 font-sans flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-clay-900/30 bg-clay-100 flex items-center justify-center text-[7px] font-bold">↔</span>
            Arraste com o mouse para rotacionar
          </span>
          <span className="text-[10px] text-clay-900/40 font-sans flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-clay-900/30 bg-clay-100 flex items-center justify-center text-[7px] font-bold">↕</span>
            Scroll para aproximar (Zoom)
          </span>
        </div>

        {/* Float Controls top right */}
        <div className="absolute top-3 right-3 flex gap-2 pointer-events-auto">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-2 rounded-xl border transition shadow-sm ${
              isRotating
                ? 'bg-terracotta-50 border-terracotta-100 text-terracotta-600'
                : 'bg-white border-clay-200 text-clay-500 hover:bg-clay-50'
            }`}
            title={isRotating ? "Pausar rotação automática" : "Ativar rotação automática"}
          >
            <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin [animation-duration:10s]' : ''}`} />
          </button>
          <button
            onClick={resetCamera}
            className="p-2 rounded-xl bg-white border border-clay-200 text-clay-500 hover:bg-clay-50 transition shadow-sm"
            title="Resetar Câmera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-terracotta-100 text-[10px] font-mono shadow-sm">
          {stateMode === 'fired' ? (
            <div className="flex flex-col">
              <span className="font-bold text-terracotta-600">PEÇA ACABADA (Fired)</span>
              <span className="text-clay-900/60">Tamanho final pós-forno</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-amber-700">PLACA CRUA (Wet)</span>
              <span className="text-clay-900/60">Tamanho ideal para corte</span>
            </div>
          )}
        </div>
      </div>

      {/* Sliders and Properties Panel */}
      <div className="mt-4 bg-[#fafaf9]/70 border border-terracotta-100/30 rounded-xl p-3.5 space-y-3.5">
        
        {/* Thickness Slider Control */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-clay-900/80 font-sans flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-terracotta-500" />
              Espessura da Placa (Slab Thickness)
            </span>
            <span className="text-xs font-mono font-bold text-terracotta-600 bg-white border border-terracotta-100 px-2 py-0.5 rounded">
              {(thickness * 10).toFixed(0)} mm ({thickness.toFixed(1)} cm)
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={thickness}
            onChange={(e) => setThickness(parseFloat(e.target.value))}
            className="w-full accent-terracotta-500 h-1.5 bg-terracotta-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-clay-900/40 font-mono">
            <span>2 mm (Mín)</span>
            <span>6 mm (Padrão)</span>
            <span>25 mm (Máx)</span>
          </div>
        </div>

        {/* Physical properties footer */}
        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dashed border-terracotta-100/30">
          <div className="space-y-0.5">
            <div className="text-[10px] text-clay-900/50 font-sans flex items-center gap-1">
              Volume da Placa Est.
              <span className="group relative cursor-help text-clay-900/30 hover:text-terracotta-500">
                <HelpCircle className="w-3 h-3" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-44 p-2 bg-clay-900 text-white text-[9px] rounded-lg shadow-lg z-50 text-center leading-normal">
                  Fórmula tridimensional calculada multiplicando a área líquida (descontando os vazados) pela espessura configurada.
                </span>
              </span>
            </div>
            <div className="text-base font-serif font-black text-clay-900 flex items-baseline gap-1">
              <span>{slabVolume.toFixed(1)}</span>
              <span className="text-[10px] font-sans font-bold text-clay-900/50">cm³ (mL)</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-clay-900/50 font-sans">Dimensões 3D Reais</span>
            <div className="text-[10px] font-mono font-bold text-clay-900 bg-white/40 border border-terracotta-100/20 px-2 py-1 rounded">
              {(() => {
                const mult = stateMode === 'fired' ? (1 - props.shrinkageRate / 100) : 1.0;
                const actualThick = thickness * mult;
                if (props.shape === 'circle') {
                  return `Ø ${(props.wetSize * mult).toFixed(1)} cm x E ${actualThick.toFixed(2)} cm`;
                } else if (props.shape === 'square') {
                  return `L ${(props.wetSize * mult).toFixed(1)} x E ${actualThick.toFixed(2)} cm`;
                } else {
                  const circ = Math.PI * props.wetSize;
                  const w = (circ + props.seamAllowance) * mult;
                  const h = props.wetSize * mult;
                  return `W ${w.toFixed(1)} x H ${h.toFixed(1)} x E ${actualThick.toFixed(2)} cm`;
                }
              })()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
