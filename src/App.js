import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// RSI Component with real-time analysis
const RSIAnalysis = () => {
  const [rsiData, setRsiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  // RSI Calculation Function (Fixed for accurate timing)
  const calculateRSI = (prices, period = 14) => {
    if (prices.length < period + 1) return null;
    
    let gains = [];
    let losses = [];
    
    // Calculate price changes
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    if (gains.length < period) return null;
    
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // For the first RSI calculation
    if (gains.length === period) {
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    }
    
    // Calculate RSI using Wilder's smoothing for subsequent periods
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  // Fetch RSI Data
  const fetchRSIData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch last 100 hours of data for RSI calculation
      const response = await axios.get('https://api.binance.com/api/v3/klines', {
        params: {
          symbol: 'SOLUSDT',
          interval: '1h',
          limit: 100
        }
      });
      
      const data = response.data;
      const closePrices = data.map(candle => parseFloat(candle[4])); // Close prices
      
      // Calculate current RSI
      const currentRSI = calculateRSI(closePrices);
      const currentPrice = closePrices[closePrices.length - 1];
      
      // Calculate RSI for historical display (last 24 hours)
      // Fix: Calculate RSI for each specific candle using exact data up to that point
      const historicalRSI = [];
      
      // Start from index 14 (after we have enough data for RSI calculation)
      for (let i = 14; i < data.length; i++) {
        const pricesUpToThisPoint = data.slice(0, i + 1).map(candle => parseFloat(candle[4]));
        const rsiValue = calculateRSI(pricesUpToThisPoint);
        const utcTime = new Date(data[i][0]);
        const karachiTime = new Date(utcTime.getTime() + (5 * 60 * 60 * 1000));
        const timeStr = karachiTime.toISOString().split('T')[1].split(':').slice(0, 2).join(':');
        
        if (rsiValue && rsiValue > 0) {
          historicalRSI.push({
            time: karachiTime,
            price: parseFloat(data[i][4]),
            rsi: rsiValue,
            formattedTime: timeStr + ' PKT',
            fullDateTime: karachiTime.toISOString().replace('T', ' ').split('.')[0] + ' PKT'
          });
        }
      }
      
      // Get last 24 hours for display
      const last24Hours = historicalRSI.slice(-24);
      
      setRsiData({
        currentRSI: currentRSI,
        currentPrice: currentPrice,
        previousRSI: last24Hours.length > 1 ? last24Hours[last24Hours.length - 2].rsi : null,
        change24h: data.length >= 24 ? ((currentPrice - parseFloat(data[data.length - 25][4])) / parseFloat(data[data.length - 25][4])) * 100 : 0
      });
      
      setHistoricalData(last24Hours);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch RSI data');
      setLoading(false);
      console.error('RSI fetch error:', err);
    }
  };

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchRSIData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRSIData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get RSI status and color
  const getRSIStatus = (rsi) => {
    if (rsi >= 70) return { status: 'Overbought', color: '#dc2626', bgColor: '#fef2f2' };
    if (rsi <= 30) return { status: 'Oversold', color: '#059669', bgColor: '#f0fdf4' };
    return { status: 'Neutral', color: '#3b82f6', bgColor: '#eff6ff' };
  };

  if (loading) {
    return (
      <div className="trading-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading RSI Data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trading-container">
        <div className="error-container" style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '16px',
          padding: '2rem',
          textAlign: 'center',
          color: '#dc2626'
        }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button 
            onClick={fetchRSIData}
            className="modern-button modern-button-primary"
            style={{ marginTop: '1rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rsiStatus = getRSIStatus(rsiData?.currentRSI || 0);

  return (
    <div className="trading-container">
      {/* Header */}
      <div className="rsi-header">
        <h2>Solana (SOL) RSI Analysis</h2>
        <div className="last-update">
          Last Updated: {lastUpdate ? new Date(lastUpdate.getTime() + (5 * 60 * 60 * 1000)).toISOString().split('T')[1].split(':').slice(0, 2).join(':') + ' PKT' : ''}
          <button 
            onClick={fetchRSIData}
            className="refresh-button"
            style={{
              marginLeft: '1rem',
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main RSI Display */}
      <div className="rsi-main-display">
        <div className="rsi-gauge-container">
          <div className="rsi-gauge">
            <div className="rsi-value">
              <span className="rsi-number">{rsiData?.currentRSI?.toFixed(2) || '0.00'}</span>
              <span className="rsi-label">RSI (14)</span>
            </div>
            <div 
              className="rsi-status"
              style={{
                background: rsiStatus.bgColor,
                color: rsiStatus.color,
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontWeight: '600',
                marginTop: '1rem'
              }}
            >
              {rsiStatus.status}
            </div>
          </div>
          
          <div className="rsi-progress-bar">
            <div className="rsi-bar-bg">
              <div 
                className="rsi-bar-fill"
                style={{
                  width: `${(rsiData?.currentRSI || 0)}%`,
                  background: rsiStatus.color
                }}
              ></div>
              <div className="rsi-markers">
                <span style={{ left: '30%' }}>30</span>
                <span style={{ left: '50%' }}>50</span>
                <span style={{ left: '70%' }}>70</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Price Info */}
        <div className="price-info">
          <div className="price-card">
            <h3>Current Price</h3>
            <div className="price-value">${rsiData?.currentPrice?.toFixed(4) || '0.0000'}</div>
            <div className={`price-change ${(rsiData?.change24h || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(rsiData?.change24h || 0) >= 0 ? '+' : ''}{rsiData?.change24h?.toFixed(2) || '0.00'}% (24h)
            </div>
          </div>
        </div>
      </div>

      {/* RSI Interpretation */}
      <div className="rsi-interpretation">
        <h3>RSI Interpretation</h3>
        <div className="interpretation-grid">
          <div className="interpretation-item oversold">
            <div className="range">0 - 30</div>
            <div className="meaning">Oversold</div>
            <div className="description">Potential buying opportunity</div>
          </div>
          <div className="interpretation-item neutral">
            <div className="range">30 - 70</div>
            <div className="meaning">Neutral</div>
            <div className="description">Normal trading range</div>
          </div>
          <div className="interpretation-item overbought">
            <div className="range">70 - 100</div>
            <div className="meaning">Overbought</div>
            <div className="description">Potential selling opportunity</div>
          </div>
        </div>
      </div>

      {/* Recent RSI History */}
      <div className="rsi-history">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Last 24 Hours RSI Values</h3>
          <div style={{ 
            background: '#eff6ff', 
            color: '#3b82f6', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px', 
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            All times in PKT (Karachi Time - matches TradingView)
          </div>
        </div>
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Time (PKT)</th>
                <th>Price</th>
                <th>RSI</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.slice(-12).reverse().map((item, index) => {
                const status = getRSIStatus(item.rsi);
                return (
                  <tr key={index}>
                    <td>{item.formattedTime}</td>
                    <td>${item.price.toFixed(4)}</td>
                    <td>{item.rsi.toFixed(2)}</td>
                    <td>
                      <span 
                        style={{
                          color: status.color,
                          fontWeight: '600'
                        }}
                      >
                        {status.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ClosingPriceTable = () => {
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState(''); // Track loading phases
  const [loadingProgress, setLoadingProgress] = useState(0); // Track progress
  const [error, setError] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(1); // Default to 1 month
  const [selectedCoin, setSelectedCoin] = useState('SOLUSDT'); // Default to Solana
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }); // Default to current date
  const [summaryStats, setSummaryStats] = useState({
    highestPrice: 0,
    lowestPrice: 0,
    firstPrice: 0,
    lastPrice: 0,
    totalChange: 0,
    changePercent: 0
  });
  // Initialize all days and hours as selected
  const [selectedDayHourCombos, setSelectedDayHourCombos] = useState(
    [].concat(...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
      Array.from({length: 24}, (_, i) => `${day}-${i.toString().padStart(2, '0')}`)
    ))
  );
  // Initialize all dates (1-31) as selected
  const [selectedDates, setSelectedDates] = useState(
    Array.from({length: 31}, (_, i) => (i + 1).toString())
  );
  // Initialize all hours (00-23) as selected
  const [selectedHours, setSelectedHours] = useState(
    Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'))
  );
  const [filterMode, setFilterMode] = useState("day"); // "day" or "date" or "hour"
  
  // New state for all coins analysis
  const [allCoinsPatterns, setAllCoinsPatterns] = useState({});
  const [isAnalyzingAllCoins, setIsAnalyzingAllCoins] = useState(false);
  const [allCoinsProgress, setAllCoinsProgress] = useState(0);
  const [currentAnalyzingCoin, setCurrentAnalyzingCoin] = useState('');
  
  // State for weekly filter in All Coins Analysis
  const [selectedWeekDays, setSelectedWeekDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingPhase('Fetching data from Binance...');
        setLoadingProgress(0);
        
        let allData = [];
        let endTime = undefined;
        const hoursPerMonth = 730; // Average hours in a month (30.42 days)
        const totalNeeded = selectedMonths * hoursPerMonth; // Calculate needed hours based on selected months
        const maxLimit = 1000;
        let fetchedCount = 0;

        while (allData.length < totalNeeded) {
          const params = {
            symbol: selectedCoin,
            interval: '1h',
            limit: maxLimit,
          };
          
          // Calculate endTime from selectedStartDate if it exists
          if (endTime) {
            params.endTime = endTime;
          } else if (selectedStartDate) {
            const startDateTime = new Date(selectedStartDate);
            startDateTime.setHours(23, 59, 59, 999);
            params.endTime = startDateTime.getTime();
          }

          const response = await axios.get('https://api.binance.com/api/v3/klines', { params });
          const data = response.data;

          if (!data.length) break; // No more data available

          allData = [...data, ...allData]; // Prepend to keep chronological order
          endTime = data[0][0] - 1; // Move endTime back for next request

          fetchedCount += data.length;
          const progress = Math.min((fetchedCount / totalNeeded) * 100, 100);
          setLoadingProgress(Math.round(progress));

          // Larger delay for rate limiting
          await new Promise(res => setTimeout(res, 300));
        }

        setLoadingPhase('Processing data...');
        await new Promise(res => setTimeout(res, 100)); // Allow UI to update

        const combinedData = allData.slice(-totalNeeded);
        
        setLoadingPhase('Calculating time periods...');
        const processed = await processDataInChunks(combinedData);
        setProcessedData(processed);

        // Calculate summary stats in chunks
        setLoadingPhase('Calculating statistics...');
        await calculateSummaryStats(processed);

        setLoading(false);
        setLoadingPhase('');
        setLoadingProgress(0);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data. Please try again later.");
        setLoading(false);
        setLoadingPhase('');
        setLoadingProgress(0);
      }
    };

    fetchData();
  }, [selectedMonths, selectedCoin, selectedStartDate]); // Add selectedStartDate to dependency array

  // Function to analyze patterns for all coins
  const analyzeAllCoins = async () => {
    setIsAnalyzingAllCoins(true);
    setAllCoinsProgress(0);
    setAllCoinsPatterns({});
    
    const allCoins = [
      'SOLUSDT', 'ETHUSDT', 'XRPUSDT', 'BTCUSDT', 'BCHUSDT', 'LTCUSDT', 'XMRUSDT', 'DAIUSDT', 
      'AAVEUSDT', 'BNBUSDT', 'TRXUSDT', 'XLMUSDT', 'AVAXUSDT', 'OPUSDT', 'DOGEUSDT', 'LINKUSDT', 
      'ATOMUSDT', 'ADAUSDT', 'SUIUSDT', 'INJUSDT', 'GRTUSDT', 'HBARUSDT', 'UNIUSDT', 'DOTUSDT', 
      'TONUSDT', 'TAOUSDT', 'ENAUSDT', 'ONDOUSDT', 'ICPUSDT', 'APTUSDT', 'POLUSDT', 'ALGOUSDT', 'PENGUUSDT'
    ];
    
    const results = {};
    
    for (let i = 0; i < allCoins.length; i++) {
      const coin = allCoins[i];
      setCurrentAnalyzingCoin(coin);
      
      try {
        // Fetch data for this coin
        let allData = [];
        let endTime = undefined;
        const hoursPerMonth = 730;
        const totalNeeded = selectedMonths * hoursPerMonth;
        const maxLimit = 1000;
        
        while (allData.length < totalNeeded) {
          const params = {
            symbol: coin,
            interval: '1h',
            limit: maxLimit,
          };
          
          if (endTime) {
            params.endTime = endTime;
          } else if (selectedStartDate) {
            const startDateTime = new Date(selectedStartDate);
            startDateTime.setHours(23, 59, 59, 999);
            params.endTime = startDateTime.getTime();
          }

          const response = await axios.get('https://api.binance.com/api/v3/klines', { params });
          const data = response.data;

          if (!data.length) break;

          allData = [...data, ...allData];
          endTime = data[0][0] - 1;

          await new Promise(res => setTimeout(res, 300));
        }

        // Process data for this coin
        const combinedData = allData.slice(-totalNeeded);
        const processed = await processDataInChunks(combinedData);
        
        // Calculate patterns for this coin
        const patterns = await calculatePatternsForCoin(processed);
        results[coin] = patterns;
        
      } catch (error) {
        console.error(`Error analyzing ${coin}:`, error);
        results[coin] = [];
      }
      
      // Update progress
      const progress = ((i + 1) / allCoins.length) * 100;
      setAllCoinsProgress(Math.round(progress));
      
      // Small delay to prevent rate limiting
      await new Promise(res => setTimeout(res, 100));
    }
    
    setAllCoinsPatterns(results);
    setIsAnalyzingAllCoins(false);
    setCurrentAnalyzingCoin('');
    setAllCoinsProgress(0);
  };

  // Helper function to calculate patterns for a specific coin
  const calculatePatternsForCoin = async (processedData) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let allPatterns = [];

    // Function to get day and hour from a data point
    const getDayHour = (dataPoint) => {
      const [day, date, time] = dataPoint.compactTime.split(", ");
      const hour = time.split(":")[0];
      return { day, hour };
    };

    // Process a single day-hour combination
    const processDayHourCombo = async (buyDayIndex, buyHour, days) => {
      const results = [];
      for (let sellDayIndex = 0; sellDayIndex < days.length; sellDayIndex++) {
        for (let sellHour = 0; sellHour < 24; sellHour++) {
          if (buyDayIndex === sellDayIndex && sellHour <= buyHour) continue;
          
          let profitCount = 0;
          let totalProfit = 0;
          let totalBuyPrice = 0;
          let instances = [];

          for (let i = 0; i < processedData.length - 1; i++) {
            const buyPoint = getDayHour(processedData[i]);
            if (buyPoint.day === days[buyDayIndex] && buyPoint.hour === buyHour.toString().padStart(2, '0')) {
              for (let j = i + 1; j < processedData.length; j++) {
                const sellPoint = getDayHour(processedData[j]);
                if (sellPoint.day === days[sellDayIndex] && sellPoint.hour === sellHour.toString().padStart(2, '0')) {
                  const buyPrice = parseFloat(processedData[i].closingPrice);
                  const sellPrice = parseFloat(processedData[j].closingPrice);
                  const profit = sellPrice - buyPrice;
                  
                  if (profit > 0) {
                    profitCount++;
                    totalProfit += profit;
                    totalBuyPrice += buyPrice;
                    instances.push({
                      buyDate: processedData[i].compactTime,
                      sellDate: processedData[j].compactTime,
                      buyPrice: buyPrice.toFixed(2),
                      sellPrice: sellPrice.toFixed(2),
                      profit: profit.toFixed(2)
                    });
                  }
                  break;
                }
              }
            }
          }

          if (profitCount >= 3) {
            const avgProfit = totalProfit / profitCount;
            const avgBuyPrice = totalBuyPrice / profitCount;
            results.push({
              buyDay: days[buyDayIndex],
              buyHour: buyHour.toString().padStart(2, '0'),
              sellDay: days[sellDayIndex],
              sellHour: sellHour.toString().padStart(2, '0'),
              profitCount,
              averageProfit: avgProfit.toFixed(2),
              averageROI: ((avgProfit / avgBuyPrice) * 100).toFixed(2),
              instances
            });
          }
        }
      }
      return results;
    };

    for (let buyDayIndex = 0; buyDayIndex < days.length; buyDayIndex++) {
      for (let buyHour = 0; buyHour < 24; buyHour++) {
        const results = await processDayHourCombo(buyDayIndex, buyHour, days);
        allPatterns = [...allPatterns, ...results];
      }
    }

    // Sort and get top 5
    return allPatterns
      .sort((a, b) => {
        if (b.profitCount !== a.profitCount) {
          return b.profitCount - a.profitCount;
        }
        return parseFloat(b.averageProfit) - parseFloat(a.averageProfit);
      })
      .slice(0, 5);
  };

  // Process data in chunks to prevent UI freezing
  const processDataInChunks = async (data) => {
    const chunkSize = 1000;
    const chunks = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    let processed = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const processedChunk = chunk.map((row, index) => {
        const timestamp = row[0];
        const closingPrice = parseFloat(row[4]);
        const volume = parseFloat(row[5]);
        
        const date = new Date(timestamp);
        const timeString = date.toLocaleString('en-US', {
          weekday: 'short',
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        const weekday = date.toLocaleString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleString('en-US', { month: '2-digit', day: '2-digit' });
        const year = date.toLocaleString('en-US', { year: '2-digit' });
        const hourMinute = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const compactTimeString = `${weekday}, ${monthDay}/${year}, ${hourMinute}`;

        return {
          period: (i * chunkSize) + index + 1,
          time: timeString,
          compactTime: compactTimeString,
          closingPrice: closingPrice.toFixed(2),
          volume: volume.toLocaleString(),
          change: index > 0 ? (closingPrice - parseFloat(chunk[index-1][4])).toFixed(2) : '0.00',
          timestamp: timestamp
        };
      });

      processed = [...processed, ...processedChunk];
      setLoadingProgress(Math.round((i + 1) / chunks.length * 100));
      await new Promise(res => setTimeout(res, 0)); // Let UI breathe
    }

    return processed;
  };

  // Calculate summary stats in chunks
  const calculateSummaryStats = async (data) => {
    const prices = data.map(d => parseFloat(d.closingPrice));
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const totalChange = (lastPrice - firstPrice).toFixed(2);
    const changePercent = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);

    setSummaryStats({
      highestPrice,
      lowestPrice,
      firstPrice,
      lastPrice,
      totalChange,
      changePercent
    });
  };

  if (loading) {
    return (
      <div className="loading-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: '#f5f7fa',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        margin: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1976d2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <div style={{
          fontSize: '18px',
          color: '#1976d2',
          marginBottom: '10px',
          fontWeight: 'bold'
        }}>
          {loadingPhase}
        </div>
        <div style={{
          width: '300px',
          height: '8px',
          background: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${loadingProgress}%`,
            height: '100%',
            background: '#1976d2',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{
          marginTop: '10px',
          color: '#666'
        }}>
          {loadingProgress}% Complete
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  // Filter data by selected weekdays, dates, or hours
  const filteredData = processedData.filter(row => {
    if (filterMode === "day") {
      // New: filter by selected day-hour combos
      const day = row.compactTime.split(",")[0];
      const hour = row.compactTime.split(",")[2].trim().split(":")[0];
      const combo = `${day}-${hour}`;
      if (selectedDayHourCombos.length === 0) return false;
      return selectedDayHourCombos.includes(combo);
    } else if (filterMode === "date") {
      const datePart = row.compactTime.split(",")[1].trim(); // "05/02"
      const dayOfMonth = parseInt(datePart.split("/")[1], 10);
      return selectedDates.includes(dayOfMonth.toString());
    } else if (filterMode === "hour") {
      const hourPart = row.compactTime.split(",")[2].trim().split(":")[0]; // "10"
      return selectedHours.includes(hourPart);
    }
    return true;
  });

  return (
    <div className="trading-container">
      {/* Coin and Month Selector Dropdowns */}
      <div className="control-panel">
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "20px", 
          flexWrap: "wrap",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label className="modern-label">Select Coin:</label>
              <select
                value={selectedCoin}
                onChange={(e) => {
                  setSelectedCoin(e.target.value);
                  setLoading(true);
                }}
                className="modern-select"
              >
                <option value="SOLUSDT">Solana (SOL)</option>
                <option value="ETHUSDT">Ethereum (ETH)</option>
                <option value="XRPUSDT">XRP (XRP)</option>
                <option value="BTCUSDT">Bitcoin (BTC)</option>
                <option value="BCHUSDT">Bitcoin Cash (BCH)</option>
                <option value="LTCUSDT">Litecoin (LTC)</option>
                <option value="XMRUSDT">Monero (XMR)</option>
                <option value="DAIUSDT">Dai (DAI)</option>
                <option value="AAVEUSDT">Aave (AAVE)</option>
                <option value="BNBUSDT">Binance Coin (BNB)</option>
                <option value="TRXUSDT">Tron (TRX)</option>
                <option value="XLMUSDT">Stellar (XLM)</option>
                <option value="AVAXUSDT">Avalanche (AVAX)</option>
                <option value="OPUSDT">Optimism (OP)</option>
                <option value="DOGEUSDT">Dogecoin (DOGE)</option>
                <option value="LINKUSDT">Chainlink (LINK)</option>
                <option value="ATOMUSDT">Cosmos (ATOM)</option>
                <option value="ADAUSDT">Cardano (ADA)</option>
                <option value="SUIUSDT">Sui (SUI)</option>
                <option value="INJUSDT">Injective (INJ)</option>
                <option value="GRTUSDT">The Graph (GRT)</option>
                <option value="HBARUSDT">Hedera (HBAR)</option>
                <option value="UNIUSDT">Uniswap (UNI)</option>
                <option value="DOTUSDT">Polkadot (DOT)</option>
                <option value="TONUSDT">Toncoin (TON)</option>
                <option value="TAOUSDT">Bittensor (TAO)</option>
                <option value="ENAUSDT">Ethena (ENA)</option>
                <option value="ONDOUSDT">Ondo (ONDO)</option>
                <option value="ICPUSDT">Internet Computer (ICP)</option>
                <option value="APTUSDT">Aptos (APT)</option>
                <option value="POLUSDT">Polygon (POL)</option>
                <option value="ALGOUSDT">Algorand (ALGO)</option>
                <option value="PENGUUSDT">Pudgy Penguins (PENGU)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <label className="modern-label">Select Data Range:</label>
              <select
                value={selectedMonths}
                onChange={(e) => {
                  setSelectedMonths(Number(e.target.value));
                  setLoading(true);
                }}
                className="modern-select"
              >
                {[1,2,3,6,12,24,36,48,60].map(months => (
                  <option key={months} value={months}>
                    {months === 1 ? '1 Month' : `${months} Months`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <label className="modern-label">Start From Date:</label>
              <input
                type="date"
                value={selectedStartDate}
                onChange={(e) => {
                  setSelectedStartDate(e.target.value);
                  setLoading(true);
                }}
                className="modern-input"
              />
            </div>
          </div>
          
          {/* Analyze All Coins Button */}
          <button
            onClick={analyzeAllCoins}
            disabled={isAnalyzingAllCoins}
            style={{
              padding: '12px 24px',
              background: isAnalyzingAllCoins ? '#e0e0e0' : '#1976d2',
              color: isAnalyzingAllCoins ? '#666' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isAnalyzingAllCoins ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
              transition: 'all 0.3s ease',
              minWidth: '200px',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={e => {
              if (!isAnalyzingAllCoins) {
                e.currentTarget.style.background = '#1565c0';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
              }
            }}
            onMouseOut={e => {
              if (!isAnalyzingAllCoins) {
                e.currentTarget.style.background = '#1976d2';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.2)';
              }
            }}
          >
            {isAnalyzingAllCoins ? (
              <>
                <div style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }} />
                Analyzing All Coins ({allCoinsProgress}%)
              </>
            ) : (
              '🔍 Analyze All Coins'
            )}
          </button>
        </div>
        
        {isAnalyzingAllCoins && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: '#f0f7ff',
            borderRadius: '8px',
            margin: '20px 0',
            border: '1px solid #bfdeff'
          }}>
            <div style={{ 
              fontSize: '18px', 
              color: '#1976d2', 
              marginBottom: '10px',
              fontWeight: 'bold'
            }}>
              Currently analyzing: {currentAnalyzingCoin}
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e0e0e0',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                width: `${allCoinsProgress}%`,
                height: '100%',
                background: '#1976d2',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              Progress: {allCoinsProgress}% Complete
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">{loadingPhase}</div>
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="loading-progress-text">
            {loadingProgress}% Complete
          </div>
        </div>
      ) : error ? (
        <div className="error-container">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: "1rem", color: "#dc2626" }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
          <div style={{ color: "#dc2626", fontWeight: "600", marginBottom: "0.5rem" }}>
            Error
          </div>
          <div>{error}</div>
        </div>
      ) : (
        <>
          {/* Filter Controls */}
          <div className="control-panel">
            <div style={{ marginBottom: "1rem" }}>
              <label className="modern-label" style={{ marginRight: "2rem" }}>
                <input
                  type="radio"
                  value="day"
                  checked={filterMode === "day"}
                  onChange={() => setFilterMode("day")}
                  className="modern-radio"
                />
                Day
              </label>
              <label className="modern-label" style={{ marginRight: "2rem" }}>
                <input
                  type="radio"
                  value="date"
                  checked={filterMode === "date"}
                  onChange={() => setFilterMode("date")}
                  className="modern-radio"
                />
                Date
              </label>
              <label className="modern-label">
                <input
                  type="radio"
                  value="hour"
                  checked={filterMode === "hour"}
                  onChange={() => setFilterMode("hour")}
                  className="modern-radio"
                />
                Hour
              </label>
            </div>

            {filterMode === "day" && (
              <div className="day-hour-grid">
                {/* Improved Select/Unselect All Buttons above the grid */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <button
                    type="button"
                    style={{
                      padding: '6px 18px',
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(25, 118, 210, 0.08)',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#1565c0'}
                    onMouseOut={e => e.currentTarget.style.background = '#1976d2'}
                    onClick={() => setSelectedDayHourCombos(
                      [].concat(...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day =>
                        Array.from({length: 24}, (_, i) => `${day}-${i.toString().padStart(2, '0')}`)
                      ))
                    )}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '6px 18px',
                      background: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#bdbdbd'}
                    onMouseOut={e => e.currentTarget.style.background = '#e0e0e0'}
                    onClick={() => setSelectedDayHourCombos([])}
                  >
                    Unselect All
                  </button>
                </div>
                {/* Day-Hour Grid Filter */}
                <div className="day-hour-grid-filter" style={{ marginBottom: "16px", overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '2px 6px' }}></th>
                        {Array.from({length: 24}, (_, i) => (
                          <th key={i} style={{ padding: '2px 6px', fontSize: 12 }}>{i.toString().padStart(2, '0')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                        // For each day, get all 24 combos
                        const allCombosForDay = Array.from({length: 24}, (_, i) => `${day}-${i.toString().padStart(2, '0')}`);
                        const allSelected = allCombosForDay.every(combo => selectedDayHourCombos.includes(combo));
                        return (
                          <tr key={day}>
                            <td style={{ padding: '2px 6px', fontWeight: 'bold', fontSize: 12 }}>{day}</td>
                            {Array.from({length: 24}, (_, i) => {
                              const hourStr = i.toString().padStart(2, '0');
                              const combo = `${day}-${hourStr}`;
                              return (
                                <td key={combo} style={{ padding: '2px 6px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedDayHourCombos.includes(combo)}
                                    onChange={() => {
                                      setSelectedDayHourCombos(prev =>
                                        prev.includes(combo)
                                          ? prev.filter(c => c !== combo)
                                          : [...prev, combo]
                                      );
                                    }}
                                  />
                                </td>
                              );
                            })}
                            {/* All checkbox at the end of the row */}
                            <td style={{ padding: '2px 6px', textAlign: 'center', fontWeight: 'bold', fontSize: 12 }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    // Add all combos for this day
                                    setSelectedDayHourCombos(prev => Array.from(new Set([...prev, ...allCombosForDay])));
                                  } else {
                                    // Remove all combos for this day
                                    setSelectedDayHourCombos(prev => prev.filter(combo => !allCombosForDay.includes(combo)));
                                  }
                                }}
                              />
                              All
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filterMode === "date" && (
              <div className="date-filter modern-filter-group">
                {Array.from({length: 31}, (_, i) => (i+1)).map(date => (
                  <label key={date} className="modern-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedDates.includes(date.toString())}
                      onChange={() => {
                        setSelectedDates(prev =>
                          prev.includes(date.toString())
                            ? prev.filter(d => d !== date.toString())
                            : [...prev, date.toString()]
                        );
                      }}
                      className="modern-checkbox"
                    />
                    {date}
                  </label>
                ))}
              </div>
            )}

            {filterMode === "hour" && (
              <div className="hour-filter modern-filter-group">
                {Array.from({length: 24}, (_, i) => i).map(hour => {
                  const hourStr = hour.toString().padStart(2, '0');
                  return (
                    <label key={hour} className="modern-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedHours.includes(hourStr)}
                        onChange={() => {
                          setSelectedHours(prev =>
                            prev.includes(hourStr)
                              ? prev.filter(h => h !== hourStr)
                              : [...prev, hourStr]
                          );
                        }}
                        className="modern-checkbox"
                      />
                      {hourStr}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <p className="summary-label">Current Price</p>
              <p className="summary-value" style={{ color: "#3b82f6" }}>${summaryStats.lastPrice}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Period High</p>
              <p className="summary-value" style={{ color: "#059669" }}>${summaryStats.highestPrice.toFixed(2)}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Period Low</p>
              <p className="summary-value" style={{ color: "#dc2626" }}>${summaryStats.lowestPrice.toFixed(2)}</p>
            </div>
            <div className="summary-card">
              <p className="summary-label">Total Change</p>
              <p className="summary-value" style={{ color: summaryStats.totalChange >= 0 ? "#059669" : "#dc2626" }}>
                ${summaryStats.totalChange} ({summaryStats.changePercent}%)
              </p>
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>
                Over {filteredData.length} period{filteredData.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Data Tables */}
          <div className="data-table-container">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              marginBottom: '10px',
              alignItems: 'center'
            }}>
              <button
                onClick={() => {
                  // First add the header
                  const header = "Period\tTime\tClosing Price\tChange\tVolume";
                  // Then add each row of data
                  const tableData = filteredData.map(row => 
                    `${row.period}\t${row.time}\t$${row.closingPrice}\t${parseFloat(row.change) >= 0 ? '+' : ''}$${row.change}\t${row.volume}`
                  ).join('\n');
                  // Combine header and data
                  navigator.clipboard.writeText(header + '\n' + tableData);
                }}
                style={{
                  background: '#f0f7ff',
                  border: '1px solid #bfdeff',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#1976d2',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e3f2fd';
                  e.currentTarget.style.borderColor = '#90caf9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f0f7ff';
                  e.currentTarget.style.borderColor = '#bfdeff';
                }}
                title="Copy all data"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Table
              </button>
            </div>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Period</th>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell table-header-cell-right">Closing Price</th>
                  <th className="table-header-cell table-header-cell-right">Change</th>
                  <th className="table-header-cell table-header-cell-right">Volume</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredData.map((row, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell">{row.period}</td>
                    <td className="table-cell table-cell-mono">{row.time}</td>
                    <td className="table-cell table-cell-right table-cell-bold">${row.closingPrice}</td>
                    <td className={`table-cell table-cell-right ${
                      parseFloat(row.change) >= 0 ? 'table-cell-green' : 'table-cell-red'
                    }`}>
                      {parseFloat(row.change) >= 0 ? '+' : ''}${row.change}
                    </td>
                    <td className="table-cell table-cell-right table-cell-gray">{row.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ 
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.875rem",
            margin: "2rem 0"
          }}>
            Total periods: {filteredData.length} | Complete dataset with historical data | Powered by Binance API
          </div>

          {/* Pattern Analysis */}
          <div className="pattern-section">
            <ProfitablePatterns processedData={processedData} />
          </div>

          {/* All Coins Analysis Results */}
          {Object.keys(allCoinsPatterns).length > 0 && (
            <div style={{
              marginTop: '40px',
              padding: '30px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  color: '#1e293b',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '15px',
                  textAlign: 'center'
                }}>
                  📊 All Coins Trading Patterns Analysis
                </h2>
                
                {/* Weekly Filter */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  <span style={{
                    color: '#64748b',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    Filter by Buy Day:
                  </span>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <label key={day} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#374151'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedWeekDays.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWeekDays(prev => [...prev, day]);
                          } else {
                            setSelectedWeekDays(prev => prev.filter(d => d !== day));
                          }
                        }}
                        style={{
                          width: '14px',
                          height: '14px',
                          cursor: 'pointer'
                        }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '20px'
              }}>
                {Object.entries(allCoinsPatterns).map(([coin, patterns]) => (
                  <div key={coin} style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      color: '#1976d2',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {getCoinDisplayName(coin)}
                      <span style={{
                        backgroundColor: patterns.length > 0 ? '#e8f5e9' : '#ffebee',
                        color: patterns.length > 0 ? '#2e7d32' : '#c62828',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {patterns.filter(pattern => selectedWeekDays.includes(pattern.buyDay)).length} patterns
                      </span>
                    </h3>
                    
                    {patterns.filter(pattern => selectedWeekDays.includes(pattern.buyDay)).length > 0 ? (
                      <div>
                        {patterns
                          .filter(pattern => selectedWeekDays.includes(pattern.buyDay))
                          .map((pattern, index) => (
                          <div key={index} style={{
                            marginBottom: '12px',
                            padding: '10px',
                            background: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px solid #e9ecef'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: '#495057',
                              marginBottom: '4px'
                            }}>
                              #{index + 1}: Buy {pattern.buyDay} {pattern.buyHour}:00 → Sell {pattern.sellDay} {pattern.sellHour}:00
                            </div>
                            <div style={{
                              color: '#2e7d32',
                              fontSize: '13px',
                              fontWeight: 'bold'
                            }}>
                              ${pattern.averageProfit} avg profit ({pattern.averageROI}% ROI) - {pattern.profitCount} times profitable
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        color: '#666',
                        fontSize: '14px',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        {patterns.length > 0 
                          ? `No patterns found for selected days (${patterns.length} total patterns available)`
                          : 'No profitable patterns found for this coin'
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div style={{
                marginTop: '30px',
                padding: '15px',
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ color: '#64748b', fontSize: '14px' }}>
                  <strong>Analysis Summary:</strong> Analyzed {Object.keys(allCoinsPatterns).length} coins with {selectedMonths} month{selectedMonths !== 1 ? 's' : ''} of data each.
                  <br />
                  Patterns shown are based on historical data and do not guarantee future results.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper function to get coin display name
const getCoinDisplayName = (coinSymbol) => {
  const coinNames = {
    'SOLUSDT': 'Solana (SOL)',
    'ETHUSDT': 'Ethereum (ETH)',
    'XRPUSDT': 'XRP (XRP)',
    'BTCUSDT': 'Bitcoin (BTC)',
    'BCHUSDT': 'Bitcoin Cash (BCH)',
    'LTCUSDT': 'Litecoin (LTC)',
    'XMRUSDT': 'Monero (XMR)',
    'DAIUSDT': 'Dai (DAI)',
    'AAVEUSDT': 'Aave (AAVE)',
    'BNBUSDT': 'Binance Coin (BNB)',
    'TRXUSDT': 'Tron (TRX)',
    'XLMUSDT': 'Stellar (XLM)',
    'AVAXUSDT': 'Avalanche (AVAX)',
    'OPUSDT': 'Optimism (OP)',
    'DOGEUSDT': 'Dogecoin (DOGE)',
    'LINKUSDT': 'Chainlink (LINK)',
    'ATOMUSDT': 'Cosmos (ATOM)',
    'ADAUSDT': 'Cardano (ADA)',
    'SUIUSDT': 'Sui (SUI)',
    'INJUSDT': 'Injective (INJ)',
    'GRTUSDT': 'The Graph (GRT)',
    'HBARUSDT': 'Hedera (HBAR)',
    'UNIUSDT': 'Uniswap (UNI)',
    'DOTUSDT': 'Polkadot (DOT)',
    'TONUSDT': 'Toncoin (TON)',
    'TAOUSDT': 'Bittensor (TAO)',
    'ENAUSDT': 'Ethena (ENA)',
    'ONDOUSDT': 'Ondo (ONDO)',
    'ICPUSDT': 'Internet Computer (ICP)',
    'APTUSDT': 'Aptos (APT)',
    'POLUSDT': 'Polygon (POL)',
    'ALGOUSDT': 'Algorand (ALGO)',
    'PENGUUSDT': 'Pudgy Penguins (PENGU)'
  };
  return coinNames[coinSymbol] || coinSymbol;
};

// ProfitablePatterns: Analyzes trading data to find most profitable day-hour combinations
const ProfitablePatterns = ({ processedData }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [patterns, setPatterns] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  // Function to get day and hour from a data point
  const getDayHour = (dataPoint) => {
    const [day, date, time] = dataPoint.compactTime.split(", ");
    const hour = time.split(":")[0];
    return { day, hour };
  };

  // Process a single day-hour combination
  const processDayHourCombo = async (buyDayIndex, buyHour, days) => {
    const results = [];
    for (let sellDayIndex = 0; sellDayIndex < days.length; sellDayIndex++) {
      for (let sellHour = 0; sellHour < 24; sellHour++) {
        if (buyDayIndex === sellDayIndex && sellHour <= buyHour) continue;
        
        let profitCount = 0;
        let totalProfit = 0;
        let totalBuyPrice = 0;
        let instances = [];

        for (let i = 0; i < processedData.length - 1; i++) {
          const buyPoint = getDayHour(processedData[i]);
          if (buyPoint.day === days[buyDayIndex] && buyPoint.hour === buyHour.toString().padStart(2, '0')) {
            for (let j = i + 1; j < processedData.length; j++) {
              const sellPoint = getDayHour(processedData[j]);
              if (sellPoint.day === days[sellDayIndex] && sellPoint.hour === sellHour.toString().padStart(2, '0')) {
                const buyPrice = parseFloat(processedData[i].closingPrice);
                const sellPrice = parseFloat(processedData[j].closingPrice);
                const profit = sellPrice - buyPrice;
                
                if (profit > 0) {
                  profitCount++;
                  totalProfit += profit;
                  totalBuyPrice += buyPrice;
                  instances.push({
                    buyDate: processedData[i].compactTime,
                    sellDate: processedData[j].compactTime,
                    buyPrice: buyPrice.toFixed(2),
                    sellPrice: sellPrice.toFixed(2),
                    profit: profit.toFixed(2)
                  });
                }
                break;
              }
            }
          }
        }

        if (profitCount >= 3) {
          const avgProfit = totalProfit / profitCount;
          const avgBuyPrice = totalBuyPrice / profitCount;
          results.push({
            buyDay: days[buyDayIndex],
            buyHour: buyHour.toString().padStart(2, '0'),
            sellDay: days[sellDayIndex],
            sellHour: sellHour.toString().padStart(2, '0'),
            profitCount,
            averageProfit: avgProfit.toFixed(2),
            averageROI: ((avgProfit / avgBuyPrice) * 100).toFixed(2),
            instances
          });
        }
      }
    }
    return results;
  };

  // Function to find profitable patterns with progress tracking
  const findProfitablePatterns = async () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let allPatterns = [];
    const totalCombinations = days.length * 24;
    let processedCombinations = 0;

    for (let buyDayIndex = 0; buyDayIndex < days.length; buyDayIndex++) {
      setCurrentOperation(`Analyzing ${days[buyDayIndex]}...`);
      
      for (let buyHour = 0; buyHour < 24; buyHour++) {
        // Process this combination
        const results = await processDayHourCombo(buyDayIndex, buyHour, days);
        allPatterns = [...allPatterns, ...results];
        
        // Update progress
        processedCombinations++;
        const progress = (processedCombinations / totalCombinations) * 100;
        setAnalysisProgress(Math.round(progress));
        
        // Let UI update
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Sort and get top 5
    return allPatterns
      .sort((a, b) => {
        if (b.profitCount !== a.profitCount) {
          return b.profitCount - a.profitCount;
        }
        return parseFloat(b.averageProfit) - parseFloat(a.averageProfit);
      })
      .slice(0, 5);
  };

  // Effect to calculate patterns when visible
  useEffect(() => {
    let isMounted = true;

    const calculatePatterns = async () => {
      if (!isVisible || patterns.length > 0 || !processedData || processedData.length === 0) return;
      
      setIsLoading(true);
      setAnalysisProgress(0);
      setCurrentOperation('Starting analysis...');
      
      try {
        const newPatterns = await findProfitablePatterns();
        if (isMounted) {
          setPatterns(newPatterns);
        }
      } catch (error) {
        console.error('Error calculating patterns:', error);
      }
      if (isMounted) {
        setIsLoading(false);
        setAnalysisProgress(0);
        setCurrentOperation('');
      }
    };

    calculatePatterns();

    return () => {
      isMounted = false;
    };
  }, [isVisible, processedData, patterns.length]);

  if (!processedData || processedData.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: '#f0f7ff',
      border: '1px solid #bfdeff',
      borderRadius: 10,
      padding: '18px 24px',
      margin: '24px 0',
      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.06)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isVisible ? 20 : 0
      }}>
        <h3 style={{ color: '#1565c0', margin: 0 }}>Top 5 Most Profitable Trading Patterns</h3>
        <button
          onClick={() => {
            setIsVisible(!isVisible);
            if (!isVisible) {
              setPatterns([]); // Reset patterns when showing again
            }
          }}
          style={{
            padding: '8px 16px',
            background: isVisible ? '#e0e0e0' : '#1976d2',
            color: isVisible ? '#333' : 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isVisible ? 'Hide Patterns' : 'Show Patterns'}
        </button>
      </div>

      {isVisible && (
        <>
          {isLoading ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              fontSize: 16,
              color: '#1976d2',
              background: 'white',
              borderRadius: 8,
              margin: '20px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div className="loading-spinner" style={{
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #1976d2',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 15px'
              }} />
              <div style={{ marginBottom: '15px' }}>{currentOperation}</div>
              <div style={{
                width: '300px',
                height: '8px',
                background: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '10px'
              }}>
                <div style={{
                  width: `${analysisProgress}%`,
                  height: '100%',
                  background: '#1976d2',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div>{analysisProgress}% Complete</div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <>
              {patterns.map((pattern, index) => (
                <div key={index} style={{ 
                  marginBottom: 20,
                  padding: 15,
                  background: 'white',
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #e3f2fd'
                }}>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: '#1976d2',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>#{index + 1}: Buy {pattern.buyDay} {pattern.buyHour}:00 → Sell {pattern.sellDay} {pattern.sellHour}:00</span>
                    <span style={{ 
                      backgroundColor: '#e8f5e9', 
                      color: '#2e7d32',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: 14
                    }}>
                      {pattern.profitCount} times profitable
                    </span>
                  </div>
                  <div style={{ 
                    color: '#2e7d32', 
                    marginTop: 8,
                    fontSize: 16,
                    fontWeight: 'bold'
                  }}>
                    Average profit per trade: ${pattern.averageProfit} (ROI: {pattern.averageROI}%)
                  </div>
                  <div style={{ 
                    marginTop: 12, 
                    fontSize: 14,
                    backgroundColor: '#fafafa',
                    padding: 10,
                    borderRadius: 6
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#333' }}>Recent Successful Trades:</div>
                    {pattern.instances.slice(-3).map((instance, i) => (
                      <div key={i} style={{ 
                        color: '#555', 
                        marginBottom: 6,
                        padding: '4px 0',
                        borderBottom: i < 2 ? '1px solid #eee' : 'none'
                      }}>
                        Buy: ${instance.buyPrice} ({instance.buyDate}) → 
                        Sell: ${instance.sellPrice} ({instance.sellDate}) = 
                        <span style={{ color: '#2e7d32', fontWeight: 'bold' }}> +${instance.profit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div style={{ 
                color: '#666', 
                fontSize: 14, 
                marginTop: 15,
                padding: '10px 15px',
                background: '#fff',
                borderRadius: 6,
                border: '1px solid #e0e0e0'
              }}>
                <strong>Note:</strong> These patterns are based on {processedData.length} periods of historical data. 
                Past performance does not guarantee future results. Use this information as one of many factors in your trading decisions.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// Main App Component with Navigation
const App = () => {
  const [activeTab, setActiveTab] = useState('trading');

  const tabs = [
    { id: 'trading', label: 'Trading Analysis' },
    { id: 'rsi', label: 'RSI' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'trading':
        return <ClosingPriceTable />;
      case 'rsi':
        return <RSIAnalysis />;
      default:
        return <ClosingPriceTable />;
    }
  };

  return (
    <div className="app-container">
      {/* Header with Navigation Tabs */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Crypto Trading Analytics</h1>
          <nav className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="app-main">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;