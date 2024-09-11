const { getArtistImageFromS3 } = require('./spotify');

const testArtistId = '2RlWC7XKizSOsZ8F3uGi59'; // Replace with an actual artist ID

getArtistImageFromS3(testArtistId)
  .then(imageData => {
    if (imageData) {
      console.log('Image fetched successfully!');
      // Process the image data (e.g., save to file or upload somewhere)
    } else {
      console.log('No image found.');
    }
  })
  .catch(error => {
    console.error('Error fetching artist image:', error);
  });
