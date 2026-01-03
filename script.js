const chart = LightweightCharts.createChart(document.getElementById('chart'), {
  layout: { background: { color: '#0f172a' }, textColor: '#e5e7eb' },
  width: window.innerWidth - 20,
  height: 320
});

const candleSeries = chart.addCandlestickSeries();
const volumeSeries = chart.addHistogramSeries({
  priceFormat: { type: 'volume' },
  priceScaleId: '',
});

volumeSeries.priceScale().applyOptions({
  scaleMargins: { top: 0.8, bottom: 0 }
});

async function fetchData() {
  const symbol = document.getElementById('symbol').value;
  const interval = document.getElementById('interval').value;

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=50`;
  const res = await fetch(url);
  const data = await res.json();

  const candles = data.map(d => ({
    time: d[0] / 1000,
    open: +d[1],
    high: +d[2],
    low: +d[3],
    close: +d[4]
  }));

  const volumes = data.map(d => ({
    time: d[0] / 1000,
    value: +d[5],
    color: d[4] >= d[1] ? '#16a34a' : '#dc2626'
  }));

  candleSeries.setData(candles);
  volumeSeries.setData(volumes);

  analyzeMarket(candles, volumes);
}

function analyzeMarket(candles, volumes) {
  const last = candles.at(-1);
  const prev = candles.slice(-21, -1);

  const avgRange = prev.reduce((a,c)=>a+(c.high-c.low),0)/prev.length;
  const avgVol = volumes.slice(-21,-1).reduce((a,v)=>a+v.value,0)/prev.length;

  const range = last.high - last.low;
  const strong =
    (last.close - last.low)/range > 0.7 ||
    (last.high - last.close)/range > 0.7;

  let score = 0;
  let reasons = [];

  if (range > avgRange * 1.2) { score++; reasons.push("✔ Volatility"); }
  if (volumes.at(-1).value > avgVol) { score++; reasons.push("✔ Volume"); }
  if (last.close > Math.max(...prev.map(c=>c.high)) ||
      last.close < Math.min(...prev.map(c=>c.low))) {
    score++; reasons.push("✔ Breakout");
  }
  if (strong) { score++; reasons.push("✔ Momentum"); }

  const box = document.getElementById('signalBox');
  const cond = document.getElementById('conditions');

  if (score >= 3) {
    box.className = "signal trade";
    box.innerText = "🟢 TRADE";
  } else if (score === 2) {
    box.className = "signal wait";
    box.innerText = "🟡 WAIT";
  } else {
    box.className = "signal no";
    box.innerText = "🔴 NO TRADE";
  }

  cond.innerHTML = reasons.join("<br>");
}

fetchData();
setInterval(fetchData, 300000); // 5 min
