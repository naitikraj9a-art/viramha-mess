
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBHDcdh9HZZzGtHoV89MlAbsWKzPrAk5Qg",
  authDomain: "viramha-mess-food.firebaseapp.com",
  projectId: "viramha-mess-food",
  storageBucket: "viramha-mess-food.firebasestorage.app",
  messagingSenderId: "657865103868",
  appId: "1:657865103868:web:3f8993b058c27dbfedba79",
  measurementId: "G-P6K07L95G8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const reviewsRef = collection(db, "reviews");
const $ = id => document.getElementById(id);

let reviews = [];
let selectedRating = 0;
let unsubscribeReviews = null;

const ratingWords = {
  1: "Not good 😕",
  2: "Could be better 😐",
  3: "It was okay 🙂",
  4: "Really good 😋",
  5: "Amazing! 🤩"
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prettyDate(key) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return "Date unavailable";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function showMessage(message, isError = false) {
  $("formMessage").textContent = message;
  $("formMessage").style.color = isError ? "#ff8b8b" : "";
}

function updateDate() {
  const now = new Date();
  $("todayLabel").textContent = now.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short"
  });
  $("dayName").textContent = now.toLocaleDateString("en-IN", {
    weekday: "long"
  });
  $("fullDate").textContent = now.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric"
  });
  $("footerYear").textContent = `© ${now.getFullYear()} Viramah Mess`;
}

function setRating(value) {
  selectedRating = value;
  document.querySelectorAll(".star-choice").forEach(button => {
    button.classList.toggle("selected", Number(button.dataset.rating) <= value);
  });
  $("ratingHint").textContent = ratingWords[value] || "Tap a star to rate";
}

document.querySelectorAll(".star-choice").forEach(button => {
  button.addEventListener("click", () => {
    setRating(Number(button.dataset.rating));
  });
});

$("reviewText").addEventListener("input", event => {
  $("charCount").textContent = `${event.target.value.length} / 500`;
});

$("reviewFormElement").addEventListener("submit", async event => {
  event.preventDefault();

  const text = $("reviewText").value.trim();

  if (!selectedRating) {
    showMessage("Please choose a star rating first.", true);
    return;
  }
  if (!text) {
    showMessage("Please write a review first.", true);
    return;
  }

  const button = document.querySelector("#reviewFormElement .submit-btn");
  button.disabled = true;

  try {
    const now = new Date();
    await addDoc(reviewsRef, {
      name: $("reviewerName").value.trim() || "Anonymous student",
      rating: selectedRating,
      meal: $("mealType").value,
      text,
      date: localDateKey(now),
      createdAt: now.toISOString(),
      serverCreatedAt: serverTimestamp()
    });

    $("reviewFormElement").reset();
    selectedRating = 0;
    setRating(0);
    $("charCount").textContent = "0 / 500";
    showMessage("Review saved successfully! Thanks ✨");
  } catch (error) {
    console.error("Firebase save error:", error);
    showMessage("Review save nahi hua. Firebase Rules aur internet check karo.", true);
  } finally {
    button.disabled = false;
  }
});

function average(items) {
  if (!items.length) return null;
  return items.reduce((sum, item) => sum + Number(item.rating || 0), 0) / items.length;
}

function roundedStars(value) {
  if (value === null) return "☆☆☆☆☆";
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function renderStats() {
  const avg = average(reviews);
  $("totalReviews").textContent = reviews.length;
  $("summaryCount").textContent = `${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`;
  $("averageRating").textContent = avg === null ? "—" : avg.toFixed(1);
  $("floatingRating").textContent = avg === null ? "—" : avg.toFixed(1);
  $("bigAverage").textContent = avg === null ? "—" : avg.toFixed(1);
  $("scoreStars").textContent = roundedStars(avg);
  $("ratingBarFill").style.width = avg === null ? "0%" : `${avg / 5 * 100}%`;

  if (avg === null) {
    $("ratingSummary").textContent = "Be the first to review today's meal.";
  } else if (avg >= 4.5) {
    $("ratingSummary").textContent = "Students are loving the food. Keep it up!";
  } else if (avg >= 3.5) {
    $("ratingSummary").textContent = "Pretty good! A few improvements can make it even better.";
  } else if (avg >= 2.5) {
    $("ratingSummary").textContent = "There's room to improve. Your feedback matters.";
  } else {
    $("ratingSummary").textContent = "The mess can do better. Share constructive feedback.";
  }
}

function renderDateFilter() {
  const filter = $("dateFilter");
  const current = filter.value || "all";
  const dates = [...new Set(reviews.map(r => r.date).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));

  filter.innerHTML = '<option value="all">All dates</option>' +
    dates.map(date => {
      const suffix = date === localDateKey() ? " · Today" : "";
      return `<option value="${escapeHtml(date)}">${escapeHtml(prettyDate(date))}${suffix}</option>`;
    }).join("");

  filter.value = dates.includes(current) || current === "all" ? current : "all";
}

function renderReviews() {
  const date = $("dateFilter").value;
  const meal = $("mealFilter").value;

  const filtered = reviews.filter(r =>
    (date === "all" || r.date === date) &&
    (meal === "all" || r.meal === meal)
  );

  $("reviewsList").innerHTML = filtered.map(review => {
    const initials = (String(review.name || "Student")
      .trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2) || "S")
      .toUpperCase();

    const parsed = review.createdAt ? new Date(review.createdAt) : null;
    const time = parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
      : "";

    const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));

    return `
      <article class="review-card">
        <div class="review-top">
          <div class="review-author">
            <div class="avatar">${escapeHtml(initials)}</div>
            <div>
              <strong>${escapeHtml(review.name || "Anonymous student")}</strong>
              <div class="review-meta">${escapeHtml(prettyDate(review.date))}${time ? " · " + escapeHtml(time) : ""}</div>
            </div>
          </div>
          <div class="review-stars">${"★".repeat(rating)}<span style="color:#596382">${"☆".repeat(5 - rating)}</span></div>
        </div>
        <span class="meal-tag">${escapeHtml(review.meal || "Meal")}</span>
        <p class="review-body">${escapeHtml(review.text || "")}</p>
        <div class="review-bottom"><span>Viramah student feedback</span></div>
      </article>`;
  }).join("");

  $("emptyState").style.display = filtered.length ? "none" : "block";
  $("reviewsList").style.display = filtered.length ? "grid" : "none";
}

function render() {
  renderStats();
  renderDateFilter();
  renderReviews();
}

$("dateFilter").addEventListener("change", renderReviews);
$("mealFilter").addEventListener("change", renderReviews);

$("exportBtn").addEventListener("click", () => {
  if (!reviews.length) {
    alert("There are no reviews to export yet.");
    return;
  }

  const rows = [
    ["Date", "Time", "Name", "Meal", "Rating", "Review"],
    ...reviews.map(r => [
      r.date || "",
      r.createdAt ? new Date(r.createdAt).toLocaleTimeString("en-IN") : "",
      r.name || "",
      r.meal || "",
      r.rating || "",
      r.text || ""
    ])
  ];

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `viramah-mess-reviews-${localDateKey()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

function startLiveReviews() {
  if (unsubscribeReviews) unsubscribeReviews();

  const q = query(reviewsRef, orderBy("serverCreatedAt", "desc"));
  unsubscribeReviews = onSnapshot(q, snapshot => {
    reviews = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));
    render();
  }, error => {
    console.error("Firebase read error:", error);
    showMessage("Reviews load nahi hue. Firebase Rules check karo.", true);
  });
}

updateDate();
render();
startLiveReviews();

