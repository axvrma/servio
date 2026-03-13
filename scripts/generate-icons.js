const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Generate main app icon (512x512)
function generateAppIcon() {
    const size = 512;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background gradient (purple)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7B61FF');
    gradient.addColorStop(1, '#6750A4');
    
    // Rounded rectangle background
    const radius = 96;
    ctx.beginPath();
    ctx.moveTo(32 + radius, 32);
    ctx.lineTo(size - 32 - radius, 32);
    ctx.quadraticCurveTo(size - 32, 32, size - 32, 32 + radius);
    ctx.lineTo(size - 32, size - 32 - radius);
    ctx.quadraticCurveTo(size - 32, size - 32, size - 32 - radius, size - 32);
    ctx.lineTo(32 + radius, size - 32);
    ctx.quadraticCurveTo(32, size - 32, 32, size - 32 - radius);
    ctx.lineTo(32, 32 + radius);
    ctx.quadraticCurveTo(32, 32, 32 + radius, 32);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Terminal window background
    ctx.fillStyle = '#1C1B1F';
    roundRect(ctx, 96, 128, 320, 256, 24);
    ctx.fill();
    
    // Terminal header
    ctx.fillStyle = '#2B2930';
    roundRect(ctx, 96, 128, 320, 48, 24, true, false);
    ctx.fill();
    ctx.fillRect(96, 152, 320, 24);
    
    // Window buttons
    ctx.fillStyle = '#F2B8B5';
    ctx.beginPath();
    ctx.arc(132, 152, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFDEA8';
    ctx.beginPath();
    ctx.arc(164, 152, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#C4EED0';
    ctx.beginPath();
    ctx.arc(196, 152, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Terminal lines
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128, 200, 24, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#CAC4D0';
    roundRect(ctx, 160, 200, 180, 4, 2);
    ctx.fill();
    
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128, 228, 24, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#C4EED0';
    roundRect(ctx, 160, 228, 140, 4, 2);
    ctx.fill();
    
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128, 256, 24, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#CAC4D0';
    roundRect(ctx, 160, 256, 200, 4, 2);
    ctx.fill();
    
    // Cursor line
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128, 292, 24, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#EADDFF';
    roundRect(ctx, 160, 288, 12, 16, 2);
    ctx.fill();
    
    // Play button
    ctx.fillStyle = '#386A20';
    ctx.beginPath();
    ctx.arc(368, 336, 28, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(358, 322);
    ctx.lineTo(382, 336);
    ctx.lineTo(358, 350);
    ctx.closePath();
    ctx.fill();
    
    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), buffer);
    console.log('Generated: icon.png (512x512)');
}

// Generate tray icon for light menu bar (dark icon)
function generateTrayIconLight() {
    const size = 22;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#1D1B20';
    ctx.fillStyle = '#1D1B20';
    ctx.lineWidth = 1.5;
    
    // Terminal outline
    roundRect(ctx, 2, 4, 18, 14, 2);
    ctx.stroke();
    
    // Header line
    ctx.beginPath();
    ctx.moveTo(2, 7);
    ctx.lineTo(20, 7);
    ctx.stroke();
    
    // Dots
    ctx.beginPath();
    ctx.arc(5, 5.5, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7.5, 5.5, 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, 5.5, 0.75, 0, Math.PI * 2);
    ctx.fill();
    
    // Lines
    roundRect(ctx, 4, 10, 2, 1, 0.5);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    roundRect(ctx, 7, 10, 8, 1, 0.5);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    roundRect(ctx, 4, 13, 2, 1, 0.5);
    ctx.fill();
    ctx.globalAlpha = 0.6;
    roundRect(ctx, 7, 13, 6, 1, 0.5);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    roundRect(ctx, 4, 16, 2, 1, 0.5);
    ctx.fill();
    roundRect(ctx, 7, 15.5, 1.5, 2, 0.5);
    ctx.fill();
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, 'tray-iconTemplate.png'), buffer);
    console.log('Generated: tray-iconTemplate.png (22x22)');
    
    // @2x version
    const size2x = 44;
    const canvas2x = createCanvas(size2x, size2x);
    const ctx2x = canvas2x.getContext('2d');
    ctx2x.scale(2, 2);
    
    ctx2x.strokeStyle = '#1D1B20';
    ctx2x.fillStyle = '#1D1B20';
    ctx2x.lineWidth = 1.5;
    
    roundRect(ctx2x, 2, 4, 18, 14, 2);
    ctx2x.stroke();
    
    ctx2x.beginPath();
    ctx2x.moveTo(2, 7);
    ctx2x.lineTo(20, 7);
    ctx2x.stroke();
    
    ctx2x.beginPath();
    ctx2x.arc(5, 5.5, 0.75, 0, Math.PI * 2);
    ctx2x.fill();
    ctx2x.beginPath();
    ctx2x.arc(7.5, 5.5, 0.75, 0, Math.PI * 2);
    ctx2x.fill();
    ctx2x.beginPath();
    ctx2x.arc(10, 5.5, 0.75, 0, Math.PI * 2);
    ctx2x.fill();
    
    roundRect(ctx2x, 4, 10, 2, 1, 0.5);
    ctx2x.fill();
    ctx2x.globalAlpha = 0.6;
    roundRect(ctx2x, 7, 10, 8, 1, 0.5);
    ctx2x.fill();
    
    ctx2x.globalAlpha = 1;
    roundRect(ctx2x, 4, 13, 2, 1, 0.5);
    ctx2x.fill();
    ctx2x.globalAlpha = 0.6;
    roundRect(ctx2x, 7, 13, 6, 1, 0.5);
    ctx2x.fill();
    
    ctx2x.globalAlpha = 1;
    roundRect(ctx2x, 4, 16, 2, 1, 0.5);
    ctx2x.fill();
    roundRect(ctx2x, 7, 15.5, 1.5, 2, 0.5);
    ctx2x.fill();
    
    const buffer2x = canvas2x.toBuffer('image/png');
    fs.writeFileSync(path.join(assetsDir, 'tray-iconTemplate@2x.png'), buffer2x);
    console.log('Generated: tray-iconTemplate@2x.png (44x44)');
}

function roundRect(ctx, x, y, width, height, radius, topOnly = false, bottomOnly = false) {
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

console.log('Generating Servio icons...\n');
generateAppIcon();
generateTrayIconLight();
console.log('\nDone! Icons saved to assets/ folder.');
