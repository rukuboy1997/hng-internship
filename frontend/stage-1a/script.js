const state = {
  title: "Build Advanced Todo Card",
  description: "This is a long description to demonstrate expand and collapse functionality in this advanced task card.",
  priority: "High",
  status: "In Progress",
  dueDate: new Date(Date.now() + 1000 * 60 * 90), // 90 mins
  completed: false,
  expanded: false
};

const el = (id) => document.getElementById(id);

// RENDER FUNCTION
function render() {
  el("title").textContent = state.title;
  el("description").textContent = state.description;
  el("priority").textContent = state.priority;

  el("status-control").value = state.status;
  el("checkbox").checked = state.status === "Done";

  el("due-date").textContent = "Due " + state.dueDate.toLocaleString();

  updateTime();
  updatePriorityUI();
  updateVisualState();
}

// TIME LOGIC
function updateTime() {
  if (state.status === "Done") {
    el("time-remaining").textContent = "Completed";
    return;
  }

  const diff = state.dueDate - new Date();
  const abs = Math.abs(diff);

  let text = "";

  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);

  if (diff < 0) {
    el("overdue").textContent = "Overdue";
    el("overdue").classList.add("overdue");

    if (hours > 0) text = `Overdue by ${hours} hours`;
    else text = `Overdue by ${mins} minutes`;
  } else {
    el("overdue").textContent = "";

    if (days > 0) text = `Due in ${days} days`;
    else if (hours > 0) text = `Due in ${hours} hours`;
    else text = `Due in ${mins} minutes`;
  }

  el("time-remaining").textContent = text;
}

// PRIORITY VISUAL
function updatePriorityUI() {
  const indicator = el("priority-indicator");
  indicator.className = "";

  indicator.classList.add(state.priority.toLowerCase());
}

// VISUAL STATE
function updateVisualState() {
  const title = el("title");

  if (state.status === "Done") {
    title.classList.add("completed");
  } else {
    title.classList.remove("completed");
  }
}

// EVENTS

// Expand
el("expand-btn").onclick = () => {
  state.expanded = !state.expanded;
  el("collapsible").classList.toggle("expanded");
};

// Status control
el("status-control").onchange = (e) => {
  state.status = e.target.value;

  if (state.status === "Done") state.completed = true;

  render();
};

// Checkbox sync
el("checkbox").onchange = () => {
  state.status = el("checkbox").checked ? "Done" : "Pending";
  render();
};

// Edit mode
el("edit-btn").onclick = () => {
  el("view-mode").hidden = true;
  el("edit-form").hidden = false;

  el("edit-title").value = state.title;
  el("edit-desc").value = state.description;
  el("edit-priority").value = state.priority;
  el("edit-date").value = state.dueDate.toISOString().slice(0,16);
};

// Save
el("save-btn").onclick = () => {
  state.title = el("edit-title").value;
  state.description = el("edit-desc").value;
  state.priority = el("edit-priority").value;
  state.dueDate = new Date(el("edit-date").value);

  el("view-mode").hidden = false;
  el("edit-form").hidden = true;

  render();
};

// Cancel
el("cancel-btn").onclick = () => {
  el("view-mode").hidden = false;
  el("edit-form").hidden = true;
};

// Delete
el("delete-btn").onclick = () => alert("Delete clicked");

// AUTO UPDATE
setInterval(updateTime, 60000);

render();
