import MyEmitter from '../extras/MyEmmitter';
import fs from 'fs';
import path from 'path';

const commonEvents = new MyEmitter<{
    error: Error;
    unknownError: unknown;
  }>();

commonEvents.on('error', (error) => {
  console.log('Received an error event!'.bgRed, error);
  fs.appendFile(path.join(__dirname, '../logs/error_logs.md'), `
\`\`\`
${error.data.stack}
\`\`\`
---
  `, () => {
    console.log('Error writing error logs!!!'.bgRed, {error});
  });
});

commonEvents.on('unknownError', (error) => {
  console.log('Received an error event!'.bgRed, error);
  fs.appendFile(path.join(__dirname, '../logs/error_logs.md'), `
\`\`\`
${error}
\`\`\`
---
  `, (error) => {
    console.log('Error writing error logs!!!'.bgRed, {error});
  });
});


export default commonEvents;
