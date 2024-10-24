import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import getFileExtensionFromMimeType from "./getFileExtensionFromMimeType";
import { storage } from "../config/firebase";

export default async function uploadImageToFirebase(imageUrl: string, sku: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();

        const extension = getFileExtensionFromMimeType(blob.type);
        const fileName = `${sku}${extension}`;

        const storageRef = ref(storage, `products/${fileName}`);

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading image to Firebase:', error);
        return null;
    }
}