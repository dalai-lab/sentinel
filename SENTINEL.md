# Sentinel

> **Infrastructure Health, Security & Observability Platform**

---

## Project Overview

**Sentinel** is a centralized platform that continuously monitors the health, performance, security, and availability of all company servers from a single dashboard.

Instead of logging into multiple servers and manually checking CPU, Docker, logs, SSL certificates, backups, or security incidents, Sentinel provides one unified interface with real-time monitoring, intelligent alerts, and historical analysis.

The platform is designed to be production-ready while also serving as a hackathon project that demonstrates modern DevOps, observability, and infrastructure management.

### Hackathon Strategy: Agents of SigNoz

Sentinel is primarily targeting **Track 02 (Signals & Dashboards)** and **Track 01 (AI & Agent Observability)**. We will heavily utilize the SigNoz MCP server and Query Builder to power our custom dashboards and autonomous SRE capabilities.

### Sentinel vs. SigNoz (The Architecture)

To build this quickly for the hackathon, the project is split into two halves:

1. **The Backend Engine (SigNoz):** Deployed on a remote cloud server (`80.225.241.81`), SigNoz does the heavy lifting. It collects metrics (CPU, RAM, Logs) from all target servers via OTLP.
2. **The Secure Proxy (Node.js Backend):** A lightweight Express.js server that holds the SigNoz Service Account API Key and proxies metric queries from the dashboard frontend securely. The frontend never sees any secrets.
3. **The Frontend UI (Sentinel):** The custom React dashboard. It calls the Node.js backend proxy to fetch data and renders it in our premium dark-themed UI.
4. **Docker Compose:** Both the frontend (Nginx) and backend (Node.js) run as Docker containers on the Oracle server, managed by `docker-compose.yml`.

---

## The Three Core Questions

Sentinel should answer these three questions **instantly**:

| Question | What it covers |
|---|---|
| ✅ Is every server healthy? | CPU, RAM, Disk, Uptime, Docker, Processes |
| 🔒 Is every service secure? | Attacks, Malware, Firewalls |
| ⚡ Is there anything requiring immediate action? | Alerts, Incidents, Expiring Certs, Failed Backups |

---

## Current Infrastructure

```
Oracle VPS (80.225.241.81) - Central Hub
│
├── Docker Containers (managed by docker-compose.yml)
│   ├── Frontend Container (nginx:alpine, Port 3000)
│   │   └── Serves React app + proxies /api/ to backend
│   └── Backend Container (node:20-alpine, Port 3001)
│       └── Holds API Key, proxies queries to SigNoz
│
├── SigNoz Stack (Docker Compose, direct on host)
│   ├── signoz/signoz:latest        (Port 8080 - UI + API)
│   ├── signoz-otel-collector       (Port 4317, 4318 - OTLP Receiver)
│   ├── clickhouse-server           (Metrics Storage)
│   └── postgres                    (Metadata Storage)
│
└── Nginx (host, Port 80)
    ├── /v1/  → localhost:4318  (OTLP agent data)
    └── /     → localhost:3000  (Sentinel React Dashboard)
│
└── Cloudflare (DNS Proxy)
    └── telemetry.dalai.in → 80.225.241.81
│
└───────── Telemetry Agents (on each monitored server)
           node_exporter (Port 9100)
           otelcol (scrapes node_exporter, sends to telemetry.dalai.in/v1/metrics)
```

> **Key Principle:** Only lightweight telemetry agents run on production servers. All heavy processing happens on the Central Hub.
>
> > [!WARNING]  
> > **Hackathon vs. Production Architecture Note:**  
> > For this hackathon, we are hosting the Central Hub (SigNoz) on the **same hardware** as our production Database Server (`80.225.241.81`) to save costs.  
> > **In a real enterprise production environment**, this is an anti-pattern. The observability backend (SigNoz/ClickHouse) is highly resource-intensive and must run on a completely separate, dedicated server. If they share hardware, the monitoring stack could starve the production databases of RAM/CPU, and a server crash would take down both the databases and the monitoring system simultaneously.
>
---

