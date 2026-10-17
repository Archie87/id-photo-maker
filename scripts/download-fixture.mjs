import { writeFile } from 'node:fs/promises';
const response = await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg');
if (!response.ok) throw new Error(`Public fixture download failed: ${response.status}`);
await writeFile('tests/fixtures/portrait.jpg', Buffer.from(await response.arrayBuffer()));
console.log('Public MediaPipe portrait fixture saved locally, excluded from Git.');
