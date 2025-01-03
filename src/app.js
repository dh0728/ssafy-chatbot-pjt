import "regenerator-runtime/runtime"; // if needed for async/await in older browsers

const chatContainer = document.getElementById("chatContainer");
const messageForm = document.getElementById("message-form");
const userInput = document.getElementById("user-input");
const apiSelector = document.getElementById("api-selector");
const newChatBtn = document.getElementById("new-chat-btn");

// 각 버튼 지정
const buttonForm = document.querySelectorAll(".button-form");
const buttonForm0 = document.querySelector(".button-form0");
const hideButton = document.querySelector(".hide-button")
hideButton.textContent = "질문예시 숨기기"

const BASE_URL = process.env.API_ENDPOINT;

// 버튼 숨기기/드러내기
const hideState = () => {
  if (hideButton.textContent === "질문예시 숨기기") {
    hideButton.textContent = "질문예시 보기"
  } else {
    hideButton.textContent = "질문예시 숨기기"
  }
}

const hideAll = () => {
  hideState() 
  buttonForm.forEach((button) => {
    button.classList.toggle("hide")
  })
  buttonForm0.classList.toggle("hide")
}

hideButton.addEventListener("click", async (e) => {
  e.preventDefault()
  hideAll()
})

let db;

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("myChatDB", 1);
    request.onupgradeneeded = function (e) {
      db = e.target.result;
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };
    request.onsuccess = function (e) {
      db = e.target.result;
      resolve();
    };
    request.onerror = function (e) {
      reject(e);
    };
  });
}

async function saveMessage(role, content) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chats", "readwrite");
    const store = tx.objectStore("chats");
    store.add({ role, content });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

async function getAllMessages() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chats", "readonly");
    const store = tx.objectStore("chats");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function saveMetadata(key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readwrite");
    const store = tx.objectStore("metadata");
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

async function getMetadata(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("metadata", "readonly");
    const store = tx.objectStore("metadata");
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = (e) => reject(e);
  });
}

async function clearAllData() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["chats", "metadata"], "readwrite");
    tx.objectStore("chats").clear();
    tx.objectStore("metadata").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

function createMessageBubble(content, sender = "user") {
  const wrapper = document.createElement("div");
  wrapper.classList.add("mb-6", "flex", "items-start", "space-x-3");

  const avatar = document.createElement("div");
  avatar.classList.add(
    "w-10",
    "h-10",
    "rounded-full",
    "flex-shrink-0",
    "flex",
    "items-center",
    "justify-center",
    "font-bold",
    "text-white"
  );

  if (sender === "assistant") {
    // avatar.classList.add("bg-gradient-to-br", "from-green-400", "to-green-600");
    // avatar.textContent = "A";
    wrapper.classList.add("assistant-message")
  } else {
    // avatar.classList.add("bg-gradient-to-br", "from-blue-500", "to-blue-700");
    // avatar.textContent = "U";
    wrapper.classList.add("user-message")
  }

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
    bubble.classList.add("bg-amber-900", "text-white",);
  } else {
    bubble.classList.add("bg-amber-300", "text-gray-900", );
  }

  bubble.textContent = content;

  // wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  return wrapper;
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function getAssistantResponse(userMessage) {
  const mode = 'naive';
  console.log(mode)
  let url;
  let payload;

  if (mode === "assistant") {
    const thread_id = await getMetadata("thread_id");
    payload = { message: userMessage };
    if (thread_id) {
      payload.thread_id = thread_id;
    }
    url = `${BASE_URL}/assistant`;
  } else {
    // Naive mode
    const allMsgs = await getAllMessages();
    const messagesForAPI = [
      { role: "system", content: "You are a helpful assistant." },
      ...allMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];
    payload = { messages: messagesForAPI };
    url = `${BASE_URL}/chat`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();

  if (mode === "assistant" && data.thread_id) {
    const existingThreadId = await getMetadata("thread_id");
    if (!existingThreadId) {
      await saveMetadata("thread_id", data.thread_id);
    }
  }

  return data.reply;
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  chatContainer.appendChild(createMessageBubble(message, "user"));
  await saveMessage("user", message);

  userInput.value = "";
  scrollToBottom();

  try {
    const response = await getAssistantResponse(message);
    chatContainer.appendChild(createMessageBubble(response, "assistant"));
    await saveMessage("assistant", response);
    scrollToBottom();
  } catch (error) {
    console.error("Error fetching assistant response:", error);
    const errMsg = "Error fetching response. Check console.";
    chatContainer.appendChild(createMessageBubble(errMsg, "assistant"));
    await saveMessage("assistant", errMsg);
    scrollToBottom();
  }
});

async function loadExistingMessages() {
  const allMsgs = await getAllMessages();
  for (const msg of allMsgs) {
    chatContainer.appendChild(createMessageBubble(msg.content, msg.role));
  }
  scrollToBottom();
}

newChatBtn.addEventListener("click", async () => {
  // Clear DB data and UI
  await clearAllData();
  chatContainer.innerHTML = "";
  // Now user can start a new chat fresh
});

