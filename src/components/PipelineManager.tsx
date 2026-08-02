import React from 'react';
import { JenkinsPipelineRun, MLModelMetrics } from '../types';
import { Layers, Play, CheckCircle2, Clock, Terminal, Activity, RefreshCw, Cpu, Server } from 'lucide-react';

interface PipelineManagerProps {
  pipelineRun: JenkinsPipelineRun | null;
  modelMetrics: MLModelMetrics | null;
  onTriggerWebhook: () => Promise<void>;
  onTriggerRetrain: () => Promise<void>;
  isTriggering: boolean;
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  pipelineRun,
  modelMetrics,
  onTriggerWebhook,
  onTriggerRetrain,
  isTriggering,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Jenkins CI/CD Pipeline & MLflow Retraining
            </h2>
            <span className="text-[10px] bg-black text-cyan-400 px-2 py-0.5 rounded border border-[#2A2A2E] font-mono">
              http://localhost:8080/job/linux-assistant/build
            </span>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            Local webhook orchestration for vector re-indexing & MLOps model validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="trigger-jenkins-webhook-btn"
            onClick={onTriggerWebhook}
            disabled={isTriggering}
            className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3.5 py-1.5 rounded text-xs uppercase tracking-wider flex items-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTriggering ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-black" />
            )}
            <span>Trigger Webhook</span>
          </button>

          <button
            id="trigger-mlflow-retrain-btn"
            onClick={onTriggerRetrain}
            disabled={isTriggering}
            className="bg-[#2A2A2E] hover:bg-[#3A3A3F] text-gray-200 border border-[#3A3A3F] font-mono text-[10px] uppercase px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Retrain ML Model</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Stage Timeline & MLflow Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stage Timeline */}
        <div className="lg:col-span-2 bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">
                Active Build: #{pipelineRun?.buildNumber || 104}
              </span>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{pipelineRun?.triggeredBy}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                {pipelineRun?.duration || '32s'}
              </span>
              <span className="bg-green-950/40 text-green-400 border border-green-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                {pipelineRun?.status || 'SUCCESS'}
              </span>
            </div>
          </div>

          {/* Stages Progress Line */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 font-mono">
              Pipeline Execution Stages
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {pipelineRun?.stages.map((stage, idx) => (
                <div
                  key={idx}
                  className="bg-black/60 border border-[#2A2A2E] rounded p-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-gray-600 font-mono">0{idx + 1}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <strong className="text-xs text-gray-200 font-mono font-medium mb-1 line-clamp-1">
                    {stage.name}
                  </strong>
                  <span className="text-[9px] text-cyan-400 font-mono">{stage.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Log Console */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 flex items-center gap-1.5 font-mono">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Jenkins Live Build Logs
            </h4>
            <div className="bg-black border border-[#2A2A2E] rounded p-3 font-mono text-[11px] text-gray-300 space-y-1 max-h-48 overflow-y-auto">
              {pipelineRun?.logs.map((logLine, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-gray-700 select-none text-[10px]">{idx + 1}</span>
                  <span
                    className={
                      logLine.includes('SUCCESS')
                        ? 'text-green-400'
                        : logLine.includes('INFO')
                          ? 'text-gray-300'
                          : 'text-amber-300'
                    }
                  >
                    {logLine}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MLflow Model Registry Metrics */}
        <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 space-y-4 shadow-xl">
          <div className="border-b border-[#2A2A2E] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300 flex items-center gap-1.5 font-mono">
                <Cpu className="w-4 h-4 text-cyan-400" />
                MLflow Model Registry
              </h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                Model: {modelMetrics?.version || 'v2.4.0'}
              </p>
            </div>
            <span className="text-[9px] bg-black text-cyan-400 border border-[#2A2A2E] px-2 py-0.5 rounded font-mono">
              Ollama / Local
            </span>
          </div>

          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-black/60 border border-[#2A2A2E] p-2.5 rounded">
              <span className="text-[9px] text-gray-500 uppercase">Accuracy</span>
              <div className="text-base font-bold text-green-400">
                {((modelMetrics?.accuracy || 0.984) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-black/60 border border-[#2A2A2E] p-2.5 rounded">
              <span className="text-[9px] text-gray-500 uppercase">Loss</span>
              <div className="text-base font-bold text-rose-400">
                {modelMetrics?.loss || 0.021}
              </div>
            </div>

            <div className="bg-black/60 border border-[#2A2A2E] p-2.5 rounded">
              <span className="text-[9px] text-gray-500 uppercase">F1 Score</span>
              <div className="text-base font-bold text-cyan-400">
                {modelMetrics?.f1Score || 0.981}
              </div>
            </div>

            <div className="bg-black/60 border border-[#2A2A2E] p-2.5 rounded">
              <span className="text-[9px] text-gray-500 uppercase">Dataset Size</span>
              <div className="text-base font-bold text-amber-400">
                {modelMetrics?.datasetSize || 1420} samples
              </div>
            </div>
          </div>

          {/* Loss Curve SVG Visualization */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 font-mono">
              Training Loss & Accuracy History
            </h4>
            <div className="bg-black border border-[#2A2A2E] p-3 rounded h-28 flex items-end justify-between gap-1">
              {modelMetrics?.lossHistory.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex items-end justify-center h-16 bg-[#16161A] rounded-t overflow-hidden relative">
                    <div
                      style={{ height: `${item.accuracy * 100}%` }}
                      className="w-full bg-cyan-500/80 group-hover:bg-cyan-400 transition-colors"
                    />
                  </div>
                  <span className="text-[8px] font-mono text-gray-600">Ep {item.epoch}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 border border-[#2A2A2E] p-2 rounded text-[10px] font-mono text-gray-500 flex items-center justify-between">
            <span>Last Retrained:</span>
            <span className="text-gray-300">
              {new Date(modelMetrics?.lastRetrained || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
