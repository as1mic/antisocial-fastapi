# AntiSocial Defense Notes

## app/core/database.py

### `def get_db():`

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Что говорить:

- Эта функция нужна, чтобы дать роуту сессию базы данных на время одного запроса.
- `db = SessionLocal()` создает новую сессию базы данных.
- `try:` нужен, чтобы потом гарантированно закрыть сессию.
- `yield db` отдает сессию в роут FastAPI.
- `finally:` выполнится в любом случае.
- `db.close()` закрывает сессию после завершения запроса.

Важно:

- `yield` здесь не просто вместо `return`.
- FastAPI сначала берет `db`, использует ее в роуте, а потом возвращается в функцию и выполняет `db.close()`.

### `SessionLocal`

Что говорить:

- `SessionLocal` это фабрика сессий, созданная через `sessionmaker`.
- `SessionLocal()` создает конкретную сессию базы данных.
- `SessionLocal` это не сама сессия, а способ ее создать.

### `engine = create_engine(...)`

```python
engine = create_engine(
    settings.database_url,
    echo=True,
    pool_pre_ping=True,
)
```

Что говорить:

- `engine` это главный объект SQLAlchemy для подключения к базе данных.
- `create_engine(...)` создает объект подключения.
- `settings.database_url` это строка подключения к базе, обычно из `.env`.
- `echo=True` выводит SQL-запросы в консоль.
- `pool_pre_ping=True` проверяет, живо ли соединение, перед использованием.

### Разница между `engine` и `SessionLocal`

Что говорить:

- `engine` это объект подключения к базе данных.
- `SessionLocal` это фабрика, которая создает сессии для работы с этой базой.
- `engine` знает, как подключаться.
- `SessionLocal` создает `db`, через который уже идут запросы.

## app/core/config.py

### `class Settings(BaseSettings):`

```python
class Settings(BaseSettings):
    project_name: str = "AntiSocial API"
    project_version: str = "0.1.0"
    project_description: str = "API for the AntiSocial study project"
```

Что говорить:

- Это класс настроек проекта.
- Он наследуется от `BaseSettings` из Pydantic.
- `project_name`, `project_version`, `project_description` это строковые поля настроек.
- Эти данные используются, например, в FastAPI docs.

Что такое `BaseSettings`:

- Это специальный класс Pydantic для настроек.
- Он умеет читать значения из кода, переменных окружения и `.env`.

Зачем типы `str`:

- Они показывают, что значения должны быть строками.
- Pydantic может валидировать типы.

Зачем класс настроек:

- Все настройки собраны в одном месте.
- Их проще менять и читать.

### `model_config = SettingsConfigDict(...)`

```python
model_config = SettingsConfigDict(
    env_file=".env",
    env_file_encoding="utf-8",
)
```

Что говорить:

- Этот блок говорит, откуда брать настройки.
- `env_file=".env"` означает, что значения можно читать из файла `.env`.
- `env_file_encoding="utf-8"` означает, что `.env` читается в кодировке UTF-8.

Про `.env`:

- Он нужен, чтобы хранить настройки отдельно от кода.
- Например `database_url`, `secret_key`.
- Сам по себе `.env` не защищает данные, просто выносит их из кода.

### `settings = Settings()`

Что говорить:

- Эта строка создает объект `settings` на основе класса `Settings`.
- После этого можно писать `settings.project_name`, `settings.database_url` и так далее.

## app/core/dependencies.py

### `bearer_scheme = HTTPBearer()`

Что говорить:

- `HTTPBearer` это механизм FastAPI Security для Bearer Token.
- Он нужен, чтобы доставать токен из заголовка `Authorization`.
- Заголовок выглядит так: `Authorization: Bearer TOKEN`.

### `credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)`

Что говорить:

- Эта строка говорит FastAPI: перед вызовом функции нужно получить Bearer-токен из запроса.
- Полученные данные авторизации кладутся в `credentials`.
- Потом сам токен берется через `credentials.credentials`.

### `payload = decode_access_token(credentials.credentials)`

```python
payload = decode_access_token(credentials.credentials)
if payload is None:
    raise credentials_exception
```

Что говорить:

- `credentials.credentials` это сама строка токена.
- `decode_access_token(...)` пытается декодировать JWT токен.
- Результат сохраняется в `payload`.
- Если `payload is None`, значит токен плохой или не декодировался.
- Тогда выбрасывается ошибка авторизации `401`.

### Что такое `payload`

Что говорить:

- `payload` это данные, которые лежали внутри токена после декодирования.
- Обычно это словарь.
- В этом проекте главное поле внутри `payload` это `sub`.

