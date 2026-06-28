import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── 定数 ────────────────────────────────────────────────────────────
const COMPANION_LABELS = {
  solo_f: '女性・ソロ', solo_m: '男性・ソロ',
  couple: 'カップル', friends: '友人', family: 'ファミリー',
}
const NAT_FLAGS = {
  jp: '🇯🇵', kr: '🇰🇷', tw: '🇹🇼', cn: '🇨🇳', us: '🇺🇸',
  gb: '🇬🇧', au: '🇦🇺', asia: '🌏', west: '🌍', other: '🌐',
}
const TIME_TYPES = [
  { value: 'both',  label: '昼夜どちらも' },
  { value: 'day',   label: '昼のみ（Daytime）' },
  { value: 'night', label: '夜のみ（Nighttime）' },
]
const CATEGORIES = [
  { value: '',           label: '── 未選択 ──' },
  { value: 'core',       label: 'コア（ホテル関連）' },
  { value: 'food',       label: 'グルメ・食事' },
  { value: 'shopping',   label: 'ショッピング' },
  { value: 'experience', label: '体験・観光' },
]
const STATUS_TABS = [
  { value: 'pending',  label: '⏳ 未処理',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'approved', label: '✅ 承認済み', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: 'rejected', label: '❌ 却下済み', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
]

// ── スタイル定数 ────────────────────────────────────────────────────
const LABEL_S = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }
const INPUT_S = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13,
  outline: 'none', background: '#fff', fontFamily: 'inherit',
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── 承認モーダル ────────────────────────────────────────────────────
function ApprovalModal({ request, onClose, onApproved, showToast }) {
  const [form, setForm] = useState({
    title_ja:  request.spot_name,
    title_en:  '',
    latitude:  '',
    longitude: '',
    time_type: 'both',
    category:  '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title_ja.trim())           { showToast('error', '日本語スポット名は必須です'); return }
    if (!form.latitude || !form.longitude) { showToast('error', '緯度・経度は必須です'); return }
    const lat = parseFloat(form.latitude)
    const lng = parseFloat(form.longitude)
    if (isNaN(lat) || isNaN(lng))        { showToast('error', '有効な緯度・経度を入力してください'); return }

    setSaving(true)
    try {
      // 1. spots テーブルに INSERT → 新しい spot_id を取得
      const { data: newSpot, error: insertSpotErr } = await supabase
        .from('spots')
        .insert({
          title_ja:   form.title_ja.trim(),
          title_en:   form.title_en.trim() || null,
          latitude:   lat,
          longitude:  lng,
          time_type:  form.time_type,
          category:   form.category || null,
          image_url:  request.image_url || null,
          is_deleted: false,
        })
        .select('id')
        .single()
      if (insertSpotErr) throw new Error(`スポット作成失敗: ${insertSpotErr.message}`)

      // 2. posts テーブルにリクエスト内容を「最初の投稿」として INSERT
      const { error: insertPostErr } = await supabase.from('posts').insert({
        spot_id:     newSpot.id,
        stamp_type:  request.stamp_type  || null,
        comment:     request.comment     || '',
        image_url:   request.image_url   || null,
        companion:   request.companion   || 'unknown',
        nationality: request.nationality || 'unknown',
      })
      if (insertPostErr) throw new Error(`初回投稿作成失敗: ${insertPostErr.message}`)

      // 3. spot_requests を 'approved' に更新
      const { error: updateErr } = await supabase
        .from('spot_requests')
        .update({ status: 'approved' })
        .eq('id', request.id)
      if (updateErr) throw new Error(`ステータス更新失敗: ${updateErr.message}`)

      showToast('success', `「${form.title_ja}」をスポットに追加し、最初の投稿を登録しました！`)
      onApproved(request.id)
    } catch (err) {
      showToast('error', `エラー: ${err.message}`)
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* ヘッダー */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2744' }}>✅ スポットとして承認・追加</div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* リクエスト元情報 */}
        <div style={{ margin: '16px 24px', padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 6, textTransform: 'uppercase' }}>
            リクエスト元情報
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2744' }}>{request.spot_name}</div>
          {request.comment && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>💬 {request.comment}</div>
          )}
          {request.image_url && (
            <img src={request.image_url} alt=""
              style={{ width: 90, height: 68, objectFit: 'cover', borderRadius: 6, marginTop: 8, display: 'block' }} />
          )}
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {request.nationality && request.nationality !== 'unknown' && (
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {NAT_FLAGS[request.nationality] || '🌐'} {request.nationality.toUpperCase()}
              </span>
            )}
            {request.companion && request.companion !== 'unknown' && (
              <span style={{ fontSize: 11, color: '#64748b' }}>
                👥 {COMPANION_LABELS[request.companion] || request.companion}
              </span>
            )}
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(request.created_at)}</span>
          </div>
        </div>

        {/* 入力フォーム */}
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            スポット情報を入力（★ は必須）
          </div>

          <label>
            <span style={LABEL_S}>スポット名（日本語）★</span>
            <input value={form.title_ja} onChange={e => set('title_ja', e.target.value)}
              style={INPUT_S} placeholder="例: 中洲屋台エリア" />
          </label>

          <label>
            <span style={LABEL_S}>スポット名（英語）</span>
            <input value={form.title_en} onChange={e => set('title_en', e.target.value)}
              style={INPUT_S} placeholder="e.g. Nakasu Yatai Area" />
          </label>

          <div>
            <span style={LABEL_S}>
              GPS座標 ★
              <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 8, fontSize: 10, color: '#3b82f6', textDecoration: 'none', fontWeight: 400 }}>
                Google Mapsで調べる →
              </a>
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={form.latitude} onChange={e => set('latitude', e.target.value)}
                style={INPUT_S} placeholder="緯度 例: 33.5902" type="number" step="0.000001" />
              <input value={form.longitude} onChange={e => set('longitude', e.target.value)}
                style={INPUT_S} placeholder="経度 例: 130.4208" type="number" step="0.000001" />
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
              ※ Google Maps でスポットを右クリック→座標をコピー
            </div>
          </div>

          <label>
            <span style={LABEL_S}>昼夜タイプ ★</span>
            <select value={form.time_type} onChange={e => set('time_type', e.target.value)} style={INPUT_S}>
              {TIME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <label>
            <span style={LABEL_S}>カテゴリ</span>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={INPUT_S}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              キャンセル
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '11px', background: saving ? '#94a3b8' : '#065f46', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '処理中...' : '✅ 承認してスポットに追加'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── メインコンポーネント ───────────────────────────────────────────
export default function SpotRequests() {
  const navigate = useNavigate()
  const { session, signOut } = useAuth()

  const [requests, setRequests]           = useState([])
  const [activeTab, setActiveTab]         = useState('pending')
  const [loading, setLoading]             = useState(true)
  const [toast, setToast]                 = useState(null)
  const [approvingRequest, setApprovingRequest] = useState(null)
  const [pendingCount, setPendingCount]   = useState(0)

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // 未処理件数取得（バッジ用）
  const fetchPendingCount = useCallback(async () => {
    const { count } = await supabase
      .from('spot_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingCount(count || 0)
  }, [])

  // リスト取得
  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('spot_requests')
      .select('*')
      .eq('status', activeTab)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('error', `取得エラー: ${error.message}`)
    } else {
      setRequests(data || [])
    }
    setLoading(false)
  }, [activeTab, showToast])

  useEffect(() => { fetchPendingCount() }, [fetchPendingCount])
  useEffect(() => { fetchRequests() }, [fetchRequests])

  // 却下
  const handleReject = async (req) => {
    if (!window.confirm(`「${req.spot_name}」のリクエストを却下しますか？`)) return

    const { error } = await supabase
      .from('spot_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id)

    if (error) {
      showToast('error', `却下に失敗しました: ${error.message}`)
    } else {
      showToast('success', 'リクエストを却下しました')
      setRequests(prev => prev.filter(r => r.id !== req.id))
      fetchPendingCount()
    }
  }

  // 承認完了コールバック
  const handleApproved = (approvedId) => {
    setApprovingRequest(null)
    setRequests(prev => prev.filter(r => r.id !== approvedId))
    fetchPendingCount()
  }

  const activeTabInfo = STATUS_TABS.find(t => t.value === activeTab)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

      {/* ヘッダー */}
      <header style={{
        background: '#1a2744', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }}>
            ← ダッシュボード
          </button>
          <span style={{ color: '#334155', fontSize: 13 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>📬 スポットリクエスト</h1>
            {pendingCount > 0 && (
              <span style={{
                background: '#f59e0b', color: '#fff', borderRadius: 99,
                fontSize: 10, fontWeight: 800, padding: '1px 6px',
                minWidth: 18, textAlign: 'center', lineHeight: '16px',
              }}>
                {pendingCount}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{session?.user?.email}</span>
          <button onClick={signOut}
            style={{ padding: '5px 14px', background: 'transparent', border: '1.5px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
            ログアウト
          </button>
        </div>
      </header>

      {/* ステータスタブ */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1.5px solid ${activeTab === tab.value ? tab.border : '#e2e8f0'}`,
              background: activeTab === tab.value ? tab.bg : '#f8fafc',
              color: activeTab === tab.value ? tab.color : '#94a3b8',
            }}>
            {tab.label}
            {tab.value === 'pending' && pendingCount > 0 && (
              <span style={{
                marginLeft: 6, background: '#f59e0b', color: '#fff',
                borderRadius: 99, fontSize: 10, fontWeight: 800,
                padding: '0 5px', lineHeight: '16px',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {loading ? '読み込み中...' : `${requests.length}件`}
          </span>
          <button onClick={fetchRequests}
            style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ↻ 更新
          </button>
        </div>
      </div>

      {/* リスト本体 */}
      <div style={{ flex: 1, padding: '24px 28px' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>読み込み中...</div>
        ) : requests.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
            {activeTab === 'pending'
              ? '未処理のリクエストはありません ✓'
              : `${activeTabInfo?.label}のリクエストはありません`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 860 }}>
            {requests.map(req => (
              <div key={req.id} style={{
                background: '#fff',
                border: `1.5px solid ${activeTab === 'pending' ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: 12, padding: '18px 20px',
                display: 'flex', gap: 16, alignItems: 'flex-start',
              }}>
                {/* サムネイル */}
                <div style={{ flexShrink: 0 }}>
                  {req.image_url ? (
                    <img src={req.image_url} alt=""
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <div style={{
                      width: 72, height: 72, background: '#f1f5f9', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
                    }}>
                      {req.stamp_type || '📍'}
                    </div>
                  )}
                </div>

                {/* 情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1a2744' }}>
                      {req.spot_name}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 8px',
                      background: activeTabInfo?.bg,
                      color: activeTabInfo?.color,
                      border: `1px solid ${activeTabInfo?.border}`,
                    }}>
                      {activeTabInfo?.label}
                    </span>
                  </div>

                  {req.comment && (
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 8 }}>
                      💬 {req.comment}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {req.stamp_type && (
                      <span style={{ fontSize: 13 }}>{req.stamp_type}</span>
                    )}
                    {req.companion && req.companion !== 'unknown' && (
                      <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 7px' }}>
                        👥 {COMPANION_LABELS[req.companion] || req.companion}
                      </span>
                    )}
                    {req.nationality && req.nationality !== 'unknown' && (
                      <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 7px' }}>
                        {NAT_FLAGS[req.nationality] || '🌐'} {req.nationality.toUpperCase()}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>

                {/* アクションボタン（未処理のみ） */}
                {activeTab === 'pending' && (
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => setApprovingRequest(req)}
                      style={{
                        padding: '8px 14px', background: '#065f46', color: '#fff',
                        border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                      ✅ 承認・追加
                    </button>
                    <button onClick={() => handleReject(req)}
                      style={{
                        padding: '8px 14px', background: 'transparent', color: '#dc2626',
                        border: '1.5px solid #fca5a5', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                      ❌ 却下
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 承認モーダル */}
      {approvingRequest && (
        <ApprovalModal
          request={approvingRequest}
          onClose={() => setApprovingRequest(null)}
          onApproved={handleApproved}
          showToast={showToast}
        />
      )}

      {/* トースト */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#fff', borderRadius: 8, padding: '12px 24px',
          fontSize: 14, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          zIndex: 9999, whiteSpace: 'nowrap',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </div>
  )
}
