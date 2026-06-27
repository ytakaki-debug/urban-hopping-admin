import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MENU = [
  { emoji: '📍', label: 'スポット管理',      desc: '地図スポットの追加・編集・説明文更新', path: '/spots' },
  { emoji: '📬', label: 'スポットリクエスト', desc: 'ゲストからの提案を審査（承認 / 却下）',  path: null },
  { emoji: '📢', label: 'プロモーション管理', desc: 'バナー広告の作成・公開・非公開切替',     path: null },
  { emoji: '🛡️', label: '投稿モデレーション', desc: '通報された投稿を確認・削除',             path: null },
]

const S = {
  page:    { minHeight: '100vh', background: '#f1f5f9' },
  header:  { background: '#1a2744', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  hTitle:  { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' },
  hRight:  { display: 'flex', alignItems: 'center', gap: 14 },
  hEmail:  { fontSize: 12, color: '#94a3b8' },
  hBtn:    { padding: '5px 14px', background: 'transparent', border: '1.5px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' },
  main:    { padding: '32px 28px' },
  heading: { margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1a2744' },
  sub:     { margin: '0 0 28px', fontSize: 13, color: '#94a3b8' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 860 },
  card:    { background: '#fff', borderRadius: 12, padding: '24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #f1f5f9', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' },
  cEmoji:  { fontSize: 30, marginBottom: 12 },
  cLabel:  { fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 4 },
  cDesc:   { fontSize: 12, color: '#94a3b8', lineHeight: 1.5 },
}

export default function Dashboard() {
  const navigate             = useNavigate()
  const { session, signOut } = useAuth()

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.hTitle}>montan HAKATA 管理画面</h1>
        <div style={S.hRight}>
          <span style={S.hEmail}>{session?.user?.email}</span>
          <button onClick={signOut} style={S.hBtn}>ログアウト</button>
        </div>
      </header>

      <main style={S.main}>
        <h2 style={S.heading}>ダッシュボード</h2>
        <p style={S.sub}>管理したい項目を選択してください</p>

        <div style={S.grid}>
          {MENU.map(item => (
            <div
              key={item.label}
              style={{ ...S.card, opacity: item.path ? 1 : 0.55, cursor: item.path ? 'pointer' : 'default' }}
              onClick={() => item.path && navigate(item.path)}
              onMouseEnter={e => { if (item.path) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';  e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={S.cEmoji}>{item.emoji}</div>
              <div style={S.cLabel}>{item.label}</div>
              <div style={S.cDesc}>{item.desc}</div>
              {!item.path && <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.06em' }}>COMING SOON</div>}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
