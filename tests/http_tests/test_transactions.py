from datetime import date, datetime

from tests.http_tests import HTTPAPITest


class TransactionAPITest(HTTPAPITest):
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
            type="personal",
            name=name,
            description=f"account {name} description",
        )

    async def _fetch_transaction(
        self, transaction_id: int, expected_status: int = 200
    ) -> dict:
        resp = await self._get(f"/api/v1/transactions/{transaction_id}")
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        self.assertEqual(transaction_id, ret_data["id"])
        return ret_data

    async def _update_transaction(
        self,
        transaction_id: int,
        value: float,
        description: str,
        billed_at: date,
        currency_symbol: str,
        currency_conversion_rate: float,
        creditor_shares: dict[int, float],
        debitor_shares: dict[int, float],
        positions=None,
        expected_status: int = 200,
    ) -> dict:
        payload = {
            "value": value,
            "description": description,
            "currency_symbol": currency_symbol,
            "currency_conversion_rate": currency_conversion_rate,
            "billed_at": billed_at.isoformat(),
            "creditor_shares": creditor_shares,
            "debitor_shares": debitor_shares,
        }
        if positions:
            payload["positions"] = positions
        resp = await self._post(f"/api/v1/transactions/{transaction_id}", json=payload)
        self.assertEqual(expected_status, resp.status)
        ret_data = await resp.json()
        return ret_data

    async def _commit_transaction(
        self, transaction_id: int, expected_status: int = 200
    ) -> None:
        resp = await self._post(f"/api/v1/transactions/{transaction_id}/commit")
        self.assertEqual(expected_status, resp.status)

    async def _create_change(
        self, transaction_id: int, expected_status: int = 200
    ) -> None:
        resp = await self._post(f"/api/v1/transactions/{transaction_id}/new_change")
        self.assertEqual(expected_status, resp.status)

    async def _delete_transaction(
        self, transaction_id: int, expected_status: int = 200
    ) -> None:
        resp = await self._delete(f"/api/v1/transactions/{transaction_id}")
        self.assertEqual(expected_status, resp.status)

    async def _discard_transaction_change(
        self, transaction_id: int, expected_status: int = 200
    ) -> None:
        resp = await self._post(f"/api/v1/transactions/{transaction_id}/discard")
        self.assertEqual(expected_status, resp.status)

    async def test_create_transaction(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
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
        self.assertIsNotNone(ret_data["id"])

    async def test_list_transactions(self):
        group_id = await self.group_service.create_group(
            user=self.test_user,
            name="name",
            description="description",
            currency_symbol="€",
            terms="terms",
            add_user_account_on_join=False,
        )
        transaction1_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
        )
        transaction2_id = await self.transaction_service.create_transaction(
            user=self.test_user,
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

        account_id = await self._create_account(group_id=group_id, name="account1")
        transaction3_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="foobar",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1,
            value=100,
            creditor_shares={account_id: 1.0},
            debitor_shares={account_id: 1.0},
        )

        # check that the list endpoint without parameters returns all objects
        await self.transaction_service.commit_transaction(
            user=self.test_user, transaction_id=transaction3_id
        )
        resp = await self._get(f"/api/v1/groups/{group_id}/transactions")
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(3, len(ret_data))

        # TODO: test this aspect more thoroughly
        resp = await self._get(
            f"/api/v1/groups/{group_id}/transactions?min_last_changed={datetime.now().isoformat()}"
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(2, len(ret_data))
        self.assertNotIn(transaction3_id, [t["id"] for t in ret_data])

        resp = await self._get(
            f"/api/v1/groups/{group_id}/transactions?min_last_changed={datetime.now().isoformat()}&transaction_ids={transaction3_id}"
        )
        self.assertEqual(200, resp.status)
        ret_data = await resp.json()
        self.assertEqual(3, len(ret_data))

    async def test_get_transaction(self):
        group_id = await self._create_group()
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
        )
        t = await self._fetch_transaction(transaction_id)
        self.assertIsNotNone(t["pending_details"])
        self.assertEqual(transaction_id, t["id"])

        resp = await self._get(f"/api/v1/transactions/asdf1234")
        self.assertEqual(404, resp.status)

        resp = await self._get(f"/api/v1/transactions/1332")
        self.assertEqual(404, resp.status)

    async def test_update_transaction(self):
        group_id = await self._create_group()
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
        )
        account1_id = await self._create_account(group_id, "account1")
        account2_id = await self._create_account(group_id, "account2")
        await self._update_transaction(
            transaction_id,
            200.0,
            "some description",
            date.today(),
            "$",
            2.0,
            creditor_shares={account2_id: 1.0},
            debitor_shares={account1_id: 1.0},
        )

        t = await self._fetch_transaction(transaction_id)
        self.assertEqual(200.0, t["pending_details"]["value"])
        self.assertEqual(
            "some description",
            t["pending_details"]["description"],
        )
        self.assertEqual("$", t["pending_details"]["currency_symbol"])
        self.assertEqual(
            2.0,
            t["pending_details"]["currency_conversion_rate"],
        )

        await self._commit_transaction(transaction_id)

        t = await self._fetch_transaction(transaction_id)
        self.assertIsNone(t["pending_details"])

        await self._update_transaction(
            transaction_id,
            100.0,
            "foobar",
            date.today(),
            "€",
            1.0,
            creditor_shares={account2_id: 1.0},
            debitor_shares={account1_id: 1.0},
        )
        t = await self._fetch_transaction(transaction_id)
        self.assertEqual(100.0, t["pending_details"]["value"])
        self.assertEqual(
            "foobar",
            t["pending_details"]["description"],
        )
        self.assertEqual("€", t["pending_details"]["currency_symbol"])
        self.assertEqual(
            1.0,
            t["pending_details"]["currency_conversion_rate"],
        )

        await self._commit_transaction(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertIsNone(t["pending_details"])

        await self._create_change(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertTrue(t["is_wip"])
        await self._update_transaction(
            transaction_id,
            200.0,
            "foofoo",
            date.today(),
            "$",
            2.0,
            creditor_shares={account2_id: 1.0},
            debitor_shares={account1_id: 1.0},
        )

        t = await self._fetch_transaction(transaction_id)
        self.assertEqual(200.0, t["pending_details"]["value"])
        self.assertEqual(
            "foofoo",
            t["pending_details"]["description"],
        )
        self.assertEqual("$", t["pending_details"]["currency_symbol"])
        self.assertEqual(
            2.0,
            t["pending_details"]["currency_conversion_rate"],
        )
        await self._commit_transaction(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertEqual(200.0, t["committed_details"]["value"])
        self.assertEqual(
            "foofoo",
            t["committed_details"]["description"],
        )
        self.assertEqual("$", t["committed_details"]["currency_symbol"])
        self.assertEqual(
            2.0,
            t["committed_details"]["currency_conversion_rate"],
        )

    async def test_commit_transaction(self):
        group_id = await self._create_group()
        account1_id = await self._create_account(group_id, "account1")
        account2_id = await self._create_account(group_id, "account2")
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
        )

        # we should not be able to commit this transaction as we do not have creditor or debitor shares
        await self._commit_transaction(transaction_id, expected_status=400)

        # create a creditor share and try to commit it, should not work as we do not have a debitor share
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account1_id: 1.0},
            debitor_shares={},
        )
        await self._commit_transaction(transaction_id, expected_status=400)

        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account1_id: 1.0},
            debitor_shares={account2_id: 1.0},
        )

        # now we should be able to commit
        await self._commit_transaction(transaction_id, expected_status=200)

        t = await self._fetch_transaction(transaction_id)
        self.assertIsNone(t["pending_details"])
        self.assertFalse(t["is_wip"])

        # test that we cannot commit without having pending changes
        await self._commit_transaction(transaction_id, expected_status=400)

        # create a second debitor share
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account1_id: 1.0},
            debitor_shares={account2_id: 1.0, account1_id: 1.0},
        )

        # check that we have another pending change
        t = await self._fetch_transaction(transaction_id)
        self.assertIsNotNone(t["pending_details"])
        self.assertTrue(t["is_wip"])

        # check that we can commit this
        await self._commit_transaction(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertIsNone(t["pending_details"])
        self.assertFalse(t["is_wip"])

        # try another edit and discard that
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account1_id: 1.0},
            debitor_shares={account2_id: 1.0},
        )
        await self._discard_transaction_change(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertIsNone(t["pending_details"])
        self.assertFalse(t["is_wip"])

        # try delete the transaction
        await self._delete_transaction(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertTrue(t["committed_details"]["deleted"])

    async def test_discard_newly_created_transaction(self):
        group_id = await self._create_group()
        account1_id = await self._create_account(group_id, "account1")
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
            debitor_shares={account1_id: 1.0},
        )

        # we should not be able to discard this transaction as it does not have any committed changes
        await self._discard_transaction_change(transaction_id, expected_status=400)

        await self._delete_transaction(transaction_id)

        t = await self._fetch_transaction(transaction_id)
        self.assertTrue(t["committed_details"]["deleted"])
        self.assertIsNone(t["pending_details"])
        self.assertFalse(t["is_wip"])

    async def test_account_deletion(self):
        group_id = await self._create_group()
        account1_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account1",
            description="description",
        )
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
            debitor_shares={},
            creditor_shares={},
        )

        # we can delete the account when nothing depends on it
        resp = await self._delete(f"/api/v1/accounts/{account1_id}")
        self.assertEqual(200, resp.status)

        account2_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account2",
            description="description",
        )
        account3_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account3",
            description="description",
        )

        # the account has been deleted, we should not be able to add more shares to it
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account1_id: 1.0},
            debitor_shares={},
            expected_status=400,
        )
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account2_id: 1.0},
            debitor_shares={account3_id: 1.0},
        )
        await self._commit_transaction(transaction_id)

        # we should not be able to delete this account as changes depend on it
        resp = await self._delete(f"/api/v1/accounts/{account2_id}")
        self.assertEqual(400, resp.status)

        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            creditor_shares={account3_id: 1.0},
            debitor_shares={account3_id: 1.0},
        )
        await self._commit_transaction(transaction_id)

        # now we should be able to delete the account as nothing depends on it
        resp = await self._delete(f"/api/v1/accounts/{account2_id}")
        self.assertEqual(200, resp.status)

    async def test_purchase_items(self):
        group_id = await self._create_group()
        account1_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account1",
            description="foobar",
        )
        account2_id = await self.account_service.create_account(
            user=self.test_user,
            group_id=group_id,
            type="personal",
            name="account2",
            description="foobar",
        )
        transaction_id = await self.transaction_service.create_transaction(
            user=self.test_user,
            group_id=group_id,
            type="purchase",
            description="description123",
            currency_symbol="€",
            billed_at=date.today(),
            currency_conversion_rate=1.22,
            value=122.22,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
        )
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
            positions=[
                {"id": -1, "name": "carrots", "price": 12.22, "communist_shares": 1}
            ],
        )

        # let's commit
        await self._commit_transaction(transaction_id)
        t = await self._fetch_transaction(transaction_id)
        self.assertIsNotNone(t["committed_positions"])
        position_id = t["committed_positions"][0]["id"]

        # now lets add some item shares, remove them again and commit
        await self._update_transaction(
            transaction_id,
            200.0,
            "description123",
            date.today(),
            "€",
            2.0,
            debitor_shares={account1_id: 1.0},
            creditor_shares={account2_id: 1.0},
            positions=[
                {
                    "id": position_id,
                    "name": "carrots",
                    "price": 12.22,
                    "communist_shares": 0,
                    "usages": {account2_id: 1.0},
                }
            ],
        )

        t = await self._fetch_transaction(transaction_id)
        self.assertIsNotNone(t["committed_positions"])
        self.assertEqual(1, len(t["committed_positions"]))
        self.assertEqual("carrots", t["committed_positions"][0]["name"])
        self.assertEqual(1, len(t["pending_positions"]))
        self.assertEqual(
            0,
            t["pending_positions"][0]["communist_shares"],
        )

        await self._commit_transaction(transaction_id=transaction_id)

        t = await self._fetch_transaction(transaction_id)
        self.assertIsNotNone(t["committed_positions"])
        self.assertEqual(1, len(t["committed_positions"]))
        self.assertIn(str(account2_id), t["committed_positions"][0]["usages"])
