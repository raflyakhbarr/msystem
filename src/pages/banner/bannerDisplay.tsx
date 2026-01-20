import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectFade, Keyboard } from 'swiper/modules';
import type { BannerItem } from './bannerSetting';
import './bannerDisplay.css';

// TypeScript declarations for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  index: number;
  onVideoEnd: () => void;
  instanceId: string;
  isActive: boolean;
}

// --- COMPONENT: YouTubePlayer ---
const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  videoId, 
  index, 
  onVideoEnd, 
  instanceId,
  isActive 
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isReadyRef = useRef(false);
  const onVideoEndRef = useRef(onVideoEnd);

  // Keep ref updated
  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  // 1. WATCH FOR ACTIVE STATE CHANGES
  useEffect(() => {
    if (isReadyRef.current && playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (isActive) {
        try {
          playerRef.current.seekTo(0, true); 
        } catch (e) {
          console.error("Seek failed", e);
        }
        // -----------------------------

        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isActive, index]);

  // 2. INITIALIZE PLAYER
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player && !playerRef.current && containerRef.current) {
        
        containerRef.current.innerHTML = '';

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 0, 
            mute: 1,    
            controls: 0, 
            rel: 1,
            iv_load_policy: 3,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              isReadyRef.current = true;
              if (isActive) {
                // Also rewind here just in case
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 0) { // ENDED
                onVideoEndRef.current?.();
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      isReadyRef.current = false;
      if (playerRef.current) {
        try {
            if (typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
            }
        } catch(e) {}
        playerRef.current = null;
      }
    };
  }, [videoId]); 

  return (
    <div className="relative w-full h-full">
      {/* The YouTube Player */}
      <div ref={containerRef} className="w-full h-full" />
      
      {/* THE SHIELD: Blocks mouse interaction so menus never pop up */}
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto' }} />
    </div>
  );
};


// --- COMPONENT: BannerDisplay ---
const BannerDisplay = () => {
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueKeysRef = useRef<Map<string, string>>(new Map());

  // Load items
  useEffect(() => {
    const saved = localStorage.getItem('bannerItems');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        if (items.length > 0) {
          items.forEach((item: BannerItem) => {
            if (!uniqueKeysRef.current.has(item.id)) {
              uniqueKeysRef.current.set(item.id, `${item.id}-${Date.now()}`);
            }
          });
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
    const index = swiper.activeIndex;
    setCurrentIndex(index);

    const item = bannerItems[index];
    
    if (item?.type === 'youtube') {
      swiper.autoplay.stop();
    } else {
      swiper.autoplay.start();
    }
  };

  const handleVideoEnd = () => {
    if (swiperRef.current?.swiper) {
      const swiper = swiperRef.current.swiper;
      swiper.autoplay.stop(); // Ensure it doesn't fight us
      if (swiper.activeIndex === bannerItems.length - 1) {
        swiper.slideTo(0);
      } else {
        swiper.slideNext();
      }

      setTimeout(() => {
        const nextIndex = swiper.activeIndex;
        if (bannerItems[nextIndex]?.type !== 'youtube') {
            swiper.autoplay.start();
        }
      }, 500);
    }
  };

  const renderContent = (item: BannerItem, index: number) => {
    const isActive = index === currentIndex;

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
        const videoIdMatch = item.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/);
        const videoId = videoIdMatch?.[1]?.trim();
        if (!videoId) return <div className="text-white">Invalid Video</div>;
        
        return (
          <YouTubePlayer
            videoId={videoId}
            index={index}
            onVideoEnd={handleVideoEnd}
            instanceId={`${item.id}-${index}`}
            isActive={isActive} 
          />
        );

      case 'gdrive':
        const fileId = item.url.match(/\/d\/([^/]+)/)?.[1];
        if (!fileId) return <div className="text-white flex items-center justify-center h-full">Invalid Drive URL</div>;
        const directImageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w3840`;
        
        return (
          <img 
            src={directImageUrl} 
            alt={item.title || 'Google Drive Image'}
            className="w-full h-full object-contain bg-black"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `<div class="text-red-500 flex items-center justify-center h-full">Image Load Failed. Check Permissions.</div>`;
            }}
          />
        );

      case 'iframe':
        return (
            <div className="w-screen h-screen relative">
              <iframe
                src={item.url}
                title={item.title}
                className="w-full h-full border-none"
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
        return <div>Unknown</div>;
    }
  };

  if (bannerItems.length === 0) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background text-white">
        No Content
      </div>
    );
  }

  const getAutoplayDelay = () => {
    const nonYouTubeItems = bannerItems.filter(item => item.type !== 'youtube');
    if (nonYouTubeItems.length === 0) return 10000;
    return Math.min(...nonYouTubeItems.map(item => item.duration * 1000));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      <Swiper
        ref={swiperRef}
        modules={[Navigation, Autoplay, EffectFade, Keyboard]}
        autoplay={{
          delay: getAutoplayDelay(),
          disableOnInteraction: false,
          pauseOnMouseEnter: false, 
          stopOnLastSlide: false
        }}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={500}
        loop={false}
        className="w-full h-full"
        onSlideChange={handleSlideChange}
      >
        {bannerItems.map((item, index) => (
          <SwiperSlide key={`${item.id}-${index}`} className="w-full h-full">
            {renderContent(item, index)}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BannerDisplay;