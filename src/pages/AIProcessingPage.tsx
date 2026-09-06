import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Cpu, Loader2, RefreshCw, Terminal } from 'lucide-react';
import { ProcessingJob, ProcessingJobStatus } from '../types';
import { api } from '../services/api';

const terminalStatuses: ProcessingJobStatus[] = ['completed', 'failed'];

export const AIProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadJob = async () => {
      if (!id) {
        setError('No project was selected for processing.');
        setLoading(false);
        return;
      }
      try {
        const currentJob = await api.getProcessingJob(id);
        if (!cancelled) {
          setJob(currentJob);
          setError(currentJob ? null : 'No processing job exists for this project. Upload a validated GeoTIFF first.');
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Unable to load processing status.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJob();
    const poll = window.setInterval(() => {
      setJob(current => {
        if (!current || !terminalStatuses.includes(current.status)) loadJob();
        return current;
      });
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [id]);

  const handleRetry = async () => {
    if (!job) return;
    setRetrying(true);
    setError(null);
    try {
      setJob(await api.retryProcessing(job.id));
    } catch (err: any) {
      setError(err?.message || 'Unable to retry processing.');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-600">Loading persistent processing status...</div>;

  if (error && !job) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-800">
          <AlertCircle className="mx-auto mb-2 h-5 w-5" />
          <p>{error}</p>
          <button onClick={() => navigate(`/projects/${id || ''}/upload`)} className="mt-4 rounded bg-teal-700 px-3 py-2 text-xs font-medium text-white">Back to Upload</button>
        </div>
      </div>
    );
  }

  if (!job) return null;
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const workerUnavailable = job.status === 'uploaded';

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl mx-auto w-full space-y-5">
      <div className="border-b border-slate-200 pb-3.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2"><Cpu className="w-5 h-5 text-teal-700" />AI Cadastral Feature Extraction Pipeline</h1>
        <p className="text-xs text-slate-500">Persistent job {job.id}; status is read from Supabase.</p>
      </div>

      {(error || workerUnavailable || isFailed) && (
        <div className={`rounded border p-3 text-xs ${isFailed ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {error || job.errorMessage || (workerUnavailable ? 'Processing is awaiting the configured Python/GDAL/AI worker. No synthetic progress or completion will be shown.' : 'Processing failed. Review the worker error and retry when the input or service is ready.')}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-900 text-sm">Processing Status</span><span className="font-mono font-bold text-slate-900 text-lg">{job.progress}%</span></div>
        <div className="flex items-center justify-between"><span className="px-2 py-0.5 rounded text-[11px] font-medium border bg-teal-50 text-teal-800 border-teal-200 uppercase">{job.status}</span><span className="text-xs text-slate-500">{job.currentStep || 'Waiting for worker status...'}</span></div>
        <div className="w-full bg-slate-100 h-2.5 rounded overflow-hidden border border-slate-200 p-0.5"><div className="h-full bg-teal-700 rounded-xs transition-all duration-300" style={{ width: `${job.progress}%` }} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {job.steps.map(step => {
          const done = step.status === 'completed';
          const active = step.status === 'processing';
          return <div key={step.id} className={`p-3 rounded border flex items-start gap-2.5 ${done ? 'bg-emerald-50/50 border-emerald-200' : active ? 'bg-teal-50/70 border-teal-200' : 'bg-white border-slate-200'}`}>
            <div className={`w-6 h-6 rounded shrink-0 flex items-center justify-center font-bold text-[11px] ${done ? 'bg-emerald-600 text-white' : active ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>{done ? <Check className="w-3.5 h-3.5" /> : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : step.id}</div>
            <div className="min-w-0"><h3 className="text-xs font-semibold text-slate-900">{step.name}</h3><p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p></div>
          </div>;
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded p-3.5 space-y-1.5 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 text-[10px] uppercase font-semibold tracking-wider border-b border-slate-800 pb-1.5"><Terminal className="w-3 h-3 text-teal-400" />Worker log</div>
        <div className="max-h-32 overflow-y-auto space-y-0.5 text-slate-300 text-[11px] leading-relaxed">{job.logs.length ? job.logs.map((log, index) => <div key={index}>&gt; {log}</div>) : <div className="text-slate-500">No worker logs have been recorded.</div>}</div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
        {(isFailed || workerUnavailable) && <button onClick={handleRetry} disabled={retrying} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700"><RefreshCw className={retrying ? 'animate-spin' : ''} size={14} />Retry processing</button>}
        <button onClick={() => navigate(isCompleted ? `/projects/${id}/map` : `/projects/${id}/upload`)} disabled={!isCompleted} className={`inline-flex items-center gap-2 rounded px-6 py-2.5 text-xs font-medium ${isCompleted ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>Open Interactive GIS Map<ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};
