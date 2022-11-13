from typing import Mapping, Any, Optional

from marshmallow import fields, Schema


class SharesField(fields.Field):
    def _serialize(
        self, value: Mapping[int, float], attr: Optional[str], obj: Any, **kwargs
    ):
        return {
            str(account_id): usage_value for account_id, usage_value in value.items()
        }

    def _deserialize(
        self,
        value: Any,
        attr: Optional[str],
        data: Optional[Mapping[str, Any]],
        **kwargs,
    ):
        if not isinstance(value, dict):
            raise fields.ValidationError(message="expected a dictionary")
        try:
            return {int(k): float(v) for k, v in value.items()}
        except:
            raise fields.ValidationError(
                message="expected a dictionary mapping int to float"
            )


class TransactionPositionSchema(Schema):
    id = fields.Int()
    price = fields.Number()
    communist_shares = fields.Number()
    deleted = fields.Bool(required=False, load_default=False)
    name = fields.Str()
    usages = SharesField(load_default={})


s = Schema.from_dict(
    {
        "description": fields.Str(),
        "type": fields.Str(),
        "value": fields.Number(),
        "currency_symbol": fields.Str(),
        "billed_at": fields.Date(),
    },
    name="CreateTransactionSchema",
)()

data = {
    "description": "asdfasdf",
    "value": 11,
    "type": "purchase",
    "billed_at": "2022-10-21T18:57:12.628111",
    "currency_symbol": "€",
    "currency_conversion_rate": 1,
    "creditor_shares": {"2": 1},
    "debitor_shares": None,
    "perform_commit": False,
}

print(s.validate(data=data))
