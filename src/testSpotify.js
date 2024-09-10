const { getNewReleases } = require('./spotify');

const artistIds = [
  '2RlWC7XKizSOsZ8F3uGi59',
  '7GgAwYJnBBFT1WogNWf0oj',
  // Add more IDs here
];

getNewReleases(artistIds)
  .then(releases => {
    console.log('New Releases:', releases);
  })
  .catch(error => {
    console.error('Error fetching new releases:', error);
  });
