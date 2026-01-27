alter table "public"."shifts" add column "start_time" text;
alter table "public"."shifts" add column "end_time" text;
alter table "public"."shifts" add column "break_minutes" integer default 0;
