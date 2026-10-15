# macro-widget

iPhone lock screen widgets (via the Scriptable app) that show today's calories and macros, plus a tip for closing the day.

- `today.json` holds today's totals and tip. Claude updates it each time food is logged.
- `widget.js` is the Scriptable script. One script powers every widget; the widget parameter picks the view: `cal`, `protein`, `fat`, `carbs` (rings) or `tip` (rectangular).
