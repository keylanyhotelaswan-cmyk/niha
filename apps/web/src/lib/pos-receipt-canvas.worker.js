self.onmessage = (event) => {
    const { bitmap, targetWidth } = event.data;
    const targetHeight = Math.max(1, Math.round((bitmap.height * targetWidth) / bitmap.width));
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        self.postMessage(null);
        return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = bitmap.width > targetWidth;
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();
    canvas.convertToBlob({ type: 'image/png' }).then(async (blob) => {
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const out = {
            base64: btoa(binary),
            widthPx: targetWidth,
            heightPx: targetHeight,
        };
        self.postMessage(out);
    }).catch(() => {
        self.postMessage(null);
    });
};
export {};
