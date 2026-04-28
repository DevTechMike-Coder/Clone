-- ============================================================
-- TABLES
-- ============================================================

create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique not null,
    full_name text,
    avatar_url text,
    bio text,
    is_private boolean default false,
    created_at timestamptz default now()
);

create table posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    media_url text not null,
    media_type text not null check (media_type in ('video', 'image')),
    thumbnail_url text,
    caption text,
    view_count int default 0,
    created_at timestamptz default now()
);

create table likes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    post_id uuid not null references posts(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_id, post_id)
);

create table bookmarks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    post_id uuid not null references posts(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_id, post_id)
);

create table reposts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    post_id uuid not null references posts(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_id, post_id)
);

create table comments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    post_id uuid not null references posts(id) on delete cascade,
    content text not null,
    created_at timestamptz default now()
);

create table follows (
    id uuid primary key default gen_random_uuid(),
    follower_id uuid not null references profiles(id) on delete cascade,
    following_id uuid not null references profiles(id) on delete cascade,
    created_at timestamptz default now(),
    unique(follower_id, following_id),
    check (follower_id != following_id)
);

create table conversations (
    id uuid primary key default gen_random_uuid(),
    is_group boolean default false,
    name text,
    created_at timestamptz default now()
);

create table conversation_participants (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    joined_at timestamptz default now(),
    unique(conversation_id, user_id)
);

create table messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    sender_id uuid not null references profiles(id) on delete cascade,
    content text,
    media_url text,
    read_at timestamptz,
    created_at timestamptz default now()
);

create table notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    from_user_id uuid references profiles(id) on delete set null,
    type text not null check (
        type in ('like', 'comment', 'follow', 'repost', 'message')
    ),
    post_id uuid references posts(id) on delete cascade,
    is_read boolean default false,
    created_at timestamptz default now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table bookmarks enable row level security;
alter table reposts enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- ============================================================
-- RLS POLICIES: PROFILES
-- ============================================================

create policy "Anyone can view public profiles" on public.profiles
    for select using (true);

create policy "Authenticated users can insert their own profiles" on public.profiles
    for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

-- ============================================================
-- RLS POLICIES: POSTS
-- ============================================================

create policy "Anyone can view posts" on public.posts
    for select using (true);

create policy "Authenticated users can insert their own posts" on public.posts
    for insert with check (auth.uid() = user_id);

create policy "Users can update own posts" on public.posts
    for update using (auth.uid() = user_id);

create policy "Users can delete own posts" on public.posts
    for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: LIKES
-- ============================================================

create policy "Anyone can view likes" on public.likes
    for select using (true);

create policy "Authenticated users can insert likes" on public.likes
    for insert with check (auth.uid() = user_id);

create policy "Users can delete own likes" on public.likes
    for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: BOOKMARKS
-- ============================================================

create policy "Anyone can view bookmarks" on public.bookmarks
    for select using (true);

create policy "Authenticated users can insert bookmarks" on public.bookmarks
    for insert with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks" on public.bookmarks
    for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: REPOSTS
-- ============================================================

create policy "Anyone can view reposts" on public.reposts
    for select using (true);

create policy "Authenticated users can insert reposts" on public.reposts
    for insert with check (auth.uid() = user_id);

create policy "Users can delete own reposts" on public.reposts
    for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: COMMENTS
-- ============================================================

create policy "Anyone can view comments" on public.comments
    for select using (true);

create policy "Authenticated users can insert comments" on public.comments
    for insert with check (auth.uid() = user_id);

create policy "Users can delete own comments" on public.comments
    for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: FOLLOWS
-- ============================================================

create policy "Anyone can view follows" on public.follows
    for select using (true);

create policy "Authenticated users can insert follows" on public.follows
    for insert with check (auth.uid() = follower_id);

create policy "Users can delete own follows" on public.follows
    for delete using (auth.uid() = follower_id);

-- ============================================================
-- RLS POLICIES: CONVERSATIONS
-- ============================================================

create policy "Participants can view conversations" on public.conversations
    for select using (
        exists (
            select 1 from conversation_participants
            where conversation_id = id and user_id = auth.uid()
        )
    );

create policy "Authenticated users can create conversations" on public.conversations
    for insert with check (auth.uid() is not null);

-- ============================================================
-- RLS POLICIES: CONVERSATION PARTICIPANTS
-- ============================================================

create policy "Participants can view conversation members" on public.conversation_participants
    for select using (auth.uid() = user_id);

create policy "Authenticated users can join conversations" on public.conversation_participants
    for insert with check (auth.uid() = user_id);

create policy "Users can leave conversations" on public.conversation_participants
    for delete using (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: MESSAGES
-- ============================================================

create policy "Participants can view messages" on public.messages
    for select using (
        exists (
            select 1 from conversation_participants
            where conversation_id = messages.conversation_id and user_id = auth.uid()
        )
    );

create policy "Participants can send messages" on public.messages
    for insert with check (
        auth.uid() = sender_id and
        exists (
            select 1 from conversation_participants
            where conversation_id = messages.conversation_id and user_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================

create policy "Users can view own notifications" on public.notifications
    for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
    for update using (auth.uid() = user_id);

-- ============================================================
-- FUNCTION & TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- Fixed: search_path = '' (empty) to prevent search path injection
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, username, full_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();