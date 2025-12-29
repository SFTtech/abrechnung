# pylint: disable=attribute-defined-outside-init,missing-kwoa,unexpected-keyword-arg
import base64
from datetime import datetime
from pathlib import Path

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.accounts import AccountType, ClearingAccount, NewAccount
from abrechnung.domain.transactions import (
    NewFile,
    NewTransaction,
    Transaction,
    TransactionType,
    UpdateFile,
    UpdateTransaction,
)

from .common import BaseTestCase


class TransactionLogicTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.group_service = GroupService(self.db_pool, config=self.test_config)
        self.account_service = AccountService(self.db_pool, config=self.test_config)
        self.transaction_service = TransactionService(self.db_pool, config=self.test_config)

        self.user, _ = await self._create_test_user("test", "test@test.test")
        self.group_id = await self.group_service.create_group(
            user=self.user,
            name="test group",
            description="",
            currency_identifier="EUR",
            terms="",
            add_user_account_on_join=False,
        )

    async def _create_accounts(
        self,
        group_id: int,
        n_accounts: int,
    ) -> list[int]:
        account_ids = []
        for i in range(n_accounts):
            acc_id = await self.account_service.create_account(
                user=self.user,
                group_id=group_id,
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

    async def test_basic_clearing_account_workflow(self):
        basic_account_id1, basic_account_id2 = await self._create_accounts(self.group_id, 2)

        # check that we can create a simple clearing account
        account_id = await self.account_service.create_account(
            user=self.user,
            group_id=self.group_id,
            account=NewAccount(
                type=AccountType.clearing,
                name="Clearing",
                description="Foobar",
                clearing_shares={basic_account_id1: 1.0, basic_account_id2: 2.0},
                date_info=datetime.now().date(),
            ),
        )

        account: ClearingAccount = await self.account_service.get_account(
            user=self.user, group_id=self.group_id, account_id=account_id
        )
        self.assertEqual(account_id, account.id)
        self.assertEqual(2.0, account.clearing_shares[basic_account_id2])
        self.assertEqual(1.0, account.clearing_shares[basic_account_id1])

        await self.account_service.update_account(
            user=self.user,
            group_id=self.group_id,
            account_id=account_id,
            account=NewAccount(
                name="Clearing",
                type=AccountType.clearing,
                description="Foobar",
                date_info=datetime.now().date(),
                clearing_shares={basic_account_id1: 1.0},
            ),
        )
        account = await self.account_service.get_account(user=self.user, group_id=self.group_id, account_id=account_id)
        self.assertTrue(basic_account_id2 not in account.clearing_shares)

    async def test_no_circular_clearing_accounts(self):
        # we need to commit one account first other
        account1_id = await self.account_service.create_account(
            user=self.user,
            group_id=self.group_id,
            account=NewAccount(
                name="account1",
                type=AccountType.clearing,
                date_info=datetime.now().date(),
                clearing_shares={},
            ),
        )
        account2_id = await self.account_service.create_account(
            user=self.user,
            group_id=self.group_id,
            account=NewAccount(
                name="account2",
                type=AccountType.clearing,
                date_info=datetime.now().date(),
                clearing_shares={account1_id: 1.0},
            ),
        )

        with self.assertRaises(Exception) as ctx:
            await self.account_service.update_account(
                user=self.user,
                group_id=self.group_id,
                account_id=account1_id,
                account=NewAccount(
                    name="account1",
                    type=AccountType.clearing,
                    date_info=datetime.now().date(),
                    clearing_shares={account2_id: 1.0},
                ),
            )
        self.assertTrue(
            "this change would result in a cyclic dependency between clearing accounts" in str(ctx.exception)
        )

        # check that we cannot have an account reference itself
        with self.assertRaises(Exception) as ctx:
            await self.account_service.update_account(
                user=self.user,
                group_id=self.group_id,
                account_id=account1_id,
                account=NewAccount(
                    name="account1",
                    type=AccountType.clearing,
                    date_info=datetime.now().date(),
                    clearing_shares={account1_id: 1.0},
                ),
            )

    async def test_file_upload(self):
        account1_id, account2_id = await self._create_accounts(self.group_id, 2)
        image_file = Path(__file__).parent / "assets" / "test_image.jpg"
        image_content = image_file.read_bytes()
        file_size = len(image_content)
        image_base64 = base64.b64encode(image_content).decode("ascii")
        transaction_id = await self.transaction_service.create_transaction(
            user=self.user,
            group_id=self.group_id,
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
                new_files=[
                    NewFile(
                        filename="test file",
                        mime_type="image/jpeg",
                        content=image_base64,
                    )
                ],
            ),
        )
        transaction: Transaction = await self.transaction_service.get_transaction(
            user=self.user, transaction_id=transaction_id
        )
        self.assertEqual(1, len(transaction.files))

        file_id = transaction.files[0].id
        blob_id = transaction.files[0].blob_id
        mime_type, retrieved_file = await self.transaction_service.read_file_contents(
            user=self.user,
            file_id=file_id,
            blob_id=blob_id,
        )
        self.assertEqual("image/jpeg", mime_type)
        self.assertEqual(file_size, len(retrieved_file))

        await self.transaction_service.update_transaction(
            user=self.user,
            group_id=self.group_id,
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
            ),
        )
        transaction = await self.transaction_service.get_transaction(user=self.user, transaction_id=transaction_id)
        self.assertEqual(1, len(transaction.files))
        self.assertTrue(transaction.files[0].deleted)
