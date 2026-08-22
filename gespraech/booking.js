(() => {
  const form = document.querySelector("#booking-form");
  const slotsNode = document.querySelector("#slots");
  const detailsNode = document.querySelector("#details");
  const selectedTimeNode = document.querySelector("#selected-time");
  const messageNode = document.querySelector("#booking-message");
  let selectedStart = null;

  const formatDay = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  });
  const formatTime = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });

  function duration() {
    return Number(form.elements.duration.value);
  }

  function icalEscape(value) {
    return String(value)
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;");
  }

  function icalDate(value) {
    return new Date(value)
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replace(/\.\d{3}Z$/, "Z");
  }

  function downloadIcal(data, topic) {
    const stamp = icalDate(new Date());
    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hartschenberg//Booking//RU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:booking-${stamp}@hartschenberg.de`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icalDate(data.start)}`,
      `DTEND:${icalDate(data.end)}`,
      "SUMMARY:Звонок Hartschenberg",
      `DESCRIPTION:${icalEscape(`Тема: ${topic}\nТелемост: ${data.telemost_url}`)}`,
      `URL:${data.telemost_url}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([ical], {type: "text/calendar;charset=utf-8"})
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "hartschenberg-meeting.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function detailRow(label, value) {
    const row = document.createElement("div");
    row.className = "booking-detail";
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    row.append(term, description);
    return row;
  }

  function showConfirmation(data, topic) {
    form.querySelectorAll("fieldset").forEach((node) => { node.hidden = true; });
    messageNode.className = "booking-message success booking-confirmation";

    const heading = document.createElement("h2");
    heading.textContent = "Встреча забронирована";
    const intro = document.createElement("p");
    intro.textContent = "Подтверждение и файл календаря отправлены на указанный e-mail.";

    const details = document.createElement("dl");
    details.className = "booking-details";
    const start = new Date(data.start);
    const end = new Date(data.end);
    details.append(
      detailRow(
        "Дата и время",
        `${formatDay.format(start)}, ${formatTime.format(start)}–${formatTime.format(end)}`
      ),
      detailRow("Продолжительность", `${duration()} минут`),
      detailRow("Тема", topic),
      detailRow("E-mail", data.email)
    );

    const actions = document.createElement("div");
    actions.className = "booking-actions";
    const telemost = document.createElement("a");
    telemost.className = "booking-action primary";
    telemost.href = data.telemost_url;
    telemost.target = "_blank";
    telemost.rel = "noopener";
    telemost.textContent = "Открыть Яндекс Телемост";
    const ical = document.createElement("button");
    ical.className = "booking-action";
    ical.type = "button";
    ical.textContent = "Скачать iCal";
    ical.addEventListener("click", () => downloadIcal(data, topic));
    actions.append(telemost, ical);

    const reminder = document.createElement("p");
    reminder.className = "booking-reminder";
    reminder.textContent = "Сохраните эту страницу или добавьте встречу в свой календарь.";
    messageNode.replaceChildren(heading, intro, details, actions, reminder);
  }

  function selectSlot(button) {
    document.querySelectorAll(".slot.selected").forEach((node) => {
      node.classList.remove("selected");
      node.setAttribute("aria-pressed", "false");
    });
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    selectedStart = button.dataset.start;
    const date = new Date(selectedStart);
    selectedTimeNode.textContent =
      `${formatDay.format(date)}, ${formatTime.format(date)} · ${duration()} минут`;
    detailsNode.hidden = false;
    messageNode.textContent = "";
    form.elements.name.focus();
  }

  function renderSlots(items) {
    if (!items.length) {
      slotsNode.innerHTML = "<p>В ближайшие 60 дней свободных интервалов нет.</p>";
      return;
    }

    const groups = new Map();
    items.forEach((slot) => {
      const key = formatDay.format(new Date(slot.start));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(slot);
    });

    slotsNode.replaceChildren();
    groups.forEach((daySlots, dayLabel) => {
      const group = document.createElement("section");
      group.className = "slot-day";
      const heading = document.createElement("h2");
      heading.textContent = dayLabel;
      group.appendChild(heading);
      const times = document.createElement("div");
      times.className = "slot-times";
      daySlots.forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "slot";
        button.dataset.start = slot.start;
        button.setAttribute("aria-pressed", "false");
        button.textContent = formatTime.format(new Date(slot.start));
        button.addEventListener("click", () => selectSlot(button));
        times.appendChild(button);
      });
      group.appendChild(times);
      slotsNode.appendChild(group);
    });
  }

  async function loadSlots() {
    selectedStart = null;
    detailsNode.hidden = true;
    slotsNode.innerHTML = "<p>Загружаем свободное время…</p>";
    messageNode.textContent = "";
    try {
      const response = await fetch(`/api/booking/slots?duration=${duration()}`);
      if (!response.ok) throw new Error("slots");
      const data = await response.json();
      renderSlots(data.slots);
    } catch {
      slotsNode.innerHTML =
        "<p>Не удалось загрузить календарь. Пожалуйста, попробуйте немного позже.</p>";
    }
  }

  form.addEventListener("change", (event) => {
    if (event.target.name === "duration") loadSlots();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedStart || !form.reportValidity()) return;
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    messageNode.textContent = "Создаём встречу…";
    const topic = form.elements.topic.value;
    try {
      const response = await fetch("/api/booking/book", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          start: selectedStart,
          duration: duration(),
          name: form.elements.name.value,
          email: form.elements.email.value,
          topic: form.elements.topic.value,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "booking");
      showConfirmation(data, topic);
    } catch (error) {
      messageNode.className = "booking-message error";
      messageNode.textContent =
        error.message === "booking" ? "Не удалось создать встречу." : error.message;
      await loadSlots();
    } finally {
      submit.disabled = false;
    }
  });

  loadSlots();
})();
