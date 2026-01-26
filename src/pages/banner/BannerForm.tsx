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
import { Upload } from 'lucide-react';
import type { BannerItem, ContentCategory, ImageSourceType } from './bannerSetting';

interface BannerFormProps {
  mode: 'add' | 'edit';
  data: Partial<BannerItem>;
  category: ContentCategory;
  imageSource: ImageSourceType;
  htmlFile: File | null;
  onDataChange: (data: Partial<BannerItem>) => void;
  onCategoryChange: (category: ContentCategory) => void;
  onImageSourceChange: (source: ImageSourceType) => void;
  onHtmlFileChange: (file: File | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const BannerForm: React.FC<BannerFormProps> = ({
  mode,
  data,
  category,
  imageSource,
  htmlFile,
  onDataChange,
  onCategoryChange,
  onImageSourceChange,
  onHtmlFileChange,
  onSubmit,
  onCancel,
  fileInputRef,
}) => {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Judul (opsional)</Label>
        <Input
          placeholder="Item Banner Saya"
          value={data.title || ''}
          onChange={(e) => onDataChange({ ...data, title: e.target.value })}
        />
      </div>

      {/* Main Category Selection */}
      <div className="space-y-2">
        <Label>Tipe Konten</Label>
        <Select
          value={category}
          onValueChange={onCategoryChange}
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
      {category === 'image' && (
        <div className="space-y-2">
          <Label>Sumber Gambar</Label>
          <Select
            value={imageSource}
            onValueChange={onImageSourceChange}
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
        {category === 'html' ? (
          <>
            <Label>File HTML atau URL Website</Label>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef?.current?.click()}
              >
                <Upload className="size-4 mr-2" />
                {htmlFile ? htmlFile.name : 'Pilih File HTML'}
              </Button>
              {fileInputRef && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onHtmlFileChange(file);
                      onDataChange({ ...data, url: '' });
                    }
                  }}
                />
              )}
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
                value={data.url || ''}
                onChange={(e) => {
                  onDataChange({ ...data, url: e.target.value });
                  if (e.target.value) {
                    onHtmlFileChange(null);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Upload file HTML lokal atau tempel URL website untuk di-embed
                {htmlFile && <span className="text-amber-600 block mt-1">⚠️ File upload tidak akan tersimpan setelah refresh halaman</span>}
              </p>
            </div>
          </>
        ) : (
          <>
            <Label>
              {category === 'video' ? 'URL YouTube' :
               imageSource === 'gdrive' ? 'URL Google Drive' :
               imageSource === 'upload' ? 'File (Segera Hadir)' : 'URL Gambar'}
            </Label>
            {category === 'image' && imageSource === 'upload' ? (
              <Button variant="outline" className="w-full" disabled>
                <Upload className="size-4 mr-2" />
                Pilih File (Segera Hadir)
              </Button>
            ) : (
              <Input
                placeholder={
                  category === 'video' ? 'https://youtube.com/watch?v=...' :
                  imageSource === 'gdrive' ? 'https://drive.google.com/file/d/.../view' :
                  'https://example.com/image.jpg'
                }
                value={data.url || ''}
                onChange={(e) => onDataChange({ ...data, url: e.target.value })}
                disabled={category === 'image' && imageSource === 'upload'}
              />
            )}
            <p className="text-xs text-muted-foreground">
              {category === 'video' ? 'Tempel URL video YouTube' :
               imageSource === 'gdrive' ? 'Tempel tautan berbagi Google Drive' :
               imageSource === 'upload' ? 'Fitur upload file segera hadir' :
               'Tempel URL gambar langsung'}
            </p>
          </>
        )}
      </div>

      {/* Duration for images and html only */}
      {category !== 'video' && (
        <div className="space-y-2">
          <Label>Durasi (detik)</Label>
          <Input
            type="number"
            min="1"
            value={data.duration === 0 ? '' : (data.duration ?? '')}
            onChange={(e) => {
              const value = e.target.value;
              onDataChange({ ...data, duration: value === '' ? 0 : parseInt(value) });
            }}
          />
          <p className="text-xs text-muted-foreground">Berapa lama konten ditampilkan</p>
        </div>
      )}

      {/* Dialog Footer */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button onClick={onSubmit}>
          {mode === 'add' ? 'Tambah Item' : 'Simpan Perubahan'}
        </Button>
      </div>
    </div>
  );
};
