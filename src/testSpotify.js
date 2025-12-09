const { getNewReleases, generateCSV, removeDuplicates } = require('./spotify');

async function test() {
  const artistIds = [
    '2RlWC7XKizSOsZ8F3uGi59',
    '7GgAwYJnBBFT1WogNWf0oj',
    '6LEG9Ld1aLImEFEVHdWNSB',
    '64DvMieEUCdrYKmEIhDt8G',
    '0B6Y4zlto5DbCaU6eNLvXi',
    '1sSYaQBOI71QZDZ9OWW3hp',
    '2RJawMqX9ESxws2KMtHyP3',
    '2FKWNmZWDBZR4dE5KX4plR',
    '5DHi2MeoRgAwPE0A0qwRMl',
    '5rQoBDKFnd1n6BkdbgVaRL',
    '4Lk9Mory8nRTolPO1TMMcN',
    '1mUl05hT77FrwVFW51wOlr',
    '3TozxPbDes76aGFdfv7PMv',
    '6DARBhWbfcS9E4yJzcliqQ',
    '3uHUKCspaCzAab9A3LlGAr',
    '3KDhyMTFZlrfAO0zK18z4t',
    '6PdJJhJWHFRtoERTQ8JGq1',
    '4tnu4MuDLf51KcBOYvaB5W',
    '182srEbrmnlFxcwkqZ0NR6',
    '5azWSYXVoLKYKHlR5zNJ7i',
    '5r3wPya2PpeTTsXsGhQU8O',
    '78sIlhMniFgXlOrNWnPtIl',
    '4aopF0aU0Nbu5GtSorXV0W',
]

  try {
    const releases = await getNewReleases(artistIds);
    console.log('Fetched releases:', releases); // Debug print
    const uniqueReleases = removeDuplicates(releases)
    console.log('Fetched unique-releases:', uniqueReleases); // Debug print
    await generateCSV(uniqueReleases);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();
