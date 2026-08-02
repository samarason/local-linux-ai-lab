import React, { useState } from 'react';
import { DistroFamily, AssistantResponse } from '../types';
import { Send, Terminal, Play, Copy, Check, AlertTriangle, HelpCircle, Sparkles, BookOpen } from 'lucide-react';

interface QueryPanelProps {
  activeDistro: DistroFamily;
  onExecuteInTerminal: (command: string) => void;
  isLoading: boolean;
  onSubmitQuery: (prompt: string) => void;
  lastResponse: AssistantResponse | null;
}

const PRESET_QUERIES = [
  'Install web server & configure firewall for HTTP',
  'Set static IP address on primary network adapter',
  'Check security status (SELinux / AppArmor)',
  'Update package index & upgrade installed packages',
  'Inspect service status and last 50 journalctl logs',
  'Install Python 3, pip, and Git development tools',
];

export const QueryPanel: React.FC<QueryPanelProps> = ({
  activeDistro,
  onExecuteInTerminal,
  isLoading,
  onSubmitQuery,
  lastResponse,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading) return;
    onSubmitQuery(promptInput.trim());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Query Bar */}
      <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Distro-Aware AI Command Generator
          </span>
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/80 font-mono">
            Target: {activeDistro === 'debian' ? 'Debian / Ubuntu' : 'Red Hat / RHEL'}
          </span>
        </label>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="query-prompt-input"
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder={`Describe system task... (e.g. "Install web server and configure firewall")`}
            className="flex-1 bg-black border border-[#2A2A2E] rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors font-sans"
          />
          <button
            id="submit-query-btn"
            type="submit"
            disabled={isLoading || !promptInput.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-colors shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Generate</span>
          </button>
        </form>

        {/* Preset Prompt Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 self-center font-mono mr-1">
            Presets:
          </span>
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPromptInput(preset);
                onSubmitQuery(preset);
              }}
              className="text-[10px] font-mono bg-black/60 hover:bg-[#2A2A2E] text-gray-400 hover:text-cyan-300 border border-[#2A2A2E] hover:border-cyan-500/50 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* AI Response Block */}
      {lastResponse && (
        <div className="bg-[#16161A] border border-[#2A2A2E] rounded-xl overflow-hidden shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="bg-black/80 px-4 py-2.5 border-b border-[#2A2A2E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                  lastResponse.targetDistro === 'debian'
                    ? 'bg-cyan-900/30 text-cyan-400 border-cyan-800'
                    : 'bg-amber-900/30 text-amber-400 border-amber-800'
                }`}
              >
                [Target: {lastResponse.targetDistro === 'debian' ? 'Debian / Ubuntu' : 'Red Hat / RHEL'}]
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Syntax Validated via Vector Context</span>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(lastResponse.suggestedCommand)}
              className="text-[10px] uppercase font-mono text-gray-400 hover:text-gray-200 flex items-center gap-1.5 px-2 py-1 rounded bg-[#2A2A2E] hover:bg-[#3A3A3F] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-cyan-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Suggested Command Block */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5 tracking-widest font-mono">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Suggested Command
                </span>
                <span className="text-[10px] text-gray-500 font-mono">Inject to Shell</span>
              </div>

              <div className="bg-black/90 border border-[#3A3A3F] rounded-lg p-3 font-mono text-xs text-green-400 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 group relative">
                <code className="break-all whitespace-pre-wrap flex-1 select-all leading-relaxed">
                  {lastResponse.suggestedCommand}
                </code>
                <button
                  id="execute-cmd-in-pod-btn"
                  onClick={() => onExecuteInTerminal(lastResponse.suggestedCommand)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3 py-1.5 rounded text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-colors shrink-0 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-black" />
                  <span>Run in Pod</span>
                </button>
              </div>
            </div>

            {/* Command & Flag Breakdown */}
            <div className="bg-black/40 border border-[#2A2A2E] rounded-lg p-3">
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1.5 flex items-center gap-1.5 font-mono">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                Command Breakdown
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">{lastResponse.breakdown}</p>
            </div>

            {/* Alternative Family Syntax */}
            {lastResponse.alternativeSyntax && (
              <div className="bg-black/40 border border-[#2A2A2E] rounded-lg p-3">
                <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1 flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-gray-600" />
                  Alternative Family Syntax
                </h4>
                <p className="text-xs text-gray-400 font-mono">{lastResponse.alternativeSyntax}</p>
              </div>
            )}

            {/* Local Safety Warning */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2 text-amber-200/90 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-300 block text-[10px] uppercase tracking-wider font-mono">Local Safety Advisory</strong>
                <span className="text-gray-300">{lastResponse.safetyWarning}</span>
              </div>
            </div>

            {/* Retrieved RAG Context Chunks */}
            {lastResponse.retrievedDocs && lastResponse.retrievedDocs.length > 0 && (
              <div className="border-t border-[#2A2A2E] pt-3">
                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-mono">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  Retrieved Documentation Context ({lastResponse.retrievedDocs.length} chunks)
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  {lastResponse.retrievedDocs.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="bg-black/60 border border-[#2A2A2E] rounded p-2.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between text-gray-400 mb-1 font-mono text-[9px] uppercase">
                        <span className="text-cyan-400 font-semibold">{chunk.docTitle}</span>
                        <span className="bg-[#2A2A2E] px-1.5 py-0.5 rounded text-gray-300">
                          {chunk.distroTag}
                        </span>
                      </div>
                      <p className="text-gray-300 font-mono line-clamp-2">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
