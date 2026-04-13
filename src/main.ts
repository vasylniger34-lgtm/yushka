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

const infoBtn = document.getElementById('info-btn');
const infoModal = document.getElementById('info-modal');
const closeInfoBtn = document.getElementById('close-info-btn');

const mobileInfiniteScroll = document.getElementById('mobile-infinite-scroll');
const desktopSoupBg = document.getElementById('desktop-soup-bg');
const upBtn = document.getElementById('up-btn');

const vinyl = document.getElementById('vinyl');

let currentPlayingURI = '';
let embedController: any = null;
let isFirstPlay = true;

// Vinyl Spin Animation Logic
let currentRotation = 0;
let currentSpeed = 0;
let targetSpeed = 0;

function animateVinyl() {
  if (!vinyl) return;
  // Smoothly interpolate angular velocity
  currentSpeed += (targetSpeed - currentSpeed) * 0.05;
  
  if (currentSpeed > 0.05) {
    currentRotation += currentSpeed;
    vinyl.style.transform = `rotate(${currentRotation}deg)`;
  } else if (targetSpeed === 0 && currentSpeed > 0) {
    // Slight drift when stopping
    currentRotation += currentSpeed;
    vinyl.style.transform = `rotate(${currentRotation}deg)`;
  }
  requestAnimationFrame(animateVinyl);
}
requestAnimationFrame(animateVinyl);

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
        targetSpeed = 0;
        vinylContainer?.classList.add('paused');
      } else {
        vinylContainer?.classList.remove('paused');
        
        // Quick spin up effect
        if (targetSpeed === 0) {
          targetSpeed = 12; // accelerate fast
          setTimeout(() => { if (!vinylContainer?.classList.contains('paused')) targetSpeed = 1.8; }, 600); // settle
        } else {
          targetSpeed = 1.8; // default steady spin velocity
        }
        
        if (spinInstruction && !spinInstruction.classList.contains('hidden')) {
          spinInstruction.classList.add('hidden');
        }
      }

      // Update track cover if the track changed
      if (state.playingURI && state.playingURI !== currentPlayingURI) {
        currentPlayingURI = state.playingURI;
        updateTrackMetadata(state.playingURI);
        
        // Simulating "Shuffle" organically by skipping ahead initially
        if (isFirstPlay) {
           isFirstPlay = false;
           // Wait slightly then jump tracks randomly to simulate a shuffled fresh start
           const jumps = Math.floor(Math.random() * 4) + 1; // skip 1 to 4 tracks
           for (let i = 0; i < jumps; i++) {
             setTimeout(() => { if (embedController) embedController.next(); }, i * 400);
           }
        }
      }
    });
  };

  IFrameAPI.createController(element, options, callback);
};

// Vinyl Play Trigger Interaction (Multi-Tap Logic)
let tapCount = 0;
let tapTimeout: any;

if (playTrigger) {
  playTrigger.addEventListener('click', () => {
    // Hide spin instruction organically on first interaction
    if (spinInstruction && !spinInstruction.classList.contains('hidden')) {
      spinInstruction.classList.add('hidden');
    }

    tapCount++;
    if (tapCount === 1) {
      tapTimeout = setTimeout(() => {
        // 1 Tap: Play/Pause
        tapCount = 0;
        if (embedController) embedController.togglePlay();
      }, 300);
    } else if (tapCount === 2) {
      clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        // 2 Taps: Next Track
        tapCount = 0;
        if (embedController) embedController.next(); // Currently Spotify IFrame API support varies, preparing for YouTube!
      }, 300);
    } else if (tapCount >= 3) {
      clearTimeout(tapTimeout);
      // 3 Taps: Prev Track / Restart
      tapCount = 0;
      if (embedController) {
        // We do seek(0) to restart track since prev() is unstable on spotify
        embedController.seek(0);
      }
    }
  });
}

