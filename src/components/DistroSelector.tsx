import React from 'react';
import { DistroFamily } from '../types';
import { Server, Package, ShieldCheck, Network, Settings } from 'lucide-react';

interface DistroSelectorProps {
  activeDistro: DistroFamily;
  onSelectDistro: (distro: DistroFamily) => void;
}

export const DistroSelector: React.FC<DistroSelectorProps> = ({
  activeDistro,
  onSelectDistro,
}) => {
  return (
    <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Target Distribution Family
        </h2>
        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500">
          K3s Pod Isolation
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Debian Card */}
        <button
          id="select-debian-family"
          onClick={() => onSelectDistro('debian')}
          className={`text-left p-3.5 rounded-lg border transition-all relative overflow-hidden group ${
            activeDistro === 'debian'
              ? 'bg-[#16161A] border-cyan-500/60 text-white shadow-lg shadow-cyan-950/20'
              : 'bg-black/40 border-[#2A2A2E] hover:border-[#3A3A3F] text-gray-400 hover:text-gray-200'
          }`}
        >
          {activeDistro === 'debian' && (
            <div className="absolute top-0 right-0 bg-cyan-600 text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-bl tracking-wider">
              Active Pod
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded bg-cyan-950/50 border border-cyan-800/80 flex items-center justify-center text-cyan-400 font-extrabold text-xs font-mono">
              Deb
            </div>
            <div>
              <h3 className="font-semibold text-xs tracking-wide text-gray-200">Debian / Ubuntu Family</h3>
              <p className="text-[10px] text-gray-500 font-mono">Ubuntu 24.04 LTS, Debian 12</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] mt-3 pt-2 border-t border-[#2A2A2E] font-mono">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Package className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>
                Pkg: <strong className="text-cyan-300">apt</strong> / dpkg
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>
                FW: <strong className="text-cyan-300">ufw</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Settings className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>
                Sec: <strong className="text-cyan-300">AppArmor</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Network className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>
                Net: <strong className="text-cyan-300">Netplan</strong>
              </span>
            </div>
          </div>
        </button>

        {/* Red Hat Card */}
        <button
          id="select-redhat-family"
          onClick={() => onSelectDistro('redhat')}
          className={`text-left p-3.5 rounded-lg border transition-all relative overflow-hidden group ${
            activeDistro === 'redhat'
              ? 'bg-[#16161A] border-amber-500/60 text-white shadow-lg shadow-amber-950/20'
              : 'bg-black/40 border-[#2A2A2E] hover:border-[#3A3A3F] text-gray-400 hover:text-gray-200'
          }`}
        >
          {activeDistro === 'redhat' && (
            <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-bl tracking-wider">
              Active Pod
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded bg-amber-950/50 border border-amber-800/80 flex items-center justify-center text-amber-400 font-extrabold text-xs font-mono">
              RHEL
            </div>
            <div>
              <h3 className="font-semibold text-xs tracking-wide text-gray-200">Red Hat / RHEL Family</h3>
              <p className="text-[10px] text-gray-500 font-mono">RHEL 9, AlmaLinux, Fedora</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] mt-3 pt-2 border-t border-[#2A2A2E] font-mono">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Package className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                Pkg: <strong className="text-amber-300">dnf</strong> / rpm
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                FW: <strong className="text-amber-300">firewalld</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Settings className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                Sec: <strong className="text-amber-300">SELinux</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Network className="w-3 h-3 text-amber-400 shrink-0" />
              <span>
                Net: <strong className="text-amber-300">nmcli</strong>
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
