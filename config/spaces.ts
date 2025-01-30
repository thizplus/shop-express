// config/spaces.ts
import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;
const region = process.env.DO_SPACES_REGION;
const accessKey = process.env.DO_SPACES_KEY;
const secretKey = process.env.DO_SPACES_SECRET;

console.log('DO Spaces Config:', {
  endpoint: spacesEndpoint,
  region,
  key: accessKey ? '***' : undefined,
  secret: secretKey ? '***' : undefined
});

if (!spacesEndpoint || !region || !accessKey || !secretKey) {
  console.error('Missing env vars:', {
    endpoint: !spacesEndpoint,
    region: !region,
    key: !accessKey,
    secret: !secretKey
  });
  throw new Error('Digital Ocean Spaces credentials are not set');
}

export const s3Client = new S3Client({
  endpoint: `https://${spacesEndpoint}`,
  region,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  }
});

export const bucket = process.env.DO_SPACES_BUCKET;
export const baseUrl = process.env.DO_SPACES_URL;
export const folder = process.env.DO_SPACES_FOLDER;

console.log('DO Spaces URLs:', { bucket, baseUrl, folder });

if (!bucket || !baseUrl || !folder) {
  throw new Error('Digital Ocean Spaces bucket config not set');
}