const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

const csvWriter = createCsvWriter({
    path: path.join('.', 'app_log.csv'),
    append: true,
    header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'level', title: 'Level' },
        { id: 'ip', title: 'IP Address' },
        { id: 'message', title: 'Message' }
    ]
});

async function appendLog(level, message, ip = 'Unknown') {
    const logEntry = [{
        timestamp: new Date().toISOString(),
        level,
        ip,
        message
    }];

    try {
        await csvWriter.writeRecords(logEntry);
        console.log('Log appended successfully.');
    } catch (err) {
        console.error('Error writing to CSV', err);
    }
}

module.exports = { appendLog };