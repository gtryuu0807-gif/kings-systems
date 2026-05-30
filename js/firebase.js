import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import { getFirestore } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { getAuth } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

export const firebaseConfig = {
  apiKey: "AIzaSyA3uUD1fZsWi_DF1lU2tJxZW4zN2CJ4Tpk",
  authDomain: "kings-systems.firebaseapp.com",
  projectId: "kings-systems",
  storageBucket: "kings-systems.firebasestorage.app",
  messagingSenderId: "1008625788493",
  appId: "1:1008625788493:web:ef8adf3a6701d156e79e04",
  measurementId: "G-S0MS0JC43X"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

