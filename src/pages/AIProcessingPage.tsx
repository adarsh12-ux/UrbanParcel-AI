import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cpu, Loader2, ArrowRight, Terminal, Sparkles, Check, Compass } from 'lucide-react';
import { Project, PipelineStep } from '../types';
import { api } from '../services/api';

export const AIProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);

  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: 1, name: '1. Orthomosaic Preprocessing', description: 'Radiometric normalization & cloud masking', status: 'processing' },
    { id: 2, name: '2. Tile Grid Alignment', description: 'GSD calculation & EPSG:4326 georeferencing', status: 'pending' },
    { id: 3, name: '3. Deep Neural Segmentation', description: 'U-Net / ResNet-50 deep learning boundary inference', status: 'pending' },
    { id: 4, name: '4. Parcel Boundary Regularization', description: 'Polygon edge vectorization & topological closure', status: 'pending' },
    { id: 5, name: '5. Building Footprint Extraction', description: 'Roofline polygon segmentation & regularized bounds', status: 'pending' },
    { id: 6, name: '6. Road Network Vectorization', description: 'Centerline topological graph construction', status: 'pending' },
    { id: 7, name: '7. Cadastral Attribute Mapping', description: 'Survey number linking & zoning classification', status: 'pending' },
    { id: 8, name: '8. GIS Spatial Indexing', description: 'Compiling GeoJSON vector layers & spatial database', status: 'pending' }
  ]);

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Initializing PyTorch AI Segmentation Pipeline v2.4`,
    `[${new Date().toLocaleTimeString()}] Target CRS verified: EPSG:4326 WGS 84`,
    `[${new Date().toLocaleTimeString()}] Image size: 5472 x 3648 px | GSD: 3.2 cm/pixel`
  ]);

  useEffect(() => {
    async function loadProject() {
      if (id) {
        const proj = await api.getProject(id);
        setProject(proj);
      }
    }
    loadProject();
  }, [id]);

  useEffect(() => {
    if (isCompleted) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prevStep) => {
        const nextStep = prevStep + 1;

        if (nextStep >= steps.length) {
          clearInterval(interval);
          setProgress(100);
          setIsCompleted(true);
          setSteps((prevSteps) =>
            prevSteps.map((s) => ({ ...s, status: 'completed' }))
          );
          if (id) {
            api.completeProcessing(id);
          }
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Processing Complete! 247 Parcels, 381 Buildings, 42 Roads Extracted.`,
            `[${new Date().toLocaleTimeString()}] Generated GeoJSON vector layers ready for GIS map inspection.`
          ]);
          return prevStep;
        }

        setSteps((prevSteps) =>
          prevSteps.map((s, idx) => {
            if (idx < nextStep) return { ...s, status: 'completed' };
            if (idx === nextStep) return { ...s, status: 'processing' };
            return { ...s, status: 'pending' };
          })
        );

        const newProg = Math.min(Math.round(((nextStep + 1) / steps.length) * 100), 98);
        setProgress(newProg);

        const stepLogMap: Record<number, string> = {
          1: 'Orthomosaic tiled into 512x512 patches with 15% stride overlap.',
          2: 'U-Net Deep Neural Network inference running on CUDA GPU node.',
          3: 'Boundary edge detection thresholding confidence score > 0.85.',
          4: 'Building footprint polygons regularized and right-angled.',
          5: 'Road network topology graph constructed.',
          6: 'Land use classifier: 45% Residential, 23% Commercial, 14% Mixed.',
          7: 'Assembling GeoJSON FeatureCollection layers.'
        };

        if (stepLogMap[nextStep]) {
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Step ${nextStep + 1}: ${stepLogMap[nextStep]}`
          ]);
        }

        return nextStep;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [id, isCompleted, steps.length]);

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl mx-auto w-full space-y-5">


      {/* Header */}
      <div className="border-b border-slate-200 pb-3.5 space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-teal-700" />
          <span>AI Cadastral Feature Extraction Pipeline</span>
        </h1>
        <p className="text-xs text-slate-500">Step 3 of 4: Deep learning segmentation and automated GIS vector boundary regularization.</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-900 text-sm">Execution Progress</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-teal-50 text-teal-800 border-teal-200'
            }`}>
              {isCompleted ? 'Pipeline Complete' : 'Inference Running...'}
            </span>
          </div>

          <div className="font-mono font-bold text-slate-900 text-lg">
            {progress}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded overflow-hidden border border-slate-200 p-0.5">
          <div
            className="h-full bg-teal-700 rounded-xs transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pipeline Details Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono border-t border-slate-100">
          <div>
            <p className="text-slate-400 font-sans text-[10px]">Processing Time</p>
            <p className="font-semibold text-slate-800">{isCompleted ? '12.4s' : 'Running...'}</p>
          </div>
          <div>
            <p className="text-slate-400 font-sans text-[10px]">Pixel Extent</p>
            <p className="font-semibold text-slate-800">5472 × 3648 px</p>
          </div>
          <div>
            <p className="text-slate-400 font-sans text-[10px]">Survey Extent</p>
            <p className="font-semibold text-slate-800">{project?.surveyAreaSqKm || 4.2} km²</p>
          </div>
          <div>
            <p className="text-slate-400 font-sans text-[10px]">Model Architecture</p>
            <p className="font-semibold text-teal-800 font-sans">ResNet-50 + U-Net</p>
          </div>
        </div>
      </div>

      {/* 8-Step Pipeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {steps.map((step) => {
          const isDone = step.status === 'completed';
          const isProc = step.status === 'processing';

          return (
            <div
              key={step.id}
              className={`p-3 rounded border flex items-start gap-2.5 transition-colors ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-900'
                  : isProc
                  ? 'bg-teal-50/70 border-teal-200 text-teal-950 font-medium'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center font-bold text-[11px] ${
                isDone
                  ? 'bg-emerald-600 text-white'
                  : isProc
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5 text-white" /> : isProc ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : step.id}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-xs font-semibold truncate ${isDone ? 'text-slate-900' : isProc ? 'text-teal-950' : 'text-slate-500'}`}>
                    {step.name}
                  </h3>
                  <span className={`text-[9px] uppercase tracking-wider font-mono font-medium ${
                    isDone ? 'text-emerald-700' : isProc ? 'text-teal-700' : 'text-slate-400'
                  }`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Log Output */}
      <div className="bg-slate-900 border border-slate-800 rounded p-3.5 space-y-1.5 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="flex items-center gap-1.5 text-slate-300 text-[10px] uppercase font-semibold tracking-wider">
            <Terminal className="w-3 h-3 text-teal-400" />
            <span>Inference Execution Output</span>
          </span>
          <span className="text-[9px] text-slate-500">CUDA Stream</span>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-0.5 text-slate-300 text-[11px] leading-relaxed">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-teal-400 font-bold">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Completion Action */}
      <div className="flex justify-end pt-3 border-t border-slate-200">
        <button
          onClick={() => navigate(id ? `/projects/${id}/map` : '/projects')}
          disabled={!isCompleted}
          className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded font-medium text-xs shadow-xs transition-colors ${
            isCompleted
              ? 'bg-teal-700 hover:bg-teal-600 text-white cursor-pointer'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <span>Open Interactive GIS Map</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
