
import {
  auth, db, onAuthStateChanged, signOut,
  collection, doc, getDoc, getDocs, addDoc,
  setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from "./firebase.js";

const $ = id => document.getElementById(id);

let admin = null;
let editingId = null;
let selectedChatId = null;
let stopChats = null;
let stopMessages = null;
let busy = false;

const productsRef = collection(db, "products");
const categoriesRef = collection(db, "categories");
const usersRef = collection(db, "users");
const chatsRef = collection(db, "chats");

$("productForm").addEventListener("submit", saveProduct);
$("categoryForm").addEventListener("submit", saveCategory);
$("adminLogout").addEventListener("click", () => signOut(auth));
$("cancelEdit").addEventListener("click", resetProductForm);
$("adminChatForm").addEventListener("submit", sendAdminMessage);

onAuthStateChanged(auth, async user => {
  if (stopChats) stopChats();
  if (stopMessages) stopMessages();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));

    if (!snapshot.exists()) {
      await signOut(auth);
      return;
    }

    const profile = snapshot.data();

    if (profile.role !== "admin" || profile.status !== "active") {
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    admin = user;
    $("adminEmail").textContent = user.email || "Admin";
    $("adminStatus").textContent = "Admin access verified.";

    loadProducts();
    loadCategories();
    loadUsers();
    loadChats();
  } catch (error) {
    console.error(error);
    $("adminStatus").textContent = "Could not verify access. Check Firestore rules.";
  }
});

async function saveProduct(event) {
  event.preventDefault();
  if (!admin || busy) return;

  const price = Number($("productPrice").value);
  const rating = Number($("productRating").value);

  if (price < 0 || rating < 0 || rating > 5) {
    alert("Enter a valid price and a rating from 0 to 5.");
    return;
  }

  const product = {
    name: $("productName").value.trim(),
    price,
    rating,
    imageUrl: $("productImage").value.trim(),
    link: $("productLink").value.trim(),
    category: $("productCategory").value.trim(),
    description: $("productDescription").value.trim(),
    updatedAt: serverTimestamp()
  };

  if (!product.name || !product.category || !product.imageUrl) {
    alert("Please fill all required fields.");
    return;
  }

  busy = true;
  $("saveProduct").disabled = true;

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), product);
    } else {
      product.createdAt = serverTimestamp();
      await addDoc(productsRef, product);
    }

    resetProductForm();
    loadProducts();
    alert("Product saved successfully.");
  } catch (error) {
    console.error(error);
    alert("Product save nahi hua. Firestore rules check karo.");
  } finally {
    busy = false;
    $("saveProduct").disabled = false;
  }
}

function resetProductForm() {
  editingId = null;
  $("productForm").reset();
  $("saveProduct").textContent = "Add Product";
  $("cancelEdit").hidden = true;
}

async function loadProducts() {
  try {
    const snapshot = await getDocs(productsRef);
    $("adminProducts").replaceChildren();

    if (snapshot.empty) {
      $("adminProducts").textContent = "No products added yet.";
      return;
    }

    snapshot.forEach(productDoc => {
      const product = productDoc.data();
      const row = document.createElement("div");
      row.className = "admin-row";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = product.name || "Untitled product";

      const info = document.createElement("p");
      info.textContent =
        `Rs. ${Number(product.price) || 0} · ${product.category || "Uncategorized"}`;

      details.append(title, info);

      const actions = document.createElement("div");
      const edit = document.createElement("button");
      edit.textContent = "Edit";
      edit.addEventListener("click", () => {
        editingId = productDoc.id;
        $("productName").value = product.name || "";
        $("productPrice").value = product.price ?? 0;
        $("productRating").value = product.rating ?? 0;
        $("productImage").value = product.imageUrl || "";
        $("productLink").value = product.link || "";
        $("productCategory").value = product.category || "";
        $("productDescription").value = product.description || "";
        $("saveProduct").textContent = "Update Product";
        $("cancelEdit").hidden = false;
        $("productForm").scrollIntoView({ behavior: "smooth" });
      });

      const remove = document.createElement("button");
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm(`Delete ${product.name}?`)) return;

        try {
          await deleteDoc(doc(db, "products", productDoc.id));
          loadProducts();
        } catch (error) {
          console.error(error);
          alert("Product delete nahi hua.");
        }
      });

      actions.append(edit, remove);
      row.append(details, actions);
      $("adminProducts").appendChild(row);
    });
  } catch (error) {
    console.error(error);
    $("adminProducts").textContent = "Could not load products.";
  }
}

async function saveCategory(event) {
  event.preventDefault();
  if (!admin) return;

  const name = $("categoryName").value.trim();
  if (!name) return;

  try {
    await addDoc(categoriesRef, {
      name,
      createdAt: serverTimestamp()
    });

    $("categoryForm").reset();
    loadCategories();
  } catch (error) {
    console.error(error);
    alert("Category save nahi hui.");
  }
}

