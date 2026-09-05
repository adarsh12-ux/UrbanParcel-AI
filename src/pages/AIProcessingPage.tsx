import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cpu, Loader2, ArrowRight, Terminal, Sparkles, Check } from 'lucide-react';
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
    { id: 1, name: '1. Image Preprocessing', description: 'Radiometric calibration & cloud masking', status: 'processing' },
    { id: 2, name: '2. Orthomosaic Preparation', description: 'GSD calculation & GeoTIFF alignment', status: 'pending' },
    { id: 3, name: '3. Image Segmentation', description: 'U-Net / Mask R-CNN deep neural network feature extraction', status: 'pending' },
    { id: 4, name: '4. Parcel Boundary Detection', description: 'Polygon edge vectorization & topological closure', status: 'pending' },
    { id: 5, name: '5. Building Footprint Extraction', description: 'Roofline polygon segmentation & height estimation', status: 'pending' },
    { id: 6, name: '6. Road Network Extraction', description: 'Asphalt & concrete centerline vectorization', status: 'pending' },
    { id: 7, name: '7. Cadastral Feature Generation', description: 'Survey number attribute tagging & land use classification', status: 'pending' },
    { id: 8, name: '8. GIS Layer Generation', description: 'Exporting GeoJSON vector layers & spatial index', status: 'pending' }
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

  // Live simulation effect over 10-12 seconds
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
            `[${new Date().toLocaleTimeString()}] Generated GeoJSON vector layers ready for GIS map visual inspection.`
          ]);
          return prevStep;
        }

        // Update step states
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Disclaimer Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-sm bg-navy-50 border border-navy-100 text-xs text-navy-900 font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-navy-700 shrink-0" />
          <span>Prototype processing — sample output demonstration for Smart India Hackathon</span>
        </div>
        <span className="bg-white text-navy-800 px-2 py-0.5 rounded-sm font-mono text-[10px] border border-navy-100 font-semibold hidden sm:inline">
          PyTorch Model Simulation
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-line pb-4 space-y-1">
        <h1 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
          <Cpu className="w-6 h-6 text-navy-700" />
          <span>AI-Powered Feature Extraction Pipeline</span>
        </h1>
        <p className="text-xs text-muted">Step 3 of 4: Deep Learning Segmentation & Automated GIS Vector Layer Generation.</p>
      </div>

      {/* Progress Bar & Status Bar */}
      <div className="bg-white border border-line rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="font-bold text-ink text-lg">Processing Pipeline</span>
            <span className={`px-2.5 py-0.5 rounded-sm text-xs font-semibold ${
              isCompleted
                ? 'bg-forest-50 text-forest-800 border border-forest-100'
                : 'bg-navy-50 text-navy-800 border border-navy-100'
            }`}>
              {isCompleted ? 'Completed' : 'Processing...'}
            </span>
          </div>

          <div className="text-right font-mono font-bold text-navy-900 text-xl">
            {progress}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-canvas h-3 rounded-sm overflow-hidden border border-line p-0.5">
          <div
            className="h-full bg-navy-900 rounded-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pipeline Details Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono border-t border-line">
          <div>
            <p className="text-muted font-sans text-[10px]">Processing Time</p>
            <p className="font-semibold text-ink">{isCompleted ? '12.4s' : 'Running...'}</p>
          </div>
          <div>
            <p className="text-muted font-sans text-[10px]">Image Dimensions</p>
            <p className="font-semibold text-ink">5472 × 3648 px</p>
          </div>
          <div>
            <p className="text-muted font-sans text-[10px]">Survey Area</p>
            <p className="font-semibold text-ink">{project?.surveyAreaSqKm || 4.2} km²</p>
          </div>
          <div>
            <p className="text-muted font-sans text-[10px]">Model Status</p>
            <p className="font-semibold text-forest-800">ResNet-50 + U-Net</p>
          </div>
        </div>
      </div>

      {/* 8-Step Visual Pipeline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {steps.map((step) => {
          const isDone = step.status === 'completed';
          const isProc = step.status === 'processing';

          return (
            <div
              key={step.id}
              className={`p-4 rounded-sm border flex items-start gap-3 ${
                isDone
                  ? 'bg-forest-50 border-forest-100 text-ink'
                  : isProc
                  ? 'bg-navy-50 border-navy-100 text-navy-950 font-semibold'
                  : 'bg-white border-line text-muted'
              }`}
            >
              <div className={`w-7 h-7 rounded-sm shrink-0 flex items-center justify-center font-bold text-xs ${
                isDone
                  ? 'bg-forest-700 text-white border border-forest-700'
                  : isProc
                  ? 'bg-navy-900 text-white border border-navy-900'
                  : 'bg-canvas text-muted border border-line'
              }`}>
                {isDone ? <Check className="w-4 h-4 text-white" /> : isProc ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : step.id}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-semibold ${isDone ? 'text-ink' : isProc ? 'text-navy-950' : 'text-muted'}`}>
                    {step.name}
                  </h3>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                    isDone ? 'text-forest-800' : isProc ? 'text-navy-800' : 'text-muted'
                  }`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Log Output Stream */}
      <div className="bg-navy-950 border border-navy-800 rounded-sm p-4 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-navy-800 pb-2">
          <span className="flex items-center gap-1.5 text-navy-100 text-[11px] uppercase font-semibold tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-forest-100" />
            <span>AI Execution Stream Log</span>
          </span>
          <span className="text-[10px] text-navy-100">Live stdout</span>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1 text-navy-50 text-[11px] leading-relaxed">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-forest-100 font-bold">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Completion Action */}
      <div className="flex justify-end pt-4 border-t border-line">
        <button
          onClick={() => navigate(`/projects/${id || 'proj-001'}/map`)}
          disabled={!isCompleted}
          className={`inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-sm font-bold text-sm ${
            isCompleted
              ? 'bg-forest-700 hover:bg-forest-600 text-white cursor-pointer'
              : 'bg-canvas text-muted cursor-not-allowed border border-line'
          }`}
        >
          <span>View Interactive Map →</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
