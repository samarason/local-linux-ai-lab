export type DistroFamily = 'debian' | 'redhat';

export type DistroTag = 'debian' | 'redhat' | 'universal';

export interface PodState {
  id: 'debian-sandbox-pod' | 'redhat-sandbox-pod';
  name: string;
  distroFamily: DistroFamily;
  osRelease: string;
  packageManager: string;
  defaultFirewall: string;
  securityModule: string;
  networkManager: string;
  status: 'running' | 'restarting' | 'stopped';
  ipAddress: string;
  uptime: string;
}

export interface AssistantResponse {
  targetDistro: DistroFamily;
  suggestedCommand: string;
  breakdown: string;
  alternativeSyntax: string;
  safetyWarning: string;
  retrievedDocs?: RAGChunk[];
}

export interface RAGDocument {
  id: string;
  title: string;
  source: string;
  distroTag: DistroTag;
  chunkCount: number;
  content: string;
  createdAt: string;
  fileSize: string;
}

export interface RAGChunk {
  id: string;
  docId: string;
  docTitle: string;
  distroTag: DistroTag;
  content: string;
  score?: number;
}

export interface JenkinsPipelineRun {
  id: string;
  jobName: string;
  buildNumber: number;
  status: 'SUCCESS' | 'IN_PROGRESS' | 'FAILED' | 'PENDING';
  startTime: string;
  duration: string;
  triggeredBy: string;
  stages: {
    name: string;
    status: 'SUCCESS' | 'IN_PROGRESS' | 'FAILED' | 'PENDING' | 'SKIPPED';
    duration: string;
  }[];
  logs: string[];
}

export interface MLModelMetrics {
  version: string;
  accuracy: number;
  f1Score: number;
  loss: number;
  datasetSize: number;
  lastRetrained: string;
  lossHistory: { epoch: number; loss: number; accuracy: number }[];
}

export interface TerminalEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: string;
  cwd: string;
  podId: 'debian-sandbox-pod' | 'redhat-sandbox-pod';
}

export interface K3sPodInfo {
  id: string;
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'ContainerCreating' | 'Terminating' | 'Restarting';
  restarts: number;
  age: string;
  ip: string;
  node: string;
  cpuUsage: string;
  memoryUsage: string;
}

export interface SystemHealthStatus {
  k3s: { status: 'healthy' | 'degraded'; version: string; podsCount: number; activeNode: string; cpuTotal: string; memTotal: string };
  jenkins: { status: 'online' | 'busy' | 'idle'; version: string; url: string; executorCount: number; activeJobs: number };
  chroma: { status: 'ready' | 'syncing'; version: string; collection: string; vectorsCount: number; dimension: number; distanceMetric: string };
  mlflow: { status: 'active' | 'training'; version: string; activeModel: string; artifactUri: string };
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  service: 'k3s' | 'jenkins' | 'chromadb' | 'debian-sandbox-pod' | 'redhat-sandbox-pod' | 'mlflow';
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}
