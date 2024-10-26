// functions/uploadImageQRToFirebase.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import getFileExtensionFromMimeType from "./getFileExtensionFromMimeType";

export default async function uploadImageQRToFirebase(
  file: Express.Multer.File,
  folderPath: string = 'qr-codes'
): Promise<string | null> {
  try {
    // ตรวจสอบว่าไฟล์เป็นรูปภาพจริง
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Invalid file type. Only images are allowed.');
    }

    const extension = getFileExtensionFromMimeType(file.mimetype);
    if (!extension) {
      throw new Error('Unsupported image type.');
    }

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    const fullPath = `${folderPath}/${fileName}`;

    const storageRef = ref(storage, fullPath);

    // กำหนด metadata เพื่อระบุ MIME type ที่ถูกต้อง
    const metadata = {
      contentType: file.mimetype
    };

    await uploadBytes(storageRef, file.buffer, metadata);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading QR code to Firebase:', error);
    return null;
  }
}