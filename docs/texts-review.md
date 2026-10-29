# Тексты бота: русский и узбекский

Файл собирается автоматически (`node scripts/export-texts.js`), правки вносите в `locales/uz.js` и `locales/ru.js`.

Как проверять: читайте колонку «Oʻzbekcha» — звучит ли естественно, как сказал бы человек. `{name}` и подобное —
подстановки, их не трогать. `<b>…</b>` — жирный шрифт.

| Ключ | Русский | Oʻzbekcha |
|---|---|---|
| `lang.name` | 🇷🇺 Русский | 🇺🇿 Oʻzbekcha |
| `lang.choose` | 🇷🇺 Выберите язык | 🇺🇿 Tilni tanlang |
| `lang.saved` | Язык сохранён | Til saqlandi |
| `commands.start` | Начать | Boshlash |
| `commands.menu` | Главное меню | Asosiy menyu |
| `commands.lang` | Сменить язык | Tilni oʻzgartirish |
| `commands.admin` | Админ-панель | Admin panel |
| `commands.extend` | Продлить подписку мастеру | Ustaga obunani uzaytirish |
| `commands.broadcast` | Рассылка мастерам | Ustalarga xabar yuborish |
| `common.back` | ⬅️ Назад | ⬅️ Orqaga |
| `common.cancel` | ✖️ Отмена | ✖️ Bekor qilish |
| `common.saved` | ✅ Сохранено | ✅ Saqlandi |
| `common.staleButton` | Эта кнопка устарела. Откройте меню: /menu | Bu tugma eskirgan. Menyuni oching: /menu |
| `common.useMenu` | Не понял сообщение. Воспользуйтесь кнопками меню. | Xabaringizni tushunmadim. Menyu tugmalaridan foydalaning. |
| `common.openMenu` | 📋 Открыть меню | 📋 Menyuni ochish |
| `common.error` | ⚠️ Что-то пошло не так. Попробуйте ещё раз или откройте /menu. | ⚠️ Xatolik yuz berdi. Qaytadan urinib koʻring yoki /menu ni oching. |
| `common.sum` | сум | soʻm |
| `role.choose` | Кто вы?<br><br><b>Мастер</b> — принимаете клиентов и хотите онлайн-запись.<br><b>Клиент</b> — хотите записаться к мастеру. | Siz kimsiz?<br><br><b>Usta</b> — mijozlarni qabul qilasiz va ular onlayn yozilishini xohlaysiz.<br><b>Mijoz</b> — ustaga yozilmoqchisiz. |
| `role.master` | 💼 Я мастер | 💼 Men ustaman |
| `role.client` | 🙋 Я клиент | 🙋 Men mijozman |
| `menu.master` | <b>{name}</b>, это ваше меню.<br>{sub} | <b>{name}</b>, bu sizning menyungiz.<br>{sub} |
| `menu.today` | 📅 Сегодня | 📅 Bugun |
| `menu.tomorrow` | 📅 Завтра | 📅 Ertaga |
| `menu.week` | 📅 Неделя | 📅 Hafta |
| `menu.services` | 💼 Услуги | 💼 Xizmatlar |
| `menu.schedule` | 🕐 График и выходные | 🕐 Ish jadvali |
| `menu.prepayment` | 💳 Предоплата | 💳 Oldindan toʻlov |
| `menu.location` | 📍 Адрес | 📍 Manzil |
| `menu.link` | 🔗 Моя ссылка | 🔗 Mening havolam |
| `menu.subscription` | 💎 Подписка | 💎 Obuna |
| `menu.language` | 🌐 Язык | 🌐 Til |
| `menu.myAsClient` | 📋 Мои записи (как клиент) | 📋 Yozilishlarim (mijoz sifatida) |
| `menu.app` | 📱 Открыть приложение | 📱 Ilovani ochish |
| `menu.appShort` | Приложение | Ilova |
| `menu.stats` | 📊 Статистика | 📊 Statistika |
| `menu.clients` | 👥 Клиенты | 👥 Mijozlar |
| `menu.profile` | 🖼 Профиль | 🖼 Profil |
| `menu.invite` | 🎁 Пригласить мастера | 🎁 Ustani taklif qilish |
| `reg.askName` | Давайте настроим онлайн-запись. Это займёт 3–5 минут.<br><br><b>Шаг 1 из 5.</b> Как вас будут видеть клиенты? Напишите имя или название студии.<br><br>Например: <i>Малика — маникюр</i> | Keling, onlayn yozilishni sozlaymiz. Bu 3–5 daqiqa vaqt oladi.<br><br><b>1/5-qadam.</b> Mijozlar qaysi nomni koʻrsin? Ismingiz yoki studiya nomini yozing.<br><br>Masalan: <i>Malika — manikyur</i> |
| `reg.badName` | Имя должно быть от 1 до 48 символов. Попробуйте ещё раз. | Ism 1 dan 48 tagacha belgidan iborat boʻlishi kerak. Qaytadan urinib koʻring. |
| `reg.askPhone` | <b>Шаг 2 из 5.</b> Ваш номер телефона — его увидят клиенты, если нужно будет связаться.<br><br>Нажмите кнопку ниже или напишите номер. | <b>2/5-qadam.</b> Telefon raqamingiz — mijozlar siz bilan bogʻlanishi kerak boʻlsa, uni koʻradi.<br><br>Pastdagi tugmani bosing yoki raqamni yozing. |
| `reg.sharePhone` | 📱 Поделиться контактом | 📱 Raqamni yuborish |
| `reg.badPhone` | Не похоже на номер телефона. Пример: +998901234567 | Bu telefon raqamiga oʻxshamaydi. Masalan: +998901234567 |
| `reg.phoneSaved` | ✅ Телефон сохранён.<br><br><b>Шаг 3 из 5.</b> Добавьте услуги. | ✅ Telefon saqlandi.<br><br><b>3/5-qadam.</b> Xizmatlaringizni qoʻshing. |
| `reg.scheduleStep` | <b>Шаг 4 из 5.</b> Укажите график работы.<br> | <b>4/5-qadam.</b> Ish jadvalingizni belgilang.<br> |
| `reg.next` | Далее ➡️ | Davom etish ➡️ |
| `reg.finish` | Завершить регистрацию ✅ | Roʻyxatdan oʻtishni yakunlash ✅ |
| `reg.needService` | Добавьте хотя бы одну услугу. | Kamida bitta xizmat qoʻshing. |
| `reg.needWorkingDay` | Отметьте хотя бы один рабочий день. | Kamida bitta ish kunini belgilang. |
| `reg.done` | 🎉 Готово, {name}! Онлайн-запись включена.<br><br>Пробный период — {days} {days#день\|дня\|дней} бесплатно. | 🎉 Tayyor, {name}! Onlayn yozilish yoqildi.<br><br>Sinov muddati — {days} kun bepul. |
| `svc.title` | <b>⚙️ Услуги</b> | <b>⚙️ Xizmatlar</b> |
| `svc.empty` | Пока нет ни одной услуги. | Hozircha birorta ham xizmat yoʻq. |
| `svc.line` | {title} — {duration} мин — {price} сум{off} | {title} — {duration} daq — {price} soʻm{off} |
| `svc.offMark` |  (отключена) |  (oʻchirilgan) |
| `svc.add` | ➕ Добавить услугу | ➕ Xizmat qoʻshish |
| `svc.view` | <b>{title}</b><br><br>Длительность: {duration} мин<br>Цена: {price} сум<br>Статус: {status} | <b>{title}</b><br><br>Davomiyligi: {duration} daq<br>Narxi: {price} soʻm<br>Holati: {status} |
| `svc.statusOn` | ✅ включена | ✅ yoqilgan |
| `svc.statusOff` | ⏸ отключена — клиенты её не видят | ⏸ oʻchirilgan — mijozlar uni koʻrmaydi |
| `svc.editTitle` | ✏️ Название | ✏️ Nomi |
| `svc.editDuration` | ⏱ Длительность | ⏱ Davomiyligi |
| `svc.editPrice` | 💰 Цена | 💰 Narxi |
| `svc.disable` | ⏸ Отключить | ⏸ Oʻchirish |
| `svc.enable` | ▶️ Включить | ▶️ Yoqish |
| `svc.askTitle` | Напишите название услуги.<br><br>Например: <i>Маникюр с покрытием</i> | Xizmat nomini yozing.<br><br>Masalan: <i>Qoplamali manikyur</i> |
| `svc.badTitle` | Название должно быть от 1 до 48 символов. | Nom 1 dan 48 tagacha belgidan iborat boʻlishi kerak. |
| `svc.askDuration` | Сколько минут длится услуга? Выберите или напишите число. | Xizmat necha daqiqa davom etadi? Tanlang yoki raqam yozing. |
| `svc.badDuration` | Напишите длительность числом в минутах, от 5 до 720. Например: 75 | Davomiylikni daqiqalarda, 5 dan 720 gacha raqam bilan yozing. Masalan: 75 |
| `svc.askPrice` | Цена в сумах? Напишите число.<br><br>Например: <i>120000</i> | Narxi necha soʻm? Raqam yozing.<br><br>Masalan: <i>120000</i> |
| `svc.badPrice` | Напишите цену числом, без букв. Например: 120000 | Narxni harflarsiz, raqam bilan yozing. Masalan: 120000 |
| `svc.added` | ✅ Услуга «{title}» добавлена. | ✅ «{title}» xizmati qoʻshildi. |
| `days.short.mon` | Пн | Du |
| `days.short.tue` | Вт | Se |
| `days.short.wed` | Ср | Ch |
| `days.short.thu` | Чт | Pa |
| `days.short.fri` | Пт | Ju |
| `days.short.sat` | Сб | Sh |
| `days.short.sun` | Вс | Ya |
| `days.full.mon` | Понедельник | Dushanba |
| `days.full.tue` | Вторник | Seshanba |
| `days.full.wed` | Среда | Chorshanba |
| `days.full.thu` | Четверг | Payshanba |
| `days.full.fri` | Пятница | Juma |
| `days.full.sat` | Суббота | Shanba |
| `days.full.sun` | Воскресенье | Yakshanba |
| `sch.title` | <b>🕐 График работы</b> | <b>🕐 Ish jadvali</b> |
| `sch.hint` | Нажмите на день, чтобы изменить его. | Oʻzgartirish uchun kunni bosing. |
| `sch.dayOff` | выходной | dam olish kuni |
| `sch.breaksInline` |  (перерыв {list}) |  (tanaffus {list}) |
| `sch.sameWeekdays` | 📋 Одинаково для всех будних | 📋 Du–Ju uchun bir xil |
| `sch.hours` | Часы работы: {start}–{end} | Ish vaqti: {start}–{end} |
| `sch.breaks` | Перерывы: {list} | Tanaffuslar: {list} |
| `sch.noBreaks` | Перерывов нет | Tanaffus yoʻq |
| `sch.makeOff` | 🚫 Сделать выходным | 🚫 Dam olish kuni qilish |
| `sch.makeWorking` | ✅ Сделать рабочим | ✅ Ish kuni qilish |
| `sch.editHours` | 🕐 Изменить часы | 🕐 Ish vaqtini oʻzgartirish |
| `sch.addBreak` | ➕ Перерыв | ➕ Tanaffus |
| `sch.clearBreaks` | 🗑 Убрать перерывы | 🗑 Tanaffuslarni olib tashlash |
| `sch.askHours` | {day}: напишите время начала и конца работы.<br><br>Например: <i>09:00-19:00</i> | {day}: ish qachon boshlanib, qachon tugashini yozing.<br><br>Masalan: <i>09:00-19:00</i> |
| `sch.askWeekdays` | Часы работы с понедельника по пятницу.<br><br>Например: <i>09:00-19:00</i> | Dushanbadan jumagacha ish vaqtini yozing.<br><br>Masalan: <i>09:00-19:00</i> |
| `sch.askWeekdaysBreak` | Есть общий перерыв в будни? Напишите его время, например <i>13:00-14:00</i>, или нажмите кнопку. | Ish kunlarida umumiy tanaffus bormi? Vaqtini yozing, masalan <i>13:00-14:00</i>, yoki tugmani bosing. |
| `sch.noBreakButton` | Без перерыва | Tanaffussiz |
| `sch.askBreak` | Напишите время перерыва.<br><br>Например: <i>13:00-14:00</i> | Tanaffus vaqtini yozing.<br><br>Masalan: <i>13:00-14:00</i> |
| `sch.badRange` | Нужен формат ЧЧ:ММ-ЧЧ:ММ, начало раньше конца. Например: 09:00-19:00 или просто 9-19 | Vaqtni SS:DD-SS:DD koʻrinishida yozing, boshlanishi tugashidan oldin boʻlsin. Masalan: 09:00-19:00 yoki shunchaki 9-19 |
| `sch.badBreak` | Перерыв должен быть внутри рабочего времени ({start}–{end}) и не пересекаться с другими перерывами. | Tanaffus ish vaqti ichida ({start}–{end}) boʻlishi va boshqa tanaffuslar bilan kesishmasligi kerak. |
| `off.button` | 📅 Выходные даты | 📅 Dam olish sanalari |
| `off.title` | <b>📅 Выходные даты</b><br>В эти дни записи не будет. | <b>📅 Dam olish sanalari</b><br>Bu kunlarda yozilish boʻlmaydi. |
| `off.empty` | Отдельных выходных нет. | Alohida dam olish kunlari yoʻq. |
| `off.add` | ➕ Добавить дату | ➕ Sana qoʻshish |
| `off.ask` | Напишите дату выходного или период отпуска.<br><br>Например: <i>25.12</i>, <i>25.12.2026</i> или <i>25.12-05.01</i> | Dam olish sanasini yoki taʼtil davrini yozing.<br><br>Masalan: <i>25.12</i>, <i>25.12.2026</i> yoki <i>25.12-05.01</i> |
| `off.badDate` | Не понял дату или она уже прошла. Формат: ДД.ММ, ДД.ММ.ГГГГ или период ДД.ММ-ДД.ММ (до 62 дней). | Sanani tushunmadim yoki u oʻtib ketgan. Format: KK.OO, KK.OO.YYYY yoki davr KK.OO-KK.OO (62 kungacha). |
| `off.added` | ✅ {date} — выходной. | ✅ {date} — dam olish kuni. |
| `off.addedWithBookings` | ✅ {date} — выходной.<br><br>⚠️ На этот день уже есть записи: {count}. Они не отменены — свяжитесь с клиентами. | ✅ {date} — dam olish kuni.<br><br>⚠️ Bu kunga allaqachon {count} ta yozilish bor. Ular bekor qilinmadi — mijozlar bilan bogʻlaning. |
| `set.button` | ⚙️ Настройки записи | ⚙️ Yozilish sozlamalari |
| `set.title` | <b>⚙️ Настройки записи</b><br><br>Шаг времени: {step}<br>Перерыв между клиентами: {buf}<br>Запись вперёд: на {hor}<br>Минимум до записи: {ntc}<br>«Пора снова?» клиенту через: {rbk} | <b>⚙️ Yozilish sozlamalari</b><br><br>Vaqt qadami: {step}<br>Mijozlar orasidagi tanaffus: {buf}<br>Oldindan yozilish: {hor}<br>Yozilishgacha eng kam vaqt: {ntc}<br>Mijozga «yana vaqt keldi?»: {rbk} |
| `set.label.step` | Шаг времени (09:00, 09:30…) | Vaqt qadami (09:00, 09:30…) |
| `set.label.buf` | Перерыв между клиентами | Mijozlar orasidagi tanaffus |
| `set.label.hor` | На сколько дней вперёд | Necha kun oldinga yozilish mumkin |
| `set.label.ntc` | Минимум времени до записи | Yozilishgacha eng kam vaqt |
| `set.label.rbk` | Напомнить клиенту «пора снова» через | Mijozga «yana vaqt keldi» eslatmasi |
| `set.minutes` | {n} мин | {n} daq |
| `set.hours` | {n} ч | {n} soat |
| `set.days` | {n} дн. | {n} kun |
| `set.off` | выкл | oʻchiq |
| `pp.askNeed` | <b>Шаг 5 из 5. Предоплата</b><br><br>Предоплата защищает от неявок: клиент переводит часть суммы на вашу карту и отправляет скриншот, вы подтверждаете.<br><br>Деньги идут напрямую вам — бот их не принимает.<br><br>Нужна предоплата? | <b>5/5-qadam. Oldindan toʻlov</b><br><br>Oldindan toʻlov mijozlar kelmay qolishidan himoya qiladi: mijoz summaning bir qismini kartangizga oʻtkazadi va skrinshot yuboradi, siz tasdiqlaysiz.<br><br>Pul toʻgʻridan-toʻgʻri sizga tushadi — bot uni qabul qilmaydi.<br><br>Oldindan toʻlov kerakmi? |
| `pp.yes` | ✅ Да, нужна | ✅ Ha, kerak |
| `pp.no` | ➡️ Нет, без предоплаты | ➡️ Yoʻq, oldindan toʻlovsiz |
| `pp.off` | <b>💳 Предоплата выключена</b><br><br>Клиенты записываются без оплаты. | <b>💳 Oldindan toʻlov oʻchirilgan</b><br><br>Mijozlar toʻlovsiz yoziladi. |
| `pp.on` | <b>💳 Предоплата включена</b><br><br>Сумма: {amount} сум<br>Карта: <code>{card}</code><br>На имя: {holder}<br>На оплату у клиента: {timeout} мин | <b>💳 Oldindan toʻlov yoqilgan</b><br><br>Summa: {amount} soʻm<br>Karta: <code>{card}</code><br>Egasi: {holder}<br>Mijozga toʻlov uchun: {timeout} daq |
| `pp.enable` | ▶️ Включить предоплату | ▶️ Oldindan toʻlovni yoqish |
| `pp.disable` | ⏸ Выключить предоплату | ⏸ Oldindan toʻlovni oʻchirish |
| `pp.editAmount` | 💰 Сумма | 💰 Summa |
| `pp.editCard` | 💳 Карта | 💳 Karta |
| `pp.editHolder` | 👤 Имя на карте | 👤 Karta egasi |
| `pp.askAmount` | Сумма предоплаты в сумах?<br><br>Например: <i>30000</i> | Oldindan toʻlov summasi necha soʻm?<br><br>Masalan: <i>30000</i> |
| `pp.badAmount` | Напишите сумму числом больше нуля. Например: 30000 | Summani noldan katta raqam bilan yozing. Masalan: 30000 |
| `pp.askCard` | Номер карты (16 цифр), на которую клиенты будут переводить предоплату. | Mijozlar oldindan toʻlovni oʻtkazadigan karta raqami (16 ta raqam). |
| `pp.badCard` | Номер карты — ровно 16 цифр. Например: 8600 1234 5678 9012 | Karta raqami — aniq 16 ta raqam. Masalan: 8600 1234 5678 9012 |
| `pp.askHolder` | Имя владельца карты — как его увидит клиент при переводе. | Karta egasining ismi — mijoz pul oʻtkazayotganda shuni koʻradi. |
| `pp.badHolder` | Имя должно быть от 1 до 64 символов. | Ism 1 dan 64 tagacha belgidan iborat boʻlishi kerak. |
| `link.text` | 🔗 <b>Ваша ссылка для записи:</b><br>{link}<br><br>Отправляйте её клиентам или поставьте в профиль Instagram.<br><br><b>Готовый текст для Instagram:</b><br><code>{promo}</code> | 🔗 <b>Yozilish uchun havolangiz:</b><br>{link}<br><br>Uni mijozlarga yuboring yoki Instagram profilingizga qoʻying.<br><br><b>Instagram uchun tayyor matn:</b><br><code>{promo}</code> |
| `link.promo` | 📅 Онлайн-запись: {name}. Выберите услугу и удобное время за минуту, без переписки 👉 {link} | 📅 Onlayn yozilish — {name}. Xizmat va qulay vaqtni bir daqiqada, yozishmasdan tanlang 👉 {link} |
| `link.qrBtn` | 📇 QR-код для печати | 📇 Chop etish uchun QR-kod |
| `link.qrCaption` | 📅 <b>{name}</b> — онлайн-запись<br><br>Наведите камеру телефона на код или откройте: {link} | 📅 <b>{name}</b> — onlayn yozilish<br><br>Telefon kamerasini kodga qarating yoki oching: {link} |
| `bk.title.today` | <b>📅 Записи на сегодня</b> | <b>📅 Bugungi yozilishlar</b> |
| `bk.title.tomorrow` | <b>📅 Записи на завтра</b> | <b>📅 Ertangi yozilishlar</b> |
| `bk.title.week` | <b>📅 Записи на неделю</b> | <b>📅 Haftalik yozilishlar</b> |
| `bk.empty` | Записей нет. | Yozilishlar yoʻq. |
| `bk.line` | {start}–{end} · {service} · {client} {phone} · {price} сум · {status} | {start}–{end} · {service} · {client} {phone} · {price} soʻm · {status} |
| `bk.blockLine` | {start}–{end} · 🚫 время закрыто | {start}–{end} · 🚫 vaqt yopilgan |
| `bk.blockShort` | 🚫 закрыто | 🚫 yopilgan |
| `status.pending_payment` | ⏳ ждёт оплату | ⏳ toʻlov kutilmoqda |
| `status.payment_review` | 🔍 проверка оплаты | 🔍 toʻlov tekshirilmoqda |
| `status.confirmed` | ✅ подтверждена | ✅ tasdiqlangan |
| `status.cancelled_by_client` | ❌ отменена клиентом | ❌ mijoz bekor qildi |
| `status.cancelled_by_master` | ❌ отменена мастером | ❌ usta bekor qildi |
| `status.expired` | ⌛ не оплачена | ⌛ toʻlanmadi |
| `status.completed` | ✔️ состоялась | ✔️ boʻlib oʻtdi |
| `status.no_show` | 🚫 не пришёл | 🚫 kelmadi |
| `sub.line.trial` | 💎 Пробный период до {until} | 💎 Sinov muddati {until} gacha |
| `sub.line.active` | 💎 Подписка активна до {until} | 💎 Obuna {until} gacha faol |
| `sub.line.expired` | ⚠️ Подписка закончилась — клиенты не могут записаться | ⚠️ Obuna tugadi — mijozlar yozila olmaydi |
| `sub.status.trial` | пробный период | sinov muddati |
| `sub.status.active` | активна | faol |
| `sub.status.expired` | закончилась | tugagan |
| `sub.screen` | <b>💎 Подписка</b><br><br>Статус: {status}<br>До: {until}<br>Осталось дней: {days} | <b>💎 Obuna</b><br><br>Holati: {status}<br>Gacha: {until}<br>Qolgan kunlar: {days} |
| `sub.priceLine` | Цена: <b>{price} сум</b> за {days} {days#день\|дня\|дней} | Narxi: {days} kun uchun <b>{price} soʻm</b> |
| `sub.payBtn` | 💳 Оплатить подписку | 💳 Obunani toʻlash |
| `sub.noCard` | Реквизиты для оплаты ещё не настроены. Напишите администратору сервиса. | Toʻlov rekvizitlari hali sozlanmagan. Servis administratoriga yozing. |
| `sub.payInfo` | <b>💳 Оплата подписки</b><br><br>Переведите <b>{price} сум</b> на карту:<br><code>{card}</code><br>{holder}<br><br>Затем нажмите «Я оплатил» и отправьте скриншот перевода. После проверки подписка продлится на {days} {days#день\|дня\|дней}. | <b>💳 Obuna toʻlovi</b><br><br>Kartaga <b>{price} soʻm</b> oʻtkazing:<br><code>{card}</code><br>{holder}<br><br>Soʻng «Toʻladim» tugmasini bosing va oʻtkazma skrinshotini yuboring. Tekshiruvdan soʻng obuna {days} kunga uzayadi. |
| `sub.paidBtn` | ✅ Я оплатил | ✅ Toʻladim |
| `sub.askScreenshot` | Отправьте скриншот перевода (фото). | Oʻtkazma skrinshotini (rasm) yuboring. |
| `sub.sent` | 📨 Скриншот отправлен на проверку. Обычно это занимает до нескольких часов — придёт сообщение. | 📨 Skrinshot tekshiruvga yuborildi. Odatda bu bir necha soat ichida koʻrib chiqiladi — natija haqida xabar keladi. |
| `sub.pendingNote` | ⏳ Ваша оплата на проверке. | ⏳ Toʻlovingiz tekshirilmoqda. |
| `sub.approved` | ✅ <b>Оплата подписки подтверждена!</b><br><br>Подписка активна до {until}. Спасибо! | ✅ <b>Obuna toʻlovi tasdiqlandi!</b><br><br>Obuna {until} gacha faol. Rahmat! |
| `sub.rejected` | ❌ Оплата подписки не подтверждена — перевод не найден. Если вы переводили деньги, напишите администратору. | ❌ Obuna toʻlovi tasdiqlanmadi — oʻtkazma topilmadi. Agar pul oʻtkazgan boʻlsangiz, administratorga yozing. |
| `sub.extendedByAdmin` | 🎁 Подписка продлена на {days} дн. — до {until}. | 🎁 Obuna {days} kunga uzaytirildi — {until} gacha. |
| `sub.reminder` | ⏳ <b>Подписка заканчивается {until}</b> (осталось дней: {days}).<br><br>После этого клиенты не смогут записываться онлайн. Продлите за {price} сум. | ⏳ <b>Obuna {until} kuni tugaydi</b> (qolgan kunlar: {days}).<br><br>Shundan soʻng mijozlar onlayn yozila olmaydi. {price} soʻmga uzaytiring. |
| `sub.expiredNotice` | ⚠️ <b>Подписка закончилась.</b><br><br>Новые онлайн-записи приостановлены, уже созданные записи остаются в силе. Продлите за {price} сум, чтобы клиенты снова могли записываться. | ⚠️ <b>Obuna tugadi.</b><br><br>Yangi onlayn yozilishlar toʻxtatildi, mavjud yozilishlar kuchda qoladi. Mijozlar yana yozila olishi uchun {price} soʻmga uzaytiring. |
| `client.home` | Чтобы записаться, откройте ссылку, которую дал вам мастер. | Yozilish uchun usta bergan havolani oching. |
| `client.homeWithMasters` | Ваши мастера — запишитесь снова в одно касание. К новому мастеру — по его ссылке. | Sizning ustalaringiz — bir bosishda qayta yoziling. Yangi ustaga — uning havolasi orqali. |
| `client.bookAt` | 📅 Записаться: {name} | 📅 Yozilish: {name} |
| `client.masterNotFound` | Мастер не найден. Проверьте ссылку или попросите у мастера новую. | Usta topilmadi. Havolani tekshiring yoki ustadan yangisini soʻrang. |
| `client.sessionLost` | Не понял, к какому мастеру вы записываетесь. Откройте ссылку мастера ещё раз. | Qaysi ustaga yozilayotganingizni tushunmadim. Usta havolasini qaytadan oching. |
| `client.unavailable` | Онлайн-запись к <b>{name}</b> временно недоступна.<br><br>Запишитесь напрямую по телефону: {phone} | Usta <b>{name}</b>: onlayn yozilish vaqtincha mavjud emas.<br><br>Telefon orqali toʻgʻridan-toʻgʻri yoziling: {phone} |
| `client.askName` | Как вас зовут? Мастер увидит это имя в записи. | Ismingiz nima? Usta yozilishda shu ismni koʻradi. |
| `client.useTgName` | ✅ {name} | ✅ {name} |
| `client.askPhone` | Ваш номер телефона — чтобы мастер мог связаться с вами. Нажмите кнопку ниже или напишите номер. | Telefon raqamingiz — usta siz bilan bogʻlana olishi uchun. Pastdagi tugmani bosing yoki raqamni yozing. |
| `client.profileSaved` | ✅ Спасибо! | ✅ Rahmat! |
| `client.chooseService` | Запись к <b>{name}</b>{rating}<br><br>Выберите услугу: | Usta: <b>{name}</b>{rating}<br><br>Xizmatni tanlang: |
| `client.serviceBtn` | {title} · {duration} мин · {price} сум | {title} · {duration} daq · {price} soʻm |
| `client.noServices` | У <b>{name}</b> пока нет услуг для онлайн-записи.<br><br>Телефон мастера: {phone} | Usta <b>{name}</b>: hozircha onlayn yozilish uchun xizmatlar yoʻq.<br><br>Usta telefoni: {phone} |
| `client.chooseDate` | <b>{service}</b><br><br>Выберите день: | <b>{service}</b><br><br>Kunni tanlang: |
| `client.chooseDateReschedule` | 🔄 Перенос: <b>{service}</b><br><br>Выберите новый день: | 🔄 Koʻchirish: <b>{service}</b><br><br>Yangi kunni tanlang: |
| `client.noDates` | На ближайшие дни свободного времени на «{service}» нет.<br><br>Телефон мастера: {phone} | Yaqin kunlarda «{service}» uchun boʻsh vaqt yoʻq.<br><br>Usta telefoni: {phone} |
| `client.today` | Сегодня | Bugun |
| `client.tomorrow` | Завтра | Ertaga |
| `client.chooseTime` | <b>{service}</b>, {date}<br><br>Выберите время: | <b>{service}</b>, {date}<br><br>Vaqtni tanlang: |
| `client.noTimes` | На этот день свободное время закончилось. Выберите другой день. | Bu kunga boʻsh vaqt qolmadi. Boshqa kunni tanlang. |
| `client.confirm` | Проверьте запись:<br><br>Мастер: <b>{master}</b><br>Услуга: {service} ({duration} мин)<br>Когда: <b>{date}, {time}</b><br>Цена: {price} сум | Yozilishni tekshiring:<br><br>Usta: <b>{master}</b><br>Xizmat: {service} ({duration} daq)<br>Qachon: <b>{date}, {time}</b><br>Narxi: {price} soʻm |
| `client.confirmReschedule` | Перенести запись на новое время?<br><br>Мастер: <b>{master}</b><br>Услуга: {service} ({duration} мин)<br>Новое время: <b>{date}, {time}</b> | Yozilish yangi vaqtga koʻchirilsinmi?<br><br>Usta: <b>{master}</b><br>Xizmat: {service} ({duration} daq)<br>Yangi vaqt: <b>{date}, {time}</b> |
| `client.confirmBtn` | ✅ Записаться | ✅ Yozilaman |
| `client.booked` | ✅ Вы записаны!<br><br>Мастер: <b>{master}</b><br>Услуга: {service}<br>Когда: <b>{date}, {time}</b><br>Цена: {price} сум<br><br>Телефон мастера: {phone}<br>Напомним о записи заранее. | ✅ Siz yozildingiz!<br><br>Usta: <b>{master}</b><br>Xizmat: {service}<br>Qachon: <b>{date}, {time}</b><br>Narxi: {price} soʻm<br><br>Usta telefoni: {phone}<br>Yozilish haqida oldindan eslatamiz. |
| `client.rescheduled` | ✅ Запись перенесена.<br><br>Мастер: <b>{master}</b><br>Услуга: {service}<br>Новое время: <b>{date}, {time}</b> | ✅ Yozilish koʻchirildi.<br><br>Usta: <b>{master}</b><br>Xizmat: {service}<br>Yangi vaqt: <b>{date}, {time}</b> |
| `client.slotTaken` | Это время только что заняли. Выберите другое. | Bu vaqt hozirgina band qilindi. Boshqasini tanlang. |
| `client.tooMany` | У вас уже есть активные записи к этому мастеру ({n}). Новую можно сделать, когда одна из них пройдёт, или отменив одну. | Sizda bu ustada allaqachon {n} ta faol yozilish bor. Yangisi uchun ulardan biri oʻtishini kuting yoki bittasini bekor qiling. |
| `client.cannotReschedule` | Эту запись уже нельзя перенести. | Bu yozilishni endi koʻchirib boʻlmaydi. |
| `client.confirmPrepay` | 💳 Нужна предоплата <b>{amount} сум</b> на карту мастера — реквизиты покажем после подтверждения. На оплату {minutes} мин. | 💳 Usta kartasiga <b>{amount} soʻm</b> oldindan toʻlash kerak — karta raqamini tasdiqlaganingizdan keyin koʻrsatamiz. Toʻlash uchun {minutes} daqiqa vaqt beriladi. |
| `client.payInfo` | ⏳ <b>Время забронировано — ждём предоплату</b><br><br>{service}, <b>{date}, {time}</b><br>Мастер: {master}<br><br>Переведите <b>{amount} сум</b> на карту мастера:<br><code>{card}</code><br>{holder}<br><br>Затем нажмите «Я оплатил» и отправьте скриншот перевода <b>до {deadline}</b>. Если скриншота не будет, время освободится.<br><br>Деньги идут напрямую мастеру. | ⏳ <b>Vaqt band qilindi — oldindan toʻlovni kutamiz</b><br><br>{service}, <b>{date}, {time}</b><br>Usta: {master}<br><br>Usta kartasiga <b>{amount} soʻm</b> oʻtkazing:<br><code>{card}</code><br>{holder}<br><br>Soʻng «Toʻladim» tugmasini bosing va oʻtkazma skrinshotini <b>soat {deadline} gacha</b> yuboring. Skrinshot kelmasa, vaqt boʻshatiladi.<br><br>Pul toʻgʻridan-toʻgʻri ustaga tushadi. |
| `client.paidBtn` | ✅ Я оплатил | ✅ Toʻladim |
| `client.askScreenshot` | Отправьте скриншот перевода (фото). | Oʻtkazma skrinshotini (rasm) yuboring. |
| `client.needPhoto` | Нужен скриншот перевода — отправьте его как фото. | Oʻtkazma skrinshoti kerak — uni rasm qilib yuboring. |
| `client.screenshotSent` | 📨 Скриншот отправлен мастеру. Как только мастер подтвердит оплату, придёт сообщение. | 📨 Skrinshot ustaga yuborildi. Usta toʻlovni tasdiqlashi bilanoq xabar keladi. |
| `client.notPending` | Эта запись больше не ждёт оплату. Посмотрите «📋 Мои записи». | Bu yozilish endi toʻlovni kutmayapti. «📋 Yozilishlarim»ni koʻring. |
| `client.paymentApproved` | ✅ <b>Оплата подтверждена — вы записаны!</b><br><br>Мастер: <b>{master}</b><br>{service}, <b>{date}, {time}</b><br><br>Телефон мастера: {phone} | ✅ <b>Toʻlov tasdiqlandi — siz yozildingiz!</b><br><br>Usta: <b>{master}</b><br>{service}, <b>{date}, {time}</b><br><br>Usta telefoni: {phone} |
| `client.paymentRejected` | ❌ <b>Мастер не нашёл вашу оплату</b>, запись отменена: {service}, {date}, {time}.<br><br>Если вы переводили деньги, свяжитесь с мастером: {phone} | ❌ <b>Usta toʻlovingizni topmadi</b>, yozilish bekor qilindi: {service}, {date}, {time}.<br><br>Agar pul oʻtkazgan boʻlsangiz, usta bilan bogʻlaning: {phone} |
| `client.paymentExpired` | ⌛ Скриншот оплаты не пришёл вовремя, запись отменена: {service}, {date}, {time}. Время освобождено.<br><br>Можно записаться заново по ссылке мастера. | ⌛ Toʻlov skrinshoti oʻz vaqtida kelmadi, yozilish bekor qilindi: {service}, {date}, {time}. Vaqt boʻshatildi.<br><br>Usta havolasi orqali qaytadan yozilish mumkin. |
| `client.cardPayDetails` | Переведите <b>{amount} сум</b> на карту:<br><code>{card}</code><br>{holder}<br><br>Скриншот — <b>до {deadline}</b>. | Kartaga <b>{amount} soʻm</b> oʻtkazing:<br><code>{card}</code><br>{holder}<br><br>Skrinshotni <b>soat {deadline} gacha</b> yuboring. |
| `client.cardReview` | 🔍 Скриншот у мастера на проверке. | 🔍 Skrinshot ustada tekshirilmoqda. |
| `client.myButton` | 📋 Мои записи | 📋 Yozilishlarim |
| `client.myTitle` | <b>📋 Мои записи</b><br><br>Нажмите на запись, чтобы отменить или перенести. | <b>📋 Yozilishlarim</b><br><br>Bekor qilish yoki koʻchirish uchun yozilishni bosing. |
| `client.myEmpty` | У вас нет предстоящих записей. | Sizda kelgusi yozilishlar yoʻq. |
| `client.myItem` | {date} {time} · {service} · {master} | {date} {time} · {service} · {master} |
| `client.card` | Мастер: <b>{master}</b><br>Телефон: {phone}<br>Услуга: {service}<br>Когда: <b>{date}, {time}</b><br>Цена: {price} сум<br>Статус: {status} | Usta: <b>{master}</b><br>Telefon: {phone}<br>Xizmat: {service}<br>Qachon: <b>{date}, {time}</b><br>Narxi: {price} soʻm<br>Holati: {status} |
| `client.cardPrepaid` | Предоплата: {amount} сум | Oldindan toʻlov: {amount} soʻm |
| `client.tooLateNote` | До записи меньше 2 часов — отменить или перенести её можно только через мастера. | Yozilishgacha 2 soatdan kam qoldi — uni faqat usta orqali bekor qilish yoki koʻchirish mumkin. |
| `client.rescheduleBtn` | 🔄 Перенести | 🔄 Koʻchirish |
| `client.cancelBtn` | ❌ Отменить | ❌ Bekor qilish |
| `client.bookAgain` | ➕ Записаться ещё | ➕ Yana yozilish |
| `client.cancelAsk` | Отменить запись?<br><br>{service}, {date}, {time} | Yozilishni bekor qilasizmi?<br><br>{service}, {date}, {time} |
| `client.cancelYes` | ❌ Да, отменить | ❌ Ha, bekor qilish |
| `client.cancelNo` | ⬅️ Нет, оставить | ⬅️ Yoʻq, qoldirish |
| `client.cancelled` | ✅ Запись отменена. Мастер получит уведомление. | ✅ Yozilish bekor qilindi. Ustaga xabar beramiz. |
| `client.cancelledUnpaid` | ✅ Запись отменена, время освобождено. | ✅ Yozilish bekor qilindi, vaqt boʻshatildi. |
| `client.cancelledPrepaid` | Вы вносили предоплату — о возврате договоритесь с мастером напрямую: {phone} | Siz oldindan toʻlagansiz — pulni qaytarish haqida usta bilan toʻgʻridan-toʻgʻri kelishib oling: {phone} |
| `client.tooLate` | Отменить или перенести можно не позже чем за 2 часа до записи. Свяжитесь с мастером: {phone} | Bekor qilish yoki koʻchirish yozilishdan kamida 2 soat oldin mumkin. Usta bilan bogʻlaning: {phone} |
| `notify.openBtn` | 📋 Открыть запись | 📋 Yozilishni ochish |
| `notify.writeBtn` | 💬 Написать клиенту | 💬 Mijozga yozish |
| `notify.newBooking` | 🆕 <b>Новая запись</b><br><br>{client}, {phone}<br>{service}<br><b>{date}, {time}</b><br>{price} сум | 🆕 <b>Yangi yozilish</b><br><br>{client}, {phone}<br>{service}<br><b>{date}, {time}</b><br>{price} soʻm |
| `notify.cancelled` | ❌ <b>Запись отменена клиентом</b><br><br>{client}, {phone}<br>{service}<br>{date}, {time}<br><br>Это время снова свободно. | ❌ <b>Mijoz yozilishni bekor qildi</b><br><br>{client}, {phone}<br>{service}<br>{date}, {time}<br><br>Bu vaqt yana boʻsh. |
| `notify.rescheduled` | 🔄 <b>Клиент перенёс запись</b><br><br>{client}, {phone}<br>{service}<br>Было: {oldDate}, {oldTime}<br>Стало: <b>{date}, {time}</b> | 🔄 <b>Mijoz yozilishni koʻchirdi</b><br><br>{client}, {phone}<br>{service}<br>Avval: {oldDate}, {oldTime}<br>Endi: <b>{date}, {time}</b> |
| `pm.review` | 💳 <b>Предоплата — проверьте поступление</b><br><br>{client}, {phone}<br>{service}<br><b>{date}, {time}</b><br>Сумма: {amount} сум | 💳 <b>Oldindan toʻlov — tushumni tekshiring</b><br><br>{client}, {phone}<br>{service}<br><b>{date}, {time}</b><br>Summa: {amount} soʻm |
| `pm.okBtn` | ✅ Оплата получена | ✅ Toʻlov keldi |
| `pm.noBtn` | ❌ Оплаты нет | ❌ Toʻlov yoʻq |
| `pm.approvedMark` | ✅ Оплата подтверждена — клиент записан. | ✅ Toʻlov tasdiqlandi — mijoz yozildi. |
| `pm.rejectedMark` | ❌ Оплата не найдена — запись отменена, время свободно. | ❌ Toʻlov topilmadi — yozilish bekor qilindi, vaqt boʻsh. |
| `pm.notActive` | Эта запись уже не ждёт проверки оплаты. | Bu yozilish endi toʻlov tekshiruvini kutmayapti. |
| `rem.today` | сегодня | bugun |
| `rem.tomorrow` | завтра | ertaga |
| `rem.dayBefore` | ⏰ <b>Напоминание о записи</b><br><br>Когда: <b>{when}, {time}</b><br>Услуга: {service}<br>Мастер: {master}<br><br>Подтвердите, что придёте, или перенесите запись, если планы изменились. | ⏰ <b>Yozilish haqida eslatma</b><br><br>Qachon: <b>{when}, soat {time}</b><br>Xizmat: {service}<br>Usta: {master}<br><br>Kelishingizni tasdiqlang yoki rejalaringiz oʻzgargan boʻlsa, yozilishni koʻchiring. |
| `rem.twoHours` | ⏰ <b>Через 2 часа — ваша запись</b><br><br>Когда: <b>{when}, {time}</b><br>Услуга: {service}<br>Мастер: {master}, {phone} | ⏰ <b>2 soatdan keyin yozilishingiz bor</b><br><br>Qachon: <b>{when}, soat {time}</b><br>Xizmat: {service}<br>Usta: {master}, {phone} |
| `rem.comeBtn` | ✅ Приду | ✅ Kelaman |
| `rem.thanks` | Спасибо! Мастер ждёт вас. | Rahmat! Usta sizni kutadi. |
| `rem.confirmedMark` | ✅ Вы подтвердили, что придёте. | ✅ Kelishingizni tasdiqladingiz. |
| `rem.alreadyHandled` | Эта запись уже неактуальна. | Bu yozilish endi dolzarb emas. |
| `rem.unconfirmed` | ⚠️ <b>Клиент не подтвердил, что придёт</b><br><br>{client}, {phone}<br>{service} — {when}, {time}<br><br>Лучше позвонить и уточнить. | ⚠️ <b>Mijoz kelishini tasdiqlamadi</b><br><br>{client}, {phone}<br>{service} — {when}, soat {time}<br><br>Qoʻngʻiroq qilib aniqlashtirgan maʼqul. |
| `rem.morning` | ☀️ <b>Доброе утро!</b><br><br>{list} | ☀️ <b>Xayrli tong!</b><br><br>{list} |
| `att.ask` | ❓ <b>Клиент пришёл?</b><br><br>{client}, {phone}<br>{service}<br>{date}, {time} | ❓ <b>Mijoz keldimi?</b><br><br>{client}, {phone}<br>{service}<br>{date}, {time} |
| `att.yes` | ✅ Пришёл | ✅ Keldi |
| `att.no` | 🚫 Не пришёл | 🚫 Kelmadi |
| `att.markCompleted` | ✅ Отмечено: клиент пришёл. | ✅ Belgilandi: mijoz keldi. |
| `att.markNoShow` | 🚫 Отмечено: клиент не пришёл. | 🚫 Belgilandi: mijoz kelmadi. |
| `att.prepayNow` | У клиента {client} уже {count} {count#неявка\|неявки\|неявок} — теперь запись к вам для этого клиента только с предоплатой. | {client} allaqachon {count} marta kelmagan — endi sizga faqat oldindan toʻlov bilan yozila oladi. |
| `loc.title` | <b>📍 Адрес</b><br>Клиенты увидят его после записи и в напоминаниях. | <b>📍 Manzil</b><br>Mijozlar uni yozilgandan keyin va eslatmalarda koʻradi. |
| `loc.current` | Адрес: {address} | Manzil: {address} |
| `loc.noAddress` | Адрес: не указан | Manzil: koʻrsatilmagan |
| `loc.geoSet` | Точка на карте: ✅ есть | Xaritadagi nuqta: ✅ bor |
| `loc.geoNotSet` | Точка на карте: нет | Xaritadagi nuqta: yoʻq |
| `loc.hint` | Совет: напишите ориентир — так клиенты найдут вас быстрее. | Maslahat: moʻljal yozing — mijozlar sizni tezroq topadi. |
| `loc.editAddress` | ✏️ Адрес текстом | ✏️ Manzilni yozish |
| `loc.setGeo` | 📍 Точка на карте | 📍 Xaritadagi nuqta |
| `loc.clear` | 🗑 Удалить адрес | 🗑 Manzilni oʻchirish |
| `loc.askAddress` | Напишите адрес и ориентир.<br><br>Например: <i>Чиланзар 9, дом 12, кв. 5, ориентир — магазин Makro</i> | Manzil va moʻljalni yozing.<br><br>Masalan: <i>Chilonzor 9, 12-uy, 5-xonadon, moʻljal — Makro doʻkoni</i> |
| `loc.badAddress` | Адрес должен быть от 1 до 200 символов. | Manzil 1 dan 200 tagacha belgidan iborat boʻlishi kerak. |
| `loc.sendGeoBtn` | 📍 Отправить мою геопозицию | 📍 Joylashuvimni yuborish |
| `loc.askGeo` | Нажмите кнопку ниже, если вы сейчас на месте работы.<br><br>Или отправьте точку вручную: 📎 → Геопозиция → выберите место на карте. | Hozir ish joyingizda boʻlsangiz, pastdagi tugmani bosing.<br><br>Yoki nuqtani qoʻlda yuboring: 📎 → Joylashuv → xaritadan joyni tanlang. |
| `loc.needGeo` | Нужна точка на карте: 📎 → Геопозиция. Или нажмите «Отмена». | Xaritadagi nuqta kerak: 📎 → Joylashuv. Yoki «Bekor qilish»ni bosing. |
| `loc.geoSaved` | ✅ Точка на карте сохранена. Так её увидят клиенты: | ✅ Xaritadagi nuqta saqlandi. Mijozlar uni shunday koʻradi: |
| `loc.cancelled` | Отменено. | Bekor qilindi. |
| `loc.line` | 📍 {address} | 📍 {address} |
| `loc.lineGeoOnly` | 📍 Адрес — на карте ниже | 📍 Manzil — pastdagi xaritada |
| `loc.showMap` | 📍 Показать на карте | 📍 Xaritada koʻrsatish |
| `loc.regHint` | 📍 Добавьте адрес в меню «📍 Адрес» — клиенты увидят его после записи и в напоминаниях. | 📍 «📍 Manzil» menyusida manzilni qoʻshing — mijozlar uni yozilgandan keyin va eslatmalarda koʻradi. |
| `admin.menu` | <b>🛠 Админ-панель</b><br><br>Команды:<br>/extend &lt;мастер&gt; &lt;дни&gt; — продлить подписку (мастер: slug из ссылки, Telegram ID или id)<br>/broadcast — рассылка всем мастерам | <b>🛠 Admin panel</b><br><br>Buyruqlar:<br>/extend &lt;usta&gt; &lt;kun&gt; — obunani uzaytirish (usta: havoladagi slug, Telegram ID yoki id)<br>/broadcast — barcha ustalarga xabar |
| `admin.statsBtn` | 📊 Статистика | 📊 Statistika |
| `admin.mastersBtn` | 👥 Мастера | 👥 Ustalar |
| `admin.mastersTitle` | <b>👥 Мастера</b> (последние {count}) | <b>👥 Ustalar</b> (oxirgi {count}) |
| `admin.masterLine` | • <b>{name}</b> {phone} · m_{slug}<br>   {status} до {until} · записей за 30 дн.: {bookings} | • <b>{name}</b> {phone} · m_{slug}<br>   {status}, {until} gacha · 30 kunda yozilishlar: {bookings} |
| `admin.pendingBtn` | 💳 Ожидают проверки: {n} | 💳 Tekshiruvni kutmoqda: {n} |
| `admin.stats` | <b>📊 Статистика</b><br><br><b>👤 Пользователей бота: {users}</b> (новых за 7 дней: {users7})<br>Из них записывались через бот: {bookers}<br><br>Мастеров: <b>{total}</b><br>• пробный период: {trial}<br>• подписка активна: {active}<br>• подписка закончилась: {expired}<br><br>Записей за 7 дней: <b>{b7}</b> (подтверждены/состоялись: {done7})<br>Записей за 30 дней: <b>{b30}</b> (подтверждены/состоялись: {done30}) | <b>📊 Statistika</b><br><br><b>👤 Bot foydalanuvchilari: {users}</b> (7 kunda yangi: {users7})<br>Ulardan bot orqali yozilganlar: {bookers}<br><br>Ustalar: <b>{total}</b><br>• sinov muddati: {trial}<br>• obuna faol: {active}<br>• obuna tugagan: {expired}<br><br>7 kunlik yozilishlar: <b>{b7}</b> (tasdiqlangan/boʻlib oʻtgan: {done7})<br>30 kunlik yozilishlar: <b>{b30}</b> (tasdiqlangan/boʻlib oʻtgan: {done30}) |
| `admin.noPending` | Нет оплат, ожидающих проверки. | Tekshiruvni kutayotgan toʻlovlar yoʻq. |
| `admin.subReview` | 💎 <b>Оплата подписки</b><br><br>Мастер: {name}, {phone}<br>Ссылка: m_{slug}<br>Сейчас: {status}, до {until}<br>Сумма: {amount} сум | 💎 <b>Obuna toʻlovi</b><br><br>Usta: {name}, {phone}<br>Havola: m_{slug}<br>Hozir: {status}, {until} gacha<br>Summa: {amount} soʻm |
| `admin.okBtn` | ✅ Подтвердить | ✅ Tasdiqlash |
| `admin.noBtn` | ❌ Отклонить | ❌ Rad etish |
| `admin.approvedMark` | ✅ Подтверждено — подписка до {until}. | ✅ Tasdiqlandi — obuna {until} gacha. |
| `admin.rejectedMark` | ❌ Отклонено. | ❌ Rad etildi. |
| `admin.notPending` | Эта оплата уже обработана. | Bu toʻlov allaqachon koʻrib chiqilgan. |
| `admin.extendUsage` | Формат: /extend &lt;мастер&gt; &lt;дни&gt;<br>Например: /extend gj2hv2 30 | Format: /extend &lt;usta&gt; &lt;kun&gt;<br>Masalan: /extend gj2hv2 30 |
| `admin.extendNotFound` | Мастер не найден. Укажите slug из ссылки (m_xxxxxx), Telegram ID или id. | Usta topilmadi. Havoladagi slug (m_xxxxxx), Telegram ID yoki id ni koʻrsating. |
| `admin.extendDone` | ✅ {name}: +{days} дн., подписка до {until}. | ✅ {name}: +{days} kun, obuna {until} gacha. |
| `admin.bcAsk` | Напишите текст рассылки для всех мастеров. | Barcha ustalar uchun xabar matnini yozing. |
| `admin.bcEmpty` | Нужен текст сообщения. | Xabar matni kerak. |
| `admin.bcPreview` | <b>Предпросмотр рассылки:</b><br><br>{text}<br><br>Отправить всем мастерам? | <b>Xabarni oldindan koʻrish:</b><br><br>{text}<br><br>Barcha ustalarga yuborilsinmi? |
| `admin.bcYes` | ✅ Отправить | ✅ Yuborish |
| `admin.bcNo` | ✖️ Отмена | ✖️ Bekor qilish |
| `admin.bcCancelled` | Рассылка отменена. | Xabar yuborish bekor qilindi. |
| `admin.bcSending` | 📤 Отправляю… | 📤 Yuborilmoqda… |
| `admin.bcDone` | ✅ Рассылка завершена: доставлено {ok}, ошибок {fail}. | ✅ Yuborish tugadi: yetkazildi {ok}, xatolar {fail}. |
| `mb.newBtn` | ➕ Записать клиента | ➕ Mijozni yozish |
| `mb.blockBtn` | 🚫 Закрыть время | 🚫 Vaqtni yopish |
| `mb.card` | <b>Запись</b> ({source})<br><br>Клиент: {client}<br>Телефон: {phone}<br>Услуга: {service}<br>Когда: <b>{date}, {time}</b><br>Цена: {price} сум<br>Статус: {status} | <b>Yozilish</b> ({source})<br><br>Mijoz: {client}<br>Telefon: {phone}<br>Xizmat: {service}<br>Qachon: <b>{date}, {time}</b><br>Narxi: {price} soʻm<br>Holati: {status} |
| `mb.sourceBot` | через бота | bot orqali |
| `mb.sourceManual` | внесена вручную | qoʻlda kiritilgan |
| `mb.blockCard` | <b>🚫 Время закрыто</b><br><br>{date}, {start}–{end}<br><br>Клиенты не могут записаться на это время. | <b>🚫 Vaqt yopilgan</b><br><br>{date}, {start}–{end}<br><br>Mijozlar bu vaqtga yozila olmaydi. |
| `mb.unblockBtn` | 🔓 Открыть время | 🔓 Vaqtni ochish |
| `mb.unblocked` | Время снова открыто для записи | Vaqt yana yozilish uchun ochiq |
| `mb.cancelAsk` | Отменить запись?<br><br>{client} — {date}, {time} | Yozilish bekor qilinsinmi?<br><br>{client} — {date}, {time} |
| `mb.cancelAskBot` | Отменить запись?<br><br>{client} — {date}, {time}<br><br>Клиент получит уведомление в боте. | Yozilish bekor qilinsinmi?<br><br>{client} — {date}, {time}<br><br>Mijozga botda xabar boradi. |
| `mb.cancelled` | Запись отменена | Yozilish bekor qilindi |
| `mb.clientCancelled` | ❌ <b>Мастер отменил запись</b><br><br>{service}, {date}, {time}<br>Мастер: {master}, {phone}<br><br>Можно записаться на другое время по ссылке мастера. | ❌ <b>Usta yozilishni bekor qildi</b><br><br>{service}, {date}, {time}<br>Usta: {master}, {phone}<br><br>Usta havolasi orqali boshqa vaqtga yozilishingiz mumkin. |
| `mb.clientRefundNote` | Вы вносили предоплату — о возврате договоритесь с мастером напрямую. | Siz oldindan toʻlagansiz — pulni qaytarish haqida usta bilan toʻgʻridan-toʻgʻri kelishib oling. |
| `mb.chooseService` | Какая услуга? | Qaysi xizmat? |
| `mb.chooseDate` | <b>{service}</b><br><br>Выберите день: | <b>{service}</b><br><br>Kunni tanlang: |
| `mb.noDates` | Свободных дней нет — проверьте график и выходные. | Boʻsh kunlar yoʻq — ish jadvali va dam olish kunlarini tekshiring. |
| `mb.askName` | {date}, {time}<br><br>Как зовут клиента? | {date}, {time}<br><br>Mijozning ismi nima? |
| `mb.askPhone` | Телефон клиента? Можно пропустить. | Mijozning telefoni? Oʻtkazib yuborish mumkin. |
| `mb.skipPhone` | Пропустить ➡️ | Oʻtkazib yuborish ➡️ |
| `mb.created` | ✅ Записано: {client} — {service}, {date}, {time}. | ✅ Yozildi: {client} — {service}, {date}, {time}. |
| `mb.moveConfirm` | Перенести запись на <b>{date}, {time}</b>?<br><br>Если клиент записывался через бота, он получит уведомление. | Yozilish <b>{date}, {time}</b> ga koʻchirilsinmi?<br><br>Agar mijoz bot orqali yozilgan boʻlsa, unga xabar boradi. |
| `mb.moveConfirmBtn` | ✅ Перенести | ✅ Koʻchirish |
| `mb.moved` | Запись перенесена | Yozilish koʻchirildi |
| `mb.clientMoved` | 🔄 <b>Мастер перенёс вашу запись</b><br><br>{service}<br>Было: {oldDate}, {oldTime}<br>Стало: <b>{date}, {time}</b><br><br>Мастер: {master}, {phone}. Если новое время не подходит — свяжитесь с мастером или отмените запись в «📋 Мои записи». | 🔄 <b>Usta yozilishingizni koʻchirdi</b><br><br>{service}<br>Avval: {oldDate}, {oldTime}<br>Endi: <b>{date}, {time}</b><br><br>Usta: {master}, {phone}. Yangi vaqt toʻgʻri kelmasa — usta bilan bogʻlaning yoki «📋 Yozilishlarim»da bekor qiling. |
| `mb.blockChooseDate` | На какой день закрыть время?<br><br>Если не работаете весь день — используйте «📅 Выходные даты» в графике. | Qaysi kunga vaqtni yopamiz?<br><br>Agar kun boʻyi ishlamasangiz — ish jadvalidagi «📅 Dam olish sanalari»dan foydalaning. |
| `mb.blockAskRange` | {date}: какое время закрыть?<br><br>Например: <i>15:00-17:00</i> | {date}: qaysi vaqtni yopamiz?<br><br>Masalan: <i>15:00-17:00</i> |
| `mb.blockPast` | Это время уже прошло. | Bu vaqt allaqachon oʻtib ketgan. |
| `mb.blockConflict` | На это время уже есть записи — сначала перенесите или отмените их:<br><br>{list} | Bu vaqtga allaqachon yozilishlar bor — avval ularni koʻchiring yoki bekor qiling:<br><br>{list} |
| `mb.blocked` | ✅ {date}, {start}–{end} — время закрыто. | ✅ {date}, {start}–{end} — vaqt yopildi. |
| `mb.createdLinked` | ✅ Записано: {client} — {service}, {date}, {time}.<br><br>Клиент пользуется ботом: он получил уведомление, напоминания придут ему автоматически. | ✅ Yozildi: {client} — {service}, {date}, {time}.<br><br>Mijoz botdan foydalanadi: unga xabar yuborildi, eslatmalar avtomatik keladi. |
| `mb.inviteBtn` | 📤 Отправить клиенту | 📤 Mijozga yuborish |
| `mb.inviteCardBtn` | 📤 Ссылка для клиента | 📤 Mijoz uchun havola |
| `mb.invite` | 📤 <b>Отправьте клиенту ссылку</b> — в Telegram, WhatsApp или SMS.<br><br>Открыв её, клиент получит напоминания и сможет сам перенести или отменить запись.<br><br>Текст для отправки (нажмите, чтобы скопировать):<br><code>{text}</code> | 📤 <b>Mijozga havolani yuboring</b> — Telegram, WhatsApp yoki SMS orqali.<br><br>Havolani ochgach, mijoz eslatmalarni oladi va yozilishni oʻzi koʻchirishi yoki bekor qilishi mumkin.<br><br>Yuborish uchun matn (nusxa olish uchun bosing):<br><code>{text}</code> |
| `mb.inviteText` | Вы записаны к мастеру {master}: {service}, {date}, {time}. Чтобы получить напоминание и управлять записью, откройте ссылку: {link} | Siz {master} ustaga yozildingiz: {service}, {date}, {time}. Eslatma olish va yozilishni boshqarish uchun havolani oching: {link} |
| `mb.clientBooked` | 📅 <b>Мастер записал вас</b><br><br>Мастер: {master}, {phone}<br>Услуга: {service}<br>Когда: <b>{date}, {time}</b>{address}<br><br>Напомним за день и за 2 часа. Перенести или отменить — в «📋 Мои записи». | 📅 <b>Usta sizni yozib qoʻydi</b><br><br>Usta: {master}, {phone}<br>Xizmat: {service}<br>Qachon: <b>{date}, {time}</b>{address}<br><br>Bir kun va 2 soat oldin eslatamiz. Koʻchirish yoki bekor qilish — «📋 Yozilishlarim»da. |
| `mb.claimed` | ✅ <b>Запись подключена</b><br><br>Мастер: {master}, {phone}<br>Услуга: {service}<br>Когда: <b>{date}, {time}</b>{address}<br><br>Напомним за день и за 2 часа. Перенести или отменить — в «📋 Мои записи». | ✅ <b>Yozilish ulandi</b><br><br>Usta: {master}, {phone}<br>Xizmat: {service}<br>Qachon: <b>{date}, {time}</b>{address}<br><br>Bir kun va 2 soat oldin eslatamiz. Koʻchirish yoki bekor qilish — «📋 Yozilishlarim»da. |
| `mb.claimedMaster` | 🔗 {client} открыл(а) ссылку. Запись {date}, {time} теперь у клиента в боте — напоминания придут автоматически. | 🔗 {client} havolani ochdi. Yozilish ({date}, {time}) endi mijozning botida — eslatmalar avtomatik keladi. |
| `mb.claimOwn` | Это ссылка для вашего клиента — отправьте её ему. Открывать её самим не нужно. | Bu havola mijozingiz uchun — uni mijozga yuboring. Oʻzingiz ochishingiz shart emas. |
| `mb.claimTaken` | По этой ссылке запись уже подключил другой человек. Если это ваша запись — свяжитесь с мастером. | Bu havola orqali yozilishni boshqa odam ulagan. Agar bu sizning yozilishingiz boʻlsa — usta bilan bogʻlaning. |
| `mb.claimInactive` | Эта запись уже отменена или прошла. | Bu yozilish bekor qilingan yoki vaqti oʻtib ketgan. |
| `mb.claimNotFound` | Ссылка недействительна. Уточните у мастера. | Havola yaroqsiz. Usta bilan aniqlashtiring. |
| `alert.newMaster` | 🆕 <b>Новый мастер!</b><br><br>{name}, {phone}<br>Telegram: {username}<br>Услуг: {services}<br>Ссылка: {link} | 🆕 <b>Yangi usta!</b><br><br>{name}, {phone}<br>Telegram: {username}<br>Xizmatlar: {services}<br>Havola: {link} |
| `alert.error` | ⚠️ <b>Сбой в боте</b> ({where})<br><br><code>{message}</code><br><br>Подробности — в логах Railway. Повторные сбои того же типа не чаще раза в 10 минут. | ⚠️ <b>Botda nosozlik</b> ({where})<br><br><code>{message}</code><br><br>Tafsilotlar — Railway loglarida. Shu turdagi takroriy nosozliklar 10 daqiqada bir martadan koʻp emas. |
| `months.1` | Январь | Yanvar |
| `months.2` | Февраль | Fevral |
| `months.3` | Март | Mart |
| `months.4` | Апрель | Aprel |
| `months.5` | Май | May |
| `months.6` | Июнь | Iyun |
| `months.7` | Июль | Iyul |
| `months.8` | Август | Avgust |
| `months.9` | Сентябрь | Sentabr |
| `months.10` | Октябрь | Oktabr |
| `months.11` | Ноябрь | Noyabr |
| `months.12` | Декабрь | Dekabr |
| `st.title` | <b>📊 Статистика — {month} {year}</b> | <b>📊 Statistika — {month} {year}</b> |
| `st.revenue` | 💰 Выручка: <b>{value} сум</b>{delta} | 💰 Tushum: <b>{value} soʻm</b>{delta} |
| `st.visits` | ✅ Визитов: <b>{value}</b>{delta} | ✅ Tashriflar: <b>{value}</b>{delta} |
| `st.avgCheck` | 🧾 Средний чек: {value} сум | 🧾 Oʻrtacha chek: {value} soʻm |
| `st.upcoming` | 📅 Ещё впереди: {count} (на {value} сум) | 📅 Hali oldinda: {count} ({value} soʻmlik) |
| `st.clients` | 👥 Клиентов: {value} (новых: {fresh}, постоянных: {returning}) | 👥 Mijozlar: {value} (yangi: {fresh}, doimiy: {returning}) |
| `st.noShows` | 🚫 Неявок: {value} ({rate}%) | 🚫 Kelmaganlar: {value} ({rate}%) |
| `st.cancelled` | ❌ Отмен: {value} | ❌ Bekor qilinganlar: {value} |
| `st.viaBot` | 🤖 Записей через бота: {value} | 🤖 Bot orqali yozilishlar: {value} |
| `st.rating` | ⭐ Рейтинг: <b>{avg}</b> (отзывов: {count}) | ⭐ Reyting: <b>{avg}</b> ({count} ta sharh) |
| `st.delta` |  ({sign}{value}% к прошлому месяцу) |  (oʻtgan oyga nisbatan {sign}{value}%) |
| `st.empty` | В этом месяце пока нет визитов. Выручка считается по записям, отмеченным «✅ Пришёл». | Bu oyda hali tashriflar yoʻq. Tushum «✅ Keldi» deb belgilangan yozilishlar boʻyicha hisoblanadi. |
| `rbk.text` | 👋 {name}, пора снова на «{service}»?<br><br>Ваш последний визит: <b>{master}</b>, {date}. Выберите удобное время — это займёт минуту. | 👋 {name}, yana «{service}» vaqti keldimi?<br><br>Oxirgi tashrifingiz: <b>{master}</b>, {date}. Qulay vaqtni tanlang — bir daqiqa oladi. |
| `rbk.bookBtn` | 📅 Записаться | 📅 Yozilish |
| `rv.ask` | 🙏 Как прошёл визит?<br><br>{service} — <b>{master}</b><br><br>Оцените от 1 до 5 — это помогает мастеру. | 🙏 Tashrif qanday oʻtdi?<br><br>{service} — <b>{master}</b><br><br>1 dan 5 gacha baholang — bu ustaga yordam beradi. |
| `rv.askComment` | Спасибо! Напишите пару слов о визите — мастеру будет приятно. Или нажмите «Пропустить». | Rahmat! Tashrif haqida bir-ikki ogʻiz yozing — ustaga yoqimli boʻladi. Yoki «Oʻtkazib yuborish»ni bosing. |
| `rv.askImprove` | Спасибо за честность. Что можно улучшить? Мастер увидит ваш комментарий. | Samimiyligingiz uchun rahmat. Nimani yaxshilash mumkin? Usta izohingizni koʻradi. |
| `rv.skip` | Пропустить | Oʻtkazib yuborish |
| `rv.thanks` | 💛 Спасибо за отзыв! | 💛 Fikringiz uchun rahmat! |
| `rv.needText` | Напишите отзыв текстом или нажмите «Пропустить». | Fikringizni matn bilan yozing yoki «Oʻtkazib yuborish»ni bosing. |
| `rv.already` | Вы уже оценили этот визит. | Siz bu tashrifni allaqachon baholagansiz. |
| `rv.ratingLine` | ⭐ {avg} · отзывов: {count} | ⭐ {avg} · {count} ta sharh |
| `rv.masterNew` | {stars} <b>Новая оценка</b><br><br>{client} — {service}, {date} | {stars} <b>Yangi baho</b><br><br>{client} — {service}, {date} |
| `rv.masterComment` | 💬 <b>Отзыв</b> {stars}<br><br>{client} — {service}, {date}<br><i>«{comment}»</i> | 💬 <b>Sharh</b> {stars}<br><br>{client} — {service}, {date}<br><i>«{comment}»</i> |
| `rv.listBtn` | ⭐ Отзывы | ⭐ Sharhlar |
| `rv.listTitle` | <b>⭐ Отзывы</b> — средняя оценка {avg} ({count}) | <b>⭐ Sharhlar</b> — oʻrtacha baho {avg} ({count}) |
| `rv.listEmpty` | Отзывов пока нет. Клиент получает просьбу оценить визит, когда вы отмечаете «✅ Пришёл». | Hozircha sharhlar yoʻq. «✅ Keldi» deb belgilaganingizda mijozga tashrifni baholash taklifi boradi. |
| `rv.listItem` | {stars} {client}, {date}{comment} | {stars} {client}, {date}{comment} |
| `ref.screen` | <b>🎁 Пригласите мастера</b><br><br>Отправьте коллеге свою ссылку-приглашение:<br>{link}<br><br>• Коллега получит <b>+{bonus} {bonus#день\|дня\|дней}</b> бесплатного периода.<br>• Вы получите <b>+{reward} {reward#день\|дня\|дней}</b> подписки, когда коллега впервые оплатит подписку.<br><br>Пришли по вашей ссылке: {joined} · оплатили: {paid} | <b>🎁 Ustani taklif qiling</b><br><br>Hamkasbingizga taklif havolangizni yuboring:<br>{link}<br><br>• Hamkasbingiz <b>+{bonus} kun</b> bepul muddat oladi.<br>• Hamkasbingiz birinchi marta obunani toʻlaganda siz <b>+{reward} kun</b> obuna olasiz.<br><br>Havolangiz orqali kelganlar: {joined} · toʻlaganlar: {paid} |
| `ref.shareBtn` | 📤 Поделиться ссылкой | 📤 Havolani ulashish |
| `ref.shareText` | Я веду запись клиентов через этот бот — клиенты сами выбирают время, бот напоминает и снижает неявки. По моей ссылке — {days} {days#день\|дня\|дней} бесплатно: | Men mijozlarni shu bot orqali yozaman — mijozlar vaqtni oʻzi tanlaydi, bot eslatadi va kelmay qolishlarni kamaytiradi. Mening havolam orqali — {days} kun bepul: |
| `ref.invited` | 👋 Вас пригласил мастер <b>{name}</b>.<br><br>Здесь можно подключить онлайн-запись: клиенты сами выбирают время, бот напоминает о визите и берёт предоплату.<br><br>По приглашению — <b>{days} {days#день\|дня\|дней} бесплатно</b>. Вы мастер или клиент? | 👋 Sizni usta <b>{name}</b> taklif qildi.<br><br>Bu yerda onlayn yozilishni ulash mumkin: mijozlar vaqtni oʻzi tanlaydi, bot tashrifni eslatadi va oldindan toʻlov oladi.<br><br>Taklif boʻyicha — <b>{days} kun bepul</b>. Siz ustamisiz yoki mijoz? |
| `ref.joined` | 🎉 По вашему приглашению зарегистрировался мастер <b>{name}</b>! Когда коллега оплатит подписку, вы получите +30 дней. | 🎉 Taklifingiz boʻyicha usta <b>{name}</b> roʻyxatdan oʻtdi! U obunani toʻlaganda siz +30 kun olasiz. |
| `ref.rewarded` | 🎁 Мастер <b>{name}</b> оплатил подписку — вам +30 дней! Подписка до {until}. | 🎁 Usta <b>{name}</b> obunani toʻladi — sizga +30 kun! Obuna {until} gacha. |
| `cl.title` | <b>👥 Клиенты</b>: {count} · визитов всего: {visits}<br><br>Нажмите на клиента, чтобы увидеть историю и записать снова. | <b>👥 Mijozlar</b>: {count} · jami tashriflar: {visits}<br><br>Tarixni koʻrish va qayta yozish uchun mijozni bosing. |
| `cl.empty` | Клиентов пока нет — они появятся после первых записей. | Hozircha mijozlar yoʻq — ular birinchi yozilishlardan keyin paydo boʻladi. |
| `cl.item` | {name} · визитов: {visits} | {name} · tashriflar: {visits} |
| `cl.card` | <b>{name}</b><br>Телефон: {phone}<br><br>Визитов: {visits} · потрачено: {spent} сум<br>Неявок: {noShows}<br>Последний визит: {last}<br>Следующая запись: {next} | <b>{name}</b><br>Telefon: {phone}<br><br>Tashriflar: {visits} · sarflagan: {spent} soʻm<br>Kelmagan: {noShows}<br>Oxirgi tashrif: {last}<br>Keyingi yozilish: {next} |
| `cl.historyTitle` | <b>История:</b> | <b>Tarix:</b> |
| `cl.bookBtn` | ➕ Записать снова | ➕ Qayta yozish |
| `cl.writeBtn` | 💬 Написать в Telegram | 💬 Telegramda yozish |
| `pf.screen` | <b>🖼 Профиль</b><br>Клиенты видят его, когда открывают вашу ссылку.<br><br><b>Описание:</b><br>{about}<br><br><b>Фото работ:</b> {photos} из {max} | <b>🖼 Profil</b><br>Mijozlar uni havolangizni ochganda koʻradi.<br><br><b>Tavsif:</b><br>{about}<br><br><b>Ishlar rasmlari:</b> {photos} / {max} |
| `pf.noAbout` | не заполнено | toʻldirilmagan |
| `pf.editAbout` | ✏️ Описание | ✏️ Tavsif |
| `pf.addPhotos` | ➕ Добавить фото работ | ➕ Ishlar rasmini qoʻshish |
| `pf.clearPhotos` | 🗑 Удалить все фото | 🗑 Barcha rasmlarni oʻchirish |
| `pf.preview` | 👁 Как видят клиенты | 👁 Mijozlar qanday koʻradi |
| `pf.askAbout` | Напишите о себе пару предложений (до {max} символов): опыт, материалы, чем вы отличаетесь. Отправьте «-», чтобы очистить.<br><br>Например: <i>Мастер маникюра 5 лет. Стерильные инструменты, японские гели, держится 3–4 недели.</i> | Oʻzingiz haqingizda bir-ikki gap yozing ({max} belgigacha): tajriba, materiallar, nimasi bilan ajralib turasiz. Tozalash uchun «-» yuboring.<br><br>Masalan: <i>5 yillik manikyur ustasi. Steril asboblar, yapon gellari, 3–4 hafta turadi.</i> |
| `pf.tooLong` | Слишком длинно — максимум {max} символов. | Juda uzun — koʻpi bilan {max} belgi. |
| `pf.askPhotos` | Отправьте фото своих работ — по одному или альбомом (до {max}). Когда закончите, нажмите «Готово». | Ishlaringiz rasmlarini yuboring — bittadan yoki albom qilib ({max} tagacha). Tugatgach, «Tayyor»ni bosing. |
| `pf.needPhoto` | Нужно фото (не файлом). Или нажмите «Готово». | Rasm kerak (fayl emas). Yoki «Tayyor»ni bosing. |
| `pf.added` | ✅ Фото добавлено: {count} из {max}. | ✅ Rasm qoʻshildi: {count} / {max}. |
| `pf.limit` | Уже {max} фото — это максимум. Удалите старые, чтобы добавить новые. | Allaqachon {max} ta rasm — bu maksimum. Yangilarini qoʻshish uchun eskilarini oʻchiring. |
| `pf.done` | ✅ Готово | ✅ Tayyor |
| `pf.emptyPreview` | Профиль пуст — добавьте описание и фото работ. | Profil boʻsh — tavsif va ishlar rasmlarini qoʻshing. |
