const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../incidents.json');

class IncidentService {
  constructor() {
    this.incidents = [];
    this.loadIncidents();
  }

  loadIncidents() {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        this.incidents = JSON.parse(data);
      } else {
        this.incidents = [];
        this.saveIncidents();
      }
    } catch (e) {
      console.error('[INCIDENT SERVICE] Error loading incidents:', e.message);
      this.incidents = [];
    }
  }

  saveIncidents() {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.incidents, null, 2), 'utf8');
    } catch (e) {
      console.error('[INCIDENT SERVICE] Error saving incidents:', e.message);
    }
  }

  addIncident(incident) {
    // Check if incident already exists to avoid duplicates (by fingerprint or details)
    const exists = this.incidents.some(i => i.fingerprint === incident.fingerprint);
    if (!exists) {
      const newIncident = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...incident
      };
      this.incidents.push(newIncident);
      this.saveIncidents();
      console.log(`[INCIDENT SERVICE] Logged persistent incident: ${newIncident.alertname} on ${newIncident.host}`);
      return newIncident;
    }
    return null;
  }

  getIncidents() {
    return this.incidents;
  }

  clearIncidents() {
    this.incidents = [];
    this.saveIncidents();
    console.log('[INCIDENT SERVICE] All persistent incidents cleared.');
  }

  removeIncident(fingerprint) {
    const initialLength = this.incidents.length;
    this.incidents = this.incidents.filter(i => i.fingerprint !== fingerprint);
    if (this.incidents.length < initialLength) {
      this.saveIncidents();
      console.log(`[INCIDENT SERVICE] Removed resolved incident: ${fingerprint}`);
    }
  }
}

module.exports = new IncidentService();
