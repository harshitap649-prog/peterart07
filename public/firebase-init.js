// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4WOB2O6tKWlg_JV-d4x_g7e71ZBUAyKM",
  authDomain: "peterart07-e9c21.firebaseapp.com",
  projectId: "peterart07-e9c21",
  storageBucket: "peterart07-e9c21.firebasestorage.app",
  messagingSenderId: "432565217491",
  appId: "1:432565217491:web:6ac9b428d6859e4a8b0c26",
  measurementId: "G-QTDV8ZWM8W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only if in browser environment
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error);
  }
}

// Google Sign In function
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Send user data to server
    const response = await fetch('/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      })
    });
    
    const data = await response.json();
    if (data.success) {
      window.location.href = data.redirect || '/gallery';
    } else {
      alert('Login failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    alert('Google sign-in failed. Please try again.');
  }
}

// Make function available globally
window.signInWithGoogle = signInWithGoogle;