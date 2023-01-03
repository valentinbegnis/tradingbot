import { coin } from "./config/coinData.js";
import { unixToUTC } from "./utils/unixToUTC.js";
import { calculateVWAP } from "./utils/vwap.js";
import { RSI } from "technicalindicators";

const URL = 'https://fapi.binance.com';
const RSI_PERIOD = 14;
const { symbol, interval, limit } = coin;

const response = await fetch(`${URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
const data = await response.json();

// RSI
const closingPrices = data.map(k => k[4]);
const rsi = RSI.calculate({ period: RSI_PERIOD, values: closingPrices });
rsi.unshift(...[...new Array(14).fill(0)]);

// VWAP
const openTimes = data.map(k => k[0]);
const newSessionKline = openTimes.findIndex(openTime => unixToUTC(openTime) === '0:0:0');
const vwap = [];

vwap.unshift(...[...new Array(newSessionKline).fill(0)]);

for (let i = newSessionKline; i < data.length; i++) {
  vwap.push(calculateVWAP(data[i]))
}

// TO-DO: VWAP Deviations

// Klines with all the data
const klines = data.map((k, i) => ({
  unixOpen:  k[0],
  open:      parseFloat(k[1]),
  high:      parseFloat(k[2]),
  low:       parseFloat(k[3]),
  close:     parseFloat(k[4]),
  volume:    parseInt(k[5]),
  closeTime: k[6],
  rsi:       rsi[i],
  vwap:      vwap[i]
}));

console.log(klines)