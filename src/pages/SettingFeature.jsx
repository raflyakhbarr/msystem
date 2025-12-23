import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSettingFeature, saveAccGroupFeatures } from '../api/settingfeature';
import { Link, Layers, Loader2, AlertCircle, ArrowLeft, Save } from 'lucide-react';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SettingFeature = () => {
  // CHANGE 1: Use Hooks instead of props
  const { accGroupId } = useParams();
  const navigate = useNavigate();

  const [featureData, setFeatureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState({});

  useEffect(() => {
    if (accGroupId) {
      loadFeatureData();
    }
  }, [accGroupId]);

  const loadFeatureData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSettingFeature(accGroupId);
      setFeatureData(data);

      if (data && data.data) {
        const initialSelections = {};
        data.data.forEach(feature => {
          initialSelections[feature.id] = false;
        });
        setSelectedFeatures(initialSelections);
      }
    } catch (err) {
      setError(err.message || 'Failed to load feature data');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (featureId) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [featureId]: !prev[featureId]
    }));
  };

  const handleSelectAll = (checked) => {
    if (featureData?.data) {
      const newSelections = {};
      featureData.data.forEach(feature => {
        newSelections[feature.id] = checked;
      });
      setSelectedFeatures(newSelections);
    }
  };

  const handleSave = async () => {
    try {
      const selectedIds = Object.entries(selectedFeatures)
        .filter(([_, isSelected]) => isSelected)
        .map(([id, _]) => id);
        
      await saveAccGroupFeatures(accGroupId, selectedIds);
      navigate(-1); // Go back
    } catch (err) {
      setError(err.message || 'Failed to save feature settings');
    }
  };

  // Helper to calculate stats
  const totalFeatures = featureData?.data?.length || 0;
  const selectedCount = Object.values(selectedFeatures).filter(Boolean).length;
  const isAllSelected = totalFeatures > 0 && selectedCount === totalFeatures;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalFeatures;

  return (
    // CHANGE 2: Full Height Flex Container
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      
      {/* HEADER - Sticky Top */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Configure Features
            </h1>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading features...</p>
          </div>
        ) : error ? (
           <Alert variant="destructive" className="max-w-xl mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : featureData?.data?.length > 0 ? (
          <div className="max-w-4xl flex flex-col gap-2">
            
            {/* MASTER SELECT ALL ROW - Sticky within content */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-10 pb-2 -mt-2 pt-2">
              <div className="flex items-center space-x-3 p-4 rounded-lg border bg-muted/30 transition-colors">
                  <Checkbox 
                    id="select-all" 
                    checked={isAllSelected ? true : (isIndeterminate ? "indeterminate" : false)}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    Select All Features ({totalFeatures})
                  </label>
              </div>
            </div>

            {/* FEATURE LIST */}
            {featureData.data.map((feature) => {
              const isSelected = selectedFeatures[feature.id];
              return (
                <div
                  key={feature.id}
                  onClick={() => handleFeatureToggle(feature.id)}
                  className={`
                    flex items-start space-x-3 p-4 rounded-lg border-l-4 border border transition-all cursor-pointer
                    ${isSelected
                      ? 'border-l-primary border-l-4 bg-primary/5 hover:bg-primary/10'
                      : 'border-l-border border-l-4 border-t-border border-r-border border-b-border hover:bg-muted/40'
                    }
                  `}
                >
                  <Checkbox 
                    id={`feature-${feature.id}`} 
                    checked={isSelected || false}
                    className="mt-1"
                  />
                  <div className="space-y-1 flex-1">
                    <label
                      htmlFor={`feature-${feature.id}`}
                      className={`text-sm font-medium leading-none cursor-pointer ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}
                    >
                      {feature.menu}
                    </label>
                    {feature.route && (
                      <div className="flex items-center text-xs text-muted-foreground font-mono">
                        <Link className="h-3 w-3 mr-1 opacity-70" />
                        {feature.route}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No features available to configure.
          </div>
        )}
      </div>

      {/* FOOTER - Sticky Bottom */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10 shrink-0">
        <div className="text-sm text-muted-foreground z-9999">
          {selectedCount} of {totalFeatures} selected
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || error} className="gap-2 min-w-35">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

    </div>
  );
};

export default SettingFeature;