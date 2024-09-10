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
  today.setDate(today.getDate() - 1); // Change this if you want it to get more than just yesterday
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

module.exports = { getSpotifyAccessToken, getNewReleases };
