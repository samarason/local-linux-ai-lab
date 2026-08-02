import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_RAG_DOCS } from './src/data/defaultManPages.js';
import { RAGDocument, RAGChunk, DistroFamily, JenkinsPipelineRun, MLModelMetrics } from './src/types.js';

dotenv.config();

const __filenameResolved = typeof __filename !== 'undefined'
  ? __filename
  : (import.meta && import.meta.url ? fileURLToPath(import.meta.url) : '');
const __dirnameResolved = typeof __dirname !== 'undefined'
  ? __dirname
  : (import.meta && import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

// Lazy init Gemini AI instance
function getGeminiClient(providedKey?: string): GoogleGenAI | null {
  const apiKey = (providedKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== '') {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return null;
}

// Helper to safely parse JSON from Gemini or LLM responses (handling code blocks)
function safeParseJSON(rawText: string): any {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

function extractRelevantPackageOrTool(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes('apache') || lower.includes('httpd')) return 'apache2';
  if (lower.includes('nginx')) return 'nginx';
  if (lower.includes('git')) return 'git';
  if (lower.includes('docker')) return 'docker.io';
  if (lower.includes('kubectl') || lower.includes('k8s') || lower.includes('kubernetes')) return 'kubectl';
  if (lower.includes('htop')) return 'htop';
  if (lower.includes('top')) return 'procps';
  if (lower.includes('vim')) return 'vim';
  if (lower.includes('nano')) return 'nano';
  if (lower.includes('python')) return 'python3';
  if (lower.includes('postgres') || lower.includes('postgresql')) return 'postgresql';
  if (lower.includes('mysql') || lower.includes('mariadb')) return 'mariadb-server';
  if (lower.includes('redis')) return 'redis-server';
  if (lower.includes('ufw')) return 'ufw';
  if (lower.includes('firewalld') || lower.includes('firewall')) return 'firewalld';
  if (lower.includes('netplan')) return 'netplan.io';
  if (lower.includes('networkmanager') || lower.includes('nmcli')) return 'network-manager';
  if (lower.includes('ssh') || lower.includes('sshd')) return 'openssh-server';
  if (lower.includes('tree')) return 'tree';
  if (lower.includes('jq')) return 'jq';
  if (lower.includes('zip') || lower.includes('unzip')) return 'unzip';
  if (lower.includes('tar')) return 'tar';
  if (lower.includes('rsync')) return 'rsync';
  if (lower.includes('curl')) return 'curl';
  if (lower.includes('wget')) return 'wget';

  const stopWords = new Set([
    'how', 'do', 'i', 'can', 'you', 'to', 'a', 'an', 'the', 'in', 'on', 'for',
    'please', 'show', 'me', 'what', 'is', 'command', 'install', 'setup', 'configure',
    'check', 'get', 'list', 'run', 'start', 'stop', 'restart', 'where', 'why', 'with',
    'using', 'my', 'system', 'linux', 'ubuntu', 'debian', 'redhat', 'rhel', 'almalinux',
    'rocky', 'centos', 'pod', 'container', 'package', 'app', 'tool', 'service', 'daemon',
    'status', 'version', 'update', 'upgrade', 'find', 'search', 'view', 'display', 'make',
    'create', 'delete', 'remove', 'which', 'who', 'when', 'should', 'would', 'could',
    'best', 'way', 'help', 'howto', 'how-to', 'howtos', 'about', 'some', 'any', 'tell',
    'directory', 'directories', 'file', 'files', 'folder', 'folders', 'path', 'paths'
  ]);

  const installMatch = lower.match(/(?:install|setup|pkg)\s+([a-z0-9_.-]+)/i);
  if (installMatch && installMatch[1]) {
    const candidate = installMatch[1].trim();
    if (!stopWords.has(candidate) && candidate.length > 1) {
      return candidate;
    }
  }

  const words = lower.replace(/[^a-z0-9\s-]/g, '').split(/\s+/);
  const candidates = words.filter((w) => w.length > 2 && !stopWords.has(w));
  const found = candidates[0];
  if (!found || stopWords.has(found)) {
    return '';
  }
  return found;
}

function generateRuleBasedCommand(prompt: string, selectedDistro: DistroFamily, retrievedChunks: RAGChunk[] = []) {
  const lower = prompt.toLowerCase();
  const pkg = extractRelevantPackageOrTool(prompt);

  let suggestedCmd = '';
  let breakdown = '';
  let altSyntax = '';
  let safety = 'Execution occurs inside the sandboxed K3s container pod and cannot harm host Linux OS.';

  // Check top RAG chunk first if available and relevant
  const topChunk = retrievedChunks && retrievedChunks.length > 0 ? retrievedChunks[0] : null;
  const chunkHasHighRelevance = topChunk && typeof topChunk.score === 'number' && topChunk.score >= 3;

  // 1. DISK & STORAGE
  if (lower.includes('disk') || lower.includes('space') || lower.includes('storage') || lower.includes('df') || lower.includes('du ') || lower.includes('partition') || lower.includes('mount')) {
    suggestedCmd = 'df -h && echo "--- Top Directory Sizes ---" && du -sh /* 2>/dev/null | sort -hr | head -n 10';
    breakdown = '`df -h` displays mounted filesystem disk space in human-readable GB/MB format. `du -sh` calculates directory storage usage to identify large files.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `df -hT && lsblk -f` includes filesystem type column.'
      : 'On Debian/Ubuntu: `df -hT && lsblk -f` displays block devices and Netplan mounts.';
  }
  // 2. MEMORY / RAM
  else if (lower.includes('memory') || lower.includes('ram') || lower.includes('swap') || lower.includes('free') || lower.includes('meminfo')) {
    suggestedCmd = 'free -h && echo "--- Kernel Memory Metrics ---" && head -n 12 /proc/meminfo';
    breakdown = '`free -h` displays total, used, and available physical RAM and swap in human-readable units. Inspecting `/proc/meminfo` reveals detailed buffer/cache allocation.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `free -m && vmstat 1 5` monitors system virtual memory activity.'
      : 'On Debian/Ubuntu: `free -m && vmstat 1 5` samples memory and CPU queue depth.';
  }
  // 3. CPU / PROCESSES / TASKS
  else if (lower.includes('process') || lower.includes('cpu') || lower.includes('task') || lower.includes('top') || lower.includes('htop') || lower.includes('ps ') || lower.includes('psaux')) {
    suggestedCmd = 'ps aux --sort=-%cpu | head -n 15';
    breakdown = '`ps aux` snapshots all active processes with user ownership, PID, CPU% and MEM%. Sorting by `-%cpu` highlights high-utilization tasks.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `top -b -n 1 | head -n 20` or `dnf install -y htop`.'
      : 'On Debian/Ubuntu: `top -b -n 1 | head -n 20` or `apt install -y htop`.';
  }
  // 4. IP ADDRESS & NETWORK INTERFACES / NETPLAN / NMCLI
  else if (lower.includes('netplan') || lower.includes('nmcli') || lower.includes('ip address') || lower.includes('ip addr') || lower.includes('interface') || lower.includes('ifconfig') || lower.includes('network')) {
    if (selectedDistro === 'debian') {
      suggestedCmd = lower.includes('netplan')
        ? 'cat /etc/netplan/01-netcfg.yaml && netplan try'
        : 'ip -c addr show && echo "--- Routing Table ---" && ip route show';
      breakdown = lower.includes('netplan')
        ? 'Inspects Netplan YAML networking declaration in `/etc/netplan/` and uses `netplan try` for safe application with auto-rollback.'
        : '`ip -c addr show` displays colorized interface configuration and assigned IPv4/IPv6 addresses on Ubuntu/Debian.';
      altSyntax = 'On Red Hat/RHEL: `nmcli device status` or `nmcli connection show eth0` controls interfaces via NetworkManager.';
    } else {
      suggestedCmd = lower.includes('nmcli')
        ? 'nmcli device status && nmcli connection show'
        : 'ip -c addr show && echo "--- Routing Table ---" && ip route show';
      breakdown = '`nmcli device status` lists NetworkManager managed adapters on Red Hat/AlmaLinux, and `ip route` shows active gateway routes.';
      altSyntax = 'On Debian/Ubuntu: Netplan network declarative files stored in `/etc/netplan/*.yaml` control interfaces.';
    }
  }
  // 5. PORTS & SOCKETS
  else if (lower.includes('port') || lower.includes('sockets') || lower.includes('ss ') || lower.includes('netstat') || lower.includes('listen')) {
    suggestedCmd = 'ss -tulpn';
    breakdown = '`ss -tulpn` lists all listening TCP/UDP sockets, showing local port bindings and corresponding process names and PIDs.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `ss -tulpn` or `lsof -i -P -n` (install via `dnf install -y lsof`).'
      : 'On Debian/Ubuntu: `ss -tulpn` or `lsof -i -P -n` (install via `apt install -y lsof`).';
  }
  // 6. FIREWALL (UFW vs FIREWALLD)
  else if (lower.includes('firewall') || lower.includes('ufw') || lower.includes('firewalld') || lower.includes('iptables')) {
    if (selectedDistro === 'debian') {
      suggestedCmd = 'ufw status verbose && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable';
      breakdown = '`ufw status verbose` checks Uncomplicated Firewall policies. `ufw allow` adds port rules for Web traffic. `ufw enable` enforces packet filtering.';
      altSyntax = 'On Red Hat/RHEL: `firewall-cmd --zone=public --add-port=80/tcp --permanent && firewall-cmd --reload`';
    } else {
      suggestedCmd = 'firewall-cmd --state && firewall-cmd --zone=public --add-port=80/tcp --permanent && firewall-cmd --reload';
      breakdown = '`firewall-cmd --state` checks firewalld status. `--add-port` permanently opens HTTP port 80 in the public zone, then reloads firewalld rules.';
      altSyntax = 'On Debian/Ubuntu: `ufw status verbose && ufw allow 80/tcp && ufw enable`';
    }
  }
  // 7. SECURITY (SELinux / AppArmor)
  else if (lower.includes('selinux') || lower.includes('apparmor') || lower.includes('security') || lower.includes('sestatus') || lower.includes('aa-status')) {
    if (selectedDistro === 'debian') {
      suggestedCmd = 'aa-status && cat /etc/apparmor.d/usr.bin.firefox 2>/dev/null || true';
      breakdown = '`aa-status` displays AppArmor security profile enforcement on Debian/Ubuntu systems.';
      altSyntax = 'On Red Hat/RHEL: SELinux uses `sestatus`, `getenforce`, and `chcon` instead of AppArmor.';
    } else {
      suggestedCmd = 'sestatus && getenforce && ls -Z /var/www/html 2>/dev/null || true';
      breakdown = '`sestatus` displays SELinux policy type and mode (Enforcing/Permissive). `ls -Z` lists SELinux security context labels (`httpd_sys_content_t`).';
      altSyntax = 'On Debian/Ubuntu: AppArmor uses `aa-status` and security profiles in `/etc/apparmor.d/`.';
    }
  }
  // 8. LOGS & JOURNAL
  else if (lower.includes('log') || lower.includes('journal') || lower.includes('dmesg') || lower.includes('syslog')) {
    suggestedCmd = 'journalctl -p err..alert -n 30 --no-pager && echo "--- Kernel Buffer ---" && dmesg -T | tail -n 15';
    breakdown = '`journalctl` retrieves systemd system logs filtered for error priorities. `dmesg -T` outputs human-timestamped kernel ring buffer logs.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: Logs stored in `/var/log/messages` and systemd journal.'
      : 'On Debian/Ubuntu: Logs stored in `/var/log/syslog` and systemd journal.';
  }
  // 9. RESTART / START / STOP / SERVICE STATUS
  else if (lower.includes('service') || lower.includes('systemctl') || lower.includes('restart') || lower.includes('daemon') || (lower.includes('status') && !lower.includes('distro'))) {
    const svcName = pkg && pkg !== 'curl' ? pkg : (selectedDistro === 'debian' ? 'apache2' : 'httpd');
    suggestedCmd = `systemctl status ${svcName} || systemctl list-units --type=service --state=running | head -n 20`;
    breakdown = `Inspects state of ${svcName} systemd unit or enumerates active services in current container namespace.`;
    altSyntax = selectedDistro === 'debian'
      ? `On Red Hat/RHEL: \`systemctl status ${svcName === 'apache2' ? 'httpd' : svcName}\``
      : `On Debian/Ubuntu: \`systemctl status ${svcName === 'httpd' ? 'apache2' : svcName}\``;
  }
  // 10. SYSTEM UPDATE / UPGRADE
  else if (lower.includes('update') || lower.includes('upgrade') || lower.includes('patch')) {
    if (selectedDistro === 'debian') {
      suggestedCmd = 'apt update && apt upgrade -y';
      breakdown = '`apt update` synchronizes package index files from remote Ubuntu/Debian mirrors. `apt upgrade -y` installs newest available package patches.';
      altSyntax = 'On Red Hat/RHEL: use `dnf check-update || dnf upgrade -y`';
    } else {
      suggestedCmd = 'dnf check-update || dnf upgrade -y';
      breakdown = '`dnf check-update` queries Red Hat/AlmaLinux RPM repositories for updates. `dnf upgrade -y` downloads and updates system RPM packages.';
      altSyntax = 'On Debian/Ubuntu: use `apt update && apt upgrade -y`';
    }
  }
  // 11. PERMISSIONS / CHMOD / CHOWN
  else if (lower.includes('permission') || lower.includes('chmod') || lower.includes('chown')) {
    suggestedCmd = 'chmod 755 /var/www/html && chown -R root:root /var/www/html && ls -ld /var/www/html';
    breakdown = '`chmod 755` grants read/write/execute to owner and read/execute to group and others. `chown -R` sets user and group ownership recursively.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: Ensure SELinux context is also updated via `chcon -R -t httpd_sys_content_t /var/www/html`.'
      : 'On Debian/Ubuntu: Ensure file ownership matches www-data via `chown -R www-data:www-data /var/www/html`.';
  }
  // 12. FIND FILES & SEARCH TEXT
  else if (lower.includes('find') || lower.includes('search') || lower.includes('grep') || lower.includes('whereis') || lower.includes('which')) {
    suggestedCmd = 'find /etc -name "*.conf" 2>/dev/null | head -n 15';
    breakdown = '`find /etc -name "*.conf"` searches `/etc` for configuration files while redirecting standard error messages (permission denied) to `/dev/null`.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `grep -rnw "/etc" -e "LISTEN"` recursively searches file contents.'
      : 'On Debian/Ubuntu: `grep -rnw "/etc" -e "LISTEN"` recursively searches file contents.';
  }
  // 13. LIST FILES / DIRECTORY CONTENTS (STRICT: only if intent is to list files)
  else if (lower.startsWith('ls') || lower.includes('list files') || lower.includes('directory contents') || lower.includes('show files') || lower.includes('list directory') || lower.includes('list folder')) {
    suggestedCmd = 'ls -la /root && echo "--- System Logs Directory ---" && ls -la /var/log | head -n 15';
    breakdown = '`ls -la` lists detailed file permissions, hidden files, user/group ownership, and size in human-readable format.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `ls -laZ /var/log` (adds SELinux security context column).'
      : 'On Debian/Ubuntu: `ls -la /var/log`.';
  }
  // 14. OS & DISTRO INFO
  else if (lower.includes('distro') || lower.includes('os') || lower.includes('release') || lower.includes('uname') || lower.includes('version')) {
    suggestedCmd = 'cat /etc/os-release && uname -a';
    breakdown = '`cat /etc/os-release` displays operating system distribution identification. `uname -a` displays Linux kernel architecture and version.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `cat /etc/redhat-release && uname -a`.'
      : 'On Debian/Ubuntu: `cat /etc/os-release && lsb_release -a`.';
  }
  // 15. USERS & ACCOUNTS
  else if (lower.includes('user') || lower.includes('users') || lower.includes('whoami') || lower.includes('account') || lower.includes('logged')) {
    suggestedCmd = 'whoami && id && w && cat /etc/passwd | tail -n 10';
    breakdown = '`whoami` prints effective user ID, `id` shows user and group memberships, `w` displays logged in users, and `/etc/passwd` shows user accounts.';
    altSyntax = selectedDistro === 'debian'
      ? 'On Red Hat/RHEL: `getent passwd` retrieves users from local and NSS databases.'
      : 'On Debian/Ubuntu: `getent passwd` retrieves system user accounts.';
  }
  // 16. CONTAINERS / DOCKER / KUBERNETES / GIT / PYTHON
  else if (lower.includes('docker') || lower.includes('container')) {
    suggestedCmd = 'docker ps -a && docker images';
    breakdown = 'Lists active container instances and cached container images.';
    altSyntax = selectedDistro === 'redhat' ? 'On Red Hat/RHEL: `podman ps -a` (daemonless rootless containers).' : 'On Debian/Ubuntu: `docker ps -a`.';
  } else if (lower.includes('k8s') || lower.includes('kubectl') || lower.includes('kubernetes')) {
    suggestedCmd = 'kubectl get pods -A && kubectl get nodes';
    breakdown = 'Queries Kubernetes cluster state across namespaces.';
    altSyntax = 'Universal: `kubectl get pods -n kube-system`';
  } else if (lower.includes('git')) {
    suggestedCmd = 'git status && git log -n 5 --oneline';
    breakdown = 'Displays Git workspace status and commit history.';
    altSyntax = 'Universal: `git status`';
  } else if (lower.includes('python')) {
    suggestedCmd = 'python3 --version && pip list 2>/dev/null | head -n 15';
    breakdown = 'Inspects installed Python 3 interpreter version and active PyPI packages.';
    altSyntax = selectedDistro === 'debian' ? 'On Debian: `apt install -y python3-pip`.' : 'On Red Hat: `dnf install -y python3-pip`.';
  }
  // 17. USE TOP RAG CHUNK IF RELEVANT MATCH
  else if (chunkHasHighRelevance && topChunk) {
    const docTitle = topChunk.docTitle;
    const content = topChunk.content;
    const cmdLine = content.split('\n').find((l) => l.includes(': ') || l.trim().startsWith('apt') || l.trim().startsWith('dnf') || l.trim().startsWith('ufw') || l.trim().startsWith('firewall-cmd') || l.trim().startsWith('systemctl') || l.trim().startsWith('netplan') || l.trim().startsWith('nmcli') || l.trim().startsWith('sestatus') || l.trim().startsWith('aa-status')) || '';
    const cleanCmd = cmdLine.replace(/^.*:\s*/, '').trim();

    suggestedCmd = cleanCmd || (selectedDistro === 'debian' ? 'apt update && apt list --installed | head -n 20' : 'dnf list installed | head -n 20');
    breakdown = `Retrieved directly from RAG Knowledge Document [${docTitle}]:\n${content.slice(0, 180)}...`;
    altSyntax = selectedDistro === 'debian'
      ? 'Equivalent Red Hat/RHEL commands are documented in DNF & Firewalld man pages.'
      : 'Equivalent Debian/Ubuntu commands are documented in APT & UFW man pages.';
  }
  // 18. DEFAULT PACKAGE INSTALLATION OR GENERAL QUERY
  else {
    if (pkg && pkg !== '') {
      if (selectedDistro === 'debian') {
        const debPkg = pkg === 'httpd' ? 'apache2' : pkg;
        suggestedCmd = `apt update && apt install -y ${debPkg} && ${debPkg} --version 2>/dev/null || systemctl status ${debPkg}`;
        breakdown = `\`apt update\` updates Debian package indexes, \`apt install -y ${debPkg}\` installs the requested tool non-interactively, and verifies executable or service state.`;
        altSyntax = `On Red Hat/RHEL: \`dnf install -y ${debPkg === 'apache2' ? 'httpd' : debPkg}\``;
      } else {
        const rhelPkg = pkg === 'apache2' ? 'httpd' : pkg;
        suggestedCmd = `dnf install -y ${rhelPkg} && ${rhelPkg} --version 2>/dev/null || systemctl status ${rhelPkg}`;
        breakdown = `\`dnf install -y ${rhelPkg}\` installs the RPM package using DNF package manager on Red Hat/AlmaLinux, then checks execution status.`;
        altSyntax = `On Debian/Ubuntu: \`apt update && apt install -y ${pkg === 'httpd' ? 'apache2' : pkg}\``;
      }
    } else {
      if (selectedDistro === 'debian') {
        suggestedCmd = 'cat /etc/os-release && systemctl list-units --type=service --state=running | head -n 15';
        breakdown = 'Queries Debian/Ubuntu distribution release details (`/etc/os-release`) and inspects running systemd services.';
        altSyntax = 'On Red Hat/RHEL: `cat /etc/os-release && systemctl list-units --type=service --state=running | head -n 15`';
      } else {
        suggestedCmd = 'cat /etc/os-release && systemctl list-units --type=service --state=running | head -n 15';
        breakdown = 'Queries Red Hat distribution release details (`/etc/os-release`) and inspects running systemd services.';
        altSyntax = 'On Debian/Ubuntu: `cat /etc/os-release && systemctl list-units --type=service --state=running | head -n 15`';
      }
    }
  }

  return {
    targetDistro: selectedDistro,
    suggestedCommand: suggestedCmd,
    breakdown,
    alternativeSyntax: altSyntax,
    safetyWarning: safety,
  };
}

// Helper to call Gemini with retry on transient 503/429 high demand errors
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0],
  maxRetries = 2
) {
  let delay = 800;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Gemini API] Temporary model unavailability (503/429), retrying attempt ${attempt + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// In-memory document store & vector chunks
let documentsStore: RAGDocument[] = [...INITIAL_RAG_DOCS];

interface SystemLogItem {
  id: string;
  timestamp: string;
  service: 'k3s' | 'jenkins' | 'chromadb' | 'debian-sandbox-pod' | 'redhat-sandbox-pod' | 'mlflow';
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

const initialLogTime = Date.now();
let systemLogs: SystemLogItem[] = [
  {
    id: 'sys-log-10',
    timestamp: new Date(initialLogTime - 30000).toISOString(),
    service: 'jenkins',
    level: 'SUCCESS',
    message: '[Jenkins Build #104] Pipeline execution completed with status SUCCESS in 35s.',
  },
  {
    id: 'sys-log-9',
    timestamp: new Date(initialLogTime - 150000).toISOString(),
    service: 'redhat-sandbox-pod',
    level: 'SUCCESS',
    message: '[redhat-sandbox-pod] SELinux target policy enforcing. DNF package metadata synchronized.',
  },
  {
    id: 'sys-log-8',
    timestamp: new Date(initialLogTime - 300000).toISOString(),
    service: 'debian-sandbox-pod',
    level: 'SUCCESS',
    message: '[debian-sandbox-pod] Package cache updated via apt update. Systemctl service manager ready.',
  },
  {
    id: 'sys-log-7',
    timestamp: new Date(initialLogTime - 450000).toISOString(),
    service: 'mlflow',
    level: 'INFO',
    message: '[MLflow Registry] Model version v2.4.0-distro-rag registered with Accuracy=0.984, Loss=0.021',
  },
  {
    id: 'sys-log-6',
    timestamp: new Date(initialLogTime - 600000).toISOString(),
    service: 'jenkins',
    level: 'INFO',
    message: '[Jenkins CI Server] Webhook listener bound to http://localhost:8080/job/linux-assistant/build',
  },
  {
    id: 'sys-log-5',
    timestamp: new Date(initialLogTime - 750000).toISOString(),
    service: 'chromadb',
    level: 'SUCCESS',
    message: '[ChromaDB Engine] Vector store listening on 0.0.0.0:8000. Active collection "linux_manual_rag" loaded.',
  },
  {
    id: 'sys-log-4',
    timestamp: new Date(initialLogTime - 900000).toISOString(),
    service: 'redhat-sandbox-pod',
    level: 'INFO',
    message: '[redhat-sandbox-pod] Started container redhat-sandbox (AlmaLinux 9.4 Seafoam Ocelot)',
  },
  {
    id: 'sys-log-3',
    timestamp: new Date(initialLogTime - 950000).toISOString(),
    service: 'debian-sandbox-pod',
    level: 'INFO',
    message: '[debian-sandbox-pod] Started container debian-sandbox (Ubuntu 24.04 LTS Noble Numbat)',
  },
  {
    id: 'sys-log-2',
    timestamp: new Date(initialLogTime - 1100000).toISOString(),
    service: 'k3s',
    level: 'INFO',
    message: '[k3s-server] Container network plugin Flannel initialized on interface eth0 (10.244.0.0/16)',
  },
  {
    id: 'sys-log-1',
    timestamp: new Date(initialLogTime - 1200000).toISOString(),
    service: 'k3s',
    level: 'INFO',
    message: '[k3s-server] Node k3s-control-plane status set to Ready (v1.30.2+k3s1)',
  },
];

function normalizeService(s: string): string {
  if (!s) return 'all';
  const lower = s.toLowerCase();
  if (lower.includes('debian')) return 'debian-sandbox-pod';
  if (lower.includes('redhat')) return 'redhat-sandbox-pod';
  if (lower.includes('jenkins')) return 'jenkins';
  if (lower.includes('chroma')) return 'chromadb';
  if (lower.includes('mlflow')) return 'mlflow';
  if (lower.includes('k3s')) return 'k3s';
  return lower;
}

function addSystemLog(
  service: 'k3s' | 'jenkins' | 'chromadb' | 'debian-sandbox-pod' | 'redhat-sandbox-pod' | 'mlflow',
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR',
  message: string
) {
  const logItem: SystemLogItem = {
    id: `sys-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    service,
    level,
    message,
  };
  systemLogs.unshift(logItem);
  if (systemLogs.length > 200) {
    systemLogs = systemLogs.slice(0, 200);
  }
}

// Helper to chunk text for vector store simulation
function chunkDocument(doc: RAGDocument): RAGChunk[] {
  const paragraphs = doc.content.split('\n\n').filter((p) => p.trim().length > 0);
  return paragraphs.map((p, idx) => ({
    id: `${doc.id}-chunk-${idx}`,
    docId: doc.id,
    docTitle: doc.title,
    distroTag: doc.distroTag,
    content: p,
  }));
}

// Perform simple vector/semantic search over chunks with distro tag filtering
function searchRAGChunks(query: string, distroFilter: DistroFamily, topK = 4): RAGChunk[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const allChunks: RAGChunk[] = [];
  for (const doc of documentsStore) {
    // Distro filter: match selected distro or universal
    if (doc.distroTag === distroFilter || doc.distroTag === 'universal') {
      allChunks.push(...chunkDocument(doc));
    }
  }

  // Score chunks by keyword occurrence & density
  const scored = allChunks.map((chunk) => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (contentLower.includes(kw)) {
        score += 2;
      }
    }
    // Extra boost if chunk title matches
    if (chunk.docTitle.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    return { ...chunk, score };
  });

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scored.slice(0, topK);
}

// State for Jenkins build pipeline simulation
let buildCounter = 104;
let lastPipelineRun: JenkinsPipelineRun | null = {
  id: `build-103`,
  jobName: 'linux-assistant',
  buildNumber: 103,
  status: 'SUCCESS',
  startTime: new Date(Date.now() - 3600000).toISOString(),
  duration: '42s',
  triggeredBy: 'Webhook trigger from local RAG ingest',
  stages: [
    { name: 'Git Checkout', status: 'SUCCESS', duration: '3s' },
    { name: 'Vector DB Re-indexing', status: 'SUCCESS', duration: '12s' },
    { name: 'Unit Tests & Syntax Check', status: 'SUCCESS', duration: '8s' },
    { name: 'ML Model Evaluation', status: 'SUCCESS', duration: '14s' },
    { name: 'Container Pod Deploy', status: 'SUCCESS', duration: '5s' },
  ],
  logs: [
    '[INFO] Jenkins Webhook received at /job/linux-assistant/build',
    '[INFO] Checking out branch origin/main (Commit 8f3a9d2)',
    '[INFO] Ingesting documents into ChromaDB local vector store...',
    '[SUCCESS] Vector store re-indexed with distro metadata tags [debian, redhat]',
    '[INFO] Executing PyTest command validation suite (18/18 passed)',
    '[INFO] Training Llama-3.1-8B-Instruct intent classification adapter...',
    '[SUCCESS] Model validation passed: Accuracy 98.4%, Loss 0.021',
    '[INFO] Refreshing K3s pod sandboxes: debian-sandbox-pod & redhat-sandbox-pod',
    '[SUCCESS] Pipeline completed successfully in 42s.',
  ],
};

// State for MLflow model metrics
let mlModelMetrics: MLModelMetrics = {
  version: 'v2.4.0-distro-rag',
  accuracy: 0.984,
  f1Score: 0.981,
  loss: 0.021,
  datasetSize: 1420,
  lastRetrained: new Date().toISOString(),
  lossHistory: [
    { epoch: 1, loss: 0.45, accuracy: 0.82 },
    { epoch: 2, loss: 0.28, accuracy: 0.89 },
    { epoch: 3, loss: 0.14, accuracy: 0.94 },
    { epoch: 4, loss: 0.06, accuracy: 0.97 },
    { epoch: 5, loss: 0.021, accuracy: 0.984 },
  ],
};

// --- API ROUTES ---

// 1. Query Assistant
app.post('/api/assistant/query', async (req, res) => {
  const { prompt, targetDistro } = req.body as { prompt: string; targetDistro: DistroFamily };
  const selectedDistro = targetDistro === 'redhat' ? 'redhat' : 'debian';

  // RAG Search
  const retrievedChunks = searchRAGChunks(prompt, selectedDistro, 3);
  addSystemLog(
    'chromadb',
    'INFO',
    `[ChromaDB] Vector context search executed for query "${prompt.slice(0, 45)}..." [Target: ${selectedDistro}]. Retrieved ${retrievedChunks.length} chunks.`
  );
  const ragContextText = retrievedChunks
    .map((c) => `[Source: ${c.docTitle} (${c.distroTag})]\n${c.content}`)
    .join('\n\n');

  const systemInstruction = `You are an expert MLOps Engineer and Linux Systems Specialist. You power an air-gapped, distro-aware AI Linux Assistant.

System Constraints:
Target OS Family: ${selectedDistro === 'debian' ? 'Debian / Ubuntu Family (apt, dpkg, netplan, ufw, AppArmor)' : 'Red Hat / RHEL Family (dnf, rpm, NetworkManager/nmcli, firewalld, SELinux)'}

Distribution Translation Rules:
- Debian-based: Package mgmt = 'apt update && apt install -y <pkg>', Direct package = 'dpkg -i <file>.deb', Firewall = 'ufw', Network = Netplan '/etc/netplan/', Security = AppArmor 'aa-status'.
- Red Hat-based: Package mgmt = 'dnf install -y <pkg>', Direct package = 'rpm -ivh <file>.rpm', Firewall = 'firewalld' ('firewall-cmd'), Network = NetworkManager ('nmcli'), Security = SELinux ('sestatus', 'getenforce', 'chcon', 'setenforce').

RAG Context Retrieved from Local Knowledge Base:
${ragContextText || 'No specific man-page chunks retrieved.'}

Your response MUST be formatted strictly as valid JSON matching this schema:
{
  "targetDistro": "${selectedDistro}",
  "suggestedCommand": "the exact bash command line",
  "breakdown": "Explanation of the command and its flags, highlighting distribution-specific quirks (e.g. package names like apache2 vs httpd, or ufw vs firewall-cmd)",
  "alternativeSyntax": "1-line note showing how the equivalent command looks in the opposite distribution family",
  "safetyWarning": "Local safety warning note (e.g., destructive flags rm/dd/mkfs or container sandbox isolation context)"
}

Return ONLY raw JSON with no markdown block wrappers around the JSON.`;

  try {
    const userKey = (req.headers['x-gemini-api-key'] as string) || (req.body as any)?.apiKey;
    const ai = getGeminiClient(userKey);
    if (ai) {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '';
      const parsed = safeParseJSON(responseText);
      if (parsed && parsed.suggestedCommand) {
        return res.json({
          ...parsed,
          retrievedDocs: retrievedChunks,
        });
      }
    }
  } catch (err) {
    console.warn('Gemini API query temporary error, using rule fallback engine:', err);
  }

  // Fallback Rule Engine if AI API is offline or returns invalid structure
  const fallbackRes = generateRuleBasedCommand(prompt, selectedDistro, retrievedChunks);
  return res.json({
    ...fallbackRes,
    retrievedDocs: retrievedChunks,
  });
});

// 2. Debug Failed Command
app.post('/api/assistant/debug', async (req, res) => {
  const { command, stdout, stderr, targetDistro } = req.body as {
    command: string;
    stdout: string;
    stderr: string;
    targetDistro: DistroFamily;
  };

  const userKey = (req.headers['x-gemini-api-key'] as string) || (req.body as any)?.apiKey;
  const ai = getGeminiClient(userKey);
  if (ai) {
    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: `Command failed on Linux container pod [Distro: ${targetDistro}].
Failed Command: ${command}
Stdout: ${stdout}
Stderr: ${stderr}

Diagnose the root cause (e.g., package manager syntax difference like apt vs dnf, missing package name, SELinux context denial, or missing privileges) and provide the exact fixed command.
Return JSON format with keys: "rootCause", "fixedCommand", "explanation".`,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = safeParseJSON(response.text || '{}');
      if (parsed) {
        return res.json(parsed);
      }
    } catch (e) {
      console.warn('Debug query temporary error, falling back:', e);
    }
  }

  // Fallback debug response
  addSystemLog(
    'k3s',
    'WARN',
    `[AI Debugger] Root-cause diagnosis requested for failed command "${command.slice(0, 45)}..." [Target: ${targetDistro}].`
  );

  return res.json({
    rootCause: stderr.includes('Permission denied')
      ? 'Missing root privileges for system management task.'
      : stderr.includes('not found') || stderr.includes('command not found')
        ? `Command or package manager not installed in current ${targetDistro} environment.`
        : stderr.includes('SELinux')
          ? 'SELinux security context permission denial.'
          : 'Syntax mismatch or missing prerequisite package in container pod.',
    fixedCommand:
      targetDistro === 'debian'
        ? `sudo apt update && sudo ${command}`
        : `sudo dnf install -y policycoreutils-python-utils && sudo ${command}`,
    explanation: `Adjusted command syntax for ${targetDistro} container pod execution requirements.`,
  });
});

// 2b. Execute / Simulate Shell Command on Target Distro Pod
app.post('/api/assistant/exec', async (req, res) => {
  const { command, targetDistro, podId } = req.body as {
    command: string;
    targetDistro: DistroFamily;
    podId: string;
  };

  const targetSvc = podId.includes('debian') ? 'debian-sandbox-pod' : 'redhat-sandbox-pod';

  const userKey = (req.headers['x-gemini-api-key'] as string) || (req.body as any)?.apiKey;
  const ai = getGeminiClient(userKey);
  if (ai) {
    try {
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.6-flash',
        contents: `You are a real Linux terminal emulator executing shell commands inside a K3s pod container.
Pod ID: ${podId}
Distribution Family: ${targetDistro === 'debian' ? 'Debian / Ubuntu 24.04 LTS' : 'Red Hat / AlmaLinux 9.4'}
User Executed Shell Command: \`${command}\`

Instructions:
1. If the command uses a tool or package manager NOT available on ${targetDistro} (e.g. running 'apt' on Red Hat, or 'dnf'/'sestatus'/'firewall-cmd' on Debian), return an authentic bash error in stderr, e.g. "bash: <cmd>: command not found", set exitCode to 127, and empty stdout.
2. If the command is valid for ${targetDistro}, generate authentic, realistic Linux terminal stdout output that a real SRE or Linux admin would see on ${targetDistro}. Set exitCode to 0 and empty stderr.
3. If the command is a syntax error or failed command, return the real Linux stderr, e.g. "cat: non_existent_file: No such file or directory", set exitCode to 1 or 2.
4. Do NOT wrap output in markdown code blocks or quotes.

Return JSON strictly matching this schema:
{
  "stdout": "the exact terminal standard output text",
  "stderr": "the exact error message text if any, or empty string",
  "exitCode": 0
}`,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text || '{}';
      const parsed = safeParseJSON(responseText) || {};
      const exitCodeNum = typeof parsed.exitCode === 'number' ? parsed.exitCode : 0;
      addSystemLog(
        targetSvc as any,
        exitCodeNum === 0 ? 'SUCCESS' : 'ERROR',
        `[${podId}] Executed shell command: "${command.slice(0, 60)}" (Exit Code: ${exitCodeNum}).`
      );

      return res.json({
        stdout: typeof parsed.stdout === 'string' ? parsed.stdout : '',
        stderr: typeof parsed.stderr === 'string' ? parsed.stderr : '',
        exitCode: exitCodeNum,
      });
    } catch (e) {
      console.warn('Gemini exec simulation temporary error, falling back:', e);
    }
  }

  // Fallback simulation response if AI is offline
  addSystemLog(
    targetSvc as any,
    'SUCCESS',
    `[${podId}] Executed shell command: "${command.slice(0, 60)}" (Exit Code: 0).`
  );

  return res.json({
    stdout: `[${podId}:${targetDistro}] ${command}: operation executed successfully.`,
    stderr: '',
    exitCode: 0,
  });
});

