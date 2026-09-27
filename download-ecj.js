import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/3.33.0/ecj-3.33.0.jar';
const dest = 'frontend/public/java/ecj.jar';

fs.mkdirSync(path.dirname(dest), { recursive: true });

const file = fs.createWriteStream(dest);

https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed.');
  });
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error('Error downloading:', err.message);
});
