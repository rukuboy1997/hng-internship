const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 26);

const dueDateEl = document.getElementById("due-date");
const timeRemainingEl = document.getElementById("time-remaining");
const checkbox = document.getElementById("checkbox");
const title = document.getElementById("todo-title");
const status = document.getElementById("status");

// Format due date
dueDateEl.textContent = "Due " + dueDate.toDateString();

function calculateTimeRemaining() {
  const now = new Date();
  const diff = dueDate - now;

  if (diff <= 0) {
    const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
    if (hours === 0) return "Due now!";
    return `Overdue by ${hours} hour${hours > 1 ? "s" : ""}`;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

  if (days > 0) return `Due in ${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `Due in ${hours} hour${hours > 1 ? "s" : ""}`;

  return "Due soon";
}

function updateTime() {
  timeRemainingEl.textContent = calculateTimeRemaining();
}

updateTime();
setInterval(updateTime, 60000);

// Checkbox behavior
checkbox.addEventListener("change", () => {
  if (checkbox.checked) {
    title.classList.add("completed");
    status.textContent = "Done";
  } else {
    title.classList.remove("completed");
    status.textContent = "In Progress";
  }
});

// Buttons
document.getElementById("edit-btn").addEventListener("click", () => {
  alert("edit clicked");
});

document.getElementById("delete-btn").addEventListener("click", () => {
  alert("Delete clicked");
});
