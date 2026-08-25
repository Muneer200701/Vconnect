"""Small transparent worker-ranking system used by the demo API.

Score = skill (30) + distance (15) + rating (15) + availability (12) + price (8) + vtrust (20).
All inputs are normalized to 0..1, so the result is easy to explain and adjust.
"""

WEIGHTS = {"skill": 30, "distance": 15, "rating": 15, "availability": 12, "price": 8, "vtrust": 20}

def vtrust_score(worker):
    """Transparent 0–100 trust score; no AI claims are made.
    Rating 35%, completed work 20%, on-time record 20%, low cancellations 10%,
    low complaints 5%, and verified co-op membership 10%.
    """
    rating = min((worker.get("rating", 0) or 0) / 5, 1) * 35
    completed = min((worker.get("completed_jobs", 0) or 0) / 20, 1) * 20
    on_time = (worker.get("on_time_rate", .95) or .95) * 20
    cancellation = max(0, 1 - (worker.get("cancellation_rate", 0) or 0)) * 10
    complaints = max(0, 1 - min(worker.get("complaints", 0) or 0, 5) / 5) * 5
    membership = 10 if worker.get("cooperative_member", 1) else 0
    return round(rating + completed + on_time + cancellation + complaints + membership)

def rank_workers(workers, service=None):
    prices = [w.get("price", 0) for w in workers if w.get("price") is not None] or [1]
    low, high = min(prices), max(prices)
    ranked = []
    for worker in workers:
        cat = worker.get("category", "") or ""
        skill = 1 if not service or service.lower() in cat.lower() else .35
        distance = max(0, 1 - (worker.get("distance", 0) or 0) / 12)
        rating = (worker.get("rating", 0) or 0) / 5
        availability = 1 if worker.get("available", 0) else .15
        price_val = worker.get("price", low) or low
        price = 1 if high == low else 1 - ((price_val - low) / (high - low))
        trust = vtrust_score(worker) / 100
        score = round(skill * WEIGHTS["skill"] + distance * WEIGHTS["distance"] + rating * WEIGHTS["rating"] + availability * WEIGHTS["availability"] + price * WEIGHTS["price"] + trust * WEIGHTS["vtrust"])
        dist_str = worker.get("distance", 0)
        avail_str = 'available now' if worker.get('available') else 'limited availability'
        match = dict(worker, score=score, vtrust_score=vtrust_score(worker), is_best_match=False,
          explanation=f"Strong skill fit, VTrust {vtrust_score(worker)}/100, {dist_str} km away, and {avail_str}.")
        ranked.append(match)
    ranked.sort(key=lambda w: w["score"], reverse=True)
    for worker in ranked[:3]: worker["is_best_match"] = True
    return ranked
