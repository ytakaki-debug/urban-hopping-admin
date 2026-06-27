import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Vite + Leaflet のデフォルトアイコン修正
import iconUrl       from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl     from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// ── 定数 ───────────────────────────────────────────────────────────
const FUKUOKA_CENTER = [33.5902, 130.4208]

const LANGS = [
  { key: 'ja',    label: '日本語' },
  { key: 'en',    label: 'English' },
  { key: 'ko',    label: '한국어' },
  { key: 'zh_tw', label: '繁體中文' },
  { key: 'zh_cn', label: '简体中文' },
]

const CATEGORIES = [
  { value: '',           label: '── 未選択 ──' },
  { value: 'core',       label: 'コア（ホテル関連）' },
  { value: 'food',       label: 'グルメ・食事' },
  { value: 'shopping',   label: 'ショッピング' },
  { value: 'experience', label: '体験・観光' },
]

const SUB_CATEGORIES = {
  core:       [{ value: 'manager_pick',      label: 'スタッフおすすめ' }],
  food:       [{ value: 'yatai',             label: '屋台' },
               { value: 'restaurant',        label: 'レストラン' }],
  shopping:   [{ value: 'mall',              label: 'ショッピングモール' },
               { value: 'local_shop',        label: 'ローカルショップ' }],
  experience: [{ value: 'tourist_spot',      label: '観光スポット' },
               { value: 'cultural_heritage', label: '文化・神社仏閣' },
               { value: 'outdoor',           label: 'アウトドア・自然' }],
}

const TIME_TYPES = [
  { value: 'both',  label: '昼夜どちらも' },
  { value: 'day',   label: '昼のみ（Daytime）' },
  { value: 'night', label: '夜のみ（Nighttime）' },
]

const BLANK_FORM = {
  title_ja: '', title_en: '', title_ko: '', title_zh_tw: '', title_zh_cn: '',
  description_ja: '', description_en: '', description_ko: '', description_zh_tw: '', description_zh_cn: '',
  category: '', sub_category: '', time_type: 'both',
}

// ── スタイル定数 ────────────────────────────────────────────────────
const INPUT = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13,
  outline: 'none', marginBottom: 12, background: '#fff', fontFamily: 'inherit',
}

// ── Leaflet サブコンポーネント ───────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

function MapPanner({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 0.8 })
  }, [center, map])
  return null
}

// ── UI ヘルパー ────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>{children}</div>
}

function Req() {
  return <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
}

