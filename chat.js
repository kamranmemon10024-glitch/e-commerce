
import {
  auth, db, onAuthStateChanged,
  collection, doc, getDoc, setDoc, addDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "./firebase.js";

const messagesBox = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatStatus = document.getElementById("chatStatus");

let currentUser = null;
let stopMessages = null;
let sending = false;

chatForm.hidden = true;

onAuthStateChanged(auth, async user => {
  if (stopMessages) stopMessages();

  currentUser = user;

  if (!user) {
    chatForm.hidden = true;
    messagesBox.replaceChildren();
    chatStatus.textContent = "Please login or create an account to chat.";
    return;
  }

  try {
    const profileSnapshot = await getDoc(doc(db, "users", user.uid));

    if (!profileSnapshot.exists() ||
        profileSnapshot.data().status !== "active") {
      chatStatus.textContent = "Your account is not active.";
      chatForm.hidden = true;
      return;
    }

    const chatRef = doc(db, "chats", user.uid);
    const existingChat = await getDoc(chatRef);

    if (!existingChat.exists()) {
      await setDoc(chatRef, {
        userId: user.uid,
        userEmail: user.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    chatForm.hidden = false;
    chatStatus.textContent = "Connected. You can message the admin.";

    const messagesQuery = query(
      collection(db, "chats", user.uid, "messages"),
      orderBy("createdAt", "asc")
    );

    stopMessages = onSnapshot(messagesQuery, snapshot => {
      messagesBox.replaceChildren();

      snapshot.forEach(messageDoc => {
        const message = messageDoc.data();
        const bubble = document.createElement("div");

        bubble.className = "chat-message" +
          (message.senderId === currentUser.uid ? " mine" : "");

        bubble.textContent =
          `${message.senderRole === "admin" ? "Admin" : "You"}: ${message.text || ""}`;

        messagesBox.appendChild(bubble);
      });

      messagesBox.scrollTop = messagesBox.scrollHeight;
    }, error => {
      console.error(error);
      chatStatus.textContent = "Could not load messages. Check Firestore rules.";
    });
  } catch (error) {
    console.error(error);
    chatStatus.textContent = "Chat could not open. Check Firebase setup.";
  }
});

chatForm.addEventListener("submit", async event => {
  event.preventDefault();

  const text = messageInput.value.trim();

  if (!currentUser || !text || sending) return;

  sending = true;
  const button = chatForm.querySelector("button");
  button.disabled = true;

  try {
    await addDoc(
      collection(db, "chats", currentUser.uid, "messages"),
      {
        text,
        senderId: currentUser.uid,
        senderRole: "user",
        createdAt: serverTimestamp()
      }
    );

    await setDoc(doc(db, "chats", currentUser.uid), {
      updatedAt: serverTimestamp()
    }, { merge: true });

    messageInput.value = "";
  } catch (error) {
    console.error(error);
    alert("Message send nahi hua. Firestore rules check karo.");
  } finally {
    sending = false;
    button.disabled = false;
  }
});
