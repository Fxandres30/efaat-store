/**
 * addressRepository.js — única capa que habla con Supabase para
 * `addresses`. Nace en la Fase 1 (Auth real) del informe de
 * arquitectura — antes vivían embebidas en el usuario local
 * (`efaat_users`), ya no.
 */
const AddressRepository = (() => {
  function mapRow(row) {
    return {
      id: row.id,
      name: row.name,
      recipient: row.recipient,
      phone: row.phone,
      address: row.address,
      city: row.city,
      department: row.department,
      postalCode: row.postal_code,
      reference: row.reference,
      isDefault: row.is_default,
    };
  }

  async function list(userId) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('addresses').select('*').eq('user_id', userId).order('created_at');
    if (error) throw error;
    return data.map(mapRow);
  }

  async function insert(userId, address) {
    const supabase = await SupabaseClient.getClient();
    const { data, error } = await supabase.from('addresses').insert({
      user_id: userId, name: address.name, recipient: address.recipient, phone: address.phone,
      address: address.address, city: address.city, department: address.department,
      postal_code: address.postalCode || null, reference: address.reference || null,
      is_default: !!address.isDefault,
    }).select().single();
    if (error) throw error;
    return mapRow(data);
  }

  async function update(id, patch) {
    const supabase = await SupabaseClient.getClient();
    const dbPatch = {};
    if ('name' in patch) dbPatch.name = patch.name;
    if ('recipient' in patch) dbPatch.recipient = patch.recipient;
    if ('phone' in patch) dbPatch.phone = patch.phone;
    if ('address' in patch) dbPatch.address = patch.address;
    if ('city' in patch) dbPatch.city = patch.city;
    if ('department' in patch) dbPatch.department = patch.department;
    if ('postalCode' in patch) dbPatch.postal_code = patch.postalCode;
    if ('reference' in patch) dbPatch.reference = patch.reference;
    if ('isDefault' in patch) dbPatch.is_default = patch.isDefault;
    const { data, error } = await supabase.from('addresses').update(dbPatch).eq('id', id).select().single();
    if (error) throw error;
    return mapRow(data);
  }

  async function remove(id) {
    const supabase = await SupabaseClient.getClient();
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) throw error;
  }

  // Desmarca el resto de direcciones del usuario como predeterminada
  // (no hay constraint de "una sola default" en el schema — se
  // mantiene a mano, igual que hacía la versión local).
  async function clearDefault(userId, exceptId) {
    const supabase = await SupabaseClient.getClient();
    let query = supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    if (exceptId) query = query.neq('id', exceptId);
    const { error } = await query;
    if (error) throw error;
  }

  return { list, insert, update, remove, clearDefault };
})();
