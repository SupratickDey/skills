import re
import sys

LOW = -(2**63)
HIGH = 2**63 - 1

def main(args):
    if len(args) != 2 or any(re.fullmatch(r"[+-]?[0-9]+", arg) is None for arg in args):
        print("invalid input", file=sys.stderr)
        return 2
    try:
        a, b = map(int, args)
    except ValueError:
        print("invalid input", file=sys.stderr)
        return 2
    if not (LOW <= a <= HIGH and LOW <= b <= HIGH):
        print("out of range", file=sys.stderr)
        return 2
    if b == 0:
        print("zero divisor", file=sys.stderr)
        return 2
    q, r = divmod(a, b)
    if not LOW <= q <= HIGH:
        print("out of range", file=sys.stderr)
        return 2
    print(q, r)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
