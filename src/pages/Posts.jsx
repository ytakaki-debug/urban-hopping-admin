import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const COMPANION_LABELS = {
  solo_f: '女性・ソロ', solo_m: '男性・ソロ',
  couple: 'カップル', friends: '友人', family: 'ファミリー',
}

const NAT_FLAGS = {
  jp: '🇯🇵', kr: '🇰🇷', tw: '🇹🇼', cn: '🇨🇳', us: '🇺🇸',
  gb: '🇬🇧', au: '🇦🇺', asia: '🌏', west: '🌍', other: '🌐',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Posts() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, signOut } = useAuth()

  const [posts, setPosts] = useState([])
  const [spots, setSpots] = useState([])
  const [filterSpotId, setFilterSpotId] = useState(searchParams.get('spot_id') || '')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // スポット一覧（フィルター用）
  useEffect(() => {
    supabase
      .from('spots')
      .select('id, title_ja')
      .eq('is_deleted', false)
      .order('title_ja')
      .then(({ data }) => { if (data) setSpots(data) })
  }, [])

  // 投稿一覧取得
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select('id, spot_id, comment, stamp_type, image_url, companion, nationality, created_at, spots(title_ja)')
      .order('created_at', { ascending: false })

    if (filterSpotId) query = query.eq('spot_id', filterSpotId)

    const { data, error } = await query
    if (error) {
      showToast('error', `取得エラー: ${error.message}`)
    } else if (data) {
      setPosts(data)
    }
    setLoading(false)
  }, [filterSpotId, showToast])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // 削除処理
  const handleDelete = async (post) => {
    const confirmed = window.confirm(
      'この投稿を削除しますか？\nこの操作は取り消せません。'
    )
    if (!confirmed) return

    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      showToast('error', `削除に失敗しました: ${error.message}`)
    } else {
      showToast('success', '投稿を削除しました')
      setPosts(prev => prev.filter(p => p.id !== post.id))
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

      {/* ヘッダー */}
      <header style={{
        background: '#1a2744', padding: '0 28px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }}
          >
            ← ダッシュボード
          </button>
          <span style={{ color: '#334155', fontSize: 13 }}>|</span>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>💬 ポスト管理</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{session?.user?.email}</span>
          <button
            onClick={signOut}
            style={{ padding: '5px 14px', background: 'transparent', border: '1.5px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* フィルターバー */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
          対象スポットで絞り込む:
        </div>
        <select
          value={filterSpotId}
          onChange={e => setFilterSpotId(e.target.value)}
          style={{
            padding: '7px 12px', border: '1.5px solid #e2e8f0', borderRadius: 7,
            fontSize: 13, outline: 'none', background: '#fff', minWidth: 240,
          }}
        >
          <option value="">すべてのスポット</option>
          {spots.map(s => (
            <option key={s.id} value={s.id}>{s.title_ja}</option>
          ))}
        </select>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {loading ? '読み込み中...' : `${posts.length}件`}
        </div>
        <button
          onClick={fetchPosts}
          style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ↻ 更新
        </button>
      </div>

      {/* 投稿一覧 */}
      <div style={{ flex: 1, padding: '24px 28px' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>読み込み中...</div>
        ) : posts.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
            {filterSpotId ? '選択したスポットの投稿はありません' : '投稿がありません'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900 }}>
            {posts.map(post => (
              <div
                key={post.id}
                style={{
                  background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10,
                  padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-start',
                }}
              >
                {/* メタ情報＋内容 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* スポット名・日時 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      background: '#eff6ff', color: '#1d4ed8',
                      borderRadius: 4, padding: '2px 9px',
                    }}>
                      📍 {post.spots?.title_ja || '不明なスポット'}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {formatDate(post.created_at)}
                    </span>
                  </div>

                  {/* 投稿内容 */}
                  <div style={{ fontSize: 13, color: '#1a2744', lineHeight: 1.65 }}>
                    {post.stamp_type && (
                      <span style={{ fontSize: 18, marginRight: 6 }}>{post.stamp_type}</span>
                    )}
                    {post.comment
                      ? post.comment
                      : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>（テキストなし）</span>
                    }
                  </div>

                  {/* 添付画像 */}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6, marginTop: 8, display: 'block' }}
                    />
                  )}

                  {/* 属性バッジ */}
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {post.companion && post.companion !== 'unknown' && (
                      <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 7px' }}>
                        👥 {COMPANION_LABELS[post.companion] || post.companion}
                      </span>
                    )}
                    {post.nationality && post.nationality !== 'unknown' && (
                      <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 7px' }}>
                        {NAT_FLAGS[post.nationality] || '🌐'} {post.nationality.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 削除ボタン */}
                <button
                  onClick={() => handleDelete(post)}
                  style={{
                    flexShrink: 0, padding: '7px 14px',
                    background: 'transparent', color: '#dc2626',
                    border: '1.5px solid #fca5a5', borderRadius: 7,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🗑 削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
