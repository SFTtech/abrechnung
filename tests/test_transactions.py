# pylint: disable=missing-kwoa

from datetime import date, datetime

from abrechnung.application.accounts import AccountService
from abrechnung.application.groups import GroupService
from abrechnung.application.transactions import TransactionService
from abrechnung.domain.accounts import AccountType, NewAccount
from abrechnung.domain.transactions import (
    NewTransaction,
    NewTransactionPosition,
    Transaction,
    TransactionPosition,
    TransactionType,
    UpdateTransaction,
)

from .common import BaseTestCase


class TransactionAPITest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()
        self.test_user, _ = await self._create_test_user("user1", "user1@email.stuff")
        self.transaction_service = TransactionService(db_pool=self.db_pool, config=self.test_config)
        self.account_service = AccountService(db_pool=self.db_pool, config=self.test_config)
        self.group_service = GroupService(db_pool=self.db_pool, config=self.test_config)

    async def _create_group(self) -> int:
        return await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )

    async def _create_account(self, group_id: int, name: str) -> int:
        return await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name=name,
                description=f"account {name} description",
            ),
        )

    async def _fetch_transaction(self, transaction_id: int) -> Transaction:
        transaction = await self.transaction_service.get_transaction(user=self.test_user, transaction_id=transaction_id)
        return transaction

    async def test_list_transactions(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        account_id = await self._create_account(group_id=group_id, name="account1")
        transaction1_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                name="name123",
                description="description123",
                currency_symbol="€",
                tags=[],
                billed_at=date.today(),
                currency_conversion_rate=1.22,
                value=122.22,
                debitor_shares={account_id: 1.0},
                creditor_shares={account_id: 1.0},
                new_positions=[],
            ),
        )
        transaction2_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                name="name123",
                description="description123",
                currency_symbol="€",
                tags=[],
                billed_at=date.today(),
                currency_conversion_rate=1.22,
                value=122.22,
                debitor_shares={account_id: 1.0},
                creditor_shares={account_id: 1.0},
                new_positions=[],
            ),
        )
        transactions = await self.transaction_service.list_transactions(user=self.test_user, group_id=group_id)
        self.assertEqual(2, len(transactions))
        self.assertEqual(
            {transaction1_id, transaction2_id},
            set([e.id for e in transactions]),
        )

        transaction3_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                name="foobar",
                description="foobar",
                currency_symbol="€",
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
        transactions = await self.transaction_service.list_transactions(user=self.test_user, group_id=group_id)
        self.assertEqual(3, len(transactions))

        transactions = await self.transaction_service.list_transactions(
            user=self.test_user, group_id=group_id, min_last_changed=datetime.now()
        )
        self.assertEqual(0, len(transactions))

        transactions = await self.transaction_service.list_transactions(
            user=self.test_user,
            group_id=group_id,
            min_last_changed=datetime.now(),
            additional_transactions=[transaction3_id],
        )
        self.assertEqual(1, len(transactions))

    async def test_update_transaction(self):
        group_id = await self._create_group()
        account1_id = await self._create_account(group_id, "account1")
        account2_id = await self._create_account(group_id, "account2")
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            transaction=UpdateTransaction(
                type=TransactionType.purchase,
                name="name123",
                description="description123",
                currency_symbol="€",
                tags=[],
                billed_at=date.today(),
                currency_conversion_rate=1.22,
                value=122.22,
                creditor_shares={account1_id: 1.0},
                debitor_shares={account2_id: 1.0},
            ),
        )
        await self.transaction_service.update_transaction(
            user=self.test_user,
            transaction_id=transaction_id,
            transaction=UpdateTransaction(
                type=TransactionType.purchase,
                value=200.0,
                name="some name",
                description="some description",
                billed_at=date.today(),
                currency_symbol="$",
                currency_conversion_rate=2.0,
                tags=[],
                creditor_shares={account2_id: 1.0},
                debitor_shares={account1_id: 1.0},
            ),
        )

        t: Transaction = await self.transaction_service.get_transaction(
            user=self.test_user, transaction_id=transaction_id
        )
        self.assertEqual(200.0, t.value)
        self.assertEqual(
            "some description",
            t.description,
        )
        self.assertEqual("$", t.currency_symbol)
        self.assertEqual(2.0, t.currency_conversion_rate)

        await self.transaction_service.update_transaction(
            user=self.test_user,
            transaction_id=transaction_id,
            transaction=UpdateTransaction(
                type=TransactionType.purchase,
                value=100.0,
                name="fiibaar",
                description="foobar",
                billed_at=date.today(),
                currency_symbol="€",
                currency_conversion_rate=1.0,
                tags=[],
                creditor_shares={account2_id: 1.0},
                debitor_shares={account1_id: 1.0},
            ),
        )
        t = await self.transaction_service.get_transaction(user=self.test_user, transaction_id=transaction_id)
        self.assertEqual(100.0, t.value)
        self.assertEqual("foobar", t.description)
        self.assertEqual("€", t.currency_symbol)
        self.assertEqual(
            1.0,
            t.currency_conversion_rate,
        )

    async def test_account_deletion(self):
        group_id = await self._create_group()
        account1_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name="account1",
                description="description",
            ),
        )
        account2_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name="account2",
                description="description",
            ),
        )
        account3_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name="account3",
                description="description",
            ),
        )
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                name="name123",
                description="description123",
                currency_symbol="€",
                billed_at=date.today(),
                currency_conversion_rate=1.22,
                tags=[],
                value=122.22,
                debitor_shares={account2_id: 1.0},
                creditor_shares={account3_id: 1.0},
            ),
        )

        # we can delete the account when nothing depends on it
        await self.account_service.delete_account(user=self.test_user, account_id=account1_id)

        # the account has been deleted, we should not be able to add more shares to it
        with self.assertRaises(Exception):
            await self.transaction_service.update_transaction(
                user=self.test_user,
                transaction_id=transaction_id,
                transaction=UpdateTransaction(
                    type=TransactionType.purchase,
                    value=200.0,
                    name="name123",
                    description="description123",
                    billed_at=date.today(),
                    currency_symbol="€",
                    currency_conversion_rate=2.0,
                    tags=[],
                    creditor_shares={account1_id: 1.0},
                    debitor_shares={account2_id: 1.0},
                ),
            )

        with self.assertRaises(Exception):
            await self.account_service.delete_account(user=self.test_user, account_id=account2_id)

        await self.transaction_service.update_transaction(
            user=self.test_user,
            transaction_id=transaction_id,
            transaction=UpdateTransaction(
                type=TransactionType.purchase,
                value=200.0,
                name="name123",
                description="description123",
                billed_at=date.today(),
                currency_symbol="€",
                currency_conversion_rate=2.0,
                tags=[],
                creditor_shares={account3_id: 1.0},
                debitor_shares={account3_id: 1.0},
            ),
        )
        # we should not be able to delete this account as changes depend on it
        await self.account_service.delete_account(user=self.test_user, account_id=account2_id)

    async def test_purchase_items(self):
        group_id = await self._create_group()
        account1_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name="account1",
                description="foobar",
            ),
        )
        account2_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            account=NewAccount(
                type=AccountType.personal,
                name="account2",
                description="foobar",
            ),
        )
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            transaction=NewTransaction(
                type=TransactionType.purchase,
                name="name123",
                description="description123",
                currency_symbol="€",
                billed_at=date.today(),
                currency_conversion_rate=1.22,
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
        t = await self._fetch_transaction(transaction_id=transaction_id)
        self.assertIsNotNone(t.positions)
        self.assertEqual(1, len(t.positions))
        position_id = t.positions[0].id
        await self.transaction_service.update_transaction(
            user=self.test_user,
            transaction_id=transaction_id,
            transaction=UpdateTransaction(
                type=TransactionType.purchase,
                name="name123",
                description="description123",
                currency_symbol="€",
                billed_at=date.today(),
                currency_conversion_rate=1.22,
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

        t = await self._fetch_transaction(transaction_id)
        self.assertIsNotNone(t.positions)
        self.assertEqual(1, len(t.positions))
        self.assertIn(account2_id, t.positions[0].usages)