### `user_email = payload.get("sub")`

```python
user_email = payload.get("sub")
if not user_email:
    raise credentials_exception
```

Что говорить:

- Эта строка достает поле `sub` из токена.
- В нашем проекте в `sub` хранится email пользователя.
- Если `sub` нет, мы не можем понять, кто это за пользователь.
- Поэтому возвращается ошибка авторизации.

Важно:

- `sub` это стандартное поле JWT subject.

## app/core/security.py

### `pwd_context = CryptContext(...)`

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

Что говорить:

- `CryptContext` это объект из `passlib` для работы с паролями.
- `schemes=["bcrypt"]` означает, что пароли хешируются через `bcrypt`.
- Это нужно, чтобы не хранить пароль в открытом виде.

### Разница между обычным паролем и хешем

Что говорить:

- Обычный пароль хранится как есть.
- Если кто-то получит доступ к базе, он сразу его увидит.
- Хеш это преобразованное значение.
- В базе хранится только хеш, а не исходный пароль.

### `def get_password_hash(password: str) -> str:`

```python
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

Что говорить:

- Эта функция принимает обычный пароль.
- Возвращает его хеш.
- Этот хеш потом хранится в базе.

### `verify_password(...)`

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

Что говорить:

- `plain_password` это пароль, который пользователь только что ввел.
- `hashed_password` это хеш из базы данных.
- Функция сравнивает обычный пароль с хешем.
- Возвращает `True` или `False`.

### `create_access_token(...)`

```python
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
```

Что говорить:

- Эта функция создает JWT токен.
- `data: dict` означает, что в функцию передаются данные в виде словаря.
- Например `{"sub": user.email}`.
- `expires_delta: timedelta | None = None` означает, что можно передать свое время жизни токена.
- Если не передали, используется значение по умолчанию.
- `to_encode = data.copy()` создает копию словаря, чтобы не менять исходный `data`.

### `expires_delta: timedelta | None = None`

Что говорить:

- Можно передать время жизни токена.
- `timedelta` это объект времени.
- `| None` означает, что значение может отсутствовать.
- `= None` означает значение по умолчанию.

### `expire = datetime.now(...) + (...)`

```python
expire = datetime.now(timezone.utc) + (
    expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
)
```

Что говорить:

- `datetime.now(timezone.utc)` берет текущее время в UTC.
- `expires_delta or ...` означает:
- если передали свое время жизни токена, берем его;
- если нет, берем стандартное время из настроек.
- В `expire` хранится точное время, когда токен станет недействительным.

### Что делает `or` в этом месте

Что говорить:

- Если `expires_delta` есть, используется он.
- Если его нет, используется время по умолчанию.

### `to_encode.update({"exp": expire})`

Что говорить:

- `to_encode` это словарь с данными токена.
- `update(...)` добавляет новые данные в словарь.
- `exp` это стандартное поле JWT, время истечения токена.
- Эта строка добавляет дату истечения в токен.

### `return jwt.encode(...)`

```python
return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
```

Что говорить:

- Эта строка кодирует данные в JWT токен и возвращает его.
- Для подписи токена используются `secret_key` и `algorithm`.
- Они берутся из `settings`.

## Общие формулировки

### Что такое `Depends`

Что говорить:

- `Depends` это механизм зависимостей FastAPI.
- Он автоматически подставляет в функцию то, что ей нужно.
- Например базу данных или текущего пользователя.

### Что такое `yield` в FastAPI зависимости

Что говорить:

- `yield` позволяет отдать объект в роут.
- После завершения запроса FastAPI возвращается в функцию.
- После этого можно выполнить очистку, например закрыть сессию.

### Что такое `commit`

Что говорить:

- `db.commit()` сохраняет изменения в базе данных.

### Что такое `refresh`

Что говорить:

- `db.refresh(obj)` заново загружает объект из базы после сохранения.
- Это нужно, чтобы получить актуальные данные, например `id`.

## app/schemas/user.py

### `class UserCreate(BaseModel):`

```python
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    bio: str | None = None
```

Что говорить:

- Этот класс нужен для схемы входных данных при регистрации пользователя.
- Он описывает, какие поля клиент должен прислать на сервер.
- `BaseModel` это базовый класс Pydantic для валидации данных.
- `username: str` означает, что username должен быть строкой.
- `email: EmailStr` означает, что email должен быть строкой в формате email.
- `password: str` означает, что пароль должен быть строкой.
- `bio: str | None = None` означает, что bio может быть строкой или отсутствовать.

Что такое `EmailStr`:

- Это специальный тип Pydantic для email.
- Он проверяет, что строка похожа на настоящий email.

Что значит `str | None = None`:

- Значение может быть строкой или `None`.
- `= None` означает, что поле необязательное.

### Разница между `UserCreate` и `User`

Что говорить:

- `UserCreate` это схема Pydantic для входных данных.
- Она проверяет, что клиент прислал корректные значения.
- `User` это модель SQLAlchemy для таблицы в базе данных.
- `UserCreate` нужен для проверки входа, `User` для хранения данных в базе.

### `class UserLogin(BaseModel):`

```python
class UserLogin(BaseModel):
    login: str | None = None
    email: EmailStr | None = None
    password: str
