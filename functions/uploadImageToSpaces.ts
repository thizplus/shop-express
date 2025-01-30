import { PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { s3Client, bucket, baseUrl, folder } from '../config/spaces';
import getFileExtensionFromMimeType from './getFileExtensionFromMimeType';

export default async function uploadImageToSpaces( 
  file: Express.Multer.File,
  folderPath: string = 'slips'
): Promise<string | null> {
  try {
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const extension = getFileExtensionFromMimeType(file.mimetype);
    if (!extension) {
      throw new Error('Unsupported image type.');
    }

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    const fullPath = `${folder}/${folderPath}/${fileName}`;

    const params = {
        Bucket: bucket,
        Key: fullPath,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: ObjectCannedACL.public_read
       };

    

    await s3Client.send(new PutObjectCommand(params));
    return `${baseUrl}/${fullPath}`;
  } catch (error) {
    console.error('Error uploading image to DO Spaces:', error);
    return null;
  }
}