import { useState, useEffect, useCallback } from 'react'

// Types
interface MonitoredHandle {
  id: string
  handle: string
  lastPost: string
  detectedTickers: string[]
  timestamp: Date
}

interface DetectedTicker {
  id: string
  ticker: string
  source: string
  tweet: string
  timestamp: Date
  viralityScore: number
  trendScore: number
  socialMentions: number
  confidence: number
  analyzed: boolean
}

interface Position {
  id: string
  ticker: string
  entryPrice: number
  currentPrice: number
  size: number
  pnl: number
  pnlPercent: number
  timestamp: Date
}

interface LogEntry {
  id: string
  type: 'detection' | 'analysis' | 'trade' | 'system'
  message: string
  timestamp: Date
}

interface TradingSettings {
  autoTradeEnabled: boolean
  positionSize: number
  takeProfit: number
  stopLoss: number
}

// Mock data generators
const mockHandles: MonitoredHandle[] = [
  { id: '1', handle: '@CryptoWhale', lastPost: 'Just loaded up on $PEPE, this one is going parabolic 🚀', detectedTickers: ['PEPE'], timestamp: new Date() },
  { id: '2', handle: '@DegenTrader', lastPost: 'The $SOL ecosystem is unmatched. $BONK looking primed.', detectedTickers: ['SOL', 'BONK'], timestamp: new Date(Date.now() - 120000) },
  { id: '3', handle: '@AlphaLeaks', lastPost: '$WIF entry looking clean here. NFA but I\'m in.', detectedTickers: ['WIF'], timestamp: new Date(Date.now() - 300000) },
]

const mockTickers: DetectedTicker[] = [
  { id: '1', ticker: 'PEPE', source: '@CryptoWhale', tweet: 'Just loaded up on $PEPE, this one is going parabolic 🚀', timestamp: new Date(), viralityScore: 87, trendScore: 92, socialMentions: 12847, confidence: 89, analyzed: true },
  { id: '2', ticker: 'BONK', source: '@DegenTrader', tweet: 'The $SOL ecosystem is unmatched. $BONK looking primed.', timestamp: new Date(Date.now() - 120000), viralityScore: 74, trendScore: 81, socialMentions: 8432, confidence: 76, analyzed: true },
  { id: '3', ticker: 'WIF', source: '@AlphaLeaks', tweet: '$WIF entry looking clean here. NFA but I\'m in.', timestamp: new Date(Date.now() - 300000), viralityScore: 68, trendScore: 73, socialMentions: 5621, confidence: 71, analyzed: true },
]

const mockPositions: Position[] = [
  { id: '1', ticker: 'PEPE', entryPrice: 0.00001234, currentPrice: 0.00001389, size: 500, pnl: 62.80, pnlPercent: 12.56, timestamp: new Date(Date.now() - 3600000) },
  { id: '2', ticker: 'BONK', entryPrice: 0.00002156, currentPrice: 0.00002089, size: 300, pnl: -9.33, pnlPercent: -3.11, timestamp: new Date(Date.now() - 7200000) },
]

const mockLogs: LogEntry[] = [
  { id: '1', type: 'system', message: 'Bot initialized. Monitoring 3 handles.', timestamp: new Date(Date.now() - 600000) },
  { id: '2', type: 'detection', message: 'Ticker $PEPE detected from @CryptoWhale', timestamp: new Date(Date.now() - 300000) },
  { id: '3', type: 'analysis', message: 'Analysis complete: $PEPE confidence 89%', timestamp: new Date(Date.now() - 290000) },
  { id: '4', type: 'trade', message: 'BUY executed: $PEPE @ $0.00001234 (500 USDT)', timestamp: new Date(Date.now() - 280000) },
  { id: '5', type: 'detection', message: 'Ticker $BONK detected from @DegenTrader', timestamp: new Date(Date.now() - 120000) },
  { id: '6', type: 'analysis', message: 'Analysis complete: $BONK confidence 76%', timestamp: new Date(Date.now() - 110000) },
]