// Info Modal Logic
if (infoBtn && infoModal && closeInfoBtn) {
  infoBtn.addEventListener('click', () => infoModal.classList.remove('hidden'));
  closeInfoBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
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
        // Morph the image with a CSS transition!
        trackCover.src = data.thumbnail_url;
        trackCover.classList.remove('hidden');
      } else {
        trackCover.classList.add('hidden');
      }
    } else {
      trackCover.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to fetch track metadata:', error);
    trackCover.classList.add('hidden');
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

// iOS Emoji URLs for "Yushka" vibe
const emojis = [
  'https://em-content.zobj.net/source/apple/391/pot-of-food_1f372.png', // Stew/Soup
  'https://em-content.zobj.net/source/apple/391/bowl-with-spoon_1f963.png', // Bowl
  'https://em-content.zobj.net/source/apple/391/shallow-pan-of-food_1f958.png', // Pan
  'https://em-content.zobj.net/source/apple/391/fish_1f41f.png', // Fish
  'https://em-content.zobj.net/source/apple/391/sparkles_2728.png' // Sparkles
];

// Provide desktop scattered grid on sides
function populateDesktopEmojis() {
  if (!desktopSoupBg) return;
  const emojiSize = 80; // Larger emojis 
  const xSpacing = window.innerWidth * 0.08; // Denser x spacing
  const ySpacing = 80; // Denser y spacing
  
  const cols = Math.floor(window.innerWidth / xSpacing);
  const rows = Math.floor(window.innerHeight / ySpacing);

  let emojiIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Create pattern layout staggered
      const offsetX = (r % 2 === 0) ? 0 : xSpacing / 2;
      const xPos = c * xSpacing + offsetX;
      const yPos = r * ySpacing;
      
      // Keep strictly to sides (0 - 20vw OR 80vw - 100vw)
      const xvw = (xPos / window.innerWidth) * 100;
      if (xvw < 22 || xvw > 78) {
        const img = document.createElement('img');
        img.src = emojis[emojiIndex % emojis.length];
        img.className = 'soup-bg-item';
        img.style.top = `${yPos}px`;
        img.style.left = `${xPos}px`;
        img.style.width = `${emojiSize}px`;
        img.style.height = `${emojiSize}px`;
        desktopSoupBg.appendChild(img);
        emojiIndex++;
      }
    }
  }
}

const handwrittenMessages = ["Люблю тебе ❤️", "Ти топ ✨", "Гарного дня!", "ЮШКА 🍲", "Пахне смачно 🔥", "Свайпай далі 💔"];

// Mobile Infinite Scroll logic grid
let mobileRowsAppended = 0;
function appendMobileRows(numRows: number) {
  if (!mobileInfiniteScroll) return;
  
  const cols = 6; // Denser cols per row for mobile
  
  for (let r = 0; r < numRows; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.style.display = 'flex';
    rowDiv.style.justifyContent = 'space-evenly';
    rowDiv.style.width = '100%';
    // stagger logic
    if (mobileRowsAppended % 2 !== 0) {
      rowDiv.style.paddingLeft = '5%';
      rowDiv.style.paddingRight = '5%';
    }
    
    for (let c = 0; c < cols; c++) {
      const img = document.createElement('img');
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      img.src = randomEmoji;
      img.className = 'mobile-soup-item';
      img.style.width = '60px'; // Larger on mobile
      img.style.height = '60px';
      rowDiv.appendChild(img);
    }
    
    // Inject custom messages occasionally
    if (Math.random() > 0.6) {
      const msg = document.createElement('div');
      msg.className = 'hand-written-message';
      msg.innerText = handwrittenMessages[Math.floor(Math.random() * handwrittenMessages.length)];
      mobileInfiniteScroll.appendChild(msg);
    }

    mobileInfiniteScroll.appendChild(rowDiv);
    mobileRowsAppended++;
  }
}

populateDesktopEmojis();
// Recalculate on resize
window.addEventListener('resize', () => {
  if (desktopSoupBg && window.innerWidth >= 768) {
    desktopSoupBg.innerHTML = '';
    populateDesktopEmojis();
  }
});

if (mobileInfiniteScroll) {
  // Load initial batch
  appendMobileRows(8);

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
      appendMobileRows(4);
    }
  }, { passive: true });
}

// Up button Logic
if (upBtn) {
  upBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
