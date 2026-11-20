import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD9A8mbn_jh0kwojXItiF8OG8lBAVwxzwM",
  authDomain: "e-commerce-website-7c259.firebaseapp.com",
  projectId: "e-commerce-website-7c259",
  storageBucket: "e-commerce-website-7c259.firebasestorage.app",
  messagingSenderId: "257778015155",
  appId: "1:257778015155:web:937ece0a72790775fec9c6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth, db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
  collection, doc, addDoc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp
};
