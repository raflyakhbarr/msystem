import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SettingToken = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const systemName = location.state?.systemName || 'Setting Token';

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              {systemName}
            </h1>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <Settings className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Token Settings Page
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              This is a placeholder page for configuring token settings for the system.
              More functionality will be added here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingToken;
