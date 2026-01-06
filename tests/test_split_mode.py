import secrets
from datetime import date

import pytest

from abrechnung.application.transactions import TransactionService
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import NewTransaction, NewTransactionPosition, SplitMode, TransactionType
from abrechnung.domain.users import User
from tests.conftest import CreateTestAccount


async def test_absolute_split_purchase(
    transaction_service: TransactionService,
    dummy_user: User,
    dummy_group: Group,
    create_test_account: CreateTestAccount,
):
    creditor = await create_test_account(dummy_group.id)
    deb1 = await create_test_account(dummy_group.id)
    deb2 = await create_test_account(dummy_group.id)

    tx = NewTransaction(
        type=TransactionType.purchase,
        name=secrets.token_hex(8),
        description="abs split",
        currency_identifier="EUR",
        currency_conversion_rate=1.0,
        value=30.0,
        creditor_shares={creditor.id: 1},
        debitor_shares={deb1.id: 10.0, deb2.id: 20.0},
        billed_at=date.today(),
        tags=[],
        new_files=[],
        new_positions=[],
        split_mode=SplitMode.absolute,
    )
    tx_id = await transaction_service.create_transaction(user=dummy_user, group_id=dummy_group.id, transaction=tx)
    result = await transaction_service.get_transaction(user=dummy_user, transaction_id=tx_id)
    assert result.split_mode == SplitMode.absolute


async def test_invalid_absolute_split_purchase(
    transaction_service: TransactionService,
    dummy_user: User,
    dummy_group: Group,
    create_test_account: CreateTestAccount,
):
    creditor = await create_test_account(dummy_group.id)
    deb1 = await create_test_account(dummy_group.id)
    deb2 = await create_test_account(dummy_group.id)

    tx = NewTransaction(
        type=TransactionType.purchase,
        name=secrets.token_hex(8),
        description="abs split",
        currency_identifier="EUR",
        currency_conversion_rate=1.0,
        value=30.0,
        creditor_shares={creditor.id: 1.0},
        debitor_shares={deb1.id: 10.0, deb2.id: 10.0},
        billed_at=date.today(),
        tags=[],
        new_files=[],
        new_positions=[],
        split_mode=SplitMode.absolute,
    )
    with pytest.raises(Exception):
        # not all debitors sum up to the transaction value
        await transaction_service.create_transaction(user=dummy_user, group_id=dummy_group.id, transaction=tx)

    position = NewTransactionPosition(
        name=secrets.token_hex(8), price=10.0, communist_shares=0.0, usages={deb1.id: 2.0, deb2.id: 3.0}
    )
    tx.debitor_shares = {deb1.id: 10.0, deb2.id: 20.0}
    tx.new_positions = [position]
    with pytest.raises(Exception):
        # positions are not allowed with absolute split mode
        await transaction_service.create_transaction(user=dummy_user, group_id=dummy_group.id, transaction=tx)


async def test_percent_split_purchase(
    transaction_service: TransactionService,
    dummy_user: User,
    dummy_group: Group,
    create_test_account: CreateTestAccount,
):
    creditor = await create_test_account(dummy_group.id)
    deb1 = await create_test_account(dummy_group.id)
    deb2 = await create_test_account(dummy_group.id)

    position = NewTransactionPosition(
        name=secrets.token_hex(8), price=10.0, communist_shares=0.0, usages={deb1.id: 0.5, deb2.id: 0.5}
    )
    tx = NewTransaction(
        type=TransactionType.purchase,
        name=secrets.token_hex(8),
        description="abs split",
        currency_identifier="EUR",
        currency_conversion_rate=1.0,
        value=30.0,
        creditor_shares={creditor.id: 1},
        debitor_shares={deb1.id: 0.2, deb2.id: 0.8},
        billed_at=date.today(),
        tags=[],
        new_files=[],
        new_positions=[position],
        split_mode=SplitMode.percent,
    )
    tx_id = await transaction_service.create_transaction(user=dummy_user, group_id=dummy_group.id, transaction=tx)
    result = await transaction_service.get_transaction(user=dummy_user, transaction_id=tx_id)
    assert result.split_mode == SplitMode.percent


async def test_invalid_percent_split_purchase(
    transaction_service: TransactionService,
    dummy_user: User,
    dummy_group: Group,
    create_test_account: CreateTestAccount,
):
    creditor = await create_test_account(dummy_group.id)
    deb1 = await create_test_account(dummy_group.id)
    deb2 = await create_test_account(dummy_group.id)

    tx = NewTransaction(
        type=TransactionType.purchase,
        name=secrets.token_hex(8),
        description="abs split",
        currency_identifier="EUR",
        currency_conversion_rate=1.0,
        value=30.0,
        creditor_shares={creditor.id: 1.0},
        debitor_shares={deb1.id: 0.1, deb2.id: 0.8},
        billed_at=date.today(),
        tags=[],
        new_files=[],
        new_positions=[],
        split_mode=SplitMode.percent,
    )
    with pytest.raises(Exception):
        # not all debitors sum up to 1.0
        await transaction_service.create_transaction(user=dummy_user, group_id=dummy_group.id, transaction=tx)