async function loadCategories() {
  try {
    const snapshot = await getDocs(categoriesRef);
    $("adminCategories").replaceChildren();

    snapshot.forEach(categoryDoc => {
      const category = categoryDoc.data();
      const row = document.createElement("div");
      row.className = "admin-row";

      const name = document.createElement("span");
      name.textContent = category.name || "Unnamed category";

      const remove = document.createElement("button");
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm(`Delete category ${category.name}?`)) return;

        try {
          await deleteDoc(doc(db, "categories", categoryDoc.id));
          loadCategories();
        } catch (error) {
          console.error(error);
          alert("Category delete nahi hui.");
        }
      });

      row.append(name, remove);
      $("adminCategories").appendChild(row);
    });
  } catch (error) {
    console.error(error);
    $("adminCategories").textContent = "Could not load categories.";
  }
}

async function loadUsers() {
  try {
    const snapshot = await getDocs(usersRef);
    $("adminUsers").replaceChildren();

    snapshot.forEach(userDoc => {
      const user = userDoc.data();

      if (user.role === "admin") return;

      const row = document.createElement("div");
      row.className = "admin-row";

      const details = document.createElement("div");
      const email = document.createElement("strong");
      email.textContent = user.email || userDoc.id;

      const status = document.createElement("p");
      status.textContent = `Status: ${user.status || "unknown"}`;

      details.append(email, status);

      const toggle = document.createElement("button");
      toggle.textContent =
        user.status === "active" ? "Set Inactive" : "Set Active";

      toggle.addEventListener("click", async () => {
        try {
          await updateDoc(doc(db, "users", userDoc.id), {
            status: user.status === "active" ? "inactive" : "active"
          });
          loadUsers();
        } catch (error) {
          console.error(error);
          alert("User status update nahi hua.");
        }
      });

      row.append(details, toggle);
      $("adminUsers").appendChild(row);
    });

    if (!$("adminUsers").children.length) {
      $("adminUsers").textContent = "No customer accounts yet.";
    }
  } catch (error) {
    console.error(error);
    $("adminUsers").textContent = "Could not load users.";
  }
}

function loadChats() {
  stopChats = onSnapshot(chatsRef, snapshot => {
    $("chatUsers").replaceChildren();

    if (snapshot.empty) {
      $("chatUsers").textContent = "No customer chats yet.";
      return;
    }

    snapshot.forEach(chatDoc => {
      const chat = chatDoc.data();
      const button = document.createElement("button");
      button.textContent = chat.userEmail || chat.userId || chatDoc.id;
      button.addEventListener("click", () => {
        openChat(chatDoc.id, chat.userEmail || chatDoc.id);
      });
      $("chatUsers").appendChild(button);
    });
  }, error => {
    console.error(error);
    $("chatUsers").textContent = "Could not load chats.";
  });
}

function openChat(userId, email) {
  selectedChatId = userId;

  if (stopMessages) stopMessages();

  $("activeChatTitle").textContent = "Chat with " + email;
  $("adminMessages").replaceChildren();

  const messagesQuery = query(
    collection(db, "chats", userId, "messages"),
    orderBy("createdAt", "asc")
  );

  stopMessages = onSnapshot(messagesQuery, snapshot => {
    $("adminMessages").replaceChildren();

    snapshot.forEach(messageDoc => {
      const message = messageDoc.data();
      const bubble = document.createElement("div");

      bubble.className = "chat-message" +
        (message.senderRole === "admin" ? " mine" : "");

      bubble.textContent =
        `${message.senderRole === "admin" ? "Admin" : "Customer"}: ${message.text || ""}`;

      $("adminMessages").appendChild(bubble);
    });

    $("adminMessages").scrollTop = $("adminMessages").scrollHeight;
  }, error => {
    console.error(error);
    $("adminMessages").textContent = "Could not load messages.";
  });
}

async function sendAdminMessage(event) {
  event.preventDefault();

  const text = $("adminMessageInput").value.trim();
  if (!admin || !selectedChatId || !text) return;

  const button = $("adminChatForm").querySelector("button");
  button.disabled = true;

  try {
    await addDoc(
      collection(db, "chats", selectedChatId, "messages"),
      {
        text,
        senderId: admin.uid,
        senderRole: "admin",
        createdAt: serverTimestamp()
      }
    );

    await updateDoc(doc(db, "chats", selectedChatId), {
      updatedAt: serverTimestamp()
    });

    $("adminMessageInput").value = "";
  } catch (error) {
    console.error(error);
    alert("Reply send nahi hua. Firestore rules check karo.");
  } finally {
    button.disabled = false;
  }
}
