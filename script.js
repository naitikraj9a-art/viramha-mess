
const STORAGE_KEY = "viramhaMessReviews_v1";

const $ = (id) => document.getElementById(id);

let selectedRating = 0;
let reviews = loadReviews();

// Load previous reviews from browser storage
function loadReviews() {
  try {
    const data = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

// Save reviews
function saveReviews() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(reviews)
    );
    return true;
  } catch (error) {
    console.error("Review save failed:", error);
    return false;
  }
}
}

// Get date in YYYY-MM-DD format
function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Format saved date
function prettyDate(key) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}

// Automatically update today's day and date
function updateDate() {
  const now = new Date();

  $("todayLabel").textContent =
    now.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });

  $("dayName").textContent =
    now.toLocaleDateString("en-IN", {
      weekday: "long"
    });

  $("fullDate").textContent =
    now.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  $("footerYear").textContent =
    `© ${now.getFullYear()} Viramha Mess`;
}

// Star rating messages
const ratingWords = {
  1: "Not good 😕",
  2: "Could be better 😐",
  3: "It was okay 🙂",
  4: "Really good 😋",
  5: "Amazing! 🤩"
};

// Select star rating
function setRating(value) {
  selectedRating = value;

  document.querySelectorAll(".star-choice").forEach(button => {
    const active = Number(button.dataset.rating) <= value;

    button.classList.toggle("selected", active);
  });

  $("ratingHint").textContent =
    ratingWords[value] || "Tap a star to rate";
}

// Add click events to stars
document.querySelectorAll(".star-choice").forEach(button => {
  button.addEventListener("click", () => {
    setRating(Number(button.dataset.rating));
  });
});

// Character counter
$("reviewText").addEventListener("input", event => {
  $("charCount").textContent =
    `${event.target.value.length} / 500`;
});

