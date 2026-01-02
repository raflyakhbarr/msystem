import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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

  const getNodeIcon = (node) => {
    if (node.type === 'group') return '📁';
    return '🔷';
  };

  const getNodeTypeLabel = (node) => {
    if (node.type === 'group') return 'Group';
    return node.data?.type || 'Item';
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => searchValue && setIsOpen(true)}
          placeholder="Cari node atau group..."
          className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FaTimes size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && filteredNodes.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => handleSelectNode(node)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-3"
              >
                <span className="text-xl mt-0.5">{getNodeIcon(node)}</span>
                <div className="flex-1 min-w-0">
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
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && searchValue && filteredNodes.length === 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          Tidak ada hasil untuk "{searchValue}"
        </div>
      )}
    </div>
  );
}