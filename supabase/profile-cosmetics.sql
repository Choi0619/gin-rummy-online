-- Account-level cosmetic selection shared by browsers and the desktop app.
-- NULL is intentional: it lets an existing browser import its local theme once.
alter table public.profiles
  add column if not exists selected_theme text;

alter table public.profiles
  drop constraint if exists profiles_selected_theme_check;

alter table public.profiles
  add constraint profiles_selected_theme_check
  check (
    selected_theme is null or selected_theme in (
      'green', 'blue', 'purple', 'red', 'dark', 'pink',
      'rainbow', 'aurora', 'abyss', 'angel'
    )
  );

comment on column public.profiles.selected_theme is
  'Currently equipped background theme. NULL allows one-time local preference import.';
