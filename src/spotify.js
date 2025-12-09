const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();
const { S3Client, ListObjectsCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { randomInt } = require('crypto');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createObjectCsvWriter } = require('csv-writer'); // Correct import
const fs = require('fs');
const path = require('path');


// Function to get Spotify access token
async function getSpotifyAccessToken() {
  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      grant_type: 'client_credentials'
    }), {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Spotify access token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Helper function to get the date of yesterday
function getYesterdayDate() {
  const today = new Date();
  today.setDate(today.getDate() - 1); // Adjust to get just yesterday
  return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

// Function to get new releases
async function getNewReleases(artistIds) {
  const accessToken = await getSpotifyAccessToken();
  const newReleases = [];
  const seenReleases = new Set();
  const yesterdayDate = getYesterdayDate();

  for (const artistId of artistIds) {
    try {
      const response = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Fetch artist details
      const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Process each album
      response.data.items.forEach(album => {
        if (album.release_date >= yesterdayDate) {
          const albumKey = `album-${artistResponse.data.name}-${album.name}-${album.release_date}`;
          if (!seenReleases.has(albumKey)) {
            seenReleases.add(albumKey);
            newReleases.push({
              artistId,
              artistName: artistResponse.data.name,
              albumName: album.name,
              releaseDate: album.release_date,
              spotifyUrl: album.external_urls.spotify,
              type: 'Album'
            });

            album.artists.forEach(artist => {
              if (artist.id !== artistId) {
                const artistAlbumKey = `album-${artist.name}-${album.name}-${album.release_date}`;
                if (!seenReleases.has(artistAlbumKey)) {
                  seenReleases.add(artistAlbumKey);
                  newReleases.push({
                    artistId,
                    artistName: artist.name,
                    albumName: album.name,
                    releaseDate: album.release_date,
                    spotifyUrl: album.external_urls.spotify,
                    type: 'Album'
                  });
                }
              }
            });
          }
        }
      });

      for (const album of response.data.items) {
        if (album.release_date >= yesterdayDate) {
          try {
            const tracksResponse = await axios.get(`https://api.spotify.com/v1/albums/${album.id}/tracks`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });

            tracksResponse.data.items.forEach(track => {
              const trackKey = `track-${artistResponse.data.name}-${track.name}-${album.name}-${album.release_date}`;
              if (!seenReleases.has(trackKey)) {
                seenReleases.add(trackKey);
                newReleases.push({
                  artistId,
                  artistName: artistResponse.data.name,
                  songName: track.name,
                  albumName: album.name,
                  releaseDate: album.release_date,
                  spotifyUrl: track.external_urls.spotify,
                  type: 'Track'
                });

                track.artists.forEach(trackArtist => {
                  if (trackArtist.id !== artistId) {
                    const artistTrackKey = `track-${trackArtist.name}-${track.name}-${album.name}-${album.release_date}`;
                    if (!seenReleases.has(artistTrackKey)) {
                      seenReleases.add(artistTrackKey);
                      newReleases.push({
                        artistId,
                        artistName: trackArtist.name,
                        songName: track.name,
                        albumName: album.name,
                        releaseDate: album.release_date,
                        spotifyUrl: track.external_urls.spotify,
                        type: 'Track'
                      });
                    }
                  }
                });
              }
            });
          } catch (error) {
            console.error(`Error fetching tracks for album ID ${album.id}:`, error.response ? error.response.data : error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching releases for artist ID ${artistId}:`, error.response ? error.response.data : error.message);
    }
  }

  return newReleases;
}

// Set up AWS S3 config
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION
});

const BUCKET_NAME = 'eric-music-artist-images';
const BASE_FOLDER = 'artist_images/artist_name/';

function getRandomImage(images) {
  const randomIndex = randomInt(images.length);
  return images[randomIndex];
}

async function downloadImageFromS3(artistId) {
  const artistFolder = `${BASE_FOLDER}${artistId}/`;

  try {
    const listObjectsCommand = new ListObjectsCommand({
      Bucket: BUCKET_NAME,
      Prefix: artistFolder
    });

    const response = await s3.send(listObjectsCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.log(`No images found for artist ID: ${artistId}`);
      return null;
    }

    const randomImage = getRandomImage(response.Contents);
    const imageKey = randomImage.Key;
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: imageKey
    });

    // Get pre-signed URL
    const url = await getSignedUrl(s3, getObjectCommand, { expiresIn: 3600 });

    // Define the local path where the image will be saved
    const localImagePath = path.join(__dirname, '..', 'images', `${artistId}.jpg`);


    // Download the image from S3 using Axios
    const writer = fs.createWriteStream(localImagePath);
    const responseImage = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    responseImage.data.pipe(writer);

    // Return a promise to track when the download finishes
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(localImagePath)); // Return the local path
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading image for artist ID ${artistId}:`, error);
    return null;
  }
}

// Function to remove duplicates based on the 'spotifyUrl'
function removeDuplicates(releases) {
  const uniqueReleases = releases.reduce((acc, current) => {
    const x = acc.find(item => item.spotifyUrl === current.spotifyUrl);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);
  return uniqueReleases;
}


async function callOpenAIAPI(prompt) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: process.env.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating content:', error.response ? error.response.data : error.message);
    return 'Error generating content';
  }
}


async function generateHeadline(release) {
  const prompt = `Create a short, catchy headline for an Instagram post about the release of the ${release.type} "${release.songName || release.albumName}" by ${release.artistName}.`;
  return await callOpenAIAPI(prompt);
}

async function generateCaption(release) {
  const prompt = `Write a short and engaging Instagram caption for the release of ${release.songName || release.albumName} by ${release.artistName}. Keep it under 35 words, ask a question, and include relevant hashtags.`;
  return await callOpenAIAPI(prompt);
}

// Generate CSV file function
async function generateCSV(releases) {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Generate the CSV file name with today's date
  const csvFileName = `releases_${today}.csv`;

  const csvWriter = createObjectCsvWriter({
    path: csvFileName,
    header: [
      { id: 'artistName', title: 'Artist Name' },
      { id: 'type', title: 'Release Type' },  // "album" or "track"
      { id: 'title', title: 'Title' },
      { id: 'pic', title: 'Image Path' },
      { id: 'headline', title: 'Headline' },
      { id: 'caption', title: 'Caption' }
    ]
  });

  const records = [];

  // Object to keep track of album releases
  const processedAlbums = new Set();

  for (const release of releases) {
    const title = release.songName || release.albumName;
    const artistName = release.artistName;
    const releaseType = release.type;  // Either 'album' or 'track'

    // Check if it's a track release, which takes priority
    if (releaseType === 'track') {
      const imagePath = await downloadImageFromS3(release.artistId);
      const headline = await generateHeadline(release);  // OpenAI-generated headline
      const caption = await generateCaption(release);    // OpenAI-generated caption

      records.push({
        artistName,
        type: releaseType,
        title,  // Song title for track
        pic: imagePath || 'No image available', // Store local image path instead of URL
        headline,
        caption
      });
    } else if (releaseType === 'album') {
      // Process album only if no tracks from the album have been processed
      if (!processedAlbums.has(release.albumName)) {
        processedAlbums.add(release.albumName);

        const imagePath = await downloadImageFromS3(release.artistId);
        const headline = await generateHeadline(release);  // OpenAI-generated headline
        const caption = await generateCaption(release);    // OpenAI-generated caption

        records.push({
          artistName,
          type: releaseType,
          title,  // Album title
          pic: imagePath || 'No image available', // Store local image path instead of URL
          headline,
          caption
        });
      }
    }
  }

  await csvWriter.writeRecords(records);
  console.log('CSV file created successfully');
}

module.exports = { getSpotifyAccessToken, getNewReleases, downloadImageFromS3, generateCSV, removeDuplicates };
