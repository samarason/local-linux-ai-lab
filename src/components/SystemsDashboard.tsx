import React, { useState, useEffect } from 'react';
import {
  Server,
  Layers,
  Database,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Copy,
  Check,
  Play,
  Filter,
  Radio,
  Clock,
  ExternalLink,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { SystemHealthStatus, K3sPodInfo, SystemLogEntry, JenkinsPipelineRun, MLModelMetrics } from '../types';

interface SystemsDashboardProps {
  pipelineRun: JenkinsPipelineRun | null;
  modelMetrics: MLModelMetrics | null;
  onTriggerJenkins: () => Promise<void>;
}

export const SystemsDashboard: React.FC<SystemsDashboardProps> = ({
  pipelineRun,
  modelMetrics,
  onTriggerJenkins,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'k3s' | 'jenkins' | 'chroma' | 'logs'>('k3s');
  
  // Health Overview state
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus | null>(null);
  
  // K3s Pods state
  const [pods, setPods] = useState<K3sPodInfo[]>([]);
  const [selectedPodForLogs, setSelectedPodForLogs] = useState<string | null>(null);
  const [restartingPodId, setRestartingPodId] = useState<string | null>(null);

  // Kubectl interactive output simulation
  const [kubectlCommand, setKubectlCommand] = useState<string>('kubectl get pods -A -o wide');
  const [kubectlOutput, setKubectlOutput] = useState<string>('');

  // System Logs state
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [selectedLogService, setSelectedLogService] = useState<string>('all');
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('ALL');
  const [logFilterQuery, setLogFilterQuery] = useState<string>('');
  const [isCopiedLogs, setIsCopiedLogs] = useState(false);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Chroma Vector Query Simulator state
  const [vectorQueryText, setVectorQueryText] = useState('netplan yaml configuration ufw rules');
  const [vectorResults, setVectorResults] = useState<any[]>([]);
  const [isQueryingVector, setIsQueryingVector] = useState(false);

  // Fetch initial data
  const loadSystemOverview = () => {
    fetch('/api/system/overview')
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch((err) => console.error('Failed to load system health:', err));

    fetch('/api/system/k3s/pods')
      .then((res) => res.json())
      .then((data) => setPods(data))
      .catch((err) => console.error('Failed to load K3s pods:', err));

    loadSystemLogs('all');
  };

  const loadSystemLogs = (service: string) => {
    setIsRefreshingLogs(true);
    fetch(`/api/system/logs?service=${service}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setIsRefreshingLogs(false);
      })
      .catch((err) => {
        console.error('Failed to load system logs:', err);
        setIsRefreshingLogs(false);
      });
  };

  const normalizeService = (s: string): string => {
    if (!s) return 'all';
    const lower = s.toLowerCase();
    if (lower.includes('debian')) return 'debian-sandbox-pod';
    if (lower.includes('redhat')) return 'redhat-sandbox-pod';
    if (lower.includes('jenkins')) return 'jenkins';
    if (lower.includes('chroma')) return 'chromadb';
    if (lower.includes('mlflow')) return 'mlflow';
    if (lower.includes('k3s')) return 'k3s';
    return lower;
  };

  useEffect(() => {
    loadSystemOverview();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      loadSystemLogs(selectedLogService);
    }
  }, [activeSubTab]);

  // Handle pod restart
  const handleRestartPod = async (podId: string) => {
    setRestartingPodId(podId);
    try {
      const res = await fetch(`/api/system/k3s/pod/${podId}/restart`, { method: 'POST' });
      const data = await res.json();
      if (data.pods) {
        setPods(data.pods);
      }
    } catch (err) {
      console.error('Failed to restart pod:', err);
    } finally {
      setRestartingPodId(null);
    }
  };

  // Run Kubectl preset commands
  const handleRunKubectl = (cmd: string) => {
    setKubectlCommand(cmd);
    if (cmd.includes('get pods')) {
      let output = `NAMESPACE   NAME                             READY   STATUS    RESTARTS   AGE     IP            NODE\n`;
      pods.forEach((pod) => {
        output += `${pod.namespace.padEnd(11)} ${pod.name.padEnd(32)} 1/1     ${pod.status.padEnd(9)} ${String(
          pod.restarts
        ).padEnd(10)} ${pod.age.padEnd(7)} ${pod.ip.padEnd(13)} ${pod.node}\n`;
      });
      setKubectlOutput(output);
    } else if (cmd.includes('top nodes') || cmd.includes('top node')) {
      setKubectlOutput(
        `NAME               CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%\nk3s-control-plane   162m         4%     2170Mi          13%`
      );
    } else if (cmd.includes('cluster-info')) {
      setKubectlOutput(
        `Kubernetes control plane is running at https://127.0.0.1:6443\nCoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\nMetrics-server is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/https:metrics-server:https/proxy`
      );
    } else if (cmd.includes('top pods')) {
      let output = `NAMESPACE   NAME                             CPU(cores)   MEMORY(bytes)\n`;
      pods.forEach((pod) => {
        output += `${pod.namespace.padEnd(11)} ${pod.name.padEnd(32)} ${pod.cpuUsage.split(' ')[0].padEnd(12)} ${pod.memoryUsage}\n`;
      });
      setKubectlOutput(output);
    } else {
      setKubectlOutput(`Execute: ${cmd}\nCommand executed successfully in K3s control plane context.`);
    }
  };

  useEffect(() => {
    handleRunKubectl(kubectlCommand);
  }, [pods]);

  // Vector Query simulation
  const handleSimulateVectorQuery = () => {
    setIsQueryingVector(true);
    setTimeout(() => {
      setVectorResults([
        {
          id: 'chunk-netplan-1',
          docTitle: 'Ubuntu Netplan Manual (netplan.5)',
          distroTag: 'debian',
          score: 0.942,
          content: 'network:\n  version: 2\n  ethernets:\n    eth0:\n      dhcp4: true\n      addresses: [192.168.1.100/24]',
        },
        {
          id: 'chunk-ufw-2',
          docTitle: 'UFW Firewall Administration (ufw.8)',
          distroTag: 'debian',
          score: 0.887,
          content: 'ufw default deny incoming\nufw allow 22/tcp\nufw allow 80/tcp\nufw enable',
        },
        {
          id: 'chunk-nmcli-1',
          docTitle: 'RHEL NetworkManager CLI (nmcli.1)',
          distroTag: 'redhat',
          score: 0.764,
          content: 'nmcli device status\nnmcli connection add type ethernet con-name eth0 ifname eth0 ip4 192.168.1.100/24',
        },
      ]);
      setIsQueryingVector(false);
    }, 400);
  };

  // Copy logs helper
  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.service}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setIsCopiedLogs(true);
    setTimeout(() => setIsCopiedLogs(false), 2000);
  };

  // Filter logs safely
  const filteredLogs = Array.isArray(logs)
    ? logs.filter((l) => {
        if (selectedLogService !== 'all' && normalizeService(l.service) !== normalizeService(selectedLogService))
          return false;
        if (selectedLogLevel !== 'ALL' && l.level !== selectedLogLevel) return false;
        if (logFilterQuery && !l.message.toLowerCase().includes(logFilterQuery.toLowerCase())) return false;
        return true;
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Overview System Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* K3s Card */}
        <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/80">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">K3s Kubernetes</h3>
                <p className="text-[10px] text-gray-500 font-mono">Cluster Control Plane</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-green-400 bg-green-950/40 border border-green-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Healthy
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-gray-400 border-t border-[#2A2A2E]/60 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Version:</span>
              <span className="text-cyan-400">{healthStatus?.k3s.version || 'v1.30.2+k3s1'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Pods:</span>
              <span className="text-gray-200">{healthStatus?.k3s.podsCount || 5} pods running</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">CPU Usage:</span>
              <span className="text-gray-300">{healthStatus?.k3s.cpuTotal || '4.1%'}</span>
            </div>
          </div>
        </div>

        {/* Jenkins Card */}
        <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/80">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Jenkins CI/CD</h3>
                <p className="text-[10px] text-gray-500 font-mono">Automation Webhook Engine</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-green-400 bg-green-950/40 border border-green-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-gray-400 border-t border-[#2A2A2E]/60 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Job Endpoint:</span>
              <span className="text-blue-400 font-semibold truncate max-w-[130px]" title="linux-assistant">
                /job/linux-assistant
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Build:</span>
              <span className="text-gray-200">#{pipelineRun?.buildNumber || 104} (SUCCESS)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Executors:</span>
              <span className="text-gray-300">2 Idle</span>
            </div>
          </div>
        </div>

        {/* ChromaDB Card */}
        <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/80">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">ChromaDB Vector</h3>
                <p className="text-[10px] text-gray-500 font-mono">RAG Embeddings Index</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-purple-400 bg-purple-950/40 border border-purple-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /> Ready
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-gray-400 border-t border-[#2A2A2E]/60 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Collection:</span>
              <span className="text-purple-400">{healthStatus?.chroma.collection || 'linux_manual_rag'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vector Metric:</span>
              <span className="text-gray-200">384-dim (Cosine)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stored Chunks:</span>
              <span className="text-gray-300">{healthStatus?.chroma.vectorsCount || 24} indexed</span>
            </div>
          </div>
        </div>

        {/* MLflow Card */}
        <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">MLflow MLOps</h3>
                <p className="text-[10px] text-gray-500 font-mono">Model Metrics Registry</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
            </span>
          </div>
          <div className="space-y-1 font-mono text-[11px] text-gray-400 border-t border-[#2A2A2E]/60 pt-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Model Version:</span>
              <span className="text-emerald-400 font-semibold">{modelMetrics?.version || 'v2.4.0-distro-rag'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Accuracy / Loss:</span>
              <span className="text-gray-200">
                {((modelMetrics?.accuracy || 0.984) * 100).toFixed(1)}% ({modelMetrics?.loss || 0.021})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dataset Size:</span>
              <span className="text-gray-300">{modelMetrics?.datasetSize || 1420} queries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-[#2A2A2E]">
          <button
            id="subtab-k3s-pods"
            onClick={() => setActiveSubTab('k3s')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
              activeSubTab === 'k3s'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>K3s Pods & Topology</span>
          </button>

          <button
            id="subtab-jenkins-system"
            onClick={() => setActiveSubTab('jenkins')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
              activeSubTab === 'jenkins'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Jenkins Automation Engine</span>
          </button>

          <button
            id="subtab-chroma-vector"
            onClick={() => setActiveSubTab('chroma')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
              activeSubTab === 'chroma'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            <span>ChromaDB RAG Engine</span>
          </button>

          <button
            id="subtab-system-logs"
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-[#2A2A2E] text-white border border-cyan-500/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unified System Logs ({logs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 pr-2">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>Real-time Telemetry Active</span>
        </div>
      </div>

      {/* SUBTAB 1: K3s Cluster Pods & Kubectl View */}
      {activeSubTab === 'k3s' && (
        <div className="space-y-4">
          {/* K3s Pods Table */}
          <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200 flex items-center gap-2 font-mono">
                  <Server className="w-4 h-4 text-cyan-400" />
                  K3s Cluster Active Pod Topology
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Namespace: default, ci-cd, mlops • Control Plane Node: k3s-control-plane
                </p>
              </div>
              <button
                onClick={loadSystemOverview}
                className="bg-[#2A2A2E] hover:bg-[#3A3A3F] text-gray-300 px-3 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" /> Refresh Pods
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs text-gray-300">
                <thead>
                  <tr className="bg-black/60 border-b border-[#2A2A2E] text-[10px] uppercase text-gray-500 tracking-wider">
                    <th className="py-2.5 px-3">Pod Name</th>
                    <th className="py-2.5 px-3">Namespace</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Restarts</th>
                    <th className="py-2.5 px-3">Age</th>
                    <th className="py-2.5 px-3">Pod IP</th>
                    <th className="py-2.5 px-3">CPU / Mem</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2E]/50">
                  {pods.map((pod) => (
                    <tr key={pod.id} className="hover:bg-[#18181C] transition-colors">
                      <td className="py-3 px-3 font-semibold text-gray-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        {pod.name}
                      </td>
                      <td className="py-3 px-3 text-gray-400">
                        <span className="bg-black px-2 py-0.5 rounded border border-[#2A2A2E] text-[10px]">
                          {pod.namespace}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-green-950/40 text-green-400 border border-green-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> {pod.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-400">{pod.restarts}</td>
                      <td className="py-3 px-3 text-gray-400">{pod.age}</td>
                      <td className="py-3 px-3 text-cyan-400 text-[11px]">{pod.ip}</td>
                      <td className="py-3 px-3 text-gray-400 text-[11px]">
                        {pod.cpuUsage} | {pod.memoryUsage}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedLogService(pod.name);
                              setActiveSubTab('logs');
                              loadSystemLogs(pod.name);
                            }}
                            className="text-[10px] bg-black hover:bg-gray-800 text-cyan-400 border border-cyan-800/80 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Logs
                          </button>
                          <button
                            onClick={() => handleRestartPod(pod.id)}
                            disabled={restartingPodId === pod.id}
                            className="text-[10px] bg-black hover:bg-rose-950/60 text-rose-400 border border-rose-900/80 px-2.5 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RotateCw
                              className={`w-3 h-3 ${restartingPodId === pod.id ? 'animate-spin' : ''}`}
                            />
                            Restart
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Kubectl Terminal Inspector */}
          <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A2A2E] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200 font-mono">
                  Kubectl Cluster CLI Inspector
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleRunKubectl('kubectl get pods -A -o wide')}
                  className="text-[10px] font-mono bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  get pods -A
                </button>
                <button
                  onClick={() => handleRunKubectl('kubectl top pods')}
                  className="text-[10px] font-mono bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  top pods
                </button>
                <button
                  onClick={() => handleRunKubectl('kubectl top nodes')}
                  className="text-[10px] font-mono bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  top nodes
                </button>
                <button
                  onClick={() => handleRunKubectl('kubectl cluster-info')}
                  className="text-[10px] font-mono bg-black hover:bg-[#2A2A2E] text-gray-300 border border-[#2A2A2E] px-2.5 py-1 rounded transition-colors cursor-pointer"
                >
                  cluster-info
                </button>
              </div>
            </div>

            <div className="bg-black border border-[#2A2A2E] rounded p-3 font-mono text-xs text-cyan-300 space-y-2">
              <div className="flex items-center gap-2 text-gray-400 text-[11px] border-b border-[#2A2A2E] pb-2">
                <span className="text-green-400 font-bold">root@k3s-control-plane:~#</span>
                <span className="text-white font-semibold">{kubectlCommand}</span>
              </div>
              <pre className="text-gray-300 text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                {kubectlOutput}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Jenkins Engine View */}
      {activeSubTab === 'jenkins' && (
        <div className="space-y-4">
          <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200 flex items-center gap-2 font-mono">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Jenkins Master CI/CD Controller
                  </h3>
                  <span className="text-[10px] bg-black text-blue-400 px-2 py-0.5 rounded border border-blue-900 font-mono">
                    v2.452.1 LTS
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Job Pipeline: /job/linux-assistant/build • Webhook HTTP Trigger Enabled
                </p>
              </div>

              <button
                onClick={onTriggerJenkins}
                className="bg-blue-600 hover:bg-blue-500 text-black font-bold px-4 py-1.5 rounded text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Trigger Pipeline Build</span>
              </button>
            </div>

            {/* Build Detail Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-black/60 border border-[#2A2A2E] p-3 rounded space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase">Active Build ID</span>
                <div className="text-sm font-bold text-gray-200 font-mono flex items-center gap-2">
                  <span className="text-cyan-400">#{pipelineRun?.buildNumber || 104}</span>
                  <span className="text-[10px] bg-green-950 text-green-400 border border-green-800 px-2 py-0.5 rounded uppercase">
                    {pipelineRun?.status || 'SUCCESS'}
                  </span>
                </div>
              </div>

              <div className="bg-black/60 border border-[#2A2A2E] p-3 rounded space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase">Trigger Origin</span>
                <div className="text-xs font-mono text-gray-300 truncate" title={pipelineRun?.triggeredBy}>
                  {pipelineRun?.triggeredBy || 'Manual Webhook Trigger'}
                </div>
              </div>

              <div className="bg-black/60 border border-[#2A2A2E] p-3 rounded space-y-1">
                <span className="text-[10px] font-mono text-gray-500 uppercase">Total Execution Time</span>
                <div className="text-sm font-bold text-gray-200 font-mono flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-500" />
                  {pipelineRun?.duration || '35s'}
                </div>
              </div>
            </div>

            {/* Pipeline Stages Execution Progress */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-2">
                Jenkins Stage Orchestration Graph
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {pipelineRun?.stages.map((stg, i) => (
                  <div key={i} className="bg-black border border-[#2A2A2E] p-3 rounded flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-gray-600">Stage 0{i + 1}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <strong className="text-xs text-gray-200 font-mono font-medium mb-1">{stg.name}</strong>
                    <span className="text-[10px] text-cyan-400 font-mono">{stg.duration}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Jenkins Console Log Stream */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                Raw Console Output Stream (/var/jenkins_home/workspace)
              </h4>
              <div className="bg-black border border-[#2A2A2E] rounded p-3 font-mono text-xs space-y-1 max-h-56 overflow-y-auto">
                {pipelineRun?.logs.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-3 leading-relaxed">
                    <span className="text-gray-700 text-[10px] select-none">{idx + 1}</span>
                    <span
                      className={
                        line.includes('SUCCESS')
                          ? 'text-green-400 font-medium'
                          : line.includes('INFO')
                            ? 'text-gray-300'
                            : 'text-amber-300'
                      }
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ChromaDB Vector Engine View */}
      {activeSubTab === 'chroma' && (
        <div className="space-y-4">
          <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2A2E] pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200 flex items-center gap-2 font-mono">
                  <Database className="w-4 h-4 text-purple-400" />
                  ChromaDB Local Vector Engine & Embedding Store
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Host: http://localhost:8000 • Distance Metric: Cosine • Embedding Dimensions: 384
                </p>
              </div>
              <span className="bg-purple-950/60 text-purple-400 border border-purple-800 text-[10px] font-mono font-bold px-2.5 py-1 rounded">
                Collection: linux_manual_rag
              </span>
            </div>

            {/* Vector Query Inspector Input */}
            <div className="bg-black/60 border border-[#2A2A2E] p-3 rounded space-y-2">
              <label className="text-[11px] font-mono text-gray-300 font-bold block">
                Simulate Semantic RAG Vector Query
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vectorQueryText}
                  onChange={(e) => setVectorQueryText(e.target.value)}
                  placeholder="Enter Linux concept or query..."
                  className="flex-1 bg-black border border-[#2A2A2E] rounded px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSimulateVectorQuery}
                  disabled={isQueryingVector}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono px-4 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isQueryingVector ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Query Vectors</span>
                </button>
              </div>
            </div>

            {/* Query Results Vector Chunks */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                Top Retained Vector Chunks (K=3 Nearest Neighbors)
              </h4>

              {vectorResults.length === 0 ? (
                <div className="bg-black/40 border border-[#2A2A2E] p-4 text-center text-xs font-mono text-gray-500 rounded">
                  Click "Query Vectors" above to test vector distance score calculation over local ChromaDB chunks.
                </div>
              ) : (
                <div className="space-y-2">
                  {vectorResults.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="bg-black border border-[#2A2A2E] p-3 rounded space-y-1.5 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-cyan-400 font-semibold">{chunk.docTitle}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-black border border-[#2A2A2E] px-2 py-0.5 rounded text-[10px] text-gray-400 uppercase">
                            Distro: {chunk.distroTag}
                          </span>
                          <span className="bg-green-950 text-green-400 border border-green-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Score: {(chunk.score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <pre className="text-gray-300 text-[11px] bg-[#111114] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {chunk.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: Unified Live System Logs Console */}
      {activeSubTab === 'logs' && (
        <div className="bg-[#111114] border border-[#2A2A2E] rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2A2A2E] pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-200 font-mono">
                  Unified Air-Gapped System Logs Streamer
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Collecting events across K3s Server, Sandbox Pods, Jenkins, ChromaDB & MLflow
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => loadSystemLogs(selectedLogService)}
                className="bg-[#2A2A2E] hover:bg-[#3A3A3F] text-gray-300 px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleCopyLogs}
                className="bg-[#2A2A2E] hover:bg-[#3A3A3F] text-gray-300 px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopiedLogs ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedLogs ? 'Copied!' : 'Copy Logs'}</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-black/60 p-2.5 rounded border border-[#2A2A2E]">
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Service Component</label>
              <select
                value={selectedLogService}
                onChange={(e) => {
                  setSelectedLogService(e.target.value);
                  loadSystemLogs(e.target.value);
                }}
                className="w-full bg-black border border-[#2A2A2E] text-xs font-mono text-gray-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Services</option>
                <option value="k3s">K3s Server</option>
                <option value="debian-sandbox-pod">debian-sandbox-pod</option>
                <option value="redhat-sandbox-pod">redhat-sandbox-pod</option>
                <option value="jenkins">Jenkins CI/CD</option>
                <option value="chromadb">ChromaDB Engine</option>
                <option value="mlflow">MLflow Registry</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Log Level</label>
              <select
                value={selectedLogLevel}
                onChange={(e) => setSelectedLogLevel(e.target.value)}
                className="w-full bg-black border border-[#2A2A2E] text-xs font-mono text-gray-300 rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Search Keywords</label>
              <div className="relative">
                <input
                  type="text"
                  value={logFilterQuery}
                  onChange={(e) => setLogFilterQuery(e.target.value)}
                  placeholder="Filter logs..."
                  className="w-full bg-black border border-[#2A2A2E] text-xs font-mono text-gray-300 rounded pl-7 pr-2.5 py-1 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2" />
              </div>
            </div>
          </div>

          {/* Console Log Buffer */}
          <div className="bg-black border border-[#2A2A2E] rounded p-3 font-mono text-xs space-y-1.5 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-6 text-xs">No log entries matched selected filters.</div>
            ) : (
              filteredLogs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2.5 leading-relaxed border-b border-gray-900/60 pb-1">
                  <span className="text-gray-600 text-[10px] select-none whitespace-nowrap pt-0.5">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>

                  <span className="bg-[#16161A] text-gray-400 border border-[#2A2A2E] text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                    {entry.service}
                  </span>

                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                      entry.level === 'SUCCESS'
                        ? 'bg-green-950/60 text-green-400 border border-green-800'
                        : entry.level === 'ERROR'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                          : entry.level === 'WARN'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                            : 'bg-blue-950/60 text-blue-400 border border-blue-800'
                    }`}
                  >
                    {entry.level}
                  </span>

                  <span className="text-gray-300 text-[11px] flex-1 break-all">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
