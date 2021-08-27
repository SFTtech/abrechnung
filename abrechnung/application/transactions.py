from abrechnung.application import Application
from abrechnung.domain.transactions import Transaction


class TransactionService(Application):
    def list_transactions(self, user_id: int, group_id: int) -> list[Transaction]:
        if (
            user_id not in self.user_to_groups
            or group_id not in self.user_to_groups[user_id]
        ):
            raise PermissionError

        return [
            self.repository.get(transaction_id)
            for transaction_id in self.group_to_transactions.get(group_id, set())
        ]

    def get_transaction(
        self, user_id: int, group_id: int, transaction_id: int
    ) -> Transaction:
        if (
            user_id not in self.user_to_groups
            or group_id not in self.user_to_groups[user_id]
            or transaction_id not in self.group_to_transactions[group_id]
        ):
            raise PermissionError

        return self.repository.get(transaction_id)

    def create_transaction(
        self,
        user_id: int,
        group_id: int,
        type: str,
        description: str,
        currency_symbol: str,
        currency_conversion_rate: float,
        value: float,
    ) -> int:
        group: Group = self.repository.get(group_id)
        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        if not Transaction.Type.is_valid_type(type):
            raise InvalidCommand(f"'{type}' is not a valid transaction type")

        transaction = Transaction.create(
            group_id=group_id,
            type=getattr(Transaction.Type, type),
            description=description,
            originating_user_id=user_id,
            value=value,
            currency_symbol=currency_symbol,
            currency_conversion_rate=currency_conversion_rate,
        )
        self.save(transaction)
        return transaction.id

    def commit_transaction(self, user_id: int, transaction_id: int) -> None:
        transaction: Transaction = self.repository.get(transaction_id)
        # TODO: maybe do some additional checking ?

        if not transaction.has_pending_change(user_id):
            raise InvalidCommand

        transaction.commit(user_id)
        self.save(transaction)

    def add_or_change_creditor_share(
        self, user_id: int, transaction_id: int, account_id: int, value: float
    ):
        transaction: Transaction = self.repository.get(transaction_id)
        group: Group = self.repository.get(transaction.group_id)
        account: Account = self.repository.get(account_id)
        if account.deleted:
            raise PermissionError

        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        transaction.add_or_change_creditor_share(
            originating_user_id=user_id, account_id=account_id, value=value
        )
        self.save(transaction)

    def switch_creditor_share(
        self, user_id: int, transaction_id: int, account_id: int, value: float
    ):
        transaction: Transaction = self.repository.get(transaction_id)
        group: Group = self.repository.get(transaction.group_id)
        account: Account = self.repository.get(account_id)
        if account.deleted:
            raise PermissionError

        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        transaction.switch_creditor_share(
            originating_user_id=user_id, account_id=account_id, value=value
        )
        self.save(transaction)

    def delete_creditor_share(self, user_id: int, transaction_id: int, account_id: int):
        transaction: Transaction = self.repository.get(transaction_id)
        group: Group = self.repository.get(transaction.group_id)
        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        transaction.delete_creditor_share(
            originating_user_id=user_id, account_id=account_id
        )
        self.save(transaction)

    def add_or_change_debitor_share(
        self, user_id: int, transaction_id: int, account_id: int, value: float
    ):
        transaction: Transaction = self.repository.get(transaction_id)
        group: Group = self.repository.get(transaction.group_id)
        account: Account = self.repository.get(account_id)
        if account.deleted:
            raise PermissionError

        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        transaction.add_or_change_debitor_share(
            originating_user_id=user_id, account_id=account_id, value=value
        )

    def switch_debitor_share(
        self, user_id: int, transaction_id: int, account_id: int, value: float
    ):
        transaction: Transaction = self.repository.get(transaction_id)
        group: Group = self.repository.get(transaction.group_id)
        account: Account = self.repository.get(account_id)
        if account.deleted:
            raise PermissionError

        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        transaction.switch_debitor_share(
            originating_user_id=user_id, account_id=account_id, value=value
        )

    def delete_debitor_share(self, user_id: int, transaction_id: int, account_id: int):
        transaction: Transaction = self.repository.get(transaction_id)
        group: Group = self.repository.get(transaction.group_id)
        if not group.user_has_permissions(user_id, is_owner=False, can_write=True):
            raise PermissionError

        transaction.delete_debitor_share(
            originating_user_id=user_id, account_id=account_id
        )
