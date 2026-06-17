create table eoq_session (
  id                bigserial    primary key,
  name              varchar(255) not null,
  demand            numeric      not null check (demand > 0),
  ordering_cost     numeric      not null check (ordering_cost > 0),
  unit_cost         numeric      not null check (unit_cost > 0),
  holding_rate      numeric      not null check (holding_rate > 0),
  eoq               numeric      not null,
  orders_per_year   numeric      not null,
  cycle_days        numeric      not null,
  total_annual_cost numeric      not null,
  created_at        timestamptz  not null default now()
);

create table breakeven_session (
  id                     bigserial    primary key,
  name                   varchar(255) not null,
  fixed_costs            numeric      not null check (fixed_costs >= 0),
  variable_cost_per_unit numeric      not null check (variable_cost_per_unit >= 0),
  price_per_unit         numeric      not null check (price_per_unit > 0),
  break_even_qty         numeric      not null,
  break_even_revenue     numeric      not null,
  contribution_margin    numeric      not null,
  margin_ratio           numeric      not null,
  created_at             timestamptz  not null default now()
);

create table queue_session (
  id           bigserial    primary key,
  name         varchar(255) not null,
  arrival_rate numeric      not null check (arrival_rate > 0),
  service_rate numeric      not null check (service_rate > 0),
  servers      int          not null check (servers >= 1),
  utilization  numeric      not null,
  p0           numeric      not null,
  lq           numeric      not null,
  l            numeric      not null,
  wq           numeric      not null,
  w            numeric      not null,
  created_at   timestamptz  not null default now()
);
