# pylint: disable=missing-kwoa,unexpected-keyword-arg
from datetime import date, datetime

import pytest

from abrechnung.application.accounts import AccountService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import (
    NewTransaction,
    NewTransactionPosition,
    SplitMode,
    Transaction,
    TransactionPosition,
    TransactionType,
    UpdateTransaction,
)
from abrechnung.domain.users import User

from .conftest import CreateTestAccount, CreateTestPurchase


async def test_list_transactions(
    transaction_service: TransactionService,
    dummy_group: Group,
    dummy_user: User,
    create_test_account: CreateTestAccount,
    create_test_purchase: CreateTestPurchase,
):
    account = await create_test_account(group_id=dummy_group.id)
    transaction1 = await create_test_purchase(
        group_id=dummy_group.id,
        value=122.22,
        creditor_id=account.id,
        debitor_shares={account.id: 1.0},
    )
    transaction2 = await create_test_purchase(
        group_id=dummy_group.id,
        value=122.22,
        creditor_id=account.id,
        debitor_shares={account.id: 1.0},
    )
    transactions = await transaction_service.list_transactions(user=dummy_user, group_id=dummy_group.id)
    assert len(transactions) == 2
    assert {transaction1.id, transaction2.id} == set([e.id for e in transactions])

    transaction3 = await create_test_purchase(
        group_id=dummy_group.id,
        value=100,
        creditor_id=account.id,
        debitor_shares={account.id: 1.0},
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
        additional_transactions=[transaction3.id],
    )
    assert len(transactions) == 1


async def test_update_transaction(
    transaction_service: TransactionService,
    dummy_group: Group,
    dummy_user: User,
    create_test_account: CreateTestAccount,
):
    account1 = await create_test_account(group_id=dummy_group.id)
    account2 = await create_test_account(group_id=dummy_group.id)
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
            creditor_shares={account1.id: 1.0},
            debitor_shares={account2.id: 1.0},
            split_mode=SplitMode.shares,
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
            creditor_shares={account2.id: 1.0},
            debitor_shares={account1.id: 1.0},
            split_mode=SplitMode.shares,
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
            creditor_shares={account2.id: 1.0},
            debitor_shares={account1.id: 1.0},
            split_mode=SplitMode.shares,
        ),
    )
    t = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert t.value == 100.0
    assert t.description == "foobar"
    assert t.currency_identifier == "EUR"
    assert t.currency_conversion_rate == 1.0


async def test_account_deletion(
    account_service: AccountService,
    transaction_service: TransactionService,
    dummy_group: Group,
    dummy_user: User,
    create_test_account: CreateTestAccount,
):
    account1 = await create_test_account(
        group_id=dummy_group.id,
    )
    account2 = await create_test_account(
        group_id=dummy_group.id,
    )
    account3 = await create_test_account(
        group_id=dummy_group.id,
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
            debitor_shares={account2.id: 1.0},
            creditor_shares={account3.id: 1.0},
            split_mode=SplitMode.shares,
        ),
    )

    # we can delete the account when nothing depends on it
    await account_service.delete_account(user=dummy_user, group_id=dummy_group.id, account_id=account1.id)

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
                creditor_shares={account1.id: 1.0},
                debitor_shares={account2.id: 1.0},
                split_mode=SplitMode.shares,
            ),
        )

    with pytest.raises(Exception):
        await account_service.delete_account(user=dummy_user, account_id=account2.id)

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
            creditor_shares={account3.id: 1.0},
            debitor_shares={account3.id: 1.0},
            split_mode=SplitMode.shares,
        ),
    )
    # we should not be able to delete this account as changes depend on it
    await account_service.delete_account(user=dummy_user, group_id=dummy_group.id, account_id=account2.id)


async def test_purchase_items(
    transaction_service: TransactionService,
    dummy_group: Group,
    dummy_user: User,
    create_test_account: CreateTestAccount,
):
    account1 = await create_test_account(
        group_id=dummy_group.id,
    )
    account2 = await create_test_account(
        group_id=dummy_group.id,
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
            debitor_shares={account1.id: 1.0},
            creditor_shares={account2.id: 1.0},
            split_mode=SplitMode.shares,
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
            debitor_shares={account1.id: 1.0},
            creditor_shares={account2.id: 1.0},
            split_mode=SplitMode.shares,
            changed_positions=[
                TransactionPosition(
                    id=position_id,
                    name="carrots",
                    price=12.22,
                    communist_shares=1,
                    usages={account2.id: 1.0},
                    deleted=False,
                )
            ],
        ),
    )

    t = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert t.positions is not None
    assert len(t.positions) == 1
    assert account2.id in t.positions[0].usages
