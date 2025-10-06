// Your API keys — cycle through these automatically on errors/quota limits
const apiKeys = [
  "AIzaSyBoL0xrQEnNSAD1eSXLuLIMLrHmAsmw3ZQ",
  "AIzaSyDstZPwfimboVJWSWW-txfej9gPUWR9PiE",
  "AIzaSyBrqkVMBvINFfkEuARDcc6_NkPjHLRbfQQ",
  "AIzaSyDFOYIC3B-6J3uzYfnXeFx1E6dA5-WHk5Q",
  "AIzaSyAGPDruJcUJCNtQy81UqOMxlV0pj53dniI"
];

let currentApiKeyIndex = 0;

function getCurrentApiKey() {
  return apiKeys[currentApiKeyIndex];
}

function cycleApiKey() {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
}

const tabButtons = {
  search: document.getElementById('tab-search'),
  embed: document.getElementById('tab-embed')
};
const tabs = {
  search: document.getElementById('youtube-tab'),
  embed: document.getElementById('embed-tab')
};

const youtubeResultsDiv = document.getElementById('youtube-results');
const channelQueryInput = document.getElementById('channel-query');
const keywordQueryInput = document.getElementById('keyword-query');
const searchBtn = document.getElementById('search-btn');
const manualEmbedInput = document.getElementById('manual-embed');
const embedBtn = document.getElementById('embed-btn');

let selectedChannelId = null;

tabButtons.search.addEventListener('click', () => showTab('search'));
tabButtons.embed.addEventListener('click', () => showTab('embed'));

function showTab(tab) {
  Object.keys(tabs).forEach(t => {
    tabs[t].style.display = (t === tab) ? 'block' : 'none';
    tabButtons[t].classList.toggle('active', t === tab);
  });
}

searchBtn.addEventListener('click', async () => {
  youtubeResultsDiv.innerHTML = '';
  selectedChannelId = null;

  const channelQuery = channelQueryInput.value.trim();
  const keywordQuery = keywordQueryInput.value.trim();

  if (!channelQuery && !keywordQuery) {
    alert('Enter a channel or keyword to search');
    return;
  }

  try {
    if (channelQuery) {
      // Search channels first with API key cycling
      await searchWithApiKeyCycle(() => {
        return fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q=${encodeURIComponent(channelQuery)}&key=${getCurrentApiKey()}`)
          .then(res => res.json());
      }).then(data => {
        if (data.error) throw new Error(data.error.message);

        if (data.items.length === 0) {
          // No channels found fallback to video search
          return searchVideos(keywordQuery || channelQuery);
        } else {
          youtubeResultsDiv.innerHTML = '';
          data.items.forEach(channel => {
            const channelId = channel.snippet.channelId;
            const title = channel.snippet.title;
            const thumb = channel.snippet.thumbnails.default.url;

            const card = document.createElement('div');
            card.style.cursor = 'pointer';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.marginBottom = '10px';
            card.style.border = '1px solid #555';
            card.style.padding = '5px';
            card.style.borderRadius = '5px';

            const img = document.createElement('img');
            img.src = thumb;
            img.alt = title;
            img.style.marginRight = '10px';

            const text = document.createElement('div');
            text.textContent = title;

            card.appendChild(img);
            card.appendChild(text);

            card.onclick = () => {
              selectedChannelId = channelId;
              if (keywordQuery) {
                searchVideos(keywordQuery, selectedChannelId);
              } else {
                const kw = prompt(`Enter keyword to search videos in channel "${title}"`, '');
                if (kw !== null && kw.trim() !== '') {
                  searchVideos(kw.trim(), selectedChannelId);
                }
              }
            };

            youtubeResultsDiv.appendChild(card);
          });
        }
      });
    } else if (keywordQuery) {
      // No channel query, search videos directly
      await searchVideos(keywordQuery);
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
});

async function searchVideos(keyword, channelId = null) {
  youtubeResultsDiv.innerHTML = '';

  const fetchData = () => {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(keyword)}&key=${getCurrentApiKey()}`;
    if (channelId) url += `&channelId=${channelId}`;
    return fetch(url).then(res => res.json());
  };

  try {
    const data = await searchWithApiKeyCycle(fetchData);

    if (data.error) throw new Error(data.error.message);

    if (data.items.length === 0) {
      youtubeResultsDiv.textContent = 'No videos found.';
      return;
    }

    data.items.forEach(video => {
      const videoId = video.id.videoId;
      const title = video.snippet.title;
      const thumb = video.snippet.thumbnails.default.url;

      const card = document.createElement('div');
      card.style.cursor = 'pointer';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.marginBottom = '10px';
      card.style.border = '1px solid #555';
      card.style.padding = '5px';
      card.style.borderRadius = '5px';

      const img = document.createElement('img');
      img.src = thumb;
      img.alt = title;
      img.style.marginRight = '10px';

      const text = document.createElement('div');
      text.textContent = title;

      card.appendChild(img);
      card.appendChild(text);

      card.onclick = () => {
        embedVideoById(videoId);
      };

      youtubeResultsDiv.appendChild(card);
    });
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

embedBtn.addEventListener('click', () => {
  const val = manualEmbedInput.value.trim();
  if (!val) return alert('Enter a YouTube video URL or ID to embed');
  const videoId = extractYouTubeVideoID(val);
  if (!videoId) return alert('Invalid YouTube URL or ID');
  embedVideoById(videoId);
});

function embedVideoById(videoId) {
  const embedDiv = document.getElementById('embed-results');

  const iframe = document.createElement('iframe');
  iframe.width = "100%";
  iframe.height = "315";
  // Added parameters to disable ads, annotations, and related videos
  iframe.src = `https://www.youtube.com/embed/${videoId}?iv_load_policy=3&rel=0&modestbranding=1&showinfo=0&autohide=1&playsinline=1`;
  iframe.title = "Embedded Video";
  iframe.frameBorder = "0";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;

  embedDiv.innerHTML = '';
  embedDiv.appendChild(iframe);

  showTab('embed');
}

function extractYouTubeVideoID(urlOrId) {
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;

  try {
    const url = new URL(urlOrId);
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v');
    } else if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }
  } catch {
  }
  return null;
}

/**
 * Attempts a fetch function, cycling through API keys on failure.
 * @param {Function} fetchFunction - A function returning a Promise resolving to API response JSON.
 * @returns {Promise<Object>} - The successful API response JSON.
 */
async function searchWithApiKeyCycle(fetchFunction) {
  let lastError = null;
  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const data = await fetchFunction();
      if (data.error) {
        lastError = new Error(data.error.message);
        cycleApiKey();
        continue; // try next key
      }
      return data;
    } catch (error) {
      lastError = error;
      cycleApiKey();
    }
  }
  throw lastError || new Error('All API keys failed');
}
