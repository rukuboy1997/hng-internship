export function getAgeGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

export function getTopCountry(countries) {
  if (!countries || countries.length === 0) return null;

  return countries.reduce((max, curr) =>
    curr.probability > max.probability ? curr : max
  );
}
