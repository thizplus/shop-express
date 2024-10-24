// Import the functions you need from the SDKs you need
import { initializeApp } from "@firebase/app";
import { getStorage } from "@firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC1epotH3MIKkxilU7ilFy-eNUzWv0YOUQ",
    authDomain: "ecmstore-17344.firebaseapp.com",
    projectId: "ecmstore-17344",
    storageBucket: "ecmstore-17344.appspot.com",
    messagingSenderId: "525807253469",
    appId: "1:525807253469:web:9d1afc4b15802c5339a834"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };
