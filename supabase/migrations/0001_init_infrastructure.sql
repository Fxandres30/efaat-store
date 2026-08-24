-- =====================================================================
-- EFAAT STORE — Migración 0001: infraestructura de datos
-- =====================================================================
-- Genera: 16 tablas, funciones transaccionales de inventario, triggers,
-- RLS + policies, Realtime, índices y constraints.
--
-- NO migra productos, usuarios, pedidos ni reseñas (Fase 17: eso queda
-- para una migración posterior). Solo siembra 2 filas de referencia
-- (categorías tenis/gorras) y 1 fila singleton de shipping_settings,
-- porque sin ellas el frontend no tiene ni siquiera las rutas base.
--
-- Pensado para pegar completo en el SQL Editor de Supabase. No contiene
-- DROP de ninguna tabla ni dato existente — los únicos DROP del archivo
-- son "DROP POLICY/TRIGGER IF EXISTS" inmediatamente antes de recrear
-- esa misma policy/trigger, para que el archivo completo sea seguro de
-- volver a correr de punta a punta (tablas: IF NOT EXISTS · funciones:
-- OR REPLACE · constraints y Realtime: bloques DO con chequeo previo ·
-- filas de referencia: ON CONFLICT DO NOTHING).
-- =====================================================================


-- =====================================================================
-- SECCIÓN 0 — EXTENSIONES
-- =====================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
-- pg_cron es opcional y depende del plan de Supabase; se usa más abajo
-- para expirar reservas automáticamente. Si no está disponible, la
-- Sección 8 explica la alternativa (Edge Function programada).


-- =====================================================================
-- SECCIÓN 1 — TABLAS DE CATÁLOGO
-- =====================================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  image       text,                       -- URL; ver Fase 10 (Storage) para migrarla después
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.drops (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  start_at       timestamptz not null,
  end_at         timestamptz not null,
  limited_stock  int,
  status         text not null default 'active' check (status in ('active','inactive')),
  created_at     timestamptz not null default now()
);

create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  name           text not null,
  description    text not null,
  category_id    uuid not null references public.categories(id),
  drop_id        uuid references public.drops(id),
  brand          text not null,             -- texto libre: EFAAT_BRANDS no se usa en el código, ver Fase 16
  price          numeric(12,2) not null check (price >= 0),
  compare_price  numeric(12,2) check (compare_price is null or compare_price >= 0),
  discount       int not null default 0,    -- se calcula al crear/editar; no se recalcula solo si cambian los precios
  images         text[] not null default '{}',
  colors         jsonb not null default '[]',  -- copia derivada de product_variants, ver nota en el modelo
  sizes          jsonb not null default '[]',  -- copia derivada de product_variants
  stock          int not null default 0,       -- suma de product_variants.stock, mantenida por trigger (Sección 4)
  featured       boolean not null default false,
  is_new         boolean not null default false,   -- renombrado de "new": palabra reservada en triggers de Postgres
  best_seller    boolean not null default false,
  on_drop        boolean not null default false,
  rating         numeric(2,1) not null default 0,      -- independiente de reviews, no se promedia en vivo
  reviews_count  int not null default 0,               -- independiente de reviews, no se cuenta en vivo
  tags           text[] not null default '{}',
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text not null,        -- texto uniforme aunque en tenis sea numérico (38-45) y en gorras texto
  color       text not null,
  color_hex   text not null,
  sku         text not null unique,
  stock       int not null default 0 check (stock >= 0),   -- NUNCA se escribe desde el cliente, ver Sección 3
  price       numeric(12,2) check (price is null or price >= 0),  -- existe por variante pero hoy el código
                                                                    -- nunca le asigna un valor distinto al del
                                                                    -- producto — ver nota en el modelo de datos
  created_at  timestamptz not null default now(),
  unique (product_id, color, size)
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  "user"      text not null,     -- nombre libre — NO hay vínculo a users hoy, ver Fase 16 / modelo de datos
  rating      numeric(2,1) not null check (rating between 0 and 5),
  comment     text not null,
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- SECCIÓN 2 — USUARIOS
-- =====================================================================
-- public.users es SOLO perfil. Login, password, sesión y JWT los maneja
-- Supabase Auth por completo — nunca se guarda contraseña aquí.

