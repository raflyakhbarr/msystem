import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ServiceIcon from './ServiceIcon';
import ServiceVisualization from './ServiceVisualization';

export default function ServiceDetailDialog({ show, service, workspaceId, onClose }) {
  if (!service) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded">
              {service.icon_type === 'preset' ? (
                <ServiceIcon name={service.icon_name} size={32} />
              ) : (
                <img
                  src={`http://localhost:5000${service.icon_path}`}
                  alt={service.name}
                  className="w-8 h-8 object-contain"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold">{service.name}</div>
              {service.description && (
                <div className="text-sm text-muted-foreground">{service.description}</div>
              )}
            </div>
            <Badge className={service.status === 'active' ? 'bg-green-500' : 'bg-red-500'}>
              {service.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ServiceVisualization
            service={service}
            workspaceId={workspaceId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
