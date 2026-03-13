const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    const scale = size / 512;
    
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#7B61FF');
    gradient.addColorStop(1, '#6750A4');
    
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
    
    ctx.fillStyle = '#1C1B1F';
    roundRect(ctx, 96 * scale, 128 * scale, 320 * scale, 256 * scale, 24 * scale);
    ctx.fill();
    
    ctx.fillStyle = '#2B2930';
    roundRect(ctx, 96 * scale, 128 * scale, 320 * scale, 48 * scale, 24 * scale, true);
    ctx.fill();
    ctx.fillRect(96 * scale, 152 * scale, 320 * scale, 24 * scale);
    
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
    
    ctx.fillStyle = '#6750A4';
    roundRect(ctx, 128 * scale, 292 * scale, 24 * scale, 4 * scale, 2 * scale);
    ctx.fill();
    ctx.fillStyle = '#EADDFF';
    roundRect(ctx, 160 * scale, 288 * scale, 12 * scale, 16 * scale, 2 * scale);
    ctx.fill();
    
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

// Generate PNG files for ICO (Windows requires specific sizes)
const icoSizes = [16, 32, 48, 64, 128, 256];
const pngBuffers = [];

console.log('Generating Windows ICO components...\n');

icoSizes.forEach(size => {
    const buffer = generateIcon(size);
    pngBuffers.push({ size, buffer });
    console.log(`Generated: ${size}x${size}`);
});

// Create ICO file manually
// ICO format: Header + Directory entries + Image data
function createICO(images) {
    // Calculate total size
    let offset = 6 + (16 * images.length); // Header (6) + Directory (16 per image)
    const imageData = [];
    
    images.forEach(img => {
        imageData.push({ offset, data: img.buffer, size: img.size });
        offset += img.buffer.length;
    });
    
    // Create buffer
    const buffer = Buffer.alloc(offset);
    let pos = 0;
    
    // ICO Header
    buffer.writeUInt16LE(0, pos); pos += 2; // Reserved
    buffer.writeUInt16LE(1, pos); pos += 2; // Type (1 = ICO)
    buffer.writeUInt16LE(images.length, pos); pos += 2; // Image count
    
    // Directory entries
    imageData.forEach(img => {
        buffer.writeUInt8(img.size >= 256 ? 0 : img.size, pos); pos += 1; // Width
        buffer.writeUInt8(img.size >= 256 ? 0 : img.size, pos); pos += 1; // Height
        buffer.writeUInt8(0, pos); pos += 1; // Color palette
        buffer.writeUInt8(0, pos); pos += 1; // Reserved
        buffer.writeUInt16LE(1, pos); pos += 2; // Color planes
        buffer.writeUInt16LE(32, pos); pos += 2; // Bits per pixel
        buffer.writeUInt32LE(img.data.length, pos); pos += 4; // Image size
        buffer.writeUInt32LE(img.offset, pos); pos += 4; // Image offset
    });
    
    // Image data
    imageData.forEach(img => {
        img.data.copy(buffer, pos);
        pos += img.data.length;
    });
    
    return buffer;
}

const icoBuffer = createICO(pngBuffers);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
console.log('\nGenerated: icon.ico');

// Generate DMG background
console.log('\nGenerating DMG background...');
const dmgCanvas = createCanvas(540, 380);
const dmgCtx = dmgCanvas.getContext('2d');

// Gradient background
const bgGradient = dmgCtx.createLinearGradient(0, 0, 540, 380);
bgGradient.addColorStop(0, '#FEF7FF');
bgGradient.addColorStop(1, '#EADDFF');
dmgCtx.fillStyle = bgGradient;
dmgCtx.fillRect(0, 0, 540, 380);

// App name
dmgCtx.fillStyle = '#6750A4';
dmgCtx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
dmgCtx.textAlign = 'center';
dmgCtx.fillText('Servio', 270, 60);

// Subtitle
dmgCtx.fillStyle = '#79747E';
dmgCtx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
dmgCtx.fillText('Drag to Applications to install', 270, 340);

// Arrow
dmgCtx.fillStyle = '#CAC4D0';
dmgCtx.beginPath();
dmgCtx.moveTo(230, 220);
dmgCtx.lineTo(310, 220);
dmgCtx.lineTo(290, 200);
dmgCtx.moveTo(310, 220);
dmgCtx.lineTo(290, 240);
dmgCtx.lineWidth = 3;
dmgCtx.strokeStyle = '#CAC4D0';
dmgCtx.stroke();

const dmgBuffer = dmgCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(assetsDir, 'dmg-background.png'), dmgBuffer);
console.log('Generated: dmg-background.png');

console.log('\nDone!');
