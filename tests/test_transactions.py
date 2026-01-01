# pylint: disable=missing-kwoa,unexpected-keyword-arg
from datetime import date, datetime

import pytest

from abrechnung.application.accounts import AccountService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.accounts import AccountType, NewAccount
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import (
    NewTransaction,
    NewTransactionPosition,
    Transaction,
    TransactionPosition,
    TransactionType,
    UpdateTransaction,
)
from abrechnung.domain.users import User


async def create_dummy_account(account_service: AccountService, dummy_user: User, group_id: int, name: str) -> int:
    return await account_service.create_account(
        user=dummy_user,
        group_id=group_id,
        account=NewAccount(
            type=AccountType.personal,
            name=name,
            description=f"account {name} description",
        ),
    )


async def test_list_transactions(
    account_service: AccountService,
    transaction_service: TransactionService,
    dummy_group: Group,
    dummy_user: User,
):
    account_id = await create_dummy_account(
        account_service=account_service, dummy_user=dummy_user, group_id=dummy_group.id, name="account1"
    )
    transaction1_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=NewTransaction(
            type=TransactionType.purchase,
            name="name123",
            description="description123",
            currency_identifier="USD",
            tags=[],
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
            debitor_shares={account_id: 1.0},
            creditor_shares={account_id: 1.0},
            new_positions=[],
        ),
    )
    transaction2_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=NewTransaction(
            type=TransactionType.purchase,
            name="name123",
            description="description123",
            currency_identifier="EUR",
            tags=[],
            billed_at=date.today(),
            currency_conversion_rate=1,
            value=122.22,
            debitor_shares={account_id: 1.0},
            creditor_shares={account_id: 1.0},
            new_positions=[],
        ),
    )
    transactions = await transaction_service.list_transactions(user=dummy_user, group_id=dummy_group.id)
    assert len(transactions) == 2
    assert {transaction1_id, transaction2_id} == set([e.id for e in transactions])

    transaction3_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=NewTransaction(
            type=TransactionType.purchase,
            name="foobar",
            description="foobar",
            currency_identifier="EUR",
            billed_at=date.today(),
            currency_conversion_rate=1,
            tags=[],
            value=100,
            creditor_shares={account_id: 1.0},
            debitor_shares={account_id: 1.0},
            new_positions=[],
        ),
    )

    # check that the list endpoint without parameters returns all objects
    transactions = await transaction_service.list_transactions(user=dummy_user, group_id=dummy_group.id)
    assert len(transactions) == 3

    transactions = await transaction_service.list_transactions(
        user=dummy_user, group_id=dummy_group.id, min_last_changed=datetime.now()
    )
    assert len(transactions) == 0

    transactions = await transaction_service.list_transactions(
        user=dummy_user,
        group_id=dummy_group.id,
        min_last_changed=datetime.now(),
        additional_transactions=[transaction3_id],
    )
    assert len(transactions) == 1


async def test_update_transaction(
    account_service: AccountService, transaction_service: TransactionService, dummy_group: Group, dummy_user: User
):
    account1_id = await create_dummy_account(account_service, dummy_user, dummy_group.id, "account1")
    account2_id = await create_dummy_account(account_service, dummy_user, dummy_group.id, "account2")
    transaction_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=UpdateTransaction(
            type=TransactionType.purchase,
            name="name123",
            description="description123",
            currency_identifier="EUR",
            tags=[],
            billed_at=date.today(),
            currency_conversion_rate=1,
            value=122.22,
            creditor_shares={account1_id: 1.0},
            debitor_shares={account2_id: 1.0},
        ),
    )
    await transaction_service.update_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction_id=transaction_id,
        transaction=UpdateTransaction(
            type=TransactionType.purchase,
            value=200.0,
            name="some name",
            description="some description",
            billed_at=date.today(),
            currency_identifier="USD",
            currency_conversion_rate=2.0,
            tags=[],
            creditor_shares={account2_id: 1.0},
            debitor_shares={account1_id: 1.0},
        ),
    )

    t: Transaction = await transaction_service.get_transaction(
        user=dummy_user,
        transaction_id=transaction_id,
    )
    assert t.value == 200.0
    assert t.description == "some description"
    assert t.currency_identifier == "USD"
    assert t.currency_conversion_rate == 2.0

    await transaction_service.update_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction_id=transaction_id,
        transaction=UpdateTransaction(
            type=TransactionType.purchase,
            value=100.0,
            name="fiibaar",
            description="foobar",
            billed_at=date.today(),
            currency_identifier="EUR",
            currency_conversion_rate=1.0,
            tags=[],
            creditor_shares={account2_id: 1.0},
            debitor_shares={account1_id: 1.0},
        ),
    )
    t = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert t.value == 100.0
    assert t.description == "foobar"
    assert t.currency_identifier == "EUR"
    assert t.currency_conversion_rate == 1.0


