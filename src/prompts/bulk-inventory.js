const BULK_SYSTEM_PROMPT = `You parse a WHOLE delivery note for a Ghana retail shop into JSON. The shopkeeper pasted multiple products in one message.

Return ONLY valid JSON:
{
  "action": "bulk_add_inventory",
  "items": [
    { "product": "milo", "quantity": 50, "unit": "tin", "price": 8 },
    { "product": "sugar", "quantity": 20, "unit": "box", "price": null }
  ]
}

Rules:
- One object per product line (newlines, commas, bullets, or "and" between items)
- product: short name
- quantity: required number
- unit: tin, box, bag, kg, piece, etc. if mentioned, else null
- price: GHS per unit if mentioned (@ 8, at 8 cedis, 8 each), else null
- Max 30 items; if more, take the first 30
- Ignore empty lines
- Strip leading "add" on each line if present

Return ONLY valid JSON.`;

module.exports = { BULK_SYSTEM_PROMPT };
