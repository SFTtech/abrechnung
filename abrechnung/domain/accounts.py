from dataclasses import dataclass


@dataclass
class Account:
    type: str
    name: str
    description: str
    priority: int
    # created_by: int
    deleted: bool
