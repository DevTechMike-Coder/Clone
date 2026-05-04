-- Create buckets
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true),
       ('posts', 'posts', true)
on conflict (id) do nothing;

-- Set up RLS policies for 'avatars' bucket
create policy "Avatar images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Set up RLS policies for 'posts' bucket
create policy "Post images are publicly accessible"
on storage.objects for select
using ( bucket_id = 'posts' );

create policy "Users can upload their own posts"
on storage.objects for insert
with check (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own posts"
on storage.objects for update
using (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own posts"
on storage.objects for delete
using (
  bucket_id = 'posts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
