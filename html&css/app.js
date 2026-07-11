const supabaseUrl = "https://jelwhsfcjyqlaxomipam.supabase.co";
const supabaseKey = "sb_publishable_cefK5xE4WT4fltCdlsfV_A_BwlEJKbZ";

const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;
let currentRole = "guest";
let currentName = "Гость";

const input = document.getElementById("search");
const links = document.querySelectorAll(".group li");
const groups = document.querySelectorAll(".group");
const sections = document.querySelectorAll(".section");
const empty = document.getElementById("empty");

const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const roleStatus = document.getElementById("roleStatus");

const discussionTopic = document.getElementById("discussionTopic");
const discussionTitle = document.getElementById("discussionTitle");
const discussionText = document.getElementById("discussionText");
const discussionCode = document.getElementById("discussionCode");
const addDiscussionBtn = document.getElementById("addDiscussionBtn");
const discussionList = document.getElementById("discussionList");
const filterTopic = document.getElementById("filterTopic");
const refreshBtn = document.getElementById("refreshBtn");

input.addEventListener("input", function () {
    const value = input.value.toLowerCase();
    let found = 0;

    links.forEach(function (li) {
        const text = li.innerText.toLowerCase();

        if (text.includes(value)) {
            li.classList.remove("hidden");
            found++;
        } else {
            li.classList.add("hidden");
        }
    });

    groups.forEach(function (group) {
        const visibleLinks = group.querySelectorAll("li:not(.hidden)");

        if (visibleLinks.length === 0) {
            group.classList.add("hidden");
        } else {
            group.classList.remove("hidden");
        }
    });

    sections.forEach(function (section) {
        const visibleGroups = section.querySelectorAll(".group:not(.hidden)");

        if (visibleGroups.length === 0) {
            section.classList.add("hidden");
        } else {
            section.classList.remove("hidden");
        }
    });

    if (found === 0) {
        empty.style.display = "block";
    } else {
        empty.style.display = "none";
    }
});

function isModerator() {
    return currentRole === "admin" || currentRole === "moderator";
}

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("ru-RU");
}

function showAuthStatus(text) {
    authStatus.textContent = text;
}

async function loadCurrentUser() {
    const result = await db.auth.getUser();
    currentUser = result.data.user;

    if (!currentUser) {
        currentRole = "guest";
        currentName = "Гость";

        showAuthStatus("Ты не вошел в аккаунт");
        roleStatus.textContent = "";
        logoutBtn.style.display = "none";

        return;
    }

    const { data: profile, error } = await db
        .from("profiles")
        .select("name, role")
        .eq("id", currentUser.id)
        .single();

    if (error) {
        currentRole = "user";
        currentName = currentUser.email;

        showAuthStatus("Ты вошел как: " + currentUser.email);
        roleStatus.textContent = "Роль: user";
        logoutBtn.style.display = "block";

        return;
    }

    currentName = profile.name;
    currentRole = profile.role;

    showAuthStatus("Ты вошел как: " + currentName);
    roleStatus.textContent = "Роль: " + currentRole;
    logoutBtn.style.display = "block";
}

registerBtn.addEventListener("click", async function () {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Заполни имя, email и пароль");
        return;
    }

    const { error } = await db.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                name: name
            }
        }
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Регистрация прошла. Если Supabase просит подтверждение, проверь почту.");

    nameInput.value = "";
    emailInput.value = "";
    passwordInput.value = "";

    await loadCurrentUser();
    await loadQuestions();
});

loginBtn.addEventListener("click", async function () {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email === "" || password === "") {
        alert("Заполни email и пароль");
        return;
    }

    const { error } = await db.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert(error.message);
        return;
    }

    emailInput.value = "";
    passwordInput.value = "";

    await loadCurrentUser();
    await loadQuestions();
});

logoutBtn.addEventListener("click", async function () {
    await db.auth.signOut();

    await loadCurrentUser();
    await loadQuestions();
});

addDiscussionBtn.addEventListener("click", async function () {
    if (!currentUser) {
        alert("Сначала войди в аккаунт");
        return;
    }

    const topic = discussionTopic.value;
    const title = discussionTitle.value.trim();
    const text = discussionText.value.trim();
    const code = discussionCode.value.trim();

    if (title === "" || text === "") {
        alert("Заполни название вопроса и сам вопрос");
        return;
    }

    const { error } = await db
        .from("questions")
        .insert({
            user_id: currentUser.id,
            author_name: currentName,
            topic: topic,
            title: title,
            text: text,
            code: code
        });

    if (error) {
        alert(error.message);
        return;
    }

    discussionTitle.value = "";
    discussionText.value = "";
    discussionCode.value = "";

    await loadQuestions();
});

filterTopic.addEventListener("change", function () {
    loadQuestions();
});

refreshBtn.addEventListener("click", function () {
    loadQuestions();
});

function createText(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
}

