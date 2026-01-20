import  { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BannerItem } from './bannerSetting';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade, Keyboard } from 'swiper/modules';
import './bannerDisplay.css';

const BannerPreview = () => {
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load banner items from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bannerItems');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        if (items.length > 0) {
          setBannerItems(items);
        }
      } catch (e) {
        console.error('Failed to parse saved banner items', e);
      }
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSlideChange = (swiper: any) => {
    setCurrentIndex(swiper.realIndex);

    // Pause autoplay when on YouTube slide to let video play
    const item = bannerItems[swiper.realIndex];
    if (item?.type === 'youtube') {
      swiper.autoplay.stop();
    } else {
      swiper.autoplay.start();
    }
  };

  const renderContent = (item: BannerItem) => {
    switch (item.type) {
      case 'image':
        return (
          <img
            src={item.url}
            alt={item.title || 'Banner'}
            className="w-screen h-screen object-contain"
          />
        );

      case 'youtube':
        const videoId = item.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
        if (!videoId) {
          return (
            <div className="flex items-center justify-center w-screen h-screen bg-background">
              <p className="text-destructive">Invalid YouTube URL</p>
            </div>
          );
        }
        return (
          <iframe
            width="100vw"
            height="100vh"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1`}
            title={item.title || 'YouTube video'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        );

      case 'gdrive':
        // Extract file ID from Google Drive URL
        const fileId = item.url.match(/\/d\/([^/]+)/)?.[1];
        if (!fileId) {
          return (
            <div className="flex items-center justify-center w-screen h-screen bg-background">
              <p className="text-destructive">Invalid Google Drive URL</p>
            </div>
          );
        }
        return (
          <iframe
            src={`https://drive.google.com/file/d/${fileId}/preview`}
            title={item.title || 'Google Drive content'}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay"
          />
        );

      case 'iframe':
        return (
          <div className="w-screen h-screen relative">
            <iframe
              src={item.url}
              title={item.title || 'iframe content'}
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-scripts allow-same-origin allow-presentation"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-4 right-4 z-10"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center w-screen h-screen bg-background">
            <p>Unknown content type</p>
          </div>
        );
    }
  };

  if (bannerItems.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Banner Content</h1>
          <p className="text-muted-foreground">
            Add content in{' '}
            <a href="/banner/setting" className="text-primary hover:underline">
              Banner Settings
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Calculate autoplay delay based on non-YouTube items
  const getAutoplayDelay = () => {
    const nonYouTubeItems = bannerItems.filter(item => item.type !== 'youtube');
    if (nonYouTubeItems.length === 0) return 10000; // Default for all YouTube
    return Math.min(...nonYouTubeItems.map(item => item.duration * 1000));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    >
      <Swiper
        ref={swiperRef}
        modules={[Navigation, Autoplay, EffectFade, Keyboard]}
        navigation={true}
        autoplay={{
          delay: getAutoplayDelay(),
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        keyboard={{
          enabled: true,
          onlyInViewport: true,
        }}
        speed={500}
        loop={true}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        onSlideChange={handleSlideChange}
      >
        {bannerItems.map((item, index) => (
          <SwiperSlide key={`${item.id}-${index}`} style={{ width: '100%', height: '100%' }}>
            {renderContent(item)}
          </SwiperSlide>
        ))}

        {/* Info badge - shows current slide info */}
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur px-4 py-2 rounded-lg z-10 pointer-events-none">
          <p className="text-sm font-medium">{bannerItems[currentIndex]?.title}</p>
          <p className="text-xs text-muted-foreground">
            {currentIndex + 1} / {bannerItems.length}
          </p>
          {bannerItems[currentIndex]?.type !== 'youtube' && (
            <p className="text-xs text-muted-foreground">
              {bannerItems[currentIndex]?.duration}s
            </p>
          )}
        </div>
      </Swiper>

      {/* Fullscreen button for iframe content */}
      {bannerItems.some(item => item.type === 'iframe') && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-4 right-4 z-20"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </Button>
      )}
    </div>
  );
};

export default BannerPreview;
