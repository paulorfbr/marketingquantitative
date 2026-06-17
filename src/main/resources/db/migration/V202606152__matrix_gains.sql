create table matrix_gains (
  id         bigserial    primary key,
  name       varchar(255) not null,
  created_at timestamptz  not null default now()
);

create table matrix_gains_scenario (
  id              bigserial    primary key,
  matrix_gains_id bigint       not null references matrix_gains(id) on delete cascade,
  position        int          not null check (position >= 0),
  label           varchar(255) not null
);

create table matrix_gains_strategy (
  id              bigserial    primary key,
  matrix_gains_id bigint       not null references matrix_gains(id) on delete cascade,
  position        int          not null check (position >= 0),
  label           varchar(255) not null
);

create table matrix_gains_cell (
  id                       bigserial not null primary key,
  matrix_gains_strategy_id bigint    not null references matrix_gains_strategy(id) on delete cascade,
  scenario_position        int       not null check (scenario_position >= 0),
  value                    numeric   not null
);