async def test_account_deletion(
    account_service: AccountService, transaction_service: TransactionService, dummy_group: Group, dummy_user: User
):
    account1_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            type=AccountType.personal,
            name="account1",
            description="description",
        ),
    )
    account2_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            type=AccountType.personal,
            name="account2",
            description="description",
        ),
    )
    account3_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            type=AccountType.personal,
            name="account3",
            description="description",
        ),
    )
    transaction_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=NewTransaction(
            type=TransactionType.purchase,
            name="name123",
            description="description123",
            currency_identifier="EUR",
            billed_at=date.today(),
            currency_conversion_rate=1,
            tags=[],
            value=122.22,
            debitor_shares={account2_id: 1.0},
            creditor_shares={account3_id: 1.0},
        ),
    )

    # we can delete the account when nothing depends on it
    await account_service.delete_account(user=dummy_user, group_id=dummy_group.id, account_id=account1_id)

    # the account has been deleted, we should not be able to add more shares to it
    with pytest.raises(Exception):
        await transaction_service.update_transaction(
            user=dummy_user,
            group_id=dummy_group.id,
            transaction_id=transaction_id,
            transaction=UpdateTransaction(
                type=TransactionType.purchase,
                value=200.0,
                name="name123",
                description="description123",
                billed_at=date.today(),
                currency_identifier="USD",
                currency_conversion_rate=2.0,
                tags=[],
                creditor_shares={account1_id: 1.0},
                debitor_shares={account2_id: 1.0},
            ),
        )

    with pytest.raises(Exception):
        await account_service.delete_account(user=dummy_user, account_id=account2_id)

    await transaction_service.update_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction_id=transaction_id,
        transaction=UpdateTransaction(
            type=TransactionType.purchase,
            value=200.0,
            name="name123",
            description="description123",
            billed_at=date.today(),
            currency_identifier="EUR",
            currency_conversion_rate=1.0,
            tags=[],
            creditor_shares={account3_id: 1.0},
            debitor_shares={account3_id: 1.0},
        ),
    )
    # we should not be able to delete this account as changes depend on it
    await account_service.delete_account(user=dummy_user, group_id=dummy_group.id, account_id=account2_id)


async def test_purchase_items(
    account_service: AccountService, transaction_service: TransactionService, dummy_group: Group, dummy_user: User
):
    account1_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            type=AccountType.personal,
            name="account1",
            description="foobar",
        ),
    )
    account2_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            type=AccountType.personal,
            name="account2",
            description="foobar",
        ),
    )
    transaction_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=NewTransaction(
            type=TransactionType.purchase,
            name="name123",
            description="description123",
            currency_identifier="EUR",
            billed_at=date.today(),
            currency_conversion_rate=1,
            tags=[],
            value=122.22,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
            new_positions=[
                NewTransactionPosition(
                    name="carrots",
                    price=12.22,
                    communist_shares=1,
                    usages={},
                )
            ],
        ),
    )
    t = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert t.positions is not None
    assert len(t.positions) == 1
    position_id = t.positions[0].id
    await transaction_service.update_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction_id=transaction_id,
        transaction=UpdateTransaction(
            type=TransactionType.purchase,
            name="name123",
            description="description123",
            currency_identifier="EUR",
            billed_at=date.today(),
            currency_conversion_rate=1,
            tags=[],
            value=122.22,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
            changed_positions=[
                TransactionPosition(
                    id=position_id,
                    name="carrots",
                    price=12.22,
                    communist_shares=1,
                    usages={account2_id: 1.0},
                    deleted=False,
                )
            ],
        ),
    )

    t = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert t.positions is not None
    assert len(t.positions) == 1
    assert account2_id in t.positions[0].usages
