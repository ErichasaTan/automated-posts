const cron = require('node-cron');

// Schedule tasks to run at 12 AM and 12 PM
cron.schedule('0 0,12 * * *', () => {
  console.log('Scheduled task running at 12 AM and 12 PM');
});
