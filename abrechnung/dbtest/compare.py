"""
value comparison helpers
"""

class CompareWrapper:
    """
    Wraps a value so the operator== compares with the given lambda
    which gets the actual value as argument.
    """
    def __init__(self, eqfunc, string):
        """
        init the wrapper with given equality function
        """
        self.eqfunc = eqfunc
        self.string = string

    def __eq__(self, other):
        """
        compare this value with the other one, respecting the tolerance.
        i.e. the other value must be within the captured value +- tolerance
        """
        return self.eqfunc(other)

    def __repr__(self):
        """
        string representation
        """
        return self.string


def with_tolerance(expected, tolerance):
    """
    return a value that can be compared with given tolerance.
    """
    return CompareWrapper(
        lambda o: (expected - tolerance) <= o <= (expected + tolerance),
        f"{expected} \N{Plus-Minus Sign} {tolerance}"
    )

def in_interval(interval_start, interval_end):
    """
    return a value where == is true if it is in the given interval
    """
    return CompareWrapper(
        lambda o: interval_start <= actual <= interval_end,
        f"[{interval_start}, {interval_end}]"
    )

def identical(value):
    """
    return a value where == is True if the `is` operator is True
    """
    return CompareWrapper(
        lambda o: o is value,
        f"is {value!r}"
    )

def different(value):
    """
    return a value where == is True if operator!= is True
    """
    return CompareWrapper(
        lambda o: o != value,
        f"not {value!r}"
    )

def greater(value):
    """
    return an expected value where == is True
    when the other value is greater than this one.
    """
    return CompareWrapper(
        lambda o: o > value,
        f"> {value!r}"
    )
