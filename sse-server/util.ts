type Numeric = `${number}` | number;

export const toNumber = (str: unknown) => {
  if (isNumeric(str)) {
    return Number(str);
  }
  return new Error("Not numeric");
};

const isNumeric = (maybeNumber: unknown): maybeNumber is Numeric => {
  if (
    maybeNumber &&
    (typeof maybeNumber === "string" || typeof maybeNumber === "number") &&
    !isNaN(+maybeNumber)
  ) {
    return true;
  }
  return false;
};