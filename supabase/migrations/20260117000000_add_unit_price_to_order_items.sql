-- Compatibility migration: some clients/query code expect `order_items.unit_price`
-- Base schema uses `price`. This adds `unit_price` and keeps it populated.

alter table public.order_items
  add column if not exists unit_price numeric;

update public.order_items
set unit_price = price
where unit_price is null;

create or replace function public.order_items_set_unit_price()
returns trigger
language plpgsql
as $$
begin
  if new.unit_price is null then
    new.unit_price := new.price;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_items_set_unit_price on public.order_items;
create trigger trg_order_items_set_unit_price
before insert or update of price, unit_price on public.order_items
for each row
execute function public.order_items_set_unit_price();
