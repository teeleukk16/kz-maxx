-- Таблица пользователей сайта
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null default 'Пользователь',
    role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
    created_at timestamp with time zone default now()
);

-- Таблица вопросов
create table if not exists public.questions (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null default 'Пользователь',
    topic text not null,
    title text not null,
    text text not null,
    code text,
    created_at timestamp with time zone default now()
);

-- Таблица ответов
create table if not exists public.answers (
    id bigint generated always as identity primary key,
    question_id bigint not null references public.questions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null default 'Пользователь',
    text text not null,
    created_at timestamp with time zone default now()
);

-- Автоматически создавать profile после регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, name, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', 'Пользователь'),
        'user'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Функция проверки: пользователь админ или модератор?
create or replace function public.is_moderator()
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
        and role in ('admin', 'moderator')
    );
$$;

-- Включаем RLS
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

-- Удаляем старые policies, если они уже были
drop policy if exists "Users can read own profile" on public.profiles;

drop policy if exists "Anyone can read questions" on public.questions;
drop policy if exists "Authenticated users can insert questions" on public.questions;
drop policy if exists "Only moderators can delete questions" on public.questions;

drop policy if exists "Anyone can read answers" on public.answers;
drop policy if exists "Authenticated users can insert answers" on public.answers;
drop policy if exists "Only moderators can delete answers" on public.answers;

-- profiles: пользователь может читать только свой profile
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- questions: читать вопросы могут все
create policy "Anyone can read questions"
on public.questions
for select
using (true);

-- questions: писать вопросы могут только авторизованные пользователи
create policy "Authenticated users can insert questions"
on public.questions
for insert
to authenticated
with check (auth.uid() = user_id);

-- questions: удалять вопросы могут только admin/moderator
create policy "Only moderators can delete questions"
on public.questions
for delete
to authenticated
using (public.is_moderator());

-- answers: читать ответы могут все
create policy "Anyone can read answers"
on public.answers
for select
using (true);

-- answers: писать ответы могут только авторизованные пользователи
create policy "Authenticated users can insert answers"
on public.answers
for insert
to authenticated
with check (auth.uid() = user_id);

-- answers: удалять ответы могут только admin/moderator
create policy "Only moderators can delete answers"
on public.answers
for delete
to authenticated
using (public.is_moderator());

-- Доступ через Supabase Data API
grant usage on schema public to anon, authenticated;

grant select on public.questions to anon, authenticated;
grant insert on public.questions to authenticated;
grant delete on public.questions to authenticated;

grant select on public.answers to anon, authenticated;
grant insert on public.answers to authenticated;
grant delete on public.answers to authenticated;

grant select on public.profiles to authenticated;

grant execute on function public.is_moderator() to authenticated;
grant usage, select on all sequences in schema public to authenticated;


e52ca731-4448-4d93-b981-88162cd96b0e