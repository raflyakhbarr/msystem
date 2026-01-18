import {
  Server, Database, Network, Monitor,
  GitBranch, Shield, Wifi
} from 'lucide-react';

export const API_BASE_URL = 'http://localhost:5000';

export const NODE_TYPES = [
  { value: 'server', label: 'Server' },
  { value: 'database', label: 'Database' },
  { value: 'switch', label: 'Switch' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'hub', label: 'Hub' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'router', label: 'Router' },
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
    default: return null;
  }
};

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  decommissioned: 'bg-red-100 text-red-800',
};

export const INITIAL_ITEM_FORM = {
  name: '',
  type: 'server',
  description: '',
  status: 'active',
  ip: '',
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