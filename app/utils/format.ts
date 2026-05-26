export const formatPesos = (n: number | string) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(n));

export const formatKg = (n: number | string) => {
  const num = Number(n);
  if (num === Math.floor(num)) return `${num} kg`;
  return `${num.toFixed(3).replace(/\.?0+$/, "")} kg`;
};
