import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LANGS = [
  { key: 'ja',    label: '日本語' },
  { key: 'en',    label: 'English' },
  { key: 'ko',    label: '한국어' },
  { key: 'zh_tw', label: '繁體中文' },
  { key: 'zh_cn', label: '简体中文' },
]

const BLANK_FORM = {
  title_ja: '', title_en: '', title_ko: '', title_zh_tw: '', title_zh_cn: '',
  image_url: '', link_url: '', is_active: true,
}

const INPUT_S = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13,
  outline: 'none', background: '#fff', fontFamily: 'inherit',
}

function Toggle({ checked, onChange }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div
        onClick={onChange}
        style={{
          position: 'relative', width: 44, height: 24, borderRadius: 12,
          background: checked ? '#059669' : '#e2e8f0',
          transition: 'background .2s', flexShrink: 0, cursor: 'pointer',
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20,
          background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left .2s',
        }} />
      </div>
    </label>
  )
}

function AddModal({ onClose, onAdded, showToast }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [activeLang, setActiveLang] = useState('ja')
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title_ja.trim()) { showToast('error', '日本語タイトルは必須です'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.from('promotions').insert({
        title_ja:    form.title_ja.trim(),
        title_en:    form.title_en.trim()    || null,
        title_ko:    form.title_ko.trim()    || null,
        title_zh_tw: form.title_zh_tw.trim() || null,
        title_zh_cn: form.title_zh_cn.trim() || null,
        image_url:   form.image_url.trim()   || null,
        link_url:    form.link_url.trim()    || null,
        is_active:   form.is_active,
      }).select().single()
      if (error) throw error
      showToast('success', `「${form.title_ja}」を登録しました！`)
      onAdded(data)
    } catch (err) {
      showToast('error', `[DB] ${err.message}`)
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
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2744' }}>📢 プロモーションを追加</div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>
            ×
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* タイトル（言語タブ） */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
              タイトル <span style={{ color: '#ef4444' }}>*</span>（日本語は必須）
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {LANGS.map(l => (
                <button key={l.key} type="button" onClick={() => setActiveLang(l.key)}
                  style={{
                    flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: activeLang === l.key ? '#1a2744' : '#f1f5f9',
                    color: activeLang === l.key ? '#fff' : '#64748b',
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
            <input
              value={form[`title_${activeLang}`]}
              onChange={e => set(`title_${activeLang}`, e.target.value)}
              placeholder={activeLang === 'ja' ? '例: 夏のビール割引キャンペーン' : 'e.g. Summer Beer Campaign'}
              style={INPUT_S}
            />
          </div>

          {/* 画像URL */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>バナー画像URL</div>
            <input
              value={form.image_url}
              onChange={e => { set('image_url', e.target.value); setImgError(false) }}
              placeholder="https://example.com/banner.jpg"
              style={{ ...INPUT_S, marginBottom: form.image_url && !imgError ? 8 : 0 }}
            />
            {form.image_url && !imgError && (
              <img
                src={form.image_url}
                alt="preview"
                style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, display: 'block', border: '1px solid #e2e8f0' }}
                onError={() => setImgError(true)}
              />
            )}
            {form.image_url && imgError && (
              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>画像を読み込めませんでした。URLを確認してください。</div>
            )}
          </div>

          {/* リンクURL */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>リンク先URL</div>
            <input
              value={form.link_url}
              onChange={e => set('link_url', e.target.value)}
              placeholder="https://example.com/campaign"
              style={INPUT_S}
            />
          </div>

          {/* is_active */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle checked={form.is_active} onChange={() => set('is_active', !form.is_active)} />
            <span style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? '#059669' : '#94a3b8' }}>
              {form.is_active ? '公開状態で登録する' : '非公開で登録する'}
            </span>
          </div>

          {/* ボタン */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              キャンセル
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 2, padding: '11px', background: saving ? '#94a3b8' : '#1a2744', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '登録中...' : '📢 プロモーションを登録'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Promotions() {
  const navigate             = useNavigate()
  const { session, signOut } = useAuth()

  const [promotions, setPromotions]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [toast, setToast]             = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      showToast('error', `取得エラー: ${error.message}`)
      setPromotions([])
    } else {
      setPromotions(data || [])
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  const handleToggleActive = async (promo) => {
    const newVal = !promo.is_active
    const { error } = await supabase
      .from('promotions')
      .update({ is_active: newVal })
      .eq('id', promo.id)
    if (error) {
      showToast('error', `更新エラー: ${error.message}`)
    } else {
      showToast('success', `「${promo.title_ja}」を${newVal ? '公開' : '非公開'}にしました`)
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: newVal } : p))
    }
  }

  const handleDelete = async (promo) => {
    if (!window.confirm(`「${promo.title_ja}」を削除しますか？\nこの操作は取り消せません。`)) return
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promo.id)
    if (error) {
      showToast('error', `削除エラー: ${error.message}`)
    } else {
      showToast('success', `「${promo.title_ja}」を削除しました`)
      setPromotions(prev => prev.filter(p => p.id !== promo.id))
    }
  }

  const handleAdded = (newPromo) => {
    setShowAddModal(false)
    setPromotions(prev => [newPromo, ...prev])
  }

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
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>📢 プロモーション管理</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{session?.user?.email}</span>
          <button onClick={signOut}
            style={{ padding: '5px 14px', background: 'transparent', border: '1.5px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
            ログアウト
          </button>
        </div>
      </header>

      {/* ツールバー */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {loading ? '読み込み中...' : `${promotions.length}件のプロモーション`}
          </span>
          <button onClick={fetchPromotions}
            style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            ↻ 更新
          </button>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '9px 18px', background: '#1a2744', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
          ＋ バナーを追加
        </button>
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, padding: '24px 28px' }}>
        {loading ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>読み込み中...</div>
        ) : promotions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>プロモーションがありません</div>
            <div style={{ fontSize: 12 }}>「バナーを追加」ボタンから最初のプロモーションを登録してください</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
            {promotions.map(promo => (
              <div key={promo.id} style={{
                background: '#fff',
                border: `1.5px solid ${promo.is_active ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 12, overflow: 'hidden',
                display: 'flex',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                opacity: promo.is_active ? 1 : 0.7,
                transition: 'opacity .2s, border-color .2s',
              }}>
                {/* サムネイル */}
                <div style={{
                  width: 200, flexShrink: 0, background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', minHeight: 120,
                }}>
                  {promo.image_url ? (
                    <img
                      src={promo.image_url}
                      alt={promo.title_ja || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 120, filter: promo.is_active ? 'none' : 'grayscale(60%)' }}
                    />
                  ) : (
                    <div style={{ fontSize: 32, color: '#cbd5e1' }}>🖼</div>
                  )}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: promo.is_active ? '#059669' : '#94a3b8',
                    color: '#fff', borderRadius: 4, padding: '2px 8px',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                  }}>
                    {promo.is_active ? '公開中' : '非公開'}
                  </div>
                </div>

                {/* 情報 */}
                <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, minWidth: 0 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 6 }}>
                      {promo.title_ja || '（タイトルなし）'}
                    </div>
                    {promo.link_url && (
                      <div style={{ fontSize: 12, color: '#3b82f6', wordBreak: 'break-all', lineHeight: 1.5 }}>
                        🔗 {promo.link_url}
                      </div>
                    )}
                    {!promo.link_url && (
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>リンクURL未設定</div>
                    )}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                      登録: {formatDate(promo.created_at)}
                    </div>
                  </div>

                  {/* アクション */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleToggleActive(promo)}
                      style={{
                        padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', border: '1.5px solid',
                        background: promo.is_active ? '#f0fdf4' : '#f8fafc',
                        color: promo.is_active ? '#059669' : '#64748b',
                        borderColor: promo.is_active ? '#bbf7d0' : '#e2e8f0',
                        whiteSpace: 'nowrap',
                      }}>
                      {promo.is_active ? '✓ 公開中 → 非公開にする' : '○ 非公開 → 公開する'}
                    </button>

                    <button
                      onClick={() => handleDelete(promo)}
                      style={{
                        padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', background: 'transparent',
                        color: '#dc2626', border: '1.5px solid #fca5a5',
                        whiteSpace: 'nowrap',
                      }}>
                      🗑 削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 追加モーダル */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
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
