import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

export function useExportVisualization(reactFlowInstance, hiddenNodes, setHiddenNodes) {
  const [isExporting, setIsExporting] = useState(false);

  const exportVisualization = useCallback(async ({ format, scope, background }) => {
    const reactFlowContainer = document.querySelector('.react-flow');
    if (!reactFlowContainer) {
      toast.error('Tidak dapat menemukan visualisasi untuk diekspor.');
      return;
    }

    const rfInstance = reactFlowInstance.current;
    if (!rfInstance) {
      toast.error('ReactFlow instance tidak tersedia.');
      return;
    }

    let restoreViewport = null;
    let restoreHiddenNodes = null;

    const loadingToast = toast.loading('Mempersiapkan export...');
    setIsExporting(true);

    if (scope === 'all') {
      const currentViewport = rfInstance.getViewport();
      const currentHiddenNodes = new Set(hiddenNodes);
      restoreHiddenNodes = currentHiddenNodes;

      setHiddenNodes(new Set());
      
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
      
      rfInstance.fitView({ 
        padding: 0.15,
        includeHiddenNodes: false,
        duration: 0,
        minZoom: 0.1,
        maxZoom: 1.5
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      restoreViewport = () => {
        rfInstance.setViewport(currentViewport);
        if (restoreHiddenNodes) {
          setHiddenNodes(restoreHiddenNodes);
        }
      };
    }

    try {
      toast.loading('Mengekspor visualisasi...', { id: loadingToast });
      
      let dataUrl;
      const exportElement = reactFlowContainer;
      
      const baseExportOptions = {
        pixelRatio: 2,
        cacheBust: true,
        quality: 1,
        canvasWidth: exportElement.offsetWidth * 2,
        canvasHeight: exportElement.offsetHeight * 2,
        filter: (node) => {
          if (node.classList) {
            return !node.classList.contains('react-flow__controls') &&
                  !node.classList.contains('react-flow__minimap') &&
                  !node.classList.contains('react-flow__attribution');
          }
          return true;
        }
      };

      if (format === 'pdf') {
        const pdfOptions = {
          ...baseExportOptions,
          backgroundColor: '#ffffff'
        };
        dataUrl = await toPng(exportElement, pdfOptions);
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const pdfWidth = img.width * 0.75; 
        const pdfHeight = img.height * 0.75;
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [pdfWidth, pdfHeight],
        });
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save('cmdb-visualization.pdf');
      } else if (format === 'png') {
        const pngOptions = {
          ...baseExportOptions,
          ...(background && background !== 'transparent' ? { backgroundColor: background } : {})
        };
        dataUrl = await toPng(exportElement, pngOptions);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `cmdb-visualization-${Date.now()}.png`;
        link.click();
      } else if (format === 'jpeg') {
        const jpegOptions = {
          ...baseExportOptions,
          backgroundColor: background && background !== 'transparent' ? background : '#ffffff',
          quality: 0.95,
        };
        dataUrl = await toJpeg(exportElement, jpegOptions);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `cmdb-visualization-${Date.now()}.jpeg`;
        link.click();
      }

      toast.success('Ekspor berhasil!', { id: loadingToast });
    } catch (err) {
      console.error('Ekspor gagal:', err);
      toast.error('Gagal mengekspor visualisasi', {
        id: loadingToast,
        description: err.message || 'Kesalahan tidak dikenal',
      });
    } finally {
      if (restoreViewport) {
        await new Promise(resolve => setTimeout(resolve, 150));
        restoreViewport();
      }
      setIsExporting(false);
    }
  }, [reactFlowInstance, hiddenNodes, setHiddenNodes]);

  return {
    isExporting,
    exportVisualization,
  };
}