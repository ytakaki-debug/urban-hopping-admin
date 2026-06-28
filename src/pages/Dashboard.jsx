import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MENU = [
  { emoji: '📍', label: 'スポット管理',      desc: '地図スポットの追加・編集・説明文更新', path: '/spots',  badgeKey: null },
  { emoji: '💬', label: 'ポスト管理',        desc: 'ユーザー投稿の一覧・絞り込み・削除',   path: '/posts',  badgeKey: 'reports' },
  { emoji: '📬', label: 'スポットリクエスト', desc: 'ゲストからの提案を審査（承認 / 却下）',  path: null,      badgeKey: null },
  { emoji: '📢', label: 'プロモーション管理', desc: 'バナー広告の作成・公開・非公開切替',     path: null,      badgeKey: null },
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

  // 未処理通報数（ポストごとにユニーク集計）
  const [reportedCount, setReportedCount] = useState(null)

  useEffect(() => {
    supabase
      .from('reports')
      .select('post_id')
      .then(({ data }) => {
        if (data) {
          const unique = new Set(data.map(r => r.post_id))
          setReportedCount(unique.size)
        }
      })
  }, [])

  const badges = { reports: reportedCount }

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
          {MENU.map(item => {
            const badgeCount = item.badgeKey ? (badges[item.badgeKey] ?? null) : null
            const hasAlert   = badgeCount !== null && badgeCount > 0

            return (
              <div
                key={item.label}
                style={{
                  ...S.card,
                  opacity: item.path ? 1 : 0.55,
                  cursor: item.path ? 'pointer' : 'default',
                  border: hasAlert ? '1.5px solid #fca5a5' : '1.5px solid #f1f5f9',
                }}
                onClick={() => item.path && navigate(item.path)}
                onMouseEnter={e => {
                  if (item.path) {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* 絵文字 + バッジ */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={S.cEmoji}>{item.emoji}</div>
                  {hasAlert && (
                    <span style={{
                      background: '#dc2626', color: '#fff',
                      borderRadius: 99, fontSize: 11, fontWeight: 800,
                      padding: '2px 8px', minWidth: 22, textAlign: 'center',
                      lineHeight: '18px', display: 'inline-block',
                    }}>
                      {badgeCount}
                    </span>
                  )}
                </div>

                <div style={S.cLabel}>{item.label}</div>
                <div style={S.cDesc}>{item.desc}</div>

                {/* 通報アラート行 */}
                {hasAlert && (
                  <div style={{
                    marginTop: 10,
                    padding: '5px 10px',
                    background: '#fef2f2', borderRadius: 6,
                    fontSize: 11, fontWeight: 700, color: '#dc2626',
                    border: '1px solid #fecaca',
                  }}>
                    🚩 要対応の通報: {badgeCount}件
                  </div>
                )}

                {/* バッジが0件のとき：問題なし表示 */}
                {badgeCount === 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                    ✓ 未対応の通報なし
                  </div>
                )}

                {!item.path && (
                  <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.06em' }}>
                    COMING SOON
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
