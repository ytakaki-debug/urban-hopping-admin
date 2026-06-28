import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'

const CATEGORY_LABELS = {
  core: 'コア・ホテル',
  food: 'グルメ・食事',
  shopping: 'ショッピング',
  experience: '体験・観光',
}

const CATEGORY_COLORS = {
  core: '#1a2744',
  food: '#f97316',
  shopping: '#7c3aed',
  experience: '#059669',
}

const NAT_LABELS = {
  jp: '日本', kr: '韓国', tw: '台湾', cn: '中国',
  us: 'USA', gb: 'UK', au: '豪州', asia: 'その他アジア',
  west: 'その他欧米', other: 'その他',
}

const COMPANION_LABELS = {
  solo_f: '女性・ソロ', solo_m: '男性・ソロ',
  couple: 'カップル', friends: '友人', family: 'ファミリー',
}

const PIE_COLORS = [
  '#2563eb', '#f97316', '#7c3aed', '#059669', '#dc2626',
  '#d97706', '#0891b2', '#be185d', '#84cc16', '#6366f1',
]

const RANK_COLORS = [
  '#f59e0b', '#94a3b8', '#b45309', '#2563eb', '#7c3aed',
  '#059669', '#dc2626', '#0891b2', '#be185d', '#6366f1',
]

const S = {
  page:    { minHeight: '100vh', background: '#f1f5f9' },
  header:  { background: '#1a2744', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  hTitle:  { margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' },
  hRight:  { display: 'flex', alignItems: 'center', gap: 14 },
  hEmail:  { fontSize: 12, color: '#94a3b8' },
  hBtn:    { padding: '5px 14px', background: 'transparent', border: '1.5px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' },
  main:    { padding: '32px 28px', maxWidth: 960 },
  backBtn: { marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 600 },
  heading: { margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1a2744' },
  sub:     { margin: '0 0 28px', fontSize: 13, color: '#94a3b8' },
  statGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard:  { background: '#fff', borderRadius: 12, padding: '18px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #f1f5f9' },
  statEmoji: { fontSize: 22, marginBottom: 8 },
  statVal:   { fontSize: 26, fontWeight: 800, color: '#1a2744', lineHeight: 1, marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 600 },
  section:   { background: '#fff', borderRadius: 12, padding: '22px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #f1f5f9', marginBottom: 18 },
  sTitle:    { margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#1a2744' },
  sSub:      { margin: '0 0 16px', fontSize: 11, color: '#94a3b8' },
  pieGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 },
  empty:     { color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '36px 0' },
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a2744', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
      <p style={{ margin: 0, color: '#cbd5e1', fontSize: 11 }}>{label}</p>
      <p style={{ margin: '3px 0 0', color: '#fff', fontSize: 14, fontWeight: 800 }}>{payload[0].value} 件</p>
    </div>
  )
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a2744', borderRadius: 8, padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
      <p style={{ margin: 0, color: '#cbd5e1', fontSize: 11 }}>{payload[0].name}</p>
      <p style={{ margin: '3px 0 0', color: '#fff', fontSize: 14, fontWeight: 800 }}>{payload[0].value} 件</p>
    </div>
  )
}

const RADIAN = Math.PI / 180
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.06) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

function SpotRow({ rank, name, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  const color = RANK_COLORS[rank - 1] || '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div style={{ width: 24, textAlign: 'center', fontSize: 12, fontWeight: 800, color, flexShrink: 0 }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color, flexShrink: 0, marginLeft: 10 }}>{count} 件</span>
        </div>
        <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width .5s ease' }} />
        </div>
      </div>
    </div>
  )
}

