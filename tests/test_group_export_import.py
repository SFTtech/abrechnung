import base64
from pathlib import Path

import pytest

from abrechnung.application.accounts import AccountService
from abrechnung.application.export_import import ExportImportService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.export_import import GroupJsonExportV1
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import NewFile, NewTransactionPosition
from abrechnung.domain.users import User
from tests.conftest import CreateTestAccount, CreateTestEvent, CreateTestPurchase, CreateTestTransfer

asset_base_path = Path(__file__).parent / "assets"
dump_assets_base_path = asset_base_path / "dumps"

test_image = base64.b64encode((asset_base_path / "test_image.jpg").read_bytes())


async def test_basic_json_export_import(
    group_service: GroupService,
    account_service: AccountService,
    transaction_service: TransactionService,
    export_import_service: ExportImportService,
    dummy_group: Group,
    dummy_user: User,
    create_test_account: CreateTestAccount,
    create_test_event: CreateTestEvent,
    create_test_purchase: CreateTestPurchase,
    create_test_transfer: CreateTestTransfer,
):
    account1 = await create_test_account(group_id=dummy_group.id)
    account2 = await create_test_account(group_id=dummy_group.id)
    event1 = await create_test_event(group_id=dummy_group.id, clearing_shares={account1.id: 1.0, account2.id: 1.0})
    await create_test_purchase(
        group_id=dummy_group.id, value=10, creditor_id=account1.id, debitor_shares={account1.id: 1.0, account2.id: 2.0}
    )
    await create_test_purchase(
        group_id=dummy_group.id, value=14, creditor_id=account2.id, debitor_shares={event1.id: 1.0}
    )
    await create_test_purchase(
        group_id=dummy_group.id,
        value=22,
        creditor_id=account1.id,
        debitor_shares={account2.id: 1.0},
        positions=[
            NewTransactionPosition(
                name="position1", price=2, communist_shares=1.0, usages={account1.id: 1.0, event1.id: 1.0}
            ),
            NewTransactionPosition(
                name="position2", price=3.0, communist_shares=0.0, usages={account1.id: 2.0, account2.id: 1.0}
            ),
        ],
        files=[NewFile(filename="file1", mime_type="image/jpeg", content=test_image.decode("utf-8"))],
    )
    await create_test_transfer(group_id=dummy_group.id, value=10, creditor_id=account2.id, debitor_id=account1.id)
    dump: GroupJsonExportV1 = await export_import_service.export_group_as_json(user=dummy_user, group_id=dummy_group.id)

    group_id, _ = await export_import_service.import_group_from_json(
        user=dummy_user, group_json_dump=dump.model_dump_json()
    )
    new_group: Group = await group_service.get_group(user=dummy_user, group_id=group_id)
    assert new_group.name == dummy_group.name
    assert new_group.description == dummy_group.description
    assert new_group.currency_identifier == dummy_group.currency_identifier
    assert new_group.terms == dummy_group.terms
    assert new_group.add_user_account_on_join == dummy_group.add_user_account_on_join

    accounts = await account_service.list_accounts(user=dummy_user, group_id=group_id)
    assert len(accounts) == 3
    transactions = await transaction_service.list_transactions(user=dummy_user, group_id=group_id)
    assert len(transactions) == 4


def remap_dump_account_ids(dump: GroupJsonExportV1, account_mapping: dict[int, int]):
    def remap_shares(shares: dict[int, float]) -> dict[int, float]:
        result = {}
        for acc_id, val in shares.items():
            result[account_mapping[acc_id]] = val
        return result

    for account in dump.personal_accounts:
        account.id = account_mapping[account.id]

    for event in dump.events:
        event.id = account_mapping[event.id]
        event.clearing_shares = remap_shares(event.clearing_shares)

    for transaction in dump.transactions:
        transaction.creditor_shares = remap_shares(transaction.creditor_shares)
        transaction.debitor_shares = remap_shares(transaction.debitor_shares)
        for position in transaction.positions:
            position.usages = remap_shares(position.usages)


def remove_ids_from_transactions(transactions: list[dict]):
    for t in transactions:
        del t["id"]
        for position in t["positions"]:
            del position["id"]


@pytest.mark.parametrize("dump_file,dump_class", [(dump_assets_base_path / "basic.json", GroupJsonExportV1)])
async def test_export_import_idempotence(
    export_import_service: ExportImportService, dummy_user: User, dump_file: Path, dump_class
):
    dump = dump_file.read_text()
    dump_validated = dump_class.model_validate_json(dump)
    group_id, account_mapping = await export_import_service.import_group_from_json(
        user=dummy_user, group_json_dump=dump
    )
    reexported_dump: GroupJsonExportV1 = await export_import_service.export_group_as_json(
        user=dummy_user, group_id=group_id
    )
    remap_dump_account_ids(dump_validated, account_mapping)

    # compare dicts here to get proper pytest diffs upon errors
    original = dump_validated.model_dump()
    remove_ids_from_transactions(original["transactions"])
    reexported = reexported_dump.model_dump()
    remove_ids_from_transactions(reexported["transactions"])
    assert original == reexported
