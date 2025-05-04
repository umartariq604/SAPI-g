import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardNavbar from './DNavbar';
import '../styles/Dashboard.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import { API_URL } from '../config';

function Dashboard({ setIsLoggedIn }) {
  const [totalRequests, setTotalRequests] = useState(0);
  const [blockedThreats, setBlockedThreats] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [trafficData, setTrafficData] = useState([]);
  const [trafficRange, setTrafficRange] = useState('hour');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle Google OAuth token from URL
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      if (setIsLoggedIn) setIsLoggedIn(true);
      navigate('/dashboard', { replace: true });
    }
  }, [location, setIsLoggedIn, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
  
        const [requestsRes, blockedRes, avgRes] = await Promise.all([
          axios.get(`${API_URL}/api/stats/requests`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axios.get(`${API_URL}/api/stats/blocked`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axios.get(`${API_URL}/api/stats/avg-response-time`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);
  
        setTotalRequests(requestsRes.data.totalRequests);
        setBlockedThreats(blockedRes.data.blockedThreats);
        setAvgResponseTime(Math.round(avgRes.data.avgResponseTime));
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
  
    const fetchTraffic = async (range = trafficRange) => {
      try {
        const token = localStorage.getItem("token");
        const [trafficRes, blockedRes] = await Promise.all([
          axios.get(`${API_URL}/api/stats/traffic?range=${range}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }),
          axios.get(`${API_URL}/api/stats/blocked-timeline?range=${range}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ]);

        // Combine traffic and blocked threats data
        const combinedData = trafficRes.data.traffic.map(trafficItem => {
          const blockedItem = blockedRes.data.timeline.find(
            blocked => blocked._id === trafficItem.label
          );
          return {
            ...trafficItem,
            blocked: blockedItem ? blockedItem.count : 0
          };
        });

        setTrafficData(combinedData);
      } catch (err) {
        console.error("Error fetching traffic data:", err);
      }
    };
  
    fetchStats();
    fetchTraffic(trafficRange);
  
    const interval = setInterval(() => {
      fetchStats();
      fetchTraffic(trafficRange);
    }, 10000);
  
    return () => clearInterval(interval);
  }, [trafficRange]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-form">
        <header>
          <div className="logo">
            <h1>SAPI-G</h1>
            <span>Secure API Gateway</span>
          </div>
          <DashboardNavbar />
        </header>

        <div className="cyber-border"></div>

        <div className="dashboard">
          <div className="dashboard-title">
            <h2>API Security Dashboard</h2>
            <div className="status">
              <div className="status-indicator"></div>
              <span>System Operational</span>
            </div>
          </div>
        </div>

        <div className="grid-container">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Total API Requests</div>
              <i className="fas fa-exchange-alt" style={{ color: '#6c5ce7' }}></i>
            </div>
            <div className="card-value">{totalRequests.toLocaleString()}</div>
            <div className="card-change">
              <i className="fas fa-arrow-up"></i>
              <span>12% from yesterday</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Blocked Threats</div>
              <i className="fas fa-shield-alt" style={{ color: '#00f2c3' }}></i>
            </div>
            <div className="card-value">{blockedThreats.toLocaleString()}</div>
            <div className="card-change">
              <i className="fas fa-arrow-down"></i>
              <span>5% from yesterday</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Avg. Response Time</div>
              <i className="fas fa-tachometer-alt" style={{ color: '#ff467e' }}></i>
            </div>
            <div className="card-value">{avgResponseTime}ms</div>
            <div className="card-change">
              <i className="fas fa-arrow-down"></i>
              <span>8% improvement</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Active Endpoints</div>
              <i className="fas fa-plug" style={{ color: '#f9ca24' }}></i>
            </div>
            <div className="card-value">37</div>
            <div className="card-change negative">
              <i className="fas fa-arrow-down"></i>
              <span>2 disabled</span>
            </div>
          </div>
        </div>

        <div className="monitor-threats-container">
          <div className="large-card traffic-monitor">
            <div className="large-card-header">
              <div className="large-card-title">Traffic Monitor</div>
              <div className="time-filter">
                <button className={trafficRange === 'hour' ? 'active' : ''} onClick={() => setTrafficRange('hour')}>1h</button>
                <button className={trafficRange === 'day' ? 'active' : ''} onClick={() => setTrafficRange('day')}>24h</button>
                <button className={trafficRange === 'week' ? 'active' : ''} onClick={() => setTrafficRange('week')}>7d</button>
                <button className={trafficRange === 'month' ? 'active' : ''} onClick={() => setTrafficRange('month')}>30d</button>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trafficData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff467e" stopOpacity={0.32}/>
                      <stop offset="95%" stopColor="#ff467e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#b2becd' }} minTickGap={15} />
                  <YAxis tick={{ fontSize: 12, fill: '#b2becd' }} allowDecimals={false} width={40} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#181c2f', 
                      border: '1.5px solid #6c5ce7', 
                      borderRadius: 8, 
                      color: '#00f2c3', 
                      fontWeight: 600, 
                      fontSize: '1rem', 
                      boxShadow: '0 2px 12px #6c5ce733' 
                    }} 
                    labelStyle={{ color: '#00f2c3' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6c5ce7" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    name="Total Requests" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="blocked" 
                    stroke="#ff467e" 
                    fillOpacity={1} 
                    fill="url(#colorBlocked)" 
                    name="Blocked Threats" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6c5ce7" 
                    strokeWidth={2.5} 
                    dot={false} 
                    isAnimationActive={false} 
                    name="Total Requests" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="blocked" 
                    stroke="#ff467e" 
                    strokeWidth={2.5} 
                    dot={false} 
                    isAnimationActive={false} 
                    name="Blocked Threats" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '14px', height: '14px', background: '#6c5ce7', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '0.9rem', color: '#fff' }}>Total Requests</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '14px', height: '14px', background: '#ff467e', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '0.9rem', color: '#fff' }}>Blocked Threats</span>
              </div>
            </div>
          </div>
        </div>

        {/* IP Controls */}
        <div className="large-card">
          <div className="tabs">
            <div className="tab active">IP Blacklist</div>
            <div className="tab">Whitelist</div>
          </div>
          <div className="ip-controls">
            <input type="text" className="ip-input" placeholder="Enter IP address (e.g., 192.168.1.1)" />
            <button className="ip-btn">Add</button>
          </div>
          <div className="ip-list">
            <div className="ip-item">
              <span>192.168.1.45</span>
              <div className="ip-item-actions">
                <button className="ip-item-btn"><i className="fas fa-ban"></i></button>
                <button className="ip-item-btn"><i className="fas fa-trash"></i></button>
              </div>
            </div>
            <div className="ip-item">
              <span>45.227.253.109</span>
              <div className="ip-item-actions">
                <button className="ip-item-btn"><i className="fas fa-ban"></i></button>
                <button className="ip-item-btn"><i className="fas fa-trash"></i></button>
              </div>
            </div>
            <div className="ip-item">
              <span>78.129.203.4</span>
              <div className="ip-item-actions">
                <button className="ip-item-btn"><i className="fas fa-ban"></i></button>
                <button className="ip-item-btn"><i className="fas fa-trash"></i></button>
              </div>
            </div>
            <div className="ip-item">
              <span>223.71.167.29</span>
              <div className="ip-item-actions">
                <button className="ip-item-btn"><i className="fas fa-ban"></i></button>
                <button className="ip-item-btn"><i className="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
