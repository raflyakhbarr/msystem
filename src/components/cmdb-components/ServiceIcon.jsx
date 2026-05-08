import { Server, Database, Cloud, Globe, Lock, Cpu, HardDrive, Network, Shield } from 'lucide-react';
import { PRESET_ICONS } from '../../utils/cmdb-utils/constants';

// ICON_MAP for preset icons - mapping from icon name to Lucide component
const ICON_MAP = {
  citrix: Server,
  oracle: Database,
  apache: Server,
  nginx: Server,
  mongodb: Database,
  redis: Database,
  postgresql: Database,
  mysql: Database,
  mssql: Database,
  cloud: Cloud,
  internet: Globe,
  security: Shield,
  firewall: Shield,
  vpn: Lock,
  cpu: Cpu,
  storage: HardDrive,
  network: Network,
  // Add more as needed
};

export default function ServiceIcon({ name, size = 24, className = '' }) {
  // Trim dan lowercase untuk handle spasi/huruf besar
  const normalizedName = name?.toString().trim().toLowerCase();

  // Check if name exists in PRESET_ICONS first
  const isValidPreset = PRESET_ICONS.some(icon => {
    const iconValue = icon.value?.toString().trim().toLowerCase();
    return iconValue === normalizedName;
  });

  // Get icon component - use ICON_MAP if valid preset, otherwise default to Server
  const Icon = (isValidPreset && ICON_MAP[normalizedName]) || Server;

  return (
    <div className="flex items-center justify-center">
      <Icon size={size} className={className} />
    </div>
  );
}
