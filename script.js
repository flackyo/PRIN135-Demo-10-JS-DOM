// 1. Get element by ID
{
  const element = document.getElementById("todo-list");
  console.log(element);
}

// 2. Get elements by tag name
{
  const element = document.getElementsByTagName("h1");
  console.log(element);
}

// 3. Get elements by class name
{
  const element = document.getElementsByClassName("todo-item");
  console.log(element);
}

// 4. Query selector
{
  const element = document.querySelector(".filter");
  console.log(element);
}

// 5. Update text content
const countEl = document.getElementById("todo-count");
countEl.textContent = "x items left | x hours remaining";