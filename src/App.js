import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const ClosingPriceTable = () => {
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState(''); // Track loading phases
  const [loadingProgress, setLoadingProgress] = useState(0); // Track progress
  const [error, setError] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(1); // Default to 1 month
  const [selectedCoin, setSelectedCoin] = useState('SOLUSDT'); // Default to Solana
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
          
          if (endTime) {
            params.endTime = endTime;
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
  }, [selectedMonths, selectedCoin]); // Add selectedMonths and selectedCoin to dependency array

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
      <div style={{ 
        marginBottom: "20px", 
        padding: "15px",
        background: "#f5f7fa",
        borderRadius: "8px",
        border: "1px solid #dbeafe",
        display: "flex",
        gap: "20px",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ 
            fontWeight: "bold", 
            marginRight: "10px",
            color: "#1976d2"
          }}>
            Select Coin:
          </label>
          <select
            value={selectedCoin}
            onChange={(e) => {
              setSelectedCoin(e.target.value);
              setLoading(true); // Trigger reload when coin changes
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #bfdeff",
              backgroundColor: "white",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            <option value="SOLUSDT">Solana (SOL)</option>
            <option value="ETHUSDT">Ethereum (ETH)</option>
            <option value="XRPUSDT">XRP (XRP)</option>
            <option value="BTCUSDT">Bitcoin (BTC)</option>
            <option value="BCHUSDT">Bitcoin Cash (BCH)</option>
            <option value="LTCUSDT">Litecoin (LTC)</option>
            <option value="BNBUSDT">Binance Coin (BNB)</option>
            <option value="USDCUSDT">USD Coin (USDC)</option>
            <option value="TRXUSDT">Tron (TRX)</option>
            <option value="XLMUSDT">Stellar (XLM)</option>
            <option value="AVAXUSDT">Avalanche (AVAX)</option>
            <option value="OPUSDT">Optimism (OP)</option>
            <option value="DOGEUSDT">Dogecoin (DOGE)</option>
            <option value="LINKUSDT">Chainlink (LINK)</option>
            <option value="ATOMUSDT">Cosmos (ATOM)</option>
            <option value="ADAUSDT">Cardano (ADA)</option>
            <option value="SUIUSDT">Sui (SUI)</option>
            <option value="SHIBUSDT">Shiba Inu (SHIB)</option>
            <option value="INJUSDT">Injective (INJ)</option>
            <option value="GRTUSDT">The Graph (GRT)</option>
            <option value="FLOKIUSDT">Floki (FLOKI)</option>
            <option value="HBARUSDT">Hedera (HBAR)</option>
            <option value="UNIUSDT">Uniswap (UNI)</option>
            <option value="DOTUSDT">Polkadot (DOT)</option>
            <option value="TONUSDT">Toncoin (TON)</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <label style={{ 
            fontWeight: "bold", 
            marginRight: "10px",
            color: "#1976d2"
          }}>
            Select Data Range:
          </label>
          <select
            value={selectedMonths}
            onChange={(e) => {
              setSelectedMonths(Number(e.target.value));
              setLoading(true); // Trigger reload when months change
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #bfdeff",
              backgroundColor: "white",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            {[1,2,3,6,12,24,36,48,60].map(months => (
              <option key={months} value={months}>
                {months === 1 ? '1 Month' : `${months} Months`}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <span style={{ 
            marginLeft: "10px",
            color: "#666",
            fontSize: "14px"
          }}>
            Loading data...
          </span>
        )}
      </div>

      {/* Filter Mode Toggle */}
      <div style={{ marginBottom: "12px" }}>
        <label>
          <input
            type="radio"
            value="day"
            checked={filterMode === "day"}
            onChange={() => setFilterMode("day")}
          />
          Day
        </label>
        <label style={{ marginLeft: "16px" }}>
          <input
            type="radio"
            value="date"
            checked={filterMode === "date"}
            onChange={() => setFilterMode("date")}
          />
          Date
        </label>
        <label style={{ marginLeft: "16px" }}>
          <input
            type="radio"
            value="hour"
            checked={filterMode === "hour"}
            onChange={() => setFilterMode("hour")}
          />
          Hour
        </label>
      </div>
      {/* Show only the relevant filter */}
      {filterMode === "day" ? (
        <>
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
        </>
      ) : filterMode === "date" ? (
        <div className="date-filter" style={{ marginBottom: "16px", display: 'flex', alignItems: 'center' }}>
          {Array.from({length: 31}, (_, i) => (i+1)).map(date => (
            <label key={date} style={{ marginRight: "6px" }}>
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
              />
              {date}
            </label>
          ))}
          <button
            type="button"
            style={{ marginLeft: 8, marginRight: 16 }}
            onClick={() => setSelectedDates(selectedDates.length === 31 ? [] : Array.from({length: 31}, (_, i) => (i+1).toString()))}
          >
            {selectedDates.length === 31 ? 'Unselect All' : 'Select All'}
          </button>
        </div>
      ) : (
        filterMode === "hour" && (
          <div className="hour-filter" style={{ marginBottom: "16px", display: 'flex', alignItems: 'center' }}>
            {Array.from({length: 24}, (_, i) => i).map(hour => {
              const hourStr = hour.toString().padStart(2, '0');
              return (
                <label key={hour} style={{ marginRight: "6px" }}>
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
                  />
                  {hourStr}
                </label>
              );
            })}
            <button
              type="button"
              style={{ marginLeft: 8, marginRight: 16 }}
              onClick={() => setSelectedHours(selectedHours.length === 24 ? [] : Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')))}
            >
              {selectedHours.length === 24 ? 'Unselect All' : 'Select All'}
            </button>
          </div>
        )
      )}

      {/* Compact Table at the top */}
      <div className="compact-table-container">
        <table className="compact-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr key={index}>
                <td>{row.compactTime}</td>
                <td>${row.closingPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <h2 className="trading-title">
        {selectedCoin === 'SOLUSDT' ? 'Solana (SOL/USDT)' : 
         selectedCoin === 'ETHUSDT' ? 'Ethereum (ETH/USDT)' :
         selectedCoin === 'XRPUSDT' ? 'XRP (XRP/USDT)' :
         selectedCoin === 'BTCUSDT' ? 'Bitcoin (BTC/USDT)' :
         selectedCoin === 'BCHUSDT' ? 'Bitcoin Cash (BCH/USDT)' :
         selectedCoin === 'LTCUSDT' ? 'Litecoin (LTC/USDT)' :
         selectedCoin === 'BNBUSDT' ? 'Binance Coin (BNB/USDT)' :
         selectedCoin === 'USDCUSDT' ? 'USD Coin (USDC/USDT)' :
         selectedCoin === 'TRXUSDT' ? 'Tron (TRX/USDT)' :
         selectedCoin === 'XLMUSDT' ? 'Stellar (XLM/USDT)' :
         selectedCoin === 'AVAXUSDT' ? 'Avalanche (AVAX/USDT)' :
         selectedCoin === 'OPUSDT' ? 'Optimism (OP/USDT)' :
         selectedCoin === 'DOGEUSDT' ? 'Dogecoin (DOGE/USDT)' :
         selectedCoin === 'LINKUSDT' ? 'Chainlink (LINK/USDT)' :
         selectedCoin === 'ATOMUSDT' ? 'Cosmos (ATOM/USDT)' :
         selectedCoin === 'ADAUSDT' ? 'Cardano (ADA/USDT)' :
         selectedCoin === 'SUIUSDT' ? 'Sui (SUI/USDT)' :
         selectedCoin === 'SHIBUSDT' ? 'Shiba Inu (SHIB/USDT)' :
         selectedCoin === 'INJUSDT' ? 'Injective (INJ/USDT)' :
         selectedCoin === 'GRTUSDT' ? 'The Graph (GRT/USDT)' :
         selectedCoin === 'FLOKIUSDT' ? 'Floki (FLOKI/USDT)' :
         selectedCoin === 'HBARUSDT' ? 'Hedera (HBAR/USDT)' :
         selectedCoin === 'UNIUSDT' ? 'Uniswap (UNI/USDT)' :
         selectedCoin === 'DOTUSDT' ? 'Polkadot (DOT/USDT)' :
         selectedCoin === 'TONUSDT' ? 'Toncoin (TON/USDT)' :
         `${selectedCoin.replace('USDT', '')} (${selectedCoin.replace('USDT', '')}/USDT)`} Trading Data - {filteredData.length} Periods
      </h2>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card summary-card-blue">
          <p className="summary-label">Current Price</p>
          <p className="summary-value summary-value-blue">${summaryStats.lastPrice}</p>
        </div>
        <div className="summary-card summary-card-green">
          <p className="summary-label">Period High</p>
          <p className="summary-value summary-value-green">${summaryStats.highestPrice.toFixed(2)}</p>
        </div>
        <div className="summary-card summary-card-red">
          <p className="summary-label">Period Low</p>
          <p className="summary-value summary-value-red">${summaryStats.lowestPrice.toFixed(2)}</p>
        </div>
        <div className={`summary-card ${summaryStats.totalChange >= 0 ? 'summary-card-green' : 'summary-card-red'}`}>
          <p className="summary-label">Total Change</p>
          <p className={`summary-value ${summaryStats.totalChange >= 0 ? 'summary-value-green' : 'summary-value-red'}`}>
            ${summaryStats.totalChange} ({summaryStats.changePercent}%)
          </p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            Over {filteredData.length} period{filteredData.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Data Table */}
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

      <div className="footer-text">
        Total periods: {filteredData.length} | Complete dataset with historical data | Powered by Binance API
      </div>

      {/* Profitable Patterns Analysis - Now at the bottom */}
      <ProfitablePatterns processedData={processedData} />
    </div>
  );
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
          results.push({
            buyDay: days[buyDayIndex],
            buyHour: buyHour.toString().padStart(2, '0'),
            sellDay: days[sellDayIndex],
            sellHour: sellHour.toString().padStart(2, '0'),
            profitCount,
            averageProfit: (totalProfit / profitCount).toFixed(2),
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
                    Average profit per trade: ${pattern.averageProfit}
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

export default ClosingPriceTable;