export function processNodes(nodes, options) {
  const { selectedForHiding, highlightMode, highlightedNodeId, relatedNodes } = options;

  return nodes.map(node => {
    let opacity = 1;
    let outline = 'none';
    let zIndex = node.style?.zIndex || 1;

    if (selectedForHiding.has(node.id)) {
      outline = '3px solid #3b82f6';
    }

    if (highlightMode && highlightedNodeId) {
      if (node.id === highlightedNodeId) {
        opacity = 1;
        zIndex = 100;
      } else if (relatedNodes && relatedNodes.has(node.id)) {
        opacity = 1;
        zIndex = 50;
      } else {
        opacity = 0.08;
        zIndex = 1;
      }
    }

    return {
      ...node,
      style: {
        ...node.style,
        opacity,
        outline,
        outlineOffset: '2px',
        zIndex,
        transition: 'opacity 0.3s ease, outline 0.3s ease',
      }
    };
  });
}