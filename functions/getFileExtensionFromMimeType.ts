
export default function getFileExtensionFromMimeType(mimeType: string): string {
    const extensions: { [key: string]: string } = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
    };
    return extensions[mimeType] || '.jpg';
}