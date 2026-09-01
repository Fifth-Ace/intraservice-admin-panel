# v0.3.0 — IntraService Control frontend

## Главное

- Новый основной интерфейс на Svelte 5, TypeScript и Vite.
- Шесть адаптивных разделов: Обзор, Заявки, Шаблоны, Система, Журнал и Настройки.
- Тёмная и светлая темы, мобильное меню, доступные focus-состояния.
- Read-only API для безопасного журнала и шаблонов решений.
- Секреты никогда не возвращаются клиенту: отображается только признак `задан / не задан`.
- Предыдущий интерфейс сохранён на `/legacy/`.
- `PANEL_ENABLE_V2=0` мгновенно возвращает legacy-интерфейс на `/`.
- Запись конфигурации по-прежнему выключена по умолчанию.

## Установка и обновление

```bash
npm install
npm run frontend:install
npm run frontend:build
npm run ci
npm start
```

Для systemd после обновления выполните `daemon-reload` и перезапустите только сервис панели.

## Проверки релиза

- backend syntax/auth/config self-tests;
- Svelte Check без ошибок и предупреждений;
- 43 frontend-теста;
- production Vite build;
- dependency audit;
- поиск production-путей, доменов, credentials и приватных ключей.

---

# v0.3.0 — IntraService Control frontend

- New Svelte 5 + TypeScript + Vite primary frontend.
- Six responsive sections: Overview, Tickets, Templates, System, Log and Settings.
- Dark/light themes, mobile navigation and accessible focus states.
- Safe read-only audit-log and solution-template APIs.
- Secrets are represented only as `set / not set`.
- The previous UI remains available at `/legacy/`.
- Set `PANEL_ENABLE_V2=0` for an instant rollback.
- Configuration writes remain disabled by default.
