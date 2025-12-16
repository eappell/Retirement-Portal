const sharp = require('sharp');

(async () => {
  try {
    const infile = 'images/money1.webp';
    const outfile = 'images/money1_trans.webp';
    const size = 56;

    // Read base image pixels (RGBA)
    const base = await sharp(infile)
      .resize(size, size)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create mask as single-channel alpha: non-white -> 255, white -> 0
    const mask = await sharp(infile)
      .resize(size, size)
      .greyscale()
      .threshold(245)
      .negate()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Join mask as alpha channel
    const combined = sharp(base.data, {
      raw: { width: size, height: size, channels: base.info.channels },
    }).joinChannel(mask.data, { raw: { width: size, height: size, channels: mask.info.channels } });

    await combined.webp({ quality: 90 }).toFile(outfile);
    console.log('Wrote', outfile);
  } catch (err) {
    console.error('Error processing image with sharp2:', err);
    process.exitCode = 1;
  }
})();
