-- revision: f133b1d3
-- requires: b32893f6

alter table purchase_item_history drop constraint purchase_item_history_price_check;
alter table transaction_history drop constraint transaction_history_value_check;
