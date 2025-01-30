import { PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { s3Client, bucket, baseUrl, folder } from '../config/spaces';
import getFileExtensionFromMimeType from './getFileExtensionFromMimeType';

export default async function uploadImageFromUrlToSpaces(imageUrl: string, sku: string): Promise<string | null> {
    try {
        // ตรวจสอบ URL ว่าถูกต้อง
        if (!imageUrl || !imageUrl.startsWith('https://secure.zortout.com/Home/DisplayProductImage')) {
            console.log('Invalid Zortout image URL:', imageUrl);
            return null;
        }

        // ดึงรูปภาพจาก Zortout
        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image from Zortout: ${response.status}`);
        }

        const blob = await response.blob();
        const extension = getFileExtensionFromMimeType(blob.type);
        const fileName = `${sku}${extension}`;
        const fullPath = `${folder}/products/${fileName}`;

        // อัพโหลดไปยัง Digital Ocean Spaces
        const params = {
            Bucket: bucket,
            Key: fullPath,
            Body: Buffer.from(await blob.arrayBuffer()),
            ContentType: blob.type,
            ACL: ObjectCannedACL.public_read
        };

        await s3Client.send(new PutObjectCommand(params));
        return `${baseUrl}/${fullPath}`;

    } catch (error) {
        console.error('Error uploading image to DO Spaces:', error);
        return null;
    }
}