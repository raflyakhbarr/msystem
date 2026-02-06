import { Server, Database, Cloud, Globe, Lock, Cpu, HardDrive, Network, Shield } from 'lucide-react';

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
  const Icon = ICON_MAP[name?.toLowerCase()] || Server;

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Icon size={size} />
    </div>
  );
}
