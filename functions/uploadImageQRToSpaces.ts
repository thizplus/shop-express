import { PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { s3Client, bucket, baseUrl, folder } from '../config/spaces';
import getFileExtensionFromMimeType from './getFileExtensionFromMimeType';

export default async function uploadImageQRToSpaces(
  file: Express.Multer.File,
  folderPath: string = 'qr-codes'
): Promise<string | null> {
  try {
    console.log('Starting upload process for:', {
      file: file.originalname,
      mimetype: file.mimetype,
      folderPath
    });

    if (!file.mimetype.startsWith('image/')) {
      console.log('Invalid file type:', file.mimetype);
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const extension = getFileExtensionFromMimeType(file.mimetype);
    console.log('File extension:', extension);
    
    if (!extension) {
      console.log('No extension found for mimetype:', file.mimetype);
      throw new Error('Unsupported image type.');
    }

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    const fullPath = `${folder}/${folderPath}/${fileName}`;
    console.log('Generated path:', fullPath);

    const params = {
      Bucket: bucket,
      Key: fullPath,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: ObjectCannedACL.public_read
    };
    
    console.log('Uploading to S3 with params:', {
      Bucket: params.Bucket,
      Key: params.Key,
      ContentType: params.ContentType
    });

    await s3Client.send(new PutObjectCommand(params));
    const finalUrl = `${baseUrl}/${fullPath}`;
    console.log('Upload successful, returning URL:', finalUrl);
    
    return finalUrl;
  } catch (error) {
    console.error('Error in uploadImageQRToSpaces:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    return null;
  }
}