import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import getFileExtensionFromMimeType from "./getFileExtensionFromMimeType";
import { storage } from "../config/firebase";

export default async function uploadImageToFirebase(
  file: Express.Multer.File,
  folderPath: string = 'products'
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
    console.error('Error uploading image to Firebase:', error);
    return null;
  }
}