async function loadQuestions() {
    discussionList.innerHTML = "";

    let query = db
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false });

    if (filterTopic.value !== "Все") {
        query = query.eq("topic", filterTopic.value);
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
        discussionList.textContent = questionsError.message;
        return;
    }

    if (!questions || questions.length === 0) {
        const emptyBox = document.createElement("div");
        emptyBox.className = "no-discussions";
        emptyBox.textContent = "Пока вопросов нет";
        discussionList.appendChild(emptyBox);
        return;
    }

    const ids = questions.map(function (q) {
        return q.id;
    });

    let answers = [];

    if (ids.length > 0) {
        const { data: answersData, error: answersError } = await db
            .from("answers")
            .select("*")
            .in("question_id", ids)
            .order("created_at", { ascending: true });

        if (!answersError && answersData) {
            answers = answersData;
        }
    }

    questions.forEach(function (question) {
        const questionAnswers = answers.filter(function (answer) {
            return answer.question_id === question.id;
        });

        const card = createQuestionCard(question, questionAnswers);
        discussionList.appendChild(card);
    });
}

function createQuestionCard(question, answers) {
    const card = document.createElement("div");
    card.className = "discussion-card";

    const top = document.createElement("div");
    top.className = "discussion-card-top";

    const topic = createText("span", "discussion-topic", question.topic);
    const author = createText(
        "span",
        "discussion-author",
        question.author_name + " · " + formatDate(question.created_at)
    );

    top.appendChild(topic);
    top.appendChild(author);

    const title = createText("h3", "discussion-card-title", question.title);

    const questionLabel = createText("div", "discussion-label", "Вопрос");
    const text = createText("p", "discussion-text", question.text);

    card.appendChild(top);
    card.appendChild(title);
    card.appendChild(questionLabel);
    card.appendChild(text);

    if (question.code && question.code.trim() !== "") {
        const codeLabel = createText("div", "discussion-label", "Код / идея");
        const code = createText("pre", "discussion-code", question.code);

        card.appendChild(codeLabel);
        card.appendChild(code);
    }

    const answersTitle = createText("div", "discussion-label", "Ответы");
    card.appendChild(answersTitle);

    const answersBox = document.createElement("div");
    answersBox.className = "answers-box";

    if (answers.length === 0) {
        const noAnswers = createText("p", "no-answers", "Пока ответов нет");
        answersBox.appendChild(noAnswers);
    } else {
        answers.forEach(function (answer) {
            const answerItem = document.createElement("div");
            answerItem.className = "answer-item";

            const answerAuthor = createText("b", "answer-author", answer.author_name);
            const answerDate = createText("span", "answer-date", formatDate(answer.created_at));
            const answerText = createText("p", "answer-text", answer.text);

            answerItem.appendChild(answerAuthor);
            answerItem.appendChild(answerDate);
            answerItem.appendChild(answerText);

            if (isModerator()) {
                const deleteAnswer = document.createElement("button");
                deleteAnswer.className = "small-delete-btn";
                deleteAnswer.textContent = "Удалить ответ";

                deleteAnswer.addEventListener("click", async function () {
                    const ok = confirm("Удалить этот ответ?");

                    if (!ok) return;

                    const { error } = await db
                        .from("answers")
                        .delete()
                        .eq("id", answer.id);

                    if (error) {
                        alert(error.message);
                        return;
                    }

                    await loadQuestions();
                });

                answerItem.appendChild(deleteAnswer);
            }

            answersBox.appendChild(answerItem);
        });
    }

    card.appendChild(answersBox);

    if (currentUser) {
        const answerForm = document.createElement("div");
        answerForm.className = "answer-form";

        const answerText = document.createElement("textarea");
        answerText.className = "form-textarea small-textarea";
        answerText.placeholder = "Написать ответ";

        const answerBtn = document.createElement("button");
        answerBtn.className = "main-btn";
        answerBtn.textContent = "Ответить";

        answerBtn.addEventListener("click", async function () {
            const text = answerText.value.trim();

            if (text === "") {
                alert("Напиши ответ");
                return;
            }

            const { error } = await db
                .from("answers")
                .insert({
                    question_id: question.id,
                    user_id: currentUser.id,
                    author_name: currentName,
                    text: text
                });

            if (error) {
                alert(error.message);
                return;
            }

            await loadQuestions();
        });

        answerForm.appendChild(answerText);
        answerForm.appendChild(answerBtn);

        card.appendChild(answerForm);
    } else {
        const warning = document.createElement("div");
        warning.className = "login-warning";
        warning.textContent = "Чтобы ответить, войди в аккаунт";
        card.appendChild(warning);
    }

    if (isModerator()) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-discussion-btn";
        deleteBtn.textContent = "Удалить вопрос";

        deleteBtn.addEventListener("click", async function () {
            const ok = confirm("Удалить этот вопрос и все ответы?");

            if (!ok) return;

            const { error } = await db
                .from("questions")
                .delete()
                .eq("id", question.id);

            if (error) {
                alert(error.message);
                return;
            }

            await loadQuestions();
        });

        card.appendChild(deleteBtn);
    }

    return card;
}

async function startApp() {
    logoutBtn.style.display = "none";

    await loadCurrentUser();
    await loadQuestions();
}

startApp();