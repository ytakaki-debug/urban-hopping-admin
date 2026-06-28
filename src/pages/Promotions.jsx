import { useState, useEffect, useCallback, useRef } from 'react'
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
const LANG_I18N = { ja: 'JP', en: 'EN', ko: 'KR', zh_tw: 'TW', zh_cn: 'CN' }

const PRESET_COLORS = [
  '#1a2744', '#d97706', '#059669', '#dc2626',
  '#7c3aed', '#0ea5e9', '#f59e0b', '#374151',
]

const BLANK_FORM = {
  title_ja: '', title_en: '', title_ko: '', title_zh_tw: '', title_zh_cn: '',
  link_url: '', is_active: true,
  tag: '', price: '', accent: '#1a2744',
  catch_ja: '', catch_en: '', catch_ko: '', catch_zh_tw: '', catch_zh_cn: '',
  desc_ja:  '', desc_en:  '', desc_ko:  '', desc_zh_tw:  '', desc_zh_cn:  '',
  cta_ja:   '', cta_en:   '', cta_ko:   '', cta_zh_tw:   '', cta_zh_cn:   '',
}

const INPUT_S = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13,
  outline: 'none', background: '#fff', fontFamily: 'inherit',
}

function promoToForm(p) {
  const i18n = p.extra_data?.i18n || {}
  const f = {
    title_ja:    p.title_ja    || '',
    title_en:    p.title_en    || '',
    title_ko:    p.title_ko    || '',
    title_zh_tw: p.title_zh_tw || '',
    title_zh_cn: p.title_zh_cn || '',
    link_url:    p.link_url    || '',
    is_active:   p.is_active   ?? true,
    tag:         p.extra_data?.tag    || '',
    price:       p.extra_data?.price  || '',
    accent:      p.extra_data?.accent || '#1a2744',
  }
  LANGS.forEach(({ key }) => {
    const k = LANG_I18N[key]
    f[`catch_${key}`] = i18n[k]?.catch       || ''
    f[`desc_${key}`]  = i18n[k]?.description || ''
    f[`cta_${key}`]   = i18n[k]?.cta_text    || ''
  })
  return f
}

function formToExtraData(form) {
  const i18n = {}
  LANGS.forEach(({ key }) => {
    const k = LANG_I18N[key]
    i18n[k] = {
      shortTitle:  form[`title_${key}`]  || form.title_ja || '',
      catch:       form[`catch_${key}`]  || '',
      description: form[`desc_${key}`]   || '',
      cta_text:    form[`cta_${key}`]    || '',
    }
  })
  return {
    accent: form.accent        || '#1a2744',
    price:  form.price.trim()  || null,
    tag:    form.tag.trim()    || null,
    i18n,
  }
}

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{
      position: 'relative', width: 44, height: 24, borderRadius: 12,
      background: checked ? '#059669' : '#e2e8f0',
      transition: 'background .2s', flexShrink: 0, cursor: 'pointer',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20,
        background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left .2s',
      }} />
    </div>
  )
}

