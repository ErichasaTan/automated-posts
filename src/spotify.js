const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

// Function to get Spotify access token
async function getSpotifyAccessToken() {
  const auth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  console.log('Using credentials:', {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: '***REDACTED***' // Don't log sensitive data in production
  });
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
  today.setDate(today.getDate() - 25); // Change this if you want it to get more than just yesterday
  return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
}

// Function to get new releases
async function getNewReleases(artistIds) {
  const accessToken = await getSpotifyAccessToken();
  const newReleases = [];
  const seenReleases = new Set(); // Track seen releases
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
              artistName: artistResponse.data.name,
              albumName: album.name,
              releaseDate: album.release_date,
              spotifyUrl: album.external_urls.spotify,
              type: 'Album'
            });

            // Handle multiple artists per album
            album.artists.forEach(artist => {
              if (artist.id !== artistId) {
                const artistAlbumKey = `album-${artist.name}-${album.name}-${album.release_date}`;
                if (!seenReleases.has(artistAlbumKey)) {
                  seenReleases.add(artistAlbumKey);
                  newReleases.push({
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

      // Fetch all tracks from each album to check their release dates
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
                  artistName: artistResponse.data.name,
                  songName: track.name,
                  albumName: album.name,
                  releaseDate: album.release_date,
                  spotifyUrl: track.external_urls.spotify,
                  type: 'Track'
                });

                // Handle multiple artists per track
                track.artists.forEach(trackArtist => {
                  if (trackArtist.id !== artistId) {
                    const artistTrackKey = `track-${trackArtist.name}-${track.name}-${album.name}-${album.release_date}`;
                    if (!seenReleases.has(artistTrackKey)) {
                      seenReleases.add(artistTrackKey);
                      newReleases.push({
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

const { S3Client, ListObjectsCommand, GetObjectCommand, GetObjectCommandOutput, GetObjectCommandInput } = require('@aws-sdk/client-s3');
const { randomInt } = require('crypto');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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

// Helper function to pick a random image
function getRandomImage(images) {
  const randomIndex = randomInt(images.length);
  return images[randomIndex];
}

// Function to fetch a random artist image from S3 based on artist ID
async function getArtistImageFromS3(artistId) {
  const artistFolder = `${BASE_FOLDER}${artistId}/`;

  try {
    // List objects in the artist's folder
    const listObjectsCommand = new ListObjectsCommand({
      Bucket: BUCKET_NAME,
      Prefix: artistFolder
    });

    const response = await s3.send(listObjectsCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.log(`No images found for artist ID: ${artistId}`);
      return null;
    }

    // Randomly pick one image from the folder
    const randomImage = getRandomImage(response.Contents);
    const imageKey = randomImage.Key;

    // Log the name of the picked image
    console.log(`Random image selected: ${imageKey}`);

    // Generate a pre-signed URL for the randomly selected image
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: imageKey
    });

    const url = await getSignedUrl(s3, getObjectCommand, { expiresIn: 3600 }); // URL valid for 1 hour

    console.log(`Pre-signed URL successfully generated for artist ID: ${artistId}`);
    return url; // Return the pre-signed URL
  } catch (error) {
    console.error(`Error fetching image for artist ID: ${artistId}:`, error);
    return null;
  }
}

module.exports = { getSpotifyAccessToken, getNewReleases, getArtistImageFromS3 };

