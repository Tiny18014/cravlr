import { useState, useEffect } from 'react';

export default function MobileDebugConsole() {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Capture console.log, console.error, etc.
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      setLogs(prev => [...prev.slice(-20), `LOG: ${message}`]);
      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      setLogs(prev => [...prev.slice(-20), `ERROR: ${message}`]);
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 99999,
          background: '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 50,
          height: 50,
          fontSize: '12px'
        }}
      >
        DEBUG
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99998,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: 10,
      overflow: 'auto',
      fontSize: 12,
      fontFamily: 'monospace'
    }}>
      <button
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          padding: '5px 10px'
        }}
      >
        Close
      </button>
      
      <div style={{ marginTop: 40 }}>
        <h3>Debug Console</h3>
        <button
          onClick={() => setLogs([])}
          style={{
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '5px 10px',
            marginBottom: 10
          }}
        >
          Clear
        </button>
        
        {logs.map((log, i) => (
          <div key={i} style={{ 
            marginBottom: 5, 
            padding: 5, 
            background: log.startsWith('ERROR:') ? '#660000' : '#003300',
            borderRadius: 3,
            wordBreak: 'break-word'
          }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}