function ImageDropzone({ imgFile, imgPreview, onFileSelect, onClear }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    onFileSelect(file)
  }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>バナー画像</div>
      {imgPreview ? (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
          <img src={imgPreview} alt="preview"
            style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.92)', border: 'none',
                borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#1a2744' }}>
              変更する
            </button>
            <button type="button" onClick={onClear}
              style={{ padding: '5px 10px', background: 'rgba(220,38,38,0.88)', border: 'none',
                borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
              削除
            </button>
          </div>
          {imgFile && (
            <div style={{ position: 'absolute', bottom: 8, left: 8,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
              {imgFile.name}
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#3b82f6' : '#e2e8f0'}`,
            borderRadius: 10, padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
            background: isDragging ? '#eff6ff' : '#f8fafc',
            transition: 'border-color .15s, background .15s',
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 6 }}>🖼</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: isDragging ? '#3b82f6' : '#374151', marginBottom: 4 }}>
            {isDragging ? 'ここにドロップ！' : 'クリックして画像を選択'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>またはドラッグ＆ドロップ（JPG・PNG・WebP 等）</div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}

function PromoModal({ editingPromo, onClose, onSaved, showToast }) {
  const isEdit = !!editingPromo
  const [form, setForm]             = useState(isEdit ? promoToForm(editingPromo) : { ...BLANK_FORM })
  const [activeLang, setActiveLang] = useState('ja')
  const [activeTab, setActiveTab]   = useState('basic')
  const [saving, setSaving]         = useState(false)
  const [imgFile, setImgFile]       = useState(null)
  const [imgPreview, setImgPreview] = useState(isEdit ? (editingPromo?.image_url || null) : null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFileSelect = (file) => {
    if (imgPreview?.startsWith('blob:')) URL.revokeObjectURL(imgPreview)
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }
  const handleClearImage = () => {
    if (imgPreview?.startsWith('blob:')) URL.revokeObjectURL(imgPreview)
    setImgFile(null)
    setImgPreview(null)
  }

  const handleSubmit = async () => {
    if (!form.title_ja.trim()) { showToast('error', '日本語タイトルは必須です'); return }
    setSaving(true)
    try {
      let image_url = imgFile ? null : imgPreview
      if (imgFile) {
        const ext  = imgFile.name.split('.').pop().toLowerCase()
        const path = `promotions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data: sd, error: se } = await supabase.storage
          .from('promotion-images')
          .upload(path, imgFile, { cacheControl: '3600', upsert: false })
        if (se) throw new Error(`[Storage] ${se.message}`)
        const { data: { publicUrl } } = supabase.storage.from('promotion-images').getPublicUrl(sd.path)
        image_url = publicUrl
      }

      const payload = {
        title_ja:    form.title_ja.trim(),
        title_en:    form.title_en.trim()    || null,
        title_ko:    form.title_ko.trim()    || null,
        title_zh_tw: form.title_zh_tw.trim() || null,
        title_zh_cn: form.title_zh_cn.trim() || null,
        image_url,
        link_url:    form.link_url.trim()  || null,
        is_active:   form.is_active,
        extra_data:  formToExtraData(form),
      }

      let data, error
      if (isEdit) {
        ;({ data, error } = await supabase.from('promotions').update(payload).eq('id', editingPromo.id).select().single())
      } else {
        ;({ data, error } = await supabase.from('promotions').insert(payload).select().single())
      }
      if (error) throw error

      showToast('success', isEdit ? `「${form.title_ja}」を更新しました！` : `「${form.title_ja}」を登録しました！`)
      onSaved(data, isEdit)
    } catch (err) {
      showToast('error', err.message)
      setSaving(false)
    }
  }

  const tabSty = (id) => ({
    flex: 1, padding: '8px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
    borderRadius: 7,
    background: activeTab === id ? '#1a2744' : '#f1f5f9',
    color:      activeTab === id ? '#fff'    : '#64748b',
    transition: 'background .15s',
  })
  const langSty = (key) => ({
    flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 700,
    background: activeLang === key ? '#1a2744' : '#f1f5f9',
    color:      activeLang === key ? '#fff'    : '#64748b',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>

        {/* ヘッダー */}
        <div style={{ padding: '18px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2744' }}>
            {isEdit ? '✏️ プロモーションを編集' : '📢 プロモーションを追加'}
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* タブ */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: 6, flexShrink: 0 }}>
          <button style={tabSty('basic')}   onClick={() => setActiveTab('basic')}>📝 基本情報</button>
          <button style={tabSty('content')} onClick={() => setActiveTab('content')}>🎨 広告コンテンツ</button>
        </div>

        {/* スクロールエリア */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {activeTab === 'basic' && (<>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                タイトル <span style={{ color: '#ef4444' }}>*</span>（日本語必須）
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {LANGS.map(l => <button key={l.key} type="button" onClick={() => setActiveLang(l.key)} style={langSty(l.key)}>{l.label}</button>)}
              </div>
              <input
                value={form[`title_${activeLang}`]}
                onChange={e => set(`title_${activeLang}`, e.target.value)}
                placeholder={activeLang === 'ja' ? '例: 夏のビール割引キャンペーン' : 'e.g. Summer Beer Campaign'}
                style={INPUT_S}
              />
            </div>

            <ImageDropzone imgFile={imgFile} imgPreview={imgPreview} onFileSelect={handleFileSelect} onClear={handleClearImage} />

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>リンク先URL（任意）</div>
              <input value={form.link_url} onChange={e => set('link_url', e.target.value)}
                placeholder="https://example.com/campaign" style={INPUT_S} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle checked={form.is_active} onChange={() => set('is_active', !form.is_active)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? '#059669' : '#94a3b8' }}>
                {form.is_active ? '公開状態で登録する' : '非公開で登録する'}
              </span>
            </div>
          </>)}

          {activeTab === 'content' && (<>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  タグ <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>例: ROOM AMENITY</span>
                </div>
                <input value={form.tag} onChange={e => set('tag', e.target.value)}
                  placeholder="IN-HOTEL SHOP" style={INPUT_S} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  価格ラベル <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>例: ¥700 / FREE</span>
                </div>
                <input value={form.price} onChange={e => set('price', e.target.value)}
                  placeholder="¥1,000/day" style={INPUT_S} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>アクセントカラー</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input type="color" value={form.accent} onChange={e => set('accent', e.target.value)}
                  title="カスタムカラーを選択"
                  style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 7,
                    cursor: 'pointer', padding: 2, flexShrink: 0 }} />
                {PRESET_COLORS.map(c => (
                  <div key={c} onClick={() => set('accent', c)} title={c}
                    style={{
                      width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer',
                      boxShadow: form.accent === c
                        ? `0 0 0 2px #fff, 0 0 0 4px ${c}`
                        : '0 1px 3px rgba(0,0,0,0.15)',
                      transition: 'box-shadow .1s',
                    }} />
                ))}
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{form.accent}</span>
              </div>
              <div style={{ marginTop: 8, padding: '7px 14px', background: form.accent,
                color: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                このカラーで表示されます
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1.5px solid #f1f5f9', margin: '2px 0' }} />

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                テキストコンテンツ（言語別）
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {LANGS.map(l => <button key={l.key} type="button" onClick={() => setActiveLang(l.key)} style={langSty(l.key)}>{l.label}</button>)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    キャッチコピー
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>タイトル下の太字テキスト</span>
                  </div>
                  <input
                    value={form[`catch_${activeLang}`]}
                    onChange={e => set(`catch_${activeLang}`, e.target.value)}
                    placeholder="例: お部屋でゆっくり、福岡の一杯を。"
                    style={INPUT_S}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    詳細説明
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>メイン本文（\n で改行可）</span>
                  </div>
                  <textarea
                    value={form[`desc_${activeLang}`]}
                    onChange={e => set(`desc_${activeLang}`, e.target.value)}
                    placeholder={'詳細説明を入力…\n\n例:\n【ご利用にあたって】\n※お支払いは現金のみ'}
                    style={{ ...INPUT_S, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    CTAボタンのテキスト
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400, marginLeft: 6 }}>右下のボタン文字</span>
                  </div>
                  <input
                    value={form[`cta_${activeLang}`]}
                    onChange={e => set(`cta_${activeLang}`, e.target.value)}
                    placeholder="例: フロントで確認する"
                    style={INPUT_S}
                  />
                </div>
              </div>
            </div>
          </>)}
        </div>

        {/* フッター */}
        <div style={{ padding: '12px 24px 20px', flexShrink: 0, display: 'flex', gap: 8,
          borderTop: '1px solid #f1f5f9' }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#64748b',
              border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            キャンセル
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex: 2, padding: '11px',
              background: saving ? '#94a3b8' : '#1a2744', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving
              ? (imgFile ? '画像をアップロード中...' : (isEdit ? '更新中...' : '登録中...'))
              : (isEdit ? '✏️ 更新する' : '📢 登録する')}
          </button>
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

  const [promotions, setPromotions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)
  const [modalPromo, setModalPromo] = useState(null)

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('promotions').select('*').order('created_at', { ascending: false })
    if (error) { showToast('error', `取得エラー: ${error.message}`); setPromotions([]) }
    else        { setPromotions(data || []) }
    setLoading(false)
  }, [showToast])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  const handleToggleActive = async (promo) => {
    const newVal = !promo.is_active
    const { error } = await supabase.from('promotions').update({ is_active: newVal }).eq('id', promo.id)
    if (error) { showToast('error', `更新エラー: ${error.message}`) }
    else {
      showToast('success', `「${promo.title_ja}」を${newVal ? '公開' : '非公開'}にしました`)
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: newVal } : p))
    }
  }

  const handleDelete = async (promo) => {
    if (!window.confirm(`「${promo.title_ja}」を削除しますか？\nこの操作は取り消せません。`)) return
    const { error } = await supabase.from('promotions').delete().eq('id', promo.id)
    if (error) { showToast('error', `削除エラー: ${error.message}`) }
    else {
      showToast('success', `「${promo.title_ja}」を削除しました`)
      setPromotions(prev => prev.filter(p => p.id !== promo.id))
    }
  }

  const handleSaved = (promo, isEdit) => {
    setModalPromo(null)
    setPromotions(prev => isEdit
      ? prev.map(p => p.id === promo.id ? promo : p)
      : [promo, ...prev]
    )
  }

  const editingPromo = (modalPromo === 'new' || modalPromo === null) ? null : modalPromo

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>

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
        <button onClick={() => setModalPromo('new')}
          style={{ padding: '9px 18px', background: '#1a2744', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ＋ バナーを追加
        </button>
      </div>

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
            {promotions.map(promo => {
              const accent = promo.extra_data?.accent || '#1a2744'
              return (
                <div key={promo.id} style={{
                  background: '#fff',
                  border: `1.5px solid ${promo.is_active ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 12, overflow: 'hidden', display: 'flex',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  opacity: promo.is_active ? 1 : 0.7,
                  transition: 'opacity .2s, border-color .2s',
                }}>
                  <div style={{
                    width: 200, flexShrink: 0, background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', minHeight: 120,
                  }}>
                    {promo.image_url ? (
                      <img src={promo.image_url} alt={promo.title_ja || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 120,
                          filter: promo.is_active ? 'none' : 'grayscale(60%)' }} />
                    ) : (
                      <div style={{ fontSize: 32, color: '#cbd5e1' }}>🖼</div>
                    )}
                    <div style={{ position: 'absolute', top: 8, left: 8,
                      background: promo.is_active ? '#059669' : '#94a3b8',
                      color: '#fff', borderRadius: 4, padding: '2px 8px',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
                      {promo.is_active ? '公開中' : '非公開'}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: accent }} />
                  </div>

                  <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2744' }}>
                          {promo.title_ja || '（タイトルなし）'}
                        </span>
                        {promo.extra_data?.tag && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.08em',
                            color: accent, border: `1px solid ${accent}`,
                            borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap',
                          }}>
                            {promo.extra_data.tag}
                          </span>
                        )}
                        {promo.extra_data?.price && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                            {promo.extra_data.price}
                          </span>
                        )}
                      </div>
                      {promo.extra_data?.i18n?.JP?.catch && (
                        <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, marginBottom: 4 }}>
                          {promo.extra_data.i18n.JP.catch}
                        </div>
                      )}
                      {promo.extra_data?.i18n?.JP?.description && (
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {promo.extra_data.i18n.JP.description}
                        </div>
                      )}
                      {promo.link_url ? (
                        <div style={{ fontSize: 11, color: '#3b82f6', wordBreak: 'break-all', marginTop: 4 }}>
                          🔗 {promo.link_url}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 4 }}>リンクURL未設定</div>
                      )}
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                        登録: {formatDate(promo.created_at)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => handleToggleActive(promo)}
                        style={{
                          padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', border: '1.5px solid',
                          background:  promo.is_active ? '#f0fdf4' : '#f8fafc',
                          color:       promo.is_active ? '#059669' : '#64748b',
                          borderColor: promo.is_active ? '#bbf7d0' : '#e2e8f0', whiteSpace: 'nowrap',
                        }}>
                        {promo.is_active ? '✓ 公開中 → 非公開' : '○ 非公開 → 公開'}
                      </button>
                      <button onClick={() => setModalPromo(promo)}
                        style={{ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', background: '#eff6ff',
                          color: '#3b82f6', border: '1.5px solid #bfdbfe', whiteSpace: 'nowrap' }}>
                        ✏️ 編集
                      </button>
                      <button onClick={() => handleDelete(promo)}
                        style={{ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', background: 'transparent',
                          color: '#dc2626', border: '1.5px solid #fca5a5', whiteSpace: 'nowrap' }}>
                        🗑 削除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalPromo !== null && (
        <PromoModal
          editingPromo={editingPromo}
          onClose={() => setModalPromo(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

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