## Core Modules

### 1. Infrastructure Monitoring

Monitor every server in real time.

**Metrics Collected**
- CPU, RAM, Swap, Disk, Filesystem, Inode Usage
- Network Usage & Speed
- Load Average & Uptime
- Running Processes & System Information
- Mounted Disks

**Historical Graphs**
- 1 Hour · 24 Hours · 7 Days · 30 Days

---

### 2. Docker Monitoring

Automatically discover and monitor Docker containers.

**Metrics Collected**
- Running / Stopped Containers
- Restart Count
- CPU & RAM per Container
- Container Logs
- Image Version & Health Status

**Future Actions**
- Restart Container
- View Logs
- Pull Updates

---

### 3. Website Monitoring

Monitor every website automatically.

**Checks**
- HTTP / HTTPS Status
- Response Time
- Downtime & Redirect Detection
- DNS Resolution
- SSL Certificate Status
- Availability Percentage & Historical Uptime

---

### 4. Database Monitoring

Monitor the database server continuously.

**Metrics Collected**
- Active Connections
- Query Performance & Slow Queries
- Locks & Storage Usage
- Cache Hit Ratio
- Replication Status & Availability

---

### 5. Security Center

Centralized security dashboard combining multiple tools.

#### CrowdSec
- SSH & HTTP Attack Detection
- Blocked IPs & Active Decisions
- Top Countries & Top Attackers

#### Malware Detection (ClamAV)
- Last Scan, Files Scanned, Threat Count
- Infected Files & Scan Duration
- Scheduled nightly


#### Failed Login Detection
- Failed SSH Logins
- Failed Sudo Attempts
- Repeated Authentication Failures

#### Firewall Monitoring
- Firewall Status
- Allowed / Blocked Ports
- Recently Opened Ports

---

### 6. SSL Monitoring

Automatically detect and monitor SSL certificates.

| Field | Detail |
|---|---|
| Expiry Date | Exact date the certificate expires |
| Remaining Days | Days until expiration |
| Certificate Validity | Is the cert currently valid? |
| Domain Match | Does the cert match the domain? |

**Alert Thresholds:** 30 Days · 14 Days · 7 Days · Expired

---

## Agent Troubleshooting & Gotchas

When deploying the OpenTelemetry (OTEL) Collector to your servers (especially when installing it on the **same server** as your SigNoz instance), watch out for these two critical gotchas:

### 1. Prometheus Label Naming Rules
If the OTEL Collector instantly crashes (viewable via `sudo journalctl -u otelcol -n 20`), check your `config.yaml` for invalid labels. 
Prometheus is extremely strict and **does not allow periods (`.`) in label names**. 
- ❌ **Incorrect:** `host.name: "Database-Server"` (Will cause OTEL Collector to crash and fail to start)
- ✅ **Correct:** `host_name: "Database-Server"`

### 2. Localhost Routing (`0.0.0.0` vs `127.0.0.1`)
When configuring the OTEL Prometheus receiver to scrape a local Node Exporter instance, do not use `0.0.0.0` as the target IP. `0.0.0.0` is a listening wildcard, not a routeable IP address, and scraping it will fail silently, resulting in zero metrics arriving at SigNoz.
- ❌ **Incorrect Target:** `0.0.0.0:9100` 
- ✅ **Correct Target:** `127.0.0.1:9100`

> [!TIP]
> **Dashboard Stuck on "Gathering Data"?** 
> If you just installed an agent and your Sentinel dashboard is stuck, remember that our PromQL queries use a `[1m]` rate. It can take up to 60 seconds for the first batch of metrics to flush from Node Exporter -> OTEL Collector -> SigNoz ClickHouse -> React Frontend. Just wait a minute and refresh!

---

## The Secure Telemetry Pipeline (Cloudflare + Nginx)

