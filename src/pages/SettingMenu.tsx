import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAccGroup, saveAccGroupMenus } from '../api/settingmenu';
import { fetchAccGroup as fetchAllAccGroups } from '../api/accgroupApi';
import { Layers, ArrowLeft, Save, Loader2,  Search, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';

const SettingMenu = () => {
  const { accGroupId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accGroupData, setAccGroupData] = useState<{ codeGroup: string; nama: string } | null>(null);
  const [accGroupName, setAccGroupName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [treeData, setTreeData] = useState<any[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<any[]>([]);
  const [expandedKeysMap, setExpandedKeysMap] = useState<Record<string, any[]>>({});
  const [autoExpandParentMap, setAutoExpandParentMap] = useState<Record<string, boolean>>({});

  const loadAccGroupData = useCallback(async () => {
    try {
      if (accGroupId) {
        const allGroups = await fetchAllAccGroups();
        const targetGroup = allGroups.find((g: any) => g.id === parseInt(accGroupId) || g.codeGroup === accGroupId);
        const groupName = targetGroup?.namaGroup || targetGroup?.nama || accGroupId;
        setAccGroupData({ codeGroup: accGroupId, nama: String(groupName) });
        setAccGroupName(String(groupName));
      }
    } catch (err) {
      console.error('Error loading account group data:', err);
    }
  }, [accGroupId]);

  const loadMenuData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAccGroup(accGroupId);
      const formattedTree = transformToTreeData(data.all_menu);
      setTreeData(formattedTree);

      if (data && data.checked) {
        setCheckedKeys(data.checked.map(String));
      }
      const initialExpandedKeysMap: Record<string, any[]> = {};
      const initialAutoExpandParentMap: Record<string, boolean> = {};
      formattedTree.forEach((system: any) => {
        initialExpandedKeysMap[system.key] = getAllKeys([system]);
        initialAutoExpandParentMap[system.key] = true;
      });
      setExpandedKeysMap(initialExpandedKeysMap);
      setAutoExpandParentMap(initialAutoExpandParentMap);
    } catch (err: unknown) {
      console.error('API Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  }, [accGroupId]);

  useEffect(() => {
    if (accGroupId) {
      loadAccGroupData();
      loadMenuData();
    }
  }, [accGroupId, loadAccGroupData, loadMenuData]);

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
    const keysToToggle = [nodeKey, ...descendants];
    
    let newCheckedKeys;
    if (checked) {
      newCheckedKeys = Array.from(new Set([...currentChecked, ...keysToToggle]));
    } else {
      newCheckedKeys = currentChecked.filter(key => !keysToToggle.includes(key));
    }
    setCheckedKeys(newCheckedKeys);
  };

  const handleSystemCheck = (systemNode: any, isChecked: boolean) => {
    const descendants = getDescendantKeys(systemNode);
    const keysToToggle = [systemNode.key, ...descendants];
    
    let newCheckedKeys;
    if (isChecked) {
      newCheckedKeys = Array.from(new Set([...checkedKeys, ...keysToToggle]));
    } else {
      newCheckedKeys = checkedKeys.filter(key => !keysToToggle.includes(key));
    }
    setCheckedKeys(newCheckedKeys);
  };

  const onExpand = (expandedKeysValue: any, systemKey: string) => {
    setExpandedKeysMap(prev => ({
      ...prev,
      [systemKey]: expandedKeysValue
    }));
    setAutoExpandParentMap(prev => ({
      ...prev,
      [systemKey]: false
    }));
  };
  
  const handleTreeCheck = (checkedKeysFromTree: any, systemNode: any) => {
    const currentSystemKeys = getDescendantKeys(systemNode);

    const otherSystemKeys = checkedKeys.filter(key => !currentSystemKeys.includes(key));

    const finalKeys = [...otherSystemKeys, ...checkedKeysFromTree];
    setCheckedKeys(finalKeys);
  };

  const handleSave = useCallback(async () => {
    if (!accGroupData) return;

    setSaving(true);

    try {
      const keysArray = Array.isArray(checkedKeys) ? checkedKeys : [];
      const finalMenuIds = keysArray.filter(key => !key.toString().startsWith('sys-') && !key.toString().startsWith('grp-'));

      await saveAccGroupMenus(accGroupData.codeGroup, finalMenuIds);
      toast.success('Menu settings saved successfully!');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save menu settings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }, [accGroupData, checkedKeys]);

  const selectedCount = Array.isArray(checkedKeys) 
    ? checkedKeys.filter(k => !k.toString().startsWith('sys-') && !k.toString().startsWith('grp-')).length
    : 0;

  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData;
    const lowerSearch = searchTerm.toLowerCase();
    
    return treeData.map(system => {
      const systemMatches = system.title.toLowerCase().includes(lowerSearch);
      
      const filteredChildren = system.children?.map((group: any) => {
          const groupMatches = group.title.toLowerCase().includes(lowerSearch);
          const filteredMenus = group.children?.filter((menu: any) =>
            menu.title.toLowerCase().includes(lowerSearch)
          );
          
          if (groupMatches || (filteredMenus && filteredMenus.length > 0)) {
            return { ...group, children: filteredMenus?.length ? filteredMenus : group.children };
          }
          return null;
      }).filter(Boolean);

      if (systemMatches || (filteredChildren && filteredChildren.length > 0)) {
        return { ...system, children: filteredChildren?.length ? filteredChildren : system.children };
      }
      return null;
    }).filter(Boolean);
  }, [treeData, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      
      <style>{`
        .rc-tree { background: transparent; font-family: inherit; font-size: 0.9rem; }
        .rc-tree-treenode { display: flex; align-items: center; padding-bottom: 2px; line-height: 32px; }
        .rc-tree-indent-unit { width: 20px; }
        .rc-tree-node-content-wrapper { display: flex !important; align-items: center; min-height: 28px; padding: 0 6px !important; border-radius: 4px; transition: all 0.2s; flex: 1; }
        .rc-tree-node-content-wrapper:hover { background-color: hsl(var(--muted)) !important; }
        .rc-tree-node-selected { background-color: transparent !important; }
        .rc-tree-checkbox { margin: 0 8px 0 0; }
        .rc-tree-checkbox-inner { width: 16px; height: 16px; border: 1px solid hsl(var(--input)); border-radius: 4px; }
        .rc-tree-checkbox-checked .rc-tree-checkbox-inner { background-color: hsl(var(--primary)); border-color: hsl(var(--primary)); }
      `}</style>

      <div className="flex flex-col border-b bg-background/95 backdrop-blur z-10 sticky top-0">
        <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {accGroupName || 'Loading'}
                </h1>
            </div>
            </div>

            <div className="relative w-64 hidden md:block">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search menus..." 
                    className="pl-8 h-9" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/20">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading structure...</p>
          </div>
        ) : error ? (
          <div className="max-w-xl mx-auto mt-8">
            <p className="text-destructive text-center">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
            {filteredTreeData.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                    No menus found matching "{searchTerm}"
                </div>
            )}

            {filteredTreeData.map((systemNode: any) => {
                const descendantKeys = getDescendantKeys(systemNode);
                const allChecked = descendantKeys.length > 0 && descendantKeys.every(k => checkedKeys.includes(k));
                const someChecked = descendantKeys.some(k => checkedKeys.includes(k));
                
                return (
                    <Card key={systemNode.key} className="shadow-sm border-border/60 hover:border-border transition-colors flex flex-col">
                        <CardHeader className="py-4 px-5 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                {systemNode.title}
                                <Badge variant="secondary" className="text-xs font-normal h-5 px-1.5 ml-2">
                                    {descendantKeys.length}
                                </Badge>
                            </CardTitle>
                            
                            <Button
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => handleSystemCheck(systemNode, !allChecked)}
                                title={allChecked ? "Deselect All" : "Select All"}
                            >
                                {allChecked ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                ) : someChecked ? (
                                    <div className="relative">
                                        <Square className="h-5 w-5" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-primary rounded-[1px]" />
                                        </div>
                                    </div>
                                ) : (
                                    <Square className="h-5 w-5" />
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4 px-2 pb-4 flex-1">
                             <Tree
                                checkable
                                checkStrictly={false}
                                showLine={true}
                                showIcon={false}
                                treeData={systemNode.children}
                                onCheck={(keys) => handleTreeCheck(keys, systemNode)}
                                checkedKeys={checkedKeys}
                                onExpand={(keys) => onExpand(keys, systemNode.key)}
                                expandedKeys={expandedKeysMap[systemNode.key] || []}
                                autoExpandParent={autoExpandParentMap[systemNode.key] !== false}
                                motion={null}
                            />
                            {(!systemNode.children || systemNode.children.length === 0) && (
                                <p className="text-sm text-muted-foreground italic px-4">No sub-menus available.</p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-background shrink-0 sticky bottom-0 z-10">
        <div className="text-sm text-muted-foreground font-medium">
           <span className="text-foreground">{selectedCount}</span> menus authorized
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-35">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingMenu;