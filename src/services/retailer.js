const { getSupabase } = require("./supabase");

function normalizeWhatsAppPhone(from) {
  const raw = (from || "").trim();
  if (raw.startsWith("whatsapp:")) {
    return raw.slice("whatsapp:".length);
  }
  return raw;
}

async function getOrCreateRetailer(whatsappFrom) {
  const phone = normalizeWhatsAppPhone(whatsappFrom);
  if (!phone) {
    throw new Error("Could not read your WhatsApp number.");
  }

  const supabase = getSupabase();

  const { data: existing, error: findError } = await supabase
    .from("retailers")
    .select("id, phone, name, consent_given_at")
    .eq("phone", phone)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (existing) {
    if (!existing.consent_given_at) {
      await supabase
        .from("retailers")
        .update({ consent_given_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from("retailers")
    .insert({ phone, consent_given_at: new Date().toISOString() })
    .select("id, phone, name")
    .single();

  if (createError) throw new Error(createError.message);

  const { error: settingsError } = await supabase.from("retailer_settings").insert({
    retailer_id: created.id,
  });

  if (settingsError) throw new Error(settingsError.message);

  return created;
}

async function getRetailerSettings(retailerId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("retailer_settings")
    .select("currency, whatsapp_alerts_on")
    .eq("retailer_id", retailerId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { normalizeWhatsAppPhone, getOrCreateRetailer, getRetailerSettings };
