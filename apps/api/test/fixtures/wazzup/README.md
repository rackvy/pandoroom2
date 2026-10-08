# Фикстуры вебхука Wazzup

Формат событий — тот, который разбирает `src/integrations/channels/wazzup.driver.ts`.
Пути и поля провайдера по открытым источникам не подтверждены, поэтому контракт
зафиксирован здесь и сверяется с реальным аккаунтом в фазе 6. Если документация
аккаунта скажет другое — правятся драйвер, этот разбор и фикстуры вместе.

## Тело события

| поле | смысл |
| --- | --- |
| `event` | `message.created` — новое сообщение, `message.status` — статус доставки |
| `externalId` | идентификатор сообщения у провайдера, по нему работает идемпотентность |
| `channelId` | экземпляр канала; сверяется с `whatsappChannelId` / `telegramChannelId` / `maxChannelId` в настройках |
| `direction` | `incoming` — от клиента; исходящие события провайдер нам не шлёт |
| `contact.phone` | номер в любом написании, нормализуется до `7XXXXXXXXXX` |
| `message.createdAt` | время у провайдера — по нему сообщение встаёт в ленту |

## Токены

`{{EXTERNAL_ID}}` и `{{TEXT}}` подставляет `chat-channels-proof.tmp.js`, чтобы
повторный прогон не считался ретраем. Для ручного curl их можно заменить на любые
уникальные значения — файл при этом остаётся валидным телом запроса.

## Подпись

`x-wazzup-signature` = HMAC-SHA256 от **сырого** тела, ключ — поле `webhookSecret`
группы `wazzup` в настройках интеграций. Без настроенного секрета вебхук отвечает
503 и ничего не принимает.

```bash
SECRET='<значение webhookSecret>'
BODY=test/fixtures/wazzup/inbound-whatsapp.json
SIG=$(node -e "const c=require('crypto'),fs=require('fs');process.stdout.write(c.createHmac('sha256',process.argv[1]).update(fs.readFileSync(process.argv[2])).digest('hex'))" "$SECRET" "$BODY")

curl -sS -X POST http://localhost:3001/api/webhooks/wazzup \
  -H 'Content-Type: application/json' \
  -H "x-wazzup-signature: $SIG" \
  --data @$BODY
```

Каналы в фикстурах (`wa-instance-1`, `tg-instance-1`, `max-instance-1`) заводятся
скриптом `wazzup-setup.tmp.js` — он же пишет секрет и номер для инъекции ошибки.

## Файлы

| файл | что доказывает |
| --- | --- |
| `inbound-whatsapp.json` | входящее по WhatsApp; номер написан «+7 (900) 000-00-01» — проверяется нормализация |
| `inbound-telegram.json` | тот же разбор по экземпляру Telegram |
| `inbound-max.json` | входящее по третьему мессенджеру — экземпляру MAX |
| `inbound-unknown-phone.json` | номер, которого нет в базе: заводится клиент, имя берётся из события |
| `inbound-unknown-channel.json` | экземпляр `viber-instance-9` намеренно не настроен — событие разбирается в ноль |
| `status-delivered.json` | статус доставки по `externalId` ранее отправленного сообщения |
