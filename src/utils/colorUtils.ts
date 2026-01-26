export const shadeColor = (color: string, percent: number) => {
  let R = Number.parseInt(color.substring(1, 3), 16);
  let G = Number.parseInt(color.substring(3, 5), 16);
  let B = Number.parseInt(color.substring(5, 7), 16);

  R = Number.parseInt((R * (100 + percent) / 100).toString());
  G = Number.parseInt((G * (100 + percent) / 100).toString());
  B = Number.parseInt((B * (100 + percent) / 100).toString());

  R = Math.min(R, 255);
  G = Math.min(G, 255);
  B = Math.min(B, 255);

  R = Math.round(R);
  G = Math.round(G);
  B = Math.round(B);

  const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
  const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
  const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

  return "#" + RR + GG + BB;
};
