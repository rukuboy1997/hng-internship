const timeEl = document.getElementById("time");

function updateTime() {
  timeEl.textContent = Date.now();
}

// Update every second
updateTime();
setInterval(updateTime, 1000);
