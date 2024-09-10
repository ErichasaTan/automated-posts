const AWS = require('aws-sdk');

// Setup S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Example function to upload file to S3
async function uploadToS3(filePath, bucketName, key) {
  const fs = require('fs');
  const fileStream = fs.createReadStream(filePath);

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream
  };

  return s3.upload(params).promise();
}

module.exports = { uploadToS3 };
