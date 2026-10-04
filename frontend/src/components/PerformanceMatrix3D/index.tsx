'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Html, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import {
  ALL_MATRICES,
  MODELS,
  LEAD_TIMES,
  MODEL_COLORS,
  PerformanceCell,
  PerformanceMatrixData,
} from '@/data/performanceMatrixData';
import { Panel } from '@/components/shell/Panel';
import { Droplet, Thermometer, Wind, RotateCcw, type IconComponent } from '@/components/icons';

/* ──────────────────── Color helpers ──────────────────── */

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bv})`;
}

function getBarColor(skill: number): string {
  if (skill > 0.7) return '#16a34a'; // OK signal
  if (skill > 0.4) return '#ab6400'; // amber = watch
  return '#b42318'; // hazard = poor
}

/* ──────────────────── Individual 3D Bar ──────────────────── */

interface BarProps {
  cell: PerformanceCell;
  maxRmse: number;
  spacing: number;
  onHover: (cell: PerformanceCell | null) => void;
  isHovered: boolean;
  colorMode: 'model' | 'skill';
}

function PerformanceBar({ cell, maxRmse, spacing, onHover, isHovered, colorMode }: BarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetHeight = useRef(0);
  const currentHeight = useRef(0.01);

  const normalizedHeight = (cell.rmse / maxRmse) * 4; // max height = 4 units
  targetHeight.current = normalizedHeight;

  const baseColor = colorMode === 'model'
    ? MODEL_COLORS[cell.model] || '#171717'
    : getBarColor(cell.skillScore);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    // Smooth animation
    currentHeight.current += (targetHeight.current - currentHeight.current) * Math.min(delta * 4, 1);
    const h = Math.max(0.02, currentHeight.current);
    meshRef.current.scale.y = h;
    meshRef.current.position.y = h / 2;

    // Hover glow
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const targetEmissive = isHovered ? 0.4 : 0;
    mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * Math.min(delta * 8, 1);
  });

  const x = cell.modelIndex * spacing - ((MODELS.length - 1) * spacing) / 2;
  const z = cell.leadIndex * spacing - ((LEAD_TIMES.length - 1) * spacing) / 2;

  return (
    <mesh
      ref={meshRef}
      position={[x, 0, z]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(cell); }}
      onPointerOut={() => onHover(null)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[spacing * 0.7, 1, spacing * 0.7]} />
      <meshStandardMaterial
        color={baseColor}
        transparent
        opacity={isHovered ? 1 : 0.88}
        emissive={baseColor}
        emissiveIntensity={0}
        roughness={0.3}
        metalness={0.15}
      />
    </mesh>
  );
}

/* ──────────────────── Grid / Axes ──────────────────── */

interface GridProps {
  spacing: number;
  matrix: PerformanceMatrixData;
  maxRmse: number;
}

function AxisLabels({ spacing, matrix, maxRmse }: GridProps) {
  const xStart = -((MODELS.length - 1) * spacing) / 2;
  const zStart = -((LEAD_TIMES.length - 1) * spacing) / 2;

  return (
    <group>
      {/* Model names along X axis */}
      {MODELS.map((model, i) => (
        <Text
          key={`model-${i}`}
          position={[xStart + i * spacing, -0.3, ((LEAD_TIMES.length - 1) * spacing) / 2 + 1.2]}
          fontSize={0.22}
          color="#60646c"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, -Math.PI / 6]}
          font="/fonts/inter-medium.woff"
        >
          {model}
        </Text>
      ))}

      {/* Lead Time labels along Z axis */}
      {LEAD_TIMES.map((lt, i) => (
        <Text
          key={`lead-${i}`}
          position={[-((MODELS.length - 1) * spacing) / 2 - 1.2, -0.3, zStart + i * spacing]}
          fontSize={0.24}
          color="#60646c"
          anchorX="center"
          anchorY="middle"
          rotation={[-Math.PI / 2, 0, 0]}
        >
          {lt}
        </Text>
      ))}

      {/* Y axis ticks */}
      {[0, 1, 2, 3, 4].map(tick => {
        const rmseVal = ((tick / 4) * maxRmse).toFixed(1);
        return (
          <group key={`ytick-${tick}`}>
            <Text
              position={[-((MODELS.length - 1) * spacing) / 2 - 1.5, tick, 0]}
              fontSize={0.2}
              color="#94a3b8"
              anchorX="right"
              anchorY="middle"
            >
              {rmseVal}
            </Text>
            {/* Horizontal grid line */}
            <mesh position={[0, tick, 0]}>
              <planeGeometry args={[(MODELS.length - 1) * spacing + 2, (LEAD_TIMES.length - 1) * spacing + 2]} />
              <meshBasicMaterial
                color="#f0f0f3"
                transparent
                opacity={0.12}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}

      {/* Axis titles */}
      <Text
        position={[0, -0.3, ((LEAD_TIMES.length - 1) * spacing) / 2 + 2.2]}
        fontSize={0.28}
        color="#171717"
        anchorX="center"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Models →
      </Text>
      <Text
        position={[-((MODELS.length - 1) * spacing) / 2 - 2.5, -0.3, 0]}
        fontSize={0.28}
        color="#171717"
        anchorX="center"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        Lead Time (hours ahead) →
      </Text>
      <Text
        position={[-((MODELS.length - 1) * spacing) / 2 - 2.5, 2, -((LEAD_TIMES.length - 1) * spacing) / 2 - 0.5]}
        fontSize={0.24}
        color="#171717"
        anchorX="center"
        rotation={[0, Math.PI / 4, Math.PI / 2]}
      >
        {`Average miss — RMSE (${matrix.unit}) ↑`}
      </Text>

      {/* Base grid */}
      <gridHelper
        args={[
          Math.max((MODELS.length - 1) * spacing, (LEAD_TIMES.length - 1) * spacing) + 2,
          10,
          '#dcdee0',
          '#f0f0f3',
        ]}
        position={[0, -0.01, 0]}
      />
    </group>
  );
}

/* ──────────────────── Floating Tooltip inside Canvas ──────────────────── */

function FloatingTooltip({ cell, matrix }: { cell: PerformanceCell; matrix: PerformanceMatrixData }) {
  const spacing = 1.5;
  const x = cell.modelIndex * spacing - ((MODELS.length - 1) * spacing) / 2;
  const z = cell.leadIndex * spacing - ((LEAD_TIMES.length - 1) * spacing) / 2;
  const maxRmse = Math.max(...matrix.cells.map(c => c.rmse));
  const y = (cell.rmse / maxRmse) * 4 + 0.6;

  return (
    <Html
      position={[x, y, z]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="px-3 py-2.5 border border-border bg-popover text-popover-foreground text-xs whitespace-nowrap rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        style={{ minWidth: 160 }}
      >
        <div className="font-bold text-foreground mb-1">{cell.model}</div>
        <div className="text-muted-foreground mb-1.5">Lead: {cell.leadTime} · {matrix.variable}</div>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">RMSE</span>
            <span className="font-bold text-foreground">{cell.rmse} {matrix.unit}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">MAE</span>
            <span className="font-semibold text-foreground">{cell.mae} {matrix.unit}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bias</span>
            <span className={`font-semibold ${cell.bias >= 0 ? 'text-warning' : 'text-data-rain'}`}>
              {cell.bias > 0 ? '+' : ''}{cell.bias} {matrix.unit}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Skill</span>
            <span className="font-bold text-primary">{(cell.skillScore * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-border text-[10px] text-muted-foreground leading-snug max-w-[170px] whitespace-normal">
          How far off this model is on average at this lead time — shorter bar is better.
        </div>
      </div>
    </Html>
  );
}

/* ──────────────────── Scene ──────────────────── */

interface SceneProps {
  matrix: PerformanceMatrixData;
  colorMode: 'model' | 'skill';
  autoRotate: boolean;
}

function Scene({ matrix, colorMode, autoRotate }: SceneProps) {
  const [hoveredCell, setHoveredCell] = useState<PerformanceCell | null>(null);
  const spacing = 1.5;
  const maxRmse = useMemo(() => Math.max(...matrix.cells.map(c => c.rmse)), [matrix]);

  const handleHover = useCallback((cell: PerformanceCell | null) => {
    setHoveredCell(cell);
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 6, -3]} intensity={0.3} />
      <pointLight position={[0, 6, 0]} intensity={0.4} color="#60a5fa" />

      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        enablePan={true}
        enableZoom={true}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1.5, 0]}
      />

      <group>
        {matrix.cells.map((cell) => (
          <PerformanceBar
            key={`${cell.model}-${cell.leadTime}`}
            cell={cell}
            maxRmse={maxRmse}
            spacing={spacing}
            onHover={handleHover}
            isHovered={hoveredCell?.model === cell.model && hoveredCell?.leadTime === cell.leadTime}
            colorMode={colorMode}
          />
        ))}
        <AxisLabels spacing={spacing} matrix={matrix} maxRmse={maxRmse} />
        {hoveredCell && <FloatingTooltip cell={hoveredCell} matrix={matrix} />}
      </group>
    </>
  );
}

/* ──────────────────── Variable & Color Mode Selector ──────────────────── */

type VariableKey = 'rainfall' | 'temperature' | 'wind';
type ColorMode = 'model' | 'skill';

const VARIABLE_CONFIG: Record<VariableKey, { label: string; icon: IconComponent }> = {
  rainfall: { label: 'Rainfall', icon: Droplet },
  temperature: { label: 'Temperature', icon: Thermometer },
  wind: { label: 'Wind Speed', icon: Wind },
};

/* ──────────────────── Main Exported Component ──────────────────── */

export function PerformanceMatrix3D() {
  const [variable, setVariable] = useState<VariableKey>('rainfall');
  const [colorMode, setColorMode] = useState<ColorMode>('model');
  const [autoRotate, setAutoRotate] = useState(true);

  const matrix = ALL_MATRICES[variable];

  // Find best model at each lead time
  const bestModels = useMemo(() => {
    const bests: Record<string, string> = {};
    for (const lt of LEAD_TIMES) {
      const cellsAtLead = matrix.cells.filter(c => c.leadTime === lt);
      const best = cellsAtLead.reduce((a, b) => (a.rmse < b.rmse ? a : b));
      bests[lt] = best.model;
    }
    return bests;
  }, [matrix]);

  return (
    <Panel
      title="3D performance matrix"
      subtitle="How accurate each model is at each lead time — drag to rotate, scroll to zoom"
      term="rmse"
      collapsibleOnPhone
      collapsibleOnTablet
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Variable selector */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
            {(Object.keys(VARIABLE_CONFIG) as VariableKey[]).map((v) => {
              const Icon = VARIABLE_CONFIG[v].icon;
              return (
                <button
                  key={v}
                  onClick={() => setVariable(v)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded-sm transition-colors duration-100 ${
                    variable === v
                      ? 'gradient-animated-ocean text-white font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  type="button"
                >
                  <Icon size={13} className="shrink-0" />
                  <span>{VARIABLE_CONFIG[v].label}</span>
                </button>
              );
            })}
          </div>

          {/* Color mode toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-secondary border border-border">
            <button
              onClick={() => setColorMode('model')}
              className={`px-2 py-1 text-xs font-mono rounded-sm transition-colors duration-100 ${
                colorMode === 'model'
                  ? 'bg-card text-foreground font-bold border border-border shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              By Model
            </button>
            <button
              onClick={() => setColorMode('skill')}
              className={`px-2 py-1 text-xs font-mono rounded-sm transition-colors duration-100 ${
                colorMode === 'skill'
                  ? 'bg-card text-foreground font-bold border border-border shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              type="button"
            >
              By Skill
            </button>
          </div>

          {/* Auto-rotate toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border rounded-md transition-colors duration-100 ${
              autoRotate
                ? 'bg-accent text-accent-foreground border-primary/30'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
            type="button"
          >
            <RotateCcw size={13} className={`shrink-0 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
          </button>
        </div>
      }
    >

      {/* 3D Canvas */}
      <div className="w-full overflow-hidden border border-border rounded-lg bg-secondary" style={{ height: 480 }}>
        <Canvas
          camera={{ position: [8, 6, 8], fov: 45 }}
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene matrix={matrix} colorMode={colorMode} autoRotate={autoRotate} />
        </Canvas>
      </div>

      {/* Legend + Best Model Summary */}
      <div className="flex flex-wrap items-start justify-between gap-4 mt-4 font-mono">
        {/* Color legend */}
        <div className="flex flex-wrap items-center gap-3">
          {colorMode === 'model' ? (
            MODELS.map(m => (
              <div key={m} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ background: MODEL_COLORS[m] }}
                />
                <span className="text-xs text-muted-foreground">{m}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-foreground" />
                <span className="text-xs text-muted-foreground">High Skill ({'>'}70%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-warning" />
                <span className="text-xs text-muted-foreground">Medium (40–70%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-destructive" />
                <span className="text-xs text-muted-foreground">Low ({'<'}40%)</span>
              </div>
            </>
          )}
        </div>

        {/* Best model at each lead time */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lowest Error:</span>
          {LEAD_TIMES.map(lt => (
            <span
              key={lt}
              className="px-1.5 py-0.5 text-[10px] font-bold border border-border rounded-sm bg-secondary text-foreground"
            >
              {lt}: {bestModels[lt]}
            </span>
          ))}
        </div>
      </div>

      {/* Insight footer */}
      <div className="mt-3 p-3 bg-accent border border-primary/30 font-mono text-xs text-accent-foreground leading-relaxed">
        <span className="font-bold">Blended Hybrid AI–NWP</span> delivers lowest RMSE across all forecast horizons for {matrix.variable.toLowerCase()}, with superior error stability compared to raw individual physics models.
      </div>
    </Panel>
  );
}
