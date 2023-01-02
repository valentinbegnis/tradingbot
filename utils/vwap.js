import { unixToUTC } from "./unixToUTC.js";

let totalVp = 0;
let totalVolume = 0;
let sumVwap = 0;

export const calculateVWAP = candleData => {
  const isNewSession = unixToUTC(candleData[0]) === '0:0:0';

  const high = parseFloat(candleData[2]);
  const low = parseFloat(candleData[3]);
  const close = parseFloat(candleData[4]);
  const volume = parseFloat(candleData[5]);
  const typicalPrice = (high + low + close) / 3;
  const vp = typicalPrice * volume;

  if (isNewSession) {
    totalVp = vp;
    totalVolume = volume;
    sumVwap = 0;
  } else {
    totalVp += vp;
    totalVolume += volume;
  }

  return totalVp / totalVolume;
}