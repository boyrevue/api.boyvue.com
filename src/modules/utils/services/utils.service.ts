function IPtoNum(ip) {
  return Number(
    ip.split('.')
      .map((d) => (`000${d}`).slice(-3))
      .join('')
  );
}

export const isValidCCBillIP = (ipV4: string) => {
  // ip range of CCBill https://ccbill.com/doc/webhooks-user-guide
  // 64.38.212.1 - 64.38.212.254
  // 64.38.215.1 - 64.38.215.254
  // 64.38.240.1 - 64.38.240.254
  // 64.38.241.1 - 64.38.241.254
  const ranges = [
    ['64.38.212.1', '64.38.212.254'],
    ['64.38.215.1', '64.38.215.254'],
    ['64.38.240.1', '64.38.240.254'],
    ['64.38.241.1', '64.38.241.254']
  ];
  return ranges.some(
    ([min, max]) => IPtoNum(min) < IPtoNum(ipV4) && IPtoNum(max) > IPtoNum(ipV4)
  );
};
