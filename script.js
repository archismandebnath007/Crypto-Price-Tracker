/* ── UTILITIES ── */
const fmtINR = n => '₹' + (n >= 1e7 ? (n/1e7).toFixed(2)+'Cr' : n >= 1e5 ? (n/1e5).toFixed(2)+'L' : n.toLocaleString('en-IN', {maximumFractionDigits:2}));
const fmtUSD = n => n >= 1e7 ? '₹'+(n/1e7).toFixed(2)+' Cr' : n >= 1e5 ? '₹'+(n/1e5).toFixed(2)+' L' : n >= 1000 ? '₹'+n.toLocaleString('en-IN', {maximumFractionDigits:2}) : '₹'+n.toFixed(2);
const fmtMcap = n => n >= 1e12 ? '₹'+(n/1e12).toFixed(2)+'T' : n >= 1e9 ? '₹'+(n/1e9).toFixed(2)+'B' : '₹'+(n/1e6).toFixed(0)+'M';
const fmtMcapINR = n => n >= 1e12 ? '₹'+(n/1e12).toFixed(2)+'L Cr' : n >= 1e7 ? '₹'+(n/1e7).toFixed(0)+' Cr' : '—';
const pct = n => (n >= 0 ? '+':'')+n.toFixed(2)+'%';
const clsChange = n => n >= 0 ? 'positive' : 'negative';
const pillCls  = n => n >= 0 ? 'up' : 'dn';

/* ── TOP 5 INDIAN STOCKS (NSE) via Yahoo Finance JSON ── */
const STOCKS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance',    icon: '🔵', marketCap: '19.8L Cr' },
  { symbol: 'TCS.NS',       name: 'TCS',          icon: '🟣', marketCap: '13.6L Cr' },
  { symbol: 'HDFCBANK.NS',  name: 'HDFC Bank',    icon: '🔴', marketCap: '12.3L Cr' },
  { symbol: 'INFY.NS',      name: 'Infosys',      icon: '🟢', marketCap: '6.1L Cr'  },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank',   icon: '🟠', marketCap: '8.9L Cr'  },
];

const YAHOO_API = sym =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=7d&includePrePost=false`;

async function fetchStock(sym) {
  try {
    const url = YAHOO_API(sym);
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const json = await res.json();
    const meta = json.chart.result[0].meta;
    const closes = json.chart.result[0].indicators.quote[0].close || [];
    const validCloses = closes.filter(v => v != null);
    return { price: meta.regularMarketPrice, prev: meta.chartPreviousClose, closes: validCloses };
  } catch(e) {
    return null;
  }
}

/* ── TOP 5 CRYPTO via CoinGecko ── */
const CRYPTO_IDS = 'bitcoin,ethereum,binancecoin,solana,ripple';

async function fetchCrypto() {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&ids=${CRYPTO_IDS}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;
    const res = await fetch(url);
    return await res.json();
  } catch(e) { return []; }
}

/* ── MINI SPARKLINE ── */
function drawSparkline(canvasId, prices, isUp) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !prices || prices.length < 2) return;
  const color = isUp ? '#1a7a3c' : '#c0392b';
  if (window._sparkCharts && window._sparkCharts[canvasId]) window._sparkCharts[canvasId].destroy();
  if (!window._sparkCharts) window._sparkCharts = {};
  window._sparkCharts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: prices.map((_,i) => i),
      datasets: [{ data: prices, borderColor: color, borderWidth: 2, tension: 0.4,
        fill: true, pointRadius: 0,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0,0,0,56);
          g.addColorStop(0, color+'33'); g.addColorStop(1, color+'00'); return g;
        }
      }]
    },
    options: { responsive: false, animation: false, plugins:{ legend:{display:false}, tooltip:{enabled:false} },
      scales:{ x:{display:false}, y:{display:false} } }
  });
}

/* ── RENDER STOCK CARDS ── */
function renderStockCards(data) {
  const grid = document.getElementById('stock-cards');
  grid.innerHTML = '';
  data.forEach((s, i) => {
    if (!s.data) return;
    const change = s.data.price - s.data.prev;
    const changePct = (change / s.data.prev) * 100;
    const isUp = change >= 0;
    const canvasId = `sc-${i}`;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div class="coin-img-wrap" style="font-size:22px;">${s.icon}</div>
        <span class="change-pill ${pillCls(changePct)}">${pct(changePct)}</span>
      </div>
      <div class="card-name">${s.name}</div>
      <div class="card-symbol">${s.symbol.replace('.NS','')}</div>
      <div class="card-price">₹${s.data.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
      <div class="card-sub ${clsChange(change)}">${change >= 0 ? '▲' : '▼'} ₹${Math.abs(change).toFixed(2)}</div>
      <div class="card-chart"><canvas id="${canvasId}" width="200" height="56"></canvas></div>
    `;
    grid.appendChild(card);
    setTimeout(() => drawSparkline(canvasId, s.data.closes, isUp), 10);
  });
}