create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null,
  email          text not null unique,
  phone          text,
  role           text not null default 'customer' check (role in ('customer','admin')),
  avatar         text,                 -- campo existe pero hoy no hay ninguna pantalla que lo suba
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  name         text not null,           -- etiqueta: "Casa", "Trabajo"
  recipient    text not null,
  phone        text not null,
  address      text not null,
  city         text not null,
  department   text not null,
  postal_code  text,          -- huérfano: existe en el seed demo, el formulario actual no lo pide (ver modelo)
  reference    text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- 2.1 — provisiona automáticamente la fila de perfil cuando alguien se
-- registra en Supabase Auth, para que public.users.id = auth.users.id
-- se cumpla siempre y no dependa de que el frontend recuerde insertarla.
-- No estaba pedido literalmente, pero se desprende directo de "Fase 4":
-- se agrega aquí y se explica, no en silencio.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.favorites (
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- cart_items: rediseño, no migración — hoy el carrito no tiene user_id
-- en absoluto (ver modelo de datos, sección cart_items).
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  qty         int not null check (qty > 0),
  updated_at  timestamptz not null default now(),
  unique (user_id, variant_id)   -- protección contra duplicar la misma variante (Fase 11)
);


-- =====================================================================
-- SECCIÓN 3 — INVENTARIO (reservas + bitácora)
-- =====================================================================

create table if not exists public.inventory_reservations (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null,   -- FK real se agrega en Sección 5, después de crear orders
  user_id      uuid references public.users(id),      -- nullable: pedidos de invitado
  variant_id   uuid not null references public.product_variants(id),
  quantity     int not null check (quantity > 0),
  status       text not null default 'reserved'
                 check (status in ('reserved','committed','released','expired','cancelled')),
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  variant_id      uuid not null references public.product_variants(id),
  order_id        uuid,          -- FK real se agrega en Sección 5
  reservation_id  uuid references public.inventory_reservations(id),
  quantity        int not null check (quantity > 0),   -- magnitud siempre positiva; el "type" da el sentido
  type            text not null
                    check (type in ('reservation','commit','release','manual_adjustment','return')),
  created_by      uuid references public.users(id),    -- quién lo provocó; null = sistema/trigger
  reason          text,
  created_at      timestamptz not null default now()
);


-- =====================================================================
-- SECCIÓN 4 — PEDIDOS
-- =====================================================================

create sequence if not exists public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text
language sql
as $$
  select 'EF-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique default public.generate_order_number(),
  user_id              uuid references public.users(id),     -- null = pedido de invitado
  guest_order          boolean not null default false,
  customer_name        text not null,
  customer_email       text not null,
  customer_phone       text not null,
  subtotal             numeric(12,2) not null check (subtotal >= 0),
  discount             numeric(12,2) not null default 0,
  coupon_code          text,          -- snapshot, sin FK: el pedido debe conservar el dato aunque el cupón se borre
  shipping_cost        numeric(12,2) not null default 0,
  total                numeric(12,2) not null check (total >= 0),
  payment_method       text not null check (payment_method in ('card','pse','transfer','cod','mercadopago','wompi')),
  payment_status       text not null default 'pending' check (payment_status in ('pending','paid','refunded')),
  -- 'failed' NO se incluye a propósito: hoy solo existe en la etiqueta de UI, el código nunca lo asigna (Fase Pagos)
  shipping_address     jsonb not null,     -- foto embebida, no FK a addresses (igual que hoy)
  shipping_method      text not null default 'standard' check (shipping_method in ('standard','express')),
  order_status         text not null default 'pending' check (order_status in (
                          'pending','payment_pending','confirmed','preparing','ready',
                          'shipped','in_transit','delivered','cancelled','returned'
                        )),
  inventory_committed  boolean not null default false,   -- mantenido por trigger, ver Sección 6
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_reservations_order') then
    alter table public.inventory_reservations
      add constraint fk_reservations_order foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_movements_order') then
    alter table public.stock_movements
      add constraint fk_movements_order foreign key (order_id) references public.orders(id) on delete set null;
  end if;