// 3. RAG Documents Endpoints
app.get('/api/rag/documents', (req, res) => {
  return res.json(documentsStore);
});

app.post('/api/rag/ingest', async (req, res) => {
  const { title, content, distroTag, source } = req.body as {
    title: string;
    content: string;
    distroTag: 'debian' | 'redhat' | 'universal';
    source?: string;
  };

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const newDoc: RAGDocument = {
    id: `doc-${Date.now()}`,
    title,
    content,
    distroTag: distroTag || 'universal',
    source: source || 'User PDF Ingest',
    chunkCount: Math.ceil(content.length / 300),
    createdAt: new Date().toISOString(),
    fileSize: `${(content.length / 1024).toFixed(1)} KB`,
  };

  documentsStore.unshift(newDoc);
  addSystemLog(
    'chromadb',
    'SUCCESS',
    `[ChromaDB Engine] Ingested document "${newDoc.title}" (${newDoc.distroTag}). Total documents in store: ${documentsStore.length}.`
  );

  // Automatically trigger Jenkins webhook simulation upon PDF ingest
  buildCounter++;
  const buildId = `build-${buildCounter}`;
  lastPipelineRun = {
    id: buildId,
    jobName: 'linux-assistant',
    buildNumber: buildCounter,
    status: 'SUCCESS',
    startTime: new Date().toISOString(),
    duration: '28s',
    triggeredBy: `Webhook auto-trigger from document upload: "${title}"`,
    stages: [
      { name: 'Git Checkout', status: 'SUCCESS', duration: '2s' },
      { name: 'PyPDF / Text Chunking', status: 'SUCCESS', duration: '5s' },
      { name: 'ChromaDB Vector Store Update', status: 'SUCCESS', duration: '8s' },
      { name: 'Intent Classifier Fine-tuning', status: 'SUCCESS', duration: '10s' },
      { name: 'K3s Pod Sandbox Sync', status: 'SUCCESS', duration: '3s' },
    ],
    logs: [
      `[POST /job/linux-assistant/build] Triggered by RAG document ingest: "${title}"`,
      `[INFO] Document tagged with distro metadata: "${distroTag}"`,
      `[INFO] Ingesting ${newDoc.chunkCount} vector chunks into local ChromaDB partition...`,
      `[SUCCESS] ChromaDB embedding updated. Total documents in store: ${documentsStore.length}`,
      `[INFO] Running model validation & pod synchronization...`,
      `[SUCCESS] Build #${buildCounter} completed successfully in 28s.`,
    ],
  };

  addSystemLog(
    'jenkins',
    'INFO',
    `[Jenkins CI Server] Webhook auto-triggered Build #${buildCounter} from document upload "${title}".`
  );

  return res.json({
    document: newDoc,
    pipelineRun: lastPipelineRun,
  });
});