// Sparkline Component
function Sparkline({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 100
  const height = 30
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}

// Gauge Component
function Gauge({ value, label, color }: { value: number, label: string, color: string }) {
  const rotation = (value / 100) * 180 - 90
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-10 overflow-hidden">
        <div 
          className="absolute w-20 h-20 rounded-full border-4 border-gray-800"
          style={{ borderTopColor: color, borderRightColor: color, filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-8 origin-bottom rounded-full transition-transform duration-1000"
          style={{ 
            backgroundColor: color,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            boxShadow: `0 0 10px ${color}`
          }}
        />
      </div>
      <span className="text-xs text-gray-500 mt-1 font-mono">{label}</span>
      <span className="text-sm font-bold" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}%</span>
    </div>
  )
}

// Confidence Ring Component
function ConfidenceRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (value / 100) * circumference
  const color = value >= 80 ? '#0ff' : value >= 60 ? '#f0f' : '#ff0'
  
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r="45"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="8"
        />
        <circle
          cx="56"
          cy="56"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-orbitron" style={{ color, textShadow: `0 0 20px ${color}` }}>
          {value}%
        </span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Confidence</span>
      </div>
    </div>
  )
}

// Animated Number Component
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    const duration = 1000
    const steps = 30
    const increment = value / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [value])
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>
}

// Pulsing Dot Component
function PulsingDot({ color = '#0ff' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span 
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span 
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  )
}

