-- 1. Remove old tables (safe to re-run)
drop table if exists bookings cascade;
drop table if exists beds cascade;
drop table if exists wards cascade;

-- 2. Create tables
create table wards (
  id serial primary key,
  name text unique not null
);

create table beds (
  id serial primary key,
  bed_number text unique not null,
  ward_id int references wards(id),
  status text default 'available'
    check (status in ('available','occupied','reserved')),
  patient_name text,
  updated_at timestamptz default now()
);

create table bookings (
  id serial primary key,
  patient_name text not null,
  phone text not null,
  age int,
  ward_id int references wards(id),
  bed_id int references beds(id),
  admission_date date,
  needs_oxygen boolean default false,
  needs_ventilator boolean default false,
  created_at timestamptz default now()
);

-- 3. Sample data
insert into wards (name) values
('ICU'), ('General'), ('Emergency'), ('Maternity'), ('Pediatrics');

insert into beds (bed_number, ward_id, status)
select left(w.name, 3) || '-' || lpad(g::text, 2, '0'),
       w.id,
       case when g % 3 = 0 then 'occupied'
            when g % 5 = 0 then 'reserved'
            else 'available' end
from wards w, generate_series(1, 6) g;

update beds
set patient_name = 'Patient ' || bed_number
where status = 'occupied';

-- 4. Security: allow the website (anon key) to read and write
alter table wards enable row level security;
alter table beds enable row level security;
alter table bookings enable row level security;

create policy "wards read" on wards for select to anon, authenticated using (true);
create policy "beds read" on beds for select to anon, authenticated using (true);
create policy "beds update" on beds for update to anon, authenticated using (true) with check (true);
create policy "bookings read" on bookings for select to anon, authenticated using (true);
create policy "bookings insert" on bookings for insert to anon, authenticated with check (true);

-- 5. Give the API access to the tables
grant usage on schema public to anon, authenticated;
grant select on wards to anon, authenticated;
grant select, update on beds to anon, authenticated;
grant select, insert on bookings to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 6. Realtime for live dashboard updates
alter publication supabase_realtime add table beds;