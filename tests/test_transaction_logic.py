import os
from datetime import datetime

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.application.users import UserService
from abrechnung.config import Config
from tests import AsyncTestCase


class TransactionLogicTest(AsyncTestCase):
    async def setUpAsync(self) -> None:
        await super().setUpAsync()
        self.secret_key = "asdf1234"
        self.test_config = Config.from_dict(
            {
                "api": {"secret_key": self.secret_key, "max_uploadable_file_size": 512},
                "service": {"api_url": "http://localhost/api"},
            }
        )
        self.group_service = GroupService(self.db_pool, config=self.test_config)
        self.account_service = AccountService(self.db_pool, config=self.test_config)
        self.user_service = UserService(self.db_pool, config=self.test_config)
        self.transaction_service = TransactionService(
            self.db_pool, config=self.test_config
        )

        self.user_id, _ = await self._create_test_user("test", "test@test.test")

    async def _create_accounts(self, group_id: int, n_accounts: int) -> list[int]:
        account_ids = []
        for i in range(n_accounts):
            acc_id = await self.account_service.create_account(
                user_id=self.user_id,
                group_id=group_id,
                type="personal",
                name=f"account{i}",
                description="",
            )
            account_ids.append(acc_id)

        return account_ids

    async def test_file_upload(self):
        group_id = await self.group_service.create_group(
            user_id=self.user_id,
            name="test group",
            description="",
            currency_symbol="€",
            terms="",
        )
        account1_id, account2_id = await self._create_accounts(group_id, 2)
        transaction_id = await self.transaction_service.create_transaction(
            user_id=self.user_id,
            group_id=group_id,
            type="purchase",
            description="foo",
            billed_at=datetime.now().date(),
            currency_symbol="€",
            currency_conversion_rate=1.0,
            value=33,
        )
        await self.transaction_service.add_or_change_debitor_share(
            user_id=self.user_id,
            transaction_id=transaction_id,
            account_id=account1_id,
            value=1.0,
        )
        await self.transaction_service.add_or_change_creditor_share(
            user_id=self.user_id,
            transaction_id=transaction_id,
            account_id=account2_id,
            value=1.0,
        )
        with open(
            os.path.join(os.path.dirname(__file__), "assets", "test_image.jpg"), "rb"
        ) as test_image:
            content = test_image.read()
            file_size = len(content)
            file_id = await self.transaction_service.upload_file(
                user_id=self.user_id,
                transaction_id=transaction_id,
                filename="test file",
                mime_type="image/jpeg",
                content=content,
            )
        transaction = await self.transaction_service.get_transaction(
            user_id=self.user_id, transaction_id=transaction_id
        )
        self.assertIsNotNone(transaction.pending_files)
        self.assertIsNone(transaction.committed_files)
        self.assertEqual(1, len(transaction.pending_files))
        self.assertEqual(file_id, transaction.pending_files[0].id)
        await self.transaction_service.commit_transaction(
            user_id=self.user_id, transaction_id=transaction_id
        )

        transaction = await self.transaction_service.get_transaction(
            user_id=self.user_id, transaction_id=transaction_id
        )
        self.assertIsNone(transaction.pending_files)
        self.assertIsNotNone(transaction.committed_files)
        self.assertEqual(1, len(transaction.committed_files))
        self.assertEqual(file_id, transaction.committed_files[0].id)
        self.assertIsNotNone(transaction.committed_files[0].blob_id)

        (mime_type, _,) = await self.transaction_service.read_file_contents(
            user_id=self.user_id,
            file_id=file_id,
            blob_id=transaction.committed_files[0].blob_id,
        )
        self.assertEqual("image/jpeg", mime_type)
        self.assertEqual(file_size, len(content))

        # now delete it
        await self.transaction_service.delete_file(
            user_id=self.user_id, file_id=file_id
        )
        transaction = await self.transaction_service.get_transaction(
            user_id=self.user_id, transaction_id=transaction_id
        )
        self.assertIsNotNone(transaction.pending_files)
        self.assertIsNotNone(transaction.committed_files)
        self.assertEqual(1, len(transaction.pending_files))
        self.assertEqual(file_id, transaction.pending_files[0].id)
        self.assertTrue(transaction.pending_files[0].deleted)
        await self.transaction_service.commit_transaction(
            user_id=self.user_id, transaction_id=transaction_id
        )
        transaction = await self.transaction_service.get_transaction(
            user_id=self.user_id, transaction_id=transaction_id
        )
        self.assertIsNone(transaction.pending_files)
        self.assertIsNotNone(transaction.committed_files)
        self.assertEqual(1, len(transaction.committed_files))
        self.assertEqual(file_id, transaction.committed_files[0].id)
        self.assertIsNone(transaction.committed_files[0].blob_id)
        self.assertTrue(transaction.committed_files[0].deleted)
