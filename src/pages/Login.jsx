import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const S = {
  wrap:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' },
  card:  { background: '#fff', borderRadius: 14, padding: '40px 36px', width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.09)' },
  logo:  { margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#1a2744', letterSpacing: '-0.02em' },
  sub:   { margin: '0 0 32px', fontSize: 13, color: '#94a3b8' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', transition: 'border-color .15s' },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 },
  btn:   { width: '100%', padding: '12px', background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
}

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h1 style={S.logo}>montan HAKATA</h1>
        <p style={S.sub}>スタッフ管理画面</p>

        <form onSubmit={handleSubmit}>
          <label style={S.label}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ ...S.input, marginBottom: 16 }}
          />

          <label style={S.label}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ ...S.input, marginBottom: 24 }}
          />

          {error && <div style={S.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...S.btn, opacity: loading ? 0.65 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