```

Что говорить:

- Это схема данных для входа пользователя.
- Здесь есть и `login`, и `email`, чтобы пользователь мог входить либо по username, либо по email.
- Они могут быть `None`, потому что достаточно одного из них.
- `password` обязателен, потому что без пароля вход невозможен.

## static/js/main.js

### `const state = {...}`

```javascript
const state = {
    token: localStorage.getItem("antisocial_token") || "",
    currentUser: null,
    posts: [],
    commentsByPost: {},
    openModalPostId: null,
};
```

Что говорить:

- `state` это объект, в котором фронтенд хранит текущее состояние приложения.
- `token` это токен пользователя из `localStorage`.
- `currentUser` это текущий авторизованный пользователь.
- `posts` это список постов, загруженных на страницу.
- `commentsByPost` это объект, где по `postId` хранятся комментарии.
- `openModalPostId` это id поста, который сейчас открыт в модальном окне.

### `token: localStorage.getItem("antisocial_token") || ""`

Что говорить:

- Эта строка пытается взять токен из `localStorage` по ключу `antisocial_token`.
- Если токен найден, он записывается в `state.token`.
- Если токена нет, ставится пустая строка.

### `function element(id) {...}`

```javascript
function element(id) {
    return document.getElementById(id);
}
```

Что говорить:

- Эта функция принимает `id` элемента.
- Возвращает HTML-элемент через `document.getElementById(id)`.
- Нужна для удобства, чтобы не писать длинную конструкцию каждый раз.

### `function pageName() {...}`

```javascript
function pageName() {
    return document.body.dataset.page || "";
}
```

Что говорить:

- `document.body.dataset.page` берет значение атрибута `data-page` у тега `body`.
- Например `feed`, `auth`, `create-post`, `profile`.
- Если атрибута нет, возвращается пустая строка.
- Эта функция нужна, чтобы один и тот же `main.js` понимал, на какой странице он сейчас работает.

### `function showMessage(text, isError = false) {...}`

Что говорить:

- Эта функция показывает пользователю всплывающее сообщение.
- `text` это текст сообщения.
- `isError = false` означает, что по умолчанию сообщение обычное, а не ошибка.
- Функция находит элемент `message-box`.
- Если элемента нет, завершает работу.
- Вставляет текст сообщения в блок.
- Убирает классы `hidden` и `error`, чтобы показать сообщение и сбросить старую ошибку.
- Если `isError` равно `true`, добавляет класс `error`.
- `clearTimeout(...)` очищает старый таймер, если он был.
- `setTimeout(...)` через 3 секунды снова скрывает сообщение.

Очень коротко:

- Показывает сообщение и потом автоматически его скрывает.

### `async function apiFetch(url, options = {}) {...}`

```javascript
async function apiFetch(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`;
    }

    const response = await fetch(url, { ...options, headers });
```

Что говорить:

- Это асинхронная функция для отправки HTTP-запросов на сервер.
- `async` означает, что внутри можно использовать `await`.
- `url` это адрес запроса.
- `options = {}` означает, что если настройки не передали, используется пустой объект.
- `headers` это объект заголовков запроса.
- `"Content-Type": "application/json"` говорит серверу, что мы отправляем JSON.
- `...(options.headers || {})` добавляет другие заголовки, если они были.
- Если в `state.token` есть токен, добавляется заголовок `Authorization`.
- `Bearer ${state.token}` это формат Bearer-токена.
- `await fetch(...)` отправляет запрос и ждет ответ от сервера.

Очень коротко:

- Это общая функция для запросов к API с автоматической подстановкой JSON-заголовков и токена.

## Additional High-Risk JS Notes

### `if (!response.ok) { ... throw new Error(message); }`

```javascript
if (!response.ok) {
    let message = "Request failed";
    try {
        const data = await response.json();
        message = data.detail || message;
    } catch (error) {
        message = response.statusText || message;
    }
    throw new Error(message);
}
```

Что говорить:

- `response.ok` проверяет, успешный ли HTTP-ответ.
- Если ответ неуспешный, создаётся текст ошибки.
- Сначала код пытается достать JSON из ответа.
- Если в JSON есть `detail`, он используется как текст ошибки.
- Если JSON прочитать не удалось, берётся `response.statusText`.
- `throw new Error(message)` выбрасывает ошибку в JavaScript.

Очень коротко:

- Этот блок обрабатывает ошибки ответа от сервера и превращает их в понятное сообщение.

### `if (response.status === 204) { return null; }`

Что говорить:

- Код `204` означает, что запрос успешный, но сервер не вернул тело ответа.
- Поэтому функция возвращает `null`.

### `saveToken(token)`

```javascript
function saveToken(token) {
    state.token = token;
    if (token) {
        localStorage.setItem("antisocial_token", token);
    } else {
        localStorage.removeItem("antisocial_token");
    }
}
```

Что говорить:

- Функция сохраняет токен в объект `state`.
- Если токен есть, он сохраняется в `localStorage`.
- Если токена нет, он удаляется из `localStorage`.

Очень коротко:

- Сохраняет или удаляет токен пользователя.

### `escapeHtml(text)`

```javascript
function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
```

Что говорить:

- Превращает текст в безопасный HTML.
- Заменяет специальные символы на HTML-сущности.
- Это нужно, чтобы пользовательский текст не ломал разметку страницы.

Очень коротко:

- Защищает вывод текста в HTML.

### `reloadCommentsForPost(postId)`

```javascript
async function reloadCommentsForPost(postId) {
    state.commentsByPost[postId] = await apiFetch(`/posts/${postId}/comments`);

    const commentList = element(`comment-list-${postId}`);
    if (commentList) {
        commentList.innerHTML = renderComments(state.commentsByPost[postId]);
    }

    if (state.openModalPostId === postId) {
        await openPostModal(postId);
    }
}
```

Что говорить:

- Загружает комментарии конкретного поста с сервера.
- Сохраняет их в `state.commentsByPost`.
- Если на странице есть блок комментариев, обновляет HTML.
- Если этот пост открыт в модальном окне, модалка тоже обновляется.

### `loadCurrentUser()`

```javascript
async function loadCurrentUser() {
    if (!state.token) {
        state.currentUser = null;
        updateHeader();
        return null;
    }

    try {
        state.currentUser = await apiFetch("/auth/me");
    } catch (error) {
        saveToken("");
        state.currentUser = null;
        showMessage(error.message, true);
    }

    updateHeader();
    return state.currentUser;
}
```

Что говорить:

- Если токена нет, текущий пользователь сбрасывается.
- Если токен есть, отправляется запрос `/auth/me`.
- Если запрос успешный, данные пользователя сохраняются в `state.currentUser`.
- Если токен плохой, он удаляется, пользователь сбрасывается, и показывается ошибка.
- В конце обновляется шапка страницы.

### `requireAuth(redirectPath = "/auth")`

Что говорить:

- Проверяет, есть ли токен пользователя.
- Если токена нет, отправляет пользователя на страницу авторизации.
- Возвращает `false`, если доступа нет, и `true`, если токен есть.

### `renderRating(users)` и `renderAchievements(items)`

Что говорить:

- Эти функции превращают массив данных в HTML-разметку.
- Если массив пустой, показывают сообщение `empty-state`.
- Если данные есть, строят HTML через `map(...).join("")`.

### `renderComments(comments)`

Что говорить:

- Если комментариев нет, показывает сообщение `No comments yet`.
- Если комментарии есть, строит HTML карточек комментариев.
- Внутри использует `renderCommentActions(comment)` для кнопок управления.

### `renderCommentActions(comment)`

```javascript
const canManage = state.currentUser && state.currentUser.id === comment.author_id;
```

Что говорить:

- Проверяет, авторизован ли пользователь.
- Сравнивает `id` текущего пользователя и `author_id` комментария.
- Если это автор комментария, показывает кнопки `Edit` и `Delete`.

### `renderReactionButton(post, type)`

Что говорить:

- Строит одну кнопку реакции.
- Если реакция пользователя совпадает с этим типом, кнопке даётся класс `active`.

### `renderPostCard(post)`

Основные мысли:

- Строит HTML одной карточки поста.
- Показывает автора, категорию, дату, заголовок, текст.
- Если есть `image_url`, показывает картинку.
- Если текущий пользователь автор поста, показывает кнопки `Edit` и `Delete`.
- Добавляет кнопки реакций и кнопку открытия комментариев.

### `loadReactionSelections(posts)`

```javascript
for (const post of posts) {
    const reactionsData = await apiFetch(`/posts/${post.id}/reactions`);
    const myReaction = reactionsData.reactions.find(
        (reaction) => reaction.user_id === state.currentUser.id
    );

    post.my_reaction = myReaction ? myReaction.reaction_type : "";
}
```

Что говорить:

- Проходит по всем постам.
- Для каждого поста получает список реакций.
- Ищет реакцию текущего пользователя.
- Сохраняет тип реакции в поле `my_reaction`.

### `const myReaction = reactionsData.reactions.find(...)`

Что говорить:

- `find(...)` ищет первый элемент, который подходит под условие.
- Здесь ищется реакция, у которой `user_id` совпадает с `id` текущего пользователя.

### `state.posts = []; for (const post of posts) { ... }`

Что говорить:

- Сначала массив постов очищается.
- Потом в него по одному добавляются посты с дополнительным полем `my_reaction`.

### `handleLogin(event)`

Ключевые строки:

```javascript
event.preventDefault();
const payload = {
    login: element("login-value").value.trim(),
    password: element("login-password").value,
};
```

Что говорить:

- `event.preventDefault()` отменяет обычную отправку формы браузером.
- `payload` это объект данных для отправки на сервер.
- `trim()` убирает лишние пробелы у логина.
- У пароля `trim()` нет, потому что пробел может быть частью настоящего пароля.

### `const data = await apiFetch("/auth/login", ...)`

Что говорить:

- Отправляет логин и пароль на сервер.
- Ждёт ответ от сервера.
- Получает данные ответа, например `access_token`.

### `saveToken(data.access_token); window.location.href = "/";`

Что говорить:

- Сохраняет токен после успешного логина.
- Потом переводит пользователя на главную страницу.

### `handleRegister(event)`

Что говорить:

- Собирает данные регистрации из формы.
- Отправляет их на `/auth/register`.
- Если всё успешно, показывает сообщение и очищает форму.
- Потом переключает интерфейс обратно на логин.

### `handleCreatePost(event)`

Что говорить:

- Отменяет обычную отправку формы.
- Проверяет авторизацию через `requireAuth()`.
- Собирает `title`, `image_url`, `content`, `category`.
- Отправляет `POST` запрос на `/posts`.
- После успеха очищает форму и переводит пользователя на главную.

### `handleProfileUpdate(event)`

Что говорить:

- Собирает новые данные профиля.
- Отправляет `PATCH` запрос на `/users/me`.
- Скрывает форму редактирования.
- Перезагружает страницу профиля.

### `handleLogout()`

Что говорить:

- Удаляет токен.
- Сбрасывает текущего пользователя.
- Переводит пользователя на страницу `/auth`.

### `showLoginForm()` и `showRegisterForm()`

Что говорить:

- Эти функции переключают видимость форм логина и регистрации.
- Также меняют активные кнопки в интерфейсе.

### `submitReaction(postId, reactionType)`

Что говорить:

- Отправляет реакцию на сервер для конкретного поста.
- Потом перезагружает либо профиль, либо ленту, в зависимости от страницы.

### `toggleComments(postId)`

Что говорить:

- Показывает или скрывает блок комментариев у поста.
- Если блок только что открылся, комментарии подгружаются с сервера.

### `submitComment(event, postId)`

Что говорить:

- Отменяет стандартную отправку формы.
- Берёт текст комментария.
- Отправляет его на сервер.
- Перезагружает комментарии и текущую страницу постов.

### `editPost(postId)` и `deletePost(postId)`

Что говорить:

- `editPost` открывает простое редактирование через `prompt`.
- Потом отправляет `PUT` на сервер.
- `deletePost` сначала спрашивает подтверждение через `confirm`.
- Потом отправляет `DELETE` на сервер.

### `editComment(commentId)`

Сложное место:

```javascript
for (const comments of Object.values(state.commentsByPost)) {
    for (const comment of comments) {
        if (comment.id === commentId) {
            targetComment = comment;
        }
    }
}
```

Что говорить:

- `Object.values(state.commentsByPost)` берёт все массивы комментариев.
- Внешний цикл проходит по каждому массиву.
- Внутренний цикл проходит по каждому комментарию.
- Если `id` комментария совпал, этот комментарий сохраняется в `targetComment`.

Очень коротко:

- Этот код вручную ищет нужный комментарий среди всех загруженных комментариев.

### `openPostModal(postId)`

Очень важный блок:

- Загружает один пост с сервера.
- Загружает комментарии этого поста.
- Сохраняет `postId` как открытый в модалке.
- Обновляет локальное состояние `state`.
- Строит HTML модального окна.
- Показывает модалку, убирая класс `hidden`.

Сложная строка:

```javascript
const localPostIndex = state.posts.findIndex((item) => item.id === postId);
```

Что говорить:

- `findIndex(...)` ищет индекс поста в массиве `state.posts`.
- Если индекс найден, локальная версия поста обновляется свежими данными.

### `closePostModal()`

Что говорить:

- Скрывает модальное окно.
- Сбрасывает `openModalPostId` в `null`.

### `initAuthPage()`, `initCreatePostPage()`, `initFeedPage()`, `initProfilePage()`

Что говорить:

- Это функции инициализации конкретных страниц.
- Они навешивают обработчики событий и запускают первую загрузку данных.

### `const currentPage = pageName(); if (currentPage === "...")`

Что говорить:

- Код определяет, какая страница открыта.
- После этого запускается нужная функция инициализации.

## Additional Backend High-Risk Notes

### `response_model=list[RatingUserOut]`

Что говорить:

- Сервер должен вернуть список объектов в формате `RatingUserOut`.

### `_: User = Depends(get_current_user)`

Что говорить:

- Зависимость всё равно вызывается, чтобы проверить авторизацию.
- Переменная называется `_`, потому что внутри функции сам объект пользователя не используется.

### `if user_data.username is not None and user_data.username != current_user.username:`

Что говорить:

- Проверяет, пришёл ли новый username.
- И дополнительно проверяет, отличается ли он от текущего.
- Только после этого есть смысл искать дубликат в базе.

### `haters_count = db.query(HateFollow)...count()`

Что говорить:

- Считает количество пользователей, которые хейтят данного пользователя.

### `is_hated_by_current_user = (...).first() is not None`

Что говорить:

- Выполняется поиск hate-follow связи.
- Если `first()` вернул объект, значит связь есть.
- Если вернул `None`, значит связи нет.

### `db.query(User).join(HateFollow, HateFollow.hater_id == User.id)`

Что говорить:

- `join(...)` соединяет таблицу пользователей с таблицей hate_follows.
- Это нужно, чтобы получить самих пользователей-хейтеров, а не только записи связи.

### `return [AchievementOut(...) for achievement in achievements]`

Что говорить:

- Это list comprehension.
- Он превращает результаты запроса в список объектов схемы `AchievementOut`.

## Additional Model Notes

### `UniqueConstraint("post_id", "user_id", name="uq_reactions_post_user")`

Что говорить:

- Это ограничение уникальности на пару полей.
- Один пользователь не может оставить две реакции на один и тот же пост.

### `post = relationship("Post", back_populates="reactions")`

Что говорить:

- Это связь между `Reaction` и `Post`.
- Через неё можно получить объект поста из реакции.

### `user = relationship("User", back_populates="reactions")`

Что говорить:

- Это связь между `Reaction` и `User`.
- Через неё можно получить объект пользователя из реакции.

### `back_populates="reactions"`

Что говорить:

- Показывает, что на другой модели есть обратная связь с именем `reactions`.
- Связь двусторонняя.

### `@property def user_username(...)`

```python
@property
def user_username(self) -> str | None:
    return self.user.username if self.user else None
```

Что говорить:

- Это вычисляемое свойство Python.
- Оно возвращает username связанного пользователя.
- Если пользователя нет, возвращает `None`.

## Ready Answers For Random Lines

### Импорт

- Эта строка импортирует ... чтобы дальше использовать ... в этом файле.

### `return current_user`

- Возвращает текущего пользователя как ответ сервера.

### `return response.json()`

- Преобразует тело ответа в JSON и возвращает его в JavaScript.

### `window.confirm("Delete this post?")`

- Показывает пользователю окно подтверждения перед удалением.

### `event.preventDefault()`

- Отменяет стандартное действие браузера, например обычную отправку формы.

## app/routers/auth.py

### `router = APIRouter(prefix="/auth", tags=["Auth"])`

Что говорить:

- Создаётся роутер FastAPI для авторизации.
- `prefix="/auth"` означает, что все роуты в этом файле будут начинаться с `/auth`.
- `tags=["Auth"]` нужны в основном для группировки в документации FastAPI.

### `@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)`

Что говорить:

- Это `POST`-роут для регистрации пользователя.
- `response_model=UserOut` означает, что ответ будет в формате схемы `UserOut`.
- `201 Created` означает, что был создан новый объект.

### `if get_user_by_username(db, user_data.username):`

Что говорить:

- Проверяет, существует ли уже пользователь с таким username.
- Если существует, регистрация запрещается.

### `if get_user_by_email(db, user_data.email):`

Что говорить:

- Проверяет, существует ли уже пользователь с таким email.
- Если email уже занят, выбрасывается ошибка.

### `return create_user(db, user_data)`

Что говорить:

- Вызывает функцию создания пользователя.
- Передаёт туда сессию базы и данные регистрации.
- Возвращает созданного пользователя.

### `@router.post("/login", response_model=Token)`

Что говорить:

- Это `POST`-роут для логина.
- Ответ будет в формате схемы `Token`.

### `user = authenticate_user(db, user_data.login, user_data.password)`

Что говорить:

- Проверяет, существует ли пользователь и правильный ли пароль.
- Если всё верно, возвращает пользователя.
- Если нет, возвращает `None`.

### `if user is None: raise HTTPException(...)`

Что говорить:

- Если логин или пароль неверны, сервер возвращает ошибку авторизации `401`.

### `headers={"WWW-Authenticate": "Bearer"}`

Что говорить:

- Показывает, что для доступа используется схема Bearer Token.

### `access_token = create_access_token(data={"sub": user.email})`

Что говорить:

- Создаёт JWT токен.
- В `sub` кладётся email пользователя.

### `return Token(access_token=access_token)`

Что говорить:

- Возвращает клиенту объект токена.
- Внутри будет `access_token` и `token_type`.

### `@router.get("/me", response_model=UserOut)`

Что говорить:

- Это роут для получения текущего авторизованного пользователя.

### `def read_current_user(current_user: User = Depends(get_current_user)):`

Что говорить:

- FastAPI автоматически получает текущего пользователя через зависимость `get_current_user`.

## app/routers/posts.py

### `@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)`

Что говорить:

- Это `POST`-роут для создания поста.
- Ответ будет в формате `PostOut`.
- Код `201` означает успешное создание поста.

### `post = Post(...)`

Что говорить:

- Создаётся объект SQLAlchemy модели `Post`.
- В него записываются заголовок, текст, картинка, категория и автор.

### `category=post_data.category.value`

Что говорить:

- `post_data.category` это enum Pydantic.
- `.value` берёт обычную строку значения enum.

### `author_id=current_user.id`

Что говорить:

- Автором поста становится текущий авторизованный пользователь.
- Сервер сам ставит `author_id`, чтобы нельзя было подделать автора.

### `evaluate_user_achievements(db, current_user.id)`

Что говорить:

- После создания поста проверяются достижения пользователя.

### `@router.get("", response_model=list[PostOut])`

Что говорить:

- Это `GET`-роут для получения списка постов.
- Ответ будет списком объектов `PostOut`.

### `skip: int = Query(default=0, ge=0)`

Что говорить:

- Сколько первых постов нужно пропустить.
- `ge=0` значит, что значение не может быть меньше нуля.

### `limit: int = Query(default=20, ge=1, le=100)`

Что говорить:

- Сколько максимум постов вернуть.
- Минимум `1`, максимум `100`.

### `author_id: int | None = Query(default=None, ge=1)`

Что говорить:

- Необязательный фильтр по автору.
- Если параметр передали, будут возвращены посты только этого автора.

### `category: PostCategory | None = Query(default=None)`

Что говорить:

- Необязательный фильтр по категории поста.

### `search: str | None = Query(default=None, min_length=1, max_length=100)`

Что говорить:

- Необязательная строка поиска.
- Если она есть, посты будут фильтроваться по тексту.

### `query = db.query(Post)`

Что говорить:

- Создаётся SQLAlchemy-запрос ко всем постам.

### `query = query.filter(Post.author_id == author_id)`

Что говорить:

- Добавляет фильтр по автору.

### `query = query.filter(Post.category == category.value)`

Что говорить:

- Добавляет фильтр по категории.
- У enum берётся строковое значение через `.value`.

### `text = f"%{search.strip()}%"`

Что говорить:

- Убирает лишние пробелы из строки поиска.
- Добавляет `%` для SQL-поиска по части текста.

### `Post.title.ilike(text) | Post.content.ilike(text)`

Что говорить:

- Ищет текст либо в заголовке, либо в содержимом поста.
- `ilike` означает поиск без учёта регистра.
- `|` означает логическое ИЛИ.

### `.order_by(Post.created_at.desc())`

Что говорить:

- Сортирует посты по дате создания от новых к старым.

### `.offset(skip).limit(limit).all()`

Что говорить:

- `offset(skip)` пропускает первые записи.
- `limit(limit)` ограничивает количество результатов.
- `all()` возвращает список результатов.

### `@router.get("/{post_id}", response_model=PostOut)`

Что говорить:

- Это роут для получения одного поста по его `id`.

### `return get_post_or_404(db, post_id)`

Что говорить:

- Пытается получить пост из базы.
- Если поста нет, сразу выбрасывается ошибка `404`.

### `@router.put("/{post_id}", response_model=PostOut)`

Что говорить:

- Это роут для обновления поста.

### `if post.author_id != current_user.id:`

Что говорить:

- Сравнивается автор поста и текущий пользователь.
- Если это не автор, редактирование запрещается.

### `if post_data.title is not None: post.title = post_data.title`

Что говорить:

- Поле меняется только если клиент действительно прислал новое значение.

### `if post_data.category is not None: post.category = post_data.category.value`

Что говорить:

- Категория обновляется только если пришла новая.
- У enum берётся строковое значение.

### `@router.delete("/{post_id}", status_code=status.HTTP_200_OK)`

Что говорить:

- Это роут для удаления поста.
- Если пост есть и текущий пользователь автор, пост удаляется.

### `db.delete(post)`

Что говорить:

- Помечает объект поста на удаление из базы.

## app/routers/comments.py

### `@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)`

Что говорить:

- Это роут для создания комментария к конкретному посту.

### `get_post_or_404(db, post_id)`

Что говорить:

- Сначала проверяется, существует ли пост.
- Если поста нет, возвращается `404`.

### `comment = Comment(...)`

Что говорить:

- Создаётся объект комментария.
- В него записываются текст, id поста и id автора.

### `author_id=current_user.id`

Что говорить:

- Автором комментария становится текущий пользователь.

### `@router.get("/posts/{post_id}/comments", response_model=list[CommentOut])`

Что говорить:

- Это роут для получения списка комментариев конкретного поста.

### `.order_by(Comment.created_at.asc())`

Что говорить:

- Сортирует комментарии по времени создания от старых к новым.

### `@router.put("/comments/{comment_id}", response_model=CommentOut)`

Что говорить:

- Это роут для обновления комментария.

### `if comment.author_id != current_user.id:`

Что говорить:

- Только автор комментария может его редактировать.

### `comment.content = comment_data.content`

Что говорить:

- Новое содержимое комментария записывается в объект.

### `@router.delete("/comments/{comment_id}", status_code=status.HTTP_200_OK)`

Что говорить:

- Это роут для удаления комментария.

## app/main.py

### `app = FastAPI(...)`

Что говорить:

- Создаёт главное приложение FastAPI.
- Внутрь передаются название, описание и версия проекта.

### `BASE_DIR = Path(__file__).resolve().parent.parent`

Что говорить:

- Находит корневую папку проекта через путь к текущему файлу.

### `STATIC_DIR = BASE_DIR / "static"`

Что говорить:

- Создаёт путь к папке со статическими файлами.

### `TEMPLATES_DIR = BASE_DIR / "templates"`

Что говорить:

- Создаёт путь к папке с HTML-страницами.

### `@app.on_event("startup")`

Что говорить:

- Эта функция запускается при старте приложения.

### `ensure_post_image_column()`

Что говорить:

- Проверяет, есть ли у таблицы `posts` колонка `image_url`.
- Если её нет, добавляет.

### `inspector = inspect(engine)`

Что говорить:

- Создаёт объект инспектора SQLAlchemy для проверки структуры базы данных.

### `post_columns = {column["name"] for column in inspector.get_columns("posts")}`

Что говорить:

- Получает список колонок таблицы `posts`.
- Из них берутся только имена колонок.
- Результат складывается в множество.

### `if "image_url" in post_columns: return`

Что говорить:

- Если колонка уже существует, ничего делать не нужно.

### `with engine.begin() as connection:`

Что говорить:

- Открывает соединение с базой в транзакционном контексте.

### `connection.execute(text("ALTER TABLE posts ADD COLUMN image_url VARCHAR(500)"))`

Что говорить:

- Выполняет SQL-команду вручную.
- Добавляет колонку `image_url` в таблицу `posts`.

### `app.include_router(...)`

Что говорить:

- Подключает роутер к главному приложению FastAPI.

### `app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")`

Что говорить:

- Подключает папку `static`, чтобы браузер мог загружать CSS и JS.

### `return FileResponse(TEMPLATES_DIR / "index.html")`

Что говорить:

- Возвращает браузеру HTML-файл страницы.
