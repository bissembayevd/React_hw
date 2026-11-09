# TaskSpace · React Assignment 6

[Репозиторий React_hw](https://github.com/bissembayevd/React_hw) · [Ожидаемый адрес Assignment 6](https://bissembayevd.github.io/React_hw/assign_6/)

TaskSpace сохраняет Dashboard, список и детали задач, CRUD, поиск, фильтры, сортировку и пагинацию из Assignment 5. Все функции задач доступны гостям. Для профиля требуется вход.

## Локальный запуск

Нужен Node.js 24. Из корня репозитория выполните:

```bash
cd assign_6
npm ci
npm run dev
```

Откройте [TaskSpace на localhost](http://localhost:5173/React_hw/assign_6/). Без Firebase-конфигурации страницы задач работают, а формы входа и регистрации показывают сообщение о настройке.

## Firebase Authentication

1. В [Firebase Console](https://console.firebase.google.com/) создайте или откройте проект. В **Project settings → General → Your apps** зарегистрируйте Web App кнопкой **</>** и откройте её SDK configuration.
2. В **Authentication → Sign-in method** включите **Email/Password** и **Google**. Для Google выберите адрес поддержки проекта.
3. В **Authentication → Settings → Authorized domains** добавьте `localhost` для локального запуска и `bissembayevd.github.io` для GitHub Pages. При запуске через `127.0.0.1` добавьте также этот хост. Домены указываются без схемы, порта и пути.
4. Скопируйте `.env.example` в `.env.local` и перенесите значения из конфигурации Web App. После редактирования перезапустите Vite.

| Переменная Vite | Поле Firebase |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

`.env.local` игнорируется Git. Эти параметры Web App доступны в клиентской сборке. Используйте значения SDK configuration, а ключи сервисных аккаунтов храните отдельно от приложения.

На [странице входа](https://bissembayevd.github.io/React_hw/assign_6/#/login) доступны email и пароль или окно Google. Firebase сохраняет сессию на текущем origin. [Профиль](https://bissembayevd.github.io/React_hw/assign_6/#/profile) ждёт восстановления сессии, перенаправляет гостя на вход и показывает email, UID и кнопку Logout для вошедшего пользователя.

## Данные и кэш

Список задач загружается реальными HTTP-запросами к DummyJSON: `GET /todos?limit=0` и `GET /users?limit=0`. DummyJSON имитирует запись, поэтому после успешных запросов на создание, изменение и удаление сервис сохраняет изменения в `localStorage` с ключом Assignment 5 `taskspace.assignment5.changes.v1`. Сохранённые изменения накладываются на загруженный список и детали. Данные задач общие для гостя и вошедшего пользователя на одном origin.

- Tasks и Dashboard используют общий кэш TanStack Query с ключом `["tasks", "list", { todosLimit: 0, usersLimit: 0 }]`. Поиск, сортировка, фильтры, владелец и пагинация применяются к загруженным данным на клиенте, поэтому их смена не вызывает запрос.
- Список считается свежим 60 секунд. Неактивный кэш хранится 5 минут. Устаревший список обновляется при входе на страницу, возврате фокуса или восстановлении соединения. Кнопки Reload и Try again запускают запрос вручную. Ошибки показываются сразу.
- После успешного CRUD и сохранения локальных изменений приложение отменяет выполняющийся запрос списка и инвалидирует его кэш. Активный список запрашивается заново сразу, а неактивный при следующем открытии. Ошибка записи оставляет кэш прежним.
- Детали запрашиваются отдельно по ID при открытии и повторно после редактирования или смены статуса. Запросы списка и деталей передают `AbortSignal` в `fetch`, чтобы отменять ненужные запросы.

[Документация DummyJSON](https://dummyjson.com/docs/todos) · [Документация TanStack Query](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)

## GitHub Pages

1. В репозитории откройте **Settings → Secrets and variables → Actions → Variables**. Создайте шесть repository variables с точными именами из таблицы Firebase. Workflow передаёт их в Vite через защищённые параметры вызываемой сборки, чтобы значения маскировались в журнале GitHub Actions.
2. В **Settings → Pages → Build and deployment** выберите **GitHub Actions**.
3. Когда изменения окажутся в ветке `master`, workflow **Deploy TaskSpace assignments** соберёт один артефакт для всех заданий. Assignment 4 остаётся по адресу [`/React_hw/`](https://bissembayevd.github.io/React_hw/), Assignment 5 по адресу [`/React_hw/assign_5/`](https://bissembayevd.github.io/React_hw/assign_5/), Assignment 6 по адресу [`/React_hw/assign_6/`](https://bissembayevd.github.io/React_hw/assign_6/).

Вложенные маршруты сохраняют формат HashRouter. Например, [`/React_hw/assign_6/#/tasks/2`](https://bissembayevd.github.io/React_hw/assign_6/#/tasks/2) и [`/React_hw/assign_6/#/profile`](https://bissembayevd.github.io/React_hw/assign_6/#/profile) можно открывать напрямую и обновлять. Pages отдаёт один и тот же `index.html`, а путь после `#` обрабатывает React Router.

## Проверки

В каталоге `assign_6` выполните:

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Playwright поднимает статический сервер с production-сборкой по тому же пути, что и Pages. Тест проверяет чтение из DummyJSON и сценарии с контролируемыми ответами, включая CRUD, инвалидацию, быстрый переход между деталями, маршруты и меню гостя. Для прогона с контролируемыми ответами при недоступном DummyJSON задайте переменную `SKIP_LIVE_API=1`.

После настройки Firebase зарегистрируйтесь, выйдите, войдите по email и затем через Google. Проверьте email и UID на странице профиля, обновите её для проверки сессии и после Logout откройте профиль напрямую для проверки перенаправления.
