import React, { useState, useRef, useEffect } from 'react';
import { DistroFamily, TerminalEntry } from '../types';
import { Terminal, Play, RotateCcw, AlertCircle, Sparkles, Check, Server, Download, Copy } from 'lucide-react';

interface TerminalPodProps {
  activeDistro: DistroFamily;
  onDistroChange: (distro: DistroFamily) => void;
  entries: TerminalEntry[];
  onExecuteCommand: (cmd: string) => void;
  onClearTerminal: () => void;
  onDebugError: (entry: TerminalEntry) => void;
  isDebugging: boolean;
}

export const TerminalPod: React.FC<TerminalPodProps> = ({
  activeDistro,
  onDistroChange,
  entries,
  onExecuteCommand,
  onClearTerminal,
  onDebugError,
  isDebugging,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const activePodName =
    activeDistro === 'debian' ? 'debian-sandbox-pod' : 'redhat-sandbox-pod';
  const promptSymbol = `root@${activePodName}:~#`;

  // Auto-scroll terminal on new entry
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    onExecuteCommand(commandInput.trim());
    setCommandInput('');
  };

  const handleQuickCommand = (cmd: string) => {
    onExecuteCommand(cmd);
  };

  return (
    <div className="bg-black border border-[#2A2A2E] rounded-xl flex flex-col h-full min-h-[580px] shadow-2xl overflow-hidden">
      {/* Terminal Pod Header */}
      <div className="bg-[#111114] border-b border-[#2A2A2E] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Pod Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black p-1 rounded-lg border border-[#2A2A2E] font-mono text-xs">
            <button
              id="pod-tab-debian"
              onClick={() => onDistroChange('debian')}
              className={`px-2.5 py-1 rounded font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeDistro === 'debian'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              debian-sandbox-pod
            </button>

            <button
              id="pod-tab-redhat"
              onClick={() => onDistroChange('redhat')}
              className={`px-2.5 py-1 rounded font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeDistro === 'redhat'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              redhat-sandbox-pod
            </button>
          </div>
        </div>

        {/* Pod Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-500 text-[10px] hidden sm:inline font-mono">
            {activeDistro === 'debian' ? 'Ubuntu 24.04 LTS' : 'AlmaLinux 9.4'}
          </span>

          <button
            id="clear-terminal-btn"
            onClick={onClearTerminal}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded bg-[#2A2A2E]/50 hover:bg-[#2A2A2E] border border-[#3A3A3F] transition-colors cursor-pointer"
            title="Clear terminal buffer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Chips Bar */}
      <div className="bg-[#16161A] border-b border-[#2A2A2E] px-4 py-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
        <span className="text-gray-500 uppercase font-bold mr-1">Quick Run:</span>
        <button
          onClick={() => handleQuickCommand('cat /etc/os-release')}
          className="bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          os-release
        </button>
        <button
          onClick={() => handleQuickCommand('ip addr show eth0')}
          className="bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          ip addr
        </button>
        <button
          onClick={() =>
            handleQuickCommand(
              activeDistro === 'debian' ? 'aa-status' : 'sestatus'
            )
          }
          className="bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          {activeDistro === 'debian' ? 'aa-status' : 'sestatus'}
        </button>
        <button
          onClick={() =>
            handleQuickCommand(
              activeDistro === 'debian' ? 'ufw status' : 'firewall-cmd --state'
            )
          }
          className="bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          {activeDistro === 'debian' ? 'ufw status' : 'firewall-cmd'}
        </button>
        <button
          onClick={() => handleQuickCommand('systemctl status')}
          className="bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          systemctl
        </button>
      </div>

      {/* Terminal Buffer Scroll Area */}
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-3 selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Welcome Banner */}
        <div className="text-gray-500 border-b border-[#2A2A2E] pb-3 leading-relaxed">
          <p className="text-green-400 font-bold">
            K3s Pod Shell Session Initialized: [{activePodName}]
          </p>
          <p>Distribution: {activeDistro === 'debian' ? 'Debian/Ubuntu (x86_64)' : 'Red Hat Enterprise Linux / AlmaLinux 9'}</p>
          <p>Package Manager: {activeDistro === 'debian' ? 'apt / dpkg' : 'dnf / rpm'}</p>
          <p className="text-gray-600">Type &apos;help&apos; to view supported commands or enter any bash syntax.</p>
        </div>

        {/* Terminal History Entries */}
        {entries
          .filter((e) => e.podId === activePodName)
          .map((entry) => (
            <div key={entry.id} className="space-y-1">
              {/* Command Prompt Line */}
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-green-400 font-bold">{promptSymbol}</span>
                <span className="text-gray-100 font-semibold">{entry.command}</span>
              </div>

              {/* Stdout Output */}
              {entry.stdout && (
                <div className="text-gray-300 whitespace-pre-wrap pl-2 border-l-2 border-[#2A2A2E] leading-relaxed">
                  {entry.stdout}
                </div>
              )}

              {/* Stderr Output with AI Debug Trigger */}
              {entry.stderr && (
                <div className="bg-rose-950/40 border border-rose-800 rounded p-2.5 my-1 space-y-2">
                  <div className="text-rose-300 whitespace-pre-wrap font-mono flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{entry.stderr}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-rose-900/60">
                    <span className="text-[10px] text-rose-400 font-bold uppercase font-mono">
                      Command Exit Code: {entry.exitCode}
                    </span>
                    <button
                      id={`debug-btn-${entry.id}`}
                      onClick={() => onDebugError(entry)}
                      disabled={isDebugging}
                      className="bg-rose-500 hover:bg-rose-400 text-black font-bold px-2.5 py-1 rounded text-[10px] uppercase font-mono flex items-center gap-1 shadow transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 fill-black" />
                      <span>Debug Error with AI</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

        <div ref={terminalEndRef} />
      </div>

      {/* Input Prompt Form */}
      <form onSubmit={handleSubmit} className="bg-[#111114] border-t border-[#2A2A2E] p-2.5 flex items-center gap-2">
        <span className="text-green-400 font-mono font-bold text-xs pl-2 shrink-0">
          {promptSymbol}
        </span>
        <input
          id="terminal-command-input"
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder={`Type command for ${activePodName}...`}
          className="flex-1 bg-transparent text-gray-100 font-mono text-xs focus:outline-none placeholder-gray-600"
        />
        <button
          id="submit-terminal-cmd-btn"
          type="submit"
          className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3 py-1.5 rounded text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3 fill-black" />
          <span>Execute</span>
        </button>
      </form>
    </div>
  );
};
