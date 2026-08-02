import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, RefreshCw, Layers, Database, Server, Monitor, X, Copy, Check, ExternalLink, Key } from 'lucide-react';
import { DistroFamily, JenkinsPipelineRun } from '../types';

interface HeaderProps {
  activeDistro: DistroFamily;
  onDistroChange: (distro: DistroFamily) => void;
  activeTab: 'query' | 'rag' | 'pipeline' | 'systems';
  setActiveTab: (tab: 'query' | 'rag' | 'pipeline' | 'systems') => void;
  pipelineStatus: JenkinsPipelineRun | null;
  documentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeDistro,
  onDistroChange,
  activeTab,
  setActiveTab,
  pipelineStatus,
  documentCount,
}) => {
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem('gemini_api_key');
    if (existing) {
      setApiKeyInput(existing);
      setHasApiKey(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setHasApiKey(true);
    } else {
      localStorage.removeItem('gemini_api_key');
      setHasApiKey(false);
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowApiKeyModal(false);
    }, 1200);
  };

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const desktopCommands = [
    { label: 'Windows Package (.msi & .exe)', cmd: 'npm run dist:win', target: 'Windows x64 / ARM' },
    { label: 'macOS Package (.pkg & .dmg)', cmd: 'npm run dist:mac', target: 'macOS Apple Silicon & Intel' },
    { label: 'Linux Package (.rpm, .deb, .AppImage)', cmd: 'npm run dist:linux', target: 'Linux RHEL, Debian, Universal' },
    { label: 'All Target Platforms', cmd: 'npm run dist:all', target: 'Windows, macOS & Linux' },
  ];

  return (
    <header className="bg-[#16161A] border-b border-[#2A2A2E] text-[#E0E0E0] px-4 py-3 sticky top-0 z-40 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1800px] mx-auto">
        {/* Brand & Air-Gap Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-md flex items-center justify-center font-bold text-black text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            TL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-widest uppercase text-gray-300">
                local-linux-ai-lab <span className="text-cyan-500">v1.0</span>
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/80 flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" /> Air-Gapped Local
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 font-mono mt-0.5">
              <span>Sverrir Arason</span>
              <span className="text-gray-600">•</span>
              <span className="text-cyan-400 font-mono text-[11px]">
                {activeDistro === 'debian' ? 'debian-sandbox-pod (Ubuntu 24.04)' : 'redhat-sandbox-pod (AlmaLinux 9)'}
              </span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-[#2A2A2E]">
          <button
            id="tab-query-assistant"
            onClick={() => setActiveTab('query')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'query'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Assistant</span>
          </button>

          <button
            id="tab-rag-vector-store"
            onClick={() => setActiveTab('rag')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'rag'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>RAG Store ({documentCount})</span>
          </button>

          <button
            id="tab-jenkins-pipeline"
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'pipeline'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Jenkins / MLOps</span>
            {pipelineStatus && (
              <span
                className={`w-2 h-2 rounded-full ${
                  pipelineStatus.status === 'SUCCESS'
                    ? 'bg-green-500 shadow-[0_0_8px_#22c55e]'
                    : 'bg-amber-400'
                }`}
              />
            )}
          </button>

          <button
            id="tab-underlying-systems"
            onClick={() => setActiveTab('systems')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'systems'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Underlying Systems</span>
          </button>
        </div>

        {/* Action Controls & Distro Switcher */}
        <div className="flex items-center gap-2">
          {/* API Key Settings Button */}
          <button
            id="btn-api-key-modal"
            onClick={() => setShowApiKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono tracking-wider transition-colors ${
              hasApiKey
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/40 border-amber-800/50 text-amber-300 hover:bg-amber-900/40'
            }`}
            title="Configure Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>{hasApiKey ? 'API Key Set' : 'Air-Gapped / Key'}</span>
          </button>

          {/* Desktop App Packaging Info Button */}
          <button
            id="btn-desktop-packaging-modal"
            onClick={() => setShowDesktopModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-300 text-xs font-mono tracking-wider transition-colors"
            title="Build Standalone Desktop Packages (Electron)"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span>Desktop Builds</span>
          </button>

          {/* Quick Distro Switcher Pill */}
          <div className="flex items-center bg-black/60 p-1 rounded-lg border border-[#2A2A2E]">
            <button
              id="distro-btn-debian"
              onClick={() => onDistroChange('debian')}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeDistro === 'debian'
                  ? 'bg-[#2A2A2E] text-white border border-rose-500/50'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Debian / Ubuntu
            </button>
            <button
              id="distro-btn-redhat"
              onClick={() => onDistroChange('redhat')}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeDistro === 'redhat'
                  ? 'bg-[#2A2A2E] text-white border border-amber-500/50'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Red Hat / RHEL
            </button>
          </div>
        </div>
      </div>

      {/* Gemini API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#16161A] border border-[#2A2A2E] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-gray-200 relative">
            <button
              id="close-api-key-modal"
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2A2A2E] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-950/80 border border-cyan-800 rounded-lg">
                <Key className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Gemini API Key Configuration
                </h2>
                <p className="text-xs text-gray-400">
                  Optional key for generative AI logic. Leave empty to use local Air-Gapped RAG.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400">
                Gemini API Key
              </label>
              <input
                id="input-gemini-api-key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-black/60 border border-[#2A2A2E] focus:border-cyan-500 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                When specified, the backend will query Gemini 3.6 Flash. When omitted or air-gapped, the app relies on local RAG man-page vector embeddings and distro-aware rule engines.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-cyan-400">
                {savedSuccess ? 'Saved successfully!' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="btn-cancel-api-key"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-mono text-gray-400 hover:bg-[#2A2A2E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-api-key"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 rounded-lg text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-black font-semibold transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop App Packaging Modal */}
      {showDesktopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#16161A] border border-[#2A2A2E] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-gray-200 relative">
            <button
              id="close-desktop-modal"
              onClick={() => setShowDesktopModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2A2A2E] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-950/80 border border-cyan-800 rounded-lg">
                <Monitor className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Standalone Desktop Packages (Electron)
                </h2>
                <p className="text-xs text-gray-400">
                  Build native desktop installers for Windows, macOS, and Linux from source.
                </p>
              </div>
            </div>

            <div className="bg-[#0D0D0F] border border-[#2A2A2E] rounded-lg p-4 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-gray-400 border-b border-[#2A2A2E] pb-2 mb-2">
                <span>Application: <strong className="text-cyan-400 font-normal">local-linux-ai-lab</strong></span>
                <span>Author: <strong className="text-gray-200 font-normal">Sverrir Arason</strong></span>
              </div>
              <div className="text-gray-400 flex items-center gap-2">
                <span>GitHub Repository:</span>
                <a
                  href="https://github.com/samarason/local-linux-ai-lab.git"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  https://github.com/samarason/local-linux-ai-lab.git <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Packaging Build Scripts
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {desktopCommands.map((item) => (
                  <div
                    key={item.cmd}
                    className="flex items-center justify-between p-3 bg-[#0D0D0F] border border-[#2A2A2E] rounded-lg hover:border-cyan-800/60 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-200">{item.label}</div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5">{item.target}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(item.cmd)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2E] hover:bg-cyan-950 text-cyan-300 rounded text-xs font-mono transition-colors border border-cyan-900/40"
                    >
                      {copiedCmd === item.cmd ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{item.cmd}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDesktopModal(false)}
                className="px-4 py-2 bg-[#2A2A2E] hover:bg-gray-700 text-white text-xs rounded-lg font-medium transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

