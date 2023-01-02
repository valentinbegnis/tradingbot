import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as WebSocketServer } from 'socket.io';
import { client } from './config/clientData.js';
import { coin } from './config/coinConfig.js';
import tulind from 'tulind';

const PORT = process.env.PORT || 3000;
const RSI_PERIOD = 14;
const FIFTEEN_MINUTES_IN_UNIX = 4200000;

let priceCloses = [];
let rsi = [];
let vwapData = [];
let typicalPrice = 0;
let totalVp = 0;
let totalVolume = 0;
let sumVwap = 0;
let PERIOD = 0;
let DATASET = [];

const convertToUTCDate = unixTimestamp => {
  const date = new Date(unixTimestamp);
  return `${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`;
}

const calculateVWAP = candleData => {
  const isNewSession = convertToUTCDate(candleData.openTime || candleData.startTime) === '0:0:0';

  const high = parseFloat(candleData.high);
  const low = parseFloat(candleData.low);
  const close = parseFloat(candleData.close);
  const volume = parseFloat(candleData.volume);
  typicalPrice = (high + low + close) / 3;
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

const calculateVWAPDeviations = (candleData, vwap) => {
  const isNewSession = convertToUTCDate(candleData.openTime || candleData.startTime) === '0:0:0';

  if (isNewSession) {
    PERIOD = 1;
    DATASET = [];
    DATASET.push(candleData.close);
  } else {
    DATASET.push(candleData.close);
    PERIOD++;
  }

  let stddev;
  tulind.indicators.stddev.indicator([DATASET], [PERIOD], (err, results) => {
    if (err) {
      console.log(err);
      return;
    } else {
      stddev = results[0][0];
    }
  });

  return {
    upperBand1: vwap + stddev,
    upperBand2: vwap + (2 * stddev),
    upperBand3: vwap + (3 * stddev),
    lowerBand1: vwap - stddev,
    lowerBand2: vwap - (2 * stddev),
    lowerBand3: vwap - (3 * stddev)
  }
}

const app = express();
const server = http.createServer(app);
const io = new WebSocketServer(server, {
  cors: {
    origin: 'http://localhost:5173'
  }
});

app.use(express.json());
app.use(cors());

app.get('/candlesticks', async (req, res) => {

  // recibo data de velas de 5 minutos de futuros
  const candlesticks = await client.futuresCandles({
    symbol: coin.symbol,
    interval: coin.interval,
    limit: coin.limit
  });

  rsi = [];
  vwapData = [];
  priceCloses = candlesticks.map(result => result.close);
  const openTimes = candlesticks.map(result => result.openTime);
  const newSessionCandleIndex = openTimes.findIndex(openTime => convertToUTCDate(openTime) === '0:0:0');

  // RSI
  tulind.indicators.rsi.indicator([priceCloses], [RSI_PERIOD], (err, results) => {
    if (err) {
      console.log(err);
      return;
    } else {
      rsi = results[0].map((value, i) => ({ value, time: (openTimes[i] + FIFTEEN_MINUTES_IN_UNIX) / 1000 }));
    }
  });

  // VWAP
  for (let i = newSessionCandleIndex; i < candlesticks.length; i++) {
    const vwap = calculateVWAP(candlesticks[i]);
    const deviations = calculateVWAPDeviations(candlesticks[i], vwap);

    vwapData.push({
      vwap,
      deviations,
      openTime: candlesticks[i].openTime
    })
  }

  res.json({
    candlesticks,
    rsi,
    vwapData
  });
});

/*
app.get('/account-data', async (req, res) => {
  const accountBalance = await client.futuresAccountBalance();
  
  res.json({
    accountBalance
  })
});
*/
/*
io.on('connection', socket => {
  client.ws.futuresCandles(coin.symbol, coin.interval, candle => {
    socket.emit('candlestick-live-data', candle);

    if (priceCloses.length > 0) {
      const livePriceCloses = [...priceCloses, candle.close];

      tulind.indicators.rsi.indicator([livePriceCloses], [RSI_PERIOD], (err, results) => {
        if (err) {
          console.log(err)
          return;
        }

        const rsiValue = results[0].slice(-1)[0];
        rsi.push(rsiValue);
        socket.emit('rsi-live-data', rsiValue);
      });

      if (candle.isFinal) {
        const vwap = calculateVWAP(candle);
        const deviations = calculateVWAPDeviations(candle, vwap);
        vwapData.push({ vwap, deviations });
      }

      socket.emit('vwap-live-data', vwapData[vwapData.length - 1]);

      // Operatoria
      const actualRsi = rsi[rsi.length - 1];
      const actualVwapData = vwapData[vwapData.length - 1];
      const parsedCandle = parseFloat(candle.close);
      const highs = [];
      let lastRsi;

      if (
        parsedCandle > actualVwapData.deviations['upperBand2'] 
        && 
        ) {
       
      }
    }
  });
});
*/

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

