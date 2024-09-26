export function maskNumber(number: string) {
  return number
    .replace("whatsapp:", "")
    .replace(/(\d{2})\d{6}(\d+)/, "$1******$2");
}
