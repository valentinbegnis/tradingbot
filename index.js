import { VWAP } from "technicalindicators";
import tulind from "tulind";
import { unixToUTC } from "./utils/unixToUTC.js";
import { calculateVWAP } from "./utils/vwap.js";

const URL = 'https://fapi.binance.com';
const SYMBOL = 'MATICUSDT';
const INTERVAL = '5m';
const LIMIT = 1500;
const RSI_PERIOD = 14;

const response = await fetch(`${URL}/fapi/v1/klines?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${LIMIT}`);
const data = await response.json();

// rsi
const closingPrices = data.map(k => k[4]);
const rsi = await tulind.indicators.rsi.indicator([closingPrices], [RSI_PERIOD]);
// Las primeras 14 posiciones seran undefined, asi que agrego ceros
rsi[0].unshift(...[...new Array(14).fill(0)]);

// vwap
const openTimes = data.map(k => k[0]);
const newSessionKline = openTimes.findIndex(openTime => unixToUTC(openTime) === '0:0:0');
const vwap = [];

for (let i = newSessionKline; i < data.length; i++) {
  vwap.push({
    value: calculateVWAP(data[i]),
    openTime: data[i][0]
  })
}

// TO-DO: Desviaciones del VWAP

// klines con todos los datos
const klines = data.map((k, i) => ({
  unixOpen:  k[0],
  open:      parseFloat(k[1]),
  high:      parseFloat(k[2]),
  low:       parseFloat(k[3]),
  close:     parseFloat(k[4]),
  volume:    parseInt(k[5]),
  closeTime: k[6],
  rsi:       rsi[0][i]
}));

