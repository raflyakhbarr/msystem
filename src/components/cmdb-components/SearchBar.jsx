import { useState, useEffect, useRef } from 'react';
import { Search, X, Layers, GitBranch } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from "@/components/ui/button";

export default function SearchBar({ nodes, onNodeSelect, reactFlowInstance }) {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredNodes, setFilteredNodes] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchValue.trim() === '') {
      setFilteredNodes([]);
      setIsOpen(false);
      return;
    }

    const searchLower = searchValue.toLowerCase();
    const filtered = nodes
      .filter(node => {
        const name = node.data?.name?.toLowerCase() || '';
        const type = node.data?.type?.toLowerCase() || '';
        const description = node.data?.description?.toLowerCase() || '';
        
        return name.includes(searchLower) || 
               type.includes(searchLower) || 
               description.includes(searchLower);
      })
      .slice(0, 10); // Limit to 10 results

    setFilteredNodes(filtered);
    setIsOpen(filtered.length > 0);
  }, [searchValue, nodes]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectNode = (node) => {
    onNodeSelect(node);
    setSearchValue('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchValue('');
    setFilteredNodes([]);
    setIsOpen(false);
  };

  // UBAH INI - Return komponen React Icon
  const getNodeIcon = (node) => {
    if (node.type === 'group') {
      return <Layers className="text-purple-500" size={18} />;
    }
    return <GitBranch className="text-blue-500" size={18} />;
  };

  const getNodeTypeLabel = (node) => {
    if (node.type === 'group') return 'Group';
    return node.data?.type || 'Item';
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
      <input
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => searchValue && setIsOpen(true)}
        placeholder="Cari..."
        className="w-full pl-8 pr-8 h-8 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent"
      />
      {searchValue && (
        <Button
          onClick={handleClear}
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X size={12} />
        </Button>
      )}
    </div>
      {isOpen && filteredNodes.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredNodes.map((node) => (
              <Button
                key={node.id}
                onClick={() => handleSelectNode(node)}
                variant="ghost"
                className="w-full justify-start h-auto px-3 py-2 text-left"
              >
                <span className="mt-0.5">
                  {getNodeIcon(node)}
                </span>
                <div className="flex-1 min-w-0 ml-3">
                  <div className="font-medium text-sm truncate">
                    {node.data?.name || 'Unnamed'}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium">
                      {getNodeTypeLabel(node)}
                    </span>
                    {node.data?.description && (
                      <span className="truncate">
                        {node.data.description}
                      </span>
                    )}
                  </div>
                  {node.data?.status && node.type !== 'group' && (
                    <div className="mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        node.data.status === 'active' ? 'bg-green-100 text-green-700' :
                        node.data.status === 'inactive' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {node.data.status}
                      </span>
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {isOpen && searchValue && filteredNodes.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Tidak ada hasil untuk "{searchValue}"
        </div>
      )}
    </div>
  );
}