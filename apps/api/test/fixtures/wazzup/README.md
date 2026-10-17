# Фикстуры вебхука Wazzup

Формат тел — документация Wazzup API v3 (`wazzup24.ru/help/api-ru`, разделы
«Отправка сообщений», «Webhooks»). Разбирает их
`src/integrations/channels/wazzup.driver.ts`, прогоняет по HTTP — этот README и
скрипт-проверка фазы 6.

## Как устроен вебхук провайдера

`POST` на адрес из настройки `webhooksUri`, тело — JSON с ключами `messages` и
`statuses` (могут быть одновременно). Подписи у запроса нет: провайдер добавляет
`Authorization: Bearer <crmKey>`, только если crmKey у него есть. Поэтому допуск
работает по ключу доступа в строке запроса:

```
https://pandoroom-back.e-rma.ru/api/webhooks/wazzup?key=<webhookSecret>
```

`webhookSecret` (группа `wazzup` в настройках интеграций) придумываем сами: без
него приём отвечает 503, с неверным — 401. При подключении вебхуков провайдер
присылает проверочный `{"test": true}` и ждёт `200` — такой запрос разбирается в
ноль событий.

## Тело события

| поле | смысл |
| --- | --- |
| `messages[].messageId` | guid сообщения у провайдера; он же `externalId`, по нему работает идемпотентность |
| `messages[].chatType` | `whatsapp` / `telegram` / `max` — по нему определяем канал; групповые чаты (`whatsgroup`, `telegroup`, `maxgroup`) и прочие мессенджеры пропускаем |
| `messages[].chatId` | идентификатор собеседника — адрес для ответа и единственный ключ, когда телефон не прислан |
| `messages[].isEcho` | `false` — от клиента, `true` — ответ сотрудника (из виджета или с телефона), ложится в ленту как исходящее |
| `messages[].contact.phone` | может отсутствовать; нормализуется до `7XXXXXXXXXX` |
| `messages[].text` / `contentUri` | текст либо вложение; без обоих событие выбрасывается |
| `messages[].dateTime` | время у провайдера, по нему сообщение встаёт в ленту |
| `statuses[].messageId` | статус только по ранее отправленному нами сообщению: `sent`, `delivered`, `read`, `error`; `edited` игнорируем |

## Токены

`{{MESSAGE_ID}}` и `{{TEXT}}` подставляет скрипт проверки, чтобы повторный прогон
не считался ретраем. Для ручного curl замените их на уникальные значения:

```bash
KEY='<значение webhookSecret>'
BODY=$(sed -e "s/{{MESSAGE_ID}}/$(uuidgen)/" -e "s/{{TEXT}}/проверка фикстуры/" test/fixtures/wazzup/inbound-whatsapp.json)

curl -sS -X POST "http://localhost:3001/api/webhooks/wazzup?key=$KEY" \
  -H 'Content-Type: application/json' \
  --data "$BODY"
```

## Файлы

| файл | что доказывает |
| --- | --- |
| `inbound-whatsapp.json` | входящее по WhatsApp: клиент по номеру, канал подтверждается |
| `inbound-telegram.json` | имя контакта = номер → в карточку не попадает; `chatId` сохраняется как адрес ответа |
| `inbound-telegram-no-phone.json` | телефон не прислан: привязка по `chatId` ранее подтверждённого клиента |
| `inbound-max.json` | входящее по третьему мессенджеру |
| `inbound-media.json` | картинки/голосовых нет текста — в ленту уходит метка с ссылкой |
| `outbound-echo.json` | `isEcho: true` — ответ сотрудника попадает в общую ленту как исходящее |
| `inbound-foreign-phone.json` | номер не из РФ и `chatId` не известен → `noClient`, а не ошибка вебхука |
| `inbound-unsupported-chattype.json` | `viber` — не наш канал, событие разбирается в ноль |
| `inbound-group.json` | групповой чат — не привязывается к клиенту |
| `status-delivered.json` | статус доставки ложится на отправленное нами сообщение |
| `status-error.json` | `error` → сообщение становится FAILED с описанием провайдера |
| `test-connection.json` | проверочный POST при подключении вебхуков: 200 и ноль событий |