### Infrastructure Map
To ensure AI agents and developers never forget the layout, here is the exact location of all services:
- **Central Server**: Oracle Cloud VPS (`80.225.241.81`)
- **Public Domain**: `telemetry.dalai.in`
- **DNS/Proxy**: Cloudflare (Orange Cloud / Proxied) → `80.225.241.81`
- **Sentinel Dashboard** (Production): `https://telemetry.dalai.in` served by the Frontend Docker container (Port 3000)
- **SigNoz UI** (Internal only): `http://localhost:8080` — only accessible via SSH tunnel from dev machines
- **SigNoz OTLP Receiver**: `http://localhost:4318` — agents send data to `https://telemetry.dalai.in/v1/metrics`
- **Sentinel Backend API** (Internal): `http://localhost:3001` inside Docker network — proxies metric queries to SigNoz
- **GitHub Repo**: `https://github.com/dalai-lab/sentinel`

#### Monitored Servers (Telemetry Agents Deployed)

All 4 servers have `node_exporter` (Port 9100) and `otelcol` installed and running as systemd services. They continuously scrape CPU, RAM, and system metrics and ship them to `https://telemetry.dalai.in/v1/metrics`.

| # | Name | IP | Hostname | Role |
|---|---|---|---|---|
| 1 | **Oracle database server** | `80.225.241.81` | `instance-20260630-1713` | Central Hub — runs SigNoz, Supabase (multiple projects), Sentinel Dashboard |
| 2 | **Orbithyre** | `31.97.235.136` | `srv1213878` | Web server — hosts the OrbitHyre enterprise platform |
| 3 | **Gaplytiq** | `72.61.235.141` | `srv1176513` | Web server — hosts the Gaplytiq platform |
| 4 | **Dalai** | `168.231.122.248` | `srv1055295` | Web server — hosts Dalai.in and related services |

**Agent Services on Each Server:**
- `node_exporter.service` — Exports system metrics (CPU, RAM, disk, network) on Port `9100`
- `otelcol.service` — Scrapes node_exporter at `127.0.0.1:9100` and forwards to `https://telemetry.dalai.in/v1/metrics`

**To reinstall the agent on a new server:**
```bash
# Download and run the install script
curl -O https://raw.githubusercontent.com/dalai-lab/sentinel/main/install_agent.sh
chmod +x install_agent.sh
./install_agent.sh
```

**To check agent health on any server:**
```bash
sudo systemctl status node_exporter
sudo systemctl status otelcol
```

Instead of opening custom database ports (like `4317` or `8080`) through the Oracle Cloud firewall, we built a fully secure, enterprise-grade pipeline using **Cloudflare** and **Nginx**.

### How Data Flows
1. **The Telemetry Agents** (`install_agent.sh`) collect CPU/RAM data from your servers.
2. They send it securely via HTTPs to `https://telemetry.dalai.in/v1/metrics`.
3. **Cloudflare** intercepts this traffic via a "Flexible SSL" Page Rule, wrapping it in military-grade encryption.
4. Cloudflare forwards the decrypted traffic to **Nginx** (listening on Port 80) on your central Oracle VPS.
5. Nginx proxies the data internally to the SigNoz OTLP HTTP receiver (`localhost:4318`).

### Critical Cloudflare Settings
If you ever need to rebuild this, you must configure Cloudflare correctly, otherwise you will encounter **526 SSL Errors** or **CORS Errors**:
1. **The DNS Record**: Create an `A` record for `telemetry` pointing to your Oracle VPS IP. Turn the proxy status **ON (Orange Cloud)**.
2. **The Page Rule**: Go to Rules -> Page Rules. Create a rule for `telemetry.dalai.in/*`. Set the **SSL/TLS encryption mode** strictly to **Flexible**. *(Do not change your Global SSL settings, as it will break your other websites!)*

### The Nginx Configuration
The Nginx config on the Oracle server is stored at `/etc/nginx/sites-available/telemetry.dalai.in`.
Route 1 sends agent telemetry to the SigNoz OTLP collector. Route 2 sends all web traffic to the Sentinel Dashboard Docker container on port 3000 (not directly to SigNoz anymore!):

