export const unixToUTC = unixTimestamp => {
  const date = new Date(unixTimestamp);
  return `${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}`;
}