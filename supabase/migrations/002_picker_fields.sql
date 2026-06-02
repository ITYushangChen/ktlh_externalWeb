-- 选货列表展示字段
alter table public.deliveries
  add column if not exists picker_label text,
  add column if not exists list_sort_order int not null default 0;

comment on column public.deliveries.picker_label is '司机选货页显示的简短名称，为空则用 title';
comment on column public.deliveries.list_sort_order is '选货列表排序，数字越小越靠前';