```nginx
server {
    listen 80;
    server_name telemetry.dalai.in;

    # Route 1: Telemetry Data from Agents (OTLP HTTP)
    location /v1/ {
        proxy_pass http://localhost:4318;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Route 2: Sentinel React Dashboard (Docker Container)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
*(Note: Do not add manual CORS headers to Nginx! SigNoz natively adds them, and duplicating them will cause the browser to block the dashboard.)*

---

## Production Deployment

### Deploying to Oracle Server
```bash
# Clone the repo
sudo git clone https://github.com/dalai-lab/sentinel.git /var/www/sentinel
cd /var/www/sentinel

# Create the backend environment file (NOT committed to git for security!)
sudo nano backend/.env
```
Paste this in nano:
```env
SIGNOZ_URL=http://host.docker.internal:8080
SIGNOZ_API_KEY=<your_service_account_key_here>
PORT=3001
```
Then deploy:
```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

### Updating Production After Code Changes
```bash
cd /var/www/sentinel
sudo git pull
sudo ./deploy.sh
```

### Local Development (Windows)
Because SigNoz port 8080 is firewalled, you must use an SSH tunnel to access it locally.

**Step 1:** Open the SSH tunnel in a dedicated PowerShell terminal and leave it running:
```powershell
ssh -i "D:\INTERNSHIP\keys\config\ssh-key-2026-06-30.key" -N -L 8080:localhost:8080 ubuntu@80.225.241.81
```

**Step 2:** Make sure your local `backend/.env` points to localhost:
```env
SIGNOZ_URL=http://localhost:8080
SIGNOZ_API_KEY=<your_service_account_key_here>
PORT=3001
```

**Step 3:** Start backend and frontend:
```powershell
# Terminal 1
cd backend; node server.js

# Terminal 2
npm run dev
```
Dashboard is now live at `http://localhost:5173`

---

## Authentication & Security Architecture

| Layer | Method | Details |
|---|---|---|
| **Agent → SigNoz** | HTTPS via Cloudflare | Flexible SSL Page Rule on `telemetry.dalai.in` |
| **Frontend → Backend** | Internal Docker network | `nginx /api/` → `backend:3001` (private, never exposed) |
| **Backend → SigNoz** | `SIGNOZ-API-KEY` header | Service Account Key with `signoz-viewer` role |
| **Public Access** | `telemetry.dalai.in` | Cloudflare + Nginx → Sentinel Dashboard on Port 3000 |
| **SigNoz UI** | SSH Tunnel only | Port 8080 firewalled, only accessible via tunnel |

---

### 7. Backup Monitoring

Monitor all backup jobs and their outcomes.

- Last Backup Timestamp
- Backup Status (Success / Failed)
- Backup Size & Duration
- Failed Job History

---

### 8. Log Explorer

Centralized, searchable log aggregation.

**Log Sources**
- System Logs · Docker Logs · Nginx Logs
- Authentication Logs · Database Logs · Application Logs

**Search Capabilities**
- Filter by Errors, Warnings, Keywords
- Filter by Time Range

---

### 9. Alerts

Real-time notifications for all critical events.

| Category | Alert Examples |
|---|---|
| **Infrastructure** | High CPU, High RAM, Disk Almost Full |
| **Availability** | Website Down, Database Offline, Docker Stopped |
| **Security** | Malware Found, Excessive Failed Logins |
| **Certificates** | SSL Expiring |
| **Backups** | Backup Failed |

---

### 10. Health Score

Every server receives a dynamic health score (0–100%).

**Factors Included**
- CPU · Memory · Disk
- Docker · Websites · Database
- Security · SSL · Updates · Backups

**Example**

```
Database Server    ████████████████████ 98%
Website Server 1   ███████████████████  95%
Website Server 2   █████████████████░   89%
Website Server 3   ██████████████░░░░   72%
```

