-- ================================================================
-- Supabase Storage: promotion-images バケット作成
-- ================================================================
-- Supabase Dashboard > SQL Editor で実行してください
-- ================================================================

-- 1. バケット作成（public: true = 画像URLを認証なしで表示可能）
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotion-images', 'promotion-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 認証済みスタッフがアップロード可能
CREATE POLICY IF NOT EXISTS "promotion-images: staff upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'promotion-images');

-- 3. 全員（ゲスト含む）が画像を閲覧可能（公開URL）
CREATE POLICY IF NOT EXISTS "promotion-images: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'promotion-images');

-- 4. 認証済みスタッフが削除可能
CREATE POLICY IF NOT EXISTS "promotion-images: staff delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'promotion-images');

-- 5. 認証済みスタッフが更新可能
CREATE POLICY IF NOT EXISTS "promotion-images: staff update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'promotion-images');

-- ================================================================
-- 確認クエリ:
--   SELECT id, name, public FROM storage.buckets WHERE id = 'promotion-images';
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects'
--     AND policyname LIKE 'promotion%';
-- ================================================================