// ── メインコンポーネント ───────────────────────────────────────────
export default function Spots() {
  const navigate             = useNavigate()
  const { session, signOut } = useAuth()
  const formTopRef           = useRef(null)

  // フォーム状態
  const [activeLang, setActiveLang]   = useState('ja')
  const [pin, setPin]                 = useState(null)
  const [form, setForm]               = useState(BLANK_FORM)
  const [imgFile, setImgFile]         = useState(null)
  const [imgPreview, setImgPreview]   = useState(null)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState(null)

  // 編集・一覧状態
  const [editingSpot, setEditingSpot] = useState(null)
  const [spotList, setSpotList]       = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false) // false=有効 / true=削除済み

  // ── ユーティリティ ────────────────────────────────────────────────
  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleCategoryChange = (val) => {
    setForm(f => ({ ...f, category: val, sub_category: '' }))
  }

  const handleMapClick = useCallback((latlng) => {
    setPin({ lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6) })
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  // ── スポット一覧取得 ───────────────────────────────────────────────
  const fetchSpots = useCallback(async () => {
    setListLoading(true)
    const { data } = await supabase
      .from('spots')
      .select('id, title_ja, title_en, title_ko, title_zh_tw, title_zh_cn, description_ja, description_en, description_ko, description_zh_tw, description_zh_cn, latitude, longitude, image_url, time_type, category, sub_category, is_deleted')
      .eq('is_deleted', showDeleted)
      .order('created_at', { ascending: false })
    if (data) setSpotList(data)
    setListLoading(false)
  }, [showDeleted])

  useEffect(() => { fetchSpots() }, [fetchSpots])

  // ── タブ切り替え ──────────────────────────────────────────────────
  const handleTabSwitch = (toDeleted) => {
    setShowDeleted(toDeleted)
    setEditingSpot(null)
    setForm(BLANK_FORM)
    setPin(null)
    setImgFile(null)
    setImgPreview(null)
  }

  // ── 編集モード切り替え ────────────────────────────────────────────
  const handleEditSelect = (spot) => {
    setEditingSpot(spot)
    setPin({ lat: spot.latitude, lng: spot.longitude })
    setForm({
      title_ja:          spot.title_ja    || '',
      title_en:          spot.title_en    || '',
      title_ko:          spot.title_ko    || '',
      title_zh_tw:       spot.title_zh_tw || '',
      title_zh_cn:       spot.title_zh_cn || '',
      description_ja:    spot.description_ja    || '',
      description_en:    spot.description_en    || '',
      description_ko:    spot.description_ko    || '',
      description_zh_tw: spot.description_zh_tw || '',
      description_zh_cn: spot.description_zh_cn || '',
      category:    spot.category     || '',
      sub_category: spot.sub_category || '',
      time_type:   spot.time_type    || 'both',
    })
    setImgFile(null)
    setImgPreview(spot.image_url || null)
    setActiveLang('ja')
    formTopRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingSpot(null)
    setForm(BLANK_FORM)
    setPin(null)
    setImgFile(null)
    setImgPreview(null)
    formTopRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── 論理削除 ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!editingSpot) return
    if (!window.confirm(`「${editingSpot.title_ja}」を削除しますか？\nゲストアプリから非表示になります（取り消せます）。`)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('spots')
        .update({ is_deleted: true })
        .eq('id', editingSpot.id)
      if (error) throw error

      showToast('success', `「${editingSpot.title_ja}」を削除しました`)
      handleCancel()
      await fetchSpots()
    } catch (err) {
      showToast('error', `[DB] ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── 復活処理 ─────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!editingSpot) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('spots')
        .update({ is_deleted: false })
        .eq('id', editingSpot.id)
      if (error) throw error

      showToast('success', `「${editingSpot.title_ja}」を復活させました`)
      handleCancel()
      await fetchSpots()
    } catch (err) {
      showToast('error', `[DB] ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── フォーム送信（INSERT / UPDATE 分岐） ─────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    // 復活モードではフォーム送信を無視（ボタンは type="button"）
    if (showDeleted) return
    if (!form.title_ja.trim()) { showToast('error', '日本語タイトルは必須です'); return }
    if (!pin)                  { showToast('error', 'マップでロケーションを選択してください'); return }

    setSaving(true)
    try {
      let image_url = editingSpot?.image_url ?? null
      if (imgFile) {
        const ext  = imgFile.name.split('.').pop().toLowerCase()
        const path = `spots/${Date.now()}.${ext}`
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('spot-images')
          .upload(path, imgFile, { cacheControl: '3600', upsert: false })
        if (storageErr) {
          showToast('error', `[Storage] ${storageErr.message}`)
          setSaving(false)
          return
        }
        const { data: { publicUrl } } = supabase.storage
          .from('spot-images')
          .getPublicUrl(storageData.path)
        image_url = publicUrl
      }

      const payload = {
        latitude:          pin.lat,
        longitude:         pin.lng,
        image_url,
        time_type:         form.time_type,
        title_ja:          form.title_ja,
        title_en:          form.title_en    || null,
        title_ko:          form.title_ko    || null,
        title_zh_tw:       form.title_zh_tw || null,
        title_zh_cn:       form.title_zh_cn || null,
        description_ja:    form.description_ja    || null,
        description_en:    form.description_en    || null,
        description_ko:    form.description_ko    || null,
        description_zh_tw: form.description_zh_tw || null,
        description_zh_cn: form.description_zh_cn || null,
        category:          form.category     || null,
        sub_category:      form.sub_category || null,
      }

      const { error } = editingSpot
        ? await supabase.from('spots').update(payload).eq('id', editingSpot.id)
        : await supabase.from('spots').insert(payload)

      if (error) throw error

      showToast('success', editingSpot ? 'スポットを更新しました！' : 'スポットを登録しました！')
      handleCancel()
      await fetchSpots()
    } catch (err) {
      showToast('error', `[DB] ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const subCatOptions  = SUB_CATEGORIES[form.category] || []
  const isEditMode     = !!editingSpot
  const isRestoreMode  = isEditMode && showDeleted // 削除済みリストからの選択

  // ── レンダリング ───────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

      {/* ヘッダー */}
      <header style={{ background: '#1a2744', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 }}>
            ← ダッシュボード
          </button>
          <span style={{ color: '#334155', fontSize: 13 }}>|</span>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>📍 スポット管理</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{session?.user?.email}</span>
          <button onClick={signOut} style={{ padding: '5px 14px', background: 'transparent', border: '1.5px solid #334155', borderRadius: 6, color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>ログアウト</button>
        </div>
      </header>

      {/* 2カラム本体 */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '420px 1fr', overflow: 'hidden' }}>

        {/* ─── 左: フォーム ＋ スポット一覧 ─── */}
        <div ref={formTopRef} style={{ overflowY: 'auto', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ padding: '20px 20px 0' }}>

            {/* モードバナー */}
            {isEditMode && (
              <div style={{
                background: isRestoreMode ? '#fff7ed' : '#eff6ff',
                border: `1.5px solid ${isRestoreMode ? '#fed7aa' : '#bfdbfe'}`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isRestoreMode ? '#c2410c' : '#1e40af' }}>
                  {isRestoreMode ? '♻️ 復活モード' : '✏️ 編集モード'}：{editingSpot.title_ja}
                </div>
                <button onClick={handleCancel} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  ✕ キャンセル
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* ── タイトル・説明文（言語タブ） ── */}
              <Section title="タイトル・説明文">
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                  {LANGS.map(l => (
                    <button key={l.key} type="button" onClick={() => setActiveLang(l.key)}
                      style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: activeLang === l.key ? '#1a2744' : '#f1f5f9', color: activeLang === l.key ? '#fff' : '#64748b' }}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <Label>タイトル{activeLang === 'ja' && <Req />}</Label>
                <input
                  value={form[`title_${activeLang}`]}
                  onChange={e => setField(`title_${activeLang}`, e.target.value)}
                  readOnly={isRestoreMode}
                  placeholder={activeLang === 'ja' ? '例: 中洲屋台' : 'e.g. Nakasu Yatai'}
                  style={{ ...INPUT, background: isRestoreMode ? '#f8fafc' : '#fff' }}
                />
                <Label>説明文</Label>
                <textarea
                  value={form[`description_${activeLang}`]}
                  onChange={e => setField(`description_${activeLang}`, e.target.value)}
                  readOnly={isRestoreMode}
                  rows={4}
                  placeholder="ゲストに見せる詳細説明..."
                  style={{ ...INPUT, resize: 'vertical', marginBottom: 0, background: isRestoreMode ? '#f8fafc' : '#fff' }}
                />
              </Section>

              {/* ── 属性 ── */}
              <Section title="属性">
                <Label>昼夜タイプ <Req /></Label>
                <select value={form.time_type} onChange={e => setField('time_type', e.target.value)} disabled={isRestoreMode} style={{ ...INPUT, background: isRestoreMode ? '#f8fafc' : '#fff' }}>
                  {TIME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <Label>カテゴリ</Label>
                <select value={form.category} onChange={e => handleCategoryChange(e.target.value)} disabled={isRestoreMode} style={{ ...INPUT, background: isRestoreMode ? '#f8fafc' : '#fff' }}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {subCatOptions.length > 0 && (
                  <>
                    <Label>サブカテゴリ</Label>
                    <select value={form.sub_category} onChange={e => setField('sub_category', e.target.value)} disabled={isRestoreMode} style={{ ...INPUT, marginBottom: 0, background: isRestoreMode ? '#f8fafc' : '#fff' }}>
                      <option value="">── 未選択 ──</option>
                      {subCatOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </>
                )}
              </Section>

              {/* ── 画像 ── */}
              <Section title="画像">
                {!isRestoreMode && (
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: 13, marginBottom: imgPreview ? 10 : 0 }} />
                )}
                {imgPreview && (
                  <div style={{ position: 'relative' }}>
                    <img src={imgPreview} alt="preview" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                    {isEditMode && !imgFile && (
                      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                        {isRestoreMode ? '削除時の画像' : '現在の画像'}
                      </div>
                    )}
                    {!isRestoreMode && (
                      <button type="button" onClick={() => { setImgFile(null); setImgPreview(null) }}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>
                        削除
                      </button>
                    )}
                  </div>
                )}
                {!imgPreview && <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>画像なし</p>}
              </Section>

              {/* ── ロケーション ── */}
              <Section title="ロケーション">
                <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  {isRestoreMode ? '登録時のロケーション（読み取り専用）' : '右のマップをクリックしてピンを立ててください'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <Label>緯度 (latitude)</Label>
                    <input readOnly value={pin?.lat ?? ''} placeholder="—" style={{ ...INPUT, background: '#f8fafc', color: '#64748b', marginBottom: 0, cursor: 'default' }} />
                  </div>
                  <div>
                    <Label>経度 (longitude)</Label>
                    <input readOnly value={pin?.lng ?? ''} placeholder="—" style={{ ...INPUT, background: '#f8fafc', color: '#64748b', marginBottom: 0, cursor: 'default' }} />
                  </div>
                </div>
                {pin && !isRestoreMode && (
                  <button type="button" onClick={() => setPin(null)} style={{ marginTop: 8, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ピンをリセット
                  </button>
                )}
              </Section>

              {/* ── ボタンエリア ── */}
              {isRestoreMode ? (
                /* === 復活モード === */
                <div style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
                  <button type="button" onClick={handleCancel}
                    style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    キャンセル
                  </button>
                  <button type="button" onClick={handleRestore} disabled={saving}
                    style={{ flex: 2, padding: '13px', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94a3b8' : '#0369a1', color: '#fff' }}>
                    {saving ? '処理中...' : '↩ このスポットを復活させる'}
                  </button>
                </div>
              ) : (
                /* === 新規 / 編集モード === */
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: isEditMode ? 8 : 0 }}>
                    {isEditMode && (
                      <button type="button" onClick={handleCancel}
                        style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        キャンセル
                      </button>
                    )}
                    <button type="submit" disabled={saving}
                      style={{ flex: isEditMode ? 2 : 1, padding: '13px', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? '#94a3b8' : isEditMode ? '#065f46' : '#1a2744', color: '#fff' }}>
                      {saving ? '処理中...' : isEditMode ? 'スポットを更新する' : 'スポットを登録する'}
                    </button>
                  </div>
                  {isEditMode && (
                    <button type="button" onClick={handleDelete} disabled={saving}
                      style={{ width: '100%', padding: '10px', marginBottom: 0, background: 'transparent', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      🗑 このスポットを削除する
                    </button>
                  )}
                </>
              )}
            </form>
          </div>

          {/* ─── スポット一覧 ─── */}
          <div style={{ padding: '0 20px 32px' }}>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 16 }}>

              {/* タブ切り替え */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { label: '✅ 有効なスポット', value: false },
                  { label: '🗑 削除済み',       value: true  },
                ].map(tab => (
                  <button
                    key={String(tab.value)}
                    onClick={() => handleTabSwitch(tab.value)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 6, border: '1.5px solid',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      borderColor:  showDeleted === tab.value ? (tab.value ? '#f97316' : '#1a2744') : '#e2e8f0',
                      background:   showDeleted === tab.value ? (tab.value ? '#fff7ed' : '#eff6ff') : '#f8fafc',
                      color:        showDeleted === tab.value ? (tab.value ? '#c2410c' : '#1e40af') : '#94a3b8',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 一覧ヘッダー */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {showDeleted ? '削除済み' : '登録済み'}スポット（{spotList.length}件）
                </div>
                <button onClick={fetchSpots} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↻ 更新</button>
              </div>

              {/* リスト本体 */}
              {listLoading ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>読み込み中...</div>
              ) : spotList.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>
                  {showDeleted ? '削除済みのスポットはありません' : 'スポットはまだありません'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {spotList.map(spot => {
                    const isSelected = editingSpot?.id === spot.id
                    return (
                      <div
                        key={spot.id}
                        onClick={() => handleEditSelect(spot)}
                        style={{
                          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 10,
                          border: `1.5px solid ${isSelected ? (showDeleted ? '#f97316' : '#1d4ed8') : '#e2e8f0'}`,
                          background: isSelected ? (showDeleted ? '#fff7ed' : '#eff6ff') : showDeleted ? '#fafafa' : '#fff',
                          opacity: showDeleted ? 0.85 : 1,
                        }}
                      >
                        {spot.image_url ? (
                          <img src={spot.image_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0, filter: showDeleted ? 'grayscale(50%)' : 'none' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, background: '#f1f5f9', borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📍</div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: showDeleted ? '#94a3b8' : '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: showDeleted ? 'line-through' : 'none' }}>
                            {spot.title_ja}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {spot.category || '未分類'} · {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px', color: showDeleted ? '#c2410c' : '#1d4ed8', background: showDeleted ? '#fed7aa' : '#dbeafe' }}>
                            {showDeleted ? '復活中' : '編集中'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 右: マップ ─── */}
        <div style={{ position: 'relative' }}>
          <MapContainer center={FUKUOKA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapClickHandler onMapClick={isRestoreMode ? () => {} : handleMapClick} />
            <MapPanner center={pin ? [pin.lat, pin.lng] : null} />
            {pin && <Marker position={[pin.lat, pin.lng]} />}
          </MapContainer>

          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            background: isRestoreMode ? 'rgba(194,65,12,0.85)' : 'rgba(26,39,68,0.82)',
            backdropFilter: 'blur(4px)', color: '#fff', borderRadius: 20, padding: '6px 16px',
            fontSize: 12, fontWeight: 600, pointerEvents: 'none', zIndex: 1000, whiteSpace: 'nowrap',
          }}>
            {isRestoreMode
              ? '♻️ 復活モード（読み取り専用）'
              : pin ? `📍 ${pin.lat}, ${pin.lng}` : 'クリックでピンを設置'}
          </div>
        </div>
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