app.delete('/api/rag/documents/:id', (req, res) => {
  const { id } = req.params;
  documentsStore = documentsStore.filter((doc) => doc.id !== id);
  addSystemLog(
    'chromadb',
    'WARN',
    `[ChromaDB Engine] Vector document ${id} deleted. Remaining documents: ${documentsStore.length}.`
  );
  return res.json({ success: true, remaining: documentsStore.length });
});

app.post('/api/rag/purge', (req, res) => {
  documentsStore = [];
  addSystemLog('chromadb', 'WARN', '[ChromaDB Engine] All vector store document chunks purged by admin.');
  return res.json({ success: true, message: 'All vector store chunks purged.' });
});

// 4. Jenkins Webhook & Pipeline Endpoints
app.get('/api/webhook/jenkins', (req, res) => {
  return res.json(lastPipelineRun);
});

app.post('/api/webhook/jenkins', (req, res) => {
  buildCounter++;
  lastPipelineRun = {
    id: `build-${buildCounter}`,
    jobName: 'linux-assistant',
    buildNumber: buildCounter,
    status: 'SUCCESS',
    startTime: new Date().toISOString(),
    duration: '35s',
    triggeredBy: 'Manual Webhook HTTP POST to http://localhost:8080/job/linux-assistant/build',
    stages: [
      { name: 'Git Checkout', status: 'SUCCESS', duration: '3s' },
      { name: 'ChromaDB Vector Ingest', status: 'SUCCESS', duration: '10s' },
      { name: 'Model Training & Evaluation', status: 'SUCCESS', duration: '15s' },
      { name: 'Container Pod Deployment', status: 'SUCCESS', duration: '7s' },
    ],
    logs: [
      `[HTTP POST] Triggering Jenkins job /job/linux-assistant/build (Build #${buildCounter})`,
      `[INFO] Fetching latest Linux man-pages & custom PDF vectors...`,
      `[INFO] Training intent classifier on Debian & RedHat command patterns...`,
      `[INFO] Evaluating accuracy against 500 test Linux administrative queries...`,
      `[SUCCESS] Model accuracy: 98.7% (Loss: 0.018)`,
      `[INFO] Deploying updated artifacts to debian-sandbox-pod and redhat-sandbox-pod in K3s cluster.`,
      `[SUCCESS] Jenkins pipeline Build #${buildCounter} finished with status SUCCESS.`,
    ],
  };

  addSystemLog(
    'jenkins',
    'SUCCESS',
    `[Jenkins Build #${buildCounter}] Manual webhook pipeline triggered. Status: SUCCESS in 35s.`
  );

  return res.json(lastPipelineRun);
});