/* ── RENDER STOCK TABLE ── */
function renderStockTable(data) {
  const tbody = document.getElementById('stock-table-body');
  tbody.innerHTML = data.map((s, i) => {
    if (!s.data) return '';
    const change = s.data.price - s.data.prev;
    const changePct = (change / s.data.prev) * 100;
    const canvasId = `st-${i}`;
    setTimeout(() => drawSparkline(canvasId, s.data.closes, change >= 0), 20);
    return `
      <tr>
        <td>
          <div class="table-coin-info">
            <div class="table-icon" style="font-size:18px;">${s.icon}</div>
            <div>
              <div class="t-name">${s.name}</div>
              <div class="t-sym">${s.symbol.replace('.NS','')}.NSE</div>
            </div>
          </div>
        </td>
        <td>₹${s.data.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
        <td class="${clsChange(change)}">${change >= 0 ? '+' : ''}₹${change.toFixed(2)}</td>
        <td class="${clsChange(changePct)}">${pct(changePct)}</td>
        <td style="color:var(--muted);">${s.marketCap}</td>
        <td class="spark-td"><canvas id="${canvasId}" width="90" height="36"></canvas></td>
      </tr>`;
  }).join('');
}

/* ── RENDER CRYPTO CARDS ── */
function renderCryptoCards(coins) {
  const grid = document.getElementById('crypto-cards');
  grid.innerHTML = '';
  coins.forEach((c, i) => {
    const isUp = (c.price_change_percentage_24h || 0) >= 0;
    const canvasId = `cc-${i}`;
    const prices = c.sparkline_in_7d ? c.sparkline_in_7d.price : [];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <div class="coin-img-wrap">
          <img src="${c.image}" alt="${c.symbol}" onerror="this.style.display='none'"/>
        </div>
        <span class="change-pill ${pillCls(c.price_change_percentage_24h || 0)}">${pct(c.price_change_percentage_24h || 0)}</span>
      </div>
      <div class="card-name">${c.name}</div>
      <div class="card-symbol">${c.symbol.toUpperCase()}</div>
      <div class="card-price">${fmtUSD(c.current_price)}</div>
      <div class="card-sub" style="color:var(--muted);">MCap: ${fmtMcap(c.market_cap)}</div>      <div class="card-chart"><canvas id="${canvasId}" width="200" height="56"></canvas></div>
    `;
    grid.appendChild(card);
    setTimeout(() => drawSparkline(canvasId, prices, isUp), 10);
  });
}

/* ── RENDER CRYPTO TABLE ── */
function renderCryptoTable(coins) {
  const tbody = document.getElementById('crypto-table-body');
  tbody.innerHTML = coins.map((c, i) => {
    const chg = c.price_change_percentage_24h || 0;
    const canvasId = `ct-${i}`;
    const prices = c.sparkline_in_7d ? c.sparkline_in_7d.price : [];
    setTimeout(() => drawSparkline(canvasId, prices, chg >= 0), 20);
    return `
      <tr>
        <td style="color:var(--muted);font-size:12px;">${c.market_cap_rank}</td>
        <td>
          <div class="table-coin-info">
            <div class="table-icon"><img src="${c.image}" alt="${c.symbol}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/></div>
            <div>
              <div class="t-name">${c.name}</div>
              <div class="t-sym">${c.symbol.toUpperCase()}</div>
            </div>
          </div>
        </td>
        <td>${fmtUSD(c.current_price)}</td>
        <td class="${clsChange(chg)}">${pct(chg)}</td>
        <td>${fmtMcap(c.market_cap)}</td>
        <td style="color:var(--muted);">${fmtMcap(c.total_volume)}</td>
        <td class="spark-td"><canvas id="${canvasId}" width="90" height="36"></canvas></td>
      </tr>`;
  }).join('');
}

/* ── TICKER TAPE ── */
function buildTicker(stocks, cryptos) {
  const items = [];
  stocks.forEach(s => {
    if (!s.data) return;
    const chg = ((s.data.price - s.data.prev) / s.data.prev * 100);
    items.push(`<div class="ticker-item">
      <span class="ticker-name">${s.symbol.replace('.NS','')}</span>
      <span class="ticker-price">₹${s.data.price.toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
      <span class="ticker-change ${clsChange(chg)}">${pct(chg)}</span>
    </div>`);
  });
  cryptos.forEach(c => {
    const chg = c.price_change_percentage_24h || 0;
    items.push(`<div class="ticker-item">
      <span class="ticker-name">${c.symbol.toUpperCase()}</span>
      <span class="ticker-price">${fmtUSD(c.current_price)}</span>
      <span class="ticker-change ${clsChange(chg)}">${pct(chg)}</span>
    </div>`);
  });
  const track = document.getElementById('ticker-track');
  const html = items.join('');
  track.innerHTML = html + html; // duplicate for seamless loop
}

/* ── NAV SCROLL ── */
function scrollToSection(section, el) {
  document.querySelectorAll('[data-section]').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
  const target = document.getElementById(section + '-section');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── MAIN LOAD ── */
async function loadAll() {
  // Fetch stocks in parallel
  const stockData = await Promise.all(STOCKS.map(async s => ({
    ...s,
    data: await fetchStock(s.symbol)
  })));

  // Fetch crypto
  const cryptoData = await fetchCrypto();

  renderStockCards(stockData);
  renderStockTable(stockData);
  renderCryptoCards(cryptoData);
  renderCryptoTable(cryptoData);
  buildTicker(stockData, cryptoData);
}

loadAll();

// Auto refresh every 60s
setInterval(loadAll, 60000);