from datetime import date

from aiohttp.test_utils import unittest_run_loop

from tests.http_tests import HTTPAPITest


class TransactionAPITest(HTTPAPITest):
    async def _create_group_with_transaction(
        self, transaction_type: str
    ) -> tuple[int, int]:
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        transaction_id = await self.transaction_service.create_transaction(
            user_id=self.test_user_id,
            group_id=group_id,
            type=transaction_type,
            description="description123",
            currency_symbol="€",
            currency_conversion_rate=1.22,
            billed_at=date.today(),
            value=122.22,
        )
        return group_id, transaction_id

    async def _create_account(self, group_id: int, name: str) -> int:
        return await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name=name,
            description=f"account {name} description",
        )

    async def _fetch_transaction(
        self, group_id: int, transaction_id: int, expected_status: int = 200
    ) -> dict:
        resp = await self._get(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}"
        )
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(transaction_id, ret_data["id"])
        return ret_data

    async def _update_transaction(
        self,
        group_id: int,
        transaction_id: int,
        value: float,
        description: str,
        billed_at: date,
        currency_symbol: str,
        currency_conversion_rate: float,
        expected_status: int = 204,
    ) -> dict:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}",
            json={
                "value": value,
                "description": description,
                "currency_symbol": currency_symbol,
                "currency_conversion_rate": currency_conversion_rate,
                "billed_at": billed_at.isoformat(),
            },
        )
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        return ret_data

    async def _commit_transaction(
        self, group_id: int, transaction_id: int, expected_status: int = 204
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/commit"
        )
        self.assertEqual(expected_status, resp.status)

    async def _create_change(
        self, group_id: int, transaction_id: int, expected_status: int = 204
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/new_change"
        )
        self.assertEqual(expected_status, resp.status)

    async def _delete_transaction(
        self, group_id: int, transaction_id: int, expected_status: int = 204
    ) -> None:
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}"
        )
        print(await resp.json())
        self.assertEqual(expected_status, resp.status)

    async def _discard_transaction_change(
        self, group_id: int, transaction_id: int, expected_status: int = 204
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/discard"
        )
        self.assertEqual(expected_status, resp.status)

    async def _post_creditor_share(
        self,
        group_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/creditor_shares",
            json={"account_id": account_id, "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _switch_creditor_share(
        self,
        group_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/creditor_shares/switch",
            json={"account_id": account_id, "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _delete_creditor_share(
        self,
        group_id: int,
        transaction_id: int,
        account_id: int,
        expected_status: int = 204,
    ) -> None:
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/creditor_shares",
            json={"account_id": account_id},
        )
        self.assertEqual(expected_status, resp.status)

    async def _post_debitor_share(
        self,
        group_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/debitor_shares",
            json={"account_id": account_id, "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _switch_debitor_share(
        self,
        group_id: int,
        transaction_id: int,
        account_id: int,
        value: float,
        expected_status: int = 204,
    ) -> None:
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/debitor_shares/switch",
            json={"account_id": account_id, "value": value},
        )
        self.assertEqual(expected_status, resp.status)

    async def _delete_debitor_share(
        self,
        group_id: int,
        transaction_id: int,
        account_id: int,
        expected_status: int = 204,
    ) -> None:
        resp = await self._delete(
            f"/api/v1/groups/{group_id}/transactions/{transaction_id}/debitor_shares",
            json={"account_id": account_id},
        )
        self.assertEqual(expected_status, resp.status)

    @unittest_run_loop
    async def test_create_transaction(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        resp = await self._post(
            f"/api/v1/groups/{group_id}/transactions",
            json={
                "description": "description",
                "type": "purchase",
                "currency_symbol": "€",
                "value": 123.22,
                "billed_at": date.today().isoformat(),
                "currency_conversion_rate": 1.33,
            },
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertIsNotNone(ret_data["transaction_id"])

    @unittest_run_loop
    async def test_list_transactions(self):
        group_id = await self.group_service.create_group(
            user_id=self.test_user_id,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
        )
        transaction1_id = await self.transaction_service.create_transaction(
            user_id=self.test_user_id,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
        )
        transaction2_id = await self.transaction_service.create_transaction(
            user_id=self.test_user_id,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/transactions")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertEqual(
            {transaction1_id, transaction2_id},
            set([e["id"] for e in ret_data]),
        )

    @unittest_run_loop
    async def test_get_transaction(self):
        group_id, transaction_id = await self._create_group_with_transaction("transfer")
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(len(t["pending_changes"]), 1)

        resp = await self._get(f"/api/v1/groups/{group_id}/transactions/asdf1234")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/groups/foobar/transactions/{transaction_id}")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/groups/{group_id}/transactions/1332")
        self.assertEqual(404, resp.status)

    @unittest_run_loop
    async def test_update_transaction(self):
        group_id, transaction_id = await self._create_group_with_transaction("transfer")
        await self._update_transaction(
            group_id, transaction_id, 200.0, "some description", date.today(), "$", 2.0
        )
        account1_id = await self._create_account(group_id, "account1")
        account2_id = await self._create_account(group_id, "account2")

        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(200.0, t["pending_changes"][str(self.test_user_id)]["value"])
        self.assertEqual(
            "some description",
            t["pending_changes"][str(self.test_user_id)]["description"],
        )
        self.assertEqual(
            "$", t["pending_changes"][str(self.test_user_id)]["currency_symbol"]
        )
        self.assertEqual(
            2.0,
            t["pending_changes"][str(self.test_user_id)]["currency_conversion_rate"],
        )

        await self._post_debitor_share(group_id, transaction_id, account1_id, 1.0)
        await self._post_creditor_share(group_id, transaction_id, account2_id, 1.0)

        await self._commit_transaction(group_id, transaction_id)

        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(0, len(t["pending_changes"]))

        await self._update_transaction(
            group_id, transaction_id, 100.0, "foobar", date.today(), "€", 1.0
        )
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(100.0, t["pending_changes"][str(self.test_user_id)]["value"])
        self.assertEqual(
            "foobar",
            t["pending_changes"][str(self.test_user_id)]["description"],
        )
        self.assertEqual(
            "€", t["pending_changes"][str(self.test_user_id)]["currency_symbol"]
        )
        self.assertEqual(
            1.0,
            t["pending_changes"][str(self.test_user_id)]["currency_conversion_rate"],
        )

        await self._commit_transaction(group_id, transaction_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(0, len(t["pending_changes"]))

        await self._create_change(group_id, transaction_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(1, len(t["pending_changes"]))
        await self._update_transaction(
            group_id, transaction_id, 200.0, "foofoo", date.today(), "$", 2.0
        )

        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(200.0, t["pending_changes"][str(self.test_user_id)]["value"])
        self.assertEqual(
            "foofoo",
            t["pending_changes"][str(self.test_user_id)]["description"],
        )
        self.assertEqual(
            "$", t["pending_changes"][str(self.test_user_id)]["currency_symbol"]
        )
        self.assertEqual(
            2.0,
            t["pending_changes"][str(self.test_user_id)]["currency_conversion_rate"],
        )
        await self._commit_transaction(group_id, transaction_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(200.0, t["current_state"]["value"])
        self.assertEqual(
            "foofoo",
            t["current_state"]["description"],
        )
        self.assertEqual("$", t["current_state"]["currency_symbol"])
        self.assertEqual(
            2.0,
            t["current_state"]["currency_conversion_rate"],
        )

    @unittest_run_loop
    async def test_commit_transaction(self):
        group_id, transaction_id = await self._create_group_with_transaction("purchase")
        account1_id = await self._create_account(group_id, "account1")
        account2_id = await self._create_account(group_id, "account2")

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

        # try another edit and discard that
        await self._delete_debitor_share(group_id, transaction_id, account1_id)
        await self._discard_transaction_change(group_id, transaction_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertEqual(0, len(t["pending_changes"]))

        # try delete the transaction
        await self._delete_transaction(group_id, transaction_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertTrue(t["current_state"]["deleted"])

    @unittest_run_loop
    async def test_discard_newly_created_transaction(self):
        group_id, transaction_id = await self._create_group_with_transaction("purchase")
        account1_id = await self._create_account(group_id, "account1")

        # one share for the sake of having it
        await self._post_debitor_share(group_id, transaction_id, account1_id, 1.0)

        # we should not be able to discard this transaction as it does not have any committed changes
        await self._discard_transaction_change(
            group_id, transaction_id, expected_status=400
        )

        await self._delete_transaction(group_id, transaction_id)

        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertTrue(t["current_state"]["deleted"])
        self.assertEqual(0, len(t["pending_changes"]))

    @unittest_run_loop
    async def test_creditor_shares(self):
        group_id, transaction_id = await self._create_group_with_transaction("purchase")
        account1_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        account2_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account2",
            description="description",
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
        await self._delete_creditor_share(group_id, transaction_id, account1_id)
        t = await self._fetch_transaction(group_id, transaction_id)
        self.assertNotIn(
            str(account1_id),
            t["pending_changes"][str(self.test_user_id)]["creditor_shares"],
        )

        # check that we cannot delete non existing shares
        await self._delete_creditor_share(
            group_id, transaction_id, account1_id, expected_status=404
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
        account1_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        account2_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account2",
            description="description",
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
            group_id, transaction_id, account1_id, expected_status=404
        )

        # check that we cannot perform a switch debitor share on the "purchase" type transaction
        await self._switch_debitor_share(
            group_id, transaction_id, account1_id, 1.0, expected_status=400
        )

    @unittest_run_loop
    async def test_debitor_shares_transfer(self):
        group_id, transaction_id = await self._create_group_with_transaction("transfer")
        account_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
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
            group_id, transaction_id, account_id, expected_status=404
        )

        await self._switch_debitor_share(group_id, transaction_id, account_id, 1.0)

    @unittest_run_loop
    async def test_account_deletion(self):
        group_id, transaction1_id = await self._create_group_with_transaction(
            "transfer"
        )
        account1_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )

        # we can delete the account when nothing depends on it
        resp = await self._delete(f"/api/v1/groups/{group_id}/accounts/{account1_id}")
        self.assertEqual(204, resp.status)

        account2_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account2",
            description="description",
        )

        await self._post_debitor_share(group_id, transaction1_id, account2_id, 1.0)
        await self._post_creditor_share(group_id, transaction1_id, account2_id, 1.0)
        await self._commit_transaction(group_id, transaction1_id)

        # we should now still be able to delete the account as its balance should be 0
        resp = await self._delete(f"/api/v1/groups/{group_id}/accounts/{account2_id}")
        self.assertEqual(204, resp.status)

        transaction2_id = await self.transaction_service.create_transaction(
            user_id=self.test_user_id,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            currency_conversion_rate=1,
            billed_at=date.today(),
            value=50,
        )
        account3_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account3",
            description="description",
        )
        account4_id = await self.account_service.create_account(
            user_id=self.test_user_id,
            group_id=group_id,
            type="personal",
            name="account4",
            description="description",
        )

        await self._post_debitor_share(group_id, transaction2_id, account3_id, 1.0)
        await self._post_creditor_share(group_id, transaction2_id, account4_id, 1.0)
        await self._commit_transaction(group_id, transaction2_id)

        # we should now not be able to delete either of the two new accounts as both have a balance != 0
        resp = await self._delete(f"/api/v1/groups/{group_id}/accounts/{account3_id}")
        self.assertEqual(400, resp.status)

        resp = await self._delete(f"/api/v1/groups/{group_id}/accounts/{account4_id}")
        self.assertEqual(400, resp.status)
