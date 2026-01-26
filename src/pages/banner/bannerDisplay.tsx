import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { Navigation, EffectFade, Keyboard } from 'swiper/modules';
import type { BannerItem } from './bannerSetting';
import './bannerDisplay.css';

// TypeScript declarations for YouTube IFrame API
declare global {
  interface Window {
    YT?: {
      Player: unknown;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  index: number;
  onVideoEnd: () => void;
  isActive: boolean;
}

// --- COMPONENT: YouTubePlayer ---
const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  index,
  onVideoEnd,
  isActive
}) => {
  const playerRef = useRef<unknown>(null);
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
            onReady: (event: unknown) => {
              isReadyRef.current = true;
              if (isActive) {
                // Also rewind here just in case
                const player = event as { target: { seekTo: (time: number) => void; playVideo: () => void } };
                player.target.seekTo(0, true);
                player.target.playVideo();
              }
            },
            onStateChange: (event: unknown) => {
              const stateEvent = event as { data: number };
              if (stateEvent.data === 0) { // ENDED
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
        } catch {
            // Ignore error during cleanup
        }
        playerRef.current = null;
      }
    };
  }, [videoId, isActive]); 

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
  const [bannerItems] = useState<BannerItem[]>(() => {
    const saved = localStorage.getItem('bannerItems');
    if (saved) {
      try {
        const items = JSON.parse(saved) as BannerItem[];
        return items.length > 0 ? items : [];
      } catch (e) {
        console.error('Failed to parse saved banner items', e);
        return [];
      }
    }
    return [];
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const swiperRef = useRef<{ swiper: SwiperType } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom timer for non-YouTube slides
  useEffect(() => {
    if (bannerItems.length === 0) return;

    const currentItem = bannerItems[currentIndex];

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // For YouTube videos, let onVideoEnd handle the timing
    if (currentItem?.type === 'youtube') {
      return;
    }

    // For non-YouTube slides, set timer based on duration
    const duration = currentItem?.duration;
    timerRef.current = setTimeout(() => {
      if (swiperRef.current?.swiper) {
        const swiper = swiperRef.current.swiper;
        const isLastSlide = swiper.activeIndex === bannerItems.length - 1;

        if (isLastSlide) {
          swiper.slideTo(0);
        } else {
          swiper.slideNext();
        }
      }
    }, duration * 1000);

    // Cleanup on unmount or when slide changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentIndex, bannerItems]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSlideChange = (swiper: SwiperType) => {
    const index = swiper.activeIndex;
    setCurrentIndex(index);
  };

  const handleVideoEnd = () => {
    if (swiperRef.current?.swiper) {
      const swiper = swiperRef.current.swiper;
      if (swiper.activeIndex === bannerItems.length - 1) {
        swiper.slideTo(0);
      } else {
        swiper.slideNext();
      }
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

      case 'youtube': {
        const videoIdMatch = item.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/);
        const videoId = videoIdMatch?.[1]?.trim();
        if (!videoId) return <div className="text-white">Invalid Video</div>;

        return (
          <YouTubePlayer
            videoId={videoId}
            index={index}
            onVideoEnd={handleVideoEnd}
            isActive={isActive}
          />
        );
      }

      case 'gdrive': {
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
      }

      case 'iframe':
        // Handle blob URL atau URL biasa langsung dengan src
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      <Swiper
        ref={swiperRef}
        modules={[Navigation, EffectFade, Keyboard]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={500}
        loop={false}
        allowTouchMove={false}
        className="w-full h-full"
        onSlideChange={handleSlideChange}
        keyboard={{
          enabled: true,
          onlyInViewport: true,
        }}
      >
        {bannerItems.map((item, index) => (
          <SwiperSlide key={item.id} className="w-full h-full">
            {renderContent(item, index)}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BannerDisplay;