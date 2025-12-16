const sharp = require('sharp');

(async () => {
  try {
    const infile = 'images/money1.webp';
    const outfile = 'images/money1_trans.webp';
    const size = 56;

    // Create a mask where near-white pixels are treated as transparent
    const maskBuffer = await sharp(infile)
      .resize(size, size)
      .greyscale()
      .threshold(245) // pixels >=245 become white (255)
      .negate() // invert so non-white areas are white (255)
      .toBuffer();

    // Apply mask as alpha channel using dest-in blend
    await sharp(infile)
      .resize(size, size)
      .ensureAlpha()
      .composite([{ input: maskBuffer, blend: 'dest-in' }])
      .webp({ quality: 90 })
      .toFile(outfile);

    console.log('Wrote', outfile);
  } catch (err) {
    console.error('Error processing image with sharp:', err);
    process.exitCode = 1;
  }
})();