initDB().then(loadExistingMessages);

console.log(BASE_URL);

const personalInfoAgencyBtn = document.getElementById("personal-info-agency");
const infoCollectionRangeBtn = document.getElementById("info-collection-range");
const privacyLawViolationsBtn = document.getElementById("privacy-law-violations");
const askDirectlyBtn = document.getElementById("ask-directly");

function createInputField(label, placeholder) {
  const container = document.createElement("div");
  container.classList.add("mb-4");

  const labelElement = document.createElement("label");
  labelElement.classList.add("block", "font-medium", "text-gray-700");
  labelElement.textContent = label;
  container.appendChild(labelElement);

  const input = document.createElement("input");
  input.classList.add("w-full", "border", "border-gray-300", "p-2", "rounded-md");
  input.placeholder = placeholder;
  container.appendChild(input);

  return container;
}

function showFormAndCollectData(formType) {
  // Clear chat area and show form
  chatContainer.innerHTML = "";

  let formFields = [];

  if (formType === "personalInfoAgency") {
    formFields = [
      createInputField("1. 개인정보를 보관하는 기관의 이름을 입력해주세요.", "예: 회사 이름"),
      createInputField("2. 기관의 주된 업무를 입력해주세요.", "예: 금융 서비스"),
      createInputField("3. 개인정보를 보관하는 이유를 입력해주세요.", "예: 서비스 제공"),
    ];
  } else if (formType === "infoCollectionRange") {
    formFields = [
      createInputField("1. 개인정보를 수집할 상황을 입력해주세요.", "예: 회원가입"),
      createInputField("2. 개인정보를 수집할 대상의 연령대를 입력해주세요.", "예: 14세 이상"),
      createInputField("3. 개인정보를 수집할 항목을 입력해주세요.", "예: 이름, 나이, 주소"),
    ];
  } else if (formType === "privacyLawViolations") {
    formFields = [
      createInputField("1. 위반 항목을 입력해주세요.", "예: 개인정보 유출"),
      createInputField("2. 위반이 발생한 상황을 설명해주세요.", "예: 시스템 해킹"),
      createInputField("3. 처벌을 받고자 하는 대상(기관/개인)을 작성해주세요.", "예: 기업명"),
    ];
  } else if (formType === "askDirectly") {
    formFields = [
      createInputField("1. 질문을 입력해주세요.", "예: 개인정보 보호법의 위반 항목은 무엇인가요?"),
    ];
  }

  // Append form fields to the chat container
  formFields.forEach(field => chatContainer.appendChild(field));
  chatContainer.appendChild(createSubmitButton(formType));
  scrollToBottom();
}

function createSubmitButton(formType) {
  const button = document.createElement("button");
  button.classList.add("mt-4", "bg-amber-600", "text-white", "px-4", "py-2", "rounded-md");
  button.textContent = "Submit";
  button.onclick = async () => {
    const formData = Array.from(chatContainer.querySelectorAll("input")).map(input => input.value.trim());
    if (formData.includes("")) {
      alert("모든 필드를 채워주세요.");
      return;
    }

    let prompt = "";

    if (formType === "personalInfoAgency") {
      prompt = '개인정보 보관 기관 관련 문의: 기관명: ${formData[0]}, 업무: ${formData[1]}, 보관 이유: ${formData[2]}';
    } else if (formType === "infoCollectionRange") {
      prompt = '수집 가능한 개인정보 범위 관련 문의: 상황: ${formData[0]}, 연령대: ${formData[1]}, 항목: ${formData[2]}';
    } else if (formType === "privacyLawViolations") {
      prompt = '개인정보 보호법 위반 시 처벌 문의: 위반 항목: ${formData[0]}, 상황: ${formData[1]}, 대상: ${formData[2]}';
    } else if (formType === "askDirectly") {
      prompt = '사용자 질문: ${formData[0]}';
    }

    chatContainer.appendChild(createMessageBubble(prompt, "user"));
    await saveMessage("user", prompt);

    try {
      const response = await getAssistantResponse(prompt);
      chatContainer.appendChild(createMessageBubble(response, "assistant"));
      await saveMessage("assistant", response);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching assistant response:", error);
      const errMsg = "Error fetching response. Check console.";
      chatContainer.appendChild(createMessageBubble(errMsg, "assistant"));
      await saveMessage("assistant", errMsg);
      scrollToBottom();
    }
  };
  return button;
}

personalInfoAgencyBtn.addEventListener("click", () => {
  hideAll()
  showFormAndCollectData("personalInfoAgency")
})
infoCollectionRangeBtn.addEventListener("click", () => {
  hideAll()
  showFormAndCollectData("infoCollectionRange")
});
privacyLawViolationsBtn.addEventListener("click", () => {
  hideAll()
  showFormAndCollectData("privacyLawViolations")
});
askDirectlyBtn.addEventListener("click", () => {
  hideAll()
  showFormAndCollectData("askDirectly")
});
