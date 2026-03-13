import {
  Server, Database, Network, Monitor,
  GitBranch, Shield, Wifi, Globe, Laptop,
  Smartphone, Cloud, Globe2, Layers, HardDrive,
  Printer, Users, Mail, Settings, Cpu, MemoryStick,
  FileText, Layout
} from 'lucide-react';

export const API_BASE_URL = import.meta.env.VITE_CMDB_API_BASE_URL;

export const NODE_TYPES = [
  { value: 'server', label: 'Server' },
  { value: 'database', label: 'Database' },
  { value: 'switch', label: 'Switch' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'hub', label: 'Hub' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'router', label: 'Router' },
  { value: 'web_application', label: 'Web Application' },
  { value: 'desktop_application', label: 'Desktop Application' },
  { value: 'mobile_application', label: 'Mobile Application' },
  { value: 'api_service', label: 'API Service' },
  { value: 'microservice', label: 'Microservice' },
  { value: 'container', label: 'Container/Docker' },
  { value: 'load_balancer', label: 'Load Balancer' },
  { value: 'proxy_server', label: 'Proxy Server' },
  { value: 'application_server', label: 'Application Server' },
  { value: 'file_server', label: 'File Server' },
  { value: 'print_server', label: 'Print Server' },
  { value: 'domain_controller', label: 'Domain Controller' },
  { value: 'mail_server', label: 'Mail Server' },
  { value: 'dns_server', label: 'DNS Server' },
  { value: 'dhcp_server', label: 'DHCP Server' },
  { value: 'storage', label: 'Storage' },
];

export const getTypeIcon = (type) => {
  const props = { size: 14, className: 'inline mr-1' };
  switch (type) {
    case 'server': return <Server {...props} />;
    case 'database': return <Database {...props} />;
    case 'switch': return <Network {...props} />;
    case 'workstation': return <Monitor {...props} />;
    case 'hub': return <GitBranch {...props} />;
    case 'firewall': return <Shield {...props} />;
    case 'router': return <Wifi {...props} />;
    case 'web_application': return <Globe {...props} />;
    case 'desktop_application': return <Laptop {...props} />;
    case 'mobile_application': return <Smartphone {...props} />;
    case 'api_service': return <Cloud {...props} />;
    case 'microservice': return <Layers {...props} />;
    case 'container': return <Layout {...props} />;
    case 'load_balancer': return <Wifi {...props} />;
    case 'proxy_server': return <Globe2 {...props} />;
    case 'application_server': return <Server {...props} />;
    case 'file_server': return <FileText {...props} />;
    case 'print_server': return <Printer {...props} />;
    case 'domain_controller': return <Users {...props} />;
    case 'mail_server': return <Mail {...props} />;
    case 'dns_server':
    case 'dhcp_server': return <Settings {...props} />;
    case 'storage': return <HardDrive {...props} />;
    default: return <Server {...props} />;
  }
};

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  decommissioned: 'bg-red-100 text-red-800',
};

export const INITIAL_ITEM_FORM = {
  name: '',
  type: 'server',
  description: '',
  status: 'active',
  ip: '',
  alias: '',
  port: '',
  category: 'internal',
  location: '',
  group_id: null,
  env_type: 'fisik',
};

export const INITIAL_GROUP_FORM = {
  name: '',
  description: '',
  color: '#e0e7ff'
};

export const PRESET_ICONS = [
  { value: 'citrix', label: 'Citrix' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'apache', label: 'Apache' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mssql', label: 'MSSQL' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'internet', label: 'Internet' },
  { value: 'security', label: 'Security' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'vpn', label: 'VPN' },
  { value: 'cpu', label: 'CPU' },
  { value: 'storage', label: 'Storage' },
  { value: 'network', label: 'Network' },
];