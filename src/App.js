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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Using CORS proxy to avoid CORS issues
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
          params: {
            symbol: 'SOLUSDT',
            interval: '1h',
            limit: 1000
          }
        });
        console.log(response.data.length)
        // Process data to show closing price with time
        const processed = response.data.map((row, index) => {
          const timestamp = row[0];
          const closingPrice = parseFloat(row[4]);
          const volume = parseFloat(row[5]);

          // Convert timestamp to readable time
          const date = new Date(timestamp);
          const timeString = date.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });

          return {
            period: index + 1,
            time: timeString,
            closingPrice: closingPrice.toFixed(2),
            volume: volume.toLocaleString(),
            change: index > 0 ? (closingPrice - parseFloat(response.data[index - 1][4])).toFixed(2) : '0.00'
          };
        });

        setProcessedData(processed);

        // Calculate summary stats
        const prices = processed.map(d => parseFloat(d.closingPrice));
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

  return (
    <div className="trading-container">
      <h2 className="trading-title">Solana (SOL/USDT) Trading Data - {processedData.length} Periods</h2>

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
            {processedData.map((row, index) => (
              <tr key={index} className="table-row">
                <td className="table-cell">{row.period}</td>
                <td className="table-cell table-cell-mono">{row.time}</td>
                <td className="table-cell table-cell-right table-cell-bold">${row.closingPrice}</td>
                <td className={`table-cell table-cell-right ${parseFloat(row.change) >= 0 ? 'table-cell-green' : 'table-cell-red'
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
        Total periods: {processedData.length} | Complete dataset with all available periods | Powered by Binance API
      </div>
    </div>
  );
};

export default ClosingPriceTable;