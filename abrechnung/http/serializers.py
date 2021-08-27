import abc
from typing import Union

from eventsourcing.domain import Aggregate

from abrechnung.domain.accounts import Account
from abrechnung.domain.groups import Group
from abrechnung.domain.transactions import Transaction
from abrechnung.domain.users import User


class Serializer(abc.ABC):
    def __init__(self, instance: Union[list[Aggregate], Aggregate]):
        self.many = isinstance(instance, list)
        self.instance = instance

    @abc.abstractmethod
    def _to_repr(self, instance) -> dict:
        pass

    def to_repr(self) -> Union[dict, list]:
        if self.many:
            return [self._to_repr(i) for i in self.instance]
        return self._to_repr(self.instance)


class GroupSerializer(Serializer):
    def _to_repr(self, instance: Group) -> dict:
        members = [
            {
                "user_id": user_id,
                "is_owner": m.is_owner,
                "can_write": m.can_write,
                "joined_at": m.joined_at,
            }
            for user_id, m in instance.members.items()
        ]
        invites = [
            {
                "id": i.id,
                "created_by": i.created_by,
                "token": i.token,
                "valid_until": i.valid_until,
                "single_use": i.single_use,
                "description": i.description,
            }
            for i in instance.invites
        ]

        return {
            "id": instance.id,
            "name": instance.name,
            "description": instance.description,
            "currency_symbol": instance.currency_symbol,
            "terms": instance.terms,
            "created_by": instance.created_by,
            "members": members,
            "invites": invites,
            "deleted": instance.deleted,
        }


class AccountSerializer(Serializer):
    def _to_repr(self, instance: Account) -> dict:
        return {
            "id": instance.id,
            "type": instance.type.name,
            "name": instance.name,
            "description": instance.description,
            "priority": instance.priority,
            "deleted": instance.deleted,
        }


class TransactionSerializer(Serializer):
    def _serialize_change(self, change: Transaction.EditableTransactionDetails):
        return {
            "description": change.description,
            "value": change.value,
            "currency_symbol": change.currency_symbol,
            "currency_conversion_rate": change.currency_conversion_rate,
            "creditor_shares": {
                str(uid): val for uid, val in change.creditor_shares.items()
            },
            "debitor_shares": {
                str(uid): val for uid, val in change.debitor_shares.items()
            },
        }

    def _to_repr(self, instance: Transaction) -> dict:
        data = {
            "id": instance.id,
            "type": instance.type.name,
            "created_by": instance.created_by,
            "pending_changes": {
                str(uid): self._serialize_change(change)
                for uid, change in instance.pending_changes.items()
            },
        }
        if instance.editable_details:
            data.update(self._serialize_change(instance.editable_details))

        return data


class UserSerializer(Serializer):
    def _to_repr(self, instance: User) -> dict:
        return {
            "id": instance.id,
            "username": instance.username,
            "email": instance.email,
        }
