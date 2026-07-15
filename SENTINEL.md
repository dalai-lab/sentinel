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

1. **The Backend Engine (SigNoz):** Installed on a remote cloud server (`80.225.241.81`), SigNoz does the heavy lifting. It acts as the database and ingestion pipeline that collects metrics (CPU, RAM, Logs) from all target servers.
2. **The Frontend UI (Sentinel):** Built locally on your PC (for now), Sentinel is the custom React dashboard and API that talks to SigNoz. Sentinel pulls the raw data from SigNoz and presents it in our beautiful, custom dashboard with Health Scores and AI summaries.

---

## The Three Core Questions

Sentinel should answer these three questions **instantly**:

| Question | What it covers |
|---|---|
| ✅ Is every server healthy? | CPU, RAM, Disk, Uptime, Docker, Processes |
| 🔒 Is every service secure? | Attacks, Malware, Rootkits, File Integrity, Firewalls |
| ⚡ Is there anything requiring immediate action? | Alerts, Incidents, Expiring Certs, Failed Backups |

---

## Current Infrastructure

```
Oracle VPS (Central Hub)
│
├── Sentinel Platform
│   ├── SigNoz
│   ├── React Dashboard
│   ├── Backend API
│   ├── ClickHouse
│   ├── PostgreSQL
│   ├── Alert Engine
│   └── Nginx
│
└───────────────┬──────────────────────
                │
                │  Secure Telemetry
                │
────────────────┼────────────────────────────────────
                │
                ├── Database Server        (3 Databases)
                ├── Website Server 1       (2–3 Websites)
                ├── Website Server 2       (2–3 Websites)
                └── Website Server 3       (2–3 Websites)
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

#### Rootkit Detection (rkhunter)
- Rootkit Warnings & Critical Findings
- Hidden Files & System Changes
- Weekly scans

#### File Integrity Monitoring (AIDE)
- SSH Configuration Changes
- System File & Executable Changes
- Deleted & Newly Created Files

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
- **Central Database/Server**: Oracle Cloud VPS (`80.225.241.81`)
- **Domain Name**: `telemetry.dalai.in`
- **DNS/Proxy**: Cloudflare (Orange Cloud / Proxied) pointing `telemetry.dalai.in` to `80.225.241.81`
- **SigNoz Dashboard (UI)**: Running locally on the Oracle VPS at `http://localhost:8080`. Externally accessible via `https://telemetry.dalai.in` (handled by Nginx).
- **SigNoz OTLP Receiver (Metrics)**: Running locally on the Oracle VPS at `http://localhost:4318`. Agents send data to `https://telemetry.dalai.in/v1/metrics`.
- **Local React Dashboard**: Running on your local Windows PC at `http://localhost:5173`. Fetches data securely from `https://telemetry.dalai.in/api/v1/query`.

#### Monitored Fleet (Telemetry Agents Deployed)
1. **Master Node** (Oracle): `80.225.241.81`
2. **Orbithyre** (`srv1213878`): `31.97.235.136`
3. **Gaplytiq** (`srv1176513`): `72.61.235.141`
4. **Dalai** (`srv1055295`): `168.231.122.248`

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
If your Oracle server reboots and Nginx fails, or you need to recreate the proxy, this is the exact Nginx configuration required (stored in `/etc/nginx/sites-available/telemetry.dalai.in`):

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

    # Route 2: SigNoz Backend API (For your React Dashboard)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
*(Note: Do not add manual CORS headers to Nginx! SigNoz natively adds them, and duplicating them will cause the browser to block the dashboard.)*

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
| **Security** | Malware Found, Rootkit Found, File Modified, Excessive Failed Logins |
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
| **Security** | Malware, Rootkit, Unexpected File Changes, Unexpected Open Ports, High Failed Logins |
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
| AIDE | File Integrity |
| rkhunter | Rootkit Detection |

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
- ClamAV · AIDE · rkhunter

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

- [ ] Malware Detection (ClamAV)
- [ ] Rootkit Detection (rkhunter)
- [ ] File Integrity Monitoring (AIDE)
- [ ] Backup Monitoring
- [ ] Database Monitoring
- [ ] Incident Timeline
- [ ] AI Daily Summaries

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

*Document last updated: July 2026*
