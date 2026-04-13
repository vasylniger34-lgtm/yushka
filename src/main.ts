// Declare the global window interface to include our callback
declare global {
  interface Window {
    onSpotifyIframeApiReady: (IFrameAPI: any) => void;
  }
}

const PLAYLIST_URI = 'spotify:playlist:0BzGYDgDyAX4yyVTxazV2U';

// Elements
const vinylContainer = document.getElementById('vinyl-container');
const trackCover = document.getElementById('track-cover') as HTMLImageElement;
const playTrigger = document.getElementById('play-trigger');
const spinInstruction = document.getElementById('spin-instruction');

const menuBtn = document.getElementById('menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const sideMenu = document.getElementById('side-menu');
const resetTracksBtn = document.getElementById('reset-tracks-btn');
// @ts-ignore
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

const mobileInfiniteScroll = document.getElementById('mobile-infinite-scroll');
const desktopSoupBg = document.getElementById('desktop-soup-bg');
const upBtn = document.getElementById('up-btn');

let currentPlayingURI = '';
let embedController: any = null;

// Initial Fallback Cover
trackCover.src = '/yushka-logo.svg';
trackCover.classList.remove('hidden');

window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
  const element = document.getElementById('embed-iframe');
  if (!element) return;

  const options = {
    uri: PLAYLIST_URI,
    width: '100%',
    height: '152',
    theme: '0', 
  };

  const callback = (EmbedController: any) => {
    embedController = EmbedController;

    EmbedController.addListener('playback_update', (e: any) => {
      const state = e.data;
      
      // Update vinyl animation state
      if (state.isPaused || state.isBuffering) {
        vinylContainer?.classList.add('paused');
      } else {
        vinylContainer?.classList.remove('paused');
        if (spinInstruction && !spinInstruction.classList.contains('hidden')) {
          spinInstruction.classList.add('hidden');
        }
      }

      // Update track cover if the track changed
      if (state.playingURI && state.playingURI !== currentPlayingURI) {
        currentPlayingURI = state.playingURI;
        updateTrackMetadata(state.playingURI);
      }
    });
  };

  IFrameAPI.createController(element, options, callback);
};

// Vinyl Play Trigger Interaction (simulating swipe/spin by dragging)
let isDragging = false;
let startX = 0;

if (playTrigger) {
  // Simple click to toggle
  playTrigger.addEventListener('click', () => {
    if (embedController) {
      embedController.togglePlay();
    }
  });

  const handleStart = (x: number) => {
    isDragging = true;
    startX = x;
  };

  const handleMove = (x: number) => {
    if (!isDragging) return;
    const diff = x - startX;
    if (Math.abs(diff) > 30) {
      // Swiped/dragged enough, start play
      if (embedController && vinylContainer?.classList.contains('paused')) {
        embedController.play();
      }
      isDragging = false; // reset so we don't spam
    }
  };

  const handleEnd = () => {
    isDragging = false;
  };

  // Mouse events for Desktop
  playTrigger.addEventListener('mousedown', (e) => handleStart(e.clientX));
  playTrigger.addEventListener('mousemove', (e) => handleMove(e.clientX));
  playTrigger.addEventListener('mouseup', handleEnd);
  playTrigger.addEventListener('mouseleave', handleEnd);

  // Touch events for Mobile
  playTrigger.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientX), { passive: true });
  playTrigger.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX), { passive: true });
  playTrigger.addEventListener('touchend', handleEnd);
}

// Function to fetch and update the track cover using Spotify's public oEmbed API
async function updateTrackMetadata(uri: string) {
  if (!uri.includes(':track:')) return;

  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(uri)}`;
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail_url) {
        trackCover.src = data.thumbnail_url;
      } else {
        trackCover.src = '/yushka-logo.svg';
      }
    } else {
      trackCover.src = '/yushka-logo.svg';
    }
  } catch (error) {
    console.error('Failed to fetch track metadata:', error);
    trackCover.src = '/yushka-logo.svg';
  }
}

// Menu Logic
if (menuBtn && sideMenu && closeMenuBtn) {
  menuBtn.addEventListener('click', () => sideMenu.classList.add('open'));
  closeMenuBtn.addEventListener('click', () => sideMenu.classList.remove('open'));
}

// Reset tracks logic
if (resetTracksBtn) {
  resetTracksBtn.addEventListener('click', () => {
    if (embedController) {
      // Reloading the URI effectively resets the playlist play context
      embedController.loadUri(PLAYLIST_URI);
      embedController.play();
      sideMenu?.classList.remove('open');
    }
  });
}

// Volume Slider logic (Placeholder mostly since Free Embed API doesn't support setVolume)
if (volumeSlider) {
  volumeSlider.addEventListener('input', (e) => {
    // If future support exists, we can call embedController.setVolume
    // Currently, we just let it slide for UI visual representation
    console.log('Volume changed to', (e.target as HTMLInputElement).value);
  });
}

// Infinite Mobile Scroll Logic
function createSoupElement(isDesktop: boolean = false) {
  const img = document.createElement('img');
  img.src = '/soup.svg';
  if (isDesktop) {
    img.className = 'soup-bg-item';
    img.style.top = `${Math.random() * 95}vh`;
    
    // Choose randomly to place on left or right side
    const isLeft = Math.random() > 0.5;
    if (isLeft) {
      img.style.left = `${Math.random() * 15}vw`; // Left side
    } else {
      img.style.left = `${80 + Math.random() * 15}vw`; // Right side
    }
    
    img.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random() * 1.5})`;
  } else {
    img.className = 'mobile-soup-item';
  }
  return img;
}

// Populate desktop background
if (desktopSoupBg) {
  for (let i = 0; i < 15; i++) {
    desktopSoupBg.appendChild(createSoupElement(true));
  }
}

// Populate mobile infinite scroll
if (mobileInfiniteScroll) {
  // Load initial batch
  for (let i = 0; i < 10; i++) {
    mobileInfiniteScroll.appendChild(createSoupElement(false));
  }

  // Bind scroll for infinite loading
  window.addEventListener('scroll', () => {
    // Show back to top button
    if (window.scrollY > 400) {
      upBtn?.classList.remove('hidden');
    } else {
      upBtn?.classList.add('hidden');
    }

    // Infinite add
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
      for (let i = 0; i < 5; i++) {
        mobileInfiniteScroll.appendChild(createSoupElement(false));
      }
    }
  }, { passive: true });
}

// Up button Logic
if (upBtn) {
  upBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