end $$;

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,          -- FK suave: ver nota abajo
  variant_id   uuid references public.product_variants(id) on delete set null,  -- FK suave: ver nota abajo
  sku          text not null,
  name         text not null,
  brand        text not null,
  image        text,
  size         text not null,
  color        text not null,
  price        numeric(12,2) not null check (price >= 0),
  qty          int not null check (qty > 0)
);
comment on table public.order_items is
  'Todas las columnas (name, brand, image, size, color, price) son fotos tomadas al comprar. '
  'product_id/variant_id son ON DELETE SET NULL para que un pedido histórico nunca dependa '
  'de que el producto original siga existiendo — nunca reconstruir un pedido antiguo solo con JOIN.';

create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      text not null,
  note        text,
  changed_by  uuid references public.users(id),   -- AGREGADO sobre el modelo original — ver nota de decisiones
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- SECCIÓN 5 — COMERCIAL / CONFIG
-- =====================================================================

create table if not exists public.coupons (
  code          text primary key,      -- llave natural: así lo usa el código actual, no un uuid separado
  type          text not null check (type in ('percent','free_shipping')),
  value         numeric(12,2) not null default 0,
  min_subtotal  numeric(12,2) not null default 0,
  active        boolean not null default true,
  label         text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.shipping_settings (
  id                       boolean primary key default true,   -- truco de singleton: solo puede existir id=true
  standard_shipping_cost   numeric(12,2) not null,
  express_shipping_cost    numeric(12,2) not null,
  free_shipping_threshold  numeric(12,2) not null,
  updated_at               timestamptz not null default now(),
  constraint shipping_settings_singleton check (id)
);


-- =====================================================================
-- SECCIÓN 6 — TRIGGERS
-- =====================================================================

-- 6.1 — mantiene products.stock = suma de sus variantes
create or replace function public.recompute_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  update public.products
  set stock = (select coalesce(sum(stock), 0) from public.product_variants where product_id = v_product_id)
  where id = v_product_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_stock_ins_upd on public.product_variants;
create trigger trg_recompute_stock_ins_upd
after insert or update of stock on public.product_variants
for each row execute function public.recompute_product_stock();

drop trigger if exists trg_recompute_stock_del on public.product_variants;
create trigger trg_recompute_stock_del
after delete on public.product_variants
for each row execute function public.recompute_product_stock();

-- 6.2 — updated_at automático (solo donde el modelo original ya lo tenía
-- o donde esta fase agrega la tabla desde cero con ese campo explícito)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_reservations_updated_at on public.inventory_reservations;
create trigger trg_reservations_updated_at
before update on public.inventory_reservations
for each row execute function public.set_updated_at();

drop trigger if exists trg_shipping_settings_updated_at on public.shipping_settings;
create trigger trg_shipping_settings_updated_at
before update on public.shipping_settings
for each row execute function public.set_updated_at();

-- 6.3 — historial de pedido automático + disparo de commit/release de
-- inventario cuando cambia order_status. Ver "Decisión 2" en la respuesta:
-- BEFORE ajusta inventory_committed (evita recursión), AFTER inserta el
-- historial y llama a las funciones de inventario (que NO tocan orders).
create or replace function public.orders_before_status_change()
returns trigger language plpgsql as $$
begin
  if new.order_status is distinct from old.order_status then
    if new.order_status in ('confirmed','preparing','ready','shipped','in_transit','delivered') then
      new.inventory_committed = true;
    elsif new.order_status in ('cancelled','returned') then
      new.inventory_committed = false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_before_status_change on public.orders;
create trigger trg_orders_before_status_change
before update on public.orders
for each row execute function public.orders_before_status_change();

create or replace function public.orders_after_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.order_status is distinct from old.order_status then
    insert into public.order_status_history (order_id, status, note, changed_by)
    values (new.id, new.order_status, null, auth.uid());

    if new.order_status in ('confirmed','preparing','ready','shipped','in_transit','delivered')
       and old.order_status not in ('confirmed','preparing','ready','shipped','in_transit','delivered') then
      perform public.commit_inventory(new.id);
    end if;

    if new.order_status in ('cancelled','returned') then
      perform public.release_inventory(new.id, new.order_status);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_after_status_change on public.orders;
create trigger trg_orders_after_status_change
after update on public.orders
for each row execute function public.orders_after_status_change();

-- 6.4 — primera fila del historial al crear el pedido (equivalente al
-- statusHistory: [{status:'pending', note:'Pedido creado.'}] original)
create or replace function public.orders_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (new.id, new.order_status, 'Pedido creado.', auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_orders_after_insert on public.orders;
create trigger trg_orders_after_insert
after insert on public.orders
for each row execute function public.orders_after_insert();

-- 6.5 — evita que un customer se auto-asigne role='admin' al editar su
-- propio perfil (RLS es por fila, no por columna; esto cierra ese hueco)
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    new.role = old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on public.users;
create trigger trg_prevent_role_self_escalation
before update on public.users
for each row execute function public.prevent_role_self_escalation();


-- =====================================================================
-- SECCIÓN 7 — is_admin() y funciones transaccionales de inventario
-- =====================================================================

-- 7.1 — chequeo de rol sin recursión de RLS: SECURITY DEFINER hace que
-- esta consulta a public.users corra con el privilegio del dueño de la
-- función (bypassa RLS de esa tabla), en vez de re-evaluar las policies
-- de users desde dentro de una policy de users (eso es lo que causa la
-- recursión clásica). Se limita a esto únicamente, como pediste.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.users u where u.id = uid and u.role = 'admin');
$$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 7.2 — reserve_inventory: llamable desde el cliente (checkout). Bloquea
-- cada variante con FOR UPDATE para serializar reservas concurrentes;
-- si el disponible no alcanza, revierte TODO el pedido (all-or-nothing).
create or replace function public.reserve_inventory(
  p_order_id uuid,
  p_items    jsonb,                              -- [{"variant_id":"...","quantity":2}, ...]
  p_ttl      interval default interval '20 minutes'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item            jsonb;
  v_variant_id    uuid;
  v_qty           int;
  v_stock         int;
  v_reserved      int;
  v_available     int;
  v_reservation_id uuid;
begin
  if exists (select 1 from public.inventory_reservations where order_id = p_order_id and status = 'reserved') then
    raise exception 'Ya existe una reserva activa para el pedido %', p_order_id;
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_variant_id := (item->>'variant_id')::uuid;
    v_qty := (item->>'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida para la variante %', v_variant_id;
    end if;

    select stock into v_stock from public.product_variants where id = v_variant_id for update;
    if v_stock is null then
      raise exception 'La variante % no existe', v_variant_id;
    end if;

    select coalesce(sum(quantity), 0) into v_reserved
    from public.inventory_reservations
    where variant_id = v_variant_id and status = 'reserved';

    v_available := v_stock - v_reserved;
    if v_available < v_qty then
      raise exception 'Stock insuficiente para la variante % (disponible: %, solicitado: %)',
        v_variant_id, v_available, v_qty;
    end if;

    insert into public.inventory_reservations (order_id, user_id, variant_id, quantity, status, expires_at)
    values (p_order_id, auth.uid(), v_variant_id, v_qty, 'reserved', now() + p_ttl)
    returning id into v_reservation_id;

    insert into public.stock_movements (variant_id, order_id, reservation_id, quantity, type, created_by, reason)
    values (v_variant_id, p_order_id, v_reservation_id, v_qty, 'reservation', auth.uid(),
      'Reserva de inventario al crear el pedido.');
  end loop;
end;
$$;
grant execute on function public.reserve_inventory(uuid, jsonb, interval) to authenticated, anon;

-- 7.3 — commit_inventory: NO se otorga a authenticated/anon (ver Decisión
-- 3). Solo la corre el trigger orders_after_status_change, que actúa con
-- el privilegio de su propio dueño al ser SECURITY DEFINER.
create or replace function public.commit_inventory(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  for r in
    select * from public.inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    for update
  loop
    update public.product_variants
    set stock = stock - r.quantity
    where id = r.variant_id and stock >= r.quantity;

    if not found then
      raise exception 'No se pudo confirmar inventario: stock insuficiente para variante % (reserva %)',
        r.variant_id, r.id;
    end if;

    update public.inventory_reservations set status = 'committed', updated_at = now() where id = r.id;

    -- created_by = auth.uid() del que EJECUTA el cambio de estado (admin
    -- normalmente), no r.user_id (que es el dueño de la reserva/pedido) —
    -- order_id ya deja claro de qué pedido se trata.
    insert into public.stock_movements (variant_id, order_id, reservation_id, quantity, type, created_by, reason)
    values (r.variant_id, p_order_id, r.id, r.quantity, 'commit', auth.uid(),
      'Descuento definitivo al confirmar el pago.');
  end loop;
end;
$$;

-- 7.4 — release_inventory: cubre cancelación, rechazo de pago y
-- expiración; el status final distingue el motivo, el movimiento
-- siempre queda registrado como 'release'. Tampoco se otorga a clientes.
create or replace function public.release_inventory(p_order_id uuid, p_status text default 'released')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  if p_status not in ('released','cancelled','expired') then
    raise exception 'Estado de liberación inválido: %', p_status;
  end if;

  for r in
    select * from public.inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    for update
  loop
    update public.inventory_reservations set status = p_status, updated_at = now() where id = r.id;

    insert into public.stock_movements (variant_id, order_id, reservation_id, quantity, type, created_by, reason)
    values (r.variant_id, p_order_id, r.id, r.quantity, 'release', auth.uid(),
      case p_status
        when 'expired'   then 'Reserva expirada sin confirmar el pago.'
        when 'cancelled' then 'Pedido cancelado antes de confirmar el pago.'
        else 'Reserva liberada.'
      end);
  end loop;
end;
$$;

-- 7.5 — expire_inventory_reservations: barrido de TODAS las reservas
-- vencidas (nombre en plural — ver Decisión, no hay "la" reserva a
-- expirar sin un barrido). Pensada para un job programado (Sección 8).
create or replace function public.expire_inventory_reservations()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_count int := 0;
begin
  for v_order in
    select distinct order_id from public.inventory_reservations
    where status = 'reserved' and expires_at < now()
  loop
    perform public.release_inventory(v_order.order_id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- 7.6 — manual_adjust_stock: la única vía para que el admin corrija
-- stock a mano y que quede auditado como 'manual_adjustment' (el tipo
-- que pediste en stock_movements, que si no existiría sin escritor).
-- No es uno de los 4 nombres que pediste — se agrega porque sin ella
-- ese tipo de movimiento nunca se generaría (ver Decisión 4).
create or replace function public.manual_adjust_stock(p_variant_id uuid, p_new_stock int, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_stock int;
  v_delta     int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo un administrador puede ajustar stock manualmente';
  end if;
  if p_new_stock < 0 then
    raise exception 'El stock no puede ser negativo';
  end if;

  select stock into v_old_stock from public.product_variants where id = p_variant_id for update;
  if v_old_stock is null then
    raise exception 'La variante % no existe', p_variant_id;
  end if;

  v_delta := abs(p_new_stock - v_old_stock);
  update public.product_variants set stock = p_new_stock where id = p_variant_id;

  if v_delta > 0 then
    insert into public.stock_movements (variant_id, quantity, type, created_by, reason)
    values (p_variant_id, v_delta, 'manual_adjustment', auth.uid(), p_reason);
  end if;
end;
$$;
grant execute on function public.manual_adjust_stock(uuid, int, text) to authenticated;


-- =====================================================================
-- SECCIÓN 8 — EXPIRACIÓN PROGRAMADA (opcional, según plan de Supabase)
-- =====================================================================
-- Descomentar SOLO si el proyecto tiene la extensión pg_cron habilitada
-- (Database → Extensions en el dashboard de Supabase). Si no está
-- disponible en tu plan, la alternativa es una Edge Function programada
-- (Database Webhooks / Scheduled Functions) que llame por RPC a
-- expire_inventory_reservations() cada 1-5 minutos.
--
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'expire-inventory-reservations',
--   '*/2 * * * *',
--   $$select public.expire_inventory_reservations();$$
-- );


-- =====================================================================
-- SECCIÓN 9 — ROW LEVEL SECURITY + POLICIES
-- =====================================================================

alter table public.categories             enable row level security;
alter table public.drops                   enable row level security;
alter table public.products                enable row level security;
alter table public.product_variants        enable row level security;
alter table public.reviews                 enable row level security;
alter table public.users                   enable row level security;
alter table public.addresses               enable row level security;
alter table public.favorites               enable row level security;
alter table public.cart_items              enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.order_status_history    enable row level security;
alter table public.coupons                 enable row level security;
alter table public.shipping_settings       enable row level security;
alter table public.inventory_reservations  enable row level security;
alter table public.stock_movements         enable row level security;

-- Todas las policies van precedidas de DROP POLICY IF EXISTS para que
-- este archivo sea seguro de volver a correr completo sin fallar.

-- ---- catálogo público (categories, drops, products, product_variants, reviews) ----
drop policy if exists p_categories_read on public.categories;
create policy p_categories_read on public.categories for select using (true);
drop policy if exists p_categories_admin on public.categories;
create policy p_categories_admin on public.categories for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists p_drops_read on public.drops;
create policy p_drops_read on public.drops for select using (true);
drop policy if exists p_drops_admin on public.drops;
create policy p_drops_admin on public.drops for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists p_products_read on public.products;
create policy p_products_read on public.products for select using (active = true or public.is_admin(auth.uid()));
drop policy if exists p_products_admin on public.products;
create policy p_products_admin on public.products for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists p_variants_read on public.product_variants;
create policy p_variants_read on public.product_variants for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.products p where p.id = product_id and p.active = true)
  );
-- Único camino de escritura directa sobre stock: el admin (vía tabla o,
-- preferible, manual_adjust_stock). NINGÚN customer tiene policy de
-- UPDATE aquí — por eso el frontend nunca puede tocar stock.
drop policy if exists p_variants_admin on public.product_variants;
create policy p_variants_admin on public.product_variants for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists p_reviews_read on public.reviews;
create policy p_reviews_read on public.reviews for select using (true);
drop policy if exists p_reviews_admin on public.reviews;
create policy p_reviews_admin on public.reviews for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- No hay policy de INSERT para customers: hoy no existe pantalla de
-- "escribir reseña" (ver modelo de datos) — no se inventa una aquí.

-- ---- usuarios ----
drop policy if exists p_users_self_read on public.users;
create policy p_users_self_read on public.users for select using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists p_users_self_update on public.users;
create policy p_users_self_update on public.users for update
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));
-- el INSERT normal ya lo hace el trigger de la Sección 2.1; esta policy
-- queda como red de respaldo (ej. recrear un perfil borrado a mano)
drop policy if exists p_users_self_insert on public.users;
create policy p_users_self_insert on public.users for insert with check (id = auth.uid());

drop policy if exists p_addresses_owner on public.addresses;
create policy p_addresses_owner on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_favorites_owner on public.favorites;
create policy p_favorites_owner on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_cart_owner on public.cart_items;
create policy p_cart_owner on public.cart_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- cart_items no tiene policy de admin a propósito: el carrito de otro
-- usuario no forma parte de lo que el admin necesita administrar hoy.

-- ---- pedidos ----
drop policy if exists p_orders_read on public.orders;
create policy p_orders_read on public.orders for select
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists p_orders_insert on public.orders;
create policy p_orders_insert on public.orders for insert
  with check (user_id = auth.uid() or (user_id is null and guest_order = true));
-- el customer solo puede mover SU pedido a 'cancelled', y solo desde un
-- estado cancelable — coincide con OrdersModule.canCancel() del código
-- actual. USING filtra qué fila puede tocar (la suya, en un estado
-- cancelable); WITH CHECK filtra en qué puede convertirse. Cualquier
-- otro cambio de estado requiere is_admin().
drop policy if exists p_orders_update on public.orders;
create policy p_orders_update on public.orders for update
  using (
    public.is_admin(auth.uid())
    or (
      user_id = auth.uid()
      and order_status in ('pending','payment_pending','confirmed','preparing','ready')
    )
  )
  with check (
    public.is_admin(auth.uid())
    or (user_id = auth.uid() and order_status = 'cancelled')
  );

drop policy if exists p_order_items_read on public.order_items;
create policy p_order_items_read on public.order_items for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
-- sin policy de INSERT directa para customers — ver "Decisión 6" sobre
-- por qué la creación de pedidos completa debería pasar a un RPC futuro.

drop policy if exists p_status_history_read on public.order_status_history;
create policy p_status_history_read on public.order_status_history for select
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
-- sin policy de INSERT: solo los triggers de la Sección 6 escriben aquí.

-- ---- comercial / config ----
drop policy if exists p_coupons_read on public.coupons;
create policy p_coupons_read on public.coupons for select using (active = true or public.is_admin(auth.uid()));
drop policy if exists p_coupons_admin on public.coupons;
create policy p_coupons_admin on public.coupons for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists p_shipping_read on public.shipping_settings;
create policy p_shipping_read on public.shipping_settings for select using (true);
drop policy if exists p_shipping_admin on public.shipping_settings;
create policy p_shipping_admin on public.shipping_settings for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---- inventario ----
drop policy if exists p_reservations_read on public.inventory_reservations;
create policy p_reservations_read on public.inventory_reservations for select
  using (user_id = auth.uid() or public.is_admin(auth.uid()));
-- sin policy de INSERT/UPDATE: solo reserve_inventory/commit_inventory/
-- release_inventory (SECURITY DEFINER) escriben aquí.

drop policy if exists p_movements_admin_read on public.stock_movements;
create policy p_movements_admin_read on public.stock_movements for select using (public.is_admin(auth.uid()));
-- tabla 100% de auditoría interna; ningún customer la lee ni la escribe.


-- =====================================================================
-- SECCIÓN 10 — GRANTS DE TABLA
-- =====================================================================
-- RLS filtra FILAS; estos GRANT habilitan que el rol intente la
-- operación en primer lugar (sin esto, ni admin ni customer llegarían
-- a que sus policies se evalúen). admin y customer comparten el MISMO
-- rol de Postgres ("authenticated") — lo que los distingue es
-- is_admin(auth.uid()) dentro de cada policy, nunca el GRANT.

grant usage on schema public to anon, authenticated;

grant select on public.categories, public.drops, public.products, public.product_variants,
  public.reviews, public.coupons, public.shipping_settings to anon, authenticated;

grant insert, update, delete on public.categories, public.drops, public.products,
  public.product_variants, public.reviews, public.coupons, public.shipping_settings
  to authenticated;   -- filtrado por las policies *_admin de arriba

grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.addresses, public.favorites, public.cart_items to authenticated;

grant select, insert, update on public.orders to authenticated, anon;   -- anon: checkout de invitado
grant select on public.order_items, public.order_status_history to authenticated, anon;
grant select on public.inventory_reservations to authenticated, anon;
grant select on public.stock_movements to authenticated;


-- =====================================================================
-- SECCIÓN 11 — VISTA DE DISPONIBILIDAD
-- =====================================================================
-- available_stock = stock físico - reservas activas. Se expone como
-- VISTA calculada (no como columna guardada) — ver "Decisión 1".
-- A propósito SIN "security_invoker": necesita sumar TODAS las
-- reservas activas del sistema (de cualquier usuario) para que el
-- número sea correcto también para un customer normal; solo expone el
-- total agregado por variante, nunca qué usuario reservó qué.
create or replace view public.product_variants_availability as
select
  pv.*,
  pv.stock - coalesce(r.reserved_qty, 0) as available_stock
from public.product_variants pv
left join (
  select variant_id, sum(quantity) as reserved_qty
  from public.inventory_reservations
  where status = 'reserved'
  group by variant_id
) r on r.variant_id = pv.id;

grant select on public.product_variants_availability to anon, authenticated;


-- =====================================================================
-- SECCIÓN 12 — ÍNDICES
-- =====================================================================
create index if not exists ix_products_category      on public.products(category_id);
create index if not exists ix_products_brand          on public.products(brand);
create index if not exists ix_products_active         on public.products(active);
create index if not exists ix_products_best_seller    on public.products(best_seller);
create index if not exists ix_products_is_new         on public.products(is_new);
create index if not exists ix_products_on_drop        on public.products(on_drop);

create index if not exists ix_variants_product        on public.product_variants(product_id);
create index if not exists ix_variants_stock          on public.product_variants(stock);
-- sku y (product_id,color,size) ya quedaron UNIQUE al crear la tabla,
-- lo que crea su índice automáticamente.

create index if not exists ix_orders_user             on public.orders(user_id);
create index if not exists ix_orders_status            on public.orders(order_status);
create index if not exists ix_orders_payment_status    on public.orders(payment_status);
create index if not exists ix_orders_created_at        on public.orders(created_at);
create index if not exists ix_orders_customer_email    on public.orders(customer_email);
-- order_number ya quedó UNIQUE.

create index if not exists ix_order_items_order        on public.order_items(order_id);
create index if not exists ix_status_history_order     on public.order_status_history(order_id);

create index if not exists ix_favorites_user           on public.favorites(user_id);
create index if not exists ix_addresses_user           on public.addresses(user_id);
create index if not exists ix_cart_user                on public.cart_items(user_id);

create index if not exists ix_reservations_variant     on public.inventory_reservations(variant_id);
create index if not exists ix_reservations_order       on public.inventory_reservations(order_id);
create index if not exists ix_reservations_status      on public.inventory_reservations(status);
create index if not exists ix_reservations_expires     on public.inventory_reservations(expires_at)
  where status = 'reserved';   -- índice parcial: solo lo que el expirador realmente barre

create index if not exists ix_movements_variant        on public.stock_movements(variant_id);
create index if not exists ix_movements_created_at     on public.stock_movements(created_at);


-- =====================================================================
-- SECCIÓN 13 — REALTIME
-- =====================================================================
-- Solo donde una pantalla real necesita reaccionar en vivo (ver sección
-- G del modelo de datos). NO se activa en el resto de las tablas.
-- inventory_reservations SÍ se activa (la Fase 8 pedía "evaluar"): el
-- cliente en checkout puede mostrar la cuenta regresiva de su reserva
-- en vivo, y el admin puede ver el pool de reservas activas sin recargar.
do $$
declare
  t text;
begin
  foreach t in array array['products','product_variants','orders','order_status_history','drops','inventory_reservations']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- =====================================================================
-- SECCIÓN 14 — DATOS DE REFERENCIA (NO es la migración de productos/usuarios/pedidos)
-- =====================================================================
insert into public.categories (name, slug, active) values
  ('Tenis', 'tenis', true),
  ('Gorras', 'gorras', true)
on conflict (slug) do nothing;

insert into public.shipping_settings (id, standard_shipping_cost, express_shipping_cost, free_shipping_threshold)
values (true, 12900, 22900, 250000)
on conflict (id) do nothing;

-- Fin de la migración 0001.
