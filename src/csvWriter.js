const fs = require('fs');
const fastcsv = require('fast-csv');

function writeToCSV(filename, data) {
  const ws = fs.createWriteStream(filename);
  fastcsv.write(data, { headers: true }).pipe(ws);
}

module.exports = { writeToCSV };
