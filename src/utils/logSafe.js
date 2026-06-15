function maskPhone(phone) {
  if (!phone) return "unknown";
  const normalized = String(phone).replace(/^whatsapp:/i, "").trim();
  if (normalized.length <= 6) return "***";
  return `${normalized.slice(0, 4)}...${normalized.slice(-3)}`;
}

module.exports = { maskPhone };
