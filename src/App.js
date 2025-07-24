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
        const oldestTimestamp = recentDataResponse.data[0][0];
        
        // Second API call to get older data
        const olderDataResponse = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000,
            endTime: oldestTimestamp - 1 // Use the timestamp right before our oldest data
          }
        });

        // Combine both datasets (older data first, then recent data)
        const combinedData = [...olderDataResponse.data, ...recentDataResponse.data];

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
      return selectedWeekdays.includes(row.compactTime.split(",")[0]);
    } else if (filterMode === "date") {
      const datePart = row.compactTime.split(",")[1].trim(); // "05/02"
      const dayOfMonth = parseInt(datePart.split("/")[1], 10);
      return selectedDates.includes(dayOfMonth.toString());
    } else if (filterMode === "hour") {
      // Extract hour from compactTime: "Fri, 05/02, 10:00" → "10"
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
        <div className="weekday-filter" style={{ marginBottom: "16px" }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <label key={day} style={{ marginRight: "10px" }}>
              <input
                type="checkbox"
                checked={selectedWeekdays.includes(day)}
                onChange={() => {
                  setSelectedWeekdays(prev =>
                    prev.includes(day)
                      ? prev.filter(d => d !== day)
                      : [...prev, day]
                  );
                }}
              />
              {day}
            </label>
          ))}
        </div>
      ) : filterMode === "date" ? (
        <div className="date-filter" style={{ marginBottom: "16px" }}>
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
        </div>
      ) : (
        filterMode === "hour" && (
          <div className="hour-filter" style={{ marginBottom: "16px" }}>
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
    </div>
  );
};

export default ClosingPriceTable;