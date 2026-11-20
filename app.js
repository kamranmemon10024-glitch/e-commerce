
import {
  db, auth, onAuthStateChanged,
  collection, getDocs
} from "./firebase.js";

const productsContainer = document.getElementById("productsContainer");
const categoryList = document.getElementById("categoryList");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

let products = [];
let selectedCategory = "all";
let searchText = "";

let cart = [];
try {
  cart = JSON.parse(localStorage.getItem("armanCart")) || [];
} catch {
  cart = [];
}

function saveCart() {
  localStorage.setItem("armanCart", JSON.stringify(cart));
  renderCart();
}

function addToCart(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name || "Product",
      price: Number(product.price) || 0,
      imageUrl: product.imageUrl || "",
      quantity: 1
    });
  }

  saveCart();
  document.getElementById("checkoutMessage").textContent =
    "Product added to your cart.";
}

function changeQuantity(id, amount) {
  const item = cart.find(product => product.id === id);
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(product => product.id !== id);
  }

  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter(product => product.id !== id);
  saveCart();
}

function renderCart() {
  const cartItems = document.getElementById("cartItems");
  const cartCount = document.getElementById("cartCount");
  const cartTotal = document.getElementById("cartTotal");

  let total = 0;
  let count = 0;
  cartItems.replaceChildren();

  cart.forEach(item => {
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.price) || 0);

    total += price * quantity;
    count += quantity;

    const row = document.createElement("div");
    row.className = "cart-item";

    const name = document.createElement("span");
    name.className = "cart-item-name";
    name.textContent = item.name;

    const priceText = document.createElement("span");
    priceText.textContent = `Rs. ${price.toLocaleString()}`;

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "Decrease quantity");
    minus.addEventListener("click", () => changeQuantity(item.id, -1));

    const qty = document.createElement("span");
    qty.textContent = quantity;

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Increase quantity");
    plus.addEventListener("click", () => changeQuantity(item.id, 1));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.className = "remove-item";
    remove.addEventListener("click", () => removeFromCart(item.id));

    controls.append(minus, qty, plus, remove);
    row.append(name, priceText, controls);
    cartItems.appendChild(row);
  });

  if (!cart.length) {
    cartItems.textContent = "Your cart is empty.";
  }

  cartCount.textContent = count;
  cartTotal.textContent = total.toLocaleString();
}

function renderCategories() {
  categoryList.replaceChildren();

  const categories = [
    "all",
    ...new Set(products.map(p => p.category).filter(Boolean))
  ];

  categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-chip" +
      (selectedCategory === category ? " active" : "");

    button.textContent = category === "all" ? "All Products" : category;

    button.addEventListener("click", () => {
      selectedCategory = category;
      renderCategories();
      renderProducts();
    });

    categoryList.appendChild(button);
  });
}

function renderProducts() {
  productsContainer.replaceChildren();

  const filtered = products.filter(product => {
    const matchesCategory =
      selectedCategory === "all" ||
      product.category === selectedCategory;

    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchText) ||
      (product.category || "").toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    productsContainer.textContent = "No products found. Please try another search.";
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";

    const image = document.createElement("img");
    image.className = "product-image";
    image.src = product.imageUrl || "https://placehold.co/500x400?text=Product";
    image.alt = product.name || "Product";
    image.loading = "lazy";
    image.onerror = () => {
      image.src = "https://placehold.co/500x400?text=Product";
    };

    const info = document.createElement("div");
    info.className = "product-info";

    const title = document.createElement("h3");
    title.textContent = product.name || "Untitled Product";

    const rating = document.createElement("p");
    rating.className = "product-rating";
    rating.textContent = `★ ${Number(product.rating) || 0} / 5`;

    const description = document.createElement("p");
    description.className = "product-description";
    description.textContent = product.description || "";

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = `Rs. ${(Number(product.price) || 0).toLocaleString()}`;

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "add-cart-btn";
    addButton.textContent = "Add to Cart";
    addButton.addEventListener("click", () => addToCart(product.id));

    const viewLink = document.createElement("a");
    viewLink.className = "view-product-btn";
    viewLink.textContent = "View Product";
    viewLink.href = product.link || "#products";
    viewLink.target = product.link ? "_blank" : "_self";
    viewLink.rel = "noopener noreferrer";

    actions.append(addButton, viewLink);
    info.append(title, rating, description, price, actions);
    card.append(image, info);
    productsContainer.appendChild(card);
  });
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchText = searchInput.value.trim().toLowerCase();
  renderProducts();
});

searchInput.addEventListener("input", () => {
  searchText = searchInput.value.trim().toLowerCase();
  renderProducts();
});

document.getElementById("cartButton").addEventListener("click", () => {
  document.getElementById("cartSection").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("clearCart").addEventListener("click", () => {
  cart = [];
  saveCart();
});

document.getElementById("checkoutButton").addEventListener("click", () => {
  if (!cart.length) {
    document.getElementById("checkoutMessage").textContent =
      "Your cart is empty.";
    return;
  }

  if (!auth.currentUser) {
    document.getElementById("checkoutMessage").textContent =
      "Please log in before checkout.";
    window.location.href = "login.html";
    return;
  }

  document.getElementById("checkoutMessage").textContent =
    "Your cart is ready. Order placement needs an order collection and checkout form.";
});

onAuthStateChanged(auth, user => {
  const accountLink = document.getElementById("accountLink");

  if (user) {
    accountLink.textContent = "My Account";
    accountLink.href = "login.html";
  } else {
    accountLink.textContent = "Login";
    accountLink.href = "login.html";
  }
});

async function loadProducts() {
  try {
    const productSnapshot = await getDocs(collection(db, "products"));

    products = productSnapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));

    renderCategories();
    renderProducts();
  } catch (error) {
    console.error(error);
    productsContainer.textContent =
      "Products could not load. Check Firebase configuration and Firestore rules.";
  }
}

renderCart();
loadProducts();
