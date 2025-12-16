const sharp = require('sharp');

(async () => {
  try {
    const infile = 'images/money1.webp';
    const outfile = 'images/money1_trans_fixed.png';
    const size = 56;

    // Get RGB base (no alpha)
    const base = await sharp(infile)
      .resize(size, size)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create mask: non-white -> 255 (opaque), white -> 0 (transparent)
    const mask = await sharp(infile)
      .resize(size, size)
      .greyscale()
      .threshold(245)
      .negate()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Combine RGB + mask as alpha channel
    const combined = sharp(base.data, {
      raw: { width: size, height: size, channels: 3 },
    }).joinChannel(mask.data, { raw: { width: size, height: size, channels: 1 } });

    await combined.png().toFile(outfile);
    console.log('Wrote', outfile);

    // Overwrite the public file used by the app
    await sharp(outfile).toFile('apps/portal/public/images/money1_trans.png');
    console.log('Overwrote apps/portal/public/images/money1_trans.png with fixed PNG');
  } catch (err) {
    console.error('Error regenerating fixed PNG:', err);
    process.exitCode = 1;
  }
})();