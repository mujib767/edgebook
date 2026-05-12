
-- Lock down SECURITY DEFINER trigger functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
