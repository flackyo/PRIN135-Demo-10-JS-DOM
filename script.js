const STORAGE_KEY = "prin135_todo_app_v1";

const form = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const hoursInput = document.getElementById("hours-input");
const todoList = document.getElementById("todo-list");
const todoCount = document.getElementById("todo-count");
const toggleAllBtn = document.getElementById("toggle-all");
const clearCompletedBtn = document.getElementById("clear-completed");
const filterButtons = document.querySelectorAll(".filter");

let currentFilter = "all";
let todos = loadInitialTodos();

function normalizeHours(value) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function formatHours(hours) {
  return Number.isInteger(hours) ? `${hours}h` : `${hours}h`;
}

// Rules from hint: Easy <= 2h, Hard > 5h, Medium > 2h up to 5h
function getDifficulty(hours) {
  if (hours > 5) {
    return { level: "hard", label: `Hard · ${formatHours(hours)}`, className: "difficulty-hard" };
  }
  if (hours > 2) {
    return { level: "medium", label: `Medium · ${formatHours(hours)}`, className: "difficulty-medium" };
  }
  return { level: "easy", label: `Easy · ${formatHours(hours)}`, className: "difficulty-easy" };
}

function parseInitialDomTodos() {
  const items = [...todoList.querySelectorAll(".todo-item")];
  return items.map((li, index) => {
    const text = li.querySelector(".todo-text")?.textContent.trim() || `Task ${index + 1}`;
    const completed = li.classList.contains("completed");
    const badgeText = li.querySelector(".difficulty")?.textContent || "";
    const match = badgeText.match(/(\d+(?:\.\d+)?)h/i);
    const hours = match ? normalizeHours(match[1]) : 0;

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}`,
      text,
      hours,
      completed
    };
  });
}

function loadInitialTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((item, i) => ({
          id: item.id || `${Date.now()}-${i}`,
          text: String(item.text || "").trim(),
          hours: normalizeHours(item.hours),
          completed: Boolean(item.completed)
        })).filter((item) => item.text.length > 0);
      }
    }
  } catch {
    // Fall back to existing HTML items if storage is unavailable or invalid
  }
  return parseInitialDomTodos();
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Ignore storage quota/privacy mode errors
  }
}

function getFilteredTodos() {
  if (currentFilter === "active") {
    return todos.filter((todo) => !todo.completed);
  }
  if (currentFilter === "completed") {
    return todos.filter((todo) => todo.completed);
  }
  return todos;
}

function startInlineEdit(targetEl, todo, mode) {
  if (targetEl.dataset.editing === "true") return;
  targetEl.dataset.editing = "true";

  const input = document.createElement("input");
  input.type = mode === "hours" ? "number" : "text";
  input.className = mode === "hours" ? "edit-input edit-hours" : "edit-input";

  if (mode === "hours") {
    input.min = "0";
    input.step = "0.25";
    input.value = String(todo.hours);
  } else {
    input.maxLength = 200;
    input.value = todo.text;
  }

  let settled = false;

  const finish = (save) => {
    if (settled) return;
    settled = true;

    if (save) {
      if (mode === "hours") {
        todo.hours = normalizeHours(input.value);
      } else {
        const trimmed = input.value.trim();
        if (trimmed) {
          todo.text = trimmed;
        }
      }
      saveTodos();
    }
    render();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });

  input.addEventListener("blur", () => finish(true));

  targetEl.replaceWith(input);
  input.focus();
  input.select();
}

function createTodoElement(todo) {
  const li = document.createElement("li");
  li.className = `todo-item${todo.completed ? " completed" : ""}`;
  li.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", `Mark "${todo.text}" as completed`);
  checkbox.addEventListener("change", () => {
    todo.completed = checkbox.checked;
    saveTodos();
    render();
  });

  const textSpan = document.createElement("span");
  textSpan.className = "todo-text";
  textSpan.textContent = todo.text;
  textSpan.title = "Double-click to edit task";
  textSpan.addEventListener("dblclick", () => startInlineEdit(textSpan, todo, "text"));

  const diff = getDifficulty(todo.hours);
  const diffSpan = document.createElement("span");
  diffSpan.className = `difficulty ${diff.className}`;
  diffSpan.textContent = diff.label;
  diffSpan.title = "Double-click to edit hours";
  diffSpan.addEventListener("dblclick", () => startInlineEdit(diffSpan, todo, "hours"));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "x";
  deleteBtn.setAttribute("aria-label", `Delete "${todo.text}"`);
  deleteBtn.addEventListener("click", () => {
    todos = todos.filter((item) => item.id !== todo.id);
    saveTodos();
    render();
  });

  li.append(checkbox, textSpan, diffSpan, deleteBtn);
  return li;
}

function updateStatsAndControls() {
  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;
  const totalHours = normalizeHours(todos.reduce((sum, todo) => sum + todo.hours, 0));

  const itemWord = activeCount === 1 ? "item" : "items";
  todoCount.textContent = `${activeCount} ${itemWord} left · ${formatHours(totalHours)} total`;

  toggleAllBtn.textContent =
    todos.length > 0 && activeCount === 0 ? "Mark all active" : "Mark all done";
  toggleAllBtn.disabled = todos.length === 0;

  clearCompletedBtn.disabled = completedCount === 0;
}

function render() {
  todoList.innerHTML = "";
  const visibleTodos = getFilteredTodos();

  if (visibleTodos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      currentFilter === "all"
        ? "No tasks yet. Add one above!"
        : `No ${currentFilter} tasks.`;
    todoList.appendChild(empty);
  } else {
    const fragment = document.createDocumentFragment();
    visibleTodos.forEach((todo) => {
      fragment.appendChild(createTodoElement(todo));
    });
    todoList.appendChild(fragment);
  }

  updateStatsAndControls();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) {
    todoInput.focus();
    return;
  }

  const hours = normalizeHours(hoursInput.value);
  todos.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    text,
    hours,
    completed: false
  });

  saveTodos();
  form.reset();
  todoInput.focus();
  render();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter || "all";
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

toggleAllBtn.addEventListener("click", () => {
  if (todos.length === 0) return;
  const hasActive = todos.some((todo) => !todo.completed);
  todos.forEach((todo) => {
    todo.completed = hasActive;
  });
  saveTodos();
  render();
});

clearCompletedBtn.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  render();
});

render();