// 5. MLflow Pipeline Endpoints
app.get('/api/pipeline/mlflow', (req, res) => {
  return res.json(mlModelMetrics);
});

app.post('/api/pipeline/retrain', (req, res) => {
  const nextAcc = Math.min(0.995, mlModelMetrics.accuracy + 0.003);
  const nextLoss = Math.max(0.008, mlModelMetrics.loss - 0.002);
  mlModelMetrics = {
    ...mlModelMetrics,
    version: `v2.4.${Math.floor(Math.random() * 90 + 10)}-distro-rag`,
    accuracy: Number(nextAcc.toFixed(3)),
    loss: Number(nextLoss.toFixed(3)),
    datasetSize: mlModelMetrics.datasetSize + 45,
    lastRetrained: new Date().toISOString(),
    lossHistory: [
      ...mlModelMetrics.lossHistory,
      {
        epoch: mlModelMetrics.lossHistory.length + 1,
        loss: Number(nextLoss.toFixed(3)),
        accuracy: Number(nextAcc.toFixed(3)),
      },
    ],
  };

  addSystemLog(
    'mlflow',
    'SUCCESS',
    `[MLflow Registry] Fine-tuning epoch complete. Model updated to version ${mlModelMetrics.version} (Accuracy: ${(mlModelMetrics.accuracy * 100).toFixed(1)}%).`
  );

  return res.json(mlModelMetrics);
});

