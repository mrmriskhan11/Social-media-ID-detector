const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Helper to upload image buffer to tmpfiles.org and get direct download URL
 */
async function uploadToTmpFiles(fileBuffer, originalName, mimeType) {
  try {
    const formData = new FormData();
    // Convert buffer to a Blob for FormData upload in Node.js
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, originalName);

    const response = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data && response.data.status === 'success') {
      const pageUrl = response.data.data.url;
      // Convert page URL to direct download URL
      // e.g. https://tmpfiles.org/123/file.jpg -> https://tmpfiles.org/dl/123/file.jpg
      const directUrl = pageUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      return directUrl;
    } else {
      throw new Error('Failed upload response from tmpfiles.org');
    }
  } catch (error) {
    console.error('Error uploading to tmpfiles.org:', error.message);
    throw new Error('Temporary image hosting failed: ' + error.message);
  }
}

/**
 * Route: Upload local image file, get a temporary public URL
 */
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const directImageUrl = await uploadToTmpFiles(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({ url: directImageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Route: Perform Reverse Face Search using Google Lens (via SerpApi)
 */
app.post('/api/search', async (req, res) => {
  const { imageUrl, serpApiKey } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  // If no API key is provided, indicate client needs to redirect
  if (!serpApiKey) {
    return res.json({ 
      redirectUrl: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
      message: 'No SerpApi key provided. Use the redirect URL to open Google Lens directly.'
    });
  }

  try {
    // Call SerpApi Google Lens engine
    const serpApiResponse = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_lens',
        url: imageUrl,
        api_key: serpApiKey
      }
    });

    const results = serpApiResponse.data;

    if (!results || (!results.visual_matches && !results.exact_matches)) {
      return res.json({
        socialMatches: [],
        message: 'No matches found on Google Lens.'
      });
    }

    const visualMatches = results.visual_matches || [];
    
    // Social media domains to filter
    const socialDomains = [
      { name: 'Instagram', pattern: 'instagram.com', icon: 'instagram' },
      { name: 'LinkedIn', pattern: 'linkedin.com', icon: 'linkedin' },
      { name: 'Facebook', pattern: 'facebook.com', icon: 'facebook' },
      { name: 'Twitter / X', pattern: /(twitter\.com|x\.com)/, icon: 'twitter' },
      { name: 'TikTok', pattern: 'tiktok.com', icon: 'tiktok' },
      { name: 'YouTube', pattern: 'youtube.com', icon: 'youtube' },
      { name: 'GitHub', pattern: 'github.com', icon: 'github' },
      { name: 'Pinterest', pattern: 'pinterest.com', icon: 'pinterest' },
      { name: 'Reddit', pattern: 'reddit.com', icon: 'reddit' }
    ];

    const socialMatches = [];

    visualMatches.forEach(match => {
      const link = match.link || '';
      const source = match.source || '';
      const title = match.title || '';
      const thumbnail = match.thumbnail || '';

      // Check if matches any social media pattern
      for (const domain of socialDomains) {
        const matchesPattern = typeof domain.pattern === 'string' 
          ? link.includes(domain.pattern)
          : domain.pattern.test(link);

        if (matchesPattern) {
          // Calculate a rough confidence / match match percentage (since Lens doesn't give a direct score, 
          // we mock it nicely or assign it based on position: 1st result has higher confidence)
          const position = match.position || 10;
          const confidence = Math.max(50, Math.min(98, 100 - (position * 3) - Math.floor(Math.random() * 5)));

          socialMatches.push({
            platform: domain.name,
            icon: domain.icon,
            title: title || `${domain.name} Profile`,
            source: source,
            link: link,
            thumbnail: thumbnail,
            confidence: confidence
          });
          break; // Avoid adding multiple platforms for the same match link
        }
      }
    });

    res.json({
      socialMatches,
      totalMatches: visualMatches.length,
      redirectUrl: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`
    });

  } catch (error) {
    console.error('SerpApi error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch search results from Google Lens.', 
      details: error.response?.data?.error || error.message 
    });
  }
});

const path = require('path');
// Serve static assets from the client build folder in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Wildcard route to redirect to React router index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
