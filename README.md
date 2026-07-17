# Cycle to Work Tracker

A small Progressive Web App for tracking cycle commutes, money saved, and calories burned.

Live app: https://cycle-work-tracker-20260716.lanyi-ginger.chatgpt.site

## Features

- Calendar-based cycle commute tracking
- Tap a date to cycle between 0, 1, and 2 rides
- Money saved totals for week, month, year, and all time
- Calories burned totals for week, month, and year
- Year filter for long-term tracking
- Adjustable saved amount and calories per ride
- Installable PWA for iPhone home screen
- Offline-friendly service worker

## Data Storage

Ride data is stored locally in the browser with `localStorage`.

This means your records stay on the device and are not sent to a server. Data can be lost if the user clears browser website data, deletes the installed PWA and its associated data, or switches to another device/browser.

## Development

This project has no runtime dependencies.

```bash
npm run build
```

The build script creates a `dist/` folder with the minimal server entry expected by the current hosting target.

For local static testing, you can also open `index.html` directly in a browser.

## License

MIT
