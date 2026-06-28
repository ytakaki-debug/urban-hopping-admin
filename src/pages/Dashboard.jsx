import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// badgeKey  : badges オブジェクトのキー（nullなら非表示）
// badgeBg   : バッジの背景色
// alertMsg  : アラート行のプレフィックステキスト
// alertBg/alertColor/alertBorder : アラート行の配色
const MENU = [
  {
    emoji: '📍', label: 'スポット管理',
    desc: '地図スポットの追加・編集・説明文更新',
    path: '/spots', badgeKey: null,
  },
  {
    emoji: '💬', label: 'ポスト管理',
    desc: 'ユーザー投稿の一覧・絞り込み・削除',
    path: '/posts', badgeKey: 'reports',
    badgeBg: '#dc2626',
    alertMsg: '🚩 要対応の通報',
    alertBg: '#fef2f2', alertColor: '#dc2626', alertBorder: '#fecaca',
    okMsg: '✓ 未対応の通報なし', okColor: '#16a34a',
  },
  {
    emoji: '📬', label: 'スポットリクエスト',
    desc: 'ゲストからの提案を審査（承認 / 却下）',
    path: '/spot-requests', badgeKey: 'requests',
    badgeBg: '#f59e0b',
    alertMsg: '📬 未処理のリクエスト',
    alertBg: '#fffbeb', alertColor: '#d97706', alertBorder: '#fde68a',
    okMsg: '✓ 未処理のリクエストなし', okColor: '#16a34a',
  },
  {
    emoji: '📢', label: 'プロモーション管理',
    desc: 'バナー広告の作成・公開・非公開切替',
    path: '/promotions', badgeKey: null,
  },
  {
    emoji: '📊', label: 'データ分析（インサイト）',
    desc: '国籍・カテゴリー・人気スポットなどゲスト動向を可視化',
    path: '/insights', badgeKey: null,
  },
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
  card:    { background: '#fff', borderRadius: 12, padding: '24px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' },
  cEmoji:  { fontSize: 30 },
  cLabel:  { fontSize: 14, fontWeight: 700, color: '#1a2744', marginBottom: 4 },
  cDesc:   { fontSize: 12, color: '#94a3b8', lineHeight: 1.5 },
}

export default function Dashboard() {
  const navigate             = useNavigate()
  const { session, signOut } = useAuth()

  const [reportedCount, setReportedCount]   = useState(null)
  const [requestCount, setRequestCount]     = useState(null)

  useEffect(() => {
    // 通報されたポストのユニーク件数
    supabase.from('reports').select('post_id')
      .then(({ data }) => {
        if (data) setReportedCount(new Set(data.map(r => r.post_id)).size)
      })

    // 未処理スポットリクエスト件数
    supabase.from('spot_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setRequestCount(count ?? 0))
  }, [])

  const badges = { reports: reportedCount, requests: requestCount }

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
            const badgeCount = item.badgeKey != null ? (badges[item.badgeKey] ?? null) : null
            const hasAlert   = badgeCount !== null && badgeCount > 0
            const isReady    = badgeCount === 0        // ロード済み & 0件

            return (
              <div
                key={item.label}
                style={{
                  ...S.card,
                  opacity: item.path ? 1 : 0.55,
                  cursor: item.path ? 'pointer' : 'default',
                  border: hasAlert
                    ? `1.5px solid ${item.alertBorder || '#fca5a5'}`
                    : '1.5px solid #f1f5f9',
                }}
                onClick={() => item.path && navigate(item.path)}
                onMouseEnter={e => {
                  if (!item.path) return
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* 絵文字 + バッジ数字 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={S.cEmoji}>{item.emoji}</div>
                  {hasAlert && (
                    <span style={{
                      background: item.badgeBg || '#dc2626', color: '#fff',
                      borderRadius: 99, fontSize: 11, fontWeight: 800,
                      padding: '2px 8px', minWidth: 22, textAlign: 'center',
                      lineHeight: '18px',
                    }}>
                      {badgeCount}
                    </span>
                  )}
                </div>

                <div style={S.cLabel}>{item.label}</div>
                <div style={S.cDesc}>{item.desc}</div>

                {/* アラート行：件数あり */}
                {hasAlert && (
                  <div style={{
                    marginTop: 10, padding: '5px 10px',
                    background: item.alertBg || '#fef2f2',
                    borderRadius: 6, fontSize: 11, fontWeight: 700,
                    color: item.alertColor || '#dc2626',
                    border: `1px solid ${item.alertBorder || '#fecaca'}`,
                  }}>
                    {item.alertMsg}: {badgeCount}件
                  </div>
                )}

                {/* 問題なし行：0件確認済み */}
                {isReady && !hasAlert && item.okMsg && (
                  <div style={{ marginTop: 10, fontSize: 11, color: item.okColor || '#16a34a', fontWeight: 600 }}>
                    {item.okMsg}
                  </div>
                )}

                {/* COMING SOON */}
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
