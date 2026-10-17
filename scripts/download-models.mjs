import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile('models/manifest.json', 'utf8'));
for (const model of manifest.models) {
  const path = `models/${model.file}`;
  const hash = (b) => createHash('sha256').update(b).digest('hex');
  try {
    if (hash(await readFile(path)) === model.sha256) {
      console.log(`${model.file}: verified`);
      continue;
    }
  } catch {}
  const response = await fetch(model.url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== model.sha256)
    throw new Error(`Checksum mismatch for ${model.file}; file was not installed.`);
  await writeFile(`${path}.partial`, bytes);
  await rename(`${path}.partial`, path);
  console.log(`${model.file}: downloaded and verified`);
}
