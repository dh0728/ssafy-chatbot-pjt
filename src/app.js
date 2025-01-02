const chatContainer = document.getElementById("chat-container");
const messageForm = document.getElementById("message-form");
const userInput = document.getElementById("user-input");

const buttonForm = document.querySelectorAll(".button-form");
const buttonForm0 = document.querySelector(".button-form0");

// Create a message bubble
function createMessageBubble(content, sender = "user") {
  const wrapper = document.createElement("div");
  wrapper.classList.add("mb-6", "flex", "items-start", "space-x-3");

  // // Avatar
  // const avatar = document.createElement("div");
  // avatar.classList.add(
  //   "w-10",
  //   "h-10",
  //   "rounded-full",
  //   "flex-shrink-0",
  //   "flex",
  //   "items-center",
  //   "justify-center",
  //   "font-bold",
  //   "text-white"
  // );

  // if (sender === "assistant") {
  //   avatar.classList.add("bg-gradient-to-br", "from-green-400", "to-green-600");
  //   avatar.textContent = "A";
  // } else {
  //   avatar.classList.add("bg-gradient-to-br", "from-blue-500", "to-blue-700");
  //   avatar.textContent = "U";
  // }

  if (sender === "assistant") {
    wrapper.classList.add("assistant-message");
  } else {
    wrapper.classList.add("user-message");
  }

  // Bubble
  const bubble = document.createElement("div");
  bubble.classList.add(
    "max-w-full",
    "md:max-w-2xl",
    "p-3",
    "rounded-lg",
    "whitespace-pre-wrap",
    "leading-relaxed",
    "shadow-sm"
  );

  if (sender === "assistant") {
    bubble.classList.add("bg-amber-900", "text-white", );
  } else {
    bubble.classList.add("bg-amber-300", "text-gray-900", );
  }

  bubble.textContent = content;

  // wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  return wrapper;
}

// Scroll to bottom
function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Simulate assistant response
function getAssistantResponse(userMessage) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("네 말을 따라해볼게 : " + userMessage);
    }, 1000);
  });
}

// Handle form submission
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  // User message
  chatContainer.appendChild(createMessageBubble(message, "user"));
  userInput.value = "";
  scrollToBottom();

  // Assistant response
  const response = await getAssistantResponse(message);
  chatContainer.appendChild(createMessageBubble(response, "assistant"));
  scrollToBottom();
});

buttonForm.forEach((button) => {
  button.addEventListener("click", async (e) => {
    e.preventDefault()
    const message = e.target.textContent.trim()
    if (!message) return

    chatContainer.appendChild(createMessageBubble(message, "user"))
    scrollToBottom()

    const response = await getAssistantResponse(message)
    chatContainer.appendChild(createMessageBubble(response, "assistant"))
    scrollToBottom()
  })
})

buttonForm0.addEventListener("click", async (e) => {
  e.preventDefault()
  
})