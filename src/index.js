const { getNewReleases } = require('./spotify');
const { writeToCSV } = require('./csvWriter');

const artistIds = [
  '2RlWC7XKizSOsZ8F3uGi59',
  '7GgAwYJnBBFT1WogNWf0oj',
  // Add more IDs here
];

getNewReleases(artistIds)
  .then(releases => {
    // Group releases by artist name
    const groupedReleases = releases.reduce((acc, release) => {
      if (!acc[release.artistName]) {
        acc[release.artistName] = [];
      }
      acc[release.artistName].push(release);
      return acc;
    }, {});

    // Write CSV for each artist
    Object.keys(groupedReleases).forEach(artistName => {
      writeToCSV(`${artistName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`, groupedReleases[artistName]);
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