// 6. Underlying System Infrastructure Endpoints (K3s, Jenkins, ChromaDB, MLflow)
let mockPodsState = [
  {
    id: 'debian-sandbox-pod',
    name: 'debian-sandbox-pod',
    namespace: 'default',
    status: 'Running',
    restarts: 0,
    age: '4h12m',
    ip: '10.244.0.12',
    node: 'k3s-control-plane',
    cpuUsage: '12m (1.2%)',
    memoryUsage: '210Mi',
  },
  {
    id: 'redhat-sandbox-pod',
    name: 'redhat-sandbox-pod',
    namespace: 'default',
    status: 'Running',
    restarts: 0,
    age: '4h12m',
    ip: '10.244.0.13',
    node: 'k3s-control-plane',
    cpuUsage: '15m (1.5%)',
    memoryUsage: '245Mi',
  },
  {
    id: 'chromadb-vector-store-0',
    name: 'chromadb-vector-store-0',
    namespace: 'default',
    status: 'Running',
    restarts: 0,
    age: '2h45m',
    ip: '10.244.0.14',
    node: 'k3s-control-plane',
    cpuUsage: '45m (4.5%)',
    memoryUsage: '512Mi',
  },
  {
    id: 'jenkins-runner-7d49f6b98-x2k9l',
    name: 'jenkins-runner-7d49f6b98-x2k9l',
    namespace: 'ci-cd',
    status: 'Running',
    restarts: 1,
    age: '5h30m',
    ip: '10.244.0.15',
    node: 'k3s-control-plane',
    cpuUsage: '68m (6.8%)',
    memoryUsage: '840Mi',
  },
  {
    id: 'mlflow-registry-5f884b-z812',
    name: 'mlflow-registry-5f884b-z812',
    namespace: 'mlops',
    status: 'Running',
    restarts: 0,
    age: '3h15m',
    ip: '10.244.0.16',
    node: 'k3s-control-plane',
    cpuUsage: '22m (2.2%)',
    memoryUsage: '320Mi',
  },
];

