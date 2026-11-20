
import {
  auth, db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut, doc, getDoc, setDoc,
  serverTimestamp
} from "./firebase.js";

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMessage = document.getElementById("authMessage");
const submitButton = document.getElementById("submitButton");
const toggleMode = document.getElementById("toggleMode");

let isSignup = false;
let submitting = false;

toggleMode.addEventListener("click", () => {
  isSignup = !isSignup;

  document.getElementById("formTitle").textContent =
    isSignup ? "Create Account" : "Welcome Back";

  document.getElementById("formDescription").textContent =
    isSignup ? "Register to start shopping." : "Login to your account to continue.";

  document.getElementById("toggleText").textContent =
    isSignup ? "Already have an account?" : "Don't have an account?";

  toggleMode.textContent = isSignup ? "Login instead" : "Create account";
  submitButton.textContent = isSignup ? "Sign Up" : "Login";
  authMessage.textContent = "";
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (submitting) return;

  submitting = true;
  submitButton.disabled = true;
  authMessage.textContent = "Please wait...";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  try {
    let credential;

    if (isSignup) {
      credential = await createUserWithEmailAndPassword(
        auth, email, password
      );

      await setDoc(doc(db, "users", credential.user.uid), {
        email,
        role: "user",
        status: "active",
        createdAt: serverTimestamp()
      });
    } else {
      credential = await signInWithEmailAndPassword(
        auth, email, password
      );
    }

    const userRef = doc(db, "users", credential.user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      // Normal users may have an account created before this profile.
      await setDoc(userRef, {
        email: credential.user.email,
        role: "user",
        status: "active",
        createdAt: serverTimestamp()
      });

      window.location.href = "index.html";
      return;
    }

    const profile = userSnapshot.data();

    if (profile.status !== "active") {
      await signOut(auth);
      throw new Error("Your account is inactive. Contact the admin.");
    }

    if (profile.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error(error);
    authMessage.textContent =
      error.code === "auth/invalid-credential"
        ? "Email or password is incorrect."
        : error.code === "auth/email-already-in-use"
        ? "This email is already registered."
        : error.message || "Something went wrong.";
  } finally {
    submitting = false;
    submitButton.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) return;

  try {
    const profileSnapshot = await getDoc(doc(db, "users", user.uid));

    if (profileSnapshot.exists()) {
      const profile = profileSnapshot.data();

      if (profile.status !== "active") {
        await signOut(auth);
        return;
      }

      window.location.href =
        profile.role === "admin" ? "admin.html" : "index.html";
    }
  } catch (error) {
    console.error(error);
  }
});
