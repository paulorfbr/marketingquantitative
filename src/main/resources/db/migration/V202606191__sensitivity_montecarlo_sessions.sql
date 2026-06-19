create table sensitivity_session (
  id            bigserial    primary key,
  name          varchar(255) not null,
  model         varchar(50)  not null,
  base_inputs   text         not null,
  swing_percent numeric      not null check (swing_percent > 0),
  results       text         not null,
  created_at    timestamptz  not null default now()
);

create table montecarlo_session (
  id          bigserial    primary key,
  name        varchar(255) not null,
  model       varchar(50)  not null,
  inputs      text         not null,
  iterations  int          not null check (iterations >= 1),
  results     text         not null,
  created_at  timestamptz  not null default now()
);
