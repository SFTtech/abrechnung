-- migration: b16c7901
-- requires: 8e8769af

create table tmp_currency_mapping (
    symbol text not null,
    identifier text not null,
    primary key (symbol, identifier)
);

insert into
    tmp_currency_mapping (identifier, symbol)
values ('AED', 'د.إ;'),
    ('AFN', 'Afs'),
    ('ALL', 'L'),
    ('AMD', 'AMD'),
    ('ANG', 'NAƒ'),
    ('AOA', 'Kz'),
    ('AWG', 'ƒ'),
    ('AZN', 'AZN'),
    ('BAM', 'KM'),
    ('BBD', 'Bds$'),
    ('BDT', '৳'),
    ('BGN', 'BGN'),
    ('BHD', '.د.ب'),
    ('BIF', 'FBu'),
    ('BMD', 'BD$'),
    ('BND', 'B$'),
    ('BOB', 'Bs.'),
    ('BRL', 'R$'),
    ('BSD', 'B$'),
    ('BTC', '₿'),
    ('BTN', 'Nu.'),
    ('BWP', 'P'),
    ('BYR', 'Br'),
    ('BZD', 'BZ$'),
    ('CDF', 'F'),
    ('CHF', 'Fr.'),
    ('CNY', '¥'),
    ('COP', 'Col$'),
    ('CRC', '₡'),
    ('CVE', 'Esc'),
    ('CZK', 'Kč'),
    ('DJF', 'Fdj'),
    ('DKK', 'Kr'),
    ('DOP', 'RD$'),
    ('DZD', 'د.ج'),
    ('EEK', 'KR'),
    ('EGP', '£'),
    ('ERN', 'Nfa'),
    ('ETB', 'Br'),
    ('EUR', '€'),
    ('FJD', 'FJ$'),
    ('FKP', '£'),
    ('GBP', '£'),
    ('GEL', 'GEL'),
    ('GHS', 'GH₵'),
    ('GIP', '£'),
    ('GMD', 'D'),
    ('GNF', 'FG'),
    ('GQE', 'CFA'),
    ('GTQ', 'Q'),
    ('GYD', 'GY$'),
    ('HKD', 'HK$'),
    ('HNL', 'L'),
    ('HRK', 'kn'),
    ('HTG', 'G'),
    ('HUF', 'Ft'),
    ('IDR', 'Rp'),
    ('ILS', '₪'),
    ('INR', '₹'),
    ('IQD', 'د.ع'),
    ('IRR', 'IRR'),
    ('ISK', 'kr'),
    ('JMD', 'J$'),
    ('JOD', 'JOD'),
    ('JPY', '¥'),
    ('KES', 'KSh'),
    ('KGS', 'сом'),
    ('KHR', '៛'),
    ('KMF', 'KMF'),
    ('KPW', 'W'),
    ('KRW', 'W'),
    ('KWD', 'KWD'),
    ('KYD', 'KY$'),
    ('KZT', 'T'),
    ('LAK', 'KN'),
    ('LBP', '£'),
    ('LKR', 'Rs'),
    ('LRD', 'L$'),
    ('LSL', 'M'),
    ('LTL', 'Lt'),
    ('LVL', 'Ls'),
    ('LYD', 'LD'),
    ('MAD', 'MAD'),
    ('MDL', 'MDL'),
    ('MGA', 'FMG'),
    ('MKD', 'MKD'),
    ('MMK', 'K'),
    ('MNT', '₮'),
    ('MOP', 'P'),
    ('MRO', 'UM'),
    ('MUR', 'Rs'),
    ('MVR', 'Rf'),
    ('MWK', 'MK'),
    ('MYR', 'RM'),
    ('MZN', 'MT'),
    ('NAD', 'N$'),
    ('NGN', '₦'),
    ('NIO', 'C$'),
    ('NOK', 'kr'),
    ('NPR', 'NRs'),
    ('NZD', 'NZ$'),
    ('OMR', 'OMR'),
    ('PAB', 'B./'),
    ('PEN', 'S/.'),
    ('PGK', 'K'),
    ('PHP', '₱'),
    ('PKR', 'Rs.'),
    ('PLN', 'zł'),
    ('PYG', '₲'),
    ('QAR', 'QR'),
    ('RON', 'L'),
    ('RSD', 'din.'),
    ('RUB', '₽'),
    ('RWF', 'FRw'),
    ('SAR', 'SR'),
    ('SBD', 'SI$'),
    ('SCR', 'SR'),
    ('SDG', 'SDG'),
    ('SEK', 'kr'),
    ('SGD', 'S$'),
    ('SHP', '£'),
    ('SLL', 'Le'),
    ('SOS', 'Sh.'),
    ('STD', 'Db'),
    ('STN', 'Db'),
    ('SYP', 'LS'),
    ('SZL', 'E'),
    ('THB', '฿'),
    ('TJS', 'TJS'),
    ('TMT', 'm'),
    ('TND', 'DT'),
    ('TOP', 'T$'),
    ('TRY', 'TRY'),
    ('TTD', 'TT$'),
    ('TWD', 'NT$'),
    ('TZS', 'TZS'),
    ('UAH', 'UAH'),
    ('UGX', 'USh'),
    ('USD', '$'),
    ('UYU', '$U'),
    ('UZS', 'UZS'),
    ('VEB', 'Bs'),
    ('VND', '₫'),
    ('VUV', 'VT'),
    ('WST', 'WS$'),
    ('XAF', 'CFA'),
    ('XCD', 'EC$'),
    ('XDR', 'SDR'),
    ('XOF', 'CFA'),
    ('XPF', 'F'),
    ('YER', 'YER'),
    ('ZAR', 'R'),
    ('ZMW', 'ZK'),
    ('ZWR', 'Z$');

create or replace function get_currency_identifier_for_symbol(
    symbol text
) returns text as
$$
<<locals>> declare
    identifier text;
begin
    select c.identifier into locals.identifier from tmp_currency_mapping c where c.symbol = get_currency_identifier_for_symbol.symbol;
    if locals.identifier is null then
        locals.identifier := 'CUSTOM:' || get_currency_identifier_for_symbol.symbol;
    end if;
    return locals.identifier;
end
$$ language plpgsql;

alter table grp add column currency_identifier text;

update grp
set
    currency_identifier = get_currency_identifier_for_symbol (currency_symbol);

alter table grp drop column currency_symbol;

alter table transaction_history add column currency_identifier text;

update transaction_history
set
    currency_identifier = get_currency_identifier_for_symbol (currency_symbol);

alter table transaction_history drop column currency_symbol;

drop table tmp_currency_mapping;
