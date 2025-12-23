import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAccGroup, saveAccGroupMenus } from '../api/settingmenu';
import {  ChevronRight, ChevronDown, Layers, ArrowLeft, Save, Loader2, AlertCircle, MonitorCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';

const SettingMenu = () => {
  const { accGroupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accGroupData, setAccGroupData] = useState<{ codeGroup: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tree State
  const [treeData, setTreeData] = useState<any[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<any[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  useEffect(() => {
    if (accGroupId) {
      loadAccGroupData();
      loadMenuData();
    }
  }, [accGroupId]);

  const loadAccGroupData = async () => {
    try {
      if (accGroupId) {
        setAccGroupData({ codeGroup: accGroupId });
      }
    } catch (err) {
      console.error('Error loading account group data:', err);
    }
  };

  const loadMenuData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAccGroup(accGroupId);
      const formattedTree = transformToTreeData(data.all_menu);
      setTreeData(formattedTree);
      
      if (data && data.checked) {
        setCheckedKeys(data.checked.map(String));
      }
      setExpandedKeys(getAllKeys(formattedTree));
    } catch (err: any) {
      console.error('API Error:', err);
      setError(err.message || 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const transformToTreeData = (systems: any[]) => {
    return systems.map((system: any, sysIdx: number) => ({
      key: `sys-${sysIdx}`,
      title: system.nama,
      type: 'system',
      children: system.group_menu?.map((group: any, grpIdx: number) => ({
        key: `grp-${sysIdx}-${grpIdx}`,
        title: group.nama,
        type: 'group',
        children: group.menus?.map((menu: any) => ({
          key: String(menu.id),
          title: menu.nama,
          isLeaf: true
        }))
      }))
    }));
  };

  const getAllKeys = (data: any[]) => {
    let keys: any[] = [];
    data.forEach((item: any) => {
      keys.push(item.key);
      if (item.children) keys = keys.concat(getAllKeys(item.children));
    });
    return keys;
  };

  // --- CHECK LOGIC ---
  const getDescendantKeys = (node: any) => {
    let keys: any[] = [];
    if (node.children) {
      node.children.forEach((child: any) => {
        keys.push(child.key);
        keys = keys.concat(getDescendantKeys(child));
      });
    }
    return keys;
  };

  const onCheck = (checkedKeysValue: any, info: any) => {
    const currentChecked = [...checkedKeys];
    const { node, checked } = info;
    const nodeKey = node.key;
    const descendants = getDescendantKeys(node);
    
    let newCheckedKeys;
    if (checked) {
      newCheckedKeys = Array.from(new Set([...currentChecked, nodeKey, ...descendants]));
    } else {
      newCheckedKeys = currentChecked.filter(key => key !== nodeKey && !descendants.includes(key));
    }
    setCheckedKeys(newCheckedKeys);
  };

  const onExpand = (expandedKeysValue: any) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
  };

  const handleSave = async () => {
    try {
      if (!accGroupData) return;
      
      const keysArray = Array.isArray(checkedKeys) ? checkedKeys : [];
      const finalMenuIds = keysArray.filter(key => !key.startsWith('sys-') && !key.startsWith('grp-'));
      await saveAccGroupMenus(accGroupData.codeGroup, finalMenuIds);
      
      setSaveMessage({ type: 'success', text: 'Menu settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save menu settings');
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save menu settings' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const getIcon = (node: any) => {
    if (node.isLeaf) return null;
    return <MonitorCog className="w-4 h-4 text-primary fill-primary/20" /> 
      
  };

  const selectedCount = Array.isArray(checkedKeys) 
    ? checkedKeys.filter(k => !k.startsWith('sys-') && !k.startsWith('grp-')).length
    : 0;

  return (
    // CHANGE 1: Use h-full and bg-background to fill the parent container completely
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      
      {/* CSS Styles for Tree */}
      <style>{`
        .rc-tree { background: transparent; color: inherit; font-family: inherit; font-size: 0.95rem; }
        .rc-tree-treenode { display: flex; align-items: stretch; padding-bottom: 0; line-height: 32px; }
        .rc-tree-indent { display: flex; flex-direction: row; align-self: stretch; }
        .rc-tree-indent-unit { width: 24px; align-self: stretch; position: relative; }
        .rc-tree-indent-unit::before { content: ''; position: absolute; top: 0; left: 50%; bottom: 0; width: 1px; background-color: hsl(var(--border)); }
        .rc-tree-indent-unit:last-child::before { display: none; }
        .rc-tree-node-content-wrapper { display: flex !important; align-items: center; min-height: 32px; padding: 0 8px !important; border-radius: 6px; transition: all 0.2s; flex: 1; }
        .rc-tree-node-content-wrapper:hover { background-color: hsl(var(--muted)) !important; }
        .rc-tree-node-selected { background-color: transparent !important; }
        .rc-tree-checkbox { margin: 0 8px 0 0; display: flex; align-items: center; }
        .rc-tree-checkbox-inner { width: 16px; height: 16px; background: hsl(var(--background)); border: 2px solid hsl(var(--border)); border-radius: 4px; position: relative; }
        .rc-tree-checkbox-checked .rc-tree-checkbox-inner { background-color: hsl(var(--primary)); border-color: hsl(var(--primary)); }
        .rc-tree-checkbox-checked .rc-tree-checkbox-inner:after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }
        .rc-tree-checkbox:hover .rc-tree-checkbox-inner { border-color: hsl(var(--primary)); }
        .rc-tree-switcher { background: transparent !important; border: 0 !important; width: 24px; display: flex; justify-content: center; align-items: center; align-self: stretch; }
        .rc-tree-switcher:after, .rc-tree-switcher:before { display: none !important; }
        
        /* Force lines to be visible */
        .rc-tree li { position: relative; }
        .rc-tree li::before { content: ''; position: absolute; left: 12px; top: 0; bottom: 0; width: 1px; background: hsl(var(--border)); }
        .rc-tree li:last-child::before { height: 50%; }
      `}</style>

      {/* CHANGE 2: Flat Header (No Card) - Sticky Top */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Configure Menus
            </h1>
          </div>
        </div>
        
        {/* Success/Error Alert */}
        {saveMessage && (
          <Alert className={`max-w-md ${saveMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : ''}`} variant={saveMessage.type === 'error' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {saveMessage.type === 'success' ? 'Success' : 'Error'}
            </AlertTitle>
            <AlertDescription>
              {saveMessage.text}
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      {/* CHANGE 3: Scrollable Content Area (Fills remaining space) */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading menu structure...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-xl mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="max-w-4xl">
            <Tree
              checkable
              checkStrictly={true}
              showLine={true}
              showIcon={false}
              treeData={treeData}
              onCheck={onCheck}
              checkedKeys={checkedKeys}
              onExpand={onExpand}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              
              titleRender={(node) => (
                <div className="flex items-center gap-2.5">
                  {getIcon(node)}
                  <span className={`${node.isLeaf ? 'text-muted-foreground font-normal' : 'text-foreground font-medium'}`}>
                    {node.title}
                  </span>
                </div>
              )}
              
              switcherIcon={(node) => {
                if (node.isLeaf) return null;
                return node.expanded ? 
                  <ChevronDown className="w-4 h-4 text-muted-foreground/70" /> : 
                  <ChevronRight className="w-4 h-4 text-muted-foreground/70" />;
              }}
            />
          </div>
        )}
      </div>

      {/* CHANGE 4: Flat Footer (No Card) - Sticky Bottom */}
      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10 shrink-0">
        <div className="text-sm text-muted-foreground">
           {selectedCount} menus selected
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSave} className="gap-2 min-w-[140px]">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingMenu;