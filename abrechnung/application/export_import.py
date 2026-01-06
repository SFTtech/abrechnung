import base64
import json
import typing

from sftkit.database import Connection, Pool
from sftkit.error import InvalidArgument
from sftkit.service import Service, with_db_transaction

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.config import Config
from abrechnung.core.decorators import requires_group_permissions
from abrechnung.domain.accounts import Account, AccountType, ClearingAccount, NewAccount, PersonalAccount
from abrechnung.domain.export_import import (
    ClearingAccountJsonExportV1,
    FileAttachmentJsonExportV1,
    GroupJsonExportV1,
    GroupMetadataExportV1,
    PersonalAccountJsonExportV1,
    TransactionJsonExportV1,
    TransactionPositionJsonExportV1,
)
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import NewFile, NewTransaction, NewTransactionPosition, Transaction
from abrechnung.domain.users import User


def _personal_account_to_export(account: PersonalAccount) -> PersonalAccountJsonExportV1:
    return PersonalAccountJsonExportV1(id=account.id, name=account.name, description=account.description)


def _clearing_account_to_export(account: ClearingAccount) -> ClearingAccountJsonExportV1:
    return ClearingAccountJsonExportV1(
        id=account.id,
        name=account.name,
        description=account.description,
        date_info=account.date_info,
        clearing_shares=account.clearing_shares,
        tags=account.tags,
    )


class ExportImportService(Service[Config]):
    def __init__(
        self,
        db_pool: Pool,
        config: Config,
        group_service: GroupService,
        account_service: AccountService,
        transaction_service: TransactionService,
    ):
        super().__init__(db_pool, config)

        self.group_service = group_service
        self.account_service = account_service
        self.transaction_service = transaction_service

    async def _transactions_to_export(
        self, conn: Connection, user: User, transactions: list[Transaction]
    ) -> list[TransactionJsonExportV1]:
        mapped = []
        for transaction in transactions:
            mapped_files = []
            for file in transaction.files:
                mime_type, content = await self.transaction_service.read_file_contents(
                    conn=conn, user=user, file_id=file.id, blob_id=file.blob_id
                )
                mapped_files.append(
                    FileAttachmentJsonExportV1(
                        filename=file.filename, mime_type=mime_type, content=base64.b64encode(content).decode("utf-8")
                    )
                )
            mapped_positions = []
            for position in transaction.positions:
                mapped_positions.append(
                    TransactionPositionJsonExportV1(
                        id=position.id,
                        name=position.name,
                        price=position.price,
                        communist_shares=position.communist_shares,
                        usages=position.usages,
                    )
                )

            mapped.append(
                TransactionJsonExportV1(
                    id=transaction.id,
                    type=transaction.type,
                    name=transaction.name,
                    description=transaction.description,
                    value=transaction.value,
                    currency_identifier=transaction.currency_identifier,
                    currency_conversion_rate=transaction.currency_conversion_rate,
                    billed_at=transaction.billed_at,
                    tags=transaction.tags,
                    creditor_shares=transaction.creditor_shares,
                    debitor_shares=transaction.debitor_shares,
                    positions=mapped_positions,
                    files=mapped_files,
                    split_mode=transaction.split_mode,
                )
            )
        return mapped

    @with_db_transaction
    @requires_group_permissions()
    async def export_group_as_json(self, *, conn: Connection, user: User, group_id: int) -> GroupJsonExportV1:
        group_details: Group = await self.group_service.get_group(conn=conn, user=user, group_id=group_id)
        accounts: list[Account] = await self.account_service.list_accounts(conn=conn, user=user, group_id=group_id)
        personal_accounts = list(
            map(
                _personal_account_to_export,
                typing.cast(list[PersonalAccount], filter(lambda acc: acc.type == "personal", accounts)),
            )
        )
        events = list(
            map(
                _clearing_account_to_export,
                typing.cast(list[ClearingAccount], filter(lambda acc: acc.type == "clearing", accounts)),
            )
        )

        transactions: list[Transaction] = await self.transaction_service.list_transactions(
            conn=conn, user=user, group_id=group_id
        )

        dump = GroupJsonExportV1(
            personal_accounts=personal_accounts,
            events=events,
            transactions=await self._transactions_to_export(conn=conn, user=user, transactions=transactions),
            metadata=GroupMetadataExportV1(
                name=group_details.name,
                description=group_details.description,
                terms=group_details.terms,
                currency_identifier=group_details.currency_identifier,
                add_user_account_on_join=group_details.add_user_account_on_join,
            ),
            version=1,
        )
        return dump

    async def _import_group_from_json_v1(
        self, *, conn: Connection, user: User, dump: GroupJsonExportV1
    ) -> tuple[int, dict[int, int]]:
        # mapping of account ids in the dump to account ids in the newly created group
        account_mapping: dict[int, int] = {}

        def remap_shares(shares: dict[int, float]) -> dict[int, float]:
            result = {}
            for acc_id, val in shares.items():
                result[account_mapping[acc_id]] = val
            return result

        group_id = await self.group_service.create_group(
            conn=conn,
            user=user,
            name=dump.metadata.name,
            description=dump.metadata.description,
            currency_identifier=dump.metadata.currency_identifier,
            add_user_account_on_join=dump.metadata.add_user_account_on_join,
            terms=dump.metadata.terms,
        )
        for personal_account in dump.personal_accounts:
            account_id = await self.account_service.create_account(
                conn=conn,
                user=user,
                group_id=group_id,
                account=NewAccount(
                    type=AccountType.personal,
                    name=personal_account.name,
                    description=personal_account.description,
                ),
            )
            account_mapping[personal_account.id] = account_id

        for clearing_account in dump.events:
            account_id = await self.account_service.create_account(
                conn=conn,
                user=user,
                group_id=group_id,
                account=NewAccount(
                    type=AccountType.clearing,
                    name=clearing_account.name,
                    description=clearing_account.description,
                    date_info=clearing_account.date_info,
                    tags=clearing_account.tags,
                    clearing_shares=remap_shares(clearing_account.clearing_shares),
                ),
            )
            account_mapping[clearing_account.id] = account_id

        for transaction in dump.transactions:
            mapped_positions = []
            for position in transaction.positions:
                mapped_positions.append(
                    NewTransactionPosition(
                        name=position.name,
                        price=position.price,
                        communist_shares=position.communist_shares,
                        usages=remap_shares(position.usages),
                    )
                )

            mapped_files = []
            for file in transaction.files:
                mapped_files.append(NewFile(filename=file.filename, mime_type=file.mime_type, content=file.content))
            await self.transaction_service.create_transaction(
                conn=conn,
                user=user,
                group_id=group_id,
                transaction=NewTransaction(
                    type=transaction.type,
                    name=transaction.name,
                    description=transaction.description,
                    currency_identifier=transaction.currency_identifier,
                    currency_conversion_rate=transaction.currency_conversion_rate,
                    value=transaction.value,
                    billed_at=transaction.billed_at,
                    tags=transaction.tags,
                    creditor_shares=remap_shares(transaction.creditor_shares),
                    debitor_shares=remap_shares(transaction.debitor_shares),
                    new_files=mapped_files,
                    new_positions=mapped_positions,
                    split_mode=transaction.split_mode,
                ),
            )
        return group_id, account_mapping

    @with_db_transaction
    async def import_group_from_json(
        self, *, conn: Connection, user: User, group_json_dump: str
    ) -> tuple[int, dict[int, int]]:
        """
        @returns group_id, account_mapping: group id of newly created group and mapping of account ids in original dump to newly created accounts
        """
        parsed_json = json.loads(group_json_dump)
        version = parsed_json.get("version")
        if version is None or not isinstance(version, int):
            raise InvalidArgument("Invalid json dump - no version field present")

        if version == 1:
            validated_dump = GroupJsonExportV1.model_validate_json(group_json_dump)
            return await self._import_group_from_json_v1(conn=conn, user=user, dump=validated_dump)
        else:
            raise InvalidArgument(f"Invalid json dump - unknown version {version}")
