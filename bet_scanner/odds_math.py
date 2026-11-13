"""Pure math helpers: odds conversion, removing the bookmaker's cut, and bet sizing.

No network calls here, so everything is easy to test.
"""

from statistics import median


def american_to_prob(american):
    """Convert American odds (-150, +130) to the raw implied probability (still includes vig)."""
    american = float(american)
    if american < 0:
        return -american / (-american + 100.0)
    return 100.0 / (american + 100.0)


def devig(probs):
    """Remove the bookmaker's margin by scaling raw implied probabilities to sum to 1."""
    total = sum(probs)
    if total <= 0:
        raise ValueError("probabilities must sum to a positive number")
    return [p / total for p in probs]


def fair_probs_from_books(book_lines, sharp_books=None):
    """Consensus no-vig probability for each outcome across sportsbooks.

    book_lines: {book_key: {outcome_name: american_odds}}  (only 2-way markets)
    sharp_books: optional list of book keys; if any are present, only those are used,
                 because their prices are usually closest to the true probability.

    Returns ({outcome_name: fair_prob}, number_of_books_used).
    """
    usable = {
        book: lines for book, lines in book_lines.items() if len(lines) == 2
    }
    if sharp_books:
        sharp = {b: l for b, l in usable.items() if b in sharp_books}
        if sharp:
            usable = sharp
    if not usable:
        return {}, 0

    per_outcome = {}
    for lines in usable.values():
        names = list(lines.keys())
        fair = devig([american_to_prob(lines[n]) for n in names])
        for name, p in zip(names, fair):
            per_outcome.setdefault(name, []).append(p)

    # Only keep outcomes every book priced (guards against name mismatches between books).
    n_books = len(usable)
    result = {name: median(ps) for name, ps in per_outcome.items() if len(ps) == n_books}
    return result, n_books


def kelly_fraction_binary(fair_prob, price):
    """Full-Kelly fraction of bankroll for a prediction-market share bought at `price` (0-1).

    A share costs `price` and pays $1 if it wins, so the formula is (p - price) / (1 - price).
    Returns 0 when there is no edge.
    """
    if not 0 < price < 1:
        return 0.0
    f = (fair_prob - price) / (1.0 - price)
    return max(0.0, f)


def stake_dollars(fair_prob, price, bankroll, kelly_mult=0.25, max_pct=0.03, max_dollars=5.0):
    """Fractional-Kelly stake in dollars, capped, rounded down to the nearest $0.50, min $1.

    Returns 0 when there is no edge.
    """
    f = kelly_fraction_binary(fair_prob, price) * kelly_mult
    if f <= 0:
        return 0.0
    raw = min(bankroll * f, bankroll * max_pct, max_dollars)
    rounded = int(raw * 2) / 2.0
    return max(1.0, rounded)
