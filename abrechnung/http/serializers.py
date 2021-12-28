import abc
from typing import Union, Type

from abrechnung.config import Config
from abrechnung.domain.accounts import Account
from abrechnung.domain.groups import (
    Group,
    GroupMember,
    GroupInvite,
    GroupPreview,
    GroupLog,
)
from abrechnung.domain.transactions import (
    Transaction,
    TransactionDetails,
    TransactionPosition,
    FileAttachment,
)
from abrechnung.domain.users import User


class Serializer(abc.ABC):
    def __init__(self, instance: Union[list[object], Type[object]], config: Config):
        self.instance = instance
        self.config = config

    @abc.abstractmethod
    def _to_repr(self, instance) -> dict:
        pass

    def to_repr(self) -> Union[dict, list]:
        if isinstance(self.instance, list):
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
            "join_as_editor": instance.join_as_editor,
        }


class GroupLogSerializer(Serializer):
    def _to_repr(self, instance: GroupLog) -> dict:
        return {
            "id": instance.id,
            "type": instance.type,
            "message": instance.message,
            "user_id": instance.user_id,
            "logged_at": instance.logged_at,
            "affected_user_id": instance.affected,
        }


class TransactionSerializer(Serializer):
    @staticmethod
    def _serialize_positions(positions: list[TransactionPosition]):
        return [
            {
                "id": position.id,
                "price": position.price,
                "communist_shares": position.communist_shares,
                "deleted": position.deleted,
                "name": position.name,
                "usages": {
                    str(account_id): val for account_id, val in position.usages.items()
                },
            }
            for position in positions
        ]

    @staticmethod
    def _serialize_change(change: TransactionDetails):
        return {
            "description": change.description,
            "value": change.value,
            "currency_symbol": change.currency_symbol,
            "currency_conversion_rate": change.currency_conversion_rate,
            "deleted": change.deleted,
            "billed_at": change.billed_at.isoformat(),
            "committed_at": None
            if change.committed_at is None
            else change.committed_at.isoformat(),
            "creditor_shares": {
                str(uid): val for uid, val in change.creditor_shares.items()
            },
            "debitor_shares": {
                str(uid): val for uid, val in change.debitor_shares.items()
            },
        }

    def _serialize_files(self, attachments: list[FileAttachment]):
        base_url = self.config["service"]["api_url"]
        return [
            {
                "id": attachment.id,
                "filename": attachment.filename
                + ("." + attachment.mime_type.split("/")[1])
                if attachment.mime_type
                else "",
                "blob_id": attachment.blob_id,
                "url": f"{base_url}/v1/files/{attachment.id}/{attachment.blob_id}",
                "deleted": attachment.deleted,
            }
            for attachment in attachments
        ]

    def _to_repr(self, instance: Transaction) -> dict:
        data = {
            "id": instance.id,
            "type": instance.type,
            "is_wip": instance.is_wip,
            "pending_details": self._serialize_change(instance.pending_details)
            if instance.pending_details
            else None,
            "committed_details": self._serialize_change(instance.committed_details)
            if instance.committed_details
            else None,
            "pending_positions": self._serialize_positions(instance.pending_positions)
            if instance.pending_positions
            else [],
            "committed_positions": self._serialize_positions(
                instance.committed_positions
            )
            if instance.committed_positions
            else [],
            "pending_files": self._serialize_files(instance.pending_files)
            if instance.pending_files
            else [],
            "committed_files": self._serialize_files(instance.committed_files)
            if instance.committed_files
            else [],
        }

        return data


class UserSerializer(Serializer):
    def _to_repr(self, instance: User) -> dict:
        return {
            "id": instance.id,
            "username": instance.username,
            "email": instance.email,
            "sessions": [
                {
                    "id": session.id,
                    "name": session.name,
                    "valid_until": session.valid_until,
                    "last_seen": session.last_seen,
                }
                for session in instance.sessions
            ],
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