export default function Insights() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()
  const [loading, setLoading] = useState(true)

  const [totalPosts, setTotalPosts]   = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [spotRanking, setSpotRanking] = useState([])
  const [natData, setNatData]         = useState([])
  const [compData, setCompData]       = useState([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, nationality, companion, spots(title_ja, category)')

      if (error || !posts) {
        setLoading(false)
        return
      }

      setTotalPosts(posts.length)

      // --- Category ---
      const catCount = {}
      posts.forEach(p => {
        const cat = p.spots?.category || 'unknown'
        catCount[cat] = (catCount[cat] || 0) + 1
      })
      setCategoryData(
        Object.entries(catCount)
          .map(([cat, count]) => ({ cat, name: CATEGORY_LABELS[cat] || cat, count }))
          .sort((a, b) => b.count - a.count)
      )

      // --- Spot ranking ---
      const spotCount = {}
      posts.forEach(p => {
        const title = p.spots?.title_ja || '不明'
        spotCount[title] = (spotCount[title] || 0) + 1
      })
      setSpotRanking(
        Object.entries(spotCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      )

      // --- Nationality ---
      const natCount = {}
      posts.forEach(p => {
        if (p.nationality) natCount[p.nationality] = (natCount[p.nationality] || 0) + 1
      })
      setNatData(
        Object.entries(natCount)
          .map(([key, count]) => ({ name: NAT_LABELS[key] || key, count }))
          .sort((a, b) => b.count - a.count)
      )

      // --- Companion ---
      const compCount = {}
      posts.forEach(p => {
        if (p.companion) compCount[p.companion] = (compCount[p.companion] || 0) + 1
      })
      setCompData(
        Object.entries(compCount)
          .map(([key, count]) => ({ name: COMPANION_LABELS[key] || key, count }))
          .sort((a, b) => b.count - a.count)
      )

      setLoading(false)
    }
    load()
  }, [])

  const maxSpot = spotRanking[0]?.count || 1
  const uniqueNats = natData.length

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
        <button onClick={() => navigate('/')} style={S.backBtn}>
          ← ダッシュボードに戻る
        </button>
        <h2 style={S.heading}>データ分析（インサイト）</h2>
        <p style={S.sub}>ゲストの動向をリアルタイムで可視化しています</p>

        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 14, padding: '40px 0' }}>データを読み込み中...</div>
        ) : (
          <>
            {/* ─── Stat Cards ─── */}
            <div style={S.statGrid}>
              <div style={S.statCard}>
                <div style={S.statEmoji}>💬</div>
                <div style={S.statVal}>{totalPosts ?? 0}</div>
                <div style={S.statLabel}>総投稿数</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statEmoji}>🗺️</div>
                <div style={S.statVal}>{spotRanking.length}</div>
                <div style={S.statLabel}>投稿のあるスポット数</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statEmoji}>🌏</div>
                <div style={S.statVal}>{uniqueNats}</div>
                <div style={S.statLabel}>訪問国籍数</div>
              </div>
              <div style={S.statCard}>
                <div style={S.statEmoji}>🥇</div>
                <div style={{ ...S.statVal, fontSize: spotRanking[0]?.name.length > 8 ? 16 : 22 }}>
                  {spotRanking[0]?.name || '—'}
                </div>
                <div style={S.statLabel}>最人気スポット</div>
              </div>
            </div>

            {/* ─── Category Bar Chart ─── */}
            <div style={S.section}>
              <h3 style={S.sTitle}>カテゴリー別投稿数</h3>
              <p style={S.sSub}>スポットカテゴリーごとの投稿数の分布</p>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={categoryData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72}>
                      {categoryData.map((entry, idx) => (
                        <Cell key={idx} fill={CATEGORY_COLORS[entry.cat] || PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={S.empty}>カテゴリーデータがまだありません</div>
              )}
            </div>

            {/* ─── Spot Ranking ─── */}
            <div style={S.section}>
              <h3 style={S.sTitle}>スポット別人気ランキング（投稿数 TOP10）</h3>
              <p style={S.sSub}>投稿が多いスポット上位10件</p>
              {spotRanking.length > 0 ? (
                spotRanking.map((spot, i) => (
                  <SpotRow key={spot.name} rank={i + 1} name={spot.name} count={spot.count} maxCount={maxSpot} />
                ))
              ) : (
                <div style={S.empty}>スポットデータがまだありません</div>
              )}
            </div>

            {/* ─── Pie Charts ─── */}
            <div style={S.pieGrid}>
              {/* Nationality */}
              <div style={S.section}>
                <h3 style={S.sTitle}>国籍別割合</h3>
                <p style={S.sSub}>投稿ゲストの国籍分布</p>
                {natData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={natData}
                        cx="50%"
                        cy="46%"
                        innerRadius={56}
                        outerRadius={96}
                        dataKey="count"
                        labelLine={false}
                        label={renderPieLabel}
                        paddingAngle={2}
                      >
                        {natData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={S.empty}>国籍データがまだありません</div>
                )}
              </div>

              {/* Companion */}
              <div style={S.section}>
                <h3 style={S.sTitle}>同行者別割合</h3>
                <p style={S.sSub}>ゲストの同行者タイプ分布</p>
                {compData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={compData}
                        cx="50%"
                        cy="46%"
                        innerRadius={56}
                        outerRadius={96}
                        dataKey="count"
                        labelLine={false}
                        label={renderPieLabel}
                        paddingAngle={2}
                      >
                        {compData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={S.empty}>同行者データがまだありません</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
