# pylint: disable=attribute-defined-outside-init,missing-kwoa,unexpected-keyword-arg
import base64
from datetime import datetime
from pathlib import Path

import pytest

from abrechnung.application.accounts import AccountService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.accounts import AccountType, ClearingAccount, NewAccount
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import (
    NewFile,
    NewTransaction,
    SplitMode,
    Transaction,
    TransactionType,
    UpdateFile,
    UpdateTransaction,
)
from abrechnung.domain.users import User


async def _create_accounts(
    account_service: AccountService,
    group: Group,
    user: User,
    n_accounts: int,
) -> list[int]:
    account_ids = []
    for i in range(n_accounts):
        acc_id = await account_service.create_account(
            user=user,
            group_id=group.id,
            account=NewAccount(
                type=AccountType.personal,
                name=f"account{i}",
                description="",
                date_info=None,
                deleted=False,
                tags=[],
            ),
        )
        account_ids.append(acc_id)

    return account_ids


async def test_basic_clearing_account_workflow(account_service: AccountService, dummy_group: Group, dummy_user: User):
    basic_account_id1, basic_account_id2 = await _create_accounts(account_service, dummy_group, dummy_user, 2)

    # check that we can create a simple clearing account
    account_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            type=AccountType.clearing,
            name="Clearing",
            description="Foobar",
            clearing_shares={basic_account_id1: 1.0, basic_account_id2: 2.0},
            date_info=datetime.now().date(),
        ),
    )

    account: ClearingAccount = await account_service.get_account(
        user=dummy_user, group_id=dummy_group.id, account_id=account_id
    )
    assert account.id == account_id
    assert account.clearing_shares[basic_account_id2] == 2.0
    assert account.clearing_shares[basic_account_id1] == 1.0

    await account_service.update_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account_id=account_id,
        account=NewAccount(
            name="Clearing",
            type=AccountType.clearing,
            description="Foobar",
            date_info=datetime.now().date(),
            clearing_shares={basic_account_id1: 1.0},
        ),
    )
    account = await account_service.get_account(user=dummy_user, group_id=dummy_group.id, account_id=account_id)
    assert basic_account_id2 not in account.clearing_shares


async def test_no_circular_clearing_accounts(account_service: AccountService, dummy_group: Group, dummy_user: User):
    # we need to commit one account first other
    account1_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            name="account1",
            type=AccountType.clearing,
            date_info=datetime.now().date(),
            clearing_shares={},
        ),
    )
    account2_id = await account_service.create_account(
        user=dummy_user,
        group_id=dummy_group.id,
        account=NewAccount(
            name="account2",
            type=AccountType.clearing,
            date_info=datetime.now().date(),
            clearing_shares={account1_id: 1.0},
        ),
    )

    with pytest.raises(Exception) as excinfo:
        await account_service.update_account(
            user=dummy_user,
            group_id=dummy_group.id,
            account_id=account1_id,
            account=NewAccount(
                name="account1",
                type=AccountType.clearing,
                date_info=datetime.now().date(),
                clearing_shares={account2_id: 1.0},
            ),
        )
        assert "this change would result in a cyclic dependency between clearing accounts" in str(excinfo.value)

    # check that we cannot have an account reference itself
    with pytest.raises(Exception):
        await account_service.update_account(
            user=dummy_user,
            group_id=dummy_group.id,
            account_id=account1_id,
            account=NewAccount(
                name="account1",
                type=AccountType.clearing,
                date_info=datetime.now().date(),
                clearing_shares={account1_id: 1.0},
            ),
        )


async def test_file_upload(
    account_service: AccountService, transaction_service: TransactionService, dummy_group: Group, dummy_user: User
):
    account1_id, account2_id = await _create_accounts(account_service, dummy_group, dummy_user, 2)
    image_file = Path(__file__).parent / "assets" / "test_image.jpg"
    image_content = image_file.read_bytes()
    file_size = len(image_content)
    image_base64 = base64.b64encode(image_content).decode("ascii")
    transaction_id = await transaction_service.create_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction=NewTransaction(
            type=TransactionType.purchase,
            name="foo",
            description="foo",
            billed_at=datetime.now().date(),
            currency_identifier="EUR",
            currency_conversion_rate=1.0,
            tags=[],
            value=33,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
            split_mode=SplitMode.shares,
            new_files=[
                NewFile(
                    filename="test file",
                    mime_type="image/jpeg",
                    content=image_base64,
                )
            ],
        ),
    )
    transaction: Transaction = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert len(transaction.files) == 1

    file_id = transaction.files[0].id
    blob_id = transaction.files[0].blob_id
    mime_type, retrieved_file = await transaction_service.read_file_contents(
        user=dummy_user,
        file_id=file_id,
        blob_id=blob_id,
    )
    assert mime_type == "image/jpeg"
    assert len(retrieved_file) == file_size

    await transaction_service.update_transaction(
        user=dummy_user,
        group_id=dummy_group.id,
        transaction_id=transaction_id,
        transaction=UpdateTransaction(
            type=TransactionType.purchase,
            name="foo",
            description="foo",
            billed_at=datetime.now().date(),
            currency_identifier="EUR",
            currency_conversion_rate=1.0,
            tags=[],
            value=33,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
            changed_files=[UpdateFile(id=file_id, filename="test file", deleted=True)],
            split_mode=SplitMode.shares,
        ),
    )
    transaction = await transaction_service.get_transaction(user=dummy_user, transaction_id=transaction_id)
    assert len(transaction.files) == 1
    assert transaction.files[0].deleted
