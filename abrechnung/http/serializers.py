import abc
from typing import Union, Type

from abrechnung.domain.accounts import Account
from abrechnung.domain.groups import Group, GroupMember, GroupInvite, GroupPreview
from abrechnung.domain.transactions import Transaction, TransactionDetails
from abrechnung.domain.users import User


class Serializer(abc.ABC):
    def __init__(self, instance: Union[list[object], Type[object]]):
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
        return {
            "id": instance.id,
            "name": instance.name,
            "description": instance.description,
            "currency_symbol": instance.currency_symbol,
            "terms": instance.terms,
            "created_by": instance.created_by,
        }


class GroupPreviewSerializer(Serializer):
    def _to_repr(self, instance: GroupPreview) -> dict:
        return {
            "id": instance.id,
            "name": instance.name,
            "description": instance.description,
            "currency_symbol": instance.currency_symbol,
            "terms": instance.terms,
            "created_at": instance.created_at,
            "invite_single_use": instance.invite_single_use,
            "invite_valid_until": instance.invite_valid_until,
            "invite_description": instance.invite_description,
        }


class AccountSerializer(Serializer):
    def _to_repr(self, instance: Account) -> dict:
        return {
            "id": instance.id,
            "type": instance.type,
            "name": instance.name,
            "description": instance.description,
            "priority": instance.priority,
            "deleted": instance.deleted,
        }


class GroupInviteSerializer(Serializer):
    def _to_repr(self, instance: GroupInvite) -> dict:
        return {
            "id": instance.id,
            "created_by": instance.created_by,
            "single_use": instance.single_use,
            "valid_until": instance.valid_until,
            "token": instance.token,
            "description": instance.description,
        }


class TransactionSerializer(Serializer):
    def _serialize_change(self, change: TransactionDetails):
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
            "type": instance.type,
            "pending_changes": {
                str(uid): self._serialize_change(change)
                for uid, change in instance.pending_changes.items()
            }
            if instance.pending_changes
            else {},
        }
        if instance.current_state:
            data.update(self._serialize_change(instance.current_state))

        return data


class UserSerializer(Serializer):
    def _to_repr(self, instance: User) -> dict:
        return {
            "id": instance.id,
            "username": instance.username,
            "email": instance.email,
        }


class GroupMemberSerializer(Serializer):
    def _to_repr(self, instance: GroupMember) -> dict:
        return {
            "user_id": instance.user_id,
            "username": instance.username,
            "is_owner": instance.is_owner,
            "can_write": instance.can_write,
            "description": instance.description,
            "joined_at": instance.joined_at,
            "invited_by": instance.invited_by,
        }
