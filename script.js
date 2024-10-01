const URL = "http://localhost:3000/todos";
const todoInput = document.getElementById("todo-input");
const addTodoButton = document.getElementById("add-todo");
const todoList = document.getElementById("todo-list");

// Function to fetch todos from the server
async function fetchTodos() {
  const response = await axios.get(URL);
  return response.data.sort((a, b) => a.position - b.position); // Sort by position
}

// Function to render todos
async function renderTodos() {
  const todos = await fetchTodos();
  todoList.innerHTML = ""; // Clear the list before rendering
  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.setAttribute("draggable", true);
    li.classList.add("task");
    li.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () =>
      toggleTodoCompletion(todo.id, span)
    );

    const span = document.createElement("span");
    span.textContent = todo.content;
    if (todo.completed) {
      span.classList.add("completed");
    }

    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete");
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    span.addEventListener("dblclick", () => editNote(li, span, todo.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteButton);
    todoList.appendChild(li);

    li.addEventListener("dragstart", () => {
      li.classList.add("dragging");
      todo.classList.remove("task-hover");
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      todo.classList.add("task-hover");

      saveTodosOrder();
    });
    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(todoList, e.clientY);
      const dragging = document.querySelector(".dragging");
      if (afterElement == null) {
        todoList.appendChild(dragging);
      } else {
        todoList.insertBefore(dragging, afterElement);
      }
    });
  });
}

// Function to get the element after the current mouse position
function getDragAfterElement(todoList, y) {
  const draggableElements = [...todoList.querySelectorAll("li:not(.dragging)")];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// Function to add a new todo
async function addTodo() {
  const content = todoInput.value;
  if (!content) return;

  const response = await axios.post(URL, {
    content: content,
    completed: false,
    position: await getTodosCount(),
  });
  todoInput.value = "";
  renderTodos();
}

// Function to delete a todo
async function deleteTodo(id) {
  await axios.delete(`${URL}/${id}`);
  renderTodos();
}

// Function to toggle todo completion status and update class
async function toggleTodoCompletion(id, span) {
  const todo = await axios.get(`${URL}/${id}`);
  const completedStatus = !todo.data.completed; // Toggle the completion status

  await axios.patch(`${URL}/${id}`, {
    completed: completedStatus,
  });

  // Toggle the completed class on the span
  if (completedStatus) {
    span.classList.add("completed");
  } else {
    span.classList.remove("completed");
  }

  renderTodos(); // Refresh the list to show updated status
}

// Get the count of current todos
async function getTodosCount() {
  const response = await axios.get(URL);
  return response.data.length;
}

// Function to save the new order of todos after drag-and-drop
async function saveTodosOrder() {
  const todos = [...todoList.children].map((li, index) => {
    return {
      id: li.dataset.id,
      position: index,
    };
  });

  // Update positions in the server
  for (const todo of todos) {
    await axios.patch(`${URL}/${todo.id}`, {
      position: todo.position,
    });
  }
}

// Switch <p> element on <input> element
function editNote(li, span, id) {
  span.style.display = "none";
  const noteEdit = document.createElement("input");
  li.append(noteEdit);
  noteEdit.value = span.innerText;
  noteEdit.focus();

  // Switch <input> element on <p> element  on keypress 'Enter'
  noteEdit.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      loadEditNote(span, noteEdit, id);
    }
  });
}

// Switch <input> element on <p>
async function loadEditNote(span, newContent, id) {
  span.innerText = newContent.value;
  newContent.style.display = "none";
  span.style.display = "block";
  if (newContent.value.trim() === "") return; // Avoid adding empty notes

  // Update content of edited note on backend
  await axios.put(`${URL}/${id}`, {
    id: id,
    content: span.innerText,
    // status: "pending",
  });
}

// Event listeners
addTodoButton.addEventListener("click", addTodo);

todoInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTodo(); // Call addTodo when Enter is pressed
  }
});

// When the DOM content is loaded, render todos
document.addEventListener("DOMContentLoaded", renderTodos);

// Loader
const loader = document.querySelector(".loader-back");

function hideLoader() {
  loader.style.display = "none";
}

function showLoader() {
  loader.style.display = "block";
}

axios.interceptors.request.use(
  function (config) {
    showLoader();
    return config;
  },
  function (error) {
    hideLoader();
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  function (response) {
    hideLoader();
    return response;
  },
  function (error) {
    hideLoader();
    return Promise.reject(error);
  }
);
