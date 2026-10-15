-- Apply only to a reviewed staging database. Existing crown holders are untouched.
create table public.steeltape_crown_attempts (
 id uuid primary key default gen_random_uuid(), request_key uuid not null,
 seat text not null check (seat in ('king','queen')),
 challenger_uid uuid not null references auth.users(id), holder_uid uuid not null references auth.users(id), holder_since timestamptz not null,
 seed bigint not null, sim_version text not null, challenger jsonb not null, defender jsonb not null,
 state jsonb not null, seq integer not null default 0,
 status text not null default 'active' check (status in ('active','claimed','lost','abandoned')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '120 seconds',
 result jsonb, unique(challenger_uid,request_key), check(challenger_uid<>holder_uid)
);
create unique index crown_one_attempt_per_seat on public.steeltape_crown_attempts(seat) where status='active';
create table public.steeltape_crown_inputs (
 attempt_id uuid not null references public.steeltape_crown_attempts(id), seq integer not null,
 input_hash text not null, inputs jsonb not null, state jsonb not null, created_at timestamptz not null default now(),
 primary key(attempt_id,seq)
);
alter table public.steeltape_crown_attempts enable row level security;
alter table public.steeltape_crown_inputs enable row level security;
revoke all on public.steeltape_crown_attempts,public.steeltape_crown_inputs from public,anon,authenticated;
grant select,insert,update on public.steeltape_crown_attempts,public.steeltape_crown_inputs to service_role;

create function public.steeltape_crown_begin(p_uid uuid,p_key uuid,p_seat text,p_holder uuid,p_since timestamptz,p_seed bigint,p_version text,p_challenger jsonb,p_defender jsonb,p_state jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare throne public.steeltape_throne; a public.steeltape_crown_attempts; linked_gender text; linked_fighter uuid;
begin
 select * into throne from public.steeltape_throne where seat=p_seat for update;
 if not found then raise exception 'Unknown crown'; end if;
 select * into a from public.steeltape_crown_attempts where challenger_uid=p_uid and request_key=p_key;
 if found then return to_jsonb(a); end if;
 select f.gender,f.id into linked_gender,linked_fighter from public.fighter_accounts l join public.fighter_directory f on f.id=l.fighter_id where l.user_id=p_uid limit 1;
 if linked_fighter is distinct from (p_challenger->>'fighter')::uuid then raise exception 'Fighter link changed'; end if;
 if linked_gender is distinct from (case when p_seat='king' then 'male' else 'female' end) then raise exception 'Ineligible challenger'; end if;
 if throne.holder_uid=p_uid or throne.holder_uid is distinct from p_holder or throne.since is distinct from p_since then raise exception 'Crown changed; refresh the court roll'; end if;
 update public.steeltape_crown_attempts set status='abandoned' where seat=p_seat and status='active' and (expires_at<=now() or challenger_uid=p_uid);
 if exists(select 1 from public.steeltape_crown_attempts where seat=p_seat and status='active') then raise exception 'Another challenger is fighting for this crown'; end if;
 insert into public.steeltape_crown_attempts(request_key,seat,challenger_uid,holder_uid,holder_since,seed,sim_version,challenger,defender,state)
 values(p_key,p_seat,p_uid,p_holder,p_since,p_seed,p_version,p_challenger,p_defender,p_state) returning * into a;
 return to_jsonb(a);
end; $$;

create function public.steeltape_crown_accept(p_uid uuid,p_id uuid,p_seq integer,p_hash text,p_inputs jsonb,p_state jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.steeltape_crown_attempts; prior public.steeltape_crown_inputs;
begin
 select * into a from public.steeltape_crown_attempts where id=p_id and challenger_uid=p_uid for update;
 if not found then raise exception 'Not your crown attempt'; end if;
 select * into prior from public.steeltape_crown_inputs where attempt_id=p_id and seq=p_seq;
 if found then
   if prior.input_hash<>p_hash then raise exception 'Conflicting input retry'; end if;
   return jsonb_build_object('seq',p_seq,'state',prior.state);
 end if;
 if a.status<>'active' or a.expires_at<=now() then raise exception 'Attempt is no longer active'; end if;
 if p_seq<>a.seq+1 then raise exception 'Out-of-order crown input'; end if;
 if (p_state->>'tick')::integer>(extract(epoch from now()-a.created_at)*60+120) then raise exception 'Input advanced ahead of real time'; end if;
 insert into public.steeltape_crown_inputs(attempt_id,seq,input_hash,inputs,state) values(p_id,p_seq,p_hash,p_inputs,p_state);
 update public.steeltape_crown_attempts set state=p_state,seq=p_seq,expires_at=now()+interval '120 seconds' where id=p_id;
 return jsonb_build_object('seq',p_seq,'state',p_state);
end; $$;

create function public.steeltape_crown_finish(p_uid uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare a public.steeltape_crown_attempts; throne public.steeltape_throne; f public.fighter_directory; fighter_id_value uuid; reply jsonb;
begin
 select * into a from public.steeltape_crown_attempts where id=p_id and challenger_uid=p_uid;
 if not found then raise exception 'Not your crown attempt'; end if;
 select * into throne from public.steeltape_throne where seat=a.seat for update;
 select * into a from public.steeltape_crown_attempts where id=p_id for update;
 if a.result is not null then return a.result; end if;
 if a.status<>'active' or a.expires_at<=now() then raise exception 'Attempt is no longer active'; end if;
 if not coalesce((a.state->>'done')::boolean,false) then raise exception 'Incomplete crown fight'; end if;
 if a.state->>'winner' is distinct from '0' then
   reply=jsonb_build_object('id',p_id,'claimed',false,'retained',true);update public.steeltape_crown_attempts set status='lost',result=reply where id=p_id;return reply;
 end if;
 select fighter_id into fighter_id_value from public.fighter_accounts where user_id=p_uid limit 1;
 if fighter_id_value is distinct from (a.challenger->>'fighter')::uuid then raise exception 'Fighter link changed'; end if;
 select * into f from public.fighter_directory where id=fighter_id_value;
 if f.gender is distinct from (case when a.seat='king' then 'male' else 'female' end) then raise exception 'Challenger is no longer eligible'; end if;
 if throne.holder_uid is distinct from a.holder_uid or throne.since is distinct from a.holder_since then raise exception 'Crown changed during the attempt'; end if;
 update public.steeltape_throne set holder_uid=p_uid,holder_fighter=fighter_id_value,holder_name=f.display_name,since=now(),updated_at=now() where seat=a.seat;
 reply=jsonb_build_object('id',p_id,'claimed',true,'seat',a.seat,'reward',5000);
 update public.steeltape_crown_attempts set status='claimed',result=reply where id=p_id;
 return reply;
end; $$;

create function public.steeltape_crown_release(p_uid uuid,p_id uuid,p_abandon boolean)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if p_abandon then update public.steeltape_crown_attempts set status='abandoned' where id=p_id and challenger_uid=p_uid and status='active';
 else update public.steeltape_crown_attempts set expires_at=now()+interval '120 seconds' where id=p_id and challenger_uid=p_uid and status='active' and expires_at>now(); end if;
end; $$;
revoke execute on function public.steeltape_crown_begin(uuid,uuid,text,uuid,timestamptz,bigint,text,jsonb,jsonb,jsonb),public.steeltape_crown_accept(uuid,uuid,integer,text,jsonb,jsonb),public.steeltape_crown_finish(uuid,uuid),public.steeltape_crown_release(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.steeltape_crown_begin(uuid,uuid,text,uuid,timestamptz,bigint,text,jsonb,jsonb,jsonb),public.steeltape_crown_accept(uuid,uuid,integer,text,jsonb,jsonb),public.steeltape_crown_finish(uuid,uuid),public.steeltape_crown_release(uuid,uuid,boolean) to service_role;
