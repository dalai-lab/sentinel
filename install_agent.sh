#!/bin/bash
set -e

# Sentinel - Automated Telemetry Agent Installer
# This script installs Node Exporter and OpenTelemetry Collector,
# and wires them up to your central SigNoz hub.

SIGNOZ_IP="telemetry.dalai.in"
# Port is no longer needed since we use HTTPS (443) via Cloudflare
# OTLP_PORT="4317"

echo "=========================================="
echo " Sentinel Agent Installer (SigNoz OTEL)   "
echo "=========================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. sudo ./install_agent.sh)"
  exit 1
fi

# 1. Detect Architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
  NODE_EXP_ARCH="amd64"
  OTEL_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  NODE_EXP_ARCH="arm64"
  OTEL_ARCH="arm64"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

echo "[1/4] Downloading Node Exporter..."
wget -q "https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-${NODE_EXP_ARCH}.tar.gz" -O node_exporter.tar.gz
tar xf node_exporter.tar.gz
mv node_exporter-1.7.0.linux-${NODE_EXP_ARCH}/node_exporter /usr/local/bin/
rm -rf node_exporter*

echo "[2/4] Setting up Node Exporter Service..."
cat <<EOF > /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

useradd -rs /bin/false node_exporter || true
systemctl daemon-reload
systemctl enable node_exporter --now

echo "[3/4] Downloading OpenTelemetry Collector..."
wget -q "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.92.0/otelcol_0.92.0_linux_${OTEL_ARCH}.tar.gz" -O otelcol.tar.gz
mkdir -p /opt/otelcol
tar xf otelcol.tar.gz -C /opt/otelcol
rm -f otelcol.tar.gz

echo "[4/4] Configuring OpenTelemetry Collector..."
# Get the hostname to uniquely identify this server in Sentinel
HOSTNAME=$(hostname)

cat <<EOF > /opt/otelcol/config.yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: 'node'
          scrape_interval: 15s
          static_configs:
            - targets: ['127.0.0.1:9100']
              labels:
                host_name: "${HOSTNAME}"

exporters:
  otlphttp:
    endpoint: "https://${SIGNOZ_IP}/v1/traces"
    metrics_endpoint: "https://${SIGNOZ_IP}/v1/metrics"

service:
  pipelines:
    metrics:
      receivers: [prometheus]
      exporters: [otlphttp]
EOF

cat <<EOF > /etc/systemd/system/otelcol.service
[Unit]
Description=OpenTelemetry Collector
After=network.target

[Service]
ExecStart=/opt/otelcol/otelcol --config=/opt/otelcol/config.yaml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable otelcol --now

echo "=========================================="
echo "✅ Installation Complete!"
echo "Node Exporter and OTEL Collector are now running."
echo "Metrics are being sent to https://$SIGNOZ_IP/v1/metrics"
echo "=========================================="
