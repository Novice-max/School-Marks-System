import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={s.wrapper}>
          <div style={s.card}>
            <div style={s.icon}>⚠️</div>
            <h2 style={s.title}>Something went wrong</h2>
            <p style={s.msg}>The page encountered an unexpected error. Please try refreshing.</p>
            <p style={s.detail}>{this.state.error?.message}</p>
            <button style={s.btn} onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}>
              Go to Home
            </button>
            <button style={s.btnAlt} onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const s = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 20 },
  card:    { background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)' },
  icon:    { fontSize: 48, marginBottom: 16 },
  title:   { fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 },
  msg:     { fontSize: 14, color: '#666', marginBottom: 8 },
  detail:  { fontSize: 12, color: '#aaa', marginBottom: 24, fontFamily: 'monospace', wordBreak: 'break-word' },
  btn:     { padding: '10px 28px', background: '#1e5fa0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14, marginRight: 10 },
  btnAlt:  { padding: '10px 28px', background: '#f1f5f9', color: '#1e3a5f', border: '1.5px solid #dde3ea', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 },
};