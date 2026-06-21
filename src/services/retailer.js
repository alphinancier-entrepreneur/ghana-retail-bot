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
    return { ...existing, isNew: false };
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

  return { ...created, isNew: true };
}

async function setRetailerName(retailerId, name) {
  const clean = (name || "").trim().slice(0, 60);
  if (!clean) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("retailers")
    .update({ name: clean })
    .eq("id", retailerId)
    .select("id, phone, name")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Close account without hard-deleting (DB forbids DELETE on retailers).
 * Archives the phone, clears name, deactivates products, resets session/usage.
 */
async function archiveRetailerAccount(retailerId, phone) {
  const supabase = getSupabase();

  const { error: productsError } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("retailer_id", retailerId)
    .eq("is_active", true);

  if (productsError) throw new Error(productsError.message);

  const suffix = retailerId.replace(/-/g, "").slice(0, 8);
  const archivedPhone = `${phone}.deleted.${suffix}`;

  const { error: retailerError } = await supabase
    .from("retailers")
    .update({ phone: archivedPhone, name: null })
    .eq("id", retailerId);

  if (retailerError) throw new Error(retailerError.message);

  const { error: sessionError } = await supabase.from("retailer_sessions").upsert(
    {
      retailer_id: retailerId,
      mode: "idle",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "retailer_id" }
  );

  if (sessionError) throw new Error(sessionError.message);

  await supabase.from("user_usage").delete().eq("phone_number", phone);
  await supabase.from("waitlist").delete().eq("phone_number", phone);
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

module.exports = {
  normalizeWhatsAppPhone,
  getOrCreateRetailer,
  setRetailerName,
  archiveRetailerAccount,
  getRetailerSettings,
};