app.get('/api/system/overview', (req, res) => {
  const totalChunks = documentsStore.reduce((acc, doc) => acc + (doc.chunkCount || 1), 0);
  return res.json({
    k3s: {
      status: 'healthy',
      version: 'v1.30.2+k3s1',
      podsCount: mockPodsState.length,
      activeNode: 'k3s-control-plane',
      cpuTotal: '162m / 4000m (4.1%)',
      memTotal: '2.12Gi / 16.0Gi (13.2%)',
    },
    jenkins: {
      status: 'online',
      version: '2.452.1',
      url: 'http://localhost:8080/job/linux-assistant',
      executorCount: 2,
      activeJobs: lastPipelineRun?.status === 'IN_PROGRESS' ? 1 : 0,
    },
    chroma: {
      status: 'ready',
      version: '0.5.0',
      collection: 'linux_manual_rag',
      vectorsCount: totalChunks,
      dimension: 384,
      distanceMetric: 'cosine',
    },
    mlflow: {
      status: 'active',
      version: '2.14.0',
      activeModel: mlModelMetrics.version,
      artifactUri: 's3://mlflow-artifacts/linux-command-synthesis',
    },
  });
});

app.get('/api/system/k3s/pods', (req, res) => {
  return res.json(mockPodsState);
});

