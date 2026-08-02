# local-linux-ai-lab

> **Local Linux AI Bash command line Assistant With Air-Gapped MLOps Pipeline**

An air-gapped, distro-aware AI Operations platform designed for Linux systems engineers, SREs, and MLOps practitioners. `local-linux-ai-lab` combines a multi-pod K3s sandboxed web shell, vector-backed RAG knowledge retrieval (ChromaDB), local AI command translation, and Jenkins/MLflow automation pipelines.

---

## 👨‍💻 Project & Author Information

- **Application Name**: `local-linux-ai-lab`
- **Author**: Sverrir Arason
- **Author Email**: `sverrir.arason@gmail.com`
- **Homepage**: [https://github.com/samarason/local-linux-ai-lab](https://github.com/samarason/local-linux-ai-lab)
- **GitHub Repository**: [https://github.com/samarason/local-linux-ai-lab.git](https://github.com/samarason/local-linux-ai-lab.git)

---

## 🔑 Gemini API Key Configuration & Requirements

To unlock full AI functionality—including natural language command generation, distro-aware shell script synthesis, real-time command execution modeling, and intelligent terminal error debugging—a **Google Gemini API Key** is required.

### 💡 Why a Gemini API Key is Required
`local-linux-ai-lab` leverages Google Gemini AI models server-side to dynamically translate natural language requirements into exact, distribution-specific Linux commands (for `Debian/Ubuntu` and `RedHat/AlmaLinux`), evaluate complex shell operations in real time, and analyze non-zero exit code terminal errors with targeted fix recommendations. 

*Note: If no API key is provided, the platform operates in fallback offline mode using static RAG rules and pre-indexed manual pages.*

### 🛠️ How to Obtain a Free Gemini API Key
1. Navigate to **[Google AI Studio API Key Manager](https://aistudio.google.com/app/apikey)** or visit **[Google AI Studio](https://aistudio.google.com/)**.
2. Sign in with your Google account.
3. Click **Create API key** (you can generate a key in a new or existing project).
4. Copy your newly generated API key string.

### ⚙️ How to Set Your Key in the Application
- **Header Settings Modal**: Click the **🔑 API Key** button in the top navigation header bar, paste your key into the text field, and click **Save Key**. The key is stored locally in your browser (`localStorage`) and attached to server-side backend requests (`/api/*`).
- **Environment Variable (`.env`)**: Alternatively, set `GEMINI_API_KEY=your_api_key_here` inside a `.env` file in the project root directory when launching the server locally.

---

## 🌟 Key Features

### 1. 🐧 Distro-Aware AI Command Generator
- **Multi-Family Support**: Switch seamlessly between **Debian / Ubuntu** (`apt`, `ufw`, `AppArmor`, `Netplan`) and **Red Hat / RHEL** (`dnf`, `firewalld`, `SELinux`, `NetworkManager`).
- **Syntax Validation**: Converts natural language requests into exact terminal commands tailored to the target operating system family.
- **Safety Advisories**: Highlights high-risk commands (e.g., partition edits, firewall drop rules) with localized security warnings.
- **1-Click Shell Injection**: Direct command execution into active sandbox pods with a single click.

### 2. 💻 Sandboxed Interactive Shell Terminal
- **Dual K3s Pod Isolation**: Switch between active pods:
  - `debian-sandbox-pod` (*Ubuntu 24.04 LTS*)
  - `redhat-sandbox-pod` (*AlmaLinux 9.4*)
- **Interactive Shell Emulator**: Supports standard package managers (`apt`, `dpkg`, `dnf`, `rpm`), service managers (`systemctl`), firewalls (`ufw`, `firewall-cmd`), and network tooling (`ip`, `netplan`, `nmcli`).
- **AI Terminal Debugger**: Diagnoses failed commands (`exitCode != 0`) with root-cause analysis, alternative syntax suggestions, and 1-click fix execution.

#### 🛡️ Sandbox Purpose, Installed Packages & Expected Command Output

##### Purpose of the Sandboxes
The K3s sandboxed terminal pods serve as an isolated, zero-risk staging environment. System administrators, SREs, and MLOps engineers can dry-run, test, and validate AI-generated commands and multi-line shell scripts before running them on production servers or host infrastructure.

##### Installed Software & Environment Tooling
Each pod environment comes pre-loaded with distro-native utilities and simulation modules:
- **`debian-sandbox-pod` (Ubuntu 24.04 LTS)**:
  - **Package Management**: `apt`, `apt-get`, `dpkg`
  - **Security & Firewall**: `ufw`, AppArmor (`aa-status`)
  - **Networking**: `netplan`, `iproute2` (`ip addr`, `ip route`), `curl`, `wget`
  - **System & Services**: `systemctl`, `journalctl`, `init`
  - **DevOps Tools**: `git`, `python3`, `docker`, `kubectl`
  - **Core Utilities**: `cat`, `ls`, `ps`, `top`, `free`, `df`, `whoami`, `pwd`, `date`, `uname`
- **`redhat-sandbox-pod` (AlmaLinux 9.4)**:
  - **Package Management**: `dnf`, `yum`, `rpm`
  - **Security & Firewall**: `firewalld` (`firewall-cmd`), SELinux (`sestatus`, `getenforce`, `setenforce`, `chcon`)
  - **Networking**: NetworkManager (`nmcli`), `iproute2` (`ip addr`), `curl`, `wget`
  - **System & Services**: `systemctl`, `journalctl`, `init`
  - **DevOps Tools**: `git`, `python3`, `docker`, `kubectl`
  - **Core Utilities**: `cat`, `ls`, `ps`, `top`, `free`, `df`, `whoami`, `pwd`, `date`, `uname`

##### Expected Command Output & Behavior
1. **Distro-Mismatch Rejection**: Executing a package manager or tool specific to another family (e.g., calling `apt` inside `redhat-sandbox-pod` or `dnf` / `sestatus` inside `debian-sandbox-pod`) yields standard Linux command-not-found errors (`exitCode 127`) in `stderr` along with distro guidance.
2. **Distro-Native System Output**: Standard administrative commands (`cat /etc/os-release`, `ip addr`, `systemctl status`, `free -m`, `ps aux`, `sestatus`, `ufw status`) return realistic, high-fidelity `stdout` output styled after live Linux servers.
3. **AI-Powered Real-Time Execution**: Unhandled, custom, or complex chained commands (`&&`, `;`, `piping`) are evaluated by the backend server-side AI shell model to produce authentic `stdout`/`stderr` terminal text and correct exit status codes (`exitCode 0` or non-zero).
4. **Interactive Error Handling**: Any command returning a non-zero exit code renders an interactive error block with a **Debug Error with AI** button to analyze root causes and generate one-click corrective commands.

### 3. 📚 Local Vector Store & RAG Manager (ChromaDB)
- **Document & Man-Page Ingest**: Upload PDF files or paste raw technical manuals and security guidelines into the local vector index.
- **Metadata Partitioning**: Filter and tag documentation by target distribution (`debian`, `redhat`, or `universal`).
- **Contextual Chunk Retrieval**: Automatically injects relevant manual pages into AI prompts to ensure high-accuracy command synthesis.

### 4. ⚙️ Jenkins CI/CD & MLflow MLOps Pipeline
- **Webhook Orchestration**: Trigger local Jenkins build jobs (`http://localhost:8080/job/linux-assistant/build`) for automated document re-indexing.
- **Live Stage Tracking**: Visualize stage progress (`Git Checkout`, `PyPDF Ingest`, `ChromaDB Embeddings`, `Model Validation`) with execution timers and live console logs.
- **MLflow Model Registry**: Monitor model metrics (*Accuracy*, *Loss*, *F1 Score*, *Dataset Size*) with interactive loss curves and instant model retraining capabilities.

### 5. 🖥️ Underlying Systems Dashboard & Unified Log Streamer
- **K3s Kubernetes Topology**: Monitor active pods (`debian-sandbox-pod`, `redhat-sandbox-pod`, `chromadb-vector-store-0`, `jenkins-runner`, `mlflow-registry`), node resource metrics, and trigger pod restarts.
- **Interactive Kubectl CLI Inspector**: Run pre-configured or custom `kubectl` commands (`get pods -A`, `top pods`, `top nodes`, `cluster-info`) directly within the dashboard.
- **Jenkins Master & Build Logs**: Inspect job status, executor activity, stage timing, and raw build console output streams.
- **ChromaDB Vector Inspector**: Perform live test queries against the local vector store to view cosine distance scores and chunk matches.
- **Unified Air-Gapped Log Streamer**: Filter, search, and inspect live log streams across K3s, sandbox containers, Jenkins, ChromaDB, and MLflow with severity level filtering (`INFO`, `SUCCESS`, `WARN`, `ERROR`).

### 6. 🔑 Standalone Gemini API Key Settings Modal & Hybrid Air-Gap Runtime
- **Header Settings Modal (`/src/components/Header.tsx`)**: Easily configure and toggle custom Gemini API keys directly from the top header status bar (`#btn-api-key-modal`).
- **Client State & API Propagation (`/src/App.tsx`)**: User-configured API keys are safely persisted in browser `localStorage` (`gemini_api_key`) and automatically attached to backend API requests (`/api/assistant/query`, `/api/assistant/exec`, `/api/assistant/debug`) via the `x-gemini-api-key` request header and payload parameters.
- **Dual-Engine Execution**:
  - **Cloud LLM Mode**: When a valid Gemini API key is configured, the Express backend uses Gemini models for real-time natural language command synthesis, shell simulation, and automated terminal debugging.
  - **Air-Gapped Local Mode**: When no API key is set, the application runs entirely offline, leveraging local ChromaDB vector embeddings and distro-aware rule engines without sending external network requests.

---

## 💻 Standalone Desktop Packages (Electron)

`local-linux-ai-lab` can be built and packaged into standalone desktop installer binaries (`.msi`, `.pkg`, `.rpm`, `.deb`, `.AppImage`, `.exe`):

- **Windows (`.msi` & `.exe`)**:
  ```bash
  npm run dist:win   # (or npm run distro:win)
  ```
- **macOS (`.pkg` & `.dmg`)**:
  ```bash
  npm run dist:mac   # (or npm run distro:mac)
  ```
- **Linux (`.rpm`, `.deb`, `.AppImage`)**:
  ```bash
  npm run dist:linux # (or npm run distro:linux)
  ```
- **All Target Platforms**:
  ```bash
  npm run dist:all   # (or npm run distro:all)
  ```

---

## 🎨 Theme & UI Architecture

Styled with the **"Elegant Dark"** design palette:
- **Canvas**: Deep `#0D0D0F` dark mode background with muted border outlines (`#2A2A2E`).
- **Accents**: Neon Cyan (`#06B6D4`), Emerald Green (`#22C55E`), and Distro Accents (Rose for Debian, Amber for Red Hat).
- **Typography**: High-legibility monospaced font sizing for terminal output, system logs, and code blocks paired with clean display text.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide React Icons
- **Backend API**: Express.js server providing REST endpoints for RAG ingestion, assistant query generation, error debugging, and pipeline automation webhooks
- **Desktop Runtime**: Electron + `electron-builder`
- **AI Integration**: Google GenAI TypeScript SDK (`@google/genai`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation & Execution

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will launch on `http://localhost:3000`.

3. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 📁 API Endpoints

- `POST /api/assistant/query` — Generates distribution-specific bash commands from natural language.
- `POST /api/assistant/debug` — Analyzes failed terminal output and returns root cause + fix.
- `GET /api/rag/documents` — Fetches current RAG vector store documents.
- `POST /api/rag/ingest` — Ingests document chunks into ChromaDB and triggers Jenkins webhook.
- `DELETE /api/rag/documents/:id` — Removes document from vector store.
- `POST /api/webhook/jenkins` — Simulates Jenkins CI/CD pipeline build trigger.
- `POST /api/pipeline/retrain` — Triggers MLflow model retraining pass.

---

## 🔒 Security & Air-Gap Compliance

Designed for air-gapped environment workflows with strict local container isolation and minimal external dependencies.

- **Client-Managed API Credentials**: Custom Gemini API keys are configured strictly via the standalone header modal (`/src/components/Header.tsx`), stored in client `localStorage`, and supplied on a per-request basis to backend endpoints (`/src/App.tsx`).
- **Air-Gapped Fallback Engine**: If no API key is provided, the platform functions seamlessly without internet connectivity using local vector RAG retrieval and rule engines.