---

### 11. Incident Timeline

Track every important event in chronological order.

```
09:12  ⚠️  Website Offline
09:13  🔄  Docker Container Restarted
09:15  ✅  Service Recovered
11:42  🛡️  500 SSH Attacks Blocked
14:18  🔴  Disk Usage Critical
```

---

### 12. SRE Copilot (SigNoz MCP)

An agent-native AI assistant designed for autonomous investigation.

**Daily Summaries**
- Provides intelligent daily recaps on overall health, blocked attacks, and uptime.

**Autonomous Investigation via MCP**
- Instead of just natural language Q&A, this SRE Copilot is connected directly to the **SigNoz MCP Server**.
- It can autonomously pull traces, investigate high CPU spikes, and query logs (using the Query Builder) when incidents occur without manual intervention.

```text
"Agent, why was CPU high yesterday?"
> "Investigating via SigNoz MCP... I found a latency spike in the PostgreSQL container correlated with 524 SSH attacks blocked by CrowdSec."
```

---

## Automatic Discovery

Sentinel automatically detects new resources with minimal configuration.

- New Docker Containers
- New Websites & SSL Certificates
- New Mounted Disks & Network Interfaces
- Running Services & Databases

---

## Edge Case Detection

| Category | Detected Conditions |
|---|---|
| **Server** | Offline, Agent Offline, Clock Drift, Read-only Filesystem |
| **Resources** | High CPU/RAM/Swap, Disk Full, Inode Exhaustion, OOM Killer Events |
| **Docker** | Engine Stopped, Restart Loops |
| **Web** | Website Slow/Down, DNS Failure, SSL Expiring/Invalid |
| **Database** | Locks, Database Offline |
| **Security** | Malware, Unexpected Open Ports, High Failed Logins |
| **Operations** | Backup Failure |

---

## Notification Channels

| Channel | Severity Levels |
|---|---|
| 📧 Email | Information, Warning, Critical |
| ✈️ Telegram | Information, Warning, Critical |
| 💬 Discord | Information, Warning, Critical |
| 💼 Slack | Information, Warning, Critical |

---

## Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| React | UI Framework |
| TailwindCSS | Styling |
| ShadCN UI | Component Library |
| Recharts | Data Visualization |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | API Server |
| TypeScript | Type Safety |

### Observability
| Technology | Purpose |
|---|---|
| SigNoz | Observability Platform |
| OpenTelemetry Collector | Telemetry Pipeline |
| ClickHouse | Time-Series Storage |
| PostgreSQL | Relational Data |

### Monitoring Agents (on production servers)
| Agent | Purpose |
|---|---|
| Node Exporter | System Metrics |
| OpenTelemetry Collector | Telemetry Forwarding |
| Docker Metrics | Container Monitoring |
| CrowdSec | Threat Detection |
| ClamAV | Malware Scanning |

### Infrastructure
- Docker Compose
- Nginx
- Let's Encrypt

---

## Deployment Architecture

### Mass Deployment Strategy (Bash Script)

To avoid manually configuring multiple servers via SSH, Sentinel uses a centralized bootstrap script approach.

1. A single bash script (`install_agent.sh`) containing all necessary `apt-get`, configuration generation, and `systemctl` commands is hosted on the Oracle VPS.
2. Agents are deployed across all production servers by running a single command on each target machine:
   ```bash
   curl -sL https://sentinel.yourdomain.com/install_agent.sh | sudo bash
   ```
This approach is extremely fast for a 4-server setup, requires zero dependencies on the target servers, and mimics professional distribution models.

### Production Servers (Lightweight)

Each production server runs only:
- OpenTelemetry Collector
- Node Exporter
- Docker Metrics (if Docker is used)
- CrowdSec (already installed)
- Log Collection Agent

Scheduled (not always running):
- ClamAV

### Oracle VPS (Central Hub)

