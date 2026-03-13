const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const assetsDir = path.join(__dirname, '..', 'assets');
const iconsetDir = path.join(assetsDir, 'icon.iconset');

// Ensure iconset directory exists
if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
}

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    const scale = size / 512;
    
    // Background gradient (purple)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7B61FF');
    gradient.addColorStop(1, '#6750A4');
    
    // Rounded rectangle background
    const radius = 96 * scale;
    const margin = 32 * scale;
    ctx.beginPath();
    ctx.moveTo(margin + radius, margin);
    ctx.lineTo(size - margin - radius, margin);
    ctx.quadraticCurveTo(size - margin, margin, size - margin, margin + radius);
    ctx.lineTo(size - margin, size - margin - radius);
    ctx.quadraticCurveTo(size - margin, size - margin, size - margin - radius, size - margin);
    ctx.lineTo(margin + radius, size - margin);
    ctx.quadraticCurveTo(margin, size - margin, margin, size - margin - radius);
    ctx.lineTo(margin, margin + radius);
    ctx.quadraticCurveTo(margin, margin, margin + radius, margin);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Terminal window background
    ctx.fillStyle = '#1C1B1F';
    roundRect(ctx, 96 * scale, 128 * scale, 320 * scale, 256 * scale, 24 * scale);
    ctx.fill();
    
    // Terminal header
    ctx.fillStyle = '#2B2930';
    roundRect(ctx, 96 * scale, 128 * scale, 320 * scale, 48 * scale, 24 * scale, true);
    ctx.fill();
    ctx.fillRect(96 * scale, 152 * scale, 320 * scale, 24 * scale);
    
    // Window buttons
    ctx.fillStyle = '#F2B8B5';
    ctx.beginPath();
    ctx.arc(132 * scale, 152 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFDEA8';
    ctx.beginPath();
    ctx.arc(164 * scale, 152 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#C4EED0';
    ctx.beginPath();
    ctx.arc(196 * scale, 152 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Terminal lines
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128 * scale, 200 * scale, 24 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    ctx.fillStyle = '#CAC4D0';
    roundRect(ctx, 160 * scale, 200 * scale, 180 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128 * scale, 228 * scale, 24 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    ctx.fillStyle = '#C4EED0';
    roundRect(ctx, 160 * scale, 228 * scale, 140 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128 * scale, 256 * scale, 24 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    ctx.fillStyle = '#CAC4D0';
    roundRect(ctx, 160 * scale, 256 * scale, 200 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    
    // Cursor line
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128 * scale, 292 * scale, 24 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    ctx.fillStyle = '#EADDFF';
    roundRect(ctx, 160 * scale, 288 * scale, 12 * scale, 16 * scale, 2 * scale);
    ctx.fill();
    
    // Play button
    ctx.fillStyle = '#386A20';
    ctx.beginPath();
    ctx.arc(368 * scale, 336 * scale, 28 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(358 * scale, 322 * scale);
    ctx.lineTo(382 * scale, 336 * scale);
    ctx.lineTo(358 * scale, 350 * scale);
    ctx.closePath();
    ctx.fill();
    
    return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, width, height, radius, topOnly = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    if (topOnly) {
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
    } else {
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    }
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Generate all required sizes for macOS iconset
const sizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' },
];

console.log('Generating iconset for macOS...\n');

sizes.forEach(({ size, name }) => {
    const buffer = generateIcon(size);
    fs.writeFileSync(path.join(iconsetDir, name), buffer);
    console.log(`Generated: ${name} (${size}x${size})`);
});

// Convert to .icns using iconutil (macOS only)
console.log('\nConverting to .icns...');
try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(assetsDir, 'icon.icns')}"`, { stdio: 'inherit' });
    console.log('Generated: icon.icns');
    
    // Clean up iconset folder
    fs.rmSync(iconsetDir, { recursive: true });
    console.log('Cleaned up iconset folder.');
} catch (error) {
    console.log('Note: iconutil failed. You may need to run this on macOS.');
    console.log('The iconset folder has been created and can be converted manually.');
}

console.log('\nDone!');
