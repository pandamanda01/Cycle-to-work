const STORAGE_KEY = "cycle-work-tracker-v1";
const DEFAULT_SETTINGS = {
  moneyPerRide: 3.6,
  caloriesPerRide: 220
};

const state = loadState();
const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let statsDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let selectedYear = statsDate.getFullYear();

const calendarTitle = document.getElementById("calendar-title");
const calendarGrid = document.getElementById("calendar-grid");
const totalMoney = document.getElementById("total-money");
const weekMoney = document.getElementById("week-money");
const monthMoney = document.getElementById("month-money");
const yearMoney = document.getElementById("year-money");
const weekCalories = document.getElementById("week-calories");
const monthCalories = document.getElementById("month-calories");
const yearCalories = document.getElementById("year-calories");
const yearFilter = document.getElementById("year-filter");
const moneyInput = document.getElementById("money-input");
const calorieInput = document.getElementById("calorie-input");

document.getElementById("prev-month").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  statsDate = new Date(visibleMonth);
  selectedYear = statsDate.getFullYear();
  render();
});

document.getElementById("next-month").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  statsDate = new Date(visibleMonth);
  selectedYear = statsDate.getFullYear();
  render();
});

document.getElementById("today-button").addEventListener("click", () => {
  visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  statsDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  selectedYear = statsDate.getFullYear();
  render();
});

yearFilter.addEventListener("change", () => {
  selectedYear = Number(yearFilter.value);
  statsDate = withYear(statsDate, selectedYear);
  visibleMonth = new Date(selectedYear, visibleMonth.getMonth(), 1);
  render();
});

moneyInput.addEventListener("change", () => {
  state.settings.moneyPerRide = parseNumber(moneyInput.value, DEFAULT_SETTINGS.moneyPerRide);
  saveState();
  render();
});

calorieInput.addEventListener("change", () => {
  state.settings.caloriesPerRide = Math.round(parseNumber(calorieInput.value, DEFAULT_SETTINGS.caloriesPerRide));
  saveState();
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

render();

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      rides: parsed?.rides && typeof parsed.rides === "object" ? parsed.rides : {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed?.settings || {})
      }
    };
  } catch {
    return { rides: {}, settings: { ...DEFAULT_SETTINGS } };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  moneyInput.value = state.settings.moneyPerRide.toFixed(2);
  calorieInput.value = String(state.settings.caloriesPerRide);
  renderCalendar();
  renderYearFilter();
  renderStats();
}

function renderCalendar() {
  calendarGrid.textContent = "";
  calendarTitle.textContent = visibleMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });

  const start = startOfCalendar(visibleMonth);
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const key = toKey(date);
    const rides = state.rides[key] || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "day-cell",
      date.getMonth() === visibleMonth.getMonth() ? "" : "outside",
      sameDay(date, today) ? "today" : "",
      rides > 0 ? "has-rides" : ""
    ].join(" ").trim();
    button.setAttribute("aria-label", `${date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long"
    })}: ${rides} ride${rides === 1 ? "" : "s"}. Tap to change.`);
    button.addEventListener("click", () => toggleRides(key));

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());

    const pill = document.createElement("span");
    pill.className = rides > 0 ? "ride-pill" : "ride-pill zero";
    pill.textContent = rides > 0 ? "🚴".repeat(rides) : "-";

    button.append(number, pill);
    calendarGrid.append(button);
  }
}

function toggleRides(key) {
  statsDate = fromKey(key);
  selectedYear = statsDate.getFullYear();
  const next = ((state.rides[key] || 0) + 1) % 3;
  if (next === 0) {
    delete state.rides[key];
  } else {
    state.rides[key] = next;
  }
  saveState();
  render();
}

function renderYearFilter() {
  const years = getAvailableYears();
  yearFilter.textContent = "";
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearFilter.append(option);
  });
  yearFilter.value = String(selectedYear);
}

function renderStats() {
  const weekStart = startOfWeek(statsDate);
  const weekEnd = addDays(weekStart, 7);
  const totalTotals = totalsFor(() => true);
  const weekTotals = totalsFor(({ date }) => date >= weekStart && date < weekEnd);
  const monthTotals = totalsFor(({ date }) =>
    date.getFullYear() === selectedYear &&
    date.getMonth() === statsDate.getMonth()
  );
  const yearTotals = totalsFor(({ date }) => date.getFullYear() === selectedYear);

  totalMoney.textContent = formatMoney(totalTotals.money);
  weekMoney.textContent = formatMoney(weekTotals.money);
  monthMoney.textContent = formatMoney(monthTotals.money);
  yearMoney.textContent = formatMoney(yearTotals.money);
  weekCalories.textContent = `${formatInteger(weekTotals.calories)} kcal`;
  monthCalories.textContent = `${formatInteger(monthTotals.calories)} kcal`;
  yearCalories.textContent = `${formatInteger(yearTotals.calories)} kcal`;
}

function totalsFor(predicate) {
  return Object.entries(state.rides).reduce(
    (totals, [key, rides]) => {
      const date = fromKey(key);
      if (!predicate({ key, date, rides })) {
        return totals;
      }

      totals.days += 1;
      totals.rides += rides;
      totals.money += rides * state.settings.moneyPerRide;
      totals.calories += rides * state.settings.caloriesPerRide;
      return totals;
    },
    { days: 0, rides: 0, money: 0, calories: 0 }
  );
}

function getAvailableYears() {
  const years = new Set([
    today.getFullYear(),
    visibleMonth.getFullYear(),
    selectedYear
  ]);

  Object.keys(state.rides).forEach((key) => {
    years.add(fromKey(key).getFullYear());
  });

  return [...years].sort((a, b) => b - a);
}

function startOfCalendar(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayBasedDay = (first.getDay() + 6) % 7;
  return addDays(first, -mondayBasedDay);
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayBasedDay = (start.getDay() + 6) % 7;
  return addDays(start, -mondayBasedDay);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function withYear(date, year) {
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(amount);
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0
  }).format(value);
}
