export default (str: string) => {
  const num = Number(str);
  return !isNaN(num) && isFinite(num);
}

