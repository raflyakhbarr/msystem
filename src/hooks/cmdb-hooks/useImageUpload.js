import { useState } from 'react';
import api from '../../services/api';

export const useImageUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + selectedFiles.length + existingImages.length > 10) {
      alert('Maksimal 10 gambar');
      return;
    }

    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      if (!isValid) {
        alert(`File ${file.name} bukan gambar`);
      }
      return isValid;
    });

    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isNew: true
    }));

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveNewImage = (index) => {
    const preview = imagePreviews[index];
    if (preview.isNew) {
      URL.revokeObjectURL(preview.preview);
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveExistingImage = async (imagePath, itemId) => {
    if (!window.confirm('Hapus gambar ini?')) return;
    
    try {
      if (itemId) {
        await api.delete(`/cmdb/${itemId}/images`, {
          data: { imagePath }
        });
      }
      
      setExistingImages(prev => prev.filter(img => img !== imagePath));
      return { success: true };
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus gambar');
      return { success: false, error: err };
    }
  };

  const setImages = (images) => {
    const parsedImages = typeof images === 'string' ? JSON.parse(images) : (images || []);
    setExistingImages(parsedImages);
  };

  const resetImages = () => {
    setSelectedFiles([]);
    imagePreviews.forEach(preview => {
      if (preview.isNew) URL.revokeObjectURL(preview.preview);
    });
    setImagePreviews([]);
    setExistingImages([]);
  };

  return {
    selectedFiles,
    imagePreviews,
    existingImages,
    handleFileSelect,
    handleRemoveNewImage,
    handleRemoveExistingImage,
    setImages,
    resetImages,
  };
};