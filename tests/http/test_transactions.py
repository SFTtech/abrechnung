from uuid import uuid4, UUID

from aiohttp.test_utils import unittest_run_loop

from tests.http import HTTPAPITest


class TransactionAPITest(HTTPAPITest):
    async def _create_group_with_transaction(
        self, transaction_type: str
    ) -> tuple[UUID, UUID]:
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        transaction_id = self.group_service.create_transaction(
            self.test_user_id,
            group_id,
            transaction_type,
            description="description123",
            currency_symbol="€",
            currency_conversion_rate=1.22,
            value=122.22,
        )
        return group_id, transaction_id

    async def _fetch_transaction(
        self, group_id: UUID, transaction_id: UUID, expected_status: int = 200
    ) -> dict:
        resp = await self._get(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}"
        )
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(str(transaction_id), ret_data["id"])
        return ret_data

    async def _commit_transaction(
        self, group_id: UUID, transaction_id: UUID, expected_status: int = 204
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/commit"
        )
        self.assertEqual(expected_status, resp.status)

    async def _post_creditor_share(
        self,
        group_id: UUID,
        transaction_id: UUID,
        account_id: UUID,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/creditor_shares",
            json={"account_id": str(account_id), "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _switch_creditor_share(
        self,
        group_id: UUID,
        transaction_id: UUID,
        account_id: UUID,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/creditor_shares/switch",
            json={"account_id": str(account_id), "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _delete_creditor_sahre(
        self,
        group_id: UUID,
        transaction_id: UUID,
        account_id: UUID,
        expected_status: int = 204,
    ) -> None:
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/creditor_shares",
            json={"account_id": str(account_id)},
        )
        self.assertEqual(expected_status, resp.status)

    async def _post_debitor_share(
        self,
        group_id: UUID,
        transaction_id: UUID,
        account_id: UUID,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/debitor_shares",
            json={"account_id": str(account_id), "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _switch_debitor_share(
        self,
        group_id: UUID,
        transaction_id: UUID,
        account_id: UUID,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/debitor_shares/switch",
            json={"account_id": str(account_id), "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _delete_debitor_share(
        self,
        group_id: UUID,
        transaction_id: UUID,
        account_id: UUID,
        expected_status: int = 204,
    ) -> None:
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/debitor_shares",
            json={"account_id": str(account_id)},
        )
        self.assertEqual(expected_status, resp.status)

    @unittest_run_loop
    async def test_create_transaction(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions",
            json={
                "description": "description",
                "type": "purchase",
                "currency_symbol": "€",
                "value": 123.22,
                "currency_conversion_rate": 1.33,
            },
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["transaction_id"])

    @unittest_run_loop
    async def test_list_transactions(self):
        group_id = self.group_service.create_group(
            self.test_user_id, "name", "description", "€", "terms"
        )
        transaction1_id = self.group_service.create_transaction(
            self.test_user_id,
            group_id,
            "purchase",
            description="description123",
            currency_symbol="€",
            currency_conversion_rate=1.22,
            value=122.22,
        )
        transaction2_id = self.group_service.create_transaction(
            self.test_user_id,
            group_id,
            "purchase",
            description="description123",
            currency_symbol="€",
            currency_conversion_rate=1.22,
            value=122.22,
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/transactions")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual(
            {str(transaction1_id), str(transaction2_id)},
            set([e["id"] for e in ret_data]),
        )

    @unittest_run_loop
    async def test_get_transaction(self):
        group_id, transaction_id = await self._create_group_with_transaction("transfer")
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(len(t["pending_changes"]), 1)

        resp = await self._get(f"/api/v1/groups/{group_id}/transactions/asdf1234")
        self.assertEqual(400, resp.status)

        resp = await self._get(
            f"/api/v1/groups/{uuid4()}/transactions/{transaction_id}"
        )
        self.assertEqual(403, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/transactions/{uuid4()}")
        self.assertEqual(403, resp.status)

    @unittest_run_loop
    async def test_commit_transaction(self):
        group_id, transaction_id = await self._create_group_with_transaction("purchase")
        account1_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account1", "description"
        )
        account2_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account2", "description"
        )

        # we should not be able to commit this transaction as we do not have creditor or debitor shares
        await self._commit_transaction(group_id, transaction_id, expected_status=400)

        # create a creditor share and try to commit it, should not work as we do not have a debitor share
        await self._post_creditor_share(group_id, transaction_id, account1_id, 1.0)
        await self._commit_transaction(group_id, transaction_id, expected_status=400)

        await self._post_debitor_share(group_id, transaction_id, account2_id, 1.0)

        # now we should be able to commit
        await self._commit_transaction(group_id, transaction_id, expected_status=204)

        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(0, len(t["pending_changes"]))

        # test that we cannot commit without having pending changes
        await self._commit_transaction(group_id, transaction_id, expected_status=400)

        # create a second debitor share
        await self._post_debitor_share(group_id, transaction_id, account1_id, 1.0)

        # check that we have another pending change
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(1, len(t["pending_changes"]))
        self.assertIn(str(self.test_user_id), t["pending_changes"])

        # check that we can commit this
        await self._commit_transaction(group_id, transaction_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(0, len(t["pending_changes"]))

    @unittest_run_loop
    async def test_creditor_shares(self):
        group_id, transaction_id = await self._create_group_with_transaction("purchase")
        account1_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account1", "description"
        )
        account2_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account2", "description"
        )

        await self._post_creditor_share(group_id, transaction_id, account1_id, 1.0)

        # test that we cannot add a second creditor share to a "purchase" type transaction
        await self._post_creditor_share(
            group_id, transaction_id, account2_id, 1.0, expected_status=400
        )

        # test that we can change the value of existing shares
        await self._post_creditor_share(group_id, transaction_id, account1_id, 2.0)

        # check the state
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertIn(
            str(account1_id),
            t["pending_changes"][str(self.test_user_id)]["creditor_shares"],
        )
        self.assertEqual(
            2.0,
            t["pending_changes"][str(self.test_user_id)]["creditor_shares"][
                str(account1_id)
            ],
        )

        # delete one share
        await self._delete_creditor_sahre(group_id, transaction_id, account1_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertNotIn(
            str(account1_id),
            t["pending_changes"][str(self.test_user_id)]["creditor_shares"],
        )

        # check that we cannot delete non existing shares
        await self._delete_creditor_sahre(
            group_id, transaction_id, account1_id, expected_status=400
        )

        # check that we can perform a switch creditor share on the "purchase" type transaction
        await self._switch_creditor_share(group_id, transaction_id, account1_id, 1.0)
        await self._switch_creditor_share(group_id, transaction_id, account2_id, 2.0)

        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(
            t["pending_changes"][str(self.test_user_id)]["creditor_shares"][
                str(account2_id)
            ],
            2.0,
        )

    @unittest_run_loop
    async def test_debitor_shares_purchase(self):
        group_id, transaction_id = await self._create_group_with_transaction("purchase")
        account1_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account1", "description"
        )
        account2_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account2", "description"
        )

        await self._post_debitor_share(group_id, transaction_id, account1_id, 1.0)
        await self._post_debitor_share(group_id, transaction_id, account2_id, 1.0)

        # test that we can change the value of existing shares
        await self._post_debitor_share(group_id, transaction_id, account1_id, 2.0)

        # check the state
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertIn(
            str(account1_id),
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"],
        )
        self.assertIn(
            str(account2_id),
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"],
        )
        self.assertEqual(
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"][
                str(account1_id)
            ],
            2.0,
        )
        self.assertEqual(
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"][
                str(account2_id)
            ],
            1.0,
        )

        # delete one share
        await self._delete_debitor_share(group_id, transaction_id, account1_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertNotIn(
            str(account1_id),
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"],
        )

        # check that we cannot delete non existing shares
        await self._delete_debitor_share(
            group_id, transaction_id, account1_id, expected_status=400
        )

        # check that we cannot perform a switch debitor share on the "purchase" type transaction
        await self._switch_debitor_share(
            group_id, transaction_id, account1_id, 1.0, expected_status=400
        )

    @unittest_run_loop
    async def test_debitor_shares_transfer(self):
        group_id, transaction_id = await self._create_group_with_transaction("transfer")
        account_id = self.group_service.create_account(
            self.test_user_id, group_id, "personal", "account1", "description"
        )

        await self._post_debitor_share(group_id, transaction_id, account_id, 1.0)
        # test that we can change the value of existing shares
        await self._post_debitor_share(group_id, transaction_id, account_id, 2.0)

        # check the state
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertIn(
            str(account_id),
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"],
        )
        self.assertEqual(
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"][
                str(account_id)
            ],
            2.0,
        )

        # delete one share
        await self._delete_debitor_share(group_id, transaction_id, account_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertNotIn(
            str(account_id),
            t["pending_changes"][str(self.test_user_id)]["debitor_shares"],
        )

        # check that we cannot delete non existing shares
        await self._delete_debitor_share(
            group_id, transaction_id, account_id, expected_status=400
        )

        await self._switch_debitor_share(group_id, transaction_id, account_id, 1.0)
