import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const ClosingPriceTable = () => {
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    highestPrice: 0,
    lowestPrice: 0,
    firstPrice: 0,
    lastPrice: 0,
    totalChange: 0,
    changePercent: 0
  });
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [filterMode, setFilterMode] = useState("day"); // "day" or "date" or "hour"
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedHours, setSelectedHours] = useState([]);
  const [selectedDayHourCombos, setSelectedDayHourCombos] = useState([]); // e.g., ['Mon-09', 'Fri-23']

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First API call to get most recent data
        const recentDataResponse = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000
          }
        });

        // Get the oldest timestamp from the first batch
        const oldestTimestamp1 = recentDataResponse.data[0][0];
        
        // Second API call to get older data
        const olderDataResponse1 = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000,
            endTime: oldestTimestamp1 - 1 // Use the timestamp right before our oldest data
          }
        });

        // Get the oldest timestamp from the second batch
        const oldestTimestamp2 = olderDataResponse1.data[0][0];

        // Third API call to get even older data
        const olderDataResponse2 = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000,
            endTime: oldestTimestamp2 - 1
          }
        });

        // Get the oldest timestamp from the third batch
        const oldestTimestamp3 = olderDataResponse2.data[0][0];

        // Fourth API call
        const olderDataResponse3 = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000,
            endTime: oldestTimestamp3 - 1
          }
        });

        // Get the oldest timestamp from the fourth batch
        const oldestTimestamp4 = olderDataResponse3.data[0][0];

        // Fifth API call
        const olderDataResponse4 = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000,
            endTime: oldestTimestamp4 - 1
          }
        });

        // Get the oldest timestamp from the fifth batch
        const oldestTimestamp5 = olderDataResponse4.data[0][0];

        // Sixth API call
        const olderDataResponse5 = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000,
            endTime: oldestTimestamp5 - 1
          }
        });

        // Combine all datasets (oldest first)
        const combinedData = [
          ...olderDataResponse5.data,
          ...olderDataResponse4.data,
          ...olderDataResponse3.data,
          ...olderDataResponse2.data,
          ...olderDataResponse1.data,
          ...recentDataResponse.data
        ];

        // Process data to show closing price with time
        const processed = combinedData.map((row, index) => {
          const timestamp = row[0];
          const closingPrice = parseFloat(row[4]);
          const volume = parseFloat(row[5]);
          
          // Convert timestamp to readable time
          const date = new Date(timestamp);
          const timeString = date.toLocaleString('en-US', {
            weekday: 'short', // Add day of week
            month: '2-digit',
            day: '2-digit', 
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          // Create a more compact time format for the small table
          const weekday = date.toLocaleString('en-US', { weekday: 'short' });
          const monthDay = date.toLocaleString('en-US', { month: '2-digit', day: '2-digit' });
          const hourMinute = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
          const compactTimeString = `${weekday}, ${monthDay}, ${hourMinute}`;

          return {
            period: index + 1,
            time: timeString,
            compactTime: compactTimeString,
            closingPrice: closingPrice.toFixed(2),
            volume: volume.toLocaleString(),
            change: index > 0 ? (closingPrice - parseFloat(combinedData[index-1][4])).toFixed(2) : '0.00',
            timestamp: timestamp // Store timestamp for sorting
          };
        });

        // Sort by timestamp to ensure chronological order
        const sortedData = processed.sort((a, b) => a.timestamp - b.timestamp);
        
        // Update period numbers after sorting
        const finalProcessedData = sortedData.map((item, index) => ({
          ...item,
          period: index + 1
        }));

        setProcessedData(finalProcessedData);

        // Calculate summary stats
        const prices = finalProcessedData.map(d => parseFloat(d.closingPrice));
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

        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data from Binance API. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading-container">Loading Solana trading data...</div>;
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
      
      <h2 className="trading-title">Solana (SOL/USDT) Trading Data - {filteredData.length} Periods</h2>

      {/* Pattern Analysis Tips Section */}
      <PatternAnalysisTips processedData={processedData} />
      
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

// PatternAnalysisTips: Analyzes closing prices for patterns and displays tips
const PatternAnalysisTips = ({ processedData }) => {
  if (!processedData || processedData.length === 0) return null;

  // Helper: group by key
  const groupBy = (arr, keyFn) => {
    return arr.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  // 1. Day-of-week analysis
  const byDay = groupBy(processedData, row => row.compactTime.split(",")[0]);
  const dayAverages = Object.entries(byDay).map(([day, rows]) => ({
    day,
    avg: rows.reduce((sum, r) => sum + parseFloat(r.closingPrice), 0) / rows.length,
    min: Math.min(...rows.map(r => parseFloat(r.closingPrice))),
    max: Math.max(...rows.map(r => parseFloat(r.closingPrice))),
  }));
  dayAverages.sort((a, b) => b.avg - a.avg);

  // 2. Hour-of-day analysis
  const byHour = groupBy(processedData, row => row.compactTime.split(",")[2].trim().split(":")[0]);
  const hourAverages = Object.entries(byHour).map(([hour, rows]) => ({
    hour,
    avg: rows.reduce((sum, r) => sum + parseFloat(r.closingPrice), 0) / rows.length,
    min: Math.min(...rows.map(r => parseFloat(r.closingPrice))),
    max: Math.max(...rows.map(r => parseFloat(r.closingPrice))),
  }));
  hourAverages.sort((a, b) => b.avg - a.avg);

  // 3. Date-of-month analysis
  const byDate = groupBy(processedData, row => row.compactTime.split(",")[1].trim().split("/")[1]);
  const dateAverages = Object.entries(byDate).map(([date, rows]) => ({
    date,
    avg: rows.reduce((sum, r) => sum + parseFloat(r.closingPrice), 0) / rows.length,
    min: Math.min(...rows.map(r => parseFloat(r.closingPrice))),
    max: Math.max(...rows.map(r => parseFloat(r.closingPrice))),
  }));
  dateAverages.sort((a, b) => b.avg - a.avg);

  // Tips
  const bestDay = dayAverages[0];
  const worstDay = dayAverages[dayAverages.length - 1];
  const bestHour = hourAverages[0];
  const worstHour = hourAverages[hourAverages.length - 1];
  const bestDate = dateAverages[0];
  const worstDate = dateAverages[dateAverages.length - 1];

  return (
    <div style={{
      background: '#f5f7fa',
      border: '1px solid #dbeafe',
      borderRadius: 10,
      padding: '18px 24px',
      margin: '24px 0',
      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.06)'
    }}>
      <h3 style={{ color: '#1976d2', marginTop: 0 }}>Market Pattern Insights (Last 3000 Periods)</h3>
      <ul style={{ fontSize: 16, marginBottom: 0 }}>
        <li>
          <b>Highest average price day:</b> {bestDay.day} (${bestDay.avg.toFixed(2)})<br/>
          <span style={{ color: '#666', fontSize: 14 }}>Lowest: {worstDay.day} (${worstDay.avg.toFixed(2)})</span>
        </li>
        <li>
          <b>Hour with highest average price:</b> {bestHour.hour}:00 (${bestHour.avg.toFixed(2)})<br/>
          <span style={{ color: '#666', fontSize: 14 }}>Lowest: {worstHour.hour}:00 (${worstHour.avg.toFixed(2)})</span>
        </li>
        <li>
          <b>Date of month with highest average price:</b> {bestDate.date} (${bestDate.avg.toFixed(2)})<br/>
          <span style={{ color: '#666', fontSize: 14 }}>Lowest: {worstDate.date} (${worstDate.avg.toFixed(2)})</span>
        </li>
      </ul>
      <div style={{ color: '#444', fontSize: 15, marginTop: 10 }}>
        <b>Tips:</b>
        <ul style={{ marginTop: 4 }}>
          <li>Consider monitoring the market on <b>{bestDay.day}</b> and around <b>{bestHour.hour}:00</b> for potential high price opportunities.</li>
          <li>Historically, prices tend to be lower on <b>{worstDay.day}</b> and at <b>{worstHour.hour}:00</b>.</li>
          <li>These patterns are based on the last 3000 hourly periods and may change over time. Always do your own research before trading.</li>
        </ul>
      </div>
    </div>
  );
};

// ProfitablePatterns: Analyzes trading data to find most profitable day-hour combinations
const ProfitablePatterns = ({ processedData }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [patterns, setPatterns] = useState([]);

  // Function to get day and hour from a data point
  const getDayHour = (dataPoint) => {
    const [day, date, time] = dataPoint.compactTime.split(", ");
    const hour = time.split(":")[0];
    return { day, hour };
  };

  // Function to find profitable patterns
  const findProfitablePatterns = async () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const patterns = [];
    
    // Process in chunks to prevent UI freeze
    const chunkSize = 24; // Process one day at a time
    
    for (let buyDayIndex = 0; buyDayIndex < days.length; buyDayIndex++) {
      for (let buyHour = 0; buyHour < 24; buyHour += chunkSize) {
        // Allow UI to update between chunks
        await new Promise(resolve => setTimeout(resolve, 0));
        
        for (let h = buyHour; h < Math.min(buyHour + chunkSize, 24); h++) {
          for (let sellDayIndex = 0; sellDayIndex < days.length; sellDayIndex++) {
            for (let sellHour = 0; sellHour < 24; sellHour++) {
              if (buyDayIndex === sellDayIndex && sellHour <= h) continue;
              
              let profitCount = 0;
              let totalProfit = 0;
              let instances = [];

              for (let i = 0; i < processedData?.length - 1; i++) {
                const buyPoint = getDayHour(processedData[i]);
                if (buyPoint.day === days[buyDayIndex] && buyPoint.hour === h.toString().padStart(2, '0')) {
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
                patterns.push({
                  buyDay: days[buyDayIndex],
                  buyHour: h.toString().padStart(2, '0'),
                  sellDay: days[sellDayIndex],
                  sellHour: sellHour.toString().padStart(2, '0'),
                  profitCount,
                  averageProfit: (totalProfit / profitCount).toFixed(2),
                  instances
                });
              }
            }
          }
        }
      }
    }

    // Sort and get top 5
    return patterns
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
              margin: '20px 0'
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
              Analyzing trading patterns...
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