// Main App Component
export default function App() {
  const [handles, setHandles] = useState<MonitoredHandle[]>(mockHandles)
  const [tickers, setTickers] = useState<DetectedTicker[]>(mockTickers)
  const [positions, setPositions] = useState<Position[]>(mockPositions)
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs)
  const [newHandle, setNewHandle] = useState('')
  const [settings, setSettings] = useState<TradingSettings>({
    autoTradeEnabled: true,
    positionSize: 500,
    takeProfit: 25,
    stopLoss: 10,
  })
  const [scanningTicker, setScanningTicker] = useState<string | null>(null)
  
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update positions with random price movements
      setPositions(prev => prev.map(p => {
        const change = (Math.random() - 0.48) * 0.00000005
        const newPrice = p.currentPrice + change
        const pnlPercent = ((newPrice - p.entryPrice) / p.entryPrice) * 100
        const pnl = p.size * (pnlPercent / 100)
        return { ...p, currentPrice: newPrice, pnl, pnlPercent }
      }))
      
      // Update social mentions
      setTickers(prev => prev.map(t => ({
        ...t,
        socialMentions: t.socialMentions + Math.floor(Math.random() * 10)
      })))
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])
  
  const addHandle = useCallback(() => {
    if (newHandle && !handles.find(h => h.handle.toLowerCase() === newHandle.toLowerCase())) {
      const handle = newHandle.startsWith('@') ? newHandle : `@${newHandle}`
      setHandles(prev => [...prev, {
        id: Date.now().toString(),
        handle,
        lastPost: 'Scanning for posts...',
        detectedTickers: [],
        timestamp: new Date()
      }])
      setLogs(prev => [{
        id: Date.now().toString(),
        type: 'system',
        message: `Added ${handle} to monitoring list`,
        timestamp: new Date()
      }, ...prev])
      setNewHandle('')
    }
  }, [newHandle, handles])
  
  const removeHandle = useCallback((id: string) => {
    const handle = handles.find(h => h.id === id)
    setHandles(prev => prev.filter(h => h.id !== id))
    if (handle) {
      setLogs(prev => [{
        id: Date.now().toString(),
        type: 'system',
        message: `Removed ${handle.handle} from monitoring`,
        timestamp: new Date()
      }, ...prev])
    }
  }, [handles])
  
  const simulateAnalysis = useCallback((ticker: DetectedTicker) => {
    setScanningTicker(ticker.ticker)
    setTimeout(() => {
      setScanningTicker(null)
      setLogs(prev => [{
        id: Date.now().toString(),
        type: 'analysis',
        message: `Re-analysis complete: $${ticker.ticker} confidence ${ticker.confidence}%`,
        timestamp: new Date()
      }, ...prev])
    }, 2000)
  }, [])
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  
  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'detection': return 'text-cyan-400'
      case 'analysis': return 'text-fuchsia-400'
      case 'trade': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }
  
  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'detection': return '◈'
      case 'analysis': return '◉'
      case 'trade': return '◆'
      default: return '○'
    }
  }

  // Generate sparkline data
  const generateSparklineData = () => Array.from({ length: 12 }, () => Math.random() * 100)
  
  return (
    <div 
      className="min-h-screen text-white overflow-x-hidden"
      style={{
        fontFamily: "'Exo 2', sans-serif",
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(0,255,255,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(255,0,255,0.08) 0%, transparent 50%),
          linear-gradient(180deg, #0a0a0f 0%, #0d0d18 50%, #0a0a12 100%)
        `,
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Animated Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Scanline Effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)'
        }}
      />
      
      <div className="relative z-10 p-4 md:p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center text-2xl font-bold" style={{ boxShadow: '0 0 30px rgba(0,255,255,0.4)' }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif" }}>Σ</span>
                </div>
                <div className="absolute -top-1 -right-1">
                  <PulsingDot color="#0f0" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif", background: 'linear-gradient(90deg, #0ff, #f0f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  CRYPTOSIGNAL<span className="text-cyan-400">_</span>BOT
                </h1>
                <p className="text-xs text-gray-500 tracking-widest">AUTONOMOUS TRADING TERMINAL v2.4.1</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
                <PulsingDot />
                <span className="font-mono">LIVE</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">TOTAL P&L</div>
                <div className={`text-lg font-bold font-mono ${positions.reduce((acc, p) => acc + p.pnl, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ textShadow: positions.reduce((acc, p) => acc + p.pnl, 0) >= 0 ? '0 0 10px rgba(0,255,0,0.5)' : '0 0 10px rgba(255,0,0,0.5)' }}>
                  {positions.reduce((acc, p) => acc + p.pnl, 0) >= 0 ? '+' : ''}${positions.reduce((acc, p) => acc + p.pnl, 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Left Column - Monitoring & Detection */}
          <div className="lg:col-span-4 space-y-4 md:space-y-6">
            
            {/* X Handle Monitoring */}
            <div className="rounded-xl p-4 md:p-5" style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.05) 0%, rgba(255,0,255,0.03) 100%)', border: '1px solid rgba(0,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="text-cyan-400">⬡</span> X HANDLE MONITOR
                </h2>
                <span className="text-xs text-gray-500 font-mono">{handles.length} active</span>
              </div>
              
              {/* Add Handle Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHandle()}
                  placeholder="@handle"
                  className="flex-1 bg-black/40 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  style={{ boxShadow: 'inset 0 0 20px rgba(0,255,255,0.05)' }}
                />
                <button
                  onClick={addHandle}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.2) 0%, rgba(0,255,255,0.1) 100%)', border: '1px solid rgba(0,255,255,0.4)', boxShadow: '0 0 20px rgba(0,255,255,0.2)' }}
                >
                  + ADD
                </button>
              </div>
              
              {/* Handles List */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {handles.map((handle) => (
                  <div 
                    key={handle.id}
                    className="p-3 rounded-lg relative overflow-hidden group"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,255,0.1)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PulsingDot color="#0ff" />
                        <span className="font-mono text-cyan-400 text-sm">{handle.handle}</span>
                      </div>
                      <button 
                        onClick={() => removeHandle(handle.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">{handle.lastPost}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {handle.detectedTickers.map((ticker) => (
                          <span key={ticker} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold" style={{ background: 'rgba(255,0,255,0.2)', color: '#f0f', border: '1px solid rgba(255,0,255,0.4)' }}>
                            ${ticker}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-600 font-mono">{formatTime(handle.timestamp)}</span>
                    </div>
                    {/* Scanning animation overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Ticker Detection Feed */}
            <div className="rounded-xl p-4 md:p-5" style={{ background: 'linear-gradient(135deg, rgba(255,0,255,0.05) 0%, rgba(0,255,255,0.03) 100%)', border: '1px solid rgba(255,0,255,0.15)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="text-fuchsia-400">◈</span> DETECTION FEED
                </h2>
                <div className="flex items-center gap-2">
                  <PulsingDot color="#f0f" />
                  <span className="text-xs text-gray-500 font-mono">scanning</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {tickers.map((ticker) => (
                  <div 
                    key={ticker.id}
                    className="p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${scanningTicker === ticker.ticker ? 'rgba(0,255,255,0.6)' : 'rgba(255,0,255,0.1)'}`, boxShadow: scanningTicker === ticker.ticker ? '0 0 20px rgba(0,255,255,0.3)' : 'none' }}
                    onClick={() => simulateAnalysis(ticker)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold font-mono" style={{ color: '#0ff', textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
                        ${ticker.ticker}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">{formatTime(ticker.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      <span className="text-fuchsia-400">{ticker.source}:</span> {ticker.tweet}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-500">
                          CONF: <span className={`font-bold ${ticker.confidence >= 80 ? 'text-cyan-400' : ticker.confidence >= 60 ? 'text-fuchsia-400' : 'text-yellow-400'}`}>{ticker.confidence}%</span>
                        </span>
                        <span className="text-[10px] text-gray-500">
                          MENTIONS: <span className="text-cyan-400 font-mono"><AnimatedNumber value={ticker.socialMentions} /></span>
                        </span>
                      </div>
                      {scanningTicker === ticker.ticker && (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-3 bg-cyan-400 animate-pulse" />
                          <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Center Column - Analysis Engine */}
          <div className="lg:col-span-5 space-y-4 md:space-y-6">
            
            {/* Main Analysis Display */}
            <div className="rounded-xl p-4 md:p-6" style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.03) 0%, rgba(255,0,255,0.03) 50%, rgba(0,255,255,0.03) 100%)', border: '1px solid rgba(0,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="text-cyan-400">◉</span> ANALYSIS ENGINE
                </h2>
                <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  PROCESSING
                </div>
              </div>
              
              {tickers.length > 0 && (
                <div className="space-y-6">
                  {/* Featured Ticker */}
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-black mb-2" style={{ fontFamily: "'Orbitron', sans-serif", background: 'linear-gradient(90deg, #0ff, #f0f, #0ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 40px rgba(0,255,255,0.5)' }}>
                      ${tickers[0].ticker}
                    </div>
                    <div className="text-xs text-gray-500 mb-4">from {tickers[0].source}</div>
                    
                    {/* Confidence Ring */}
                    <div className="flex justify-center mb-6">
                      <ConfidenceRing value={tickers[0].confidence} />
                    </div>
                  </div>
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,255,0.1)' }}>
                      <Gauge value={tickers[0].viralityScore} label="VIRALITY" color="#0ff" />
                    </div>
                    <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,0,255,0.1)' }}>
                      <Gauge value={tickers[0].trendScore} label="TREND" color="#f0f" />
                    </div>
                    <div className="text-center p-3 rounded-lg flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,255,0.1)' }}>
                      <div className="text-xl font-bold text-cyan-400" style={{ fontFamily: "'Orbitron', sans-serif", textShadow: '0 0 15px rgba(0,255,255,0.5)' }}>
                        <AnimatedNumber value={tickers[0].socialMentions} />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">MENTIONS</div>
                    </div>
                  </div>
                  
                  {/* Trend Sparkline */}
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,255,0.1)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">24H TREND</span>
                      <span className="text-xs text-cyan-400 font-mono">+{(Math.random() * 20 + 5).toFixed(1)}%</span>
                    </div>
                    <Sparkline data={generateSparklineData()} color="#0ff" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Secondary Tickers Analysis */}
            <div className="grid grid-cols-2 gap-4">
              {tickers.slice(1, 3).map((ticker) => (
                <div 
                  key={ticker.id}
                  className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, rgba(255,0,255,0.05) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(255,0,255,0.15)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold" style={{ fontFamily: "'Orbitron', sans-serif", color: '#f0f' }}>${ticker.ticker}</span>
                    <span className={`text-lg font-bold ${ticker.confidence >= 70 ? 'text-cyan-400' : 'text-yellow-400'}`}>
                      {ticker.confidence}%
                    </span>
                  </div>
                  <Sparkline data={generateSparklineData()} color="#f0f" />
                  <div className="mt-3 flex justify-between text-[10px] text-gray-500">
                    <span>VIR: {ticker.viralityScore}%</span>
                    <span>TRD: {ticker.trendScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Column - Trading & Logs */}
          <div className="lg:col-span-3 space-y-4 md:space-y-6">
            
            {/* Auto-Trading Panel */}
            <div className="rounded-xl p-4 md:p-5" style={{ background: 'linear-gradient(135deg, rgba(255,255,0,0.05) 0%, rgba(0,255,0,0.03) 100%)', border: '1px solid rgba(255,255,0,0.15)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="text-yellow-400">◆</span> AUTO-TRADE
                </h2>
                {/* Toggle Switch */}
                <button
                  onClick={() => setSettings(s => ({ ...s, autoTradeEnabled: !s.autoTradeEnabled }))}
                  className={`relative w-14 h-7 rounded-full transition-all ${settings.autoTradeEnabled ? 'bg-green-500/30' : 'bg-gray-800'}`}
                  style={{ border: `1px solid ${settings.autoTradeEnabled ? 'rgba(0,255,0,0.5)' : 'rgba(100,100,100,0.3)'}` }}
                >
                  <div 
                    className={`absolute top-1 w-5 h-5 rounded-full transition-all ${settings.autoTradeEnabled ? 'left-8 bg-green-400' : 'left-1 bg-gray-500'}`}
                    style={{ boxShadow: settings.autoTradeEnabled ? '0 0 10px rgba(0,255,0,0.8)' : 'none' }}
                  />
                </button>
              </div>
              
              {/* Trading Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">POSITION SIZE</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.positionSize}
                      onChange={(e) => setSettings(s => ({ ...s, positionSize: Number(e.target.value) }))}
                      className="w-20 bg-black/40 border border-yellow-500/30 rounded px-2 py-1 text-sm font-mono text-right focus:outline-none focus:border-yellow-400"
                    />
                    <span className="text-xs text-yellow-400">USDT</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">TAKE PROFIT</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.takeProfit}
                      onChange={(e) => setSettings(s => ({ ...s, takeProfit: Number(e.target.value) }))}
                      className="w-16 bg-black/40 border border-green-500/30 rounded px-2 py-1 text-sm font-mono text-right text-green-400 focus:outline-none focus:border-green-400"
                    />
                    <span className="text-xs text-green-400">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">STOP LOSS</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.stopLoss}
                      onChange={(e) => setSettings(s => ({ ...s, stopLoss: Number(e.target.value) }))}
                      className="w-16 bg-black/40 border border-red-500/30 rounded px-2 py-1 text-sm font-mono text-right text-red-400 focus:outline-none focus:border-red-400"
                    />
                    <span className="text-xs text-red-400">%</span>
                  </div>
                </div>
              </div>
              
              {/* Active Positions */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,0,0.1)' }}>
                <div className="text-xs text-gray-500 mb-3">ACTIVE POSITIONS</div>
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {positions.map((pos) => (
                    <div 
                      key={pos.id}
                      className="p-2 rounded-lg flex items-center justify-between"
                      style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${pos.pnl >= 0 ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)'}` }}
                    >
                      <div>
                        <div className="font-mono font-bold text-sm" style={{ color: '#0ff' }}>${pos.ticker}</div>
                        <div className="text-[10px] text-gray-500">${pos.size} USDT</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pos.pnl >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                        </div>
                        <div className={`text-[10px] font-mono ${pos.pnl >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Activity Log */}
            <div className="rounded-xl p-4 md:p-5" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)', border: '1px solid rgba(100,100,100,0.2)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold tracking-wider flex items-center gap-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="text-gray-400">▣</span> ACTIVITY LOG
                </h2>
                <span className="text-xs text-gray-600 font-mono">{logs.length} entries</span>
              </div>
              
              <div className="space-y-2 max-h-[250px] overflow-y-auto font-mono text-xs pr-1">
                {logs.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-start gap-2 py-1" 
                    style={{ borderBottom: '1px solid rgba(100,100,100,0.1)' }}
                  >
                    <span className={getLogColor(log.type)}>{getLogIcon(log.type)}</span>
                    <div className="flex-1">
                      <span className="text-gray-400">{log.message}</span>
                    </div>
                    <span className="text-gray-600 text-[10px] whitespace-nowrap">{formatTime(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-800/50">
          <div className="text-center">
            <p className="text-xs text-gray-600 font-mono tracking-wide">
              Requested by <span className="text-gray-500">@AlexandraLiam3</span> · Built by <span className="text-gray-500">@clonkbot</span>
            </p>
          </div>
        </footer>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .font-orbitron {
          font-family: 'Orbitron', sans-serif;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}
