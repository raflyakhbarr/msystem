export function processEdges(edges, options) {
  const { highlightMode, highlightedNodeId, relatedEdges } = options;

  return edges.map(edge => {
    let opacity = edge.style?.opacity || 1;
    let strokeWidth = edge.style?.strokeWidth || 2;
    let zIndex = edge.zIndex || 10;

    if (highlightMode && highlightedNodeId) {
      if (relatedEdges && relatedEdges.has(edge.id)) {
        opacity = 1;
        strokeWidth = 3;
        zIndex = 60;
      } else {
        opacity = 0.1;
        zIndex = 1;
      }
    }

    return {
      ...edge,
      style: {
        ...edge.style,
        opacity,
        strokeWidth,
        transition: 'opacity 0.3s ease, stroke-width 0.3s ease',
      },
      zIndex,
    };
  });
}