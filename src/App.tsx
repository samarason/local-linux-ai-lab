import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DistroSelector } from './components/DistroSelector';
import { QueryPanel } from './components/QueryPanel';
import { RagManager } from './components/RagManager';
import { PipelineManager } from './components/PipelineManager';
import { SystemsDashboard } from './components/SystemsDashboard';
import { TerminalPod } from './components/TerminalPod';
import {
  DistroFamily,
  DistroTag,
  AssistantResponse,
  RAGDocument,
  JenkinsPipelineRun,
  MLModelMetrics,
  TerminalEntry,
} from './types';
import { AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react';

export default function App() {
  const [activeDistro, setActiveDistro] = useState<DistroFamily>('debian');
  const [activeTab, setActiveTab] = useState<'query' | 'rag' | 'pipeline' | 'systems'>('query');

  // AI Assistant Query state
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [lastResponse, setLastResponse] = useState<AssistantResponse | null>(null);

  // RAG Document Store state
  const [documents, setDocuments] = useState<RAGDocument[]>([]);

  // Jenkins & MLflow Pipeline state
  const [pipelineRun, setPipelineRun] = useState<JenkinsPipelineRun | null>(null);
  const [modelMetrics, setModelMetrics] = useState<MLModelMetrics | null>(null);
  const [isTriggeringPipeline, setIsTriggeringPipeline] = useState(false);

  // Terminal Execution Buffer State
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      command: 'cat /etc/os-release',
      stdout: `PRETTY_NAME="Ubuntu 24.04 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian`,
      stderr: '',
      exitCode: 0,
      timestamp: new Date().toISOString(),
      cwd: '/root',
      podId: 'debian-sandbox-pod',
    },
    {
      id: 'init-2',
      command: 'cat /etc/os-release',
      stdout: `NAME="AlmaLinux"\nVERSION="9.4 (Seafoam Ocelot)"\nID="almalinux"\nID_LIKE="rhel centos fedora"\nPRETTY_NAME="AlmaLinux 9.4 (Seafoam Ocelot)"`,
      stderr: '',
      exitCode: 0,
      timestamp: new Date().toISOString(),
      cwd: '/root',
      podId: 'redhat-sandbox-pod',
    },
  ]);

  // Debugger Modal State
  const [debugModalData, setDebugModalData] = useState<{
    entry: TerminalEntry;
    diagnosis?: { rootCause: string; fixedCommand: string; explanation: string };
  } | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  // Initial Fetch of RAG Docs & Pipeline status
  useEffect(() => {
    fetch('/api/rag/documents')
      .then((res) => res.json())
      .then((data) => setDocuments(data))
      .catch((err) => console.error('Failed to load RAG docs:', err));

    fetch('/api/webhook/jenkins')
      .then((res) => res.json())
      .then((data) => setPipelineRun(data))
      .catch((err) => console.error('Failed to load Jenkins status:', err));

    fetch('/api/pipeline/mlflow')
      .then((res) => res.json())
      .then((data) => setModelMetrics(data))
      .catch((err) => console.error('Failed to load MLflow metrics:', err));
  }, []);

  // Submit Natural Language Query to AI Assistant
  const handleQuerySubmit = async (prompt: string) => {
    setIsLoadingQuery(true);
    try {
      const userKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userKey ? { 'x-gemini-api-key': userKey } : {}),
        },
        body: JSON.stringify({ prompt, targetDistro: activeDistro, apiKey: userKey }),
      });
      const data = await res.json();
      setLastResponse(data);
    } catch (err) {
      console.error('Query error:', err);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Execute Command inside current sandbox pod
  const handleExecuteCommand = async (rawCommand: string) => {
    const podId = activeDistro === 'debian' ? 'debian-sandbox-pod' : 'redhat-sandbox-pod';
    const trimmed = rawCommand.trim();
    if (!trimmed) return;

    // Handle 'clear' command directly
    if (trimmed.toLowerCase() === 'clear') {
      setTerminalEntries([]);
      return;
    }

    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    // Helper to evaluate single sub-commands
    const evaluateSingleSubCommand = (cmdStr: string): { stdout: string; stderr: string; exitCode: number } | null => {
      let clean = cmdStr.trim();
      if (clean.startsWith('sudo ')) {
        clean = clean.replace(/^sudo\s+(-i|-s)?\s*/, '');
      }
      const lower = clean.toLowerCase();

      if (lower === 'help') {
        return {
          stdout: `Supported Linux Commands & Managers:\n  Package Mgmt: apt, dpkg, dnf, rpm, yum\n  Service Mgmt: systemctl, journalctl, service\n  Network: ip, netplan, nmcli, ifconfig\n  Firewall: ufw, firewall-cmd, iptables\n  Security: aa-status, sestatus, getenforce, setenforce, chcon\n  Utilities: cat, ls, echo, pwd, whoami, date, uname, uptime, free, df, ps, top, python3, git, docker, kubectl, curl, chmod, chown, mkdir, rm, touch, clear`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower === 'pwd') {
        return { stdout: '/root', stderr: '', exitCode: 0 };
      } else if (lower === 'whoami') {
        return { stdout: 'root', stderr: '', exitCode: 0 };
      } else if (lower === 'hostname') {
        return { stdout: `${podId}.k3s.local`, stderr: '', exitCode: 0 };
      } else if (lower === 'date') {
        return { stdout: new Date().toUTCString(), stderr: '', exitCode: 0 };
      } else if (lower === 'uname' || lower.startsWith('uname ')) {
        return {
          stdout:
            activeDistro === 'debian'
              ? `Linux ${podId} 6.6.0-21-generic #22-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`
              : `Linux ${podId} 5.14.0-427.el9.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower === 'uptime') {
        return {
          stdout: ` 08:35:12 up 42 days, 12:04,  1 user,  load average: 0.08, 0.04, 0.01`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('ls')) {
        if (lower.includes('-l') || lower.includes('-a')) {
          return {
            stdout: `total 48\ndrwxr-xr-x 1 root root 4096 Jul 24 08:00 .\ndrwxr-xr-x 1 root root 4096 Jul 24 08:00 ..\n-rw-r--r-- 1 root root 3106 Jul 24 07:45 .bashrc\n-rw-r--r-- 1 root root  161 Jul 24 07:45 .profile\ndrwxr-xr-x 2 root root 4096 Jul 24 08:10 .k3s\ndrwxr-xr-x 3 root root 4096 Jul 24 08:15 app\n-rw-r--r-- 1 root root 1240 Jul 24 08:20 deploy.sh`,
            stderr: '',
            exitCode: 0,
          };
        }
        return {
          stdout: `bin  boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('cat ')) {
        if (lower.includes('os-release')) {
          return {
            stdout:
              activeDistro === 'debian'
                ? `PRETTY_NAME="Ubuntu 24.04 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04 LTS (Noble Numbat)"\nID=ubuntu\nID_LIKE=debian`
                : `PRETTY_NAME="AlmaLinux 9.4 (Seafoam Ocelot)"\nNAME="AlmaLinux"\nVERSION="9.4"\nID="almalinux"\nID_LIKE="rhel centos fedora"`,
            stderr: '',
            exitCode: 0,
          };
        } else if (lower.includes('passwd')) {
          return {
            stdout: `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin`,
            stderr: '',
            exitCode: 0,
          };
        } else if (lower.includes('hosts')) {
          return {
            stdout: `127.0.0.1\tlocalhost\n::1\t\tlocalhost ip6-localhost ip6-loopback\n10.244.0.12\t${podId}`,
            stderr: '',
            exitCode: 0,
          };
        } else if (lower.includes('fstab')) {
          return {
            stdout: `/dev/mapper/k3s-root / ext4 defaults 0 1\nUUID=3f2a1b /boot ext4 defaults 0 2`,
            stderr: '',
            exitCode: 0,
          };
        } else if (lower.includes('resolv.conf')) {
          return {
            stdout: `nameserver 10.43.0.10\nsearch default.svc.cluster.local svc.cluster.local cluster.local`,
            stderr: '',
            exitCode: 0,
          };
        }
      } else if (lower.startsWith('echo ')) {
        const text = clean.slice(5).replace(/^["']|["']$/g, '');
        return { stdout: text, stderr: '', exitCode: 0 };
      } else if (lower.startsWith('free')) {
        return {
          stdout: `               total        used        free      shared  buff/cache   available\nMem:            15Gi       2.1Gi       8.4Gi       12Mi       5.2Gi        13Gi\nSwap:          2.0Gi          0B       2.0Gi`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('df')) {
        return {
          stdout: `Filesystem      Size  Used Avail Use% Mounted on\noverlay         100G   24G   76G  24% /\ntmpfs            64M     0   64M   0% /dev\ntmpfs           7.8G     0  7.8G   0% /sys/fs/cgroup\n/dev/sda1       100G   24G   76G  24% /etc/hosts`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('ps')) {
        return {
          stdout: `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot           1  0.0  0.1  21340  3892 ?        Ss   07:00   0:02 /sbin/init\nroot         420  0.1  0.5  89200 18400 ?        S    07:00   0:15 /usr/bin/k3s agent\nroot        1420  0.0  0.4  45200 12800 ?        Ss   07:38   0:01 ${activeDistro === 'debian' ? 'apache2' : 'httpd'}\nroot        2890  0.0  0.1  10200  3100 pts/0    Ss+  08:30   0:00 bash`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('top') || lower.startsWith('htop')) {
        return {
          stdout: `top - 08:35:12 up 42 days, 12:04, 1 user, load average: 0.08, 0.04, 0.01\nTasks: 112 total, 1 running, 111 sleeping, 0 stopped, 0 zombie\n%Cpu(s):  1.2 us,  0.8 sy,  0.0 ni, 97.8 id,  0.1 wa,  0.0 hi,  0.1 si,  0.0 st\nMiB Mem :  15820.4 total,   8604.2 free,   2148.8 used,   5067.4 buff/cache\nMiB Swap:   2048.0 total,   2048.0 free,      0.0 used.  13271.6 avail Mem`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('apt') || lower.startsWith('dpkg') || lower.startsWith('apt-get')) {
        if (activeDistro !== 'debian') {
          return {
            stdout: '',
            stderr: `bash: apt: command not found (Notice: 'apt' is Debian-specific. On Red Hat/RHEL, use 'dnf install <package>')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\nGet:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease\nReading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\nAll packages up to date in debian-sandbox-pod.`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('dnf') || lower.startsWith('yum') || lower.startsWith('rpm')) {
        if (activeDistro !== 'redhat') {
          return {
            stdout: '',
            stderr: `bash: dnf: command not found (Notice: 'dnf' is Red Hat-specific. On Debian/Ubuntu, use 'apt update && apt install <package>')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `AlmaLinux 9 - BaseOS                             2.4 MB/s | 3.8 MB  00:01\nAlmaLinux 9 - AppStream                          4.1 MB/s | 6.2 MB  00:01\nDependencies resolved. Package operation completed in redhat-sandbox-pod.`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('ufw')) {
        if (activeDistro !== 'debian') {
          return {
            stdout: '',
            stderr: `bash: ufw: command not found (Notice: Red Hat systems use 'firewalld' via 'firewall-cmd')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `Status: active\nLogging: on (low)\nDefault: deny (incoming), allow (outgoing)\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere\n80/tcp                     ALLOW       Anywhere`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('firewall-cmd')) {
        if (activeDistro !== 'redhat') {
          return {
            stdout: '',
            stderr: `bash: firewall-cmd: command not found (Notice: Debian/Ubuntu systems use 'ufw' or 'iptables')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `running\nactive zones: public\n  interfaces: eth0\n  services: dhcpv6-client ssh http https\n  ports: 8080/tcp 443/tcp`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('sestatus') || lower.startsWith('getenforce') || lower.startsWith('setenforce') || lower.startsWith('chcon')) {
        if (activeDistro !== 'redhat') {
          return {
            stdout: '',
            stderr: `bash: sestatus: command not found (Notice: SELinux is standard on Red Hat. Debian/Ubuntu uses AppArmor 'aa-status')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `SELinux status:                 enabled\nSELinuxfs mount:                /sys/fs/selinux\nSELinux root directory:         /etc/selinux\nLoaded policy name:             targeted\nCurrent mode:                   enforcing\nMode from config file:          enforcing`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('aa-status')) {
        if (activeDistro !== 'debian') {
          return {
            stdout: '',
            stderr: `bash: aa-status: command not found (Notice: AppArmor is Debian-specific. Red Hat uses SELinux 'sestatus')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `apparmor module is loaded.\n42 profiles are loaded.\n38 profiles are in enforce mode.\n4 profiles are in complain mode.`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('netplan')) {
        if (activeDistro !== 'debian') {
          return {
            stdout: '',
            stderr: `bash: netplan: command not found (Notice: Netplan is Ubuntu-specific. Red Hat uses NetworkManager 'nmcli')`,
            exitCode: 127,
          };
        }
        return {
          stdout: `Configuration successfully applied to /etc/netplan/01-netcfg.yaml via systemd-networkd daemon.`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('nmcli')) {
        if (activeDistro !== 'redhat') {
          return {
            stdout: '',
            stderr: `bash: nmcli: command not found (Notice: nmcli controls NetworkManager. Ubuntu defaults to Netplan YAML configs)`,
            exitCode: 127,
          };
        }
        return {
          stdout: `eth0: connected to eth0\n        "VirtIO Network Device"\n        ethernet (virtio_net), 52:54:00:12:34:56, hw, mtu 1500\n        ip4 default, inet 192.168.1.100/24`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('systemctl')) {
        return {
          stdout: `● ${activeDistro === 'debian' ? 'apache2' : 'httpd'}.service - The Apache HTTP Server\n     Loaded: loaded (/lib/systemd/system/${activeDistro === 'debian' ? 'apache2' : 'httpd'}.service; enabled; vendor preset: enabled)\n     Active: active (running) since Fri 2026-07-24 07:38:00 UTC; 12min ago\n   Main PID: 1420 (${activeDistro === 'debian' ? 'apache2' : 'httpd'})\n      Tasks: 55 (limit: 4915)\n     Memory: 18.4M\n        CPU: 124ms`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('journalctl')) {
        return {
          stdout: `Jul 24 08:30:00 ${podId} systemd[1]: Starting Apache HTTP Server...\nJul 24 08:30:01 ${podId} ${activeDistro === 'debian' ? 'apache2' : 'httpd'}[1420]: Server configured and listening on port 80.\nJul 24 08:30:01 ${podId} systemd[1]: Started Apache HTTP Server.`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('ip ') || lower === 'ip') {
        return {
          stdout: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default\n    inet 127.0.0.1/8 scope host lo\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default\n    inet 10.244.0.12/24 brd 10.244.0.255 scope global eth0`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('curl') || lower.startsWith('wget')) {
        return {
          stdout: `HTTP/1.1 200 OK\nDate: Fri, 24 Jul 2026 08:35:12 GMT\nServer: ${activeDistro === 'debian' ? 'Apache/2.4.58 (Ubuntu)' : 'Apache/2.4.57 (AlmaLinux)'}\nContent-Type: text/html; charset=UTF-8\nContent-Length: 462\n\n<!DOCTYPE html><html><body><h1>Titan Linux Node Online</h1></body></html>`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('kubectl')) {
        return {
          stdout: `NAME                                READY   STATUS    RESTARTS   AGE\npod/debian-sandbox-pod              1/1     Running   0          4h\npod/redhat-sandbox-pod              1/1     Running   0          4h\npod/chromadb-vector-store-0         1/1     Running   0          2h\npod/jenkins-runner-7d49f6b98-x2k9l 1/1     Running   0          5h`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('docker')) {
        return {
          stdout: `CONTAINER ID   IMAGE                 COMMAND                  CREATED        STATUS        PORTS                  NAMES\n8f3a9d2c1e0b   chromadb/chroma:latest "/docker-entrypoint…"   2 hours ago    Up 2 hours    8000/tcp               chromadb-vector-store\na1b2c3d4e5f6   jenkins/jenkins:lts   "/usr/bin/tini -- /u…"   5 hours ago    Up 5 hours    8080/tcp, 50000/tcp    jenkins-runner`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('git')) {
        return {
          stdout: `On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean`,
          stderr: '',
          exitCode: 0,
        };
      } else if (lower.startsWith('python') || lower.startsWith('python3')) {
        return {
          stdout: `Python 3.12.3 (main, Apr 17 2026, 18:12:00) [GCC 13.2.0]\nType "help", "copyright", "credits" or "license" for more information.\n>>> print("Linux Ops AI Shell Connected")\nLinux Ops AI Shell Connected`,
          stderr: '',
          exitCode: 0,
        };
      } else if (
        lower.startsWith('chmod') ||
        lower.startsWith('chown') ||
        lower.startsWith('mkdir') ||
        lower.startsWith('touch') ||
        lower.startsWith('rm') ||
        lower.startsWith('cp') ||
        lower.startsWith('mv')
      ) {
        return { stdout: '', stderr: '', exitCode: 0 };
      }

      return null;
    };

    // Check if command is compound (&& or ;)
    const segments = trimmed.split(/&&|;/).map((s) => s.trim()).filter(Boolean);
    let cumulativeStdout: string[] = [];
    let cumulativeStderr: string[] = [];
    let finalExitCode = 0;
    let unhandledSegments: string[] = [];

    for (const seg of segments) {
      const res = evaluateSingleSubCommand(seg);
      if (res) {
        if (res.stdout) cumulativeStdout.push(res.stdout);
        if (res.stderr) cumulativeStderr.push(res.stderr);
        if (res.exitCode !== 0) {
          finalExitCode = res.exitCode;
          break;
        }
      } else {
        unhandledSegments.push(seg);
      }
    }

    if (unhandledSegments.length === 0 && segments.length > 0) {
      stdout = cumulativeStdout.join('\n');
      stderr = cumulativeStderr.join('\n');
      exitCode = finalExitCode;
    } else {
      // If there are unhandled segments or custom commands, call backend simulation API
      try {
        const userKey = localStorage.getItem('gemini_api_key') || '';
        const response = await fetch('/api/assistant/exec', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userKey ? { 'x-gemini-api-key': userKey } : {}),
          },
          body: JSON.stringify({
            command: trimmed,
            targetDistro: activeDistro,
            podId,
            apiKey: userKey,
          }),
        });
        const data = await response.json();
        const serverStdout = data.stdout || '';
        const serverStderr = data.stderr || '';
        const serverExitCode = typeof data.exitCode === 'number' ? data.exitCode : 0;

        stdout = cumulativeStdout.concat(serverStdout ? [serverStdout] : []).join('\n');
        stderr = cumulativeStderr.concat(serverStderr ? [serverStderr] : []).join('\n');
        exitCode = serverExitCode || finalExitCode;
      } catch (err) {
        stdout = cumulativeStdout.concat([`Executed '${trimmed}' in ${podId}.`]).join('\n');
        stderr = cumulativeStderr.join('\n');
        exitCode = finalExitCode;
      }
    }

    const newEntry: TerminalEntry = {
      id: `entry-${Date.now()}`,
      command: rawCommand,
      stdout,
      stderr,
      exitCode,
      timestamp: new Date().toISOString(),
      cwd: '/root',
      podId,
    };

    setTerminalEntries((prev) => [...prev, newEntry]);
  };

  // RAG Document Ingest Handler
  const handleIngestDocument = async (doc: {
    title: string;
    content: string;
    distroTag: DistroTag;
    source: string;
  }) => {
    const res = await fetch('/api/rag/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    const data = await res.json();
    setDocuments((prev) => [data.document, ...prev]);
    if (data.pipelineRun) {
      setPipelineRun(data.pipelineRun);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    await fetch(`/api/rag/documents/${id}`, { method: 'DELETE' });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Purge Store
  const handlePurgeAll = async () => {
    await fetch('/api/rag/purge', { method: 'POST' });
    setDocuments([]);
  };

  // Trigger Jenkins Webhook
  const handleTriggerWebhook = async () => {
    setIsTriggeringPipeline(true);
    try {
      const res = await fetch('/api/webhook/jenkins', { method: 'POST' });
      const data = await res.json();
      setPipelineRun(data);
    } catch (err) {
      console.error('Webhook error:', err);
    } finally {
      setIsTriggeringPipeline(false);
    }
  };

  // Trigger MLflow Retrain
  const handleTriggerRetrain = async () => {
    setIsTriggeringPipeline(true);
    try {
      const res = await fetch('/api/pipeline/retrain', { method: 'POST' });
      const data = await res.json();
      setModelMetrics(data);
    } catch (err) {
      console.error('Retrain error:', err);
    } finally {
      setIsTriggeringPipeline(false);
    }
  };

  // Debug Command Error with AI
  const handleDebugError = async (entry: TerminalEntry) => {
    setIsDebugging(true);
    try {
      const userKey = localStorage.getItem('gemini_api_key') || '';
      const res = await fetch('/api/assistant/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userKey ? { 'x-gemini-api-key': userKey } : {}),
        },
        body: JSON.stringify({
          command: entry.command,
          stdout: entry.stdout,
          stderr: entry.stderr,
          targetDistro: activeDistro,
          apiKey: userKey,
        }),
      });
      const data = await res.json();
      setDebugModalData({ entry, diagnosis: data });
    } catch (err) {
      console.error('Debug error:', err);
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Header */}
      <Header
        activeDistro={activeDistro}
        onDistroChange={setActiveDistro}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pipelineStatus={pipelineRun}
        documentCount={documents.length}
      />

      {/* Main Container - Dual Pane Workspace */}
      <main className="flex-1 p-3 md:p-6 max-w-[1800px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Main Pane - OS Selector, Assistant Query, RAG Manager, Jenkins Pipeline, Systems Dashboard */}
        <div className={`${activeTab === 'query' ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
          {/* Target OS Selector (Only shown on AI Assistant tab) */}
          {activeTab === 'query' && (
            <DistroSelector
              activeDistro={activeDistro}
              onSelectDistro={setActiveDistro}
            />
          )}

          {/* Tab View Selection */}
          {activeTab === 'query' && (
            <QueryPanel
              activeDistro={activeDistro}
              onExecuteInTerminal={handleExecuteCommand}
              isLoading={isLoadingQuery}
              onSubmitQuery={handleQuerySubmit}
              lastResponse={lastResponse}
            />
          )}

          {activeTab === 'rag' && (
            <RagManager
              documents={documents}
              onIngestDocument={handleIngestDocument}
              onDeleteDocument={handleDeleteDocument}
              onPurgeAll={handlePurgeAll}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineManager
              pipelineRun={pipelineRun}
              modelMetrics={modelMetrics}
              onTriggerWebhook={handleTriggerWebhook}
              onTriggerRetrain={handleTriggerRetrain}
              isTriggering={isTriggeringPipeline}
            />
          )}

          {activeTab === 'systems' && (
            <SystemsDashboard
              pipelineRun={pipelineRun}
              modelMetrics={modelMetrics}
              onTriggerJenkins={handleTriggerWebhook}
            />
          )}
        </div>

        {/* Right Pane (5 Columns) - Interactive Sandboxed Shell Terminal (Only on AI Assistant Tab) */}
        {activeTab === 'query' && (
          <div className="lg:col-span-5 h-full sticky top-20">
            <TerminalPod
              activeDistro={activeDistro}
              onDistroChange={setActiveDistro}
              entries={terminalEntries}
              onExecuteCommand={handleExecuteCommand}
              onClearTerminal={() =>
                setTerminalEntries((prev) =>
                  prev.filter(
                    (e) =>
                      e.podId !==
                      (activeDistro === 'debian'
                        ? 'debian-sandbox-pod'
                        : 'redhat-sandbox-pod')
                  )
                )
              }
              onDebugError={handleDebugError}
              isDebugging={isDebugging}
            />
          </div>
        )}
      </main>

      {/* AI Debugger Modal */}
      {debugModalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setDebugModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">AI Terminal Debugger Diagnosis</h3>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs space-y-1">
              <span className="text-slate-500">Failed Command:</span>
              <p className="text-rose-400 font-bold">{debugModalData.entry.command}</p>
              <span className="text-slate-500">Stderr:</span>
              <p className="text-slate-300 text-[11px]">{debugModalData.entry.stderr}</p>
            </div>

            {debugModalData.diagnosis && (
              <div className="space-y-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 font-mono">
                    Root Cause
                  </h4>
                  <p className="text-xs text-slate-300">{debugModalData.diagnosis.rootCause}</p>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 space-y-1">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    Suggested Fixed Command
                  </h4>
                  <code className="block bg-slate-950 p-2 rounded text-xs font-mono text-emerald-300">
                    {debugModalData.diagnosis.fixedCommand}
                  </code>
                </div>

                <button
                  onClick={() => {
                    if (debugModalData.diagnosis?.fixedCommand) {
                      handleExecuteCommand(debugModalData.diagnosis.fixedCommand);
                      setDebugModalData(null);
                    }
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Fixed Command in Terminal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
