import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, MoveUp, MoveDown, Upload, ExternalLink, Youtube, Globe, Image as ImageIcon, HardDrive, Pencil, FileImage } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type BannerItemType = 'image' | 'youtube' | 'iframe' | 'gdrive';
export type ImageSourceType = 'url' | 'gdrive' | 'upload';
export type ContentCategory = 'image' | 'video' | 'html';

export interface BannerItem {
  id: string;
  type: BannerItemType;
  url: string;
  duration: number; // in seconds
  title?: string;
  imageSource?: ImageSourceType; // For image type: url, gdrive, or upload
}

const BannerSetting = () => {
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [contentCategory, setContentCategory] = useState<ContentCategory>('image');
  const [imageSource, setImageSource] = useState<ImageSourceType>('url');
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [editHtmlFile, setEditHtmlFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [newItem, setNewItem] = useState<Partial<BannerItem>>({
    type: 'image',
    url: '',
    duration: 10,
    title: '',
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContentCategory, setEditContentCategory] = useState<ContentCategory>('image');
  const [editImageSource, setEditImageSource] = useState<ImageSourceType>('url');
  const [editingItem, setEditingItem] = useState<Partial<BannerItem>>({
    type: 'image',
    url: '',
    duration: 10,
    title: '',
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bannerItems');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        // Filter out items with empty URLs (these were blob URLs that couldn't be persisted)
        const validItems = items.filter((item: BannerItem) => item.url);
        setBannerItems(validItems);
      } catch (e) {
        console.error('Failed to parse saved banner items', e);
      }
    }

    // Cleanup: Revoke all blob URLs on unmount
    return () => {
      bannerItems.forEach(item => {
        if (item.url?.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, []);

  // Save to localStorage whenever bannerItems changes
  // Note: Blob URLs are not saved as they won't work after page reload
  useEffect(() => {
    if (bannerItems.length > 0) {
      const itemsToSave = bannerItems.map(item => ({
        ...item,
        // Keep blob URLs in memory but filter them out for localStorage
        url: item.url.startsWith('blob:') ? '' : item.url,
      }));
      localStorage.setItem('bannerItems', JSON.stringify(itemsToSave));
    }
  }, [bannerItems]);

  const handleAddItem = () => {
    // For HTML file upload, check if file is selected
    if (contentCategory === 'html' && !htmlFile && !newItem.url) {
      alert('Silakan pilih file HTML atau masukkan URL');
      return;
    }

    // For other types, check URL
    if (contentCategory !== 'html' && !newItem.url) {
      alert('Silakan masukkan URL');
      return;
    }

    // Map category and source to legacy type
    let itemType: BannerItemType;
    let finalUrl = newItem.url!;

    if (contentCategory === 'video') {
      itemType = 'youtube';
    } else if (contentCategory === 'html') {
      itemType = 'iframe';
      // If file is selected, create blob URL
      if (htmlFile) {
        finalUrl = URL.createObjectURL(htmlFile);
      }
    } else {
      // Image category
      if (imageSource === 'gdrive') {
        itemType = 'gdrive';
      } else if (imageSource === 'upload') {
        itemType = 'image';
      } else {
        itemType = 'image';
      }
    }

    const item: BannerItem = {
      id: Date.now().toString(),
      type: itemType,
      url: finalUrl,
      duration: contentCategory === 'video' ? 0 : (newItem.duration || 10),
      title: newItem.title || `${contentCategory}${contentCategory === 'image' && imageSource ? ` (${imageSource})` : ''}`,
      imageSource: contentCategory === 'image' ? imageSource : undefined,
    };

    setBannerItems([...bannerItems, item]);
    setNewItem({ type: 'image', url: '', duration: 10, title: '' });
    setContentCategory('image');
    setImageSource('url');
    setHtmlFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsAddDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    const itemToDelete = bannerItems.find(item => item.id === id);
    // Revoke blob URL if it's a local file
    if (itemToDelete?.url.startsWith('blob:')) {
      URL.revokeObjectURL(itemToDelete.url);
    }
    setBannerItems(bannerItems.filter(item => item.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...bannerItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setBannerItems(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === bannerItems.length - 1) return;
    const newItems = [...bannerItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setBannerItems(newItems);
  };

  const handleEditItem = (index: number) => {
    const item = bannerItems[index];
    setEditingIndex(index);
    setEditingItem(item);
    setEditHtmlFile(null);

    // Determine category from existing type
    if (item.type === 'youtube') {
      setEditContentCategory('video');
    } else if (item.type === 'iframe') {
      setEditContentCategory('html');
    } else {
      setEditContentCategory('image');
      // Set image source based on type
      if (item.type === 'gdrive') {
        setEditImageSource('gdrive');
      } else if (item.imageSource === 'upload') {
        setEditImageSource('upload');
      } else {
        setEditImageSource('url');
      }
    }

    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    // For HTML file upload, check if file is selected
    if (editContentCategory === 'html' && !editHtmlFile && !editingItem.url) {
      alert('Silakan pilih file HTML atau masukkan URL');
      return;
    }

    // For other types, check URL
    if (editContentCategory !== 'html' && !editingItem.url) {
      alert('Silakan masukkan URL');
      return;
    }

    // Map category and source to legacy type
    let itemType: BannerItemType;
    let finalUrl = editingItem.url!;

    if (editContentCategory === 'video') {
      itemType = 'youtube';
    } else if (editContentCategory === 'html') {
      itemType = 'iframe';
      // If new file is selected, create blob URL and revoke old one
      if (editHtmlFile) {
        const oldItem = bannerItems[editingIndex!];
        if (oldItem?.url.startsWith('blob:')) {
          URL.revokeObjectURL(oldItem.url);
        }
        finalUrl = URL.createObjectURL(editHtmlFile);
      }
    } else {
      // Image category
      if (editImageSource === 'gdrive') {
        itemType = 'gdrive';
      } else if (editImageSource === 'upload') {
        itemType = 'image';
      } else {
        itemType = 'image';
      }
    }

    const newItems = [...bannerItems];
    newItems[editingIndex!] = {
      ...newItems[editingIndex!],
      type: itemType,
      url: finalUrl,
      duration: editContentCategory === 'video' ? 0 : (editingItem.duration || 10),
      title: editingItem.title || `${editContentCategory}${editContentCategory === 'image' && editImageSource ? ` (${editImageSource})` : ''}`,
      imageSource: editContentCategory === 'image' ? editImageSource : undefined,
    };
    setBannerItems(newItems);
    setIsEditDialogOpen(false);
    setEditingIndex(null);
    setEditHtmlFile(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const getIconForType = (type: BannerItemType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="size-4" />;
      case 'youtube':
        return <Youtube className="size-4" />;
      case 'gdrive':
        return <HardDrive className="size-4" />;
      case 'iframe':
        return <Globe className="size-4" />;
    }
  };

  const renderPreview = (item: BannerItem) => {
    const previewClass = "w-full h-40 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden relative";

    switch (item.type) {
      case 'image':
        return (
          <div className={previewClass}>
            <img src={item.url} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="12"%3EFailed to load%3C/text%3E%3C/svg%3E';
            }} />
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Image</div>
          </div>
        );
      case 'youtube':
        const videoId = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^/?&]+)/)?.[1];
        return (
          <div className={previewClass}>
            {videoId ? (
              <>
                <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="YouTube thumbnail" className="max-w-full max-h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 rounded-full p-3 shadow-lg">
                    <Youtube className="size-6 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">YouTube</div>
              </>
            ) : (
              <div className="text-center">
                <Youtube className="size-8 text-muted-foreground mx-auto mb-2" />
                <span className="text-sm text-muted-foreground">Invalid YouTube URL</span>
              </div>
            )}
          </div>
        );
      case 'gdrive':
        const fileId = item.url.match(/\/d\/([^/]+)/)?.[1] || item.url.match(/id=([^/&]+)/)?.[1];
        if (fileId) {
          // Use iframe preview like bannerDisplay does, since GDrive only works in iframes
          const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
          return (
            <div className={previewClass + " p-0 bg-background"}>
              <iframe
                key={`gdrive-${item.id}`}
                src={previewUrl}
                title="Google Drive preview"
                className="w-full h-full border-0"
                allow="autoplay"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">GDrive</div>
            </div>
          );
        }
        return (
          <div className={previewClass}>
            <div className="text-center">
              <HardDrive className="size-12 text-blue-500 mx-auto mb-2" />
              <div className="text-sm font-medium">Google Drive</div>
              <div className="text-xs text-muted-foreground mt-1">Invalid URL</div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">GDrive</div>
          </div>
        );
      case 'iframe':
        const hostname = item.url ? new URL(item.url).hostname.replace('www.', '') : 'Website';
        return (
          <div className={previewClass}>
            <div className="text-center">
              <Globe className="size-12 text-green-500 mx-auto mb-2" />
              <div className="text-sm font-medium truncate px-4">{hostname}</div>
              <div className="text-xs text-muted-foreground mt-1">Embedded website</div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">HTML</div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6 overflow-y-auto">
        <div>
          <h1 className="text-3xl font-bold">Banner Setting</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Tambah Konten
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Konten Banner</DialogTitle>
              <DialogDescription>
                Tambah item baru ke rotasi tampilan banner
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Judul (opsional)</Label>
                <Input
                  placeholder="Item Banner Saya"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
              </div>

              {/* Main Category Selection */}
              <div className="space-y-2">
                <Label>Tipe Konten</Label>
                <Select
                  value={contentCategory}
                  onValueChange={(value: ContentCategory) => setContentCategory(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Gambar</SelectItem>
                    <SelectItem value="video">Video (YouTube)</SelectItem>
                    <SelectItem value="html">HTML / Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Image Source Selection */}
              {contentCategory === 'image' && (
                <div className="space-y-2">
                  <Label>Sumber Gambar</Label>
                  <Select
                    value={imageSource}
                    onValueChange={(value: ImageSourceType) => setImageSource(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="gdrive">Google Drive</SelectItem>
                      <SelectItem value="upload">Unggah File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                {contentCategory === 'html' ? (
                  <>
                    <Label>File HTML atau URL Website</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="size-4 mr-2" />
                        {htmlFile ? htmlFile.name : 'Pilih File HTML'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".html,.htm"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setHtmlFile(file);
                            setNewItem({ ...newItem, url: '' });
                          }
                        }}
                      />
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">atau</span>
                        </div>
                      </div>
                      <Input
                        placeholder="https://example.com"
                        value={newItem.url}
                        onChange={(e) => {
                          setNewItem({ ...newItem, url: e.target.value });
                          if (e.target.value) {
                            setHtmlFile(null);
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload file HTML lokal atau tempel URL website untuk di-embed
                        {(htmlFile || editHtmlFile) && <span className="text-amber-600 block mt-1">⚠️ File upload tidak akan tersimpan setelah refresh halaman</span>}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Label>
                      {contentCategory === 'video' ? 'URL YouTube' :
                       imageSource === 'gdrive' ? 'URL Google Drive' :
                       (imageSource as ImageSourceType) === 'upload' ? 'File (Segera Hadir)' : 'URL Gambar'}
                    </Label>
                    {contentCategory === 'image' && (imageSource as ImageSourceType) === 'upload' ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Upload className="size-4 mr-2" />
                        Pilih File (Segera Hadir)
                      </Button>
                    ) : (
                      <Input
                        placeholder={
                          contentCategory === 'video' ? 'https://youtube.com/watch?v=...' :
                          imageSource === 'gdrive' ? 'https://drive.google.com/file/d/.../view' :
                          'https://example.com/image.jpg'
                        }
                        value={newItem.url}
                        onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                        disabled={contentCategory === 'image' && (imageSource as ImageSourceType) === 'upload'}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {contentCategory === 'video' ? 'Tempel URL video YouTube' :
                       imageSource === 'gdrive' ? 'Tempel tautan berbagi Google Drive' :
                       (imageSource as ImageSourceType) === 'upload' ? 'Fitur upload file segera hadir' :
                       'Tempel URL gambar langsung'}
                    </p>
                  </>
                )}
              </div>

              {/* Duration for images and html only */}
              {contentCategory !== 'video' && (
                <div className="space-y-2">
                  <Label>Durasi (detik)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.duration}
                    onChange={(e) => setNewItem({ ...newItem, duration: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-xs text-muted-foreground">Berapa lama konten ditampilkan</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Batal</Button>
              <Button onClick={handleAddItem}>Tambah Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Konten Banner</DialogTitle>
              <DialogDescription>
                Edit item banner yang dipilih
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Judul (opsional)</Label>
                <Input
                  placeholder="Item Banner Saya"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                />
              </div>

              {/* Main Category Selection */}
              <div className="space-y-2">
                <Label>Tipe Konten</Label>
                <Select
                  value={editContentCategory}
                  onValueChange={(value: ContentCategory) => setEditContentCategory(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Gambar</SelectItem>
                    <SelectItem value="video">Video (YouTube)</SelectItem>
                    <SelectItem value="html">HTML / Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Image Source Selection */}
              {editContentCategory === 'image' && (
                <div className="space-y-2">
                  <Label>Sumber Gambar</Label>
                  <Select
                    value={editImageSource}
                    onValueChange={(value: ImageSourceType) => setEditImageSource(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="gdrive">Google Drive</SelectItem>
                      <SelectItem value="upload">Unggah File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* URL Input */}
              <div className="space-y-2">
                {editContentCategory === 'html' ? (
                  <>
                    <Label>File HTML atau URL Website</Label>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => editFileInputRef.current?.click()}
                      >
                        <Upload className="size-4 mr-2" />
                        {editHtmlFile ? editHtmlFile.name : 'Pilih File HTML'}
                      </Button>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept=".html,.htm"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setEditHtmlFile(file);
                            setEditingItem({ ...editingItem, url: '' });
                          }
                        }}
                      />
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">atau</span>
                        </div>
                      </div>
                      <Input
                        placeholder="https://example.com"
                        value={editingItem.url}
                        onChange={(e) => {
                          setEditingItem({ ...editingItem, url: e.target.value });
                          if (e.target.value) {
                            setEditHtmlFile(null);
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload file HTML lokal atau tempel URL website untuk di-embed
                        {(htmlFile || editHtmlFile) && <span className="text-amber-600 block mt-1">⚠️ File upload tidak akan tersimpan setelah refresh halaman</span>}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Label>
                      {editContentCategory === 'video' ? 'URL YouTube' :
                       editImageSource === 'gdrive' ? 'URL Google Drive' :
                       (editImageSource as ImageSourceType) === 'upload' ? 'File (Segera Hadir)' : 'URL Gambar'}
                    </Label>
                    {editContentCategory === 'image' && (editImageSource as ImageSourceType) === 'upload' ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Upload className="size-4 mr-2" />
                        Pilih File (Segera Hadir)
                      </Button>
                    ) : (
                      <Input
                        placeholder={
                          editContentCategory === 'video' ? 'https://youtube.com/watch?v=...' :
                          editImageSource === 'gdrive' ? 'https://drive.google.com/file/d/.../view' :
                          'https://example.com/image.jpg'
                        }
                        value={editingItem.url}
                        onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                        disabled={editContentCategory === 'image' && (editImageSource as ImageSourceType) === 'upload'}
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {editContentCategory === 'video' ? 'Tempel URL video YouTube' :
                       editImageSource === 'gdrive' ? 'Tempel tautan berbagi Google Drive' :
                       (editImageSource as ImageSourceType) === 'upload' ? 'Fitur upload file segera hadir' :
                       'Tempel URL gambar langsung'}
                    </p>
                  </>
                )}
              </div>

              {/* Duration for images and html only */}
              {editContentCategory !== 'video' && (
                <div className="space-y-2">
                  <Label>Durasi (detik)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingItem.duration}
                    onChange={(e) => setEditingItem({ ...editingItem, duration: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-xs text-muted-foreground">Berapa lama konten ditampilkan</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSaveEdit}>Simpan Perubahan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {bannerItems.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground text-lg mb-2">Belum ada item banner</p>
          <p className="text-muted-foreground text-sm">Klik "Tambah Konten" untuk memulai</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bannerItems.map((item, index) => (
            <div key={item.id} className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
              {/* Preview Area */}
              <div className="relative">
                {renderPreview(item)}
                {/* Position Badge */}
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                  #{index + 1}
                </div>
              </div>

              {/* Content Area */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getIconForType(item.type)}
                    <h3 className="font-semibold truncate">{item.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-mono truncate" title={item.url}>
                  {item.url}
                </p>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {item.type !== 'youtube' && (
                      <Badge variant="outline" className="text-xs">
                        {item.duration}s
                      </Badge>
                    )}
                    {item.imageSource && (
                      <Badge variant="outline" className="text-xs">
                        {item.imageSource}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <MoveUp className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === bannerItems.length - 1}
                    >
                      <MoveDown className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => handleEditItem(index)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSetting;