app.post('/api/system/k3s/pod/:id/restart', (req, res) => {
  const { id } = req.params;
  mockPodsState = mockPodsState.map((pod) => {
    if (pod.id === id || pod.name === id) {
      return {
        ...pod,
        restarts: pod.restarts + 1,
        status: 'Running',
        age: '0m',
      };
    }
    return pod;
  });

  const svcTag = normalizeService(id) as any;
  addSystemLog(svcTag, 'WARN', `[k3s-server] Pod restart triggered for container "${id}". Pod recreated on node k3s-control-plane.`);

  return res.json({ success: true, message: `Pod ${id} restarted successfully in K3s cluster.`, pods: mockPodsState });
});

app.get('/api/system/logs', (req, res) => {
  const service = (req.query.service as string) || 'all';
  const target = normalizeService(service);

  if (target === 'all') {
    return res.json(systemLogs);
  }

  const filtered = systemLogs.filter((l) => normalizeService(l.service) === target);
  return res.json(filtered);
});

// --- VITE & SERVER LISTEN ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const initialPort = Number(process.env.PORT) || 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = __dirnameResolved;
    }
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      distPath = path.join(__dirnameResolved, '../dist');
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenOnPort = (port: number) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const actualPort = (server.address() as any)?.port || port;
      process.env.SERVED_PORT = String(actualPort);
      console.log(`Distro-Aware AI Linux Assistant server running on http://localhost:${actualPort}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Port ${port} in use, trying port ${port + 1}...`);
        if (port < 3010) {
          listenOnPort(port + 1);
        } else {
          console.error('[Server] Could not find an open port between 3000 and 3010.');
        }
      } else {
        console.error('[Server] Listen error:', err);
      }
    });
  };

  listenOnPort(initialPort);
}

startServer();