// Submit a review
$("reviewFormElement").addEventListener("submit", event => {
  event.preventDefault();

  const reviewText = $("reviewText").value.trim();

  if (!selectedRating) {
    $("formMessage").textContent =
      "Please choose a star rating first.";
    return;
  }

  if (!reviewText) {
    $("formMessage").textContent =
      "Please write a review first.";
    return;
  }

  const now = new Date();

  const item = {
    id: (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,

    name: $("reviewerName").value.trim()
      || "Anonymous student",

    rating: selectedRating,
    meal: $("mealType").value,
    text: reviewText,
    date: localDateKey(now),
    createdAt: now.toISOString()
  };

  // Add new review to the beginning
  reviews.unshift(item);

  saveReviews();

  $("reviewFormElement").reset();

  selectedRating = 0;
  setRating(0);

  $("charCount").textContent = "0 / 500";

  $("formMessage").textContent =
    "Review saved successfully! Thanks ✨";

  render();
});

// Calculate average rating
function average(items) {
  if (!items.length) return null;

  const total = items.reduce(
    (sum, item) => sum + Number(item.rating),
    0
  );

  return total / items.length;
}

// Display stars based on average
function roundedStars(value) {
  if (value === null) return "☆☆☆☆☆";

  const rounded = Math.round(value);

  return "★".repeat(rounded) +
    "☆".repeat(5 - rounded);
}

// Update rating statistics
function renderStats() {
  const avg = average(reviews);

  $("totalReviews").textContent = reviews.length;

  $("summaryCount").textContent =
    `${reviews.length} ${
      reviews.length === 1 ? "review" : "reviews"
    }`;

  $("averageRating").textContent =
    avg === null ? "—" : avg.toFixed(1);

  $("floatingRating").textContent =
    avg === null ? "—" : avg.toFixed(1);

  $("bigAverage").textContent =
    avg === null ? "—" : avg.toFixed(1);

  $("scoreStars").textContent = roundedStars(avg);

  $("ratingBarFill").style.width =
    avg === null ? "0%" : `${avg / 5 * 100}%`;

  if (avg === null) {
    $("ratingSummary").textContent =
      "Be the first to review today's meal.";
  } else if (avg >= 4.5) {
    $("ratingSummary").textContent =
      "Students are loving the food. Keep it up!";
  } else if (avg >= 3.5) {
    $("ratingSummary").textContent =
      "Pretty good! A few improvements can make it even better.";
  } else if (avg >= 2.5) {
    $("ratingSummary").textContent =
      "There's room to improve. Your feedback matters.";
  } else {
    $("ratingSummary").textContent =
      "The mess can do better. Share constructive feedback.";
  }
}

// Update date filter options
function renderDateFilter() {
  const filter = $("dateFilter");
  const current = filter.value || "all";

  const dates = [
    ...new Set(reviews.map(review => review.date))
  ].sort((a, b) => b.localeCompare(a));

  filter.innerHTML =
    '<option value="all">All dates</option>' +
    dates.map(date => {
      const label =
        date === localDateKey() ? " · Today" : "";

      return `<option value="${date}">${
        escapeHtml(prettyDate(date))
      }${label}</option>`;
    }).join("");

  filter.value =
    dates.includes(current) || current === "all"
      ? current
      : "all";
}

// Prevent HTML from being inserted through review text
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// Show reviews and apply filters
function renderReviews() {
  const date = $("dateFilter").value;
  const meal = $("mealFilter").value;

  const filtered = reviews.filter(review =>
    (date === "all" || review.date === date) &&
    (meal === "all" || review.meal === meal)
  );

  $("reviewsList").innerHTML = filtered.map(review => {
    const initials = (
      review.name.trim()
        .split(/\s+/)
        .map(part => part[0])
        .join("")
        .slice(0, 2) || "S"
    ).toUpperCase();

    const time = new Date(review.createdAt)
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      });

    return `
      <article class="review-card">
        <div class="review-top">
          <div class="review-author">
            <div class="avatar">${escapeHtml(initials)}</div>

            <div>
              <strong>${escapeHtml(review.name)}</strong>
              <div class="review-meta">
                ${escapeHtml(prettyDate(review.date))} · ${escapeHtml(time)}
              </div>
            </div>
          </div>

          <div class="review-stars">
            ${"★".repeat(review.rating)}<span style="color:#596382">${
              "☆".repeat(5 - review.rating)
            }</span>
          </div>
        </div>

        <span class="meal-tag">${escapeHtml(review.meal)}</span>

        <p class="review-body">${escapeHtml(review.text)}</p>

        <div class="review-bottom">
          <span>Viramha student feedback</span>
          <button
            class="delete-btn"
            type="button"
            data-delete="${escapeHtml(review.id)}"
          >Delete ×</button>
        </div>
      </article>
    `;
  }).join("");

  $("emptyState").style.display =
    filtered.length ? "none" : "block";

  $("reviewsList").style.display =
    filtered.length ? "grid" : "none";

  // Delete a saved review
  document.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      const target = reviews.find(
        review => review.id === button.dataset.delete
      );

      if (!target) return;

      if (confirm("Delete this saved review?")) {
        reviews = reviews.filter(
          review => review.id !== target.id
        );

        saveReviews();
        render();
      }
    });
  });
}

// Refresh all website data
function render() {
  renderStats();
  renderDateFilter();
  renderReviews();
}

// Filter reviews
$("dateFilter").addEventListener("change", renderReviews);
$("mealFilter").addEventListener("change", renderReviews);

// Export all records to a CSV file
$("exportBtn").addEventListener("click", () => {
  if (!reviews.length) {
    alert("There are no reviews to export yet.");
    return;
  }

  const headers = [
    "Date", "Time", "Name", "Meal", "Rating", "Review"
  ];

  const rows = reviews.map(review => [
    review.date,
    new Date(review.createdAt).toLocaleTimeString("en-IN"),
    review.name,
    review.meal,
    review.rating,
    review.text
  ]);

  const csv = [headers, ...rows]
    .map(row =>
      row.map(cell =>
        `"${String(cell).replace(/"/g, '""')}"`
      ).join(",")
    )
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `viramha-mess-reviews-${localDateKey()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

// Start the website
updateDate();
render();
