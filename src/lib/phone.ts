export const TZ_PHONE_PREFIX = "+255";

/** A number is only useful to the till, receipts and directory if digits follow the country code. */
export function isDialablePhone(value: string) {
  return value.replace(/\D/g, "").length > 3;
}

/** Persist an optional phone field as blank when the merchant never typed past the prefix. */
export function phoneForStorage(value: string) {
  return isDialablePhone(value) ? value.trim() : "";
}
