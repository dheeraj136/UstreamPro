// Rating rules for TMDB-backed titles. Never infer or seed a score:
// TMDB's vote_average is displayable only when at least one vote exists.
export function tmdbRatingFromVotes(voteAverage, voteCount) {
  if (!(Number(voteCount) > 0)) return null;
  const value = Number.parseFloat(voteAverage);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(9.9, Math.max(0, Math.round(value * 10) / 10));
}
