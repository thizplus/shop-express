// functions/uploadImageToSpaces.ts
import { PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { s3Client, bucket, baseUrl, folder } from '../config/spaces';

export default async function uploadImageToSpaces(
  file: Express.Multer.File,
  folderPath: string = 'slips'
): Promise<string | null> {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file data');
    }

    // ใช้นามสกุลจากชื่อไฟล์เดิม หรือกำหนดเป็น .jpg ถ้าไม่มี
    const originalExt = file.originalname.split('.').pop()?.toLowerCase();
    const extension = originalExt && ['.jpg', '.jpeg', '.png', '.gif'].includes(`.${originalExt}`)
      ? `.${originalExt}`
      : '.jpg';

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${random}${extension}`;
    const fullPath = `${folder}/${folderPath}/${fileName}`;

    console.log('Uploading to Spaces:', {
      fileName,
      contentType: file.mimetype,
      size: file.buffer.length
    });

    const params = {
      Bucket: bucket,
      Key: fullPath,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: ObjectCannedACL.public_read
    };

    await s3Client.send(new PutObjectCommand(params));
    const fileUrl = `${baseUrl}/${fullPath}`;
    
    console.log('Upload successful:', fileUrl);
    return fileUrl;

  } catch (error) {
    console.error('Error uploading to Spaces:', error);
    throw error;
  }
}