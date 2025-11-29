-- a share that a transaction's debitor has in the transaction value
-- see the transaction_type documentation on what this means for the particular
-- transaction types.
-- transactions can only be evaluated if the sum of their debitor shares is > 0.
create or replace function check_debitor_shares(
    transaction_id integer,
    revision_id bigint,
    account_id integer
) returns boolean as
$$
<<locals>> declare
    is_valid boolean;
begin
    with relevant_entries as (
        select *
        from
            debitor_share cs
        where
            cs.transaction_id = check_debitor_shares.transaction_id
            and cs.revision_id = check_debitor_shares.revision_id
            and cs.account_id != check_debitor_shares.account_id
    )
    select
        not (t.type in ('transfer') and cs_counts.share_count >= 1)
    into locals.is_valid
    from
        transaction t
        join (
            select
                cs.transaction_id,
                cs.revision_id,
                count(*) as share_count
            from
                relevant_entries cs
            group by cs.transaction_id, cs.revision_id
        ) cs_counts on cs_counts.transaction_id = t.id;

    if not locals.is_valid then
        raise '"transfer" type transactions can only have one debitor share';
    end if;

    return locals.is_valid;
end
$$ language plpgsql
set search_path = "$user", public;

alter table debitor_share add constraint check_debitor_share_gt_zero check ( shares > 0 );
alter table debitor_share add constraint check_debitor_shares
    check (check_debitor_shares(transaction_id, revision_id, account_id));

-- a share that a transaction's creditor has in the transaction value
-- see the transaction_type documentation on what this means for the particular
-- transaction types.
-- transactions can only be evaluated if the sum of their creditor shares is > 0.
create or replace function check_creditor_shares(
    transaction_id integer,
    revision_id bigint,
    account_id integer
) returns boolean as
$$
<<locals>> declare
    is_valid boolean;
begin
    with relevant_entries as (
        select *
        from
            creditor_share cs
        where
            cs.transaction_id = check_creditor_shares.transaction_id
            and cs.revision_id = check_creditor_shares.revision_id
            and cs.account_id != check_creditor_shares.account_id
    )
    select
        not (t.type in ('purchase', 'transfer') and cs_counts.share_count >= 1)
    into locals.is_valid
    from
        transaction t
        join (
            select
                cs.transaction_id,
                cs.revision_id,
                count(*) as share_count
            from
                relevant_entries cs
            group by cs.transaction_id, cs.revision_id
        ) cs_counts on cs_counts.transaction_id = t.id;

    if not locals.is_valid then
        raise '"purchase" and "transfer" type transactions can only have one creditor share';
    end if;

    return locals.is_valid;
end
$$ language plpgsql
set search_path = "$user", public;

alter table creditor_share add constraint check_creditor_share_gt_zero check ( shares > 0 );
alter table creditor_share add constraint check_creditor_shares
    check (check_creditor_shares(transaction_id, revision_id, account_id));

create or replace function check_committed_transactions(
    revision_id bigint,
    transaction_id integer
) returns boolean as
$$
<<locals>> declare
    n_creditor_shares   integer;
    n_debitor_shares    integer;
    transaction_type    text;
    transaction_deleted boolean;
begin
    select
        t.type,
        th.deleted
    into locals.transaction_type, locals.transaction_deleted
    from
        transaction_history th
        join transaction t on t.id = th.id
    where
        th.revision_id = check_committed_transactions.revision_id;

    if locals.transaction_deleted then -- if the transaction is deleted we simply accept anything as we dont care
        return true;
    end if;

    select
        count(cs.account_id)
    into locals.n_creditor_shares
    from
        creditor_share cs
    where
        cs.transaction_id = check_committed_transactions.transaction_id
        and cs.revision_id = check_committed_transactions.revision_id;

    select
        count(ds.account_id)
    into locals.n_debitor_shares
    from
        debitor_share ds
    where
        ds.transaction_id = check_committed_transactions.transaction_id
        and ds.revision_id = check_committed_transactions.revision_id;

    -- check that the number of shares fits the transaction type
    if locals.transaction_type = 'transfer' then
        if locals.n_creditor_shares != 1 then
            raise '"transfer"  type transactions must have exactly one creditor share % %', locals.n_creditor_shares, locals.n_debitor_shares;
        end if;

        if locals.n_debitor_shares != 1 then
            raise '"transfer"  type transactions must have exactly one debitor share';
        end if;
    end if;

    if locals.transaction_type = 'purchase' then
        if locals.n_creditor_shares != 1 then
            raise '"purchase" type transactions must have exactly one creditor share';
        end if;
        if locals.n_debitor_shares < 1 then
            raise '"purchase" type transactions must have at least one debitor share';
        end if;

        -- check that all purchase items have at least an item share or communist shares > 0
        -- i.e. we look for a purchase item at the current revision that has sum(usages) + communist_shares <= 0
        -- if such a one is found we raise an exception
        perform from purchase_item pi
        join purchase_item_history pih on pi.id = pih.id
        left join purchase_item_usage piu on pih.revision_id = piu.revision_id and pi.id = piu.item_id
        where pih.revision_id = check_committed_transactions.revision_id
            and pi.transaction_id = check_committed_transactions.transaction_id
            and not pih.deleted
        group by pi.id
        having sum(coalesce(piu.share_amount, 0) + pih.communist_shares) <= 0;

        if found then
            raise 'all transaction positions must have at least one account assigned or their common shares set greater than 0';
        end if;
    end if;

    if locals.transaction_type = 'mimo' then
        if locals.n_creditor_shares < 1 then
            raise '"mimo" type transactions must have at least one creditor share';
        end if;
        if locals.n_debitor_shares < 1 then
            raise '"mimo" type transactions must have at least one debitor share';
        end if;
    end if;

    return true;
end
$$ language plpgsql
set search_path = "$user", public;

alter table transaction_revision add constraint check_committed_transactions
    check (check_committed_transactions(id, transaction_id));

alter table purchase_item_history add constraint check_purchase_item_communist_shares_gte_zero check (communist_shares >= 0);
alter table purchase_item_usage add constraint check_purchase_item_usage_shares_gt_zero check (share_amount > 0);

create or replace function check_committed_accounts(
    revision_id bigint, account_id integer
) returns boolean
    language plpgsql as
$$
<<locals>> declare
    n_tags            int;
    n_clearing_shares int;
    group_id          int;
    account_type      text;
    date_info         date;
begin
    select
        a.type,
        a.group_id
    into locals.account_type, locals.group_id
    from
        account a
    where
            a.id = check_committed_accounts.account_id;

    select
        count(cas.share_account_id)
    into locals.n_clearing_shares
    from
        clearing_account_share cas
    where
            cas.account_id = check_committed_accounts.account_id
        and cas.revision_id = check_committed_accounts.revision_id;

    select
        count(*)
    into locals.n_tags
    from
        account_to_tag att
    where
            att.account_id = check_committed_accounts.account_id
        and att.revision_id = check_committed_accounts.revision_id;

    select
        ah.date_info
    into locals.date_info
    from
        account_history ah
    where
            ah.id = check_committed_accounts.account_id
        and ah.revision_id = check_committed_accounts.revision_id;

    if locals.account_type = 'personal' then
        if locals.n_clearing_shares != 0 then
            raise '"personal" type accounts cannot have associated settlement distribution shares';
        end if;
        if locals.date_info is not null then
            raise '"personal" type accounts cannot have a date set';
        end if;
        if locals.n_tags != 0 then
            raise '"personal" type accounts cannot have tags';
        end if;
    elsif locals.account_type = 'clearing' then
        if locals.date_info is null then
            raise '"clearing" type accounts must have a date set';
        end if;
    end if;

    return true;
end
$$
set search_path = "$user", public;

create or replace function check_committed_accounts(
    revision_id bigint,
    account_id integer
) returns boolean as
$$
<<locals>> declare
    n_clearing_shares int;
    group_id          int;
    account_type      text;
    account_deleted   boolean;
begin
    select
        a.type,
        ah.deleted,
        a.group_id
    into locals.account_type, locals.account_deleted, locals.group_id
    from
        account a
        left join account_history ah on a.id = ah.id and ah.revision_id = check_committed_accounts.revision_id
    where a.id = check_committed_accounts.account_id;

    select
        count(cas.share_account_id)
    into locals.n_clearing_shares
    from
        clearing_account_share cas
    where
            cas.account_id = check_committed_accounts.account_id
        and cas.revision_id = check_committed_accounts.revision_id;

    if locals.account_type = 'personal' then
        if locals.n_clearing_shares != 0 then
            raise '"personal" type accounts cannot have associated settlement distribution shares';
        end if;
    end if;

    return true;
end
$$ language plpgsql
set search_path = "$user", public;

alter table account_revision add constraint check_committed_accounts
    check (check_committed_accounts(id, account_id));

create or replace function check_clearing_accounts_for_cyclic_dependencies(
    revision_id bigint,
    account_id integer
) returns boolean as
$$
<<locals>> declare
    group_id          int;
    account_type      text;

    n_clearing_shares int;

    cycle_path        int[];
begin
    select
        a.type,
        a.group_id
    into locals.account_type, locals.group_id
    from
        account a
    where a.id = check_clearing_accounts_for_cyclic_dependencies.account_id;

    select
        count(cas.share_account_id)
    into locals.n_clearing_shares
    from
        clearing_account_share cas
    where
            cas.account_id = check_clearing_accounts_for_cyclic_dependencies.account_id
        and cas.revision_id = check_clearing_accounts_for_cyclic_dependencies.revision_id;

    -- now for the juicy part - check if we have circular dependencies in clearing account relations
    with recursive search_graph(account_id, share_account_id, depth, path, cycle) as (
        select shares.account_id, shares.share_account_id, 1, array[shares.account_id], false
        from clearing_account_share shares
        where shares.revision_id = check_clearing_accounts_for_cyclic_dependencies.revision_id
        union all
        select shares.account_id, shares.share_account_id, sg.depth + 1, sg.path || shares.account_id, shares.account_id = any(sg.path)
        from clearing_account_share shares
        join account a on shares.account_id = a.id
        join search_graph sg on sg.share_account_id = shares.account_id and not sg.cycle
        where a.group_id = locals.group_id -- slight optimization for runtime
    )
    select path into locals.cycle_path from search_graph where cycle limit 1;
    -- TODO: good error message and print out all resulting cycles
    if found then
        raise 'this change would result in a cyclic dependency between clearing accounts: %', locals.cycle_path;
    end if;

    return true;
end
$$ language plpgsql
set search_path = "$user", public;

alter table account_revision add constraint account_revision_check_cyclic
    check (check_clearing_accounts_for_cyclic_dependencies(id, account_id));

alter table account_history add constraint name_not_empty check ( name <> '' );
alter table transaction_history add constraint name_not_empty check ( name <> '' );
alter table grp add constraint name_not_empty check ( name <> '' );
alter table purchase_item_history add constraint name_not_empty check ( name <> '' );

alter table file_history add constraint filename_not_empty check (filename <> '');

create or replace function check_transaction_currency_conversion_rate(
    transaction_id bigint,
    currency_conversion_rate double precision,
    currency_identifier text
) returns boolean as
$$
<<locals>> declare
    group_currency_identifier text;
begin
    select g.currency_identifier into locals.group_currency_identifier
    from grp as g join transaction as t on g.id = t.id where t.id = check_transaction_currency_conversion_rate.transaction_id;

    if locals.group_currency_identifier = check_transaction_currency_conversion_rate.currency_identifier
           and check_transaction_currency_conversion_rate.currency_conversion_rate != 1.0 then
        raise 'transactions with the same currency as the group currency must have a currency conversion rate of "1"';
    end if;

    return true;
end
$$ language plpgsql
set search_path = "$user", public;

alter table transaction_history add constraint currency_conversion_fixed_for_group_currency
    check (check_transaction_currency_conversion_rate(id, currency_conversion_rate, currency_identifier));
