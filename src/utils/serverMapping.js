// Friendly names map for raw hostnames
export const FRIENDLY_NAMES = {
  'instance-20260630-1713': 'Oracle database server',
  'Database-Server-Oracle': 'Oracle database server',
  'srv1213878': 'Orbithyre',
  'srv1176513': 'Gaplytiq',
  'srv1055295': 'Dalai'
};

// IP address map for raw hostnames
export const SERVER_IPS = {
  'instance-20260630-1713': '80.225.241.81',
  'Database-Server-Oracle': '80.225.241.81',
  'srv1213878': '31.97.235.136',
  'srv1176513': '72.61.235.141',
  'srv1055295': '168.231.122.248'
};

export function getFriendlyName(hostName) {
  return FRIENDLY_NAMES[hostName] || hostName;
}

export function getServerIp(hostName) {
  return SERVER_IPS[hostName] || 'Live';
}
