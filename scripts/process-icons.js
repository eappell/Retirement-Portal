const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.resolve(__dirname, '../images');
const OUT_DIR = path.resolve(__dirname, '../apps/portal/public/images');
const SIZE = 56;
const THRESHOLD = 245; // background detection threshold (0-255)

async function processFile(file) {
  const basename = path.basename(file, path.extname(file));
  const infile = path.join(SRC_DIR, file);
  const outPng = path.join(OUT_DIR, `${basename}_trans.png`);
  const outWebp = path.join(OUT_DIR, `${basename}_trans.webp`);

  try {
    // Create mask (non-white -> 255)
    const mask = await sharp(infile)
      .resize(SIZE, SIZE)
      .greyscale()
      .threshold(THRESHOLD)
      .negate()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Base RGB
    const base = await sharp(infile)
      .resize(SIZE, SIZE)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Join mask as alpha channel
    const combined = sharp(base.data, { raw: { width: SIZE, height: SIZE, channels: 3 } })
      .joinChannel(mask.data, { raw: { width: SIZE, height: SIZE, channels: 1 } });

    // Write PNG (preserve alpha)
    await combined.png().toFile(outPng);

    // Also write webp (from PNG to ensure alpha preserved)
    await sharp(outPng).webp({ quality: 90, alphaQuality: 100 }).toFile(outWebp);

    console.log('Processed', file, '->', path.relative(process.cwd(), outPng));
    return { file, outPng, outWebp, success: true };
  } catch (err) {
    console.error('Failed processing', file, err.message || err);
    return { file, error: err.message || String(err), success: false };
  }
}

(async () => {
  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    const files = fs.readdirSync(SRC_DIR).filter(f => /\.(webp|png|jpg|jpeg)$/i.test(f));

    const results = [];
    for (const f of files) {
      // Skip already processed outputs
      if (/_trans\.(png|webp)$/i.test(f)) continue;
      // process
      // eslint-disable-next-line no-await-in-loop
      const r = await processFile(f);
      results.push(r);
    }

    const failed = results.filter(r => !r.success);
    console.log('---');
    console.log('Processed', results.filter(r => r.success).length, 'files, failed', failed.length);
    if (failed.length) console.log('Failed files:', failed.map(f => f.file));

    process.exit(failed.length ? 1 : 0);
  } catch (e) {
    console.error('Fatal error processing icons:', e);
    process.exit(2);
  }
})();