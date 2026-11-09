import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// Master SVG: Adaptive Foreground (Emblem on transparent background, strictly within 66.6% safe zone)
const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Terracotta core radial gradient -->
    <radialGradient id="coreDot" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#df623a" />
      <stop offset="65%" stop-color="#b0401c" />
      <stop offset="100%" stop-color="#7d280d" />
    </radialGradient>
    <!-- Warm amber-terracotta glow -->
    <radialGradient id="terracottaGlow" cx="340" cy="512" r="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d45b34" stop-opacity="0.32" />
      <stop offset="50%" stop-color="#b0401c" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#b0401c" stop-opacity="0" />
    </radialGradient>
    <!-- Drop shadow for depth on dark background -->
    <filter id="waveShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <g filter="url(#waveShadow)">
    <!-- Soft warm glow behind the spark -->
    <circle cx="340" cy="512" r="140" fill="url(#terracottaGlow)" />

    <!-- Center origin: Terracotta spark -->
    <circle cx="340" cy="512" r="46" fill="url(#coreDot)" />

    <!-- Harmonic resonance waves in warm paper cream (#F4EFE5) -->
    <!-- Wave 1 (Day 2/3: Immediate crisp recall) -->
    <path d="M 424 404 A 152 152 0 0 1 424 620" 
          fill="none" 
          stroke="#f4efe5" 
          stroke-width="44" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.96" />

    <!-- Wave 2 (Day 7/16: Deepening memory) -->
    <path d="M 524 316 A 292 292 0 0 1 524 708" 
          fill="none" 
          stroke="#f4efe5" 
          stroke-width="40" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.75" />

    <!-- Wave 3 (Day 35: Long-term crystal retention) -->
    <path d="M 624 232 A 432 432 0 0 1 624 792" 
          fill="none" 
          stroke="#f4efe5" 
          stroke-width="36" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.45" />
  </g>
</svg>
`;

// Master SVG: Full Squircle Icon (Dark canvas with subtle warm vignette and squircle boundary)
function getFullIconSvg(shape = "squircle") {
  const clip = shape === "circle" 
    ? `<circle cx="512" cy="512" r="512" fill="url(#canvasGradient)" />`
    : shape === "square"
    ? `<rect width="1024" height="1024" fill="url(#canvasGradient)" />`
    : `<rect width="1024" height="1024" rx="230" fill="url(#canvasGradient)" />
       <rect width="1024" height="1024" rx="230" fill="none" stroke="url(#subtleBorder)" stroke-width="8" />`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="canvasGradient" cx="50%" cy="32%" r="85%">
      <stop offset="0%" stop-color="#2a2723" />
      <stop offset="55%" stop-color="#1b1a17" />
      <stop offset="100%" stop-color="#11100e" />
    </radialGradient>
    <linearGradient id="subtleBorder" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ded4c2" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#ded4c2" stop-opacity="0.05" />
    </linearGradient>
    <radialGradient id="coreDot" cx="35%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#df623a" />
      <stop offset="65%" stop-color="#b0401c" />
      <stop offset="100%" stop-color="#7d280d" />
    </radialGradient>
    <radialGradient id="terracottaGlow" cx="340" cy="512" r="140" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d45b34" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#b0401c" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#b0401c" stop-opacity="0" />
    </radialGradient>
    <filter id="waveShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.55" />
    </filter>
  </defs>

  <!-- Background Base -->
  ${clip}

  <g filter="url(#waveShadow)">
    <circle cx="340" cy="512" r="140" fill="url(#terracottaGlow)" />
    <circle cx="340" cy="512" r="46" fill="url(#coreDot)" />

    <path d="M 424 404 A 152 152 0 0 1 424 620" 
          fill="none" 
          stroke="#f4efe5" 
          stroke-width="44" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.96" />

    <path d="M 524 316 A 292 292 0 0 1 524 708" 
          fill="none" 
          stroke="#f4efe5" 
          stroke-width="40" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.75" />

    <path d="M 624 232 A 432 432 0 0 1 624 792" 
          fill="none" 
          stroke="#f4efe5" 
          stroke-width="36" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.45" />
  </g>
</svg>
`;
}

async function run() {
  const resDir = path.resolve("F:/echo/android/app/src/main/res");
  const publicDir = path.resolve("F:/echo/public");

  const densities = [
    { dir: "mipmap-mdpi", launcher: 48, foreground: 108 },
    { dir: "mipmap-hdpi", launcher: 72, foreground: 162 },
    { dir: "mipmap-xhdpi", launcher: 96, foreground: 216 },
    { dir: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
    { dir: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
  ];

  const squircleSvgBuf = Buffer.from(getFullIconSvg("squircle"));
  const circleSvgBuf = Buffer.from(getFullIconSvg("circle"));
  const foregroundSvgBuf = Buffer.from(foregroundSvg);

  console.log("Generating Android mipmap icons...");
  for (const d of densities) {
    const targetDir = path.join(resDir, d.dir);
    fs.mkdirSync(targetDir, { recursive: true });

    // Adaptive foreground PNG
    await sharp(foregroundSvgBuf)
      .resize(d.foreground, d.foreground)
      .png()
      .toFile(path.join(targetDir, "ic_launcher_foreground.png"));

    // Legacy standard squircle launcher PNG
    await sharp(squircleSvgBuf)
      .resize(d.launcher, d.launcher)
      .png()
      .toFile(path.join(targetDir, "ic_launcher.png"));

    // Legacy round launcher PNG
    await sharp(circleSvgBuf)
      .resize(d.launcher, d.launcher)
      .png()
      .toFile(path.join(targetDir, "ic_launcher_round.png"));

    console.log(`✓ ${d.dir} generated (launcher: ${d.launcher}px, foreground: ${d.foreground}px)`);
  }

  // Update public web assets
  console.log("Generating public web icons...");
  await sharp(squircleSvgBuf).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  await sharp(squircleSvgBuf).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
  await sharp(squircleSvgBuf).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
  
  // Write vector icon.svg
  fs.writeFileSync(path.join(publicDir, "icon.svg"), getFullIconSvg("squircle"));
  console.log("✓ public web icons updated!");
}

run().catch(console.error);
