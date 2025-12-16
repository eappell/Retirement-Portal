const JimpModule = require('jimp');
const Jimp = JimpModule.default || JimpModule;

async function process() {
  try {
    const infile = "images/money1.webp";
    const outfile = "images/money1_trans.webp";
    const img = await Jimp.read(infile);

    // Resize to 56x56 to match cartoon-svg
    img.resize(56, 56, Jimp.RESIZE_BICUBIC);

    // Convert near-white pixels to transparent
    const threshold = 240; // pixels with R,G,B >= threshold will be made transparent
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      if (r >= threshold && g >= threshold && b >= threshold) {
        this.bitmap.data[idx + 3] = 0; // set alpha to 0
      }
    });

    // Save as webp with alpha
    await img.quality(90).writeAsync(outfile);
    console.log(`Wrote ${outfile}`);
  } catch (err) {
    console.error("Error processing image:", err);
    process.exitCode = 1;
  }
}

process();
