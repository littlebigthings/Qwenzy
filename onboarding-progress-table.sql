-- Create table to track onboarding progress
create table onboarding_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  current_step varchar not null,
  completed_steps jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Enable RLS
alter table onboarding_progress enable row level security;

-- Policies
create policy "Users can view their own onboarding progress"
  on onboarding_progress for select
  using (auth.uid() = user_id);

create policy "Users can update their own onboarding progress"
  on onboarding_progress for update
  using (auth.uid() = user_id);

create policy "Users can insert their own onboarding progress"
  on onboarding_progress for insert
  with check (auth.uid() = user_id);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

create trigger update_onboarding_progress_updated_at
    before update
    on onboarding_progress
    for each row
    execute function update_updated_at_column();
