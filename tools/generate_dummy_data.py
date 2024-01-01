# pylint: disable=missing-kwoa
import argparse
import asyncio
import random
from datetime import date, datetime, timedelta
from pathlib import Path

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import read_config
from abrechnung.domain.accounts import AccountType, NewAccount
from abrechnung.domain.transactions import (
    NewTransaction,
    NewTransactionPosition,
    TransactionType,
)
from abrechnung.framework.database import create_db_pool


def random_date() -> date:
    return (datetime.now() + timedelta(days=random.randint(-50, 50))).date()


async def main(
    config_path: str,
    group_name: str,
    n_purchases: int,
    n_transfers: int,
    n_accounts: int,
    n_events: int,
    people_per_transaction: int,
    user_id: int,
):
    config = read_config(Path(config_path))

    db_pool = await create_db_pool(config.database)
    user_service = UserService(db_pool, config)
    group_service = GroupService(db_pool, config)
    account_service = AccountService(db_pool, config)
    transaction_service = TransactionService(db_pool, config)

    user = await user_service.get_user(user_id=user_id)
    print(f"Creating group {group_name}")
    group_id = await group_service.create_group(
        user=user,
        name=group_name,
        description="",
        currency_symbol="€",
        add_user_account_on_join=False,
        terms="",
    )

    account_ids = []
    print(f"Generating {n_accounts} accounts")
    for i in range(n_accounts):
        account_id = await account_service.create_account(
            user=user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name=f"Account {i}",
                description="",
            ),
        )
        account_ids.append(account_id)

    event_ids = []
    print(f"Generating {n_events} events")
    for i in range(n_events):
        # TODO: better random distribution
        n_involved = random.randint(
            max(2, people_per_transaction - 4),
            min(n_accounts, people_per_transaction + 4),
        )
        shares = random.choices(account_ids, k=n_involved)
        clearing_shares = {k: 1.0 for k in shares}
        event_id = await account_service.create_account(
            user=user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.clearing,
                name=f"Event {i}",
                description="",
                date_info=random_date(),
                clearing_shares=clearing_shares,
            ),
        )
        event_ids.append(event_id)

    account_ids = account_ids + event_ids
    transaction_ids = []
    print(f"Generating {n_purchases} purchases")
    for i in range(n_purchases):
        # TODO: better random distribution
        n_involved = random.randint(
            max(2, people_per_transaction - 4),
            min(n_accounts + n_events, people_per_transaction + 4),
        )
        value = random.random() * 100
        debitors = random.choices(account_ids, k=n_involved)
        debitor_shares = {k: 1.0 for k in debitors}
        creditor = random.choice(account_ids)
        creditor_shares = {creditor: 1.0}
        positions = []
        n_positions = random.randint(0, 30)
        for pos_i in range(n_positions):
            max_position_price = value / n_positions
            pos_participants = random.choices(account_ids, k=random.randint(1, n_involved))
            positions.append(
                NewTransactionPosition(
                    name=f"Position {pos_i}",
                    communist_shares=0,
                    usages={k: 1.0 for k in pos_participants},
                    price=random.random() * max_position_price,
                )
            )
        transaction_id = await transaction_service.create_transaction(
            user=user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                value=value,
                name=f"Purchase {i}",
                description="",
                billed_at=random_date(),
                currency_symbol="€",
                currency_conversion_rate=1.0,
                tags=[],
                creditor_shares=creditor_shares,
                debitor_shares=debitor_shares,
                new_positions=positions,
            ),
        )
        transaction_ids.append(transaction_id)

    print(f"Generating {n_transfers} transfers")
    for i in range(n_transfers):
        debitor = random.choice(account_ids)
        debitor_shares = {debitor: 1.0}
        creditor = random.choice(account_ids)
        creditor_shares = {creditor: 1.0}
        transaction_id = await transaction_service.create_transaction(
            user=user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.transfer,
                value=random.random() * 200,
                name=f"Transfer {i}",
                description="",
                billed_at=random_date(),
                currency_symbol="€",
                currency_conversion_rate=1.0,
                tags=[],
                creditor_shares=creditor_shares,
                debitor_shares=debitor_shares,
            ),
        )
        transaction_ids.append(transaction_id)

    print("Finished generating dummy data")


def parse_args():
    cli = argparse.ArgumentParser()

    cli.add_argument(
        "-c",
        "--config-path",
        default="/etc/abrechnung/abrechnung.yaml",
        help="config file, default: %(default)s",
    )
    cli.add_argument(
        "--group-name",
        required=True,
        type=str,
        help="name for the generated group",
    )
    cli.add_argument(
        "--user-id",
        required=True,
        type=int,
        help="user id for the user used to simulate group creation",
    )
    cli.add_argument(
        "--n-purchases",
        type=int,
        default=40,
        help="number of purchases to generate",
    )
    cli.add_argument(
        "--n-transfers",
        type=int,
        default=10,
        help="number of transfers to generate",
    )
    cli.add_argument(
        "--n-accounts",
        type=int,
        default=6,
        help="number of accounts to generate",
    )
    cli.add_argument(
        "--n-events",
        type=int,
        default=20,
        help="number of events to generate",
    )
    cli.add_argument(
        "--average-people-per-transaction",
        type=int,
        default=3,
        help="average number of people participating in transactions",
    )
    return cli.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(
        main(
            config_path=args.config_path,
            user_id=args.user_id,
            group_name=args.group_name,
            n_purchases=args.n_purchases,
            n_transfers=args.n_transfers,
            n_accounts=args.n_accounts,
            n_events=args.n_events,
            people_per_transaction=args.average_people_per_transaction,
        )
    )