**Installed via Foundry** (Hackathon Requirement)
- Includes the core SigNoz platform and the **SigNoz MCP Server**.
- Setup is defined reproducibly via `casting.yaml` and `casting.yaml.lock`.

Runs all heavy components:
- SigNoz · ClickHouse · PostgreSQL
- React Dashboard · Backend API
- Alert Engine · Notification Service
- SRE Copilot Service

---

## Roadmap

### 🏆 Phase 1 — Hackathon MVP

- [x] Infrastructure Monitoring
- [x] Docker Monitoring
- [x] Website Monitoring
- [x] SSL Monitoring
- [x] CrowdSec Integration
- [x] Centralized Logs
- [x] Alerts
- [x] Health Score

### 🚀 Phase 2 — Production

- [x] Malware Detection (ClamAV)
- [ ] Backup Monitoring
- [ ] Database Monitoring
- [ ] Incident Timeline
- [x] AI Daily Summaries

### 🔮 Phase 3 — Advanced

- [ ] One-click Service Restart
- [ ] One-click Malware Scan
- [ ] Vulnerability Scanning (Trivy)
- [ ] Automatic Remediation
- [ ] Predictive Alerts
- [ ] Mobile Application
- [ ] Multi-tenant Support
- [ ] SSO (Google / Microsoft / GitHub)

---

## Final Vision

Sentinel is more than a monitoring dashboard. It is a **centralized infrastructure operations platform** that combines observability, security, and operational intelligence into a single system.

| Benefit | Description |
|---|---|
| **One Login** | No more SSH-ing into four different servers |
| **One Dashboard** | Health, security, and performance in a single view |
| **Immediate Visibility** | See outages, attacks, and resource issues instantly |
| **Actionable Alerts** | Know about problems before customers do |
| **Scalable Foundation** | Grows from 4 servers to dozens without architecture changes |

---

## Hackathon Submission Checklist (Important!)

Before submitting on Devpost / the submission form, ensure these non-technical requirements are met:
- [ ] **Blog Post:** Write a blog about the experience on Medium, Dev.to, or Substack (LinkedIn posts do not count).
- [ ] **AI Disclosure:** Declare the use of any AI assistants (ChatGPT, Copilot, Antigravity) in the official submission form to avoid disqualification.
- [ ] **Reproducible Repo:** Ensure `casting.yaml` and `casting.yaml.lock` are committed and pushed to the GitHub repository.

---

## Guide: How to Setup SigNoz Alerts Manually

If you need to manually provision an alert rule in the SigNoz UI (e.g., for CPU Critical >90%), follow these steps:

1. **Navigate to Alerts**: Go to the **Alerts** page in the SigNoz dashboard and click **New Alert**.
2. **Select Metric Type**: Choose **PromQL** as your query language.
3. **Enter the Query**: Paste your PromQL query. For example, to track CPU usage percentage:
   ```promql
   100 - (avg by (host_name) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
   ```
4. **Define Alert Conditions**: 
   - Set the **Alert Threshold** (e.g., `90` for >90% CPU).
5. **Configure the Alert**:
   - Give the alert a mandatory **Alert Name** (e.g., `Sentinel: CPU Critical`).
   - Leave severity as Warning or Critical.
6. **Set up Notification Channel**:
   - Scroll to the bottom to **Notification Channels** (this is mandatory to save the rule).
   - If none exist, click **+ Create a notification channel**.
   - Create a dummy **Webhook** channel (Name: `Sentinel Webhook`, URL: `https://webhook.site/sentinel-test-123`).
   - Save the channel, then ensure it is selected in the dropdown.
7. **Save**: Click the **Create Rule** button at the bottom left.

**Testing the Alert:**
To test the integration, edit the alert and drop the threshold to `0`. Within 60 seconds, the alert will trigger (since all servers use >0% CPU). 
You can view the active alert in the **Triggered Alerts** tab in SigNoz, and it will automatically stream to the **Active Threats** sidebar in the React Dashboard! Remember to set the threshold back to `90` when done testing.

---

*Document last updated: July 2026*
