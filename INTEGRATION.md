# Инструкция по интеграции турникетов Hikvision

## Вариант 1 — HTTP Event Notification (рекомендуется)

Турникеты Hikvision умеют сами отправлять HTTP-запрос на сервер при каждом проходе.

### Настройка на устройстве

1. Откройте веб-интерфейс устройства (введите IP-адрес турникета в браузере)
2. Перейдите: **Configuration → Network → Advanced Settings → HTTP Listening**
3. Установите:
   - Protocol Type: `HTTP`
   - IP Address: `<IP вашего сервера>`
   - Port: `8000`
   - URL: `/webhook/hikvision`
   - Authentication: отключить (или Basic, тогда добавьте проверку в backend)
4. Выберите события: **Access Controller Event** ✓
5. Сохраните.

Теперь при каждом проходе устройство будет слать POST-запрос:
```
POST http://<ваш-сервер>:8000/webhook/hikvision
Content-Type: application/xml

<?xml version="1.0" encoding="UTF-8"?>
<EventNotificationAlert xmlns="http://www.hikvision.com/ver20/XMLSchema">
  <ipAddress>192.168.1.64</ipAddress>
  <dateTime>2024-09-10T08:32:41+05:00</dateTime>
  <eventType>AccessControllerEvent</eventType>
  <AccessControllerEvent>
    <name>Иванов Иван</name>
    <cardNo>1234567890</cardNo>
    <employeeNoString>S001</employeeNoString>
    <attendanceStatus>checkIn</attendanceStatus>
    <inOutStatus>entry</inOutStatus>
  </AccessControllerEvent>
</EventNotificationAlert>
```

---

## Вариант 2 — Импорт CSV из iVMS-4200

Если настроить HTTP push не получается, можно вручную экспортировать отчёт из iVMS-4200 и загрузить CSV на сайт.

### Экспорт из iVMS-4200

1. В iVMS-4200 откройте **Учёт рабочего времени → Отчёты → По событиям доступа**
2. Выберите период и нажмите **Экспорт → CSV**
3. На сайте перейдите в **Журнал событий** → кнопка **Импорт CSV**
4. Загрузите файл

Поддерживаемые колонки CSV:
| Колонка в iVMS-4200 | Описание |
|---|---|
| `Name` или `Employee Name` | ФИО |
| `Card No.` или `CardNo` | Номер карты |
| `Time` или `Date Time` | Дата и время события |
| `Status` или `In/Out` | Направление (In/Out, Entry/Exit, Вход/Выход) |

---

## Вариант 3 — Тестовый JSON webhook

Для проверки работы сервера без реального оборудования можно отправить тестовое событие через curl:

```bash
curl -X POST http://localhost:8000/webhook/event \
  -H "Content-Type: application/json" \
  -d '{
    "cardNo": "1234567890",
    "name": "Иванов Иван Иванович",
    "attendanceStatus": "checkIn",
    "deviceIp": "192.168.1.64",
    "dateTime": "2024-09-10T08:32:00"
  }'
```

---

## Сопоставление карт с учениками

Чтобы в системе отображались имена и классы:

1. Перейдите в раздел **Ученики** и добавьте учеников
2. Укажите **Номер карты** (Card No.) — тот же номер, что прописан в карточке ученика в Hikvision
3. Опционально: укажите **Табельный номер** (employeeNo) из iVMS-4200

При получении события система автоматически найдёт ученика по номеру карты.

---

## Сопоставление турникетов со школами

1. Перейдите в раздел **Школы** → кнопка **+ Турникет**
2. Укажите IP-адрес устройства (тот же, что прописан в турникете)
3. Привяжите к нужной школе

---

## Запуск системы

### Backend
```bash
cd school-access/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API документация: http://localhost:8000/docs

### Frontend
```bash
cd school-access/frontend
npm install
npm run dev
```

Сайт: http://localhost:3000

### Для продакшена (постоянная работа)
Рекомендуется использовать **PM2** (Node.js) или **systemd** для автозапуска.

Backend пример с PM2:
```bash
npm install -g pm2
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name school-backend
pm2 save
```
