// Declare the global window interface to include our callback
declare global {
  interface Window {
    onSpotifyIframeApiReady: (IFrameAPI: any) => void;
  }
}

const PLAYLIST_URI = 'spotify:playlist:0BzGYDgDyAX4yyVTxazV2U';

const vinylContainer = document.getElementById('vinyl-container');
const trackCover = document.getElementById('track-cover') as HTMLImageElement;
const playTrigger = document.getElementById('play-trigger');

let currentPlayingURI = '';
let embedController: any = null;

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

// Listen to anywhere in the player space to toggle play/pause
if (playTrigger) {
  playTrigger.addEventListener('click', () => {
    if (embedController) {
      embedController.togglePlay();
    }
  });
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
        trackCover.classList.remove('hidden');
      }
    }
  } catch (error) {
    console.error('Failed to fetch track metadata:', error);
  }
}
