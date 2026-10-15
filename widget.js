// Macro Widget for Scriptable (iPhone lock screen)
// Widget parameter picks what to show:
//   cal      -> calorie ring (circular)
//   protein  -> protein ring (circular)
//   fat      -> fat ring (circular)
//   carbs    -> carb ring (circular)
//   tip      -> tip of the day (rectangular)
//   rings    -> all four rings in one wide widget (rectangular)
//   (inline widget above the clock ignores the parameter)

const DATA_URL = "https://raw.githubusercontent.com/justinady80/macro-widget/main/today.json";
const param = (args.widgetParameter || "tip").trim().toLowerCase();
const family = config.widgetFamily || "accessoryRectangular";

async function loadData() {
  try {
    const req = new Request(DATA_URL + "?t=" + Date.now());
    req.timeoutInterval = 10;
    return await req.loadJSON();
  } catch (e) {
    return null;
  }
}

function todayString() {
  const df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
}

// Draws a ring showing how much of the goal is used.
function ringImage(fraction, size, lineWidth) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const c = size / 2;
  const r = c - lineWidth / 2 - 1;

  ctx.setStrokeColor(new Color("#ffffff", 0.3));
  ctx.setLineWidth(lineWidth);
  ctx.strokeEllipse(new Rect(c - r, c - r, 2 * r, 2 * r));

  const f = Math.max(0, Math.min(1, fraction));
  if (f > 0) {
    const path = new Path();
    const steps = Math.max(2, Math.round(120 * f));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + 2 * Math.PI * f * (i / steps);
      const p = new Point(c + r * Math.cos(a), c + r * Math.sin(a));
      if (i === 0) path.move(p); else path.addLine(p);
    }
    ctx.addPath(path);
    ctx.setStrokeColor(Color.white());
    ctx.setLineWidth(lineWidth);
    ctx.strokePath();
  }
  return ctx.getImage();
}

const LABELS = {
  cal: { key: "calories", label: "cal left", unit: "" },
  protein: { key: "protein", label: "protein left", unit: "g" },
  fat: { key: "fat", label: "fat left", unit: "g" },
  carbs: { key: "carbs", label: "carbs left", unit: "g" },
};

function fmt(n) {
  return Math.round(n).toLocaleString("en-US");
}

function buildCircular(w, data, which) {
  const spec = LABELS[which] || LABELS.cal;
  const m = data.macros[spec.key];
  const left = m.goal - m.eaten;
  w.backgroundImage = ringImage(m.eaten / m.goal, 76, 7);
  w.addSpacer();
  const num = w.addText(left >= 0 ? fmt(left) + spec.unit : "+" + fmt(-left) + spec.unit);
  num.font = Font.boldSystemFont(left >= 1000 || left <= -1000 ? 12 : 14);
  num.centerAlignText();
  num.minimumScaleFactor = 0.6;
  const lab = w.addText(left >= 0 ? spec.label : "over");
  lab.font = Font.systemFont(8);
  lab.centerAlignText();
  lab.minimumScaleFactor = 0.7;
  w.addSpacer();
}

// Four small rings (cal, protein, fat, carbs) drawn into one wide image.
function fourRingsImage(data) {
  const W = 170, H = 72, n = 4, d = 34, line = 4;
  const ctx = new DrawContext();
  ctx.size = new Size(W, H);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const keys = [["calories", "Cal"], ["protein", "P"], ["fat", "F"], ["carbs", "C"]];
  const gap = (W - n * d) / n;
  keys.forEach(([key, short], i) => {
    const m = data.macros[key];
    const x = gap / 2 + i * (d + gap);
    const ring = ringImage(m.eaten / m.goal, d, line);
    ctx.drawImageInRect(ring, new Rect(x, 0, d, d));
    ctx.setTextColor(Color.white());
    ctx.setFont(Font.boldSystemFont(9));
    ctx.setTextAlignedCenter();
    ctx.drawTextInRect(short, new Rect(x, d / 2 - 6, d, 12));
    const left = m.goal - m.eaten;
    ctx.setFont(Font.systemFont(9));
    ctx.drawTextInRect(left >= 0 ? fmt(left) : "+" + fmt(-left), new Rect(x - gap / 2, d + 4, d + gap, 12));
    ctx.setFont(Font.systemFont(7));
    ctx.drawTextInRect(left >= 0 ? "left" : "over", new Rect(x - gap / 2, d + 16, d + gap, 10));
  });
  return ctx.getImage();
}

function buildRings(w, data) {
  const img = w.addImage(fourRingsImage(data));
  img.centerAlignImage();
}

function buildTip(w, data) {
  const c = data.macros.calories, p = data.macros.protein;
  const head = w.addText(
    fmt(c.eaten) + "/" + fmt(c.goal) + " cal · " + fmt(p.eaten) + "/" + fmt(p.goal) + "g P"
  );
  head.font = Font.boldSystemFont(12);
  head.minimumScaleFactor = 0.7;
  head.lineLimit = 1;
  const tip = w.addText(data.tip || "");
  tip.font = Font.systemFont(12);
  tip.lineLimit = 2;
  tip.minimumScaleFactor = 0.8;
}

function buildInline(w, data) {
  const c = data.macros.calories, p = data.macros.protein;
  const t = w.addText(
    fmt(Math.max(0, c.goal - c.eaten)) + " cal · " + fmt(Math.max(0, p.goal - p.eaten)) + "g protein left"
  );
  t.font = Font.systemFont(12);
}

const w = new ListWidget();
let data = await loadData();

if (!data) {
  w.addText("Can't load macros");
} else {
  // A new day with nothing logged yet starts from zero.
  if (data.date !== todayString()) {
    for (const k of Object.keys(data.macros)) data.macros[k].eaten = 0;
    data.tip = "Nothing logged today yet. Start with your oats or a shake.";
  }
  if (family === "accessoryCircular") buildCircular(w, data, param);
  else if (family === "accessoryInline") buildInline(w, data);
  else if (param === "rings") buildRings(w, data);
  else buildTip(w, data);
}

w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentAccessoryRectangular();
}
Script.